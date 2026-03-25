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
    const payload = { designer_id: profile.id, month: closingPeriod.month, year: closingPeriod.year, total_bruto: totalBruto, discount: discountNum, total_final: totalFinal, notes: closingNotes, closed_at: new Date().toISOString() };
    const { data } = await supabase.from("designer_closings").upsert(payload, { onConflict: "designer_id,month,year" }).select().single();
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
          <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", fontFamily: "Poppins", letterSpacing: "1px" }}>← Dashboard</button>
        </DesignerHeader>
        <div style={{ flex: 1, padding: "28px" }}>
          <DesignerClientWorkspace profile={profile} caseData={activeCase} briefings={briefings.filter(b => b.case_id === activeCase.id)} onBriefingUpdate={updated => setBriefings(prev => prev.map(b => b.id === updated.id ? updated : b))} />
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

      <div style={{ flex: 1, padding: "32px 28px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
        {/* Banner aviso fechamento */}
        {closingPeriod.show && !alreadyClosed && (
          <div style={{ background: "linear-gradient(135deg, rgba(255,214,0,0.12), rgba(255,107,53,0.08))", border: "1px solid rgba(255,214,0,0.3)", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <div>
                <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".88rem", color: "#b08800" }}>Fechamento de {MONTHS[closingPeriod.month - 1]} pendente</div>
                <div style={{ fontSize: ".74rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>{closingPeriod.daysLeft > 0 ? `Faltam ${closingPeriod.daysLeft} dia${closingPeriod.daysLeft > 1 ? "s" : ""} para o prazo final` : "Hoje é o último dia!"} · Total parcial: <strong>{fmt(totalBriefings)}</strong></div>
              </div>
            </div>
            <button onClick={() => setClosingModal(true)} style={{ background: "#ffd600", border: "none", borderRadius: 8, color: "#1a1200", cursor: "pointer", fontSize: ".78rem", fontWeight: 700, padding: "8px 18px", fontFamily: "Poppins" }}>Fechar mês →</button>
          </div>
        )}

        {/* Quadro de atrasos */}
        {overdueB.length > 0 && (
          <div style={{ background: "rgba(220,50,50,0.07)", border: "1px solid rgba(220,50,50,0.25)", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".82rem", color: "#d63232", marginBottom: 12 }}>🚨 {overdueB.length} briefing{overdueB.length > 1 ? "s" : ""} com prazo vencido</div>
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
            <div style={{ fontFamily: "Poppins", fontWeight: 900, fontSize: "1.8rem", color: "var(--ws-text)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>{saudacao}, {firstName}! 👋</div>
            <div style={{ fontSize: ".82rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 4 }}>Resumo das suas demandas</div>
          </div>
          <div style={{ display: "flex", border: "1px solid var(--ws-border)", borderRadius: 10, overflow: "hidden" }}>
            {(["overview", "financeiro"] as DashTab[]).map(tab => (
              <button key={tab} onClick={() => setDashTab(tab)} style={{ background: dashTab === tab ? "var(--ws-surface2)" : "none", border: "none", cursor: "pointer", fontSize: ".76rem", padding: "8px 16px", fontFamily: "Poppins", color: dashTab === tab ? "var(--ws-text)" : "var(--ws-text3)", fontWeight: dashTab === tab ? 700 : 400 }}>{tab === "overview" ? "📋 Visão Geral" : "💰 Financeiro"}</button>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {cases.map(c => {
                const cb = briefings.filter(b => b.case_id === c.id);
                const pending = cb.filter(b => b.status === "aguardando" || b.status === "revisao").length;
                const overdue = cb.filter(b => b.status !== "aprovado" && deadlineStatus(b.deadline) === "overdue").length;
                return (
                  <div key={c.id} onClick={() => { setActiveCase(c); setView("workspace"); }}
                    style={{ background: "var(--ws-surface)", border: `1px solid ${overdue > 0 ? "rgba(220,50,50,0.4)" : "var(--ws-border)"}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "all .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = overdue > 0 ? "rgba(220,50,50,0.4)" : "var(--ws-border)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {/* LOGO E FUNDO COPIADOS DO CLIENTVIEW.TSX */}
                    <div style={{ width: "100%", height: 72, background: c.logo_url ? "#000" : `${c.color}22`, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${c.color}44`, position: "relative" }}>
                      {c.logo_url ? <img src={c.logo_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        : <span style={{ color: c.color, fontSize: ".9rem", fontWeight: 800 }}>{c.name.slice(0, 2).toUpperCase()}</span>
                      }
                      {overdue > 0 && <div style={{ position: "absolute", top: 8, right: 10, background: "#d63232", color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: ".6rem", fontFamily: "Poppins", fontWeight: 700 }}>🚨 {overdue} atrasado</div>}
                      {overdue === 0 && pending > 0 && <div style={{ position: "absolute", top: 8, right: 10, background: "#e91e8c", color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: ".6rem", fontFamily: "Poppins", fontWeight: 700 }}>{pending} pendente</div>}
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--ws-text)", marginBottom: 6 }}>{c.name}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {cb.slice(0, 2).map(b => (
                          <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                            <span style={{ fontSize: ".7rem", color: "var(--ws-text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.format}</span>
                            <span style={{ fontSize: ".6rem", color: STATUS_CFG[b.status].color, fontFamily: "Poppins", fontWeight: 700 }}>● {STATUS_CFG[b.status].label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {dashTab === "financeiro" && (
          <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ws-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".9rem", color: "var(--ws-text)" }}>{MONTHS[closingPeriod.month - 1]} {closingPeriod.year}</div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {briefingsThisMonth.length === 0 ? <div style={{ fontSize: ".8rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Nenhum briefing este mês.</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {briefingsThisMonth.map(b => (
                    <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--ws-surface2)", borderRadius: 8 }}>
                      <div><div style={{ fontSize: ".82rem", color: "var(--ws-text)", fontWeight: 600 }}>{b.format}</div></div>
                      <div style={{ fontSize: ".82rem", fontFamily: "Poppins", fontWeight: 700 }}>{b.designer_value ? fmt(b.designer_value) : "—"}</div>
                    </div>
                  ))}
                  <div style={{ textAlign: "right", paddingTop: 8, borderTop: "1px solid var(--ws-border)", fontWeight: 700 }}>Total: {fmt(totalBriefings)}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal fechar mês */}
      {closingModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && setClosingModal(false)}>
          <div style={{ background: "var(--ws-surface)", borderRadius: 16, padding: "28px", maxWidth: 480, width: "100%" }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.1rem", color: "var(--ws-text)", marginBottom: 20 }}>Fechar {MONTHS[closingPeriod.month - 1]}</div>
            <label style={{ fontSize: ".62rem", color: "var(--ws-text3)", display: "block", marginBottom: 6 }}>Valor fixo / adicional</label>
            <input className="ws-input" type="number" value={fixedValue} onChange={e => setFixedValue(e.target.value)} style={{ marginBottom: 12 }} />
            <label style={{ fontSize: ".62rem", color: "var(--ws-text3)", display: "block", marginBottom: 6 }}>Desconto</label>
            <input className="ws-input" type="number" value={discount} onChange={e => setDiscount(e.target.value)} style={{ marginBottom: 12 }} />
            <div style={{ background: "var(--ws-surface2)", padding: 12, borderRadius: 8, marginBottom: 20, textAlign: "right", fontWeight: 700 }}>Total final: {fmt(totalFinal)}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => void saveClosing()} disabled={savingClosing} style={{ flex: 1, background: "#e91e8c", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, cursor: "pointer" }}>{savingClosing ? "Enviando..." : "Enviar para aprovação"}</button>
              <button onClick={() => setClosingModal(false)} style={{ background: "var(--ws-surface2)", border: "none", borderRadius: 8, padding: "12px", color: "var(--ws-text2)", cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {showChangePwd && <DesignerChangePassword onDone={() => setShowChangePwd(false)} />}
    </div>
  );
}

function DesignerHeader({ displayName, avatarUrl, uploadingAvatar, fileRef, onAvatarClick, onLogout, onChangePwd, showMenu, onToggleMenu, isDark, onToggleTheme, children }: any) {
  return (
    <div style={{ background: "var(--ws-surface)", borderBottom: "1px solid var(--ws-border)", padding: "0 28px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontFamily: "Poppins", fontWeight: 900, fontSize: "1.05rem", color: "var(--ws-text)" }}>DIG<span style={{ color: "#e91e8c" }}>.</span></div>
        <div style={{ width: 1, height: 16, background: "var(--ws-border2)" }} />
        <div style={{ fontSize: ".65rem", color: "var(--ws-text3)", letterSpacing: "1.5px", textTransform: "uppercase" }}>Designer</div>
        {children}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
        <div onClick={onAvatarClick} style={{ width: 30, height: 30, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: "1.5px solid #e91e8c44" }}>
          {avatarUrl ? <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: "#e91e8c22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", color: "#e91e8c" }}>{displayName.slice(0, 2).toUpperCase()}</div>}
        </div>
        <button onClick={onToggleMenu} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ws-text2)", fontSize: ".78rem" }}>{displayName} ▾</button>
        {showMenu && (
          <div style={{ position: "absolute", top: 38, right: 0, background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 10, padding: "6px", minWidth: 160, zIndex: 50, boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
            <button onClick={onChangePwd} style={{ display: "block", width: "100%", background: "none", border: "none", color: "var(--ws-text2)", padding: "8px", textAlign: "left", cursor: "pointer" }}>🔑 Alterar senha</button>
            <button onClick={onToggleTheme} style={{ display: "block", width: "100%", background: "none", border: "none", color: "var(--ws-text2)", padding: "8px", textAlign: "left", cursor: "pointer" }}>{isDark ? "🌙 Escuro" : "☀️ Claro"}</button>
            <button onClick={onLogout} style={{ display: "block", width: "100%", background: "none", border: "none", color: "#d63232", padding: "8px", textAlign: "left", cursor: "pointer" }}>↩ Sair</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DesignerClientWorkspace({ caseData, briefings, onBriefingUpdate }: any) {
  const [detailBriefing, setDetailBriefing] = useState<any>(null);
  const [editingValue, setEditingValue] = useState("");
  const saveValue = async (b: any) => {
    const { data } = await supabase.from("briefings").update({ designer_value: parseFloat(editingValue) }).eq("id", b.id).select().single();
    if (data) { onBriefingUpdate(data); setDetailBriefing(null); }
  };

  return (
    <div style={{ border: "1px solid var(--ws-border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ws-border)", background: "var(--ws-surface)" }}>
        <div style={{ fontFamily: "Poppins", fontWeight: 800, color: "var(--ws-text)" }}>{caseData.name}</div>
      </div>
      <div style={{ padding: 20 }}>
        {briefings.map((b: any) => (
          <div key={b.id} onClick={() => { setDetailBriefing(b); setEditingValue(String(b.designer_value || "")); }} style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 12, padding: 14, marginBottom: 10, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
            <div><div style={{ fontWeight: 700, color: "var(--ws-text)" }}>{b.format}</div><DeadlineBadge deadline={b.deadline} /></div>
            <div style={{ color: STATUS_CFG[b.status as Briefing["status"]].color, fontWeight: 700 }}>● {STATUS_CFG[b.status as Briefing["status"]].label}</div>
          </div>
        ))}
      </div>
      {detailBriefing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--ws-surface)", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%" }}>
            <div style={{ fontWeight: 800, marginBottom: 16 }}>{detailBriefing.format}</div>
            <input className="ws-input" type="number" value={editingValue} onChange={e => setEditingValue(e.target.value)} placeholder="Meu valor R$" style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => void saveValue(detailBriefing)} style={{ flex: 1, background: "#e91e8c", color: "#fff", border: "none", borderRadius: 8, padding: 10, fontWeight: 700 }}>Salvar</button>
              <button onClick={() => setDetailBriefing(null)} style={{ flex: 1, background: "var(--ws-surface2)", border: "none", borderRadius: 8, padding: 10, color: "var(--ws-text2)" }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: any) {
  return (
    <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 14, padding: "18px 20px" }}>
      <span style={{ fontSize: "1.3rem" }}>{icon}</span>
      <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "2rem", color: "var(--ws-text)" }}>{value}</div>
      <div style={{ fontSize: ".7rem", color: "var(--ws-text3)" }}>{label}</div>
    </div>
  );
}