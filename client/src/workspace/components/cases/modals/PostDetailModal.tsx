import { useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import RichEditor from "../RichEditor";
import { APPROVAL_STYLES, LABEL_COLORS } from "../constants";
import { closeBtnStyle, labelStyle, overlayStyle } from "../styles";
import { isVideoFile, normalizeWhatsAppPhone, parseDateAtNoon } from "../utils";
import type { Case, CheckItem, Comment, Post } from "../types";
import type { Profile } from "../../../../lib/supabaseClient";
import { decodeExtraUrls, stripMediaTag } from "../tabs/TabConteudo";
import { useIsMobile } from "../../../hooks/useIsMobile";

interface PostDetailModalProps {
  post: Post;
  caseData: Case;
  onClose: () => void;
  onUpdate: (post: Post) => void;
  profile: Profile;
  readonly?: boolean;
}

export default function PostDetailModal({ post, caseData, onClose, onUpdate, profile, readonly = false }: PostDetailModalProps) {
  const [currentPost, setCurrentPost] = useState<Post>(post);
  const [editDesc, setEditDesc] = useState(false);
  const [editCaption, setEditCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(currentPost.caption || "");
  const [hashtagsDraft, setHashtagsDraft] = useState(currentPost.hashtags || "");
  const [confirmStatus, setConfirmStatus] = useState<Post["approval_status"] | null>(null);

  const isLocked = currentPost.approval_status === "aprovado" || currentPost.approval_status === "postado";
  const isPostado = currentPost.approval_status === "postado";
  const [newCheck, setNewCheck] = useState("");
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const isMobile = useIsMobile();

  // Navegação de slides — usa media_urls se disponível, senão fallback para extra_info
  const extraUrls = decodeExtraUrls(currentPost.extra_info);
  const allSlides = (currentPost.media_urls && currentPost.media_urls.length > 0)
    ? currentPost.media_urls
    : currentPost.media_url
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

  const approval = APPROVAL_STYLES[currentPost.approval_status] ?? APPROVAL_STYLES["pendente"];
  const doneCount = (currentPost.checklist || []).filter(i => i.done).length;
  const totalCheck = (currentPost.checklist || []).length;
  const aspectRatio = currentPost.media_type === "feed" ? "4 / 5" : currentPost.media_type === "carousel" ? "1 / 1" : "9 / 16";
  const scheduledDate = currentPost.scheduled_date ? new Date(currentPost.scheduled_date) : null;
  const scheduledDateValue = scheduledDate ? scheduledDate.toISOString().slice(0, 10) : "";
  const scheduledTimeValue = scheduledDate ? scheduledDate.toTimeString().slice(0, 5) : "";

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--ws-surface)",
        borderRadius: isMobile ? "16px 16px 0 0" : 16,
        width: isMobile ? "100%" : "min(860px,95vw)",
        maxHeight: isMobile ? "94dvh" : "90vh",
        overflowY: "auto",
        border: "1px solid var(--ws-border2)",
        boxShadow: "0 30px 80px #00000070",
        display: "flex",
        flexDirection: "column",
        ...(isMobile ? { position: "fixed", bottom: 0, left: 0, right: 0, top: "auto", margin: 0 } : {}),
      }}>
        {/* Mobile: botão toggle de ações */}
        {isMobile && (
          <div style={{ display: "flex", borderBottom: "1px solid var(--ws-border)", background: "var(--ws-surface2)" }}>
            <button onClick={() => setSidebarVisible(false)} style={{
              flex: 1, padding: "11px 0", background: "none", border: "none",
              color: !sidebarVisible ? caseData.color : "var(--ws-text3)",
              fontFamily: "Poppins", fontSize: ".65rem", letterSpacing: "1px",
              borderBottom: !sidebarVisible ? `2px solid ${caseData.color}` : "2px solid transparent",
              cursor: "pointer",
            }}>CONTEÚDO</button>
            <button onClick={() => setSidebarVisible(true)} style={{
              flex: 1, padding: "11px 0", background: "none", border: "none",
              color: sidebarVisible ? caseData.color : "var(--ws-text3)",
              fontFamily: "Poppins", fontSize: ".65rem", letterSpacing: "1px",
              borderBottom: sidebarVisible ? `2px solid ${caseData.color}` : "2px solid transparent",
              cursor: "pointer",
            }}>AÇÕES</button>
          </div>
        )}

        {/* Conteúdo desktop: grid 2 colunas | mobile: só uma coluna visível */}
        <div style={{
          display: isMobile ? "block" : "grid",
          gridTemplateColumns: isMobile ? undefined : "1fr 280px",
          flex: 1,
          minHeight: 0,
        }}>
        {/* ── Coluna principal ── */}
        <div style={{ padding: "20px 18px", borderRight: isMobile ? "none" : "1px solid var(--ws-border)", display: isMobile && sidebarVisible ? "none" : "block" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              {currentPost.label_color && (
                <div style={{ width: 40, height: 6, borderRadius: 3, background: currentPost.label_color, marginBottom: 8 }} />
              )}
              <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.1rem", color: "var(--ws-text)", marginBottom: 4 }}>
                {currentPost.slug || currentPost.title || "Post"}
              </div>
              {currentPost.title && currentPost.slug && (
                <div style={{ fontSize: ".82rem", color: "var(--ws-text3)", marginBottom: 4 }}>{currentPost.title}</div>
              )}
              <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>
                {scheduledDate ? scheduledDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) + " às " + scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Sem data"}
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
                      color: "#fff", fontSize: ".65rem", fontFamily: "Poppins", letterSpacing: "1px",
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
              {currentPost.approval_status === "aprovado" ? "✓" : currentPost.approval_status === "reprovado" ? "✕" : currentPost.approval_status === "alteracao" ? "⚠" : currentPost.approval_status === "agendado" ? "🗓" : currentPost.approval_status === "postado" ? "✅" : "◷"}{" "}
              {approval.label}
            </div>

            {/* Bloqueado para todos — postado */}
            {isPostado ? (
              <div style={{ fontSize: ".75rem", color: "var(--ws-text3)", background: "var(--ws-surface2)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                ✅ Post publicado — não é possível alterar o status.
              </div>

            ) : readonly ? (
              /* Cliente: pode aprovar/reprovar/alteracao, mas não voltar pra pendente */
              isLocked ? (
                <div style={{ fontSize: ".75rem", color: "var(--ws-text3)", background: "var(--ws-surface2)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                  🔒 Você já aprovou este post.
                </div>
              ) : confirmStatus ? (
                <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "12px", marginTop: 4 }}>
                  <div style={{ fontSize: ".82rem", color: "var(--ws-text)", marginBottom: 10 }}>
                    Confirmar mudança para <b style={{ color: APPROVAL_STYLES[confirmStatus].color }}>{APPROVAL_STYLES[confirmStatus].label}</b>?
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={async () => { await saveApproval(confirmStatus); setConfirmStatus(null); }} disabled={saving}
                      style={{ background: APPROVAL_STYLES[confirmStatus].bg, color: APPROVAL_STYLES[confirmStatus].color, border: `1px solid ${APPROVAL_STYLES[confirmStatus].color}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600 }}>
                      Confirmar
                    </button>
                    <button onClick={() => setConfirmStatus(null)}
                      style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {currentPost.approval_status === "agendado" ? (
                    <div style={{ fontSize: ".75rem", color: "#4b6bff", background: "rgba(75,100,255,0.1)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                      🗓 Post agendado — será publicado no horário definido.
                    </div>
                  ) : (
                    (["aprovado", "reprovado", "alteracao"] as const).map(status => (
                      <button key={status} onClick={() => setConfirmStatus(status)} disabled={saving} style={{
                        padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                        background: APPROVAL_STYLES[status].bg, color: APPROVAL_STYLES[status].color,
                        opacity: currentPost.approval_status === status ? 1 : 0.6,
                        outline: currentPost.approval_status === status ? `2px solid ${APPROVAL_STYLES[status].color}` : "none",
                        transition: "all .15s",
                      }}>
                        {status === "aprovado" ? "✓ Aprovar" : status === "reprovado" ? "✕ Reprovar" : "⚠ Alteração"}
                      </button>
                    ))
                  )}
                </div>
              )

            ) : (
              /* Admin: controle total */
              confirmStatus ? (
                <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "12px", marginTop: 4 }}>
                  <div style={{ fontSize: ".82rem", color: "var(--ws-text)", marginBottom: 10 }}>
                    Confirmar mudança para <b style={{ color: APPROVAL_STYLES[confirmStatus].color }}>{APPROVAL_STYLES[confirmStatus].label}</b>?
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={async () => { await saveApproval(confirmStatus); setConfirmStatus(null); }} disabled={saving}
                      style={{ background: APPROVAL_STYLES[confirmStatus].bg, color: APPROVAL_STYLES[confirmStatus].color, border: `1px solid ${APPROVAL_STYLES[confirmStatus].color}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600 }}>
                      Confirmar
                    </button>
                    <button onClick={() => setConfirmStatus(null)}
                      style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {currentPost.approval_status === "agendado" ? (
                    <div style={{ fontSize: ".75rem", color: "#4b6bff", background: "rgba(75,100,255,0.1)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                      🗓 Post agendado pelo Make — será publicado no horário definido.
                    </div>
                  ) : (
                    <>
                      {/* Admin pode voltar pra pendente se reprovado, alteracao ou aprovado */}
                      {(currentPost.approval_status === "reprovado" || currentPost.approval_status === "alteracao" || currentPost.approval_status === "aprovado") && (
                        <button onClick={() => setConfirmStatus("pendente")} style={{
                          padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                          fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                          background: APPROVAL_STYLES["pendente"].bg, color: APPROVAL_STYLES["pendente"].color,
                        }}>
                          ◷ Voltar para Pendente
                        </button>
                      )}
                      {(["aprovado", "reprovado", "alteracao"] as const).map(status => (
                        <button key={status} onClick={() => setConfirmStatus(status)} disabled={saving} style={{
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
                    </>
                  )}
                </div>
              )
            )}
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
            {editDesc && !readonly ? (
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
              <div onClick={() => !readonly && setEditDesc(true)} style={{
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

          {/* ── Legenda + Hashtags ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={labelStyle}>Legenda</div>
              {!editCaption && !readonly && (
                <button onClick={() => { setCaptionDraft(currentPost.caption || ""); setHashtagsDraft(currentPost.hashtags || ""); setEditCaption(true); }}
                  style={{ background: "none", border: "none", color: caseData.color, cursor: "pointer", fontSize: ".75rem", fontFamily: "inherit", fontWeight: 600 }}>
                  ✏ Editar
                </button>
              )}
            </div>
            {editCaption ? (
              <div>
                <textarea className="ws-input" value={captionDraft} onChange={e => setCaptionDraft(e.target.value)}
                  placeholder="Legenda do post..." style={{ minHeight: 100, resize: "vertical", fontSize: ".84rem", marginBottom: 10, lineHeight: 1.6 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { void save({ caption: captionDraft }); setEditCaption(false); }}
                    style={{ background: caseData.color, border: "none", borderRadius: 6, color: "#fff", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>
                    Salvar
                  </button>
                  <button onClick={() => setEditCaption(false)}
                    style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {currentPost.caption ? (
                  <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "10px 12px", fontSize: ".84rem", color: "var(--ws-text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {currentPost.caption}
                  </div>
                ) : (
                  <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Sem legenda</div>
                )}
              </>
            )}
          </div>

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
                {!readonly && <button onClick={() => removeCheck(item.id)}
                  style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".85rem" }}>×</button>}
              </div>
            ))}
            {!readonly && <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input className="ws-input" value={newCheck} onChange={e => setNewCheck(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCheckItem()} placeholder="Novo item..."
                style={{ flex: 1, fontSize: ".83rem" }} />
              <button onClick={addCheckItem}
                style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", padding: "0 14px", cursor: "pointer", fontSize: ".8rem", fontFamily: "inherit" }}>
                +
              </button>
            </div>}
          </div>

          {/* ── Comentários ── */}
          <div>
            <div style={labelStyle}>Comentários</div>
            {(currentPost.comments || []).map(comment => (
              <div key={comment.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--ws-border)" }}>
                <div style={{ fontSize: ".8rem", color: "var(--ws-text2)", marginBottom: 3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <b style={{ color: "var(--ws-text)" }}>{comment.author}</b>{" "}
                    <span style={{ color: "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".65rem" }}>
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
        <div style={{ padding: isMobile ? "16px" : "28px 18px", display: isMobile && !sidebarVisible ? "none" : "block" }}>
          <div style={labelStyle}>Ações</div>

          {!readonly && <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Etiqueta</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {LABEL_COLORS.map(color => (
                <div key={color} onClick={() => void save({ label_color: currentPost.label_color === color ? "" : color })} style={{
                  width: 24, height: 24, borderRadius: 4, background: color, cursor: "pointer",
                  border: currentPost.label_color === color ? "3px solid white" : "3px solid transparent",
                  boxShadow: currentPost.label_color === color ? `0 0 0 2px ${color}` : "none",
                  transition: "all .15s",
                }} />
              ))}
              {/* Picker customizado */}
              <label title="Cor personalizada" style={{
                position: "relative", width: 24, height: 24, borderRadius: 4, cursor: "pointer", flexShrink: 0, overflow: "hidden",
                background: currentPost.label_color && !LABEL_COLORS.includes(currentPost.label_color) ? currentPost.label_color : "var(--ws-border2)",
                border: currentPost.label_color && !LABEL_COLORS.includes(currentPost.label_color) ? "3px solid white" : "3px solid transparent",
                boxShadow: currentPost.label_color && !LABEL_COLORS.includes(currentPost.label_color) ? `0 0 0 2px ${currentPost.label_color}` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: ".7rem", color: "var(--ws-text3)", pointerEvents: "none" }}>+</span>
                <input type="color" value={currentPost.label_color || "#000000"}
                  onChange={e => void save({ label_color: e.target.value })}
                  style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
              </label>
              {currentPost.label_color && (
                <button onClick={() => void save({ label_color: "" })}
                  style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", fontFamily: "inherit" }}>
                  limpar
                </button>
              )}
            </div>
          </div>}

          {!readonly ? (
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Plataformas</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {([
                  { value: "instagram", label: "Instagram", icon: "📸" },
                  { value: "linkedin",  label: "LinkedIn",  icon: "💼" },
                  { value: "tiktok",    label: "TikTok",    icon: "🎵" },
                ] as const).map(({ value, label, icon }) => {
                  const isSelected = (currentPost.platforms ?? []).includes(value);
                  return (
                    <button key={value} onClick={() => {
                      const current = currentPost.platforms ?? [];
                      void save({ platforms: isSelected ? current.filter(v => v !== value) : [...current, value] });
                    }} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                      fontFamily: "inherit", fontSize: ".75rem", fontWeight: 600,
                      background: isSelected ? `${caseData.color}22` : "var(--ws-surface2)",
                      color: isSelected ? caseData.color : "var(--ws-text3)",
                      outline: isSelected ? `2px solid ${caseData.color}` : "1px solid var(--ws-border)",
                      transition: "all .15s",
                    }}>
                      <span>{icon}</span> {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (currentPost.platforms ?? []).length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Plataformas</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {([
                  { value: "instagram", label: "Instagram", icon: "📸" },
                  { value: "linkedin",  label: "LinkedIn",  icon: "💼" },
                  { value: "tiktok",    label: "TikTok",    icon: "🎵" },
                ] as const).filter(({ value }) => (currentPost.platforms ?? []).includes(value)).map(({ value, label, icon }) => (
                  <div key={value} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 20,
                    fontFamily: "inherit", fontSize: ".75rem", fontWeight: 600,
                    background: `${caseData.color}22`, color: caseData.color,
                    outline: `2px solid ${caseData.color}`,
                  }}>
                    <span>{icon}</span> {label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!readonly && <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Data de agendamento</div>
            <input type="date" className="ws-input" value={scheduledDateValue}
              onChange={e => {
                const newDate = e.target.value;
                const time = scheduledTimeValue || "09:00";
                void save({ scheduled_date: newDate ? `${newDate}T${time}:00` : null });
              }} style={{ fontSize: ".8rem", marginBottom: 6 }} />
            <input type="time" className="ws-input" value={scheduledTimeValue}
              onChange={e => {
                const newTime = e.target.value;
                const date = scheduledDateValue || new Date().toISOString().slice(0, 10);
                void save({ scheduled_date: `${date}T${newTime}:00` });
              }} style={{ fontSize: ".8rem" }} />
          </div>}

          {!readonly && <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Data de entrega</div>
            <input type="date" className="ws-input" value={currentPost.due_date || ""}
              onChange={e => void save({ due_date: e.target.value })} style={{ fontSize: ".8rem" }} />
          </div>}

          {!readonly && <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Tipo de conteúdo</div>
            <select className="ws-input" value={currentPost.media_type}
              onChange={e => void save({ media_type: e.target.value as Post["media_type"] })} style={{ fontSize: ".8rem" }}>
              <option value="feed">Feed (4:5 · 1080×1350)</option>
              <option value="stories">Stories (9:16 · 1080×1920)</option>
              <option value="reels">Reels (9:16 · 1080×1920)</option>
              <option value="carousel">Carrossel (1:1 · 1080×1080)</option>
            </select>
          </div>}

          <div style={{ padding: "10px 12px", background: "var(--ws-surface2)", borderRadius: 8, fontSize: ".73rem", color: "var(--ws-text3)", lineHeight: 1.6 }}>
            {currentPost.media_type === "feed" && "📐 1080 × 1350 px — Feed"}
            {currentPost.media_type === "stories" && "📐 1080 × 1920 px — Stories"}
            {currentPost.media_type === "reels" && "📐 1080 × 1920 px — Reels"}
            {currentPost.media_type === "carousel" && "📐 1080 × 1080 px — Carrossel"}
          </div>

          {allSlides.length > 1 && (
            <div style={{ marginTop: 20, padding: "10px 12px", background: "var(--ws-surface2)", borderRadius: 8, fontSize: ".73rem", color: "var(--ws-text3)", lineHeight: 1.8 }}>
              🎠 <b style={{ color: "var(--ws-text2)" }}>{allSlides.length} slides</b><br />
              Use ‹ › para navegar<br />
              Clique nas miniaturas abaixo da imagem
            </div>
          )}
        </div>
        </div>{/* fecha o container grid/flex */}
      </div>
    </div>
  );
}
