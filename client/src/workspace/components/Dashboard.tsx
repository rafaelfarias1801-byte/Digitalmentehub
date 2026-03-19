// client/src/workspace/components/Dashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import { useIsMobile } from "../hooks/useIsMobile";

interface Props { profile: Profile; }

const APPROVAL_COLOR: Record<string, string> = {
  aprovado: "#00e676", reprovado: "#ff5c7a", alteracao: "#ffd600", pendente: "#8d97bb",
};
const APPROVAL_ICON: Record<string, string> = {
  aprovado: "✅", reprovado: "❌", alteracao: "⚠️", pendente: "⏳",
};
const EVENT_COLOR: Record<string, string> = {
  reuniao: "#e91e8c", prazo: "#4dabf7", pagamento: "#ffd600", pessoal: "#00e676",
};

function fmt(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Dashboard({ profile }: Props) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  
  const [tasksPending, setTasksPending] = useState(0);
  const [tasksOverdue, setTasksOverdue] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);
  const [recentTasks, setRecentTasks] = useState<{ id: string; title: string; tag: string; related_name: string | null }[]>([]);
  
  const [casesCount, setCasesCount] = useState(0);
  const [caseNames, setCaseNames] = useState<string[]>([]);
  
  const [totalReceber, setTotalReceber] = useState(0);
  const [totalVencido, setTotalVencido] = useState(0);
  const [upcomingSum, setUpcomingSum] = useState(0); 
  
  const [postsThisMonth, setPostsThisMonth] = useState(0);
  const [postsApproved, setPostsApproved] = useState(0);
  
  const [recentApprovals, setRecentApprovals] = useState<{ title: string; caseName: string; status: string; date: string }[]>([]);
  const [nextEvents, setNextEvents] = useState<{ title: string; date: string; type: string }[]>([]);
  const [upcomingFinance, setUpcomingFinance] = useState<{ id: string; amount: number; due_date: string; description: string; caseName: string; overdue: boolean }[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const monthStart = `${yyyy}-${mm}-01`;
      const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
      const monthEnd = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
      
      // Filtro de 7 dias pra frente
      const in7Days = new Date(now);
      in7Days.setDate(in7Days.getDate() + 7);
      const in7DaysStr = `${in7Days.getFullYear()}-${String(in7Days.getMonth() + 1).padStart(2, "0")}-${String(in7Days.getDate()).padStart(2, "0")}`;

      const [tasksRes, casesRes, paymentsRes, postsRes, eventsRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("cases").select("id, name"),
        supabase.from("payments").select("id, amount, paid, due_date, description, case_id"),
        supabase.from("posts").select("id, slug, title, approval_status, scheduled_date, case_id, updated_at"),
        supabase.from("events").select("title, date, type").gte("date", todayStr).order("date").limit(6),
      ]);

      const tasks = tasksRes.data ?? [];
      const cases = casesRes.data ?? [];
      const payments = paymentsRes.data ?? [];
      const posts = postsRes.data ?? [];
      const events = eventsRes.data ?? [];

      const caseMap = Object.fromEntries(cases.map(c => [c.id, c.name]));

      const pending = tasks.filter(t => t.status !== "concluido" && !t.done);
      const overdue = pending.filter(t => t.due_date && t.due_date < todayStr);
      setTasksPending(pending.length);
      setTasksOverdue(overdue.length);
      setTasksDone(tasks.filter(t => t.status === "concluido" || t.done).length);
      setRecentTasks(pending.slice(0, 4).map(t => ({ id: t.id, title: t.title ?? t.text ?? "", tag: t.tag ?? "dig", related_name: t.related_name ?? null })));

      setCasesCount(cases.length);
      setCaseNames(cases.map(c => c.name));

      const unpaidTotal = payments.filter(p => !p.paid);
      
      // Card Estatístico: Apenas deste mês
      const unpaidThisMonth = unpaidTotal.filter(p => p.due_date && p.due_date >= monthStart && p.due_date <= monthEnd);
      setTotalReceber(unpaidThisMonth.reduce((s, p) => s + Number(p.amount), 0));
      
      const vencidos = unpaidTotal.filter(p => p.due_date && p.due_date < todayStr);
      setTotalVencido(vencidos.reduce((s, p) => s + Number(p.amount), 0));
      
      const aVencerBreve = unpaidTotal.filter(p => p.due_date && p.due_date >= todayStr && p.due_date <= in7DaysStr);
      setUpcomingSum(aVencerBreve.reduce((s, p) => s + Number(p.amount), 0));

      // Aba Atividades Financeiro: Atrasados + Próximos 7 dias
      setUpcomingFinance(
        unpaidTotal
          .filter(p => p.due_date && p.due_date <= in7DaysStr) // AQUI O AJUSTE: Limite de 7 dias
          .sort((a, b) => a.due_date.localeCompare(b.due_date))
          .slice(0, 5) 
          .map(p => ({
            id: p.id,
            amount: p.amount,
            due_date: p.due_date,
            description: p.description || "Fatura",
            caseName: caseMap[p.case_id] ?? "Agência",
            overdue: p.due_date < todayStr
          }))
      );

      const monthPosts = posts.filter(p => p.scheduled_date && p.scheduled_date >= monthStart && p.scheduled_date <= monthEnd);
      setPostsThisMonth(monthPosts.length);
      setPostsApproved(monthPosts.filter(p => p.approval_status?.toLowerCase() === "aprovado").length);

      setRecentApprovals(
        posts
          .filter(p => p.approval_status)
          .sort((a, b) => (b.updated_at ?? b.scheduled_date ?? "").localeCompare(a.updated_at ?? a.scheduled_date ?? ""))
          .slice(0, 5)
          .map(p => ({
            title: p.slug || p.title || "Post",
            caseName: caseMap[p.case_id] ?? "—",
            status: p.approval_status?.toLowerCase() ?? "pendente",
            date: p.updated_at ? new Date(p.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "",
          }))
      );
      
      setNextEvents(events.map(e => ({ title: e.title, date: e.date, type: e.type })));
      setLoading(false);
    }
    void load();
  }, []);

  async function handleCompleteTask(id: string) {
    setRecentTasks(prev => prev.filter(t => t.id !== id));
    setTasksPending(p => Math.max(0, p - 1));
    setTasksDone(d => d + 1);
    await supabase.from("tasks").update({ status: "concluido", done: true }).eq("id", id);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.name?.split(" ")[0] ?? "";

  const compactCardStyle = isMobile ? {} : { padding: "12px 16px", minHeight: "auto" };
  const compactValueStyle = isMobile ? {} : { fontSize: "1.8rem", margin: "2px 0" };

  if (loading) return (
    <div className="ws-page">
      <div style={{ color: "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".8rem", marginTop: 40 }}>Carregando...</div>
    </div>
  );

  return (
    <div className="ws-page" style={{ paddingBottom: isMobile ? 80 : 20 }}>
      <div className="ws-page-title" style={{ marginBottom: 2 }}>{greeting}{firstName ? `, ${firstName}` : ""}<span className="ws-dot">.</span></div>
      <div className="ws-page-sub" style={{ marginBottom: 12 }}>
        {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </div>

      <div className="ws-stats" style={{ marginBottom: 12 }}>
        <div className="ws-stat" style={{ "--c": tasksOverdue > 0 ? "#ff5c7a" : "#e91e8c", ...compactCardStyle } as React.CSSProperties}>
          <div className="ws-stat-label">Tarefas abertas</div>
          <div className="ws-stat-value" style={compactValueStyle}>{tasksPending}</div>
          <div className="ws-stat-detail" style={{ color: tasksOverdue > 0 ? "#ff5c7a" : "var(--ws-text3)" }}>
            {tasksOverdue > 0 ? `⚠ ${tasksOverdue} atrasada${tasksOverdue > 1 ? "s" : ""}` : `${tasksDone} concluídas`}
          </div>
        </div>

        <div className="ws-stat" style={{ "--c": totalVencido > 0 ? "#ff5c7a" : "#ffd600", ...compactCardStyle } as React.CSSProperties}>
          <div className="ws-stat-label">A receber (Mês)</div>
          <div className="ws-stat-value" style={{ ...compactValueStyle, fontSize: isMobile ? "1.3rem" : "1.6rem" }}>{fmt(totalReceber)}</div>
          <div className="ws-stat-detail" style={{ color: totalVencido > 0 ? "#ff5c7a" : (upcomingSum > 0 ? "#ffd600" : "var(--ws-text3)") }}>
            {totalVencido > 0 ? `⚠ ${fmt(totalVencido)} vencido` : (upcomingSum > 0 ? `⏳ ${fmt(upcomingSum)} nos próx. 7 dias` : "Em dia 🎉")}
          </div>
        </div>

        <div className="ws-stat" style={{ "--c": "#4dabf7", ...compactCardStyle } as React.CSSProperties}>
          <div className="ws-stat-label">Posts este mês</div>
          <div className="ws-stat-value" style={compactValueStyle}>{postsThisMonth}</div>
          <div className="ws-stat-detail">{postsApproved} aprovado{postsApproved !== 1 ? "s" : ""}</div>
        </div>

        <div className="ws-stat" style={{ "--c": "#00e676", ...compactCardStyle } as React.CSSProperties}>
          <div className="ws-stat-label">Cases ativos</div>
          <div className="ws-stat-value" style={compactValueStyle}>{casesCount}</div>
          <div className="ws-stat-detail">{caseNames.slice(0, 2).join(" · ")}</div>
        </div>
      </div>

      <div className="ws-cols2" style={{ marginBottom: 12 }}>
        <div className="ws-card">
          <div className="ws-card-title">
            Tarefas abertas
            {tasksPending > 0 && <span className="ws-badge" style={{ background: tasksOverdue > 0 ? "#ff5c7a22" : undefined, color: tasksOverdue > 0 ? "#ff5c7a" : undefined }}>{tasksPending}</span>
          </div>
          <div className="ws-tasks">
            {recentTasks.length === 0
              ? <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Tudo em dia 🎉</div>
              : recentTasks.map(t => (
                <div key={t.id} className="ws-task" style={{ padding: "8px 10px" }}>
                  <div className="ws-check" onClick={() => handleCompleteTask(t.id)} style={{ cursor: "pointer" }} title="Marcar como concluída" />
                  <div className="ws-task-text">
                    {t.title}
                    {t.related_name && <span style={{ fontSize: ".7rem", color: "var(--ws-text3)", marginLeft: 6 }}>— {t.related_name}</span>}
                  </div>
                  <span className={`ws-tag ws-tag-${t.tag}`}>{t.tag}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div className="ws-card">
          <div className="ws-card-title">
            Atividade dos clientes
            <span className="ws-badge">recente</span>
          </div>
          {recentApprovals.length === 0
            ? <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Nenhuma atividade ainda.</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentApprovals.map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  background: "var(--ws-surface2)", borderRadius: 10,
                  borderLeft: `3px solid ${APPROVAL_COLOR[a.status] ?? "#8d97bb"}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".84rem", fontWeight: 600, color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{a.title}</div>
                    <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 1 }}>{a.caseName} · {a.date}</div>
                  </div>
                  <span style={{ fontSize: ".75rem", fontWeight: 700, color: APPROVAL_COLOR[a.status], flexShrink: 0 }}>
                    {APPROVAL_ICON[a.status]}
                  </span>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      <div className="ws-cols2">
        <div className="ws-card">
          <div className="ws-card-title">Próximos eventos <span className="ws-badge">agenda</span></div>
          {nextEvents.length === 0
            ? <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Nenhum evento próximo.</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {nextEvents.map((ev, i) => {
                const d = new Date(ev.date + "T12:00:00");
                const isToday = ev.date === new Date().toISOString().slice(0, 10);
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "8px 14px",
                    background: "var(--ws-surface2)", borderRadius: 10,
                    borderLeft: `3px solid ${EVENT_COLOR[ev.type] ?? "var(--ws-accent)"}`,
                  }}>
                    <div style={{ flexShrink: 0, textAlign: "center", minWidth: 36 }}>
                      <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.1rem", color: isToday ? "var(--ws-accent)" : "var(--ws-text)", lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontFamily: "Poppins", fontSize: ".45rem", letterSpacing: "1px", color: "var(--ws-text3)", textTransform: "uppercase" }}>
                        {d.toLocaleDateString("pt-BR", { weekday: "short" })}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{ev.title}</div>
                      {isToday && <div style={{ fontSize: ".62rem", fontFamily: "Poppins", color: "var(--ws-accent)" }}>HOJE</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>

        <div className="ws-card">
          <div className="ws-card-title">Atividades Financeiro <span className="ws-badge" style={{ background: "#ffd60022", color: "#ffd600" }}>faturas</span></div>
          {upcomingFinance.length === 0
            ? <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Tudo limpo! Nenhuma cobrança pendente para os próximos 7 dias. 🎉</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {upcomingFinance.map(f => (
                <div key={f.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px",
                  background: "var(--ws-surface2)", borderRadius: 10,
                  borderLeft: `3px solid ${f.overdue ? '#ff5c7a' : '#ffd600'}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                    <div style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--ws-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {f.description}
                    </div>
                    <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 1 }}>
                      {f.caseName} · {f.due_date.split('-').reverse().join('/')}
                    </div>
                  </div>
                  <div style={{ fontSize: ".85rem", fontWeight: 800, color: f.overdue ? '#ff5c7a' : "var(--ws-text)", flexShrink: 0 }}>
                    {fmt(f.amount)}
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  );
}