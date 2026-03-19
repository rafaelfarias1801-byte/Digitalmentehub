// client/src/workspace/components/Notas.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import GlobalNoteCardModal from "./GlobalNoteCardModal";
import type { NoteCard, NoteColumn } from "./cases/types";
// 👇 CAMINHO CORRIGIDO AQUI:
import Loader from "./cases/shared/Loader";

const ACCENT = "#e91e8c";

interface Props { profile: Profile; }

export default function Notas({ profile }: Props) {
  const [columns, setColumns] = useState<NoteColumn[]>([]);
  const [cards, setCards] = useState<NoteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState<NoteCard | null>(null);

  const dragCardId = useRef<string | null>(null);
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

  async function toggleCompleted(card: NoteCard) {
    const newVal = !card.completed;
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, completed: newVal } : c));
    await supabase.from("note_cards").update({ completed: newVal }).eq("id", card.id);
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
              onDrop={() => handleDrop(column.id)}
              style={{ 
                background: dragOverColId === column.id ? `${ACCENT}08` : "var(--ws-surface)", 
                border: `1px solid ${dragOverColId === column.id ? ACCENT : "var(--ws-border)"}`, 
                borderRadius: 12, padding: "12px 12px 8px", width: 260, flexShrink: 0, display: "flex", flexDirection: "column" 
              }}>
              
              <div style={{ fontWeight: 600, fontSize: ".88rem", marginBottom: 10, color: "var(--ws-text)" }}>{column.title}</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
                {columnCards.map(card => (
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
                    
                    <div onClick={(e) => { e.stopPropagation(); void toggleCompleted(card); }} 
                      style={{ 
                        position: "absolute", top: 10, right: 10, width: 18, height: 18, borderRadius: "50%", 
                        border: `2px solid ${card.completed ? '#00e676' : 'var(--ws-border2)'}`, 
                        background: card.completed ? '#00e676' : 'transparent', 
                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" 
                      }}>
                      {card.completed && <span style={{ color: "#fff", fontSize: "10px", fontWeight: 900 }}>✓</span>}
                    </div>

                    <div style={{ 
                      fontSize: ".83rem", color: "var(--ws-text)", paddingRight: 20,
                      textDecoration: card.completed ? 'line-through' : 'none',
                      opacity: card.completed ? 0.6 : 1
                    }}>{card.title}</div>

                    <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                      {card.description && <span style={{ fontSize: "1.1rem", color: "var(--ws-text3)", lineHeight: 1 }}>≡</span>}
                      {(card.checklist?.length ?? 0) > 0 && (
                        <span style={{ fontSize: ".65rem", color: card.checklist?.every(i => i.done) ? "#00e676" : "#a0a4cc" }}>
                          ✓ {card.checklist?.filter(i => i.done).length}/{card.checklist?.length}
                        </span>
                      )}
                      {(card.comments?.length ?? 0) > 0 && <span style={{ fontSize: ".75rem", color: "var(--ws-text3)" }}>💬 {card.comments?.length}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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