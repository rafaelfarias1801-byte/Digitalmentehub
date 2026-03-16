import { useState } from "react";
import type { Profile } from "../../../../lib/supabaseClient";
import RichEditor from "../RichEditor";
import { DEFAULT_LABELS } from "../constants";
import { closeBtnStyle, labelStyle, overlayStyle } from "../styles";
import type { Case, NoteCard, NoteLabel } from "../types";
import { useIsMobile } from "../../../hooks/useIsMobile";

interface NoteCardModalProps {
  card: NoteCard;
  caseData: Case;
  onClose: () => void;
  onUpdate: (card: NoteCard) => void;
  onDelete: (id: string) => void;
  profile: Profile;
}

interface LabelPickerProps {
  value: string;
  onChange: (value: string) => void;
  accentColor: string;
}

function LabelPicker({ value, onChange, accentColor }: LabelPickerProps) {
  const [labels, setLabels] = useState<NoteLabel[]>(() => {
    try {
      const stored = localStorage.getItem("dig_labels");
      if (stored) return JSON.parse(stored) as NoteLabel[];
    } catch {
      // ignore
    }

    return DEFAULT_LABELS.map((label) => ({ ...label }));
  });

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  let selectedColor = "";

  if (value) {
    try {
      selectedColor = JSON.parse(value).color || "";
    } catch {
      selectedColor = value;
    }
  }

  function saveLabel(index: number, name: string) {
    const next = labels.map((label, i) =>
      i === index ? { ...label, name } : label
    );

    setLabels(next);

    try {
      localStorage.setItem("dig_labels", JSON.stringify(next));
    } catch {
      // ignore
    }

    setEditIndex(null);

    if (selectedColor === next[index].color) {
      onChange(JSON.stringify({ color: next[index].color, name }));
    }
  }

  function selectLabel(label: NoteLabel) {
    const encoded = JSON.stringify({
      color: label.color,
      name: label.name,
    });

    if (selectedColor === label.color) {
      onChange("");
    } else {
      onChange(encoded);
    }
  }

  return (
    <div>
      <div style={{ ...labelStyle, marginBottom: 8 }}>Etiqueta</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {labels.map((label, index) => (
          <div
            key={`${label.color}-${index}`}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {editIndex === index ? (
              <>
                <div
                  style={{
                    width: 36,
                    height: 28,
                    borderRadius: 4,
                    background: label.color,
                    flexShrink: 0,
                    border:
                      selectedColor === label.color
                        ? "3px solid white"
                        : "3px solid transparent",
                    boxShadow:
                      selectedColor === label.color
                        ? `0 0 0 2px ${label.color}`
                        : "none",
                    cursor: "pointer",
                  }}
                  onClick={() => selectLabel(label)}
                />

                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveLabel(index, editName);
                    if (e.key === "Escape") setEditIndex(null);
                  }}
                  placeholder="Nome da etiqueta"
                  style={{
                    flex: 1,
                    background: "var(--ws-surface)",
                    border: `1px solid ${accentColor}`,
                    borderRadius: 5,
                    color: "var(--ws-text)",
                    padding: "4px 8px",
                    fontSize: ".78rem",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />

                <button
                  onClick={() => saveLabel(index, editName)}
                  style={{
                    background: accentColor,
                    border: "none",
                    borderRadius: 5,
                    color: "#fff",
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: ".72rem",
                    fontFamily: "inherit",
                  }}
                >
                  ✓
                </button>
              </>
            ) : (
              <>
                <div
                  onClick={() => selectLabel(label)}
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 4,
                    background: label.color,
                    cursor: "pointer",
                    border:
                      selectedColor === label.color
                        ? "3px solid white"
                        : "3px solid transparent",
                    boxShadow:
                      selectedColor === label.color
                        ? `0 0 0 2px ${label.color}`
                        : "none",
                    transition: "all .15s",
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: label.name ? 8 : 0,
                    justifyContent: label.name ? "flex-start" : "center",
                  }}
                >
                  {label.name && (
                    <span
                      style={{
                        fontSize: ".72rem",
                        fontWeight: 700,
                        color: "#fff",
                        textShadow: "0 1px 2px #00000050",
                      }}
                    >
                      {label.name}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setEditIndex(index);
                    setEditName(label.name);
                  }}
                  style={{
                    background: "none",
                    border: "1px solid var(--ws-border2)",
                    borderRadius: 4,
                    color: "var(--ws-text3)",
                    cursor: "pointer",
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: ".7rem",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--ws-text)";
                    e.currentTarget.style.borderColor = "var(--ws-text2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--ws-text3)";
                    e.currentTarget.style.borderColor = "var(--ws-border2)";
                  }}
                >
                  ✎
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NoteCardModal({
  card,
  caseData,
  onClose,
  onUpdate,
  onDelete,
  profile,
}: NoteCardModalProps) {
  const [currentCard, setCurrentCard] = useState<NoteCard>(card);
  const [editTitle, setEditTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(card.title);
  const [editDesc, setEditDesc] = useState(false);
  const [newCheck, setNewCheck] = useState("");
  const [newComment, setNewComment] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const isMobile = useIsMobile();

  function save(updates: Partial<NoteCard>) {
    const merged = { ...currentCard, ...updates };
    setCurrentCard(merged);
    onUpdate(merged);
  }

  function addCheckItem() {
    if (!newCheck.trim()) return;

    save({
      checklist: [
        ...(currentCard.checklist || []),
        {
          id: Date.now().toString(),
          text: newCheck.trim(),
          done: false,
        },
      ],
    });

    setNewCheck("");
  }

  function toggleCheck(id: string) {
    save({
      checklist: (currentCard.checklist || []).map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      ),
    });
  }

  function removeCheck(id: string) {
    save({
      checklist: (currentCard.checklist || []).filter(
        (item) => item.id !== id
      ),
    });
  }

  function addComment() {
    if (!newComment.trim()) return;

    save({
      comments: [
        ...(currentCard.comments || []),
        {
          id: Date.now().toString(),
          author: profile.name || "Você",
          text: newComment.trim(),
          created_at: new Date().toISOString(),
        },
      ],
    });

    setNewComment("");
  }

  let labelColor = "";
  let labelName = "";

  if (currentCard.label_color) {
    try {
      const parsed = JSON.parse(currentCard.label_color);
      labelColor = parsed.color || "";
      labelName = parsed.name || "";
    } catch {
      labelColor = currentCard.label_color;
    }
  }

  const done = (currentCard.checklist || []).filter((item) => item.done).length;
  const total = (currentCard.checklist || []).length;

  return (
    <div
      style={overlayStyle}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--ws-surface)",
          borderRadius: isMobile ? "16px 16px 0 0" : 16,
          width: isMobile ? "100%" : "min(780px,95vw)",
          maxHeight: isMobile ? "94dvh" : "90vh",
          overflowY: "auto",
          border: "1px solid var(--ws-border2)",
          boxShadow: "0 30px 80px #00000070",
          display: "flex",
          flexDirection: "column",
          ...(isMobile ? { position: "fixed", bottom: 0, left: 0, right: 0, top: "auto" } : {}),
        }}
      >
        {/* Mobile: tabs CONTEÚDO / AÇÕES */}
        {isMobile && (
          <div style={{ display: "flex", borderBottom: "1px solid var(--ws-border)", background: "var(--ws-surface2)", flexShrink: 0 }}>
            <button onClick={() => setSidebarVisible(false)} style={{
              flex: 1, padding: "11px 0", background: "none", border: "none",
              color: !sidebarVisible ? caseData.color : "var(--ws-text3)",
              fontFamily: "DM Mono", fontSize: ".65rem", letterSpacing: "1px",
              borderBottom: !sidebarVisible ? `2px solid ${caseData.color}` : "2px solid transparent",
              cursor: "pointer",
            }}>CONTEÚDO</button>
            <button onClick={() => setSidebarVisible(true)} style={{
              flex: 1, padding: "11px 0", background: "none", border: "none",
              color: sidebarVisible ? caseData.color : "var(--ws-text3)",
              fontFamily: "DM Mono", fontSize: ".65rem", letterSpacing: "1px",
              borderBottom: sidebarVisible ? `2px solid ${caseData.color}` : "2px solid transparent",
              cursor: "pointer",
            }}>AÇÕES</button>
          </div>
        )}

        <div style={{
          display: isMobile ? "block" : "grid",
          gridTemplateColumns: isMobile ? undefined : "1fr 260px",
          flex: 1, minHeight: 0,
        }}>
        <div style={{ padding: isMobile ? "16px" : "28px 24px", borderRight: isMobile ? "none" : "1px solid var(--ws-border)", display: isMobile && sidebarVisible ? "none" : "block", overflowY: isMobile ? "auto" : undefined }}>
          {labelColor && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: labelColor,
                borderRadius: 4,
                padding: labelName ? "3px 10px" : "4px 24px",
                marginBottom: 12,
                fontSize: ".7rem",
                fontWeight: 700,
                color: "#fff",
                textShadow: "0 1px 2px #00000040",
              }}
            >
              {labelName || ""}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              {editTitle ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="ws-input"
                    value={titleValue}
                    autoFocus
                    onChange={(e) => setTitleValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        save({ title: titleValue });
                        setEditTitle(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      fontFamily: "inherit",
                      fontWeight: 600,
                      fontSize: "1.05rem",
                    }}
                  />

                  <button
                    onClick={() => {
                      save({ title: titleValue });
                      setEditTitle(false);
                    }}
                    style={{
                      background: caseData.color,
                      border: "none",
                      borderRadius: 8,
                      color: "#fff",
                      padding: "0 12px",
                      cursor: "pointer",
                    }}
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setEditTitle(true);
                    setTitleValue(currentCard.title);
                  }}
                  style={{
                    fontFamily: "inherit",
                    fontWeight: 600,
                    fontSize: "1.05rem",
                    color: "var(--ws-text)",
                    cursor: "pointer",
                    padding: "4px 6px",
                    borderRadius: 6,
                    border: "1px solid transparent",
                    transition: "border-color .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--ws-border2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  {currentCard.title}
                </div>
              )}
            </div>

            <button onClick={onClose} style={closeBtnStyle}>
              ×
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Descrição</div>

            {editDesc ? (
              <div>
                <RichEditor
                  value={currentCard.description || ""}
                  onChange={(value) =>
                    setCurrentCard((prev) => ({
                      ...prev,
                      description: value,
                    }))
                  }
                  placeholder="Adicione uma descrição detalhada..."
                />

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      save({ description: currentCard.description });
                      setEditDesc(false);
                    }}
                    style={{
                      background: caseData.color,
                      border: "none",
                      borderRadius: 6,
                      color: "#fff",
                      padding: "6px 14px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: ".8rem",
                    }}
                  >
                    Salvar
                  </button>

                  <button
                    onClick={() => setEditDesc(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--ws-text3)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: ".8rem",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditDesc(true)}
                style={{
                  minHeight: 60,
                  padding: "10px 12px",
                  background: "var(--ws-surface2)",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: "1px solid transparent",
                  transition: "border-color .15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--ws-border2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                {currentCard.description ? (
                  <div
                    className="ws-richtext"
                    style={{
                      fontSize: ".84rem",
                      color: "var(--ws-text)",
                      lineHeight: 1.7,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: currentCard.description,
                    }}
                  />
                ) : (
                  <div style={{ fontSize: ".82rem", color: "var(--ws-text3)" }}>
                    Clique para adicionar uma descrição...
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>
              Checklist {total > 0 && `(${done}/${total})`}
            </div>

            {total > 0 && (
              <div
                style={{
                  height: 4,
                  background: "var(--ws-border)",
                  borderRadius: 2,
                  marginBottom: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    background: caseData.color,
                    width: `${(done / total) * 100}%`,
                    transition: "width .3s",
                  }}
                />
              </div>
            )}

            {(currentCard.checklist || []).map((item) => (
              <div
                key={item.id}
                style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleCheck(item.id)}
                  style={{
                    width: 15,
                    height: 15,
                    cursor: "pointer",
                    accentColor: caseData.color,
                  }}
                />

                <span
                  style={{
                    fontSize: ".84rem",
                    color: "var(--ws-text)",
                    flex: 1,
                    textDecoration: item.done ? "line-through" : "none",
                    opacity: item.done ? 0.5 : 1,
                  }}
                >
                  {item.text}
                </span>

                <button
                  onClick={() => removeCheck(item.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--ws-text3)",
                    cursor: "pointer",
                    fontSize: ".85rem",
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input
                className="ws-input"
                value={newCheck}
                placeholder="Adicionar item..."
                onChange={(e) => setNewCheck(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCheckItem()}
                style={{ flex: 1, padding: "6px 10px", fontSize: ".8rem" }}
              />

              <button
                onClick={addCheckItem}
                style={{
                  background: caseData.color,
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: ".8rem",
                }}
              >
                +
              </button>
            </div>
          </div>

          <div>
            <div style={labelStyle}>Comentários e atividade</div>

            {(currentCard.comments || []).map((comment) => (
              <div
                key={comment.id}
                style={{ display: "flex", gap: 10, marginBottom: 14 }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: caseData.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: ".75rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {comment.author.slice(0, 1).toUpperCase()}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: ".78rem",
                      color: "var(--ws-text2)",
                      marginBottom: 3,
                    }}
                  >
                    <b style={{ color: "var(--ws-text)" }}>{comment.author}</b>{" "}
                    <span
                      style={{
                        color: "var(--ws-text3)",
                        fontFamily: "DM Mono",
                        fontSize: ".65rem",
                      }}
                    >
                      {new Date(comment.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    style={{
                      background: "var(--ws-surface2)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: ".83rem",
                      color: "var(--ws-text)",
                    }}
                  >
                    {comment.text}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: caseData.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: ".75rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {(profile.name || "V").slice(0, 1).toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <textarea
                  className="ws-input"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escrever um comentário..."
                  style={{
                    minHeight: 64,
                    resize: "vertical",
                    fontSize: ".83rem",
                    marginBottom: 6,
                  }}
                />

                <button
                  onClick={addComment}
                  style={{
                    background: caseData.color,
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    padding: "6px 14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: ".8rem",
                  }}
                >
                  Comentar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: isMobile ? "16px" : "28px 18px", display: isMobile && !sidebarVisible ? "none" : "block" }}>
          <div style={labelStyle}>Ações</div>

          <div style={{ marginBottom: 20 }}>
            <LabelPicker
              value={currentCard.label_color || ""}
              onChange={(value) => save({ label_color: value })}
              accentColor={caseData.color}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Data</div>
            <input
              type="date"
              className="ws-input"
              value={currentCard.due_date || ""}
              onChange={(e) => save({ due_date: e.target.value })}
              style={{ fontSize: ".8rem" }}
            />
          </div>

          <button
            onClick={() => onDelete(currentCard.id)}
            style={{
              background: "none",
              border: "1px solid var(--ws-accent)",
              borderRadius: 8,
              color: "var(--ws-accent)",
              cursor: "pointer",
              width: "100%",
              padding: "8px 0",
              fontSize: ".8rem",
              fontFamily: "inherit",
              marginTop: 8,
            }}
          >
            × Excluir cartão
          </button>
        </div>
        </div>{/* fecha grid */}
      </div>
    </div>
  );
}
