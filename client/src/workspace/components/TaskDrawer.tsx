// client/src/workspace/components/TaskDrawer.tsx
import type React from "react";
import type {
  ChecklistTask,
  RelatedTo,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "./Checklist";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props {
  open: boolean;
  task: ChecklistTask | null;
  saving: boolean;
  isNew: boolean;
  onClose: () => void;
  onDelete: (taskId: string) => void;
  onSave: () => void;
  onChange: (patch: Partial<ChecklistTask>) => void;
  statusOptions: Option<TaskStatus>[];
  priorityOptions: Option<TaskPriority>[];
  relatedOptions: Option<RelatedTo>[];
  typeOptions: Option<TaskType>[];
  assigneeOptions: Option<string>[];
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "Poppins, monospace",
        fontSize: ".58rem",
        letterSpacing: "1.4px",
        textTransform: "uppercase",
        color: "var(--ws-text3)",
        marginBottom: 7,
      }}
    >
      {children}
    </div>
  );
}

export default function TaskDrawer({
  open,
  task,
  saving,
  isNew,
  onClose,
  onDelete,
  onSave,
  onChange,
  statusOptions,
  priorityOptions,
  relatedOptions,
  typeOptions,
  assigneeOptions,
}: Props) {
  if (!open || !task) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.22)",
          zIndex: 60,
          /* Permite que eventos de toque passem para o aside quando o toque começa no drawer */
          touchAction: "none",
        }}
      />

      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 470,
          maxWidth: "96vw",
          height: "100vh",
          height: "100dvh",
          background: "var(--ws-surface)",
          borderLeft: "1px solid var(--ws-border)",
          zIndex: 61,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: 24,
          boxShadow: "-20px 0 60px rgba(0,0,0,0.24)",
          /* Garante que o drawer receba eventos de touch independente do overlay */
          touchAction: "pan-y",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontFamily: "Poppins, monospace",
              fontSize: ".62rem",
              letterSpacing: "1.4px",
              textTransform: "uppercase",
              color: "var(--ws-text3)",
              marginTop: 8,
            }}
          >
            {isNew ? "Nova tarefa" : "Tarefa"}
          </div>

          <button
            className="ws-btn-ghost"
            onClick={onClose}
            style={{ padding: "8px 12px", fontSize: ".75rem", flexShrink: 0 }}
          >
            Fechar
          </button>
        </div>

        <textarea
          value={task.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Título da tarefa"
          rows={3}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            overflow: "hidden",
            fontFamily: "Poppins, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "1.9rem",
            lineHeight: 1.12,
            letterSpacing: "-0.04em",
            color: "var(--ws-text)",
            marginBottom: 22,
            boxSizing: "border-box",
            wordBreak: "break-word",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div>
            <FieldLabel>Responsável</FieldLabel>
            <select className="ws-field" value={task.assignee ?? ""} onChange={(e) => onChange({ assignee: e.target.value })} style={{ width: "100%" }}>
              {assigneeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel>Status</FieldLabel>
            <select className="ws-field" value={task.status} onChange={(e) => onChange({ status: e.target.value as TaskStatus })} style={{ width: "100%" }}>
              {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel>Prioridade</FieldLabel>
            <select className="ws-field" value={task.priority} onChange={(e) => onChange({ priority: e.target.value as TaskPriority })} style={{ width: "100%" }}>
              {priorityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel>Data de vencimento</FieldLabel>
            <input type="date" className="ws-field" value={task.due_date ?? ""} onChange={(e) => onChange({ due_date: e.target.value || null })} style={{ width: "100%" }} />
          </div>

          <div>
            <FieldLabel>Cliente / Lead / Outros</FieldLabel>
            <select className="ws-field" value={task.related_to} onChange={(e) => onChange({ related_to: e.target.value as RelatedTo })} style={{ width: "100%" }}>
              {relatedOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel>Nome relacionado</FieldLabel>
            <input className="ws-field" value={task.related_name ?? ""} onChange={(e) => onChange({ related_name: e.target.value })} placeholder="Ex.: Carlos Cavalheiro" style={{ width: "100%" }} />
          </div>

          <div>
            <FieldLabel>Tipo da tarefa</FieldLabel>
            <select className="ws-field" value={task.task_type} onChange={(e) => onChange({ task_type: e.target.value as TaskType })} style={{ width: "100%" }}>
              {typeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel>Tempo estimado</FieldLabel>
            <input className="ws-field" value={task.estimated_time ?? ""} onChange={(e) => onChange({ estimated_time: e.target.value })} placeholder="Ex.: 2h, 30min, 1 dia" style={{ width: "100%" }} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Data de criação</FieldLabel>
          <div style={{ color: "var(--ws-text2)", fontSize: ".88rem" }}>
            {task.created_at ? new Date(task.created_at).toLocaleDateString("pt-BR") : "—"}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Descrição</FieldLabel>
          <textarea
            value={task.description ?? ""}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Descreva o contexto, observações ou próximos passos..."
            style={{
              width: "100%",
              minHeight: 180,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "14px 15px",
              color: "var(--ws-text)",
              fontFamily: "Poppins, system-ui, sans-serif",
              fontSize: ".92rem",
              lineHeight: 1.6,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div
          style={{
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ color: "var(--ws-text3)", fontSize: ".78rem" }}>
            {saving ? "Salvando..." : isNew ? "Preencha e crie a tarefa" : "Edite e salve quando quiser"}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {!isNew && (
              <button
                onClick={() => onDelete(task.id)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,92,122,0.35)",
                  color: "var(--ws-red)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontFamily: "Poppins, system-ui, sans-serif",
                  fontWeight: 600,
                  fontSize: ".85rem",
                }}
              >
                Excluir
              </button>
            )}

            <button className="ws-btn" onClick={onSave} disabled={saving}>
              {saving ? "Salvando..." : isNew ? "Criar tarefa" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
