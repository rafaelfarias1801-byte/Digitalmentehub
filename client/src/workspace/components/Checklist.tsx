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
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    setTasks(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function addTask() {
    if (!text.trim() || adding) return;
    setAdding(true);
    const newText = text.trim();
    setText("");

    const { data, error } = await supabase
      .from("tasks")
      .insert({ text: newText, person, tag, done: false })
      .select()
      .single();

    if (!error && data) {
      setTasks((prev) => [data, ...prev]);
    }
    setAdding(false);
  }

  async function toggleTask(task: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))
    );
    await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id);
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
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

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: "var(--ws-radius-sm)", padding: "12px 20px" }}>
          <div style={{ fontFamily: "DM Mono", fontSize: ".57rem", letterSpacing: "2px", textTransform: "uppercase", color: "var(--ws-text3)", marginBottom: 4 }}>Pendentes</div>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.6rem", color: "var(--ws-accent)", letterSpacing: "-1px" }}>{pending}</div>
        </div>
        <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: "var(--ws-radius-sm)", padding: "12px 20px" }}>
          <div style={{ fontFamily: "DM Mono", fontSize: ".57rem", letterSpacing: "2px", textTransform: "uppercase", color: "var(--ws-text3)", marginBottom: 4 }}>Concluídas</div>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.6rem", color: "var(--ws-green)", letterSpacing: "-1px" }}>{done}</div>
        </div>
      </div>

      <div className="ws-input-row">
        <input
          className="ws-field flex1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Nova tarefa... (Enter para adicionar)"
          disabled={adding}
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
          {adding ? "Salvando..." : "+ Tarefa"}
        </button>
      </div>

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

      {loading ? (
        <div style={{ color: "var(--ws-text3)", fontFamily: "DM Mono", fontSize: ".8rem" }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "var(--ws-text3)", fontSize: ".85rem", padding: "24px 0" }}>Nenhuma tarefa encontrada.</div>
      ) : (
        <div className="ws-tasks">
          {filtered.map((t) => (
            <div key={t.id} className={`ws-task ${t.done ? "done" : ""}`}>
              <div className={`ws-check ${t.done ? "on" : ""}`} onClick={() => toggleTask(t)}>
                {t.done ? "✓" : ""}
              </div>
              <div className="ws-task-text">{t.text}</div>
              <div className="ws-task-meta">
                <span className={`ws-tag ws-tag-${t.tag}`}>{t.tag}</span>
                <div className="ws-person">{t.person}</div>
                <span className="ws-del" onClick={() => deleteTask(t.id)}>×</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
