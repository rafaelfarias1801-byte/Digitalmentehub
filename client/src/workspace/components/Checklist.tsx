// client/src/workspace/components/Checklist.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import TaskTable from "./TaskTable";
import TaskDrawer from "./TaskDrawer";

export type TaskStatus = "a_fazer" | "em_andamento" | "concluido" | "pausado";
export type TaskPriority = "baixa" | "media" | "alta" | "urgente";
export type RelatedTo = "cliente" | "lead" | "interno" | "parceiro" | "outros";
export type TaskType =
  | "criacao_conteudo"
  | "design"
  | "copy"
  | "reuniao"
  | "planejamento"
  | "trafego_pago"
  | "financeiro"
  | "comercial"
  | "suporte"
  | "outros";

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

interface Props {
  profile: Profile;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "a_fazer", label: "A fazer" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "pausado", label: "Pausado" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

const RELATED_OPTIONS: { value: RelatedTo; label: string }[] = [
  { value: "cliente", label: "Cliente" },
  { value: "lead", label: "Lead" },
  { value: "interno", label: "Interno" },
  { value: "parceiro", label: "Parceiro" },
  { value: "outros", label: "Outros" },
];

const TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "criacao_conteudo", label: "Criação de Conteúdo" },
  { value: "design", label: "Design" },
  { value: "copy", label: "Copy" },
  { value: "reuniao", label: "Reunião" },
  { value: "planejamento", label: "Planejamento" },
  { value: "trafego_pago", label: "Tráfego Pago" },
  { value: "financeiro", label: "Financeiro" },
  { value: "comercial", label: "Comercial" },
  { value: "suporte", label: "Suporte" },
  { value: "outros", label: "Outros" },
];

const ASSIGNEE_OPTIONS = [
  { value: "ML", label: "Melissa" },
  { value: "RF", label: "Rafael" },
  { value: "ALL", label: "Ambos" },
];

const DEFAULT_NEW_TASK = {
  title: "Novo(a) item",
  status: "a_fazer" as TaskStatus,
  priority: "media" as TaskPriority,
  due_date: null,
  assignee: "ML",
  related_to: "interno" as RelatedTo,
  related_name: "",
  task_type: "outros" as TaskType,
  estimated_time: "",
  description: "",
  completed: false,
};

function normalizeTask(raw: any): ChecklistTask {
  const completed = Boolean(raw.completed ?? raw.done ?? false);
  const status: TaskStatus =
    raw.status ??
    (completed ? "concluido" : "a_fazer");

  return {
    id: raw.id,
    title: raw.title ?? raw.text ?? "Novo(a) item",
    status,
    priority: raw.priority ?? "media",
    created_at: raw.created_at ?? new Date().toISOString(),
    due_date: raw.due_date ?? null,
    assignee: raw.assignee ?? raw.person ?? "ML",
    related_to: raw.related_to ?? (raw.tag === "cliente" || raw.tag === "parceiro" ? raw.tag : "interno"),
    related_name: raw.related_name ?? null,
    task_type: raw.task_type ?? "outros",
    estimated_time: raw.estimated_time ?? null,
    description: raw.description ?? null,
    completed,
    updated_at: raw.updated_at ?? null,
  };
}

