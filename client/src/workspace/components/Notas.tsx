// client/src/workspace/components/Notas.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Note } from "../../lib/supabaseClient";

export default function Notas() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    supabase.from("notes").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setNotes(data ?? []));
  }, []);

  async function addNote() {
    const { data } = await supabase.from("notes").insert({ content: "" }).select().single();
    if (data) setNotes(prev => [data, ...prev]);
  }

  async function updateNote(id: string, content: string) {
    await supabase.from("notes").update({ content }).eq("id", id);
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" }).toUpperCase();

  return (
    <div className="ws-page">
      <div className="ws-page-title">Notas<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Anotações e blocos de texto livre</div>
      <div className="ws-notes">
        {notes.map(n => (
          <div key={n.id} className="ws-note">
            <textarea
              defaultValue={n.content}
              placeholder="Escrever nota..."
              onBlur={e => updateNote(n.id, e.target.value)}
            />
            <div className="ws-note-date">{fmtDate(n.created_at)}</div>
          </div>
        ))}
        <div className="ws-note-add" onClick={addNote}>
          <span style={{ fontSize: "26px" }}>+</span>
          <span>Nova nota</span>
        </div>
      </div>
    </div>
  );
}
