// client/src/workspace/components/cases/tabs/TabNotas.tsx
import { useEffect, useRef, useState } from "react";
import type { Profile } from "../../../../../lib/supabaseClient";
import { supabase } from "../../../../lib/supabaseClient";
import NoteCardModal from "../modals/NoteCardModal";
import Loader from "../shared/Loader";
import type { Case, NoteCard, NoteColumn } from "../types";
import { useIsMobile } from "../../../../hooks/useIsMobile";

interface TabNotasProps { caseData: Case; profile: Profile; readonly?: boolean; }

export default function TabNotas({ caseData, profile, readonly = false }: TabNotasProps) {
  const [columns, setColumns] = useState<NoteColumn[]>([]);
  const [cards, setCards] = useState<NoteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState("");
  const [openCard, setOpenCard] = useState<NoteCard | null>(null);

  const dragCardId = useRef<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const LS_OPEN_CARD = `ws_open_note_card_${caseData.id}`;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [cols, crds] = await Promise.all([
        supabase.from("note_columns").select("*").eq("case_id", caseData.id).order("order"),
        supabase.from("note_cards").select("*").eq("case_id", caseData.id).order("order"),
      ]);
      const loadedCards = crds.data ?? [];
      setColumns(cols.data ?? []); setCards(loadedCards);
      const saved = localStorage.getItem(LS_OPEN_CARD);
      if (saved) { const found = loadedCards.find(c => c.id === saved); if (found) setOpenCard(found); }
      setLoading(false);
    }
    void load();
  }, [caseData.id]);

  // Função do Botão de Concluir (Mobile friendly)
  async function toggleCompleted(card: NoteCard) {
    const newVal = !card.completed;
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, completed: newVal } : c));
    await supabase.from("note_cards").update({ completed: newVal }).eq("id", card.id);
  }

  // Lógica de Reordenação e Troca de Lista
  async function handleDrop(targetColId: string, targetCardId?: string) {
    const cardId = dragCardId.current; if (!cardId) return;
    const movingCard = cards.find(c => c.id === cardId); if (!movingCard) return;

    let updatedCards = cards.filter(c => c.id !== cardId);
    const colCards = updatedCards.filter(c => c.column_id === targetColId).sort((a,b) => a.order - b.order);
    let targetIndex = targetCardId ? colCards.findIndex(c => c.id === targetCardId) : colCards.length;

    colCards.splice(targetIndex, 0, { ...movingCard, column_id: targetColId });
    const finalColCards = colCards.map((c, i) => ({ ...c, order: i }));
    setCards([...updatedCards.filter(c => c.column_id !== targetColId), ...finalColCards]);
    setDragOverColId(null); setDragOverCardId(null); dragCardId.current = null;

    await Promise.all(finalColCards.map(c => 
      supabase.from("note_cards").update({ column_id: targetColId, order: c.order }).eq("id", c.id)
    ));
  }

  if (loading) return <Loader />;

  return (
    <div style={{ display: "flex", gap: 16, overflowX: isMobile ? "visible" : "auto", flexDirection: isMobile ? "column" : "row", paddingBottom: 16, height: isMobile ? "auto" : "calc(100vh - 160px)" }}>
      {columns.map(column => {
        const columnCards = cards.filter(c => c.column_id === column.id).sort((a, b) => a.order - b.order);
        return (
          <div key={column.id} onDragOver={e => { e.preventDefault(); setDragOverColId(column.id); }} onDrop={() => handleDrop(column.id)}
            style={{ background: dragOverColId === column.id ? `${caseData.color}08` : "var(--ws-surface)", border: `1px solid ${dragOverColId === column.id ? caseData.color : "var(--ws-border)"}`, borderRadius: 12, padding: "12px 12px 8px", width: isMobile ? "100%" : 260, flexShrink: 0, display: "flex", flexDirection: "column" }}>
            
            <div style={{ fontWeight: 600, fontSize: ".88rem", marginBottom: 10, color: "var(--ws-text)" }}>{column.title}</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
              {columnCards.map(card => (
                <div key={card.id} draggable={!readonly} onDragStart={() => { dragCardId.current = card.id; }} onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverCardId(card.id); }} onDrop={e => { e.stopPropagation(); handleDrop(column.id, card.id); }}
                  onClick={() => { localStorage.setItem(LS_OPEN_CARD, card.id); setOpenCard(card); }}
                  style={{ background: "var(--ws-surface2)", border: dragOverCardId === card.id ? `2px solid ${caseData.color}` : "1px solid var(--ws-border)", borderRadius: 8, padding: "10px 12px", cursor: "pointer", position: "relative", opacity: dragCardId.current === card.id ? 0.3 : 1 }}>
                  
                  {/* Botão Checkmark Permanente (Trello style) */}
                  <div onClick={(e) => { e.stopPropagation(); void toggleCompleted(card); }} style={{ position: "absolute", top: 10, right: 10, width: 18, height: 18, borderRadius: "50%", border: `2px solid ${card.completed ? '#00e676' : 'var(--ws-border2)'}`, background: card.completed ? '#00e676' : 'transparent', display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                    {card.completed && <span style={{ color: "#fff", fontSize: "10px", fontWeight: 900 }}>✓</span>}
                  </div>

                  <div style={{ fontSize: ".83rem", color: "var(--ws-text)", paddingRight: 20, textDecoration: card.completed ? 'line-through' : 'none', opacity: card.completed ? 0.6 : 1 }}>{card.title}</div>
                  
                  {/* Indicadores Visuais */}
                  <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {card.description && <span title="Tem descrição" style={{ fontSize: "1.1rem", color: "var(--ws-text3)", lineHeight: 1 }}>≡</span>}
                    {card.due_date && <span style={{ fontSize: ".62rem", padding: "2px 5px", background: "var(--ws-surface3)", borderRadius: 4, color: "var(--ws-text2)" }}>📅 {new Date(`${card.due_date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>}
                    {(card.checklist?.length ?? 0) > 0 && <span style={{ fontSize: ".65rem", color: card.checklist?.every(i => i.done) ? "#00e676" : "#a0a4cc" }}>✓ {card.checklist?.filter(i => i.done).length}/{card.checklist?.length}</span>}
                    {(card.comments?.length ?? 0) > 0 && <span style={{ fontSize: ".75rem", color: "var(--ws-text3)" }}>💬 {card.comments?.length}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Adicionar Cartão com Auto-Expand */}
            {!readonly && (addingCard === column.id ? (
              <div style={{ marginTop: 8 }}>
                <textarea value={newCardText} autoFocus onChange={e => { setNewCardText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  placeholder="Título do cartão..." onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void addCard(column.id); } }}
                  style={{ width: "100%", background: "var(--ws-surface2)", border: `1px solid ${caseData.color}`, borderRadius: 8, color: "var(--ws-text)", padding: "8px 10px", fontSize: ".82rem", resize: "none", overflow: "hidden" }} />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={() => addCard(column.id)} style={{ background: caseData.color, color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: ".78rem", border: "none", cursor: "pointer" }}>Adicionar</button>
                  <button onClick={() => setAddingCard(null)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".78rem" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingCard(column.id)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", width: "100%", textAlign: "left", fontSize: ".78rem", padding: "8px 4px", marginTop: 4 }}>+ Adicionar cartão</button>
            ))}
          </div>
        );
      })}
      {openCard && <NoteCardModal card={openCard} caseData={caseData} profile={profile} onClose={() => { localStorage.removeItem(LS_OPEN_CARD); setOpenCard(null); }} onUpdate={c => setCards(prev => prev.map(item => item.id === c.id ? c : item))} onDelete={id => setCards(prev => prev.filter(c => c.id !== id))} />}
    </div>
  );
}