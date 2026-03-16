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
  const [postsThisMonth, setPostsThisMonth] = useState(0);
  const [postsApproved, setPostsApproved] = useState(0);
  const [recentApprovals, setRecentApprovals] = useState<{ title: string; caseName: string; status: string; date: string }[]>([]);
  const [nextEvents, setNextEvents] = useState<{ title: string; date: string; type: string }[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

      const [tasksRes, casesRes, paymentsRes, postsRes, eventsRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("cases").select("id, name"),
        supabase.from("payments").select("amount, paid, due_date"),
        supabase.from("posts").select("id, slug, title, approval_status, scheduled_date, case_id, updated_at"),
        supabase.from("events").select("title, date, type").gte("date", todayStr).order("date").limit(6),
      ]);

      const tasks = tasksRes.data ?? [];
      const cases = casesRes.data ?? [];
      const payments = paymentsRes.data ?? [];
      const posts = postsRes.data ?? [];
      const events = eventsRes.data ?? [];

      const pending = tasks.filter(t => t.status !== "concluido" && !t.done);
      const overdue = pending.filter(t => t.due_date && new Date(t.due_date + "T00:00:00") < today);
      setTasksPending(pending.length);
      setTasksOverdue(overdue.length);
      setTasksDone(tasks.filter(t => t.status === "concluido" || t.done).length);
      setRecentTasks(pending.slice(0, 4).map(t => ({ id: t.id, title: t.title ?? t.text ?? "", tag: t.tag ?? "dig", related_name: t.related_name ?? null })));

      setCasesCount(cases.length);
      setCaseNames(cases.map(c => c.name));

      const receber = payments.filter(p => !p.paid).reduce((s, p) => s + Number(p.amount), 0);
      const vencido = payments.filter(p => !p.paid && p.due_date && new Date(p.due_date + "T00:00:00") < today).reduce((s, p) => s + Number(p.amount), 0);
      setTotalReceber(receber);
      setTotalVencido(vencido);

      const monthPosts = posts.filter(p => p.scheduled_date && p.scheduled_date >= monthStart);
      setPostsThisMonth(monthPosts.length);
      setPostsApproved(monthPosts.filter(p => p.approval_status === "aprovado").length);

      const caseMap = Object.fromEntries(cases.map(c => [c.id, c.name]));
      setRecentApprovals(
        posts.filter(p => p.approval_status && p.approval_status !== "pendente")
          .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
          .slice(0, 5)
          .map(p => ({
            title: p.slug || p.title || "Post",
            caseName: caseMap[p.case_id] ?? "—",
            status: p.approval_status,
            date: p.updated_at ? new Date(p.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "",
          }))
      );
      setNextEvents(events.map(e => ({ title: e.title, date: e.date, type: e.type })));
      setLoading(false);
    }
    void load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.name?.split(" ")[0] ?? "";

  if (loading) return (
    <div className="ws-page">
      <div style={{ color: "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".8rem", marginTop: 40 }}>Carregando...</div>
    </div>
  );

  return (
    <div className="ws-page">
      <div className="ws-page-title">{greeting}{firstName ? `, ${firstName}` : ""}<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">
        {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </div>

      {/* Stats */}
      <div className="ws-stats" style={{ marginBottom: 16 }}>
        <div className="ws-stat" style={{ "--c": tasksOverdue > 0 ? "#ff5c7a" : "#e91e8c" } as any}>
          <div className="ws-stat-label">Tarefas abertas</div>
          <div className="ws-stat-value">{tasksPending}</div>
          <div className="ws-stat-detail" style={{ color: tasksOverdue > 0 ? "#ff5c7a" : "var(--ws-text3)" }}>
            {tasksOverdue > 0 ? `⚠ ${tasksOverdue} atrasada${tasksOverdue > 1 ? "s" : ""}` : `${tasksDone} concluídas`}
          </div>
        </div>

        <div className="ws-stat" style={{ "--c": "#ffd600" } as any}>
          <div className="ws-stat-label">A receber</div>
          <div className="ws-stat-value" style={{ fontSize: isMobile ? "1.3rem" : "2rem" }}>{fmt(totalReceber)}</div>
          <div className="ws-stat-detail" style={{ color: totalVencido > 0 ? "#ff5c7a" : "var(--ws-text3)" }}>
            {totalVencido > 0 ? `⚠ ${fmt(totalVencido)} vencido` : "em dia"}
          </div>
        </div>

        <div className="ws-stat" style={{ "--c": "#4dabf7" } as any}>
          <div className="ws-stat-label">Posts este mês</div>
          <div className="ws-stat-value">{postsThisMonth}</div>
          <div className="ws-stat-detail">{postsApproved} aprovado{postsApproved !== 1 ? "s" : ""}</div>
        </div>

        <div className="ws-stat" style={{ "--c": "#00e676" } as any}>
          <div className="ws-stat-label">Cases ativos</div>
          <div className="ws-stat-value">{casesCount}</div>
          <div className="ws-stat-detail">{caseNames.slice(0, 2).join(" · ")}</div>
        </div>
      </div>

      {/* Tarefas + Aprovações */}
      <div className="ws-cols2" style={{ marginBottom: 16 }}>
        <div className="ws-card">
          <div className="ws-card-title">
            Tarefas abertas
            {tasksPending > 0 && <span className="ws-badge" style={{ background: tasksOverdue > 0 ? "#ff5c7a22" : undefined, color: tasksOverdue > 0 ? "#ff5c7a" : undefined }}>{tasksPending}</span>}
          </div>
          <div className="ws-tasks">
            {recentTasks.length === 0
              ? <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Tudo em dia 🎉</div>
              : recentTasks.map(t => (
                <div key={t.id} className="ws-task">
                  <div className="ws-check" />
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
            : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentApprovals.map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  background: "var(--ws-surface2)", borderRadius: 10,
                  borderLeft: `3px solid ${APPROVAL_COLOR[a.status] ?? "#8d97bb"}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".84rem", fontWeight: 600, color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{a.title}</div>
                    <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>{a.caseName} · {a.date}</div>
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

      {/* Próximos eventos */}
      <div className="ws-card">
        <div className="ws-card-title">Próximos eventos <span className="ws-badge">agenda</span></div>
        {nextEvents.length === 0
          ? <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Nenhum evento próximo.</div>
          : <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 8 }}>
            {nextEvents.map((ev, i) => {
              const d = new Date(ev.date + "T12:00:00");
              const isToday = ev.date === new Date().toISOString().slice(0, 10);
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  background: "var(--ws-surface2)", borderRadius: 10,
                  borderLeft: `3px solid ${EVENT_COLOR[ev.type] ?? "var(--ws-accent)"}`,
                }}>
                  <div style={{ flexShrink: 0, textAlign: "center", minWidth: 36 }}>
                    <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.2rem", color: isToday ? "var(--ws-accent)" : "var(--ws-text)", lineHeight: 1 }}>{d.getDate()}</div>
                    <div style={{ fontFamily: "Poppins", fontSize: ".5rem", letterSpacing: "1px", color: "var(--ws-text3)", textTransform: "uppercase" }}>
                      {d.toLocaleDateString("pt-BR", { weekday: "short" })}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{ev.title}</div>
                    {isToday && <div style={{ fontSize: ".62rem", fontFamily: "Poppins", color: "var(--ws-accent)", marginTop: 2 }}>HOJE</div>}
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>
    </div>
  );
}
