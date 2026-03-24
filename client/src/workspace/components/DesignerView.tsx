// client/src/workspace/components/DesignerView.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import { CasesGlobalStyle } from "./cases/styles";
import TabDesigner from "./cases/tabs/TabDesigner";
import Loader from "./cases/shared/Loader";
import type { Case, Briefing, DesignerClosing } from "./cases/types";

interface DesignerViewProps { profile: Profile; }
type View = "dashboard" | "workspace";
type DashTab = "overview" | "financeiro";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const STATUS_CFG: Record<Briefing["status"], { color: string; label: string }> = {
  aguardando: { color: "#ffd600", label: "Aguardando" },
  entregue:   { color: "#4b6bff", label: "Entregue"   },
  revisao:    { color: "#ff6b35", label: "Em revisão" },
  aprovado:   { color: "#00e676", label: "Aprovado"   },
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Calcula se está no período de aviso (5 dias antes do fim do mês até dia 1 do próximo)
function isClosingPeriod(): { show: boolean; daysLeft: number; month: number; year: number } {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startWarn = lastDay - 4; // 5 dias antes (lastDay-4 até lastDay)

  // Período: do dia (lastDay-4) até dia 1 do mês seguinte
  if (day >= startWarn) {
    return { show: true, daysLeft: lastDay - day + 1, month: month + 1, year }; // month 1-indexed
  }
  // Dia 1 do mês atual (ainda mostra aviso do mês anterior)
  if (day === 1) {
    const prevMonth = month === 0 ? 12 : month;
    const prevYear  = month === 0 ? year - 1 : year;
    return { show: true, daysLeft: 0, month: prevMonth, year: prevYear };
  }
  return { show: false, daysLeft: 0, month: month + 1, year };
}

export default function DesignerView({ profile }: DesignerViewProps) {
  const [view, setView]             = useState<View>("dashboard");
  const [dashTab, setDashTab]       = useState<DashTab>("overview");
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [cases, setCases]           = useState<Case[]>([]);
  const [briefings, setBriefings]   = useState<Briefing[]>([]);
  const [closings, setClosings]     = useState<DesignerClosing[]>([]);
  const [loading, setLoading]       = useState(true);
  const [closingModal, setClosingModal] = useState(false);
  const [savingClosing, setSavingClosing] = useState(false);

  // Fechamento form
  const closingPeriod = isClosingPeriod();
  const [fixedValue, setFixedValue]   = useState("");
  const [discount, setDiscount]       = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  const firstName = profile.name?.split(" ")[0] ?? "Designer";
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  // Verifica se o mês atual já foi fechado
  const currentClosing = closings.find(
    c => c.month === closingPeriod.month && c.year === closingPeriod.year
  );
  const alreadyClosed = !!currentClosing?.closed_at;

  useEffect(() => {
    async function load() {
      const { data: dcRows } = await supabase
        .from("designer_cases").select("case_id").eq("designer_id", profile.id);
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

  async function handleLogout() { await supabase.auth.signOut(); }

  function openCase(c: Case) { setActiveCase(c); setView("workspace"); }

  // Briefings do mês atual para fechamento
  const now = new Date();
  const briefingsThisMonth = briefings.filter(b => {
    const d = new Date(b.created_at);
    return d.getMonth() + 1 === closingPeriod.month && d.getFullYear() === closingPeriod.year;
  });

  const totalBriefings = briefingsThisMonth.reduce((s, b) => s + (b.designer_value ?? 0), 0);
  const fixedNum   = parseFloat(fixedValue) || 0;
  const discountNum = parseFloat(discount) || 0;
  const totalBruto = totalBriefings + fixedNum;
  const totalFinal = Math.max(0, totalBruto - discountNum);

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

    const { data } = await supabase
      .from("designer_closings")
      .upsert(payload, { onConflict: "designer_id,month,year" })
      .select().single();

    if (data) {
      setClosings(prev => {
        const exists = prev.findIndex(c => c.month === data.month && c.year === data.year);
        if (exists >= 0) { const n = [...prev]; n[exists] = data; return n; }
        return [data, ...prev];
      });

      // Lança no financeiro global como saída
      await supabase.from("financial").insert({
        description: `Pagamento designer — ${profile.name} — ${MONTHS[closingPeriod.month - 1]}/${closingPeriod.year}`,
        type: "pagamento",
        due_date: `${closingPeriod.year}-${String(closingPeriod.month).padStart(2,"0")}-01`,
        amount: totalFinal,
        positive: false,
        status: "pendente",
        related_name: profile.name,
        notes: closingNotes || `Fechamento mensal do designer ${profile.name}`,
        created_at: new Date().toISOString(),
      });

      setClosingModal(false);
    }
    setSavingClosing(false);
  }

  // Stats
  const pendentes = briefings.filter(b => b.status === "aguardando").length;
  const emRevisao = briefings.filter(b => b.status === "revisao").length;
  const aprovados = briefings.filter(b => b.status === "aprovado").length;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--ws-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader />
    </div>
  );

  // ── WORKSPACE ──
  if (view === "workspace" && activeCase) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ws-bg)", display: "flex", flexDirection: "column" }}>
        <CasesGlobalStyle />
        <Header profile={profile} onLogout={handleLogout}>
          <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", fontFamily: "Poppins", letterSpacing: "1px" }}>← Dashboard</button>
        </Header>
        <div style={{ flex: 1, padding: "28px" }}>
          <TabDesigner caseData={activeCase} readonly={false} />
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──
  return (
    <div style={{ minHeight: "100vh", background: "var(--ws-bg)", display: "flex", flexDirection: "column" }}>
      <CasesGlobalStyle />
      <Header profile={profile} onLogout={handleLogout} />

      <div style={{ flex: 1, padding: "32px 28px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>

        {/* Banner de aviso de fechamento */}
        {closingPeriod.show && !alreadyClosed && (
          <div style={{
            background: "linear-gradient(135deg, rgba(255,214,0,0.12), rgba(255,107,53,0.08))",
            border: "1px solid rgba(255,214,0,0.3)", borderRadius: 14,
            padding: "16px 20px", marginBottom: 24,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <div>
                <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".88rem", color: "#b08800" }}>
                  Fechamento de {MONTHS[closingPeriod.month - 1]} pendente
                </div>
                <div style={{ fontSize: ".74rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>
                  {closingPeriod.daysLeft > 0
                    ? `Faltam ${closingPeriod.daysLeft} dia${closingPeriod.daysLeft > 1 ? "s" : ""} para o prazo final (dia 1 do próximo mês)`
                    : "Hoje é o último dia! Finalize o fechamento."
                  }
                  {" · "}Total parcial: <strong>{fmt(totalBriefings)}</strong>
                </div>
              </div>
            </div>
            <button
              onClick={() => setClosingModal(true)}
              style={{ background: "#ffd600", border: "none", borderRadius: 8, color: "#1a1200", cursor: "pointer", fontSize: ".78rem", fontWeight: 700, padding: "8px 18px", fontFamily: "Poppins", flexShrink: 0 }}
            >
              Fechar mês →
            </button>
          </div>
        )}

        {alreadyClosed && closingPeriod.show && (
          <div style={{ background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)", borderRadius: 14, padding: "12px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.2rem" }}>✅</span>
            <div style={{ fontSize: ".82rem", color: "#00a864", fontFamily: "Poppins" }}>
              {MONTHS[closingPeriod.month - 1]} fechado — {fmt(currentClosing!.total_final)} enviado para pagamento.
            </div>
          </div>
        )}

        {/* Saudação + tabs */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "Poppins", fontWeight: 900, fontSize: "1.8rem", color: "var(--ws-text)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {saudacao}, {firstName}! 👋
            </div>
            <div style={{ fontSize: ".82rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 4 }}>Resumo das suas demandas</div>
          </div>
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--ws-border)", borderRadius: 10, overflow: "hidden" }}>
            {(["overview", "financeiro"] as DashTab[]).map(tab => (
              <button key={tab} onClick={() => setDashTab(tab)} style={{ background: dashTab === tab ? "var(--ws-surface2)" : "none", border: "none", cursor: "pointer", fontSize: ".76rem", padding: "8px 16px", fontFamily: "Poppins", color: dashTab === tab ? "var(--ws-text)" : "var(--ws-text3)", fontWeight: dashTab === tab ? 700 : 400 }}>
                {tab === "overview" ? "📋 Visão Geral" : "💰 Financeiro"}
              </button>
            ))}
          </div>
        </div>

        {/* ── OVERVIEW ── */}
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
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".85rem" }}>
                Nenhum cliente vinculado ainda. Aguarde a equipe DIG enviar um briefing.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                {cases.map(c => {
                  const cb = briefings.filter(b => b.case_id === c.id);
                  const pending = cb.filter(b => b.status === "aguardando" || b.status === "revisao").length;
                  return (
                    <div key={c.id} onClick={() => openCase(c)}
                      style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "border-color .15s, transform .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ws-border)"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <div style={{ height: 72, background: `linear-gradient(135deg, ${c.color}44, ${c.color}11)`, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${c.color}22`, position: "relative" }}>
                        {c.logo_url
                          ? <img src={c.logo_url} alt={c.name} style={{ height: 44, maxWidth: 120, objectFit: "contain" }} />
                          : <div style={{ width: 48, height: 48, borderRadius: 12, background: `${c.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.1rem", color: c.color }}>{c.name.slice(0, 2).toUpperCase()}</div>
                        }
                        {pending > 0 && (
                          <div style={{ position: "absolute", top: 8, right: 10, background: "#e91e8c", color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: ".6rem", fontFamily: "Poppins", fontWeight: 700 }}>
                            {pending} pendente{pending > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--ws-text)", marginBottom: 6 }}>{c.name}</div>
                        {cb.length === 0 ? (
                          <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Nenhum briefing ainda</div>
                        ) : (
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
            {/* Mês atual */}
            <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ws-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".9rem", color: "var(--ws-text)" }}>
                    {MONTHS[closingPeriod.month - 1]} {closingPeriod.year}
                  </div>
                  <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>Mês atual</div>
                </div>
                {!alreadyClosed && closingPeriod.show && (
                  <button onClick={() => setClosingModal(true)} style={{ background: "#ffd600", border: "none", borderRadius: 8, color: "#1a1200", cursor: "pointer", fontSize: ".76rem", fontWeight: 700, padding: "7px 16px", fontFamily: "Poppins" }}>
                    Fechar mês
                  </button>
                )}
                {alreadyClosed && (
                  <div style={{ fontSize: ".72rem", color: "#00a864", fontFamily: "Poppins", fontWeight: 700 }}>✓ Fechado — {fmt(currentClosing!.total_final)}</div>
                )}
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
                          <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>
                            {cases.find(c => c.id === b.case_id)?.name ?? "—"}
                          </div>
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

            {/* Histórico de fechamentos */}
            {closings.filter(c => c.closed_at).length > 0 && (
              <div>
                <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".82rem", color: "var(--ws-text)", marginBottom: 12 }}>Histórico de fechamentos</div>
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

      {/* ══ MODAL — Fechar mês ══ */}
      {closingModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && setClosingModal(false)}>
          <div style={{ background: "var(--ws-surface)", borderRadius: 16, padding: "28px 28px", maxWidth: 480, width: "100%", maxHeight: "90dvh", overflowY: "auto" }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.1rem", color: "var(--ws-text)", marginBottom: 4 }}>
              Fechar {MONTHS[closingPeriod.month - 1]} {closingPeriod.year}
            </div>
            <div style={{ fontSize: ".76rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginBottom: 20 }}>
              Confira os valores e finalize o fechamento do mês.
            </div>

            {/* Briefings do mês */}
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

            {/* Valor fixo adicional */}
            <label style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", display: "block", marginBottom: 6 }}>
              Valor fixo / adicional (opcional)
            </label>
            <input className="ws-input" type="number" placeholder="R$ 0,00" value={fixedValue} onChange={e => setFixedValue(e.target.value)} style={{ marginBottom: 12 }} />

            {/* Desconto */}
            <label style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", display: "block", marginBottom: 6 }}>
              Desconto (opcional)
            </label>
            <input className="ws-input" type="number" placeholder="R$ 0,00" value={discount} onChange={e => setDiscount(e.target.value)} style={{ marginBottom: 12 }} />

            {/* Observações */}
            <label style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", display: "block", marginBottom: 6 }}>
              Observações
            </label>
            <textarea className="ws-input" rows={2} placeholder="Ex: Inclui rush de 2 artes..." value={closingNotes} onChange={e => setClosingNotes(e.target.value)} style={{ resize: "vertical", marginBottom: 16 }} />

            {/* Resumo */}
            <div style={{ background: "var(--ws-surface2)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: ".78rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Briefings</span>
                <span style={{ fontSize: ".78rem", color: "var(--ws-text2)", fontFamily: "Poppins" }}>{fmt(totalBriefings)}</span>
              </div>
              {fixedNum > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: ".78rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Valor fixo/adicional</span>
                  <span style={{ fontSize: ".78rem", color: "var(--ws-text2)", fontFamily: "Poppins" }}>+ {fmt(fixedNum)}</span>
                </div>
              )}
              {discountNum > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: ".78rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Desconto</span>
                  <span style={{ fontSize: ".78rem", color: "#ff6b35", fontFamily: "Poppins" }}>− {fmt(discountNum)}</span>
                </div>
              )}
              <div style={{ borderTop: "1px solid var(--ws-border)", paddingTop: 8, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)" }}>Total final</span>
                <span style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1rem", color: "#00a864" }}>{fmt(totalFinal)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => void saveClosing()}
                disabled={savingClosing}
                style={{ flex: 1, background: "#e91e8c", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: ".84rem", fontWeight: 700, padding: "11px 0", fontFamily: "Poppins" }}
              >
                {savingClosing ? "Fechando..." : `Fechar mês — ${fmt(totalFinal)}`}
              </button>
              <button onClick={() => setClosingModal(false)} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text2)", cursor: "pointer", fontSize: ".82rem", padding: "11px 16px", fontFamily: "Poppins" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────
function Header({ profile, onLogout, children }: { profile: Profile; onLogout: () => void; children?: React.ReactNode }) {
  return (
    <div style={{ background: "var(--ws-surface)", borderBottom: "1px solid var(--ws-border)", padding: "0 28px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontFamily: "Poppins", fontWeight: 900, fontSize: "1.05rem", color: "var(--ws-text)", letterSpacing: "-0.03em" }}>DIG<span style={{ color: "#e91e8c" }}>.</span></div>
        <div style={{ width: 1, height: 16, background: "var(--ws-border2)" }} />
        <div style={{ fontSize: ".65rem", fontFamily: "Poppins", color: "var(--ws-text3)", letterSpacing: "1.5px", textTransform: "uppercase" }}>Designer</div>
        {children && <><div style={{ width: 1, height: 16, background: "var(--ws-border2)" }} />{children}</>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #e91e8c44, #e91e8c22)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: ".65rem", color: "#e91e8c" }}>
          {profile.name?.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ fontSize: ".78rem", color: "var(--ws-text2)", fontFamily: "Poppins" }}>{profile.name}</div>
        <button onClick={onLogout} style={{ background: "none", border: "1px solid var(--ws-border2)", borderRadius: 6, color: "var(--ws-text3)", cursor: "pointer", fontSize: ".7rem", padding: "4px 12px", fontFamily: "Poppins" }}>Sair</button>
      </div>
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
