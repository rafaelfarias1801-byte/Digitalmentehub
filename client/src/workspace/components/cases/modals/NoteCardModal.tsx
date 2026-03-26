// client/src/workspace/components/cases/modals/NoteCardModal.tsx
import { useState } from "react";
import type { Profile } from "../../../../lib/supabaseClient";
import { supabase } from "../../../../lib/supabaseClient";
import RichEditor from "../RichEditor";
import { DEFAULT_LABELS } from "../constants";
import { closeBtnStyle, labelStyle, getOverlayStyle } from "../styles";
import type { Case, NoteCard, NoteLabel } from "../types";
import { useIsMobile } from "../../../hooks/useIsMobile";

interface NoteCardModalProps { card: NoteCard; caseData: Case; onClose: () => void; onUpdate: (card: NoteCard) => void; onDelete: (id: string) => void; profile: Profile; }

function LabelPicker({ value, onChange, accentColor }: { value: string, onChange: (v: string) => void, accentColor: string }) {
  const [labels, setLabels] = useState<NoteLabel[]>(() => {
    try { const stored = localStorage.getItem("dig_labels"); if (stored) return JSON.parse(stored); } catch {}
    return DEFAULT_LABELS.map(l => ({ ...l }));
  });

  const [isAdding, setIsAdding] = useState(false);
  const [tempColor, setTempColor] = useState("#E91E8C");

  let selectedColor = ""; let selectedName = "";
  if (value) {
    try { const p = JSON.parse(value); selectedColor = p.color || ""; selectedName = p.name || ""; }
    catch { selectedColor = value; }
  }

  function updateLabels(newLabels: NoteLabel[]) {
    setLabels(newLabels);
    try { localStorage.setItem("dig_labels", JSON.stringify(newLabels)); } catch {}
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

  function confirmNewColor() {
    if (!labels.find(l => l.color === tempColor)) {
      const newLabels = [...labels, { color: tempColor, name: "" }];
      updateLabels(newLabels);
      onChange(JSON.stringify({ color: tempColor, name: "" }));
    }
    setIsAdding(false);
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
        
        {/* INTERFACE DE CONFIRMAÇÃO DE COR */}
        {isAdding ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--ws-surface2)", padding: "2px", borderRadius: 4, border: "1px solid var(--ws-border2)" }}>
            <input type="color" value={tempColor} onChange={e => setTempColor(e.target.value)} style={{ width: 22, height: 22, padding: 0, border: "none", cursor: "pointer", background: "none" }} />
            <button onClick={confirmNewColor} title="Salvar cor" style={{ background: "var(--ws-text)", color: "var(--ws-surface)", border: "none", borderRadius: 3, width: 20, height: 20, cursor: "pointer", fontWeight: "bold", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</button>
            <button onClick={() => setIsAdding(false)} title="Cancelar" style={{ background: "transparent", color: "var(--ws-text3)", border: "none", width: 20, height: 20, cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        ) : (
          <button title="Nova cor" onClick={() => setIsAdding(true)} style={{ width: 24, height: 24, borderRadius: 4, cursor: "pointer", background: "var(--ws-surface2)", border: "1px dashed var(--ws-border2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--ws-text3)", fontSize: "1rem", padding: 0 }}>+</button>
        )}

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

function linkify(html: string): string {
  return html.replace(/(?<!href=["'])(?<![">])(https?:\/\/[^\s<"']+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#4b6bff;word-break:break-all;">$1</a>');
}

export default function NoteCardModal({ card, caseData, onClose, onUpdate, onDelete, profile }: NoteCardModalProps) {
  const [currentCard, setCurrentCard] = useState<NoteCard>(card);
  const [editTitle, setEditTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(card.title);
  const [editDesc, setEditDesc] = useState(false);
  const [newCheck, setNewCheck] = useState("");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const isMobile = useIsMobile();
  const isClient = profile.role === "cliente";
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useState<HTMLInputElement | null>(null);
  const attachFileRef = { current: null as HTMLInputElement | null };

  async function save(updates: Partial<NoteCard>) {
    const merged = { ...currentCard, ...updates };
    setCurrentCard(merged);
    const { data } = await supabase.from("note_cards").update(merged).eq("id", merged.id).select().single();
    if (data) { onUpdate(data); setCurrentCard(data); }
  }

  async function handleDelete() {
    if (!window.confirm("Deseja excluir este cartão definitivamente?")) return;
    await supabase.from("note_cards").delete().eq("id", currentCard.id);
    onDelete(currentCard.id);
    onClose();
  }

  function toggleCompleted() { void save({ completed: !currentCard.completed }); }
  function addCheckItem() { if (!newCheck.trim()) return; void save({ checklist: [...(currentCard.checklist || []), { id: Date.now().toString(), text: newCheck.trim(), done: false }] }); setNewCheck(""); }
  function toggleCheck(id: string) { void save({ checklist: (currentCard.checklist || []).map(i => i.id === id ? { ...i, done: !i.done } : i) }); }
  function removeCheck(id: string) { void save({ checklist: (currentCard.checklist || []).filter(i => i.id !== id) }); }
  function addComment() { if (!newComment.trim()) return; void save({ comments: [...(currentCard.comments || []), { id: Date.now().toString(), author: profile.name || "Você", text: newComment.trim(), created_at: new Date().toISOString() }] }); setNewComment(""); }
  function removeComment(id: string) { if (!window.confirm("Apagar este comentário?")) return; void save({ comments: (currentCard.comments || []).filter(c => c.id !== id) }); }
  function startEditComment(comment: { id: string; text: string }) { setEditingCommentId(comment.id); setEditingCommentText(comment.text); }
  function saveEditComment(id: string) {
    if (!editingCommentText.trim()) return;
    void save({ comments: (currentCard.comments || []).map(c => c.id === id ? { ...c, text: editingCommentText.trim(), edited_at: new Date().toISOString() } : c) });
    setEditingCommentId(null); setEditingCommentText("");
  }
  function isOwnComment(author: string) { return (author || "").trim() === (profile.name || "").trim(); }

  async function uploadAttachment(files: FileList) {
    setUploading(true);
    const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";
    const uploaded: { id: string; name: string; url: string; type: string; cover: boolean }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Enviando ${i + 1}/${files.length}...`);
      const ext = file.name.split(".").pop() ?? "bin";
      const key = `notes/${caseData.id}/${card.id}/${Date.now()}_${i}.${ext}`;

      const { data: urlData } = await supabase.functions.invoke("get-r2-upload-url", {
        body: { filename: key, contentType: file.type },
      });
      if (!urlData?.signedUrl) continue;

      await fetch(urlData.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

      const existingAttachments = currentCard.attachments || [];
      const isCover = existingAttachments.length === 0 && i === 0;

      uploaded.push({
        id: Date.now().toString() + i,
        name: file.name,
        url: `${R2_PUBLIC_URL}/${key}`,
        type: file.type,
        cover: isCover,
      });
    }

    if (uploaded.length > 0) {
      const newAttachments = [...(currentCard.attachments || []), ...uploaded];
      await save({ attachments: newAttachments });
    }

    setUploading(false);
    setUploadProgress("");
  }

  async function removeAttachment(id: string) {
    if (!window.confirm("Remover este anexo?")) return;
    const newAttachments = (currentCard.attachments || []).filter((a: any) => a.id !== id);
    await save({ attachments: newAttachments });
  }

  async function setCover(id: string) {
    const newAttachments = (currentCard.attachments || []).map((a: any) => ({ ...a, cover: a.id === id }));
    await save({ attachments: newAttachments });
  }

  function isImage(url: string) {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  }

  let labelColor = ""; let labelName = "";
  if (currentCard.label_color) { try { const p = JSON.parse(currentCard.label_color); labelColor = p.color || ""; labelName = p.name || ""; } catch { labelColor = currentCard.label_color; } }

  const done = (currentCard.checklist || []).filter(i => i.done).length;
  const total = (currentCard.checklist || []).length;

  return (
    <div style={{ ...getOverlayStyle(isMobile), left: 0 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
          background: "var(--ws-surface)", borderRadius: isMobile ? 0 : 16, ...(isMobile ? {} : { width: "min(780px,95vw)" }),
          maxHeight: isMobile ? "100dvh" : "90vh", overflowY: "auto", border: "1px solid var(--ws-border2)", boxShadow: "0 30px 80px #00000070",
          display: "flex", flexDirection: "column", color: "var(--ws-text)",
          ...(isMobile ? { position: "fixed", bottom: 0, left: 0, right: 0, top: 0 } : {}),
        }}>
        {isMobile && !isClient && (
          <div style={{ display: "flex", borderBottom: "1px solid var(--ws-border)", background: "var(--ws-surface2)", flexShrink: 0 }}>
            <button onClick={() => setSidebarVisible(false)} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", color: !sidebarVisible ? caseData.color : "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".65rem", letterSpacing: "1px", borderBottom: !sidebarVisible ? `2px solid ${caseData.color}` : "2px solid transparent", cursor: "pointer" }}>CONTEÚDO</button>
            <button onClick={() => setSidebarVisible(true)} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", color: sidebarVisible ? caseData.color : "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".65rem", letterSpacing: "1px", borderBottom: sidebarVisible ? `2px solid ${caseData.color}` : "2px solid transparent", cursor: "pointer" }}>AÇÕES</button>
          </div>
        )}

        <div style={{ display: isMobile ? "block" : "grid", gridTemplateColumns: isMobile ? undefined : "1fr 260px", flex: 1, minHeight: 0 }}>
        <div style={{ padding: isMobile ? "16px" : "28px 24px", borderRight: isMobile ? "none" : "1px solid var(--ws-border)", display: isMobile && sidebarVisible ? "none" : "block", overflowY: isMobile ? "auto" : undefined }}>
          {labelColor && <div style={{ display: "inline-flex", alignItems: "center", background: labelColor, borderRadius: 4, padding: labelName ? "3px 10px" : "4px 24px", marginBottom: 12, fontSize: ".7rem", fontWeight: 700, color: "#fff" }}>{labelName || ""}</div>}

          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              {editTitle ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="ws-input" value={titleValue} autoFocus onChange={(e) => setTitleValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { save({ title: titleValue }); setEditTitle(false); } }} style={{ flex: 1, fontFamily: "inherit", fontWeight: 600, fontSize: "1.05rem" }} />
                  <button onClick={() => { save({ title: titleValue }); setEditTitle(false); }} style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", padding: "0 12px", cursor: "pointer" }}>✓</button>
                </div>
              ) : (
                <div onClick={() => { if (!isClient) { setEditTitle(true); setTitleValue(currentCard.title); } }} style={{ fontFamily: "inherit", fontWeight: 600, fontSize: "1.05rem", color: "var(--ws-text)", cursor: isClient ? "default" : "pointer", padding: "4px 6px", borderRadius: 6, border: "1px solid transparent", transition: "border-color .15s" }} onMouseEnter={(e) => { if (!isClient) e.currentTarget.style.borderColor = "var(--ws-border2)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}>
                  {currentCard.title}
                </div>
              )}
            </div>
            <button onClick={onClose} style={closeBtnStyle}>×</button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Descrição</div>

            {editDesc ? (
              <div>
                <RichEditor value={currentCard.description || ""} onChange={(value) => setCurrentCard((prev) => ({ ...prev, description: value }))} placeholder="Adicione uma descrição detalhada..." />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => { save({ description: currentCard.description }); setEditDesc(false); }} style={{ background: caseData.color, border: "none", borderRadius: 6, color: "#fff", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>Salvar</button>
                  <button onClick={() => setEditDesc(false)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div onClick={() => { if (!isClient) setEditDesc(true); }} style={{ minHeight: 60, padding: "10px 12px", background: "var(--ws-surface2)", borderRadius: 8, cursor: isClient ? "default" : "pointer", border: "1px solid transparent", transition: "border-color .15s" }} onMouseEnter={(e) => { if (!isClient) e.currentTarget.style.borderColor = "var(--ws-border2)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}>
                {currentCard.description ? (
                  <div className="ws-richtext" dangerouslySetInnerHTML={{ __html: linkify(currentCard.description) }} />
                ) : (
                  <div style={{ fontSize: ".82rem", color: "var(--ws-text3)" }}>{isClient ? "Sem descrição." : "Clique para adicionar uma descrição..."}</div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Checklist {total > 0 && `(${done}/${total})`}</div>
            {total > 0 && ( <div style={{ height: 4, background: "var(--ws-border)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}> <div style={{ height: "100%", borderRadius: 2, background: caseData.color, width: `${(done / total) * 100}%`, transition: "width .3s" }} /> </div> )}
            {(currentCard.checklist || []).map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <input type="checkbox" checked={item.done} onChange={() => toggleCheck(item.id)} style={{ width: 15, height: 15, cursor: "pointer", accentColor: caseData.color }} />
                <span style={{ fontSize: ".84rem", color: "var(--ws-text)", flex: 1, textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}>{item.text}</span>
                {!isClient && <button onClick={() => removeCheck(item.id)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".85rem" }}>×</button>}
              </div>
            ))}
            {!isClient && (
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input className="ws-input" value={newCheck} placeholder="Adicionar item..." onChange={(e) => setNewCheck(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCheckItem()} style={{ flex: 1, padding: "6px 10px", fontSize: ".8rem" }} />
                <button onClick={addCheckItem} style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>+</button>
              </div>
            )}
            {isClient && total === 0 && (
              <div style={{ fontSize: ".82rem", color: "var(--ws-text3)", padding: "8px 0" }}>
                Ainda não temos itens por aqui.
              </div>
            )}
          </div>

          {/* ── Anexos ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={labelStyle}>📎 Anexos {(currentCard.attachments || []).length > 0 && `(${(currentCard.attachments || []).length})`}</div>
              {!isClient && (
                <>
                  <button
                    onClick={() => attachFileRef.current?.click()}
                    disabled={uploading}
                    style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text2)", cursor: "pointer", fontSize: ".78rem", padding: "5px 12px", fontFamily: "inherit" }}
                  >
                    {uploading ? uploadProgress : "Adicionar"}
                  </button>
                  <input
                    ref={el => { attachFileRef.current = el; }}
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    multiple
                    style={{ display: "none" }}
                    onChange={e => { if (e.target.files?.length) void uploadAttachment(e.target.files); e.target.value = ""; }}
                  />
                </>
              )}
            </div>

            {(currentCard.attachments || []).length === 0 ? (
              <div style={{ fontSize: ".82rem", color: "var(--ws-text3)" }}>Nenhum anexo.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(currentCard.attachments || []).map((att: any) => (
                  <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--ws-surface2)", borderRadius: 10, border: "1px solid var(--ws-border)" }}>
                    {/* Thumbnail */}
                    <div style={{ width: 48, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "var(--ws-surface3)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      {isImage(att.url) ? (
                        <img src={att.url} alt={att.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "1.4rem" }}>📄</span>
                      )}
                      {att.cover && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.6)", fontSize: ".45rem", color: "#fff", textAlign: "center", padding: "1px 0", fontFamily: "Poppins", letterSpacing: "0.5px" }}>CAPA</div>}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{att.name}</div>
                      {!isClient && isImage(att.url) && (
                        <button onClick={() => void setCover(att.id)} style={{ background: "none", border: "none", color: att.cover ? caseData.color : "var(--ws-text3)", cursor: "pointer", fontSize: ".68rem", padding: 0, fontFamily: "inherit" }}>
                          {att.cover ? "✓ Capa" : "Definir como capa"}
                        </button>
                      )}
                    </div>

                    {/* Ações */}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" title="Abrir" style={{ background: "none", border: "1px solid var(--ws-border2)", borderRadius: 6, color: "var(--ws-text3)", cursor: "pointer", fontSize: ".75rem", padding: "4px 8px", textDecoration: "none", display: "flex", alignItems: "center" }}>↗</a>
                      {!isClient && (
                        <button onClick={() => void removeAttachment(att.id)} title="Remover" style={{ background: "none", border: "1px solid var(--ws-border2)", borderRadius: 6, color: "var(--ws-text3)", cursor: "pointer", fontSize: ".75rem", padding: "4px 8px" }}>×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={labelStyle}>Comentários e atividade</div>
            {(currentCard.comments || []).length === 0 && (
              <div style={{ fontSize: ".82rem", color: "var(--ws-text3)", marginBottom: 12 }}>
                Ainda não há comentários.
              </div>
            )}
            {(currentCard.comments || []).map((comment) => (
              <div key={comment.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: caseData.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: ".75rem", fontWeight: 700, flexShrink: 0 }}>
                  {comment.author.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                    <div style={{ fontSize: ".78rem", color: "var(--ws-text2)" }}>
                      <b style={{ color: "var(--ws-text)" }}>{comment.author}</b>{" "}
                      <span style={{ color: "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".65rem" }}>
                        {new Date(comment.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {(comment as any).edited_at ? " • editado" : ""}
                      </span>
                    </div>
                    {isOwnComment(comment.author) && editingCommentId !== comment.id && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => startEditComment(comment)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", fontFamily: "inherit" }}>Editar</button>
                        {!isClient && <button onClick={() => removeComment(comment.id)} style={{ background: "none", border: "none", color: "var(--ws-accent)", cursor: "pointer", fontSize: ".72rem", fontFamily: "inherit" }}>Excluir</button>}
                      </div>
                    )}
                  </div>
                  {editingCommentId === comment.id ? (
                    <div>
                      <textarea className="ws-input" value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)}
                        style={{ minHeight: 64, resize: "vertical", fontSize: ".83rem", marginBottom: 6, width: "100%", boxSizing: "border-box" }} autoFocus />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => saveEditComment(comment.id)} style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem" }}>Salvar</button>
                        <button onClick={() => { setEditingCommentId(null); setEditingCommentText(""); }} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "8px 12px", fontSize: ".83rem", color: "var(--ws-text)" }}>{comment.text}</div>
                  )}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: caseData.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: ".75rem", fontWeight: 700, flexShrink: 0 }}>
                {(profile.name || "V").slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <textarea className="ws-input" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escrever um comentário..." style={{ minHeight: 64, resize: "vertical", fontSize: ".83rem", marginBottom: 6, width: "100%", boxSizing: "border-box" }} />
                <button onClick={addComment} style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>Comentar</button>
              </div>
            </div>
          </div>
        </div>

        {!isClient && <div style={{ padding: isMobile ? "16px" : "28px 18px", display: isMobile && !sidebarVisible ? "none" : "block" }}>
          <div style={labelStyle}>Ações</div>
          <button onClick={toggleCompleted} style={{
              background: currentCard.completed ? "#00e676" : "var(--ws-surface2)",
              border: `1px solid ${currentCard.completed ? "#00e676" : "var(--ws-border2)"}`,
              borderRadius: 8, color: currentCard.completed ? "#fff" : "var(--ws-text)",
              width: "100%", padding: "10px 0", fontSize: ".8rem", cursor: "pointer", marginBottom: 12, fontWeight: 600
            }}>
              {currentCard.completed ? "✓ Concluído" : "Marcar como concluído"}
          </button>
          <div style={{ marginBottom: 20 }}>
            <LabelPicker value={currentCard.label_color || ""} onChange={(value) => save({ label_color: value })} accentColor={caseData.color} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Data</div>
            <input type="date" className="ws-input" value={currentCard.due_date || ""} onChange={(e) => save({ due_date: e.target.value })} style={{ fontSize: ".8rem", width: "100%", boxSizing: "border-box" }} />
          </div>
          <button onClick={handleDelete} style={{ background: "none", border: "1px solid var(--ws-accent)", borderRadius: 8, color: "var(--ws-accent)", cursor: "pointer", width: "100%", padding: "8px 0", fontSize: ".8rem", fontFamily: "inherit", marginTop: 8 }}>
            × Excluir cartão
          </button>
        </div>}
        </div>{/* fecha grid */}
      </div>
    </div>
  );
}