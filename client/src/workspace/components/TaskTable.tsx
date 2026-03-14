// client/src/workspace/components/TaskTable.tsx
import type { ChecklistTask, TaskStatus } from "./Checklist";

interface Props {
  tasks: ChecklistTask[];
  loading: boolean;
  selectedTaskId: string | null;
  savingTaskId: string | null;
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
  a_fazer: {
    background: "#8a8a8a22",
    color: "#d7d7d7",
  },
  em_andamento: {
    background: "#4dabf722",
    color: "#8fc7ff",
  },
  concluido: {
    background: "#00e67622",
    color: "#7cffbf",
  },
  pausado: {
    background: "#ffd60022",
    color: "#ffe66d",
  },
};

const PRIORITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORITY_STYLE: Record<string, React.CSSProperties> = {
  baixa: {
    background: "#7ea7d922",
    color: "#b8d7ff",
  },
  media: {
    background: "#d9c67e22",
    color: "#f2dea0",
  },
  alta: {
    background: "#ff8a6522",
    color: "#ffb29d",
  },
  urgente: {
    background: "#ff5c7a22",
    color: "#ff9eb0",
  },
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

function Badge({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 9px",
        borderRadius: 8,
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
  savingTaskId,
  onSelectTask,
  onQuickStatusChange,
}: Props) {
  return (
    <div
      style={{
        background: "var(--ws-surface)",
        border: "1px solid var(--ws-border)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1.8fr) 140px 120px 130px 130px 120px 160px 170px 130px",
          gap: 0,
          borderBottom: "1px solid var(--ws-border)",
          background: "rgba(255,255,255,0.02)",
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
              padding: "12px 14px",
              fontFamily: "DM Mono, monospace",
              fontSize: ".58rem",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "var(--ws-text3)",
              borderRight: "1px solid rgba(255,255,255,0.04)",
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
          const isSaving = savingTaskId === task.id;

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(280px, 1.8fr) 140px 120px 130px 130px 120px 160px 170px 130px",
                cursor: "pointer",
                background: isSelected ? "rgba(233,30,140,0.08)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                transition: "background .15s ease",
              }}
            >
              <div style={{ padding: "14px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                <div
                  style={{
                    color: "var(--ws-text)",
                    fontSize: ".92rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ opacity: 0.8 }}>☰</span>
                  <span>{task.title}</span>
                  {isSaving && (
                    <span style={{ fontSize: ".68rem", color: "var(--ws-text3)" }}>salvando...</span>
                  )}
                </div>
              </div>

              <div style={{ padding: "14px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
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
                    fontFamily: "DM Sans, system-ui, sans-serif",
                    fontSize: ".78rem",
                    padding: 0,
                    cursor: "pointer",
                    ...STATUS_STYLE[task.status],
                    borderRadius: 8,
                    paddingInline: 8,
                    paddingBlock: 6,
                  }}
                >
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value} style={{ color: "#111" }}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ padding: "14px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                <Badge style={PRIORITY_STYLE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
              </div>

              <div style={{ padding: "14px", color: "var(--ws-text2)", fontSize: ".78rem", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                {formatDateTime(task.created_at)}
              </div>

              <div style={{ padding: "14px", color: "var(--ws-text2)", fontSize: ".78rem", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                {formatDate(task.due_date)}
              </div>

              <div style={{ padding: "14px", color: "var(--ws-text2)", fontSize: ".78rem", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                {task.assignee === "ML" ? "Melissa" : task.assignee === "RF" ? "Rafael" : task.assignee === "ALL" ? "Ambos" : "—"}
              </div>

              <div style={{ padding: "14px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ color: "var(--ws-text)", fontSize: ".78rem" }}>
                  {task.related_name || "—"}
                </div>
                <div style={{ color: "var(--ws-text3)", fontSize: ".68rem", marginTop: 2 }}>
                  {RELATED_LABEL[task.related_to]}
                </div>
              </div>

              <div style={{ padding: "14px", color: "var(--ws-text2)", fontSize: ".78rem", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                {TYPE_LABEL[task.task_type]}
              </div>

              <div style={{ padding: "14px", color: "var(--ws-text2)", fontSize: ".78rem" }}>
                {task.estimated_time || "—"}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}