// client/src/workspace/components/DesignerView.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import { CasesGlobalStyle } from "./cases/styles";
import Loader from "./cases/shared/Loader";
import DesignerChangePassword from "../pages/DesignerChangePassword";
import type { Case, Briefing, DesignerClosing, BrandIdentity } from "./cases/types";

interface DesignerViewProps { profile: Profile; }
type View = "dashboard" | "workspace";
type DashTab = "overview" | "financeiro";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function getSavedTheme(): "dark" | "light" {
  try { return (localStorage.getItem("ws_theme") as "dark" | "light") || "dark"; }
  catch { return "dark"; }
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  try { localStorage.setItem("ws_theme", theme); } catch {}
}

const STATUS_CFG: Record<Briefing["status"], { color: string; label: string }> = {
  aguardando: { color: "#ffd600", label: "Aguardando" },
  entregue:   { color: "#4b6bff", label: "Entregue"   },
  revisao:    { color: "#ff6b35", label: "Em revisão" },
  aprovado:   { color: "#00e676", label: "Aprovado"   },
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function deadlineStatus(deadline: string): "ok" | "warning" | "overdue" {
  const d = new Date(`${deadline}T23:59:59`);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "warning";
  return "ok";
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const status = deadlineStatus(deadline);
  const cfg = {
    ok:      { color: "#00a864", bg: "rgba(0,180,100,0.10)", icon: "" },
    warning: { color: "#b08800", bg: "rgba(255,214,0,0.12)", icon: "⚠️ " },
    overdue: { color: "#d63232", bg: "rgba(220,50,50,0.12)", icon: "🚨 " },
  }[status];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 6, padding: "2px 8px", fontSize: ".68rem", fontFamily: "Poppins", fontWeight: 600 }}>
      {cfg.icon}Prazo: {new Date(`${deadline}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
    </span>
  );
}

function isClosingPeriod(): { show: boolean; daysLeft: number; month: number; year: number } {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startWarn = lastDay - 4;
  if (day >= startWarn) return { show: true, daysLeft: lastDay - day + 1, month: month + 1, year };
  if (day === 1) {
    const prevMonth = month === 0 ? 12 : month;
    const prevYear  = month === 0 ? year - 1 : year;
    return { show: true, daysLeft: 0, month: prevMonth, year: prevYear };
  }
  return { show: false, daysLeft: 0, month: month + 1, year };
}

export default function DesignerView({ profile }: DesignerViewProps) {
  const [view, setView]               = useState<View>("dashboard");
  const [dashTab, setDashTab]         = useState<DashTab>("overview");
  const [theme, setTheme]             = useState<"dark" | "light">(getSavedTheme);
  const isDark = theme === "dark";
  const [activeCase, setActiveCase]   = useState<Case | null>(null);
  const [cases, setCases]             = useState<Case[]>([]);
  const [briefings, setBriefings]     = useState<Briefing[]>([]);
  const [closings, setClosings]       = useState<DesignerClosing[]>([]);
  const [loading, setLoading]         = useState(true);
  const [closingModal, setClosingModal] = useState(false);
  const [savingClosing, setSavingClosing] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [avatarUrl, setAvatarUrl]     = useState<string | null>((profile as any).avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const closingPeriod = isClosingPeriod();
  const [fixedValue, setFixedValue]     = useState("");
  const [discount, setDiscount]         = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  const displayName = profile.name || (profile as any)?.raw_user_meta_data?.name || profile.email?.split("@")[0] || "Designer";
  const firstName   = displayName.split(" ")[0];
  const hora        = new Date().getHours();
  const saudacao    = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const currentClosing = closings.find(c => c.month === closingPeriod.month && c.year === closingPeriod.year);
  const alreadyClosed  = !!currentClosing?.closed_at;

  const mustChangePwd = !!(profile as any).must_change_password;
  if (mustChangePwd) {
    return <DesignerChangePassword isFirstAccess onDone={() => window.location.reload()} />;
  }

  useEffect(() => {
    async function load() {
      const { data: dcRows } = await supabase.from("designer_cases").select("case_id").eq("designer_id", profile.id);
      const caseIds = (dcRows ?? []).map((r: any) => r.case_id as string);
      if (caseIds.length === 0) { setLoading(false); return; }
      const [{ data: cs }, { data: bf }, { data: cl }] = await Promise.all([
        supabase.from("cases").select("*").in("id", caseIds),
        supabase.from("briefings").select("*").eq("designer_id", profile.id).order("created_at", { ascending: false }),
        supabase.from("designer_closings").select("*").eq("designer_id", profile.id).order("year", { ascending: false }),
      ]);
      setCases(cs ?? []);
      setBriefings(bf ?? []);
      setClosings(cl ?? []);
      setLoading(false);
    }
    void load();
  }, [profile.id]);

  useEffect(() => { applyTheme(theme); }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  async function handleLogout() { await supabase.auth.signOut(); }

  async function handleAvatar(file: File) {
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${profile.id}.${ext}`;
    const R2 = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";
    const { data, error } = await supabase.functions.invoke("get-r2-upload-url", { body: { filename: path, contentType: file.type } });
    if (!error && data?.signedUrl) {
      const res = await fetch(data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (res.ok) {
        const url = `${R2}/${path}?t=${Date.now()}`;
        await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
        setAvatarUrl(url);
      }
    }
    setUploadingAvatar(false);
  }

  const overdueB   = briefings.filter(b => b.status !== "aprovado" && deadlineStatus(b.deadline) === "overdue");
  const pendentes  = briefings.filter(b => b.status === "aguardando").length;
  const emRevisao  = briefings.filter(b => b.status === "revisao").length;
  const aprovados  = briefings.filter(b => b.status === "aprovado").length;

  const briefingsThisMonth = briefings.filter(b => {
    const d = new Date(b.created_at);
    return d.getMonth() + 1 === closingPeriod.month && d.getFullYear() === closingPeriod.year;
  });
  const totalBriefings = briefingsThisMonth.reduce((s, b) => s + (b.designer_value ?? 0), 0);
  const fixedNum    = parseFloat(fixedValue) || 0;
  const discountNum = parseFloat(discount) || 0;
  const totalBruto  = totalBriefings + fixedNum;
  const totalFinal  = Math.max(0, totalBruto - discountNum);

  async function saveClosing() {
    setSavingClosing(true);
    const payload = {
      designer_id: profile.id,
      month: closingPeriod.month,
      year: closingPeriod.year,
      total_bruto: totalBruto,
      discount: discountNum,
      total_final: totalFinal,
      notes: closingNotes,
      closed_at: new Date().toISOString(),
    };
    const { data } = await supabase.from("designer_closings")
      .upsert(payload, { onConflict: "designer_id,month,year" }).select().single();
    if (data) {
      setClosings(prev => {
        const idx = prev.findIndex(c => c.month === data.month && c.year === data.year);
        if (idx >= 0) { const n = [...prev]; n[idx] = data; return n; }
        return [data, ...prev];
      });
    }
    setSavingClosing(false);
    setClosingModal(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--ws-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader />
    </div>
  );

  if (view === "workspace" && activeCase) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ws-bg)", display: "flex", flexDirection: "column" }}>
        <CasesGlobalStyle />
        <DesignerHeader displayName={displayName} avatarUrl={avatarUrl} uploadingAvatar={uploadingAvatar} fileRef={fileRef} onAvatarClick={() => fileRef.current?.click()} onLogout={handleLogout} onChangePwd={() => setShowChangePwd(true)} showMenu={showProfileMenu} onToggleMenu={() => setShowProfileMenu(p => !p)} isDark={isDark} onToggleTheme={toggleTheme}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", color: "#e91e8c", cursor: "pointer", fontSize: ".72rem", fontFamily: "Poppins", letterSpacing: "1px" }}>← Dashboard</button>
            <span style={{ color: "var(--ws-text3)", fontSize: ".72rem" }}>/</span>
            <span style={{ color: "var(--ws-text2)", fontSize: ".76rem", fontFamily: "Poppins", fontWeight: 600 }}>{activeCase.name}</span>
          </div>
        </DesignerHeader>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) void handleAvatar(f); }} />
        <div style={{ height: 52, flexShrink: 0 }} />{/* spacer header */}
        <div style={{ flex: 1, padding: "28px" }}>
          <DesignerClientWorkspace
            profile={profile}
            caseData={activeCase}
            briefings={briefings.filter(b => b.case_id === activeCase.id)}
            onBriefingUpdate={updated => setBriefings(prev => prev.map(b => b.id === updated.id ? updated : b))}
          />
        </div>
        {showChangePwd && <DesignerChangePassword onDone={() => setShowChangePwd(false)} />}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--ws-bg)", display: "flex", flexDirection: "column" }}>
      <CasesGlobalStyle />
      <DesignerHeader displayName={displayName} avatarUrl={avatarUrl} uploadingAvatar={uploadingAvatar} fileRef={fileRef} onAvatarClick={() => fileRef.current?.click()} onLogout={handleLogout} onChangePwd={() => setShowChangePwd(true)} showMenu={showProfileMenu} onToggleMenu={() => setShowProfileMenu(p => !p)} isDark={isDark} onToggleTheme={toggleTheme} />
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) void handleAvatar(f); }} />

      <div style={{ height: 52, flexShrink: 0 }} />{/* spacer header */}
      <div style={{ flex: 1, padding: "32px 28px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>

        {closingPeriod.show && !alreadyClosed && (
          <div style={{ background: "linear-gradient(135deg, rgba(255,214,0,0.12), rgba(255,107,53,0.08))", border: "1px solid rgba(255,214,0,0.3)", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <div>
                <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".88rem", color: "#b08800" }}>Fechamento de {MONTHS[closingPeriod.month - 1]} pendente</div>
                <div style={{ fontSize: ".74rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>
                  {closingPeriod.daysLeft > 0 ? `Faltam ${closingPeriod.daysLeft} dia${closingPeriod.daysLeft > 1 ? "s" : ""} para o prazo final` : "Hoje é o último dia!"}
                  {" · "}Total parcial: <strong>{fmt(totalBriefings)}</strong>
                </div>
              </div>
            </div>
            <button onClick={() => setClosingModal(true)} style={{ background: "#ffd600", border: "none", borderRadius: 8, color: "#1a1200", cursor: "pointer", fontSize: ".78rem", fontWeight: 700, padding: "8px 18px", fontFamily: "Poppins", flexShrink: 0 }}>
              Fechar mês →
            </button>
          </div>
        )}

        {alreadyClosed && closingPeriod.show && (
          <div style={{ background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)", borderRadius: 14, padding: "12px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <span>✅</span>
            <div style={{ fontSize: ".82rem", color: "#00a864", fontFamily: "Poppins" }}>
              {MONTHS[closingPeriod.month - 1]} fechado — {fmt(currentClosing!.total_final)} aguardando aprovação da equipe DIG.
            </div>
          </div>
        )}

        {overdueB.length > 0 && (
          <div style={{ background: "rgba(220,50,50,0.07)", border: "1px solid rgba(220,50,50,0.25)", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".82rem", color: "#d63232", marginBottom: 12 }}>
              🚨 {overdueB.length} briefing{overdueB.length > 1 ? "s" : ""} com prazo vencido
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {overdueB.map(b => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(220,50,50,0.06)", borderRadius: 8, padding: "8px 12px", gap: 10 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: ".82rem", color: "var(--ws-text)" }}>{b.format}</span>
                    <span style={{ fontSize: ".7rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginLeft: 8 }}>{cases.find(c => c.id === b.case_id)?.name ?? "—"}</span>
                  </div>
                  <DeadlineBadge deadline={b.deadline} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "Poppins", fontWeight: 900, fontSize: "1.8rem", color: "var(--ws-text)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {saudacao}, {firstName}! 👋
            </div>
            <div style={{ fontSize: ".82rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 4 }}>Resumo das suas demandas</div>
          </div>
          <div style={{ display: "flex", border: "1px solid var(--ws-border)", borderRadius: 10, overflow: "hidden" }}>
            {(["overview", "financeiro"] as DashTab[]).map(tab => (
              <button key={tab} onClick={() => setDashTab(tab)} style={{ background: dashTab === tab ? "var(--ws-surface2)" : "none", border: "none", cursor: "pointer", fontSize: ".76rem", padding: "8px 16px", fontFamily: "Poppins", color: dashTab === tab ? "var(--ws-text)" : "var(--ws-text3)", fontWeight: dashTab === tab ? 700 : 400 }}>
                {tab === "overview" ? "📋 Visão Geral" : "💰 Financeiro"}
              </button>
            ))}
          </div>
        </div>

        {dashTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
              <StatCard label="Total de briefings" value={briefings.length} color="#e91e8c" icon="📋" />
              <StatCard label="Aguardando entrega" value={pendentes} color="#ffd600" icon="⏳" />
              <StatCard label="Em revisão" value={emRevisao} color="#ff6b35" icon="🔄" />
              <StatCard label="Aprovados" value={aprovados} color="#00e676" icon="✅" />
            </div>

            <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".9rem", color: "var(--ws-text)", marginBottom: 16 }}>Seus clientes</div>
            {cases.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Nenhum cliente vinculado ainda.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                {cases.map(c => {
                  const cb = briefings.filter(b => b.case_id === c.id);
                  const pending = cb.filter(b => b.status === "aguardando" || b.status === "revisao").length;
                  const overdue = cb.filter(b => b.status !== "aprovado" && deadlineStatus(b.deadline) === "overdue").length;
                  return (
                    <div key={c.id} onClick={() => { setActiveCase(c); setView("workspace"); }}
                      style={{ background: "var(--ws-surface)", border: `1px solid ${overdue > 0 ? "rgba(220,50,50,0.4)" : "var(--ws-border)"}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "border-color .15s, transform .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = overdue > 0 ? "rgba(220,50,50,0.4)" : "var(--ws-border)"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      {/* AJUSTE COPIADO DO CLIENTVIEW.TSX */}
                      <div style={{ width: "100%", height: 72, borderRadius: "14px 14px 0 0", overflow: "hidden", background: c.logo_url ? "#000" : `${c.color}22`, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${c.color}44`, position: "relative" }}>
                        {c.logo_url
                          ? <img src={c.logo_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                          : <span style={{ color: c.color, fontSize: ".9rem", fontWeight: 800 }}>{c.name.slice(0, 2).toUpperCase()}</span>
                        }
                        {overdue > 0 && <div style={{ position: "absolute", top: 8, right: 10, background: "#d63232", color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: ".6rem", fontFamily: "Poppins", fontWeight: 700 }}>🚨 {overdue} atrasado{overdue > 1 ? "s" : ""}</div>}
                        {overdue === 0 && pending > 0 && <div style={{ position: "absolute", top: 8, right: 10, background: "#e91e8c", color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: ".6rem", fontFamily: "Poppins", fontWeight: 700 }}>{pending} pendente{pending > 1 ? "s" : ""}</div>}
                      </div>
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--ws-text)", marginBottom: 6 }}>{c.name}</div>
                        {cb.length === 0 ? <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Nenhum briefing ainda</div> : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {cb.slice(0, 2).map(b => {
                              const cfg = STATUS_CFG[b.status];
                              return (
                                <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                                  <span style={{ fontSize: ".7rem", color: "var(--ws-text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.format}</span>
                                  <span style={{ fontSize: ".6rem", color: cfg.color, fontFamily: "Poppins", fontWeight: 700, flexShrink: 0 }}>● {cfg.label}</span>
                                </div>
                              );
                            })}
                            {cb.length > 2 && <div style={{ fontSize: ".62rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>+{cb.length - 2} mais</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── FINANCEIRO ── */}
        {dashTab === "financeiro" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ws-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".9rem", color: "var(--ws-text)" }}>{MONTHS[closingPeriod.month - 1]} {closingPeriod.year}</div>
                  <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>Mês atual</div>
                </div>
                {!alreadyClosed && closingPeriod.show && (
                  <button onClick={() => setClosingModal(true)} style={{ background: "#ffd600", border: "none", borderRadius: 8, color: "#1a1200", cursor: "pointer", fontSize: ".76rem", fontWeight: 700, padding: "7px 16px", fontFamily: "Poppins" }}>Fechar mês</button>
                )}
                {alreadyClosed && <div style={{ fontSize: ".72rem", color: "#00a864", fontFamily: "Poppins", fontWeight: 700 }}>✓ Fechado — aguardando aprovação</div>}
              </div>
              <div style={{ padding: "16px 20px" }}>
                {briefingsThisMonth.length === 0 ? (
                  <div style={{ fontSize: ".8rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Nenhum briefing este mês ainda.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {briefingsThisMonth.map(b => (
                      <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--ws-surface2)", borderRadius: 8, gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: ".82rem", color: "var(--ws-text)", fontWeight: 600 }}>{b.format}</div>
                          <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>{cases.find(c => c.id === b.case_id)?.name ?? "—"}</div>
                        </div>
                        <div style={{ fontSize: ".82rem", fontFamily: "Poppins", fontWeight: 700, color: b.designer_value ? "var(--ws-text)" : "var(--ws-text3)" }}>
                          {b.designer_value ? fmt(b.designer_value) : "—"}
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--ws-border)" }}>
                      <div style={{ fontSize: ".82rem", fontFamily: "Poppins", color: "var(--ws-text2)" }}>
                        Total: <strong style={{ color: "var(--ws-text)" }}>{fmt(totalBriefings)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {closings.filter(c => c.closed_at).length > 0 && (
              <div>
                <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".82rem", color: "var(--ws-text)", marginBottom: 12 }}>Histórico</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {closings.filter(c => c.closed_at).map(c => (
                    <div key={c.id} style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: ".84rem", color: "var(--ws-text)" }}>{MONTHS[c.month - 1]} {c.year}</div>
                        {c.notes && <div style={{ fontSize: ".7rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>{c.notes}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)" }}>{fmt(c.total_final)}</div>
                        {c.discount > 0 && <div style={{ fontSize: ".65rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Desconto: {fmt(c.discount)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal fechar mês */}
      {closingModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && setClosingModal(false)}>
          <div style={{ background: "var(--ws-surface)", borderRadius: 16, padding: "28px", maxWidth: 480, width: "100%", maxHeight: "90dvh", overflowY: "auto" }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.1rem", color: "var(--ws-text)", marginBottom: 4 }}>Fechar {MONTHS[closingPeriod.month - 1]} {closingPeriod.year}</div>
            <div style={{ fontSize: ".76rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginBottom: 20 }}>Após fechar, a equipe DIG revisará e aprovará o pagamento.</div>

            {briefingsThisMonth.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", marginBottom: 8 }}>Briefings do mês</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {briefingsThisMonth.map(b => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--ws-surface2)", borderRadius: 7, gap: 10 }}>
                      <span style={{ fontSize: ".78rem", color: "var(--ws-text2)" }}>{b.format} — {cases.find(c => c.id === b.case_id)?.name ?? "—"}</span>
                      <span style={{ fontSize: ".78rem", fontFamily: "Poppins", fontWeight: 600, color: b.designer_value ? "var(--ws-text)" : "var(--ws-text3)", flexShrink: 0 }}>
                        {b.designer_value ? fmt(b.designer_value) : "sem valor"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", display: "block", marginBottom: 6 }}>Valor fixo / adicional (opcional)</label>
            <input className="ws-input" type="number" placeholder="R$ 0,00" value={fixedValue} onChange={e => setFixedValue(e.target.value)} style={{ marginBottom: 12 }} />

            <label style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", display: "block", marginBottom: 6 }}>Desconto (opcional)</label>
            <input className="ws-input" type="number" placeholder="R$ 0,00" value={discount} onChange={e => setDiscount(e.target.value)} style={{ marginBottom: 12 }} />

            <label style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", display: "block", marginBottom: 6 }}>Observações</label>
            <textarea className="ws-input" rows={2} placeholder="Ex: Inclui rush de 2 artes..." value={closingNotes} onChange={e => setClosingNotes(e.target.value)} style={{ resize: "vertical", marginBottom: 16 }} />

            <div style={{ background: "var(--ws-surface2)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              {totalBriefings > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: ".78rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Briefings</span><span style={{ fontSize: ".78rem", color: "var(--ws-text2)", fontFamily: "Poppins" }}>{fmt(totalBriefings)}</span></div>}
              {fixedNum > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: ".78rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Fixo/adicional</span><span style={{ fontSize: ".78rem", color: "var(--ws-text2)", fontFamily: "Poppins" }}>+ {fmt(fixedNum)}</span></div>}
              {discountNum > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: ".78rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Desconto</span><span style={{ fontSize: ".78rem", color: "#ff6b35", fontFamily: "Poppins" }}>− {fmt(discountNum)}</span></div>}
              <div style={{ borderTop: "1px solid var(--ws-border)", paddingTop: 8, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)" }}>Total final</span>
                <span style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1rem", color: "#00a864" }}>{fmt(totalFinal)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => void saveClosing()} disabled={savingClosing} style={{ flex: 1, background: "#e91e8c", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: ".84rem", fontWeight: 700, padding: "11px 0", fontFamily: "Poppins" }}>
                {savingClosing ? "Enviando..." : `Enviar para aprovação — ${fmt(totalFinal)}`}
              </button>
              <button onClick={() => setClosingModal(false)} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text2)", cursor: "pointer", fontSize: ".82rem", padding: "11px 16px", fontFamily: "Poppins" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showChangePwd && <DesignerChangePassword onDone={() => setShowChangePwd(false)} />}
    </div>
  );
}

// ── Header do designer ───────────────────────────────────────
function DesignerHeader({ displayName, avatarUrl, uploadingAvatar, fileRef, onAvatarClick, onLogout, onChangePwd, showMenu, onToggleMenu, isDark, onToggleTheme, children }: {
  displayName: string; avatarUrl: string | null; uploadingAvatar: boolean;
  fileRef: React.RefObject<HTMLInputElement>; onAvatarClick: () => void;
  onLogout: () => void; onChangePwd: () => void;
  showMenu: boolean; onToggleMenu: () => void;
  isDark: boolean; onToggleTheme: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--ws-surface)", borderBottom: "1px solid var(--ws-border)", padding: "0 28px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "fixed", top: 0, left: 0, right: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontFamily: "Poppins", fontWeight: 900, fontSize: "1.05rem", color: "var(--ws-text)", letterSpacing: "-0.03em" }}>DIG<span style={{ color: "#e91e8c" }}>.</span></div>
        <div style={{ width: 1, height: 16, background: "var(--ws-border2)" }} />
        <div style={{ fontSize: ".65rem", fontFamily: "Poppins", color: "var(--ws-text3)", letterSpacing: "1.5px", textTransform: "uppercase" }}>Designer</div>
        {children && <><div style={{ width: 1, height: 16, background: "var(--ws-border2)" }} />{children}</>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
        <div onClick={onAvatarClick} title="Clique para trocar sua foto" style={{ width: 30, height: 30, borderRadius: 8, overflow: "hidden", cursor: uploadingAvatar ? "default" : "pointer", flexShrink: 0, border: "1.5px solid #e91e8c44" }}>
          {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #e91e8c44, #e91e8c22)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: ".65rem", color: "#e91e8c" }}>
              {uploadingAvatar ? "..." : displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <button onClick={onToggleMenu} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, padding: "4px 6px", borderRadius: 6 }}>
          <span style={{ fontSize: ".78rem", color: "var(--ws-text2)", fontFamily: "Poppins" }}>{displayName}</span>
          <span style={{ fontSize: ".6rem", color: "var(--ws-text3)" }}>▾</span>
        </button>
        {showMenu && (
          <div style={{ position: "absolute", top: 38, right: 0, background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 10, padding: "6px", minWidth: 160, zIndex: 50, boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
            <button onClick={() => { onAvatarClick(); onToggleMenu(); }} style={{ display: "block", width: "100%", background: "none", border: "none", borderRadius: 7, color: "var(--ws-text2)", cursor: "pointer", fontSize: ".78rem", padding: "8px 12px", textAlign: "left", fontFamily: "Poppins" }}>
              🖼 Alterar foto
            </button>
            <button onClick={() => { onChangePwd(); onToggleMenu(); }} style={{ display: "block", width: "100%", background: "none", border: "none", borderRadius: 7, color: "var(--ws-text2)", cursor: "pointer", fontSize: ".78rem", padding: "8px 12px", textAlign: "left", fontFamily: "Poppins" }}>
              🔑 Alterar senha
            </button>
            <button onClick={() => { onToggleTheme(); onToggleMenu(); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", borderRadius: 7, color: "var(--ws-text2)", cursor: "pointer", fontSize: ".78rem", padding: "8px 12px", textAlign: "left", fontFamily: "Poppins" }}>
              <span>{isDark ? "🌙 Escuro" : "☀️ Claro"}</span>
              <span style={{ width: 32, height: 18, borderRadius: 999, background: isDark ? "var(--ws-surface3, #333)" : "var(--ws-accent, #e91e8c)", position: "relative", flexShrink: 0, transition: "background .2s", display: "inline-block" }}>
                <span style={{ position: "absolute", top: 2, left: isDark ? 2 : 16, width: 14, height: 14, borderRadius: "50%", background: isDark ? "var(--ws-text3)" : "#fff", transition: "left .2s" }} />
              </span>
            </button>
            <div style={{ height: 1, background: "var(--ws-border)", margin: "4px 0" }} />
            <button onClick={onLogout} style={{ display: "block", width: "100%", background: "none", border: "none", borderRadius: 7, color: "#d63232", cursor: "pointer", fontSize: ".78rem", padding: "8px 12px", textAlign: "left", fontFamily: "Poppins" }}>
              ↩ Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Workspace por cliente ────────────────────────────────────
function DesignerClientWorkspace({ profile, caseData, briefings, onBriefingUpdate }: {
  profile: Profile; caseData: Case; briefings: Briefing[];
  onBriefingUpdate: (b: Briefing) => void;
}) {
  const [subTab, setSubTab]               = useState<"briefings" | "identidade">("briefings");
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity | null>(null);
  const [loadingBrand, setLoadingBrand]   = useState(false);
  const [detailBriefing, setDetailBriefing] = useState<Briefing | null>(null);
  const [editingValue, setEditingValue]   = useState("");
  const [savingValue, setSavingValue]     = useState(false);

  useEffect(() => {
    async function loadBrand() {
      setLoadingBrand(true);
      const { data } = await supabase.from("brand_identity").select("*").eq("case_id", caseData.id).maybeSingle();
      setBrandIdentity(data);
      setLoadingBrand(false);
    }
    void loadBrand();
  }, [caseData.id]);

  async function saveValue(b: Briefing) {
    const val = parseFloat(editingValue);
    if (isNaN(val)) return;
    setSavingValue(true);
    const { data } = await supabase.from("briefings").update({ designer_value: val }).eq("id", b.id).select().single();
    if (data) { onBriefingUpdate(data); setDetailBriefing(data); }
    setSavingValue(false);
  }

  const overdueBriefings = briefings.filter(b => b.status !== "aprovado" && deadlineStatus(b.deadline) === "overdue");

  return (
    <div style={{ border: "1px solid var(--ws-border)", borderRadius: 14, overflow: "hidden", minHeight: 400 }}>
      <div style={{ padding: "16px 20px 0", borderBottom: "1px solid var(--ws-border)", background: "var(--ws-surface)" }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1rem", color: "var(--ws-text)" }}>{caseData.name}<span style={{ color: caseData.color }}>.</span></div>
          {overdueBriefings.length > 0 && (
            <div style={{ fontSize: ".72rem", color: "#d63232", fontFamily: "Poppins", marginTop: 3 }}>🚨 {overdueBriefings.length} briefing{overdueBriefings.length > 1 ? "s" : ""} com prazo vencido</div>
          )}
        </div>
        <div style={{ display: "flex" }}>
          {(["briefings", "identidade"] as const).map(tab => (
            <button key={tab} onClick={() => setSubTab(tab)} style={{ background: "none", border: "none", cursor: "pointer", borderBottom: subTab === tab ? `2px solid ${caseData.color}` : "2px solid transparent", color: subTab === tab ? caseData.color : "var(--ws-text3)", fontSize: ".78rem", padding: "6px 14px", fontFamily: "inherit", transition: "all .15s", marginBottom: -1 }}>
              {tab === "briefings" ? "📋 Briefings" : "🎨 Identidade Visual"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 20, background: "var(--ws-bg)" }}>
        {subTab === "briefings" && (
          briefings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".82rem" }}>Nenhum briefing para este cliente ainda.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {briefings.map(b => {
                const cfg = STATUS_CFG[b.status];
                const ds  = deadlineStatus(b.deadline);
                return (
                  <div key={b.id} onClick={() => { setDetailBriefing(b); setEditingValue(String(b.designer_value ?? "")); }}
                    style={{ background: "var(--ws-surface)", border: `1px solid ${ds === "overdue" ? "rgba(220,50,50,0.35)" : "var(--ws-border)"}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, transition: "border-color .15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = caseData.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = ds === "overdue" ? "rgba(220,50,50,0.35)" : "var(--ws-border)"}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)", marginBottom: 4 }}>{b.format}</div>
                      <DeadlineBadge deadline={b.deadline} />
                      {b.reference_links?.length > 0 && (
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {b.reference_links.map((link, i) => (
                            <a key={i} href={link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                              style={{ fontSize: ".62rem", color: caseData.color, background: `${caseData.color}15`, borderRadius: 4, padding: "2px 7px", textDecoration: "none", fontFamily: "Poppins", whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                              ↗ {link.replace(/^https?:\/\//, "").slice(0, 30)}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ background: `${cfg.color}18`, color: cfg.color, borderRadius: 20, padding: "4px 10px", fontSize: ".65rem", fontFamily: "Poppins", fontWeight: 700, display: "flex", alignItems: "center", gap: 5, marginBottom: b.designer_value ? 4 : 0 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color }} />{cfg.label}
                      </div>
                      {b.designer_value ? (
                        <div style={{ fontSize: ".68rem", color: "#00a864", fontFamily: "Poppins", fontWeight: 600 }}>{fmt(b.designer_value)}</div>
                      ) : (
                        <div style={{ fontSize: ".62rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>sem valor</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {subTab === "identidade" && (
          loadingBrand ? <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Carregando...</div> :
          !brandIdentity || (!brandIdentity.colors?.length && !brandIdentity.fonts?.length && !brandIdentity.links?.length && !brandIdentity.style_notes && !brandIdentity.warnings) ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".82rem" }}>Identidade visual não cadastrada ainda.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {brandIdentity.colors?.length > 0 && (
                <div>
                  <BILabel>Paleta de cores</BILabel>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {brandIdentity.colors.map((c, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 10, background: c.hex, border: "1px solid var(--ws-border)", boxShadow: `0 2px 8px ${c.hex}44` }} />
                        <span style={{ fontSize: ".6rem", fontFamily: "Poppins", color: "var(--ws-text3)" }}>{c.hex}</span>
                        {c.name && <span style={{ fontSize: ".6rem", fontFamily: "Poppins", color: "var(--ws-text2)" }}>{c.name}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {brandIdentity.fonts?.length > 0 && (
                <div>
                  <BILabel>Tipografia</BILabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {brandIdentity.fonts.map((f, i) => (
                      <div key={i} style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 600, fontSize: ".84rem", color: "var(--ws-text)" }}>{f.name}</span>
                        <span style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>{f.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {brandIdentity.style_notes && (
                <div>
                  <BILabel>Estilo / Personalidade</BILabel>
                  <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 8, padding: "10px 14px", fontSize: ".82rem", color: "var(--ws-text2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{brandIdentity.style_notes}</div>
                </div>
              )}
              {brandIdentity.links?.length > 0 && (
                <div>
                  <BILabel>Links</BILabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {brandIdentity.links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 8, padding: "8px 12px", textDecoration: "none" }}>
                        <span style={{ fontSize: ".8rem", fontWeight: 600, color: caseData.color }}>{l.label}</span>
                        <span style={{ fontSize: ".65rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>↗ {l.url.slice(0, 40)}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {brandIdentity.warnings && (
                <div>
                  <BILabel>⚠️ Avisos</BILabel>
                  <div style={{ background: "rgba(255,214,0,0.08)", border: "1px solid rgba(255,214,0,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: ".82rem", color: "#b08800", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{brandIdentity.warnings}</div>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Modal detalhe briefing */}
      {detailBriefing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && setDetailBriefing(null)}>
          <div style={{ background: "var(--ws-surface)", borderRadius: 16, padding: "24px", maxWidth: 520, width: "100%", maxHeight: "90dvh", overflowY: "auto" }}>
            {/* Header fixo com X */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, position: "sticky", top: 0, background: "var(--ws-surface)", paddingBottom: 12, borderBottom: "1px solid var(--ws-border)", zIndex: 2 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1rem", color: "var(--ws-text)" }}>{detailBriefing.format}</div>
                <div style={{ marginTop: 4 }}><DeadlineBadge deadline={detailBriefing.deadline} /></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {(() => { const cfg = STATUS_CFG[detailBriefing.status]; return (
                  <div style={{ background: `${cfg.color}18`, color: cfg.color, borderRadius: 20, padding: "4px 10px", fontSize: ".65rem", fontFamily: "Poppins", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color }} />{cfg.label}
                  </div>
                ); })()}
                <button onClick={() => setDetailBriefing(null)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1, padding: "2px 4px" }}>×</button>
              </div>
            </div>
            {/* Revisão no topo */}
            {detailBriefing.revision_note && detailBriefing.status === "revisao" && (
              <div style={{ background: "rgba(255,107,53,0.10)", border: "1px solid rgba(255,107,53,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span>↩</span>
                <div>
                  <div style={{ fontSize: ".65rem", fontFamily: "Poppins", letterSpacing: "1px", textTransform: "uppercase", color: "#ff6b35", marginBottom: 2 }}>Revisão solicitada</div>
                  <div style={{ fontSize: ".82rem", color: "#ff6b35" }}>{detailBriefing.revision_note}</div>
                </div>
              </div>
            )}

            {detailBriefing.reference_text && <BISection label="Briefing / Referência"><p style={{ margin: 0, fontSize: ".82rem", color: "var(--ws-text2)", lineHeight: 1.6 }}>{detailBriefing.reference_text}</p></BISection>}
            {detailBriefing.reference_links?.length > 0 && (
              <BISection label="Links de referência">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {detailBriefing.reference_links.map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noreferrer" style={{ fontSize: ".78rem", color: caseData.color, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</a>
                  ))}
                </div>
              </BISection>
            )}
            {detailBriefing.reference_images?.length > 0 && (
              <BISection label="Imagens de referência">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {detailBriefing.reference_images.map((url, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={url} alt="" style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", border: "1px solid var(--ws-border)", display: "block" }} />
                      <button onClick={e => { e.preventDefault(); void downloadFile(url); }}
                        style={{ position: "absolute", bottom: 3, left: 3, background: "rgba(0,0,0,.65)", border: "none", borderRadius: 4, padding: "2px 5px", fontSize: ".55rem", color: "#fff", cursor: "pointer" }}>↓</button>
                    </div>
                  ))}
                </div>
              </BISection>
            )}
            {detailBriefing.revision_note && <BISection label="Revisão solicitada"><p style={{ margin: 0, fontSize: ".82rem", color: "#ff6b35", lineHeight: 1.6 }}>{detailBriefing.revision_note}</p></BISection>}

            {/* Entrega de arte */}
            <BISection label="Entregar arte">
              <DesignerDeliveryUpload
                briefing={detailBriefing}
                caseData={caseData}
                onDelivered={(updated) => { onBriefingUpdate(updated); setDetailBriefing(updated); }}
              />
              {detailBriefing.status === "aprovado" && (
                <div style={{ marginTop: 8, fontSize: ".76rem", color: "#00a864", fontFamily: "Poppins", fontWeight: 600 }}>✓ Arte aprovada!</div>
              )}
              {detailBriefing.revision_note && detailBriefing.status === "revisao" && (
                <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255,107,53,0.1)", borderRadius: 7, fontSize: ".76rem", color: "#ff6b35", fontFamily: "Poppins" }}>
                  ↩ Revisão: {detailBriefing.revision_note}
                </div>
              )}
            </BISection>

            <BISection label="Meu valor para este briefing">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: ".78rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>R$</span>
                  <input className="ws-input" type="number" placeholder="0,00" value={editingValue} onChange={e => setEditingValue(e.target.value)} style={{ paddingLeft: 30, marginBottom: 0 }} />
                </div>
                <button onClick={() => void saveValue(detailBriefing)} disabled={savingValue} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text2)", cursor: "pointer", padding: "8px 14px", fontSize: ".76rem", fontFamily: "Poppins", flexShrink: 0 }}>
                  {savingValue ? "..." : "Salvar"}
                </button>
              </div>
              {detailBriefing.designer_value > 0 && (
                <div style={{ marginTop: 6, fontSize: ".72rem", color: "#00a864", fontFamily: "Poppins", fontWeight: 600 }}>✓ {fmt(detailBriefing.designer_value)} registrado</div>
              )}
            </BISection>


          </div>
        </div>
      )}
    </div>
  );
}

async function downloadFile(url: string, filename?: string) {
  const name = filename || url.split("/").pop()?.split("?")[0] || "arquivo";
  try {
    const { data, error } = await supabase.functions.invoke("download-file", {
      body: { url, filename: name },
    });
    if (error) throw error;
    const blob = new Blob([data], { type: "application/octet-stream" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch {
    window.open(url, "_blank");
  }
}

function DesignerDeliveryUpload({ briefing, caseData, onDelivered }: {
  briefing: Briefing; caseData: Case;
  onDelivered: (b: Briefing) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const R2 = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";

  async function uploadFiles(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `deliveries/${caseData.id}/${briefing.id}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.functions.invoke("get-r2-upload-url", { body: { filename: path, contentType: file.type } });
      if (error || !data?.signedUrl) continue;
      const res = await fetch(data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (res.ok) urls.push(`${R2}/${path}`);
    }
    return urls;
  }

  async function handleSendForApproval() {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    const urls = await uploadFiles(pendingFiles);
    if (urls.length > 0) {
      const newUrls = [...(briefing.delivery_urls ?? []), ...urls];
      const { data } = await supabase.from("briefings")
        .update({ delivery_urls: newUrls, status: "entregue" })
        .eq("id", briefing.id).select().single();
      if (data) onDelivered(data);
    }
    setPendingFiles([]);
    setPendingUrls([]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function removeDelivery(i: number) {
    const newUrls = (briefing.delivery_urls ?? []).filter((_, idx) => idx !== i);
    const { data } = await supabase.from("briefings")
      .update({ delivery_urls: newUrls, status: newUrls.length === 0 ? "aguardando" : "entregue" })
      .eq("id", briefing.id).select().single();
    if (data) onDelivered(data);
  }

  if (briefing.status === "aprovado") return (
    <div style={{ fontSize: ".76rem", color: "#00a864", fontFamily: "Poppins", fontWeight: 600 }}>✓ Arte aprovada!</div>
  );

  return (
    <div>
      {/* Artes já enviadas — designer pode remover */}
      {(briefing.delivery_urls?.length ?? 0) > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {briefing.delivery_urls!.map((url, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={url} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover", border: `1px solid ${caseData.color}44`, display: "block" }} />
              <button onClick={() => void removeDelivery(i)}
                style={{ position: "absolute", top: 3, right: 3, background: "rgba(220,50,50,.8)", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: ".65rem", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          ))}
        </div>
      )}
      {/* Selecionar + enviar — preview só aparece se nada enviado ainda ou em edição */}
      {pendingFiles.length > 0 && !uploading && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {pendingUrls.map((url, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={url} alt="" style={{ width: 64, height: 64, borderRadius: 6, objectFit: "cover", border: "1px dashed var(--ws-border2)", display: "block", opacity: 0.7 }} />
              <div style={{ position: "absolute", bottom: 2, left: 2, background: "rgba(0,0,0,.5)", borderRadius: 3, padding: "1px 4px", fontSize: ".5rem", color: "#fff", fontFamily: "Poppins" }}>novo</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <div onClick={() => !uploading && fileRef.current?.click()}
          style={{ flex: 1, border: "1px dashed var(--ws-border2)", borderRadius: 8, padding: "8px 12px", cursor: uploading ? "default" : "pointer", color: "var(--ws-text3)", fontSize: ".74rem", fontFamily: "Poppins", textAlign: "center", opacity: uploading ? 0.5 : 1 }}>
          {uploading ? "Enviando..." : pendingFiles.length > 0 ? `${pendingFiles.length} arquivo(s) selecionado(s)` : "Selecionar arquivos"}
        </div>
        {pendingFiles.length > 0 && !uploading && (
          <button onClick={() => void handleSendForApproval()}
            style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: ".76rem", fontWeight: 700, padding: "8px 14px", fontFamily: "Poppins", flexShrink: 0 }}>
            📤 Enviar para aprovação
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*,.pdf" multiple style={{ display: "none" }}
        onChange={e => {
          const files = Array.from(e.target.files ?? []);
          setPendingFiles(files);
          setPendingUrls(files.map(f => URL.createObjectURL(f)));
        }} />
    </div>
  );
}

function BILabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", marginBottom: 8 }}>{children}</div>;
}

function BISection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", marginBottom: 6 }}>{label}</div>
      <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "10px 12px" }}>{children}</div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "1.3rem" }}>{icon}</span>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      </div>
      <div>
        <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "2rem", color: "var(--ws-text)", lineHeight: 1, letterSpacing: "-0.04em" }}>{value}</div>
        <div style={{ fontSize: ".7rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}