// client/src/workspace/components/Checklist.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Task } from "../../lib/supabaseClient";

type Filter = "all"|"ml"|"rf"|"dig"|"cliente"|"parceiro";

export default function Checklist() {
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [text, setText]     = useState("");
  const [person, setPerson] = useState("ML");
  const [tag, setTag]       = useState<"dig"|"cliente"|"parceiro">("dig");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    const ch = supabase.channel("tasks-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function fetchTasks() {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks(data ?? []); setLoading(false);
  }

  async function addTask() {
    if (!text.trim()) return;
    await supabase.from("tasks").insert({ text: text.trim(), person, tag, done: false });
    setText("");
  }

  async function toggleTask(id: string, done: boolean) {
    await supabase.from("tasks").update({ done: !done }).eq("id", id);
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
  }

  const filtered = tasks.filter(t => {
    if (filter === "ml")       return t.person === "ML";
    if (filter === "rf")       return t.person === "RF";
    if (filter === "dig")      return t.tag === "dig";
    if (filter === "cliente")  return t.tag === "cliente";
    if (filter === "parceiro") return t.tag === "parceiro";
    return true;
  });

  const FILTERS: { id: Filter; label: string }[] = [
    { id:"all", label:"Todas" }, { id:"ml", label:"Melissa" }, { id:"rf", label:"Rafael" },
    { id:"dig", label:"DIG" }, { id:"cliente", label:"Cliente" }, { id:"parceiro", label:"Parceiro" },
  ];

  return (
    <div className="ws-page">
      <div className="ws-page-title">Checklist<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Tarefas organizadas por pessoa e categoria</div>

      <div className="ws-input-row">
        <input className="ws-field flex1" value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Nova tarefa..." />
        <select className="ws-field" value={person} onChange={e => setPerson(e.target.value)}>
          <option value="ML">Melissa</option>
          <option value="RF">Rafael</option>
          <option value="ALL">Ambos</option>
        </select>
        <select className="ws-field" value={tag} onChange={e => setTag(e.target.value as any)}>
          <option value="dig">DIG</option>
          <option value="cliente">Cliente</option>
          <option value="parceiro">Parceiro</option>
        </select>
        <button className="ws-btn" onClick={addTask}>+ Tarefa</button>
      </div>

      <div className="ws-filters">
        {FILTERS.map(f => (
          <button key={f.id} className={`ws-filter ${filter === f.id ? "active" : ""}`}
            onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color:"var(--ws-text3)", fontFamily:"DM Mono", fontSize:".8rem" }}>Carregando...</div>
      ) : (
        <div className="ws-tasks">
          {filtered.length === 0 && <div style={{ color:"var(--ws-text3)", fontSize:".8rem" }}>Nenhuma tarefa.</div>}
          {filtered.map(t => (
            <div key={t.id} className={`ws-task ${t.done ? "done" : ""}`}>
              <div className={`ws-check ${t.done ? "on" : ""}`} onClick={() => toggleTask(t.id, t.done)}>
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
