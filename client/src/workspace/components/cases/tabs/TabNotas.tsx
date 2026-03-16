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
}

export default function TabNotas({ caseData, profile }: TabNotasProps) {
  const [columns, setColumns] = useState<NoteColumn[]>([]);
  const [cards, setCards] = useState<NoteCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [newColTitle, setNewColTitle] = useState("");
  const [addingCol, setAddingCol] = useState(false);

  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState("");

  const [openCard, setOpenCard] = useState<NoteCard | null>(null);

  const dragCard = useRef<string | null>(null);
  const dragOverCol = useRef<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;

    async function loadBoard() {
      setLoading(true);

      const [columnsRes, cardsRes] = await Promise.all([
        supabase
          .from("note_columns")
          .select("*")
          .eq("case_id", caseData.id)
          .order("order"),
        supabase
          .from("note_cards")
          .select("*")
          .eq("case_id", caseData.id)
          .order("order"),
      ]);

      if (mounted) {
        setColumns(columnsRes.data ?? []);
        setCards(cardsRes.data ?? []);
        setLoading(false);
      }
    }

    void loadBoard();

    return () => {
      mounted = false;
    };
  }, [caseData.id]);

  async function addColumn() {
    if (!newColTitle.trim()) return;

    const { data } = await supabase
      .from("note_columns")
      .insert({
        case_id: caseData.id,
        title: newColTitle.trim(),
        order: columns.length,
      })
      .select()
      .single();

    if (data) {
      setColumns((prev) => [...prev, data]);
    }

    setNewColTitle("");
    setAddingCol(false);
  }

  async function removeColumn(id: string) {
    setColumns((prev) => prev.filter((column) => column.id !== id));
    setCards((prev) => prev.filter((card) => card.column_id !== id));

    await supabase.from("note_columns").delete().eq("id", id);
  }

  async function addCard(columnId: string) {
    if (!newCardText.trim()) return;

    const { data } = await supabase
      .from("note_cards")
      .insert({
        case_id: caseData.id,
        column_id: columnId,
        title: newCardText.trim(),
        description: "",
        checklist: [],
        comments: [],
        order: cards.filter((card) => card.column_id === columnId).length,
      })
      .select()
      .single();

    if (data) {
      setCards((prev) => [...prev, data]);
    }

    setNewCardText("");
    setAddingCard(null);
  }

  async function updateCard(card: NoteCard) {
    const { data } = await supabase
      .from("note_cards")
      .update(card)
      .eq("id", card.id)
      .select()
      .single();

    if (data) {
      setCards((prev) => prev.map((item) => (item.id === card.id ? data : item)));
      setOpenCard(data);
    }
  }

  async function removeCard(id: string) {
    setCards((prev) => prev.filter((card) => card.id !== id));
    setOpenCard(null);

    await supabase.from("note_cards").delete().eq("id", id);
  }

  function onDragStart(e: React.DragEvent<HTMLDivElement>, cardId: string) {
    dragCard.current = cardId;
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = "0.4";
  }

  function onDragEnd(e: React.DragEvent<HTMLDivElement>) {
    e.currentTarget.style.opacity = "1";
    dragCard.current = null;
    dragOverCol.current = null;
    setDragOverColId(null);
  }

  function onDragOverCol(e: React.DragEvent<HTMLDivElement>, colId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverCol.current = colId;
    setDragOverColId(colId);
  }

  function onDragLeaveCol() {
    setDragOverColId(null);
  }

  async function onDropCol(e: React.DragEvent<HTMLDivElement>, colId: string) {
    e.preventDefault();
    setDragOverColId(null);

    const cardId = dragCard.current;
    if (!cardId) return;

    const card = cards.find((item) => item.id === cardId);
    if (!card || card.column_id === colId) return;

    const newOrder = cards.filter((item) => item.column_id === colId).length;
    const updatedCard: NoteCard = {
      ...card,
      column_id: colId,
      order: newOrder,
    };

    setCards((prev) => prev.map((item) => (item.id === cardId ? updatedCard : item)));

    await supabase
      .from("note_cards")
      .update({ column_id: colId, order: newOrder })
      .eq("id", cardId);
  }

  if (loading) {
    return <Loader />;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        overflowX: isMobile ? "visible" : "auto",
        overflowY: isMobile ? "visible" : "visible",
        flexDirection: isMobile ? "column" : "row",
        paddingBottom: 16,
        alignItems: "flex-start",
      }}
    >
      {columns.map((column) => {
        const columnCards = cards.filter((card) => card.column_id === column.id);
        const isDragTarget = dragOverColId === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => onDragOverCol(e, column.id)}
            onDragLeave={onDragLeaveCol}
            onDrop={(e) => void onDropCol(e, column.id)}
            style={{
              background: isDragTarget ? `${caseData.color}12` : "var(--ws-surface)",
              border: `1px solid ${isDragTarget ? caseData.color : "var(--ws-border)"}`,
              borderRadius: 12,
              padding: "12px 12px 8px",
              width: isMobile ? "100%" : 260,
              flexShrink: 0,
              transition: "border-color .15s, background .15s",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontFamily: "inherit",
                  fontWeight: 600,
                  fontSize: ".88rem",
                  color: "var(--ws-text)",
                }}
              >
                {column.title}
              </div>

              <button
                onClick={() => void removeColumn(column.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ws-text3)",
                  cursor: "pointer",
                  fontSize: ".9rem",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 8 }}>
              {columnCards.map((card) => {
                const done = (card.checklist || []).filter((item) => item.done).length;
                const total = (card.checklist || []).length;

                let labelColor = "";
                let labelName = "";

                if (card.label_color) {
                  try {
                    const parsed = JSON.parse(card.label_color);
                    labelColor = parsed.color || "";
                    labelName = parsed.name || "";
                  } catch {
                    labelColor = card.label_color;
                  }
                }

                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, card.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => setOpenCard(card)}
                    style={{
                      background: "var(--ws-surface2)",
                      border: "1px solid var(--ws-border)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      cursor: "grab",
                      transition: "border-color .15s",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = caseData.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--ws-border)";
                    }}
                  >
                    {labelColor && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          background: labelColor,
                          borderRadius: 4,
                          padding: labelName ? "2px 8px" : "3px 20px",
                          marginBottom: 6,
                          fontSize: ".62rem",
                          fontWeight: 700,
                          color: "#fff",
                          textShadow: "0 1px 2px #00000040",
                          maxWidth: "100%",
                          overflow: "hidden",
                        }}
                      >
                        {labelName || ""}
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: ".83rem",
                        color: "var(--ws-text)",
                        lineHeight: 1.5,
                      }}
                    >
                      {card.title}
                    </div>

                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {card.due_date && (
                        <span
                          style={{
                            fontSize: ".65rem",
                            fontFamily: "DM Mono",
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "var(--ws-surface3)",
                            color: "#a0a4cc",
                          }}
                        >
                          📅{" "}
                          {new Date(`${card.due_date}T12:00:00`).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      )}

                      {total > 0 && (
                        <span
                          style={{
                            fontSize: ".65rem",
                            fontFamily: "DM Mono",
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: done === total ? "#00e67622" : "var(--ws-surface3)",
                            color: done === total ? "#00e676" : "#a0a4cc",
                          }}
                        >
                          ✓ {done}/{total}
                        </span>
                      )}

                      {(card.comments || []).length > 0 && (
                        <span
                          style={{
                            fontSize: ".65rem",
                            fontFamily: "DM Mono",
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "var(--ws-surface3)",
                            color: "#a0a4cc",
                          }}
                        >
                          💬 {(card.comments || []).length}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {addingCard === column.id ? (
              <div style={{ marginTop: 8 }}>
                <textarea
                  value={newCardText}
                  onChange={(e) => setNewCardText(e.target.value)}
                  placeholder="Escreva o cartão..."
                  autoFocus
                  style={{
                    width: "100%",
                    background: "var(--ws-surface2)",
                    border: `1px solid ${caseData.color}`,
                    borderRadius: 8,
                    color: "var(--ws-text)",
                    padding: "8px 10px",
                    fontSize: ".82rem",
                    resize: "vertical",
                    minHeight: 72,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void addCard(column.id);
                    }
                  }}
                />

                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button
                    onClick={() => void addCard(column.id)}
                    style={{
                      background: caseData.color,
                      border: "none",
                      borderRadius: 6,
                      color: "#fff",
                      padding: "5px 12px",
                      fontSize: ".78rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Adicionar
                  </button>

                  <button
                    onClick={() => {
                      setAddingCard(null);
                      setNewCardText("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--ws-text3)",
                      cursor: "pointer",
                      fontSize: ".78rem",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAddingCard(column.id);
                  setNewCardText("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ws-text3)",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  fontSize: ".78rem",
                  padding: "8px 4px",
                  marginTop: 4,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--ws-text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--ws-text3)";
                }}
              >
                + Adicionar um cartão
              </button>
            )}
          </div>
        );
      })}

      <div style={{ width: 240, flexShrink: 0 }}>
        {addingCol ? (
          <div
            style={{
              background: "var(--ws-surface)",
              border: "1px solid var(--ws-border)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <input
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
              placeholder="Título da lista"
              autoFocus
              className="ws-input"
              style={{ marginBottom: 8 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void addColumn();
                }
              }}
            />

            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => void addColumn()}
                style={{
                  background: caseData.color,
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  padding: "5px 12px",
                  fontSize: ".78rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Adicionar lista
              </button>

              <button
                onClick={() => {
                  setAddingCol(false);
                  setNewColTitle("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ws-text3)",
                  cursor: "pointer",
                  fontSize: ".78rem",
                }}
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCol(true)}
            style={{
              background: "var(--ws-surface)",
              border: "1px dashed var(--ws-border2)",
              borderRadius: 12,
              padding: "12px 16px",
              width: "100%",
              color: "var(--ws-text3)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: ".82rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = caseData.color;
              e.currentTarget.style.color = caseData.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--ws-border2)";
              e.currentTarget.style.color = "var(--ws-text3)";
            }}
          >
            + Adicionar outra lista
          </button>
        )}
      </div>

      {openCard && (
        <NoteCardModal
          card={openCard}
          caseData={caseData}
          onClose={() => setOpenCard(null)}
          onUpdate={updateCard}
          onDelete={removeCard}
          profile={profile}
        />
      )}
    </div>
  );
}
