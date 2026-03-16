// client/src/workspace/components/Checklist.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import TaskTable from "./TaskTable";
import TaskDrawer from "./TaskDrawer";
import { useIsMobile } from "../hooks/useIsMobile";

export type TaskStatus = "a_fazer" | "em_andamento" | "concluido" | "pausado";
export type TaskPriority = "baixa" | "media" | "alta" | "urgente";
export type RelatedTo = "cliente" | "lead" | "interno" | "parceiro" | "outros";
export type TaskType =
  | "criacao_conteudo" | "design" | "copy" | "reuniao" | "planejamento"
  | "trafego_pago" | "financeiro" | "comercial" | "suporte" | "outros";

export interface ChecklistTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  due_date: string | null;
  assignee: string | null;
  related_to: RelatedTo;
  related_name: string | null;
  task_type: TaskType;
  estimated_time: string | null;
  description: string | null;
  completed: boolean;
  updated_at: string | null;
}

interface Props { profile: Profile; }

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "a_fazer", label: "A fazer" }, { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" }, { value: "pausado", label: "Pausado" },
];
const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "baixa", label: "Baixa" }, { value: "media", label: "Média" },
  { value: "alta", label: "Alta" }, { value: "urgente", label: "Urgente" },
];
const RELATED_OPTIONS: { value: RelatedTo; label: string }[] = [
  { value: "cliente", label: "Cliente" }, { value: "lead", label: "Lead" },
  { value: "interno", label: "Interno" }, { value: "parceiro", label: "Parceiro" },
  { value: "outros", label: "Outros" },
];
const TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "criacao_conteudo", label: "Criação de Conteúdo" }, { value: "design", label: "Design" },
  { value: "copy", label: "Copy" }, { value: "reuniao", label: "Reunião" },
  { value: "planejamento", label: "Planejamento" }, { value: "trafego_pago", label: "Tráfego Pago" },
  { value: "financeiro", label: "Financeiro" }, { value: "comercial", label: "Comercial" },
  { value: "suporte", label: "Suporte" }, { value: "outros", label: "Outros" },
];
const ASSIGNEE_OPTIONS = [
  { value: "ML", label: "Melissa" }, { value: "RF", label: "Rafael" }, { value: "ALL", label: "Ambos" },
];

export const DEFAULT_NEW_TASK: Omit<ChecklistTask, "id"> = {
  title: "Novo(a) item", status: "a_fazer", priority: "media",
  created_at: new Date().toISOString(), due_date: null, assignee: "ML",
  related_to: "interno", related_name: "", task_type: "outros",
  estimated_time: "", description: "", completed: false,
  updated_at: new Date().toISOString(),
};

function normalizeTask(raw: any): ChecklistTask {
  const completed = Boolean(raw.completed ?? raw.done ?? false);
  const status: TaskStatus = raw.status ?? (completed ? "concluido" : "a_fazer");
  return {
    id: raw.id, title: raw.title ?? raw.text ?? "Novo(a) item", status,
    priority: raw.priority ?? "media", created_at: raw.created_at ?? new Date().toISOString(),
    due_date: raw.due_date ?? null, assignee: raw.assignee ?? raw.person ?? "ML",
    related_to: raw.related_to ?? (raw.tag === "cliente" || raw.tag === "parceiro" ? raw.tag : "interno"),
    related_name: raw.related_name ?? null, task_type: raw.task_type ?? "outros",
    estimated_time: raw.estimated_time ?? null, description: raw.description ?? null,
    completed, updated_at: raw.updated_at ?? null,
  };
}

