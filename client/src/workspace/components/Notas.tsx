// client/src/workspace/components/Notas.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import GlobalNoteCardModal from "./GlobalNoteCardModal";
import type { NoteCard, NoteColumn } from "./cases/types";
import Loader from "./cases/shared/Loader";

const ACCENT = "#e91e8c";

interface Props { profile: Profile; }

export default function Notas({ profile }: Props) {
  const [columns, setColumns] = useState<NoteColumn[]>([]);
  const [cards, setCards] = useState<NoteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState<NoteCard | null>(null);

  const [newColTitle, setNewColTitle] = useState("");
  const [addingCol, setAddingCol] = useState(false);
  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState("");

  const dragCardId = useRef<string | null>(null);
  const dragColId = useRef<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [colRes, cardRes] = await Promise.all([
        supabase.from("note_columns").select("*").is("case_id", null).order("order"),
        supabase.from("note_cards").select("*").is("case_id", null).order("order"),
      ]);
      setColumns(colRes.data ?? []);
      setCards(cardRes.data ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  async function addColumn() {
    if (!newColTitle.trim()) return;
    const { data } = await supabase.from("note_columns").insert({ case_id: null, title: newColTitle.trim(), order: columns.length }).select().single();
    if (data) setColumns((prev) => [...prev, data]);
    setNewColTitle(""); setAddingCol(false);
  }

  async function removeColumn(id: string) {
    if (!window.confirm("Deseja realmente excluir esta lista?")) return;
    setColumns((prev) => prev.filter((c) => c.id !== id));
    setCards((prev) => prev.filter((card) => card.column_id !== id));
    await supabase.from("note_columns").delete().eq("id", id);
  }

  async function addCard(columnId: string) {
    if (!newCardText.trim()) return;
    const colCards = cards.filter(c => c.column_id === columnId);
    const { data } = await supabase.from("note_cards").insert({ case_id: null, column_id: columnId, title: newCardText.trim(), description: "", checklist: [], comments: [], order: colCards.length }).select().single();
    if (data) setCards((prev) => [...prev, data]);
    setNewCardText(""); setAddingCard(null);
  }

  async function toggleCompleted(cardId: string, currentStatus: boolean) {
    const newVal = !currentStatus;
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, completed: newVal } : c));
    await supabase.from("note_cards").update({ completed: newVal }).eq("id", cardId);
  }

  async function handleColDrop(targetColId: string) {
    const colId = dragColId.current;
    if (!colId || colId === targetColId) { dragColId.current = null; setDragOverColId(null); return; }
    const sorted = [...columns].sort((a, b) => a.order - b.order);
    const fromIdx = sorted.findIndex(c => c.id === colId);
    const toIdx = sorted.findIndex(c => c.id === targetColId);
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const final = reordered.map((c, i) => ({ ...c, order: i }));
    setColumns(final);
    setDragOverColId(null);
    dragColId.current = null;
    await Promise.all(final.map(c => supabase.from("note_columns").update({ order: c.order }).eq("id", c.id)));
  }

  async function handleDrop(targetColId: string, targetCardId?: string) {
    const cardId = dragCardId.current;
    if (!cardId) return;

    const movingCard = cards.find(c => c.id === cardId);
    if (!movingCard) return;

    let updatedCards = cards.filter(c => c.id !== cardId);
    const colCards = updatedCards.filter(c => c.column_id === targetColId).sort((a,b) => a.order - b.order);
    
    let targetIndex = targetCardId ? colCards.findIndex(c => c.id === targetCardId) : colCards.length;
    colCards.splice(targetIndex, 0, { ...movingCard, column_id: targetColId });

    const finalColCards = colCards.map((c, i) => ({ ...c, order: i }));
    setCards([...updatedCards.filter(c => c.column_id !== targetColId), ...finalColCards]);
    
    setDragOverColId(null);
    setDragOverCardId(null);
    dragCardId.current = null;

    await Promise.all(finalColCards.map(c => 
      supabase.from("note_cards").update({ column_id: targetColId, order: c.order }).eq("id", c.id)
    ));
  }

  if (loading) return <Loader />;

  return (
    <div className="ws-page">
      <div className="ws-page-title">Notas<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Quadro geral da agência</div>

      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start", height: "calc(100dvh - 160px)" }}>
        {columns.map(column => {
          const columnCards = cards.filter(c => c.column_id === column.id).sort((a, b) => a.order - b.order);
          return (
            <div key={column.id}
              onDragOver={e => { e.preventDefault(); setDragOverColId(column.id); }}
              onDrop={() => dragColId.current ? handleColDrop(column.id) : handleDrop(column.id)}
              style={{
                background: dragOverColId === column.id ? `${ACCENT}08` : "var(--ws-surface)",
                border: `1px solid ${dragOverColId === column.id ? ACCENT : "var(--ws-border)"}`,
                borderRadius: 12, padding: "12px 12px 8px", width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
                opacity: dragColId.current === column.id ? 0.4 : 1,
                transition: "opacity .15s"
              }}>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    draggable
                    onDragStart={e => { e.stopPropagation(); dragColId.current = column.id; dragCardId.current = null; }}
                    onDragEnd={() => { dragColId.current = null; setDragOverColId(null); }}
                    style={{ cursor: "grab", color: "var(--ws-text3)", fontSize: ".9rem", lineHeight: 1, userSelect: "none" }}
                    title="Arrastar lista"
                  >⠿</span>
                  <div style={{ fontWeight: 600, fontSize: ".88rem", color: "var(--ws-text)" }}>{column.title}</div>
                </div>
                <button onClick={() => removeColumn(column.id)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}>×</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
                {columnCards.map(card => {
                  const total = (card.checklist || []).length;
                  const done = (card.checklist || []).filter(i => i.done).length;
                  let labelColor = ""; let labelName = "";
                  if (card.label_color) { try { const p = JSON.parse(card.label_color); labelColor = p.color || ""; labelName = p.name || ""; } catch { labelColor = card.label_color; } }

                  return (
                    <div key={card.id} draggable 
                      onDragStart={() => { dragCardId.current = card.id; }} 
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverCardId(card.id); }} 
                      onDrop={e => { e.stopPropagation(); handleDrop(column.id, card.id); }}
                      onClick={() => setOpenCard(card)}
                      style={{ 
                        background: "var(--ws-surface2)", 
                        border: dragOverCardId === card.id ? `2px solid ${ACCENT}` : "1px solid var(--ws-border)", 
                        borderRadius: 8, padding: "10px 12px", cursor: "pointer", position: "relative",
                        opacity: dragCardId.current === card.id ? 0.3 : 1
                      }}>
                      
                      <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggleCompleted(card.id, !!card.completed); }} 
                        style={{ 
                          position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", 
                          border: `2px solid ${card.completed ? '#00e676' : 'var(--ws-border2)'}`, 
                          background: card.completed ? '#00e676' : 'transparent', 
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 
                        }}>
                        {card.completed && <span style={{ color: "#fff", fontSize: "11px", fontWeight: 900 }}>✓</span>}
                      </div>

                      {labelColor && <div style={{ display: "inline-flex", alignItems: "center", background: labelColor, borderRadius: 4, padding: labelName ? "2px 8px" : "3px 20px", marginBottom: 6, fontSize: ".62rem", fontWeight: 700, color: "#fff", textShadow: "0 1px 2px #00000040" }}>{labelName}</div>}

                      {/* Texto SEM Riscado */}
                      <div style={{ fontSize: ".83rem", color: "var(--ws-text)", paddingRight: 22 }}>{card.title}</div>

                      <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {card.description && <span style={{ fontSize: "1.1rem", color: "var(--ws-text3)", lineHeight: 1 }}>≡</span>}
                        {total > 0 && (
                          <span style={{ fontSize: ".65rem", color: done === total ? "#00e676" : "#a0a4cc" }}>
                            ✓ {done}/{total}
                          </span>
                        )}
                        {(card.comments?.length ?? 0) > 0 && <span style={{ fontSize: ".75rem", color: "var(--ws-text3)" }}>💬 {card.comments?.length}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {addingCard === column.id ? (
                <div style={{ marginTop: 8 }}>
                  <textarea value={newCardText} autoFocus onChange={e => { setNewCardText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                    placeholder="Título do cartão..." onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void addCard(column.id); } }}
                    style={{ width: "100%", background: "var(--ws-surface2)", border: `1px solid ${ACCENT}`, borderRadius: 8, color: "var(--ws-text)", padding: "8px 10px", fontSize: ".82rem", resize: "none", overflow: "hidden" }} />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => addCard(column.id)} style={{ background: ACCENT, color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: ".78rem", border: "none", cursor: "pointer" }}>Adicionar</button>
                    <button onClick={() => setAddingCard(null)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".78rem" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingCard(column.id)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", width: "100%", textAlign: "left", fontSize: ".78rem", padding: "8px 4px", marginTop: 4 }}>+ Adicionar cartão</button>
              )}
            </div>
          );
        })}

        <div style={{ width: 240, flexShrink: 0 }}>
          {addingCol ? (
            <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 12, padding: 12 }}>
              <input value={newColTitle} onChange={(e) => setNewColTitle(e.target.value)} placeholder="Título da lista" autoFocus className="ws-input" style={{ marginBottom: 8 }} onKeyDown={(e) => e.key === "Enter" && addColumn()} />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addColumn} style={{ background: ACCENT, color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: ".78rem", border: "none", cursor: "pointer" }}>Criar lista</button>
                <button onClick={() => setAddingCol(false)} style={{ background: "none", border: "none", color: "var(--ws-text3)", fontSize: ".78rem", cursor: "pointer" }}>×</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingCol(true)} style={{ background: "var(--ws-surface)", border: "1px dashed var(--ws-border2)", borderRadius: 12, padding: "12px 16px", width: "100%", color: "var(--ws-text3)", fontSize: ".82rem", cursor: "pointer" }}>+ Adicionar lista</button>
          )}
        </div>
      </div>

      {openCard && (
        <GlobalNoteCardModal 
          card={openCard} 
          onClose={() => setOpenCard(null)} 
          onUpdate={c => setCards(prev => prev.map(item => item.id === c.id ? c : item))} 
          onDelete={id => setCards(prev => prev.filter(c => c.id !== id))} 
          profile={profile} 
        />
      )}
    </div>
  );
}