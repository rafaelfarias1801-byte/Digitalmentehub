// client/src/workspace/components/TaskTable.tsx
import type React from "react";
import type { ChecklistTask, TaskStatus } from "./Checklist";

interface Props {
  tasks: ChecklistTask[];
  loading: boolean;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onQuickStatusChange: (task: ChecklistTask, status: TaskStatus) => void;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  pausado: "Pausado",
};

const STATUS_STYLE: Record<TaskStatus, React.CSSProperties> = {
  a_fazer: { background: "#8a8a8a20", color: "#d7d7d7" },
  em_andamento: { background: "#4dabf720", color: "#8fc7ff" },
  concluido: { background: "#00e67620", color: "#7cffbf" },
  pausado: { background: "#ffd60020", color: "#ffe66d" },
};

const PRIORITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORITY_STYLE: Record<string, React.CSSProperties> = {
  baixa: { background: "#7ea7d920", color: "#b8d7ff" },
  media: { background: "#d9c67e20", color: "#f2dea0" },
  alta: { background: "#ff8a6520", color: "#ffb29d" },
  urgente: { background: "#ff5c7a20", color: "#ff9eb0" },
};

const TYPE_LABEL: Record<string, string> = {
  criacao_conteudo: "Criação de Conteúdo",
  design: "Design",
  copy: "Copy",
  reuniao: "Reunião",
  planejamento: "Planejamento",
  trafego_pago: "Tráfego Pago",
  financeiro: "Financeiro",
  comercial: "Comercial",
  suporte: "Suporte",
  outros: "Outros",
};

const RELATED_LABEL: Record<string, string> = {
  cliente: "Cliente",
  lead: "Lead",
  interno: "Interno",
  parceiro: "Parceiro",
  outros: "Outros",
};

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatDateTime(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

function Badge({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: ".72rem",
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export default function TaskTable({
  tasks,
  loading,
  selectedTaskId,
  onSelectTask,
  onQuickStatusChange,
}: Props) {
  const columns =
    "minmax(320px, 2.2fr) 160px 130px 130px 130px 130px 180px 190px 140px";
  const minWidth = 1510;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          overflowX: "auto",
          scrollbarWidth: "thin",
        }}
      >
        <div style={{ minWidth }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: columns,
              background: "rgba(255,255,255,0.015)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {[
              "Tarefa",
              "Status",
              "Prioridade",
              "Criada em",
              "Vencimento",
              "Responsável",
              "Cliente/Lead",
              "Tipo",
              "Tempo estimado",
            ].map((label) => (
              <div
                key={label}
                style={{
                  padding: "13px 14px",
                  fontFamily: "Poppins, monospace",
                  fontSize: ".58rem",
                  letterSpacing: "1.4px",
                  textTransform: "uppercase",
                  color: "var(--ws-text3)",
                  borderRight: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 22, color: "var(--ws-text3)" }}>Carregando...</div>
          ) : tasks.length === 0 ? (
            <div style={{ padding: 22, color: "var(--ws-text3)" }}>Nenhuma tarefa encontrada.</div>
          ) : (
            tasks.map((task) => {
              const isSelected = selectedTaskId === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: columns,
                    cursor: "pointer",
                    background: isSelected ? "rgba(233,30,140,0.06)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    transition: "background .15s ease",
                  }}
                >
                  <div
                    style={{
                      padding: "15px 14px",
                      borderRight: "1px solid rgba(255,255,255,0.03)",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        color: "var(--ws-text)",
                        fontSize: ".95rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      <span style={{ opacity: 0.75, marginTop: 2 }}>☰</span>
                      <span
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.35,
                          wordBreak: "break-word",
                        }}
                      >
                        {task.title}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: "15px 14px", borderRight: "1px solid rgba(255,255,255,0.03)" }}>
                    <select
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onQuickStatusChange(task, e.target.value as TaskStatus)}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "inherit",
                        fontFamily: "Poppins, system-ui, sans-serif",
                        fontSize: ".78rem",
                        cursor: "pointer",
                        borderRadius: 999,
                        paddingInline: 10,
                        paddingBlock: 7,
                        ...STATUS_STYLE[task.status],
                      }}
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value} style={{ color: "#111" }}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ padding: "15px 14px", borderRight: "1px solid rgba(255,255,255,0.03)" }}>
                    <Badge style={PRIORITY_STYLE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
                  </div>

                  <div style={{ padding: "15px 14px", color: "var(--ws-text2)", fontSize: ".78rem", borderRight: "1px solid rgba(255,255,255,0.03)" }}>
                    {formatDateTime(task.created_at)}
                  </div>

                  <div style={{ padding: "15px 14px", color: "var(--ws-text2)", fontSize: ".78rem", borderRight: "1px solid rgba(255,255,255,0.03)" }}>
                    {formatDate(task.due_date)}
                  </div>

                  <div style={{ padding: "15px 14px", color: "var(--ws-text2)", fontSize: ".78rem", borderRight: "1px solid rgba(255,255,255,0.03)" }}>
                    {task.assignee === "ML" ? "Melissa" : task.assignee === "RF" ? "Rafael" : task.assignee === "ALL" ? "Ambos" : "—"}
                  </div>

                  <div style={{ padding: "15px 14px", borderRight: "1px solid rgba(255,255,255,0.03)", minWidth: 0 }}>
                    <div
                      style={{
                        color: "var(--ws-text)",
                        fontSize: ".78rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {task.related_name || "—"}
                    </div>
                    <div style={{ color: "var(--ws-text3)", fontSize: ".68rem", marginTop: 4 }}>
                      {RELATED_LABEL[task.related_to]}
                    </div>
                  </div>

                  <div style={{ padding: "15px 14px", color: "var(--ws-text2)", fontSize: ".78rem", borderRight: "1px solid rgba(255,255,255,0.03)" }}>
                    {TYPE_LABEL[task.task_type]}
                  </div>

                  <div style={{ padding: "15px 14px", color: "var(--ws-text2)", fontSize: ".78rem" }}>
                    {task.estimated_time || "—"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