export default function Checklist({ profile }: Props) {
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | string>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [relatedFilter, setRelatedFilter] = useState<"all" | RelatedTo>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TaskType>("all");

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setTasks((data ?? []).map(normalizeTask));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !search.trim() ||
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        (task.related_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (task.description ?? "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;

      const matchesAssignee =
        assigneeFilter === "all" || task.assignee === assigneeFilter;

      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      const matchesRelated =
        relatedFilter === "all" || task.related_to === relatedFilter;

      const matchesType =
        typeFilter === "all" || task.task_type === typeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesAssignee &&
        matchesPriority &&
        matchesRelated &&
        matchesType
      );
    });
  }, [tasks, search, statusFilter, assigneeFilter, priorityFilter, relatedFilter, typeFilter]);

  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = tasks.filter((task) => task.status !== "concluido").length;
    const completed = tasks.filter((task) => task.status === "concluido").length;
    const overdue = tasks.filter((task) => {
      if (!task.due_date || task.status === "concluido") return false;
      const due = new Date(task.due_date + "T00:00:00");
      return due < today;
    }).length;

    return { pending, overdue, completed };
  }, [tasks]);

  async function createTask() {
    if (creating) return;
    setCreating(true);

    const payload = {
      ...DEFAULT_NEW_TASK,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select("*")
      .single();

    if (!error && data) {
      const normalized = normalizeTask(data);
      setTasks((prev) => [normalized, ...prev]);
      setSelectedTaskId(normalized.id);
    }

    setCreating(false);
  }

  async function updateTask(taskId: string, patch: Partial<ChecklistTask>) {
    const current = tasks.find((task) => task.id === taskId);
    if (!current) return;

    const merged: ChecklistTask = {
      ...current,
      ...patch,
    };

    merged.completed = merged.status === "concluido";

    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? merged : task))
    );

    setSavingTaskId(taskId);

    const payload = {
      title: merged.title,
      status: merged.status,
      priority: merged.priority,
      due_date: merged.due_date,
      assignee: merged.assignee,
      related_to: merged.related_to,
      related_name: merged.related_name || null,
      task_type: merged.task_type,
      estimated_time: merged.estimated_time || null,
      description: merged.description || null,
      completed: merged.completed,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", taskId)
      .select("*")
      .single();

    if (!error && data) {
      const normalized = normalizeTask(data);
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? normalized : task))
      );
    }

    setSavingTaskId(null);
  }

  async function deleteTask(taskId: string) {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }

    await supabase.from("tasks").delete().eq("id", taskId);
  }

  return (
    <div className="ws-page">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div className="ws-page-title">
            Checklist<span className="ws-dot">.</span>
          </div>
          <div className="ws-page-sub">
            Banco de tarefas da operação
          </div>
        </div>

        <button className="ws-btn" onClick={createTask} disabled={creating}>
          {creating ? "Criando..." : "Nova"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "10px 14px",
            minWidth: 120,
          }}
        >
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: ".58rem", letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--ws-text3)" }}>
            Pendentes
          </div>
          <div style={{ marginTop: 6, fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--ws-text)" }}>
            {summary.pending}
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "10px 14px",
            minWidth: 120,
          }}
        >
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: ".58rem", letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--ws-text3)" }}>
            Atrasados
          </div>
          <div style={{ marginTop: 6, fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--ws-yellow)" }}>
            {summary.overdue}
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "10px 14px",
            minWidth: 120,
          }}
        >
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: ".58rem", letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--ws-text3)" }}>
            Concluídas
          </div>
          <div style={{ marginTop: 6, fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--ws-green)" }}>
            {summary.completed}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 1.2fr) repeat(5, minmax(150px, .7fr))",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <input
          className="ws-field"
          placeholder="Buscar tarefa, cliente ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select className="ws-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
          <option value="all">Todos os status</option>
          {STATUS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>

        <select className="ws-field" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="all">Todos responsáveis</option>
          {ASSIGNEE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>

        <select className="ws-field" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)}>
          <option value="all">Todas prioridades</option>
          {PRIORITY_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>

        <select className="ws-field" value={relatedFilter} onChange={(e) => setRelatedFilter(e.target.value as any)}>
          <option value="all">Todos vínculos</option>
          {RELATED_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>

        <select className="ws-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
          <option value="all">Todos os tipos</option>
          {TYPE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </div>

      <TaskTable
        tasks={filteredTasks}
        loading={loading}
        selectedTaskId={selectedTaskId}
        savingTaskId={savingTaskId}
        onSelectTask={setSelectedTaskId}
        onQuickStatusChange={(task, status) => updateTask(task.id, { status })}
      />

      <TaskDrawer
        open={Boolean(selectedTask)}
        task={selectedTask}
        saving={savingTaskId === selectedTask?.id}
        onClose={() => setSelectedTaskId(null)}
        onDelete={deleteTask}
        onChange={updateTask}
        statusOptions={STATUS_OPTIONS}
        priorityOptions={PRIORITY_OPTIONS}
        relatedOptions={RELATED_OPTIONS}
        typeOptions={TYPE_OPTIONS}
        assigneeOptions={ASSIGNEE_OPTIONS}
      />
    </div>
  );
}