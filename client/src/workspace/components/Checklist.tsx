// client/src/workspace/components/Checklist.tsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Task, Profile } from "../../lib/supabaseClient";

type Filter = "all" | "ml" | "rf" | "dig" | "cliente" | "parceiro";

interface Props {
  profile: Profile;
}

export default function Checklist({ profile }: Props) {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [text, setText]       = useState("");
  const [person, setPerson]   = useState("ML");
  const [tag, setTag]         = useState<"dig" | "cliente" | "parceiro">("dig");
  const [filter, setFilter]   = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setTasks(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => [payload.new as Task, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((t) => (t.id === (payload.new as Task).id ? (payload.new as Task) : t))
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== (payload.old as Task).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  async function addTask() {
    if (!text.trim() || adding) return;
    setAdding(true);
    const { error } = await supabase
      .from("tasks")
      .insert({ text: text.trim(), person, tag, done: false });
    if (!error) setText("");
    setAdding(false);
  }

  async function toggleTask(task: Task) {
    const { data, error } = await supabase
      .from("tasks")
      .update({ done: !task.done })
      .eq("id", task.id)
      .select()
      .single();
    if (!error && data) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
    }
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  }

  const filtered = tasks.filter((t) => {
    if (filter === "ml")       return t.person === "ML";
    if (filter === "rf")       return t.person === "RF";
    if (filter === "dig")      return t.tag === "dig";
    if (filter === "cliente")  return t.tag === "cliente";
    if (filter === "parceiro") return t.tag === "parceiro";
    return true;
  });

  const pending = tasks.filter((t) => !t.done).length;
  const done    = tasks.filter((t) => t.done).length;

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all",      label: "Todas" },
    { id: "ml",       label: "Melissa" },
    { id: "rf",       label: "Rafael" },
    { id: "dig",      label: "DIG" },
    { id: "cliente",  label: "Cliente" },
    { id: "parceiro", label: "Parceiro" },
  ];

  return (
    <div className="ws-page">
      <div className="ws-page-title">Checklist<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Tarefas organizadas por pessoa e categoria</div>

      {/* Stats rápidos */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: "var(--ws-radius-sm)", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: "DM Mono", fontSize: ".57rem", letterSpacing: "2px", textTransform: "uppercase", color: "var(--ws-text3)" }}>Pendentes</span>
          <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.6rem", color: "var(--ws-accent)", letterSpacing: "-1px" }}>{pending}</span>
        </div>
        <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: "var(--ws-radius-sm)", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: "DM Mono", fontSize: ".57rem", letterSpacing: "2px", textTransform: "uppercase", color: "var(--ws-text3)" }}>Concluídas</span>
          <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.6rem", color: "var(--ws-green)", letterSpacing: "-1px" }}>{done}</span>
        </div>
      </div>

      {/* Input nova tarefa */}
      <div className="ws-input-row">
        <input
          className="ws-field flex1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Nova tarefa... (Enter para adicionar)"
        />
        <select className="ws-field" value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="ML">Melissa</option>
          <option value="RF">Rafael</option>
          <option value="ALL">Ambos</option>
        </select>
        <select className="ws-field" value={tag} onChange={(e) => setTag(e.target.value as any)}>
          <option value="dig">DIG</option>
          <option value="cliente">Cliente</option>
          <option value="parceiro">Parceiro</option>
        </select>
        <button className="ws-btn" onClick={addTask} disabled={adding}>
          {adding ? "..." : "+ Tarefa"}
        </button>
      </div>

      {/* Filtros */}
      <div className="ws-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`ws-filter ${filter === f.id ? "active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ color: "var(--ws-text3)", fontFamily: "DM Mono", fontSize: ".8rem" }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "var(--ws-text3)", fontSize: ".85rem", padding: "24px 0" }}>Nenhuma tarefa encontrada.</div>
      ) : (
        <div className="ws-tasks">
          {filtered.map((t) => (
            <div key={t.id} className={`ws-task ${t.done ? "done" : ""}`}>
              {/* Botão de marcar */}
              <div
                className={`ws-check ${t.done ? "on" : ""}`}
                onClick={() => toggleTask(t)}
                style={{ cursor: "pointer", flexShrink: 0 }}
              >
                {t.done ? "✓" : ""}
              </div>

              {/* Texto */}
              <div className="ws-task-text">{t.text}</div>

              {/* Meta */}
              <div className="ws-task-meta">
                <span className={`ws-tag ws-tag-${t.tag}`}>{t.tag}</span>
                <div className="ws-person" title={t.person === "ML" ? "Melissa" : t.person === "RF" ? "Rafael" : t.person}>
                  {t.person}
                </div>
                {/* Botão excluir */}
                <span
                  className="ws-del"
                  onClick={() => deleteTask(t.id)}
                  title="Excluir tarefa"
                  style={{ cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "0 4px" }}
                >
                  ×
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
