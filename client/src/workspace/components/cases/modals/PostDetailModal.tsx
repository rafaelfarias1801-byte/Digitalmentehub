import { useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import RichEditor from "../RichEditor";
import { APPROVAL_STYLES, LABEL_COLORS } from "../constants";
import { closeBtnStyle, labelStyle, overlayStyle } from "../styles";
import { isVideoFile, normalizeWhatsAppPhone, parseDateAtNoon } from "../utils";
import type { Case, CheckItem, Comment, Post } from "../types";
import type { Profile } from "../../../../lib/supabaseClient";
import { decodeExtraUrls, stripMediaTag } from "../tabs/TabConteudo";

interface PostDetailModalProps {
  post: Post;
  caseData: Case;
  onClose: () => void;
  onUpdate: (post: Post) => void;
  profile: Profile;
}

export default function PostDetailModal({ post, caseData, onClose, onUpdate, profile }: PostDetailModalProps) {
  const [currentPost, setCurrentPost] = useState<Post>(post);
  const [editDesc, setEditDesc] = useState(false);
  const [newCheck, setNewCheck] = useState("");
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // Navegação de slides
  const extraUrls = decodeExtraUrls(currentPost.extra_info);
  const allSlides = currentPost.media_url
    ? [currentPost.media_url, ...extraUrls]
    : extraUrls;
  const [slideIdx, setSlideIdx] = useState(0);
  const activeSlideUrl = allSlides[slideIdx] ?? "";

  function prevSlide() { setSlideIdx(i => Math.max(0, i - 1)); }
  function nextSlide() { setSlideIdx(i => Math.min(allSlides.length - 1, i + 1)); }

  // ── Salvar ──────────────────────────────────────────────────────
  async function save(updates: Partial<Post>) {
    const merged = { ...currentPost, ...updates };
    setCurrentPost(merged);
    const { data } = await supabase.from("posts").update(merged).eq("id", currentPost.id).select().single();
    if (data) { onUpdate(data); setCurrentPost(data); }
  }

  async function saveApproval(status: Post["approval_status"]) {
    setSaving(true);
    await save({ approval_status: status });
    setSaving(false);
  }

  // ── Checklist ───────────────────────────────────────────────────
  function addCheckItem() {
    if (!newCheck.trim()) return;
    const item: CheckItem = { id: Date.now().toString(), text: newCheck.trim(), done: false };
    void save({ checklist: [...(currentPost.checklist || []), item] });
    setNewCheck("");
  }
  function toggleCheck(id: string) {
    void save({ checklist: (currentPost.checklist || []).map(i => i.id === id ? { ...i, done: !i.done } : i) });
  }
  function removeCheck(id: string) {
    void save({ checklist: (currentPost.checklist || []).filter(i => i.id !== id) });
  }

  // ── Comentários ─────────────────────────────────────────────────
  function addComment() {
    if (!newComment.trim()) return;
    const c: Comment = { id: Date.now().toString(), author: profile.name || "Você", text: newComment.trim(), created_at: new Date().toISOString() };
    void save({ comments: [...(currentPost.comments || []), c] });
    setNewComment("");
  }
  function startEditComment(c: Comment) { setEditingCommentId(c.id); setEditingCommentText(c.text); }
  function cancelEditComment() { setEditingCommentId(null); setEditingCommentText(""); }
  function saveEditComment(id: string) {
    if (!editingCommentText.trim()) return;
    void save({ comments: (currentPost.comments || []).map(c => c.id === id ? { ...c, text: editingCommentText.trim(), edited_at: new Date().toISOString() } : c) });
    cancelEditComment();
  }
  function deleteComment(id: string) {
    void save({ comments: (currentPost.comments || []).filter(c => c.id !== id) });
    if (editingCommentId === id) cancelEditComment();
  }
  function isOwnComment(c: Comment) { return (c.author || "").trim() === (profile.name || "").trim(); }

  // ── WhatsApp ────────────────────────────────────────────────────
  function sendToWhatsApp() {
    const phone = normalizeWhatsAppPhone(caseData.phone);
    if (!phone) return;
    const msgs: Record<Post["approval_status"], string> = {
      pendente: `Olá! 👋\n\nTemos o conteúdo "${currentPost.title || currentPost.slug || "Post"}" aguardando sua aprovação.\n\nAcesse: https://www.digitalmentehub.com.br/workspace`,
      aprovado: `Olá! 👋\n\nO conteúdo "${currentPost.title || currentPost.slug || "Post"}" foi aprovado! ✅`,
      reprovado: `Olá! 👋\n\nSobre o conteúdo "${currentPost.title || currentPost.slug || "Post"}", vamos ajustar. Podemos conversar?`,
      alteracao: `Olá! 👋\n\nRecebemos seu pedido de alteração em "${currentPost.title || currentPost.slug || "Post"}". Vamos alinhar?`,
    };
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msgs[currentPost.approval_status])}`, "_blank");
  }

  const approval = APPROVAL_STYLES[currentPost.approval_status];
  const doneCount = (currentPost.checklist || []).filter(i => i.done).length;
  const totalCheck = (currentPost.checklist || []).length;
  const aspectRatio = currentPost.media_type === "feed" ? "4 / 5" : currentPost.media_type === "carousel" ? "1 / 1" : "9 / 16";
  const scheduledDate = parseDateAtNoon(currentPost.scheduled_date);

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--ws-surface)", borderRadius: 16,
        width: "min(860px,95vw)", maxHeight: "90vh", overflowY: "auto",
        border: "1px solid var(--ws-border2)", boxShadow: "0 30px 80px #00000070",
        display: "grid", gridTemplateColumns: "1fr 280px",
      }}>
        {/* ── Coluna principal ── */}
        <div style={{ padding: "28px 24px", borderRight: "1px solid var(--ws-border)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              {currentPost.label_color && (
                <div style={{ width: 40, height: 6, borderRadius: 3, background: currentPost.label_color, marginBottom: 8 }} />
              )}
              <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.1rem", color: "var(--ws-text)", marginBottom: 4 }}>
                {currentPost.slug || currentPost.title || "Post"}
              </div>
              {currentPost.title && currentPost.slug && (
                <div style={{ fontSize: ".82rem", color: "var(--ws-text3)", marginBottom: 4 }}>{currentPost.title}</div>
              )}
              <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "DM Mono" }}>
                {scheduledDate ? scheduledDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "Sem data"}
              </div>
            </div>
            <button onClick={onClose} style={closeBtnStyle}>×</button>
          </div>

          {/* ── Visualizador de slides ── */}
          {allSlides.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              {/* Viewer principal */}
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000", marginBottom: allSlides.length > 1 ? 8 : 0 }}>
                {isVideoFile(activeSlideUrl) ? (
                  <video src={activeSlideUrl} controls style={{ width: "100%", aspectRatio, objectFit: "contain", maxHeight: 400, display: "block" }} />
                ) : (
                  <img src={activeSlideUrl} alt={`Slide ${slideIdx + 1}`}
                    style={{ width: "100%", aspectRatio, objectFit: "contain", maxHeight: 400, display: "block" }} />
                )}

                {/* Botões de navegação sobrepostos */}
                {allSlides.length > 1 && (
                  <>
                    <button onClick={prevSlide} disabled={slideIdx === 0} style={{
                      position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                      background: slideIdx === 0 ? "rgba(0,0,0,.2)" : "rgba(0,0,0,.6)",
                      border: "none", borderRadius: "50%", width: 34, height: 34,
                      color: "#fff", cursor: slideIdx === 0 ? "default" : "pointer",
                      fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .15s",
                    }}>‹</button>

                    <button onClick={nextSlide} disabled={slideIdx === allSlides.length - 1} style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: slideIdx === allSlides.length - 1 ? "rgba(0,0,0,.2)" : "rgba(0,0,0,.6)",
                      border: "none", borderRadius: "50%", width: 34, height: 34,
                      color: "#fff", cursor: slideIdx === allSlides.length - 1 ? "default" : "pointer",
                      fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .15s",
                    }}>›</button>

                    {/* Contador */}
                    <div style={{
                      position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
                      background: "rgba(0,0,0,.55)", borderRadius: 20, padding: "3px 10px",
                      color: "#fff", fontSize: ".65rem", fontFamily: "DM Mono", letterSpacing: "1px",
                    }}>{slideIdx + 1} / {allSlides.length}</div>
                  </>
                )}
              </div>

              {/* Thumbnails clicáveis */}
              {allSlides.length > 1 && (
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                  {allSlides.map((url, i) => (
                    <div key={i} onClick={() => setSlideIdx(i)} style={{
                      width: 44, height: 44, flexShrink: 0, borderRadius: 6, overflow: "hidden",
                      border: i === slideIdx ? `2px solid ${caseData.color}` : "2px solid transparent",
                      cursor: "pointer", opacity: i === slideIdx ? 1 : 0.55, transition: "all .15s",
                    }}>
                      {isVideoFile(url)
                        ? <video src={url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <img src={url} alt={`thumb ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Status de aprovação ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Status de aprovação</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: approval.bg, color: approval.color, borderRadius: 20,
              padding: "4px 12px", fontSize: ".78rem", fontWeight: 600, marginBottom: 12,
            }}>
              {currentPost.approval_status === "aprovado" ? "✓" : currentPost.approval_status === "reprovado" ? "✕" : currentPost.approval_status === "alteracao" ? "⚠" : "◷"}{" "}
              {approval.label}
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {(["aprovado", "reprovado", "alteracao"] as const).map(status => (
                <button key={status} onClick={() => void saveApproval(status)} disabled={saving} style={{
                  padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                  background: APPROVAL_STYLES[status].bg, color: APPROVAL_STYLES[status].color,
                  opacity: currentPost.approval_status === status ? 1 : 0.6,
                  outline: currentPost.approval_status === status ? `2px solid ${APPROVAL_STYLES[status].color}` : "none",
                  transition: "all .15s",
                }}>
                  {status === "aprovado" ? "✓ Aprovar" : status === "reprovado" ? "✕ Reprovar" : "⚠ Alteração"}
                </button>
              ))}
            </div>
          </div>

          {!!caseData.phone && (
            <div style={{ marginTop: 12, marginBottom: 16 }}>
              <button onClick={sendToWhatsApp} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                backgroundColor: "#25D366", color: "#fff", border: "none", borderRadius: 8,
                cursor: "pointer", fontSize: ".78rem", fontWeight: 600,
              }}>Enviar via WhatsApp</button>
            </div>
          )}

          {/* ── Descrição ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Descrição</div>
            {editDesc ? (
              <div>
                <RichEditor value={currentPost.description || ""} onChange={v => setCurrentPost(p => ({ ...p, description: v }))} placeholder="Descrição detalhada..." />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => { void save({ description: currentPost.description }); setEditDesc(false); }}
                    style={{ background: caseData.color, border: "none", borderRadius: 6, color: "#fff", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>
                    Salvar
                  </button>
                  <button onClick={() => setEditDesc(false)}
                    style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditDesc(true)} style={{
                minHeight: 60, padding: "10px 12px", background: "var(--ws-surface2)", borderRadius: 8,
                cursor: "pointer", border: "1px solid transparent", transition: "border-color .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ws-border2)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; }}
              >
                {currentPost.description ? (
                  <div className="ws-richtext" style={{ fontSize: ".84rem", color: "var(--ws-text)", lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: currentPost.description }} />
                ) : (
                  <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Clique para adicionar uma descrição...</div>
                )}
              </div>
            )}
          </div>

          {/* ── Legenda ── */}
          {currentPost.caption && (
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Legenda</div>
              <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "10px 12px", fontSize: ".84rem", color: "var(--ws-text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {currentPost.caption}
              </div>
            </div>
          )}

          {/* ── Hashtags ── */}
          {currentPost.hashtags && (
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Hashtags</div>
              <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "10px 12px", fontSize: ".8rem", color: "#7b9cff", lineHeight: 1.7, wordBreak: "break-word" }}>
                {currentPost.hashtags}
              </div>
            </div>
          )}

          {/* ── Extra info (sem a tag de URLs) ── */}
          {stripMediaTag(currentPost.extra_info) && (
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Informações extras</div>
              <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "10px 12px", fontSize: ".82rem", color: "var(--ws-text2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {stripMediaTag(currentPost.extra_info)}
              </div>
            </div>
          )}

          {/* ── Checklist ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={labelStyle}>
                Checklist{totalCheck > 0 && <span style={{ marginLeft: 6, color: "var(--ws-text3)" }}>({doneCount}/{totalCheck})</span>}
              </div>
            </div>
            {(currentPost.checklist || []).map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--ws-border)" }}>
                <input type="checkbox" checked={item.done} onChange={() => toggleCheck(item.id)}
                  style={{ width: 15, height: 15, accentColor: caseData.color, cursor: "pointer" }} />
                <span style={{ flex: 1, fontSize: ".84rem", color: item.done ? "var(--ws-text3)" : "var(--ws-text)", textDecoration: item.done ? "line-through" : "none" }}>
                  {item.text}
                </span>
                <button onClick={() => removeCheck(item.id)}
                  style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".85rem" }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input className="ws-input" value={newCheck} onChange={e => setNewCheck(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCheckItem()} placeholder="Novo item..."
                style={{ flex: 1, fontSize: ".83rem" }} />
              <button onClick={addCheckItem}
                style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", padding: "0 14px", cursor: "pointer", fontSize: ".8rem", fontFamily: "inherit" }}>
                +
              </button>
            </div>
          </div>

          {/* ── Comentários ── */}
          <div>
            <div style={labelStyle}>Comentários</div>
            {(currentPost.comments || []).map(comment => (
              <div key={comment.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--ws-border)" }}>
                <div style={{ fontSize: ".8rem", color: "var(--ws-text2)", marginBottom: 3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <b style={{ color: "var(--ws-text)" }}>{comment.author}</b>{" "}
                    <span style={{ color: "var(--ws-text3)", fontFamily: "DM Mono", fontSize: ".65rem" }}>
                      {new Date(comment.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {comment.edited_at ? " • editado" : ""}
                    </span>
                  </div>
                  {isOwnComment(comment) && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => startEditComment(comment)}
                        style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", fontFamily: "inherit" }}>Editar</button>
                      <button onClick={() => deleteComment(comment.id)}
                        style={{ background: "none", border: "none", color: "var(--ws-accent)", cursor: "pointer", fontSize: ".72rem", fontFamily: "inherit" }}>Excluir</button>
                    </div>
                  )}
                </div>
                {editingCommentId === comment.id ? (
                  <div>
                    <textarea className="ws-input" value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)}
                      style={{ minHeight: 70, resize: "vertical", fontSize: ".83rem", marginBottom: 6 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => saveEditComment(comment.id)}
                        style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem" }}>
                        Salvar
                      </button>
                      <button onClick={cancelEditComment}
                        style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "8px 12px", fontSize: ".83rem", color: "var(--ws-text)" }}>
                    {comment.text}
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: caseData.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: ".75rem", fontWeight: 700, flexShrink: 0 }}>
                {(profile.name || "V").slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <textarea className="ws-input" value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder="Escrever um comentário..." style={{ minHeight: 64, resize: "vertical", fontSize: ".83rem", marginBottom: 6 }} />
                <button onClick={addComment}
                  style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>
                  Comentar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Coluna lateral ── */}
        <div style={{ padding: "28px 18px" }}>
          <div style={labelStyle}>Ações</div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Etiqueta</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LABEL_COLORS.map(color => (
                <div key={color} onClick={() => void save({ label_color: currentPost.label_color === color ? "" : color })} style={{
                  width: 24, height: 24, borderRadius: 4, background: color, cursor: "pointer",
                  border: currentPost.label_color === color ? "3px solid white" : "3px solid transparent",
                  boxShadow: currentPost.label_color === color ? `0 0 0 2px ${color}` : "none",
                  transition: "all .15s",
                }} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Data de entrega</div>
            <input type="date" className="ws-input" value={currentPost.due_date || ""}
              onChange={e => void save({ due_date: e.target.value })} style={{ fontSize: ".8rem" }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Tipo de conteúdo</div>
            <select className="ws-input" value={currentPost.media_type}
              onChange={e => void save({ media_type: e.target.value as Post["media_type"] })} style={{ fontSize: ".8rem" }}>
              <option value="feed">Feed (4:5 · 1080×1350)</option>
              <option value="stories">Stories (9:16 · 1080×1920)</option>
              <option value="reels">Reels (9:16 · 1080×1920)</option>
              <option value="carousel">Carrossel (1:1 · 1080×1080)</option>
            </select>
          </div>

          <div style={{ padding: "10px 12px", background: "var(--ws-surface2)", borderRadius: 8, fontSize: ".73rem", color: "var(--ws-text3)", lineHeight: 1.6 }}>
            {currentPost.media_type === "feed" && "📐 1080 × 1350 px — Feed"}
            {currentPost.media_type === "stories" && "📐 1080 × 1920 px — Stories"}
            {currentPost.media_type === "reels" && "📐 1080 × 1920 px — Reels"}
            {currentPost.media_type === "carousel" && "📐 1080 × 1080 px — Carrossel"}
          </div>

          {/* Info de slides */}
          {allSlides.length > 1 && (
            <div style={{ marginTop: 20, padding: "10px 12px", background: "var(--ws-surface2)", borderRadius: 8, fontSize: ".73rem", color: "var(--ws-text3)", lineHeight: 1.8 }}>
              🎠 <b style={{ color: "var(--ws-text2)" }}>{allSlides.length} slides</b><br />
              Use ‹ › para navegar<br />
              Clique nas miniaturas abaixo da imagem
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