export default function Checklist({ profile }: Props) {
  const [tasks, setTasks]               = useState<ChecklistTask[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | string>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [relatedFilter, setRelatedFilter]   = useState<"all" | RelatedTo>("all");
  const [typeFilter, setTypeFilter]         = useState<"all" | TaskType>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draftTask, setDraftTask]           = useState<ChecklistTask | null>(null);
  const [isNewTask, setIsNewTask]           = useState(false);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const isMobile = useIsMobile();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (!error) setTasks((data ?? []).map(normalizeTask));
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const term = search.trim().toLowerCase();
    return (
      (!term || task.title.toLowerCase().includes(term) || (task.related_name ?? "").toLowerCase().includes(term) || (task.description ?? "").toLowerCase().includes(term)) &&
      (statusFilter === "all" || task.status === statusFilter) &&
      (assigneeFilter === "all" || task.assignee === assigneeFilter) &&
      (priorityFilter === "all" || task.priority === priorityFilter) &&
      (relatedFilter === "all" || task.related_to === relatedFilter) &&
      (typeFilter === "all" || task.task_type === typeFilter)
    );
  }), [tasks, search, statusFilter, assigneeFilter, priorityFilter, relatedFilter, typeFilter]);

  const summary = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return {
      pending: tasks.filter(t => t.status !== "concluido").length,
      completed: tasks.filter(t => t.status === "concluido").length,
      overdue: tasks.filter(t => {
        if (!t.due_date || t.status === "concluido") return false;
        return new Date(t.due_date + "T00:00:00") < today;
      }).length,
    };
  }, [tasks]);

  function openExistingTask(taskId: string) {
    const task = tasks.find(i => i.id === taskId);
    if (!task) return;
    setSelectedTaskId(taskId); setDraftTask({ ...task }); setIsNewTask(false); setDrawerOpen(true);
  }
  function openNewTask() {
    setSelectedTaskId(null);
    setDraftTask({ id: "new-task", ...DEFAULT_NEW_TASK, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    setIsNewTask(true); setDrawerOpen(true);
  }
  function closeDrawer() { setDrawerOpen(false); setDraftTask(null); setSelectedTaskId(null); setIsNewTask(false); }
  function updateDraft(patch: Partial<ChecklistTask>) {
    setDraftTask(prev => { if (!prev) return prev; const next = { ...prev, ...patch }; next.completed = next.status === "concluido"; return next; });
  }

  async function saveDraft() {
    if (!draftTask || !draftTask.title.trim()) return;
    setSaving(true);
    try {
      const base = {
        title: draftTask.title, text: draftTask.title, status: draftTask.status,
        priority: draftTask.priority, due_date: draftTask.due_date, assignee: draftTask.assignee,
        related_to: draftTask.related_to, related_name: draftTask.related_name || null,
        task_type: draftTask.task_type, estimated_time: draftTask.estimated_time || null,
        description: draftTask.description || null, completed: draftTask.status === "concluido",
        done: draftTask.status === "concluido", person: draftTask.assignee,
        tag: draftTask.related_to === "cliente" || draftTask.related_to === "parceiro" ? draftTask.related_to : "dig",
        updated_at: new Date().toISOString(),
      };
      if (isNewTask) {
        const { data, error } = await supabase.from("tasks").insert({ ...base, created_at: new Date().toISOString() }).select("*").single();
        if (error) { alert(`Erro ao criar tarefa: ${error.message}`); setSaving(false); return; }
        if (data) setTasks(prev => [normalizeTask(data), ...prev]);
      } else if (selectedTaskId) {
        const { data, error } = await supabase.from("tasks").update(base).eq("id", selectedTaskId).select("*").single();
        if (error) { alert(`Erro ao salvar tarefa: ${error.message}`); setSaving(false); return; }
        if (data) setTasks(prev => prev.map(t => t.id === data.id ? normalizeTask(data) : t));
      }
      setSaving(false); closeDrawer();
    } catch (err) { alert("Erro inesperado."); setSaving(false); }
  }

  async function deleteTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await supabase.from("tasks").delete().eq("id", taskId);
    closeDrawer();
  }

  async function quickStatusChange(task: ChecklistTask, status: TaskStatus) {
    const updated = { ...task, status, completed: status === "concluido" };
    setTasks(prev => prev.map(i => i.id === task.id ? updated : i));
    await supabase.from("tasks").update({ status, completed: status === "concluido", updated_at: new Date().toISOString() }).eq("id", task.id);
  }

  return (
    <div className="ws-page">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <div className="ws-page-title">Checklist<span className="ws-dot">.</span></div>
          <div className="ws-page-sub">Banco de tarefas da operação</div>
        </div>
        <button className="ws-btn" onClick={openNewTask} disabled={saving}>Nova</button>
      </div>

      {/* Resumo */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        {[
          { label: "Pendentes", value: summary.pending, color: "var(--ws-text)" },
          { label: "Atrasados", value: summary.overdue, color: "var(--ws-yellow)" },
          { label: "Concluídas", value: summary.completed, color: "var(--ws-green)" },
        ].map(item => (
          <div key={item.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 14px", minWidth: 100, flex: isMobile ? "1" : "none" }}>
            <div style={{ fontFamily: "Poppins, monospace", fontSize: ".58rem", letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--ws-text3)" }}>{item.label}</div>
            <div style={{ marginTop: 6, fontFamily: "Poppins, system-ui, sans-serif", fontWeight: 700, fontSize: "1rem", color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros — grid em desktop, coluna em mobile */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "minmax(240px, 1.2fr) repeat(5, minmax(130px, .7fr))",
        gap: 10,
        marginBottom: 18,
      }}>
        <input className="ws-field" placeholder="Buscar tarefa..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ gridColumn: isMobile ? "1 / -1" : "auto" }}
        />
        <select className="ws-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="all">Todos os status</option>
          {STATUS_OPTIONS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
        <select className="ws-field" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
          <option value="all">Responsável</option>
          {ASSIGNEE_OPTIONS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
        <select className="ws-field" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)}>
          <option value="all">Prioridade</option>
          {PRIORITY_OPTIONS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
        {!isMobile && <>
          <select className="ws-field" value={relatedFilter} onChange={e => setRelatedFilter(e.target.value as any)}>
            <option value="all">Vínculo</option>
            {RELATED_OPTIONS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
          <select className="ws-field" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
            <option value="all">Tipo</option>
            {TYPE_OPTIONS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </>}
      </div>

      {/* Tabela com scroll horizontal em mobile */}
      <div style={{ overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch" as any }}>
        <TaskTable
          tasks={filteredTasks} loading={loading}
          selectedTaskId={selectedTaskId} onSelectTask={openExistingTask}
          onQuickStatusChange={quickStatusChange}
        />
      </div>

      <TaskDrawer
        open={drawerOpen} task={draftTask} saving={saving} isNew={isNewTask}
        onClose={closeDrawer} onDelete={deleteTask} onSave={saveDraft} onChange={updateDraft}
        statusOptions={STATUS_OPTIONS} priorityOptions={PRIORITY_OPTIONS}
        relatedOptions={RELATED_OPTIONS} typeOptions={TYPE_OPTIONS} assigneeOptions={ASSIGNEE_OPTIONS}
      />
    </div>
  );
}
