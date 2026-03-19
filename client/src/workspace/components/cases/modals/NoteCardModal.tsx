import { useState } from "react";
import type { Profile } from "../../../../lib/supabaseClient";
import RichEditor from "../RichEditor";
import { DEFAULT_LABELS } from "../constants";
import { closeBtnStyle, labelStyle, getOverlayStyle } from "../styles";
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

function LabelPicker({ value, onChange }: LabelPickerProps) {
  const [labels] = useState<NoteLabel[]>(() => {
    try {
      const stored = localStorage.getItem("dig_labels");
      if (stored) return JSON.parse(stored) as NoteLabel[];
    } catch { /* ignore */ }
    return DEFAULT_LABELS.map((label) => ({ ...label }));
  });

  let selectedColor = "";
  if (value) {
    try {
      selectedColor = JSON.parse(value).color || "";
    } catch {
      selectedColor = value;
    }
  }

  function selectLabel(label: NoteLabel) {
    const encoded = JSON.stringify({ color: label.color, name: label.name });
    onChange(selectedColor === label.color ? "" : encoded);
  }

  return (
    <div>
      <div style={{ ...labelStyle, marginBottom: 8 }}>Etiqueta</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {labels.map((label, index) => (
          <div
            key={`${label.color}-${index}`}
            onClick={() => selectLabel(label)}
            style={{
              width: 22, height: 22, borderRadius: 4, background: label.color,
              cursor: "pointer", flexShrink: 0,
              border: selectedColor === label.color ? "3px solid white" : "2px solid transparent",
              boxShadow: selectedColor === label.color ? `0 0 0 2px ${label.color}` : "none",
              transition: "all .15s",
            }}
          />
        ))}
        {selectedColor && (
          <button onClick={() => selectLabel({ color: "", name: "" })} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".7rem" }}>limpar</button>
        )}
      </div>
    </div>
  );
}

function linkify(html: string): string {
  return html.replace(
    /(?<!href=["'])(?<![">])(https?:\/\/[^\s<"']+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#4b6bff;word-break:break-all;">$1</a>'
  );
}

export default function NoteCardModal({ card, caseData, onClose, onUpdate, onDelete, profile }: NoteCardModalProps) {
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
    save({ checklist: [...(currentCard.checklist || []), { id: Date.now().toString(), text: newCheck.trim(), done: false }] });
    setNewCheck("");
  }

  function toggleCheck(id: string) {
    save({ checklist: (currentCard.checklist || []).map((item) => item.id === id ? { ...item, done: !item.done } : item) });
  }

  function removeCheck(id: string) {
    save({ checklist: (currentCard.checklist || []).filter((item) => item.id !== id) });
  }

  function addComment() {
    if (!newComment.trim()) return;
    save({ comments: [...(currentCard.comments || []), { id: Date.now().toString(), author: profile.name || "Você", text: newComment.trim(), created_at: new Date().toISOString() }] });
    setNewComment("");
  }

  let labelColor = ""; let labelName = "";
  if (currentCard.label_color) {
    try {
      const parsed = JSON.parse(currentCard.label_color);
      labelColor = parsed.color || ""; labelName = parsed.name || "";
    } catch { labelColor = currentCard.label_color; }
  }

  const done = (currentCard.checklist || []).filter((item) => item.done).length;
  const total = (currentCard.checklist || []).length;

  return (
    <div style={getOverlayStyle(isMobile)} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--ws-surface)", borderRadius: isMobile ? "16px 16px 0 0" : 16,
        ...(isMobile ? {} : { width: "min(780px,95vw)" }),
        maxHeight: isMobile ? "94dvh" : "90vh", overflowY: "auto",
        border: "1px solid var(--ws-border2)", boxShadow: "0 30px 80px #00000070",
        display: "flex", flexDirection: "column",
        ...(isMobile ? { position: "fixed", bottom: 0, left: 56, right: 0, top: "auto" } : {}),
      }}>
        {isMobile && (
          <div style={{ display: "flex", borderBottom: "1px solid var(--ws-border)", background: "var(--ws-surface2)", flexShrink: 0 }}>
            <button onClick={() => setSidebarVisible(false)} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", color: !sidebarVisible ? caseData.color : "var(--ws-text3)", borderBottom: !sidebarVisible ? `2px solid ${caseData.color}` : "2px solid transparent" }}>CONTEÚDO</button>
            <button onClick={() => setSidebarVisible(true)} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", color: sidebarVisible ? caseData.color : "var(--ws-text3)", borderBottom: sidebarVisible ? `2px solid ${caseData.color}` : "2px solid transparent" }}>AÇÕES</button>
          </div>
        )}

        <div style={{ display: isMobile ? "block" : "grid", gridTemplateColumns: isMobile ? undefined : "1fr 260px", flex: 1, minHeight: 0 }}>
          <div style={{ padding: isMobile ? "16px" : "28px 24px", borderRight: isMobile ? "none" : "1px solid var(--ws-border)", display: isMobile && sidebarVisible ? "none" : "block" }}>
            {labelColor && <div style={{ display: "inline-flex", background: labelColor, borderRadius: 4, padding: labelName ? "3px 10px" : "4px 24px", marginBottom: 12, fontSize: ".7rem", fontWeight: 700, color: "#fff" }}>{labelName}</div>}

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                {editTitle ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <textarea
                      className="ws-input"
                      value={titleValue}
                      autoFocus
                      onFocus={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                      onChange={(e) => { setTitleValue(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save({ title: titleValue }); setEditTitle(false); } }}
                      style={{ flex: 1, fontFamily: "inherit", fontWeight: 600, fontSize: "1.05rem", resize: "none", overflow: "hidden", minHeight: "1.5rem" }}
                    />
                    <button onClick={() => { save({ title: titleValue }); setEditTitle(false); }} style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", padding: "0 12px" }}>✓</button>
                  </div>
                ) : (
                  <div onClick={() => { setEditTitle(true); setTitleValue(currentCard.title); }} style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--ws-text)", cursor: "pointer", padding: "4px 6px", borderRadius: 6, border: "1px solid transparent" }}>{currentCard.title}</div>
                )}
              </div>
              <button onClick={onClose} style={closeBtnStyle}>×</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Descrição</div>
              {editDesc ? (
                <div>
                  <RichEditor value={currentCard.description || ""} onChange={(value) => setCurrentCard((prev) => ({ ...prev, description: value }))} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => { save({ description: currentCard.description }); setEditDesc(false); }} style={{ background: caseData.color, border: "none", borderRadius: 6, color: "#fff", padding: "6px 14px" }}>Salvar</button>
                    <button onClick={() => setEditDesc(false)} style={{ color: "var(--ws-text3)" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditDesc(true)} style={{ minHeight: 60, padding: "10px 12px", background: "var(--ws-surface2)", borderRadius: 8, cursor: "pointer" }}>
                  {currentCard.description ? <div className="ws-richtext" dangerouslySetInnerHTML={{ __html: linkify(currentCard.description) }} /> : <div style={{ color: "var(--ws-text3)" }}>Clique para adicionar descrição...</div>}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Checklist {total > 0 && `(${done}/${total})`}</div>
              {total > 0 && <div style={{ height: 4, background: "var(--ws-border)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}><div style={{ height: "100%", background: caseData.color, width: `${(done / total) * 100}%`, transition: "width .3s" }} /></div>}
              {(currentCard.checklist || []).map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <input type="checkbox" checked={item.done} onChange={() => toggleCheck(item.id)} style={{ accentColor: caseData.color }} />
                  <span style={{ fontSize: ".84rem", textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1, flex: 1 }}>{item.text}</span>
                  <button onClick={() => removeCheck(item.id)} style={{ color: "var(--ws-text3)" }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input className="ws-input" value={newCheck} placeholder="Adicionar item..." onChange={(e) => setNewCheck(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCheckItem()} style={{ flex: 1 }} />
                <button onClick={addCheckItem} style={{ background: caseData.color, color: "#fff", borderRadius: 8, padding: "6px 12px" }}>+</button>
              </div>
            </div>

            <div>
              <div style={labelStyle}>Comentários</div>
              {(currentCard.comments || []).map((comment) => (
                <div key={comment.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: caseData.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>{comment.author.slice(0, 1).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".78rem", marginBottom: 3 }}><b>{comment.author}</b> <span style={{ color: "var(--ws-text3)", fontSize: ".65rem" }}>{new Date(comment.created_at).toLocaleString("pt-BR")}</span></div>
                    <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "8px 12px", fontSize: ".83rem" }}>{comment.text}</div>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: caseData.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>{(profile.name || "V").slice(0, 1).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <textarea className="ws-input" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escrever um comentário..." style={{ minHeight: 64 }} />
                  <button onClick={addComment} style={{ background: caseData.color, color: "#fff", borderRadius: 8, padding: "6px 14px", marginTop: 6 }}>Comentar</button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: isMobile ? "16px" : "28px 18px", display: isMobile && !sidebarVisible ? "none" : "block" }}>
            <div style={labelStyle}>Ações</div>
            <div style={{ marginBottom: 20 }}><LabelPicker value={currentCard.label_color || ""} onChange={(value) => save({ label_color: value })} accentColor={caseData.color} /></div>
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Data</div>
              <input type="date" className="ws-input" value={currentCard.due_date || ""} onChange={(e) => save({ due_date: e.target.value })} />
            </div>
            <button onClick={() => onDelete(currentCard.id)} style={{ border: "1px solid var(--ws-accent)", borderRadius: 8, color: "var(--ws-accent)", width: "100%", padding: "8px 0" }}>× Excluir cartão</button>
          </div>
        </div>
      </div>
    </div>
  );
}