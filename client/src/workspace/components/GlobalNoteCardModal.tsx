// client/src/workspace/components/GlobalNoteCardModal.tsx
import { useState } from "react";
import type { Profile } from "../../lib/supabaseClient";
import { supabase } from "../../lib/supabaseClient";
import RichEditor from "./cases/RichEditor";
import { DEFAULT_LABELS } from "./cases/constants";
import { closeBtnStyle, labelStyle, overlayStyle } from "./cases/styles";
import type { NoteCard, NoteLabel, CheckItem, Comment } from "./cases/types";
import { useIsMobile } from "../hooks/useIsMobile";

const ACCENT = "#e91e8c";
const LABELS_KEY = "dig_global_labels";

interface Props { card: NoteCard; onClose: () => void; onUpdate: (card: NoteCard) => void; onDelete: (id: string) => void; profile: Profile; }

function LabelPicker({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const [labels, setLabels] = useState<NoteLabel[]>(() => {
    try { const stored = localStorage.getItem(LABELS_KEY); if (stored) return JSON.parse(stored); } catch {}
    return DEFAULT_LABELS.map(l => ({ ...l }));
  });

  let selectedColor = ""; let selectedName = "";
  if (value) {
    try { const p = JSON.parse(value); selectedColor = p.color || ""; selectedName = p.name || ""; }
    catch { selectedColor = value; }
  }

  function updateLabels(newLabels: NoteLabel[]) {
    setLabels(newLabels);
    try { localStorage.setItem(LABELS_KEY, JSON.stringify(newLabels)); } catch {}
  }

  function selectLabel(label: NoteLabel) {
    if (selectedColor === label.color) onChange("");
    else onChange(JSON.stringify({ color: label.color, name: label.name }));
  }

  function handleNameChange(newName: string) {
    const newLabels = labels.map(l => l.color === selectedColor ? { ...l, name: newName } : l);
    updateLabels(newLabels);
    onChange(JSON.stringify({ color: selectedColor, name: newName }));
  }

  return (
    <div>
      <div style={{ ...labelStyle, marginBottom: 8 }}>Etiqueta</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {labels.map((label, i) => (
          <div key={i} title={label.name || label.color} onClick={() => selectLabel(label)}
            style={{
              width: 24, height: 24, borderRadius: 4, background: label.color, cursor: "pointer", flexShrink: 0,
              border: selectedColor === label.color ? "3px solid white" : "2px solid transparent",
              boxShadow: selectedColor === label.color ? `0 0 0 2px ${label.color}` : "none", transition: "all .15s"
            }} />
        ))}
        <label title="Nova cor" style={{
          width: 24, height: 24, borderRadius: 4, cursor: "pointer", background: "var(--ws-surface2)", border: "1px dashed var(--ws-border2)",
          display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden"
        }}>
          <span style={{ fontSize: ".9rem", color: "var(--ws-text3)" }}>+</span>
          <input type="color" onChange={e => {
            const c = e.target.value;
            if (!labels.find(l => l.color === c)) {
              updateLabels([...labels, { color: c, name: "" }]);
              onChange(JSON.stringify({ color: c, name: "" }));
            }
          }} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
        </label>
        {selectedColor && <button onClick={() => onChange("")} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".7rem", fontFamily: "Poppins" }}>limpar</button>}
      </div>
      {selectedColor && (
        <div style={{ marginTop: 10 }}>
          <input className="ws-input" value={selectedName} onChange={e => handleNameChange(e.target.value)} placeholder="Digite o nome desta etiqueta..." style={{ width: "100%", fontSize: ".8rem", padding: "6px 10px" }} />
        </div>
      )}
    </div>
  );
}

function linkify(html: string): string { return html.replace(/(?<!href=["'])(?<![">])(https?:\/\/[^\s<"']+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#4b6bff;word-break:break-all;">$1</a>'); }

export default function GlobalNoteCardModal({ card, onClose, onUpdate, onDelete, profile }: Props) {
  const [currentCard, setCurrentCard] = useState<NoteCard>(card);
  const [editTitle, setEditTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(card.title);
  const [editDesc, setEditDesc] = useState(false);
  const [newCheck, setNewCheck] = useState("");
  const [newComment, setNewComment] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const isMobile = useIsMobile();

  async function save(updates: Partial<NoteCard>) {
    const merged = { ...currentCard, ...updates };
    setCurrentCard(merged);
    const { data } = await supabase.from("note_cards").update(merged).eq("id", merged.id).select().single();
    if (data) { onUpdate(data); setCurrentCard(data); }
  }

  function toggleCompleted() { void save({ completed: !currentCard.completed }); }
  function addCheckItem() { if (!newCheck.trim()) return; void save({ checklist: [...(currentCard.checklist || []), { id: Date.now().toString(), text: newCheck.trim(), done: false }] }); setNewCheck(""); }
  function toggleCheck(id: string) { void save({ checklist: (currentCard.checklist || []).map(i => i.id === id ? { ...i, done: !i.done } : i) }); }
  function removeCheck(id: string) { void save({ checklist: (currentCard.checklist || []).filter(i => i.id !== id) }); }
  function addComment() { if (!newComment.trim()) return; void save({ comments: [...(currentCard.comments || []), { id: Date.now().toString(), author: profile.name || "Você", text: newComment.trim(), created_at: new Date().toISOString() }] }); setNewComment(""); }
  function removeComment(id: string) { if (!window.confirm("Apagar este comentário?")) return; void save({ comments: (currentCard.comments || []).filter(c => c.id !== id) }); }
  function saveTitle() { if (titleValue.trim()) void save({ title: titleValue.trim() }); setEditTitle(false); }

  const done = (currentCard.checklist || []).filter(i => i.done).length;
  const total = (currentCard.checklist || []).length;

  let labelColor = ""; let labelName = "";
  if (currentCard.label_color) { try { const p = JSON.parse(currentCard.label_color); labelColor = p.color || ""; labelName = p.name || ""; } catch { labelColor = currentCard.label_color; } }

  const titleStyle: React.CSSProperties = { fontFamily: "Poppins, system-ui, sans-serif", fontWeight: 700, fontSize: "1.15rem", color: "var(--ws-text)", lineHeight: 1.3 };

  return (
    <div style={{ ...overlayStyle, ...(isMobile ? { left: 56 } : {}) }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--ws-surface)", borderRadius: isMobile ? "16px 16px 0 0" : 16, width: isMobile ? "100%" : "min(780px, 95vw)",
        maxHeight: isMobile ? "94dvh" : "90vh", overflowY: isMobile ? undefined : "auto", border: "1px solid var(--ws-border2)",
        boxShadow: "0 30px 80px #00000070", display: "flex", flexDirection: "column", ...(isMobile ? { position: "fixed", bottom: 0, left: 56, right: 0, top: "auto" } : {}),
      }}>

        {isMobile && (
          <div style={{ display: "flex", borderBottom: "1px solid var(--ws-border)", background: "var(--ws-surface2)", flexShrink: 0 }}>
            <button onClick={() => setSidebarVisible(false)} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", color: !sidebarVisible ? ACCENT : "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".65rem", letterSpacing: "1px", borderBottom: !sidebarVisible ? `2px solid ${ACCENT}` : "2px solid transparent", cursor: "pointer" }}>CONTEÚDO</button>
            <button onClick={() => setSidebarVisible(true)} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", color: sidebarVisible ? ACCENT : "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".65rem", letterSpacing: "1px", borderBottom: sidebarVisible ? `2px solid ${ACCENT}` : "2px solid transparent", cursor: "pointer" }}>AÇÕES</button>
          </div>
        )}

        <div style={{ display: isMobile ? "block" : "grid", gridTemplateColumns: isMobile ? undefined : "1fr 240px", flex: 1, minHeight: 0 }}>
          <div style={{ padding: isMobile ? "16px" : "28px 24px", borderRight: isMobile ? "none" : "1px solid var(--ws-border)", display: isMobile && sidebarVisible ? "none" : "block", overflowY: isMobile ? "auto" : undefined }}>
            
            {labelColor && <div style={{ display: "inline-flex", alignItems: "center", background: labelColor, borderRadius: 4, padding: labelName ? "2px 10px" : "3px 24px", marginBottom: 12, fontSize: ".65rem", fontWeight: 700, color: "#fff", textShadow: "0 1px 2px #00000040" }}>{labelName}</div>}

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                {editTitle ? (
                  <div>
                    <input value={titleValue} onChange={e => setTitleValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditTitle(false); }} autoFocus style={{ width: "100%", background: "transparent", border: `1px solid ${ACCENT}`, borderRadius: 6, color: "var(--ws-text)", padding: "6px 10px", ...titleStyle, outline: "none", boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button onClick={saveTitle} style={{ background: ACCENT, border: "none", borderRadius: 6, color: "#fff", padding: "4px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem" }}>Salvar</button>
                      <button onClick={() => setEditTitle(false)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".78rem" }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => setEditTitle(true)} style={{ ...titleStyle, cursor: "pointer", textDecoration: currentCard.completed ? 'line-through' : 'none' }}>{currentCard.title}</div>
                )}
              </div>
              <button onClick={onClose} style={closeBtnStyle}>×</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Descrição</div>
              {editDesc ? (
                <div>
                  <RichEditor value={currentCard.description || ""} onChange={v => setCurrentCard(p => ({ ...p, description: v }))} placeholder="Adicione uma descrição..." />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => { void save({ description: currentCard.description }); setEditDesc(false); }} style={{ background: ACCENT, border: "none", borderRadius: 6, color: "#fff", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>Salvar</button>
                    <button onClick={() => setEditDesc(false)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditDesc(true)} style={{ minHeight: 56, padding: "10px 12px", background: "var(--ws-surface2)", borderRadius: 8, cursor: "pointer", border: "1px solid transparent", transition: "border-color .15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ws-border2)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; }}>
                  {currentCard.description ? <div className="ws-richtext" style={{ fontSize: ".84rem", color: "var(--ws-text)", lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: linkify(currentCard.description) }} /> : <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Clique para adicionar descrição...</div>}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Checklist {total > 0 && `(${done}/${total})`}</div>
              {total > 0 && <div style={{ height: 4, background: "var(--ws-border)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}><div style={{ height: "100%", background: ACCENT, width: `${(done / total) * 100}%`, transition: "width .3s" }} /></div>}
              {(currentCard.checklist || []).map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <input type="checkbox" checked={item.done} onChange={() => toggleCheck(item.id)} style={{ width: 15, height: 15, cursor: "pointer", accentColor: ACCENT }} />
                  <span style={{ fontSize: ".84rem", color: "var(--ws-text)", flex: 1, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}>{item.text}</span>
                  <button onClick={() => removeCheck(item.id)} style={{ color: "var(--ws-text3)", background: "none", border: "none", cursor: "pointer" }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                <input className="ws-input" value={newCheck} placeholder="Adicionar item..." onChange={e => setNewCheck(e.target.value)} onKeyDown={e => e.key === "Enter" && addCheckItem()} style={{ flex: 1, padding: "6px 10px", fontSize: ".8rem" }} />
                <button onClick={addCheckItem} style={{ background: ACCENT, color: "#fff", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", fontSize: "1.2rem" }}>+</button>
              </div>
            </div>

            <div>
              <div style={labelStyle}>Comentários</div>
              {(currentCard.comments || []).map(comment => (
                <div key={comment.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, flexShrink: 0 }}>{comment.author.slice(0, 1).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                      <div style={{ fontSize: ".78rem", color: "var(--ws-text2)" }}><b style={{ color: "var(--ws-text)" }}>{comment.author}</b> <span style={{ color: "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".65rem" }}>{new Date(comment.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
                      <button onClick={() => removeComment(comment.id)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "0 4px" }} title="Apagar comentário">×</button>
                    </div>
                    <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "8px 12px", fontSize: ".83rem", color: "var(--ws-text)" }}>{comment.text}</div>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, flexShrink: 0 }}>{(profile.name || "V").slice(0, 1).toUpperCase()}</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <textarea className="ws-input" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escrever um comentário..." style={{ minHeight: 64, resize: "vertical", width: "100%", boxSizing: "border-box" }} />
                  <button onClick={addComment} style={{ alignSelf: "flex-start", background: ACCENT, color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", border: "none" }}>Comentar</button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: isMobile ? "16px" : "28px 18px", display: isMobile && !sidebarVisible ? "none" : "block", overflowY: isMobile ? "auto" : undefined, maxHeight: isMobile ? "calc(94dvh - 44px)" : undefined }}>
            <div style={labelStyle}>Ações</div>
            <button onClick={toggleCompleted} style={{ background: currentCard.completed ? "#00e676" : "var(--ws-surface2)", border: `1px solid ${currentCard.completed ? "#00e676" : "var(--ws-border2)"}`, borderRadius: 8, color: currentCard.completed ? "#fff" : "var(--ws-text)", width: "100%", padding: "10px 0", fontSize: ".8rem", cursor: "pointer", marginBottom: 12, fontWeight: 600 }}>{currentCard.completed ? "✓ Concluído" : "Marcar como concluído"}</button>
            <div style={{ marginBottom: 20 }}><LabelPicker value={currentCard.label_color || ""} onChange={v => void save({ label_color: v })} /></div>
            <div style={{ marginBottom: 20 }}><div style={labelStyle}>Data</div><input type="date" className="ws-input" value={currentCard.due_date || ""} onChange={e => void save({ due_date: e.target.value })} style={{ fontSize: ".8rem", width: "100%", boxSizing: "border-box" }} /></div>
            <button onClick={() => onDelete(currentCard.id)} style={{ background: "none", border: "1px solid var(--ws-accent)", borderRadius: 8, color: "var(--ws-accent)", cursor: "pointer", width: "100%", padding: "8px 0", fontSize: ".8rem", fontFamily: "inherit", marginTop: 8 }}>× Excluir cartão</button>
          </div>

        </div>
      </div>
    </div>
  );
}