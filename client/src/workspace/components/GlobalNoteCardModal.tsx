// client/src/workspace/components/GlobalNoteCardModal.tsx
import { useState } from "react";
import type { Profile } from "../../lib/supabaseClient";
import { supabase } from "../../lib/supabaseClient";
import RichEditor from "../components/cases/RichEditor";
import { DEFAULT_LABELS } from "../components/cases/constants";
import { closeBtnStyle, labelStyle, overlayStyle } from "../components/cases/styles";
import type { NoteCard, NoteLabel, CheckItem, Comment } from "../components/cases/types";

const ACCENT = "#e91e8c";

interface Props {
  card: NoteCard;
  onClose: () => void;
  onUpdate: (card: NoteCard) => void;
  onDelete: (id: string) => void;
  profile: Profile;
}

// ── LabelPicker (idêntico ao do NoteCardModal) ────────────────────
interface LabelPickerProps {
  value: string;
  onChange: (value: string) => void;
}

function LabelPicker({ value, onChange }: LabelPickerProps) {
  const [labels, setLabels] = useState<NoteLabel[]>(() => {
    try {
      const stored = localStorage.getItem("dig_labels");
      if (stored) return JSON.parse(stored) as NoteLabel[];
    } catch { /* ignore */ }
    return DEFAULT_LABELS.map(l => ({ ...l }));
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  let selectedColor = "";
  if (value) {
    try { selectedColor = JSON.parse(value).color || ""; }
    catch { selectedColor = value; }
  }

  function saveLabel(index: number, name: string) {
    const next = labels.map((l, i) => i === index ? { ...l, name } : l);
    setLabels(next);
    try { localStorage.setItem("dig_labels", JSON.stringify(next)); } catch { /* ignore */ }
    setEditIndex(null);
    if (selectedColor === next[index].color) onChange(JSON.stringify({ color: next[index].color, name }));
  }

  function selectLabel(label: NoteLabel) {
    const encoded = JSON.stringify({ color: label.color, name: label.name });
    onChange(selectedColor === label.color ? "" : encoded);
  }

  return (
    <div>
      <div style={{ ...labelStyle, marginBottom: 8 }}>Etiqueta</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {labels.map((label, index) => (
          <div key={`${label.color}-${index}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {editIndex === index ? (
              <>
                <div onClick={() => selectLabel(label)} style={{
                  width: 36, height: 28, borderRadius: 4, background: label.color, flexShrink: 0, cursor: "pointer",
                  border: selectedColor === label.color ? "3px solid white" : "3px solid transparent",
                  boxShadow: selectedColor === label.color ? `0 0 0 2px ${label.color}` : "none",
                }} />
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveLabel(index, editName); if (e.key === "Escape") setEditIndex(null); }}
                  placeholder="Nome da etiqueta" style={{
                    flex: 1, background: "var(--ws-surface)", border: `1px solid ${ACCENT}`,
                    borderRadius: 5, color: "var(--ws-text)", padding: "4px 8px", fontSize: ".78rem", fontFamily: "inherit", outline: "none",
                  }} />
                <button onClick={() => saveLabel(index, editName)} style={{
                  background: ACCENT, border: "none", borderRadius: 5, color: "#fff",
                  padding: "4px 8px", cursor: "pointer", fontSize: ".72rem", fontFamily: "inherit",
                }}>✓</button>
              </>
            ) : (
              <>
                <div onClick={() => selectLabel(label)} style={{
                  flex: 1, height: 28, borderRadius: 4, background: label.color, cursor: "pointer",
                  border: selectedColor === label.color ? "3px solid white" : "3px solid transparent",
                  boxShadow: selectedColor === label.color ? `0 0 0 2px ${label.color}` : "none",
                  transition: "all .15s", display: "flex", alignItems: "center",
                  paddingLeft: label.name ? 8 : 0, justifyContent: label.name ? "flex-start" : "center",
                }}>
                  {label.name && <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#fff", textShadow: "0 1px 2px #00000050" }}>{label.name}</span>}
                </div>
                <button onClick={() => { setEditIndex(index); setEditName(label.name); }} style={{
                  background: "none", border: "1px solid var(--ws-border2)", borderRadius: 4,
                  color: "var(--ws-text3)", cursor: "pointer", width: 24, height: 24,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", flexShrink: 0,
                }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--ws-text)"; e.currentTarget.style.borderColor = "var(--ws-text2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--ws-text3)"; e.currentTarget.style.borderColor = "var(--ws-border2)"; }}
                >✎</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────
export default function GlobalNoteCardModal({ card, onClose, onUpdate, onDelete, profile }: Props) {
  const [currentCard, setCurrentCard] = useState<NoteCard>(card);
  const [editTitle, setEditTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(card.title);
  const [editDesc, setEditDesc] = useState(false);
  const [newCheck, setNewCheck] = useState("");
  const [newComment, setNewComment] = useState("");

  async function save(updates: Partial<NoteCard>) {
    const merged = { ...currentCard, ...updates };
    setCurrentCard(merged);
    const { data } = await supabase.from("note_cards").update(merged).eq("id", merged.id).select().single();
    if (data) { onUpdate(data); setCurrentCard(data); }
  }

  function addCheckItem() {
    if (!newCheck.trim()) return;
    const item: CheckItem = { id: Date.now().toString(), text: newCheck.trim(), done: false };
    void save({ checklist: [...(currentCard.checklist || []), item] });
    setNewCheck("");
  }
  function toggleCheck(id: string) {
    void save({ checklist: (currentCard.checklist || []).map(i => i.id === id ? { ...i, done: !i.done } : i) });
  }
  function removeCheck(id: string) {
    void save({ checklist: (currentCard.checklist || []).filter(i => i.id !== id) });
  }

  function addComment() {
    if (!newComment.trim()) return;
    const c: Comment = { id: Date.now().toString(), author: profile.name || "Você", text: newComment.trim(), created_at: new Date().toISOString() };
    void save({ comments: [...(currentCard.comments || []), c] });
    setNewComment("");
  }

  function saveTitle() {
    if (titleValue.trim()) void save({ title: titleValue.trim() });
    setEditTitle(false);
  }

  const done = (currentCard.checklist || []).filter(i => i.done).length;
  const total = (currentCard.checklist || []).length;

  let labelColor = "";
  let labelName = "";
  if (currentCard.label_color) {
    try { const p = JSON.parse(currentCard.label_color); labelColor = p.color || ""; labelName = p.name || ""; }
    catch { labelColor = currentCard.label_color; }
  }

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--ws-surface)", borderRadius: 16,
        width: "min(780px, 95vw)", maxHeight: "90vh", overflowY: "auto",
        border: "1px solid var(--ws-border2)", boxShadow: "0 30px 80px #00000070",
        display: "grid", gridTemplateColumns: "1fr 240px",
      }}>
        {/* Coluna principal */}
        <div style={{ padding: "28px 24px", borderRight: "1px solid var(--ws-border)" }}>
          {/* Etiqueta */}
          {labelColor && (
            <div style={{
              display: "inline-flex", alignItems: "center", background: labelColor,
              borderRadius: 4, padding: labelName ? "2px 10px" : "3px 24px",
              marginBottom: 12, fontSize: ".65rem", fontWeight: 700, color: "#fff",
              textShadow: "0 1px 2px #00000040",
            }}>{labelName}</div>
          )}

          {/* Título */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              {editTitle ? (
                <div>
                  <input value={titleValue} onChange={e => setTitleValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditTitle(false); }}
                    autoFocus style={{
                      width: "100%", background: "transparent", border: `1px solid ${ACCENT}`,
                      borderRadius: 6, color: "var(--ws-text)", padding: "6px 10px",
                      fontSize: "1.1rem", fontWeight: 700, fontFamily: "Syne", outline: "none", boxSizing: "border-box",
                    }} />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={saveTitle} style={{ background: ACCENT, border: "none", borderRadius: 6, color: "#fff", padding: "4px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem" }}>Salvar</button>
                    <button onClick={() => setEditTitle(false)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".78rem" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditTitle(true)} style={{
                  fontFamily: "Syne", fontWeight: 800, fontSize: "1.1rem",
                  color: "var(--ws-text)", cursor: "pointer", lineHeight: 1.3,
                }}>{currentCard.title}</div>
              )}
            </div>
            <button onClick={onClose} style={closeBtnStyle}>×</button>
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Descrição</div>
            {editDesc ? (
              <div>
                <RichEditor value={currentCard.description || ""} onChange={v => setCurrentCard(p => ({ ...p, description: v }))} placeholder="Adicione uma descrição..." />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => { void save({ description: currentCard.description }); setEditDesc(false); }}
                    style={{ background: ACCENT, border: "none", borderRadius: 6, color: "#fff", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>Salvar</button>
                  <button onClick={() => setEditDesc(false)}
                    style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditDesc(true)} style={{
                minHeight: 56, padding: "10px 12px", background: "var(--ws-surface2)", borderRadius: 8,
                cursor: "pointer", border: "1px solid transparent", transition: "border-color .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ws-border2)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; }}
              >
                {currentCard.description
                  ? <div className="ws-richtext" style={{ fontSize: ".84rem", color: "var(--ws-text)", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: currentCard.description }} />
                  : <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Clique para adicionar descrição...</div>
                }
              </div>
            )}
          </div>

          {/* Checklist */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={labelStyle}>Checklist {total > 0 && <span style={{ color: "var(--ws-text3)" }}>({done}/{total})</span>}</div>
            </div>
            {total > 0 && (
              <div style={{ height: 4, background: "var(--ws-border)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: ACCENT, width: `${(done / total) * 100}%`, transition: "width .3s" }} />
              </div>
            )}
            {(currentCard.checklist || []).map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <input type="checkbox" checked={item.done} onChange={() => toggleCheck(item.id)}
                  style={{ width: 15, height: 15, cursor: "pointer", accentColor: ACCENT }} />
                <span style={{ fontSize: ".84rem", color: "var(--ws-text)", flex: 1, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}>
                  {item.text}
                </span>
                <button onClick={() => removeCheck(item.id)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".85rem" }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input className="ws-input" value={newCheck} placeholder="Adicionar item..."
                onChange={e => setNewCheck(e.target.value)} onKeyDown={e => e.key === "Enter" && addCheckItem()}
                style={{ flex: 1, padding: "6px 10px", fontSize: ".8rem" }} />
              <button onClick={addCheckItem} style={{ background: ACCENT, border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>+</button>
            </div>
          </div>

          {/* Comentários */}
          <div>
            <div style={labelStyle}>Comentários</div>
            {(currentCard.comments || []).map(comment => (
              <div key={comment.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: ".75rem", fontWeight: 700, flexShrink: 0 }}>
                  {comment.author.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: ".78rem", color: "var(--ws-text2)", marginBottom: 3 }}>
                    <b style={{ color: "var(--ws-text)" }}>{comment.author}</b>{" "}
                    <span style={{ color: "var(--ws-text3)", fontFamily: "DM Mono", fontSize: ".65rem" }}>
                      {new Date(comment.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "8px 12px", fontSize: ".83rem", color: "var(--ws-text)" }}>{comment.text}</div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: ".75rem", fontWeight: 700, flexShrink: 0 }}>
                {(profile.name || "V").slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <textarea className="ws-input" value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder="Escrever um comentário..." style={{ minHeight: 64, resize: "vertical", fontSize: ".83rem", marginBottom: 6 }} />
                <button onClick={addComment} style={{ background: ACCENT, border: "none", borderRadius: 8, color: "#fff", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>Comentar</button>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna lateral */}
        <div style={{ padding: "28px 18px" }}>
          <div style={labelStyle}>Ações</div>
          <div style={{ marginBottom: 20 }}>
            <LabelPicker value={currentCard.label_color || ""} onChange={v => void save({ label_color: v })} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Data</div>
            <input type="date" className="ws-input" value={currentCard.due_date || ""}
              onChange={e => void save({ due_date: e.target.value })} style={{ fontSize: ".8rem" }} />
          </div>
          <button onClick={() => onDelete(currentCard.id)} style={{
            background: "none", border: "1px solid var(--ws-accent)", borderRadius: 8,
            color: "var(--ws-accent)", cursor: "pointer", width: "100%",
            padding: "8px 0", fontSize: ".8rem", fontFamily: "inherit", marginTop: 8,
          }}>× Excluir cartão</button>
        </div>
      </div>
    </div>
  );
}
