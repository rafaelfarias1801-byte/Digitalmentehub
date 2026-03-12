// client/src/workspace/components/Dashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Task } from "../../lib/supabaseClient";

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    supabase.from("tasks").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setTasks(data ?? []));
  }, []);

  const pending = tasks.filter(t => !t.done).length;
  const done    = tasks.filter(t => t.done).length;

  return (
    <div className="ws-page">
      <div className="ws-page-title">Dashboard<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">{new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</div>

      <div className="ws-stats">
        <div className="ws-stat" style={{ "--c": "#e91e8c" } as any}>
          <div className="ws-stat-label">Pendentes</div>
          <div className="ws-stat-value">{pending}</div>
          <div className="ws-stat-detail">tarefas em aberto</div>
        </div>
        <div className="ws-stat" style={{ "--c": "#00e676" } as any}>
          <div className="ws-stat-label">Concluídas</div>
          <div className="ws-stat-value">{done}</div>
          <div className="ws-stat-detail">esta semana</div>
        </div>
        <div className="ws-stat" style={{ "--c": "#4dabf7" } as any}>
          <div className="ws-stat-label">Clientes</div>
          <div className="ws-stat-value">3</div>
          <div className="ws-stat-detail">Carlos · Ana · ARBOL</div>
        </div>
        <div className="ws-stat" style={{ "--c": "#ffd600" } as any}>
          <div className="ws-stat-label">A Receber</div>
          <div className="ws-stat-value">R$8k</div>
          <div className="ws-stat-detail">março 2026</div>
        </div>
      </div>

      <div className="ws-cols2">
        <div className="ws-card">
          <div className="ws-card-title">Tarefas Recentes <span className="ws-badge">hoje</span></div>
          <div className="ws-tasks">
            {tasks.filter(t => !t.done).slice(0, 4).map(t => (
              <div key={t.id} className="ws-task">
                <div className="ws-check" />
                <div className="ws-task-text">{t.text}</div>
                <span className={`ws-tag ws-tag-${t.tag}`}>{t.tag}</span>
              </div>
            ))}
            {pending === 0 && <div style={{ color: "var(--ws-text3)", fontSize: ".8rem" }}>Tudo em dia 🎉</div>}
          </div>
        </div>
        <div className="ws-card">
          <div className="ws-card-title">Próximos eventos <span className="ws-badge">semana</span></div>
          {[
            { date: "SEG 16", label: "Reunião Carlos Cavalheiro" },
            { date: "QUA 18", label: "Entrega carrossel ARBOL" },
            { date: "SEX 20", label: "Fecha fatura Ana Carla" },
            { date: "TER 24", label: "Deadline Reels abril" },
          ].map(ev => (
            <div key={ev.date} className="ws-agenda-item">
              <span className="ws-agenda-date">{ev.date}</span>
              {ev.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
