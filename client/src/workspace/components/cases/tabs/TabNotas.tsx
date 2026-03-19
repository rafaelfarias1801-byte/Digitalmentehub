import { useEffect, useRef, useState } from "react";
import type { Profile } from "../../../../lib/supabaseClient";
import { supabase } from "../../../../lib/supabaseClient";
import NoteCardModal from "../modals/NoteCardModal";
import Loader from "../shared/Loader";
import type { Case, NoteCard, NoteColumn } from "../types";
import { useIsMobile } from "../../../hooks/useIsMobile";

interface TabNotasProps {
  caseData: Case;
  profile: Profile;
  readonly?: boolean;
}

export default function TabNotas({ caseData, profile, readonly = false }: TabNotasProps) {
  const [columns, setColumns] = useState<NoteColumn[]>([]);
  const [cards, setCards] = useState<NoteCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [newColTitle, setNewColTitle] = useState("");
  const [addingCol, setAddingCol] = useState(false);
  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState("");

  const LS_OPEN_CARD = `ws_open_note_card_${caseData.id}`;
  const [openCard, setOpenCard] = useState<NoteCard | null>(null);

  // Refs e States para controle visual do Drag & Drop
  const dragCardId = useRef<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;
    async function loadBoard() {
      setLoading(true);
      const [columnsRes, cardsRes] = await Promise.all([
        supabase.from("note_columns").select("*").eq("case_id", caseData.id).order("order"),
        supabase.from("note_cards").select("*").eq("case_id", caseData.id).order("order"),
      ]);
      if (mounted) {
        const loadedCards = cardsRes.data ?? [];
        setColumns(columnsRes.data ?? []);
        setCards(loadedCards);
        const savedCardId = localStorage.getItem(LS_OPEN_CARD);
        if (savedCardId) {
          const found = loadedCards.find((c) => c.id === savedCardId);
          if (found) setOpenCard(found);
        }
        setLoading(false);
      }
    }
    void loadBoard();
    return () => { mounted = false; };
  }, [caseData.id, LS_OPEN_CARD]);

  async function addColumn() {
    if (!newColTitle.trim()) return;
    const { data } = await supabase.from("note_columns").insert({
      case_id: caseData.id,
      title: newColTitle.trim(),
      order: columns.length,
    }).select().single();
    if (data) setColumns((prev) => [...prev, data]);
    setNewColTitle("");
    setAddingCol(false);
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
    const { data } = await supabase.from("note_cards").insert({
      case_id: caseData.id,
      column_id: columnId,
      title: newCardText.trim(),
      description: "",
      checklist: [],
      comments: [],
      order: colCards.length,
    }).select().single();
    if (data) setCards((prev) => [...prev, data]);
    setNewCardText("");
    setAddingCard(null);
  }

  async function updateCard(card: NoteCard) {
    const { data } = await supabase.from("note_cards").update(card).eq("id", card.id).select().single();
    if (data) {
      setCards((prev) => prev.map((item) => (item.id === card.id ? data : item)));
      setOpenCard(data);
    }
  }

  async function removeCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    setOpenCard(null);
    localStorage.removeItem(LS_OPEN_CARD);
    await supabase.from("note_cards").delete().eq("id", id);
  }

  // ── Drag & Drop Inteligente ──
  function handleDragStart(e: React.DragEvent, cardId: string) {
    if (readonly) { e.preventDefault(); return; }
    dragCardId.current = cardId;
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(targetColId: string, targetCardId?: string) {
    const cardId = dragCardId.current;
    if (!cardId) return;

    const movingCard = cards.find(c => c.id === cardId);
    if (!movingCard) return;

    // Prepara a nova lista reordenada
    let updatedCards = cards.filter(c => c.id !== cardId);
    const colCards = updatedCards.filter(c => c.column_id === targetColId).sort((a,b) => a.order - b.order);
    
    let targetIndex = colCards.length;
    if (targetCardId) {
      targetIndex = colCards.findIndex(c => c.id === targetCardId);
    }

    const newCard = { ...movingCard, column_id: targetColId };
    colCards.splice(targetIndex, 0, newCard);

    // Reatribui as ordens sequenciais
    const finalColCards = colCards.map((c, i) => ({ ...c, order: i }));
    const otherCards = updatedCards.filter(c => c.column_id !== targetColId);
    
    setCards([...otherCards, ...finalColCards]);
    setDragOverColId(null);
    setDragOverCardId(null);
    dragCardId.current = null;

    // Atualiza o Banco
    await Promise.all(finalColCards.map(c => 
      supabase.from("note_cards").update({ column_id: targetColId, order: c.order }).eq("id", c.id)
    ));
  }

  if (loading) return <Loader />;

  return (
    <div style={{
      display: "flex", gap: 16, overflowX: isMobile ? "visible" : "auto", 
      flexDirection: isMobile ? "column" : "row", paddingBottom: 16, 
      alignItems: isMobile ? "stretch" : "flex-start", height: isMobile ? "auto" : "calc(100vh - 160px)",
    }}>
      {columns.map((column) => {
        const columnCards = cards.filter((c) => c.column_id === column.id).sort((a, b) => a.order - b.order);
        return (
          <div
            key={column.id}
            onDragOver={(e) => { e.preventDefault(); setDragOverColId(column.id); }}
            onDragLeave={() => setDragOverColId(null)}
            onDrop={() => handleDrop(column.id)}
            style={{
              background: dragOverColId === column.id ? `${caseData.color}08` : "var(--ws-surface)",
              border: `1px solid ${dragOverColId === column.id ? caseData.color : "var(--ws-border)"}`,
              borderRadius: 12, padding: "12px 12px 8px", width: isMobile ? "100%" : 260, flexShrink: 0,
              display: "flex", flexDirection: "column", maxHeight: isMobile ? "none" : "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: ".88rem", color: "var(--ws-text)" }}>{column.title}</div>
              {!readonly && <button onClick={() => removeColumn(column.id)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer" }}>×</button>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
              {columnCards.map((card) => {
                const total = (card.checklist || []).length;
                const done = (card.checklist || []).filter(i => i.done).length;
                return (
                  <div
                    key={card.id}
                    draggable={!readonly}
                    onDragStart={(e) => handleDragStart(e, card.id)}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverCardId(card.id); }}
                    onDragLeave={() => setDragOverCardId(null)}
                    onDrop={(e) => { e.stopPropagation(); handleDrop(column.id, card.id); }}
                    onClick={() => { localStorage.setItem(LS_OPEN_CARD, card.id); setOpenCard(card); }}
                    style={{
                      background: "var(--ws-surface2)", 
                      // Indicador visual de onde o card vai cair:
                      border: dragOverCardId === card.id ? `2px solid ${caseData.color}` : "1px solid var(--ws-border)",
                      borderRadius: 8, padding: "10px 12px", cursor: "pointer", 
                      opacity: dragCardId.current === card.id ? 0.3 : 1,
                      transform: dragOverCardId === card.id ? "translateY(-2px)" : "none",
                      transition: "all 0.1s"
                    }}
                  >
                    <div style={{ fontSize: ".83rem", color: "var(--ws-text)", lineHeight: 1.5 }}>{card.title}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      {card.due_date && <span style={{ fontSize: ".65rem", padding: "2px 6px", borderRadius: 4, background: "var(--ws-surface3)", color: "#a0a4cc" }}>📅 {new Date(`${card.due_date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>}
                      {total > 0 && <span style={{ fontSize: ".65rem", padding: "2px 6px", borderRadius: 4, background: done === total ? "#00e67622" : "var(--ws-surface3)", color: done === total ? "#00e676" : "#a0a4cc" }}>✓ {done}/{total}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {!readonly && (addingCard === column.id ? (
              <div style={{ marginTop: 8 }}>
                <textarea
                  value={newCardText}
                  onChange={(e) => {
                    setNewCardText(e.target.value);
                    e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="Título do cartão..." autoFocus
                  style={{ width: "100%", background: "var(--ws-surface2)", border: `1px solid ${caseData.color}`, borderRadius: 8, color: "var(--ws-text)", padding: "8px 10px", fontSize: ".82rem", resize: "none", overflow: "hidden" }}
                />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={() => addCard(column.id)} style={{ background: caseData.color, color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: ".78rem" }}>Adicionar</button>
                  <button onClick={() => setAddingCard(null)} style={{ color: "var(--ws-text3)", fontSize: ".78rem" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingCard(column.id)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", width: "100%", textAlign: "left", fontSize: ".78rem", padding: "8px 4px", marginTop: 4 }}>+ Adicionar cartão</button>
            ))}
          </div>
        );
      })}

      {!readonly && (
        <div style={{ width: 240, flexShrink: 0 }}>
          {addingCol ? (
            <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 12, padding: 12 }}>
              <input value={newColTitle} onChange={(e) => setNewColTitle(e.target.value)} placeholder="Título da lista" autoFocus className="ws-input" style={{ marginBottom: 8 }} onKeyDown={(e) => e.key === "Enter" && addColumn()} />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addColumn} style={{ background: caseData.color, color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: ".78rem" }}>Criar lista</button>
                <button onClick={() => setAddingCol(false)} style={{ color: "var(--ws-text3)", fontSize: ".78rem" }}>×</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingCol(true)} style={{ background: "var(--ws-surface)", border: "1px dashed var(--ws-border2)", borderRadius: 12, padding: "12px 16px", width: "100%", color: "var(--ws-text3)", fontSize: ".82rem", cursor: "pointer" }}>+ Adicionar lista</button>
          )}
        </div>
      )}

      {openCard && (
        <NoteCardModal
          card={openCard} caseData={caseData} profile={profile}
          onClose={() => { localStorage.removeItem(LS_OPEN_CARD); setOpenCard(null); }}
          onUpdate={updateCard} onDelete={removeCard}
        />
      )}
    </div>
  );
}