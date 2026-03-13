import { useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import RichEditor from "../RichEditor";
import { APPROVAL_STYLES, LABEL_COLORS } from "../constants";
import {
  closeBtnStyle,
  labelStyle,
  overlayStyle,
} from "../styles";
import {
  isVideoFile,
  normalizeWhatsAppPhone,
  parseDateAtNoon,
} from "../utils";
import type { Case, CheckItem, Comment, Post } from "../types";
import type { Profile } from "../../../../lib/supabaseClient";

interface PostDetailModalProps {
  post: Post;
  caseData: Case;
  onClose: () => void;
  onUpdate: (post: Post) => void;
  profile: Profile;
}

export default function PostDetailModal({
  post,
  caseData,
  onClose,
  onUpdate,
  profile,
}: PostDetailModalProps) {
  const [currentPost, setCurrentPost] = useState<Post>(post);
  const [editDesc, setEditDesc] = useState(false);
  const [newCheck, setNewCheck] = useState("");
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(updates: Partial<Post>) {
    const merged = { ...currentPost, ...updates };
    setCurrentPost(merged);

    const { data } = await supabase
      .from("posts")
      .update(merged)
      .eq("id", currentPost.id)
      .select()
      .single();

    if (data) {
      onUpdate(data);
      setCurrentPost(data);
    }
  }

  async function saveApproval(status: Post["approval_status"]) {
    setSaving(true);
    await save({ approval_status: status });
    setSaving(false);
  }

  function addCheckItem() {
    if (!newCheck.trim()) return;

    const nextItem: CheckItem = {
      id: Date.now().toString(),
      text: newCheck.trim(),
      done: false,
    };

    void save({
      checklist: [...(currentPost.checklist || []), nextItem],
    });

    setNewCheck("");
  }

  function toggleCheck(id: string) {
    void save({
      checklist: (currentPost.checklist || []).map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      ),
    });
  }

  function removeCheck(id: string) {
    void save({
      checklist: (currentPost.checklist || []).filter((item) => item.id !== id),
    });
  }

  function addComment() {
    if (!newComment.trim()) return;

    const nextComment: Comment = {
      id: Date.now().toString(),
      author: profile.name || "Você",
      text: newComment.trim(),
      created_at: new Date().toISOString(),
    };

    void save({
      comments: [...(currentPost.comments || []), nextComment],
    });

    setNewComment("");
  }

  function sendToWhatsApp() {
    const phone = normalizeWhatsAppPhone(caseData.phone);
    if (!phone) return;

    const statusMessages: Record<Post["approval_status"], string> = {
      pendente: `Olá! 👋\n\nTemos o conteúdo "${currentPost.title || currentPost.slug || "Post"}" aguardando sua aprovação.\n\nAcesse: https://www.digitalmentehub.com.br/workspace`,
      aprovado: `Olá! 👋\n\nO conteúdo "${currentPost.title || currentPost.slug || "Post"}" foi aprovado! ✅`,
      reprovado: `Olá! 👋\n\nSobre o conteúdo "${currentPost.title || currentPost.slug || "Post"}", vamos ajustar. Podemos conversar?`,
      alteracao: `Olá! 👋\n\nRecebemos seu pedido de alteração em "${currentPost.title || currentPost.slug || "Post"}". Vamos alinhar?`,
    };

    const message = encodeURIComponent(
      statusMessages[currentPost.approval_status] || statusMessages.pendente
    );

    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  }

  const approval = APPROVAL_STYLES[currentPost.approval_status];
  const doneCount = (currentPost.checklist || []).filter((item) => item.done).length;
  const totalCheck = (currentPost.checklist || []).length;

  const aspectRatio =
    currentPost.media_type === "feed"
      ? "4 / 5"
      : currentPost.media_type === "carousel"
      ? "1 / 1"
      : "9 / 16";

  const isVideo = isVideoFile(currentPost.media_url);
  const scheduledDate = parseDateAtNoon(currentPost.scheduled_date);

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        style={{
          background: "var(--ws-surface)",
          borderRadius: 16,
          width: "min(860px,95vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid var(--ws-border2)",
          boxShadow: "0 30px 80px #00000070",
          display: "grid",
          gridTemplateColumns: "1fr 280px",
        }}
      >
        <div style={{ padding: "28px 24px", borderRight: "1px solid var(--ws-border)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              {currentPost.label_color && (
                <div
                  style={{
                    width: 40,
                    height: 6,
                    borderRadius: 3,
                    background: currentPost.label_color,
                    marginBottom: 8,
                  }}
                />
              )}

              <div
                style={{
                  fontFamily: "Syne",
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  color: "var(--ws-text)",
                  marginBottom: 4,
                }}
              >
                {currentPost.slug || currentPost.title || "Post"}
              </div>

              {currentPost.title && currentPost.slug && (
                <div
                  style={{
                    fontSize: ".82rem",
                    color: "var(--ws-text3)",
                    marginBottom: 4,
                  }}
                >
                  {currentPost.title}
                </div>
              )}

              <div
                style={{
                  fontSize: ".72rem",
                  color: "var(--ws-text3)",
                  fontFamily: "DM Mono",
                }}
              >
                {scheduledDate
                  ? scheduledDate.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "Sem data"}
              </div>
            </div>

            <button onClick={onClose} style={closeBtnStyle}>
              ×
            </button>
          </div>

          {currentPost.media_url && (
            <div
              style={{
                marginBottom: 20,
                borderRadius: 10,
                overflow: "hidden",
                background: "#000",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
              }}
            >
              {isVideo ? (
                <video
                  src={currentPost.media_url}
                  controls
                  style={{
                    width: "100%",
                    aspectRatio,
                    objectFit: "contain",
                    maxHeight: 400,
                    display: "block",
                  }}
                />
              ) : (
                <img
                  src={currentPost.media_url}
                  alt={currentPost.title || currentPost.slug || "Post"}
                  style={{
                    width: "100%",
                    aspectRatio,
                    objectFit: "contain",
                    maxHeight: 400,
                    display: "block",
                  }}
                />
              )}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Status de aprovação</div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: approval.bg,
                color: approval.color,
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: ".78rem",
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              {currentPost.approval_status === "aprovado"
                ? "✓"
                : currentPost.approval_status === "reprovado"
                ? "✕"
                : currentPost.approval_status === "alteracao"
                ? "⚠"
                : "◷"}{" "}
              {approval.label}
            </div>

            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {(["aprovado", "reprovado", "alteracao"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => void saveApproval(status)}
                  disabled={saving}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: ".78rem",
                    fontWeight: 600,
                    background: APPROVAL_STYLES[status].bg,
                    color: APPROVAL_STYLES[status].color,
                    opacity: currentPost.approval_status === status ? 1 : 0.6,
                    outline:
                      currentPost.approval_status === status
                        ? `2px solid ${APPROVAL_STYLES[status].color}`
                        : "none",
                    transition: "all .15s",
                  }}
                >
                  {status === "aprovado"
                    ? "✓ Aprovar"
                    : status === "reprovado"
                    ? "✕ Reprovar"
                    : "⚠ Alteração"}
                </button>
              ))}
            </div>
          </div>

          {!!caseData.phone && (
            <div style={{ marginTop: 12, marginBottom: 16 }}>
              <button
                onClick={sendToWhatsApp}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  backgroundColor: "#25D366",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: ".78rem",
                  fontWeight: 600,
                }}
              >
                Enviar via WhatsApp
              </button>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Descrição</div>

            {editDesc ? (
              <div>
                <RichEditor
                  value={currentPost.description || ""}
                  onChange={(value) =>
                    setCurrentPost((prev) => ({ ...prev, description: value }))
                  }
                  placeholder="Descrição detalhada..."
                />

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      void save({ description: currentPost.description });
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
                {currentPost.description ? (
                  <div
                    style={{
                      fontSize: ".84rem",
                      color: "var(--ws-text)",
                      lineHeight: 1.7,
                    }}
                    dangerouslySetInnerHTML={{ __html: currentPost.description }}
                    className="ws-richtext"
                  />
                ) : (
                  <div style={{ fontSize: ".82rem", color: "var(--ws-text3)" }}>
                    Clique para adicionar descrição...
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>Legenda</div>
            <div
              style={{
                fontSize: ".84rem",
                color: "var(--ws-text)",
                lineHeight: 1.7,
                background: "var(--ws-surface2)",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              {currentPost.caption || "—"}
            </div>
          </div>

          {currentPost.hashtags && (
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Hashtags</div>
              <div
                style={{
                  fontSize: ".8rem",
                  color: caseData.color,
                  lineHeight: 1.7,
                  background: `${caseData.color}11`,
                  borderRadius: 8,
                  padding: "8px 14px",
                  wordBreak: "break-word",
                }}
              >
                {currentPost.hashtags}
              </div>
            </div>
          )}

          {currentPost.extra_info && (
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Informações extras</div>
              <div
                style={{
                  fontSize: ".82rem",
                  color: "var(--ws-text2)",
                  lineHeight: 1.65,
                }}
              >
                {currentPost.extra_info}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>
              Checklist {totalCheck > 0 && `(${doneCount}/${totalCheck})`}
            </div>

            {totalCheck > 0 && (
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
                    width: `${(doneCount / totalCheck) * 100}%`,
                    transition: "width .3s",
                  }}
                />
              </div>
            )}

            {(currentPost.checklist || []).map((item) => (
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

            {(currentPost.comments || []).map((comment) => (
              <div key={comment.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
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

        <div style={{ padding: "28px 18px" }}>
          <div style={labelStyle}>Ações</div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Etiqueta</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LABEL_COLORS.map((color) => (
                <div
                  key={color}
                  onClick={() =>
                    void save({
                      label_color: currentPost.label_color === color ? "" : color,
                    })
                  }
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: color,
                    cursor: "pointer",
                    border:
                      currentPost.label_color === color
                        ? "3px solid white"
                        : "3px solid transparent",
                    boxShadow:
                      currentPost.label_color === color
                        ? `0 0 0 2px ${color}`
                        : "none",
                    transition: "all .15s",
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Data de entrega</div>
            <input
              type="date"
              className="ws-input"
              value={currentPost.due_date || ""}
              onChange={(e) => void save({ due_date: e.target.value })}
              style={{ fontSize: ".8rem" }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Tipo de conteúdo</div>
            <select
              className="ws-input"
              value={currentPost.media_type}
              onChange={(e) =>
                void save({ media_type: e.target.value as Post["media_type"] })
              }
              style={{ fontSize: ".8rem" }}
            >
              <option value="feed">Feed (4:5 · 1080×1350)</option>
              <option value="stories">Stories (9:16 · 1080×1920)</option>
              <option value="reels">Reels (9:16 · 1080×1920)</option>
              <option value="carousel">Carrossel (1:1 · 1080×1080)</option>
            </select>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "var(--ws-surface2)",
              borderRadius: 8,
              fontSize: ".73rem",
              color: "var(--ws-text3)",
              lineHeight: 1.6,
            }}
          >
            {currentPost.media_type === "feed" && "📐 1080 × 1350 px — Feed"}
            {currentPost.media_type === "stories" && "📐 1080 × 1920 px — Stories"}
            {currentPost.media_type === "reels" && "📐 1080 × 1920 px — Reels"}
            {currentPost.media_type === "carousel" && "📐 1080 × 1080 px — Carrossel"}
          </div>
        </div>
      </div>
    </div>
  );
}
