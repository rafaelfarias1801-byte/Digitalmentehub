import React, { useState, useRef } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import RichEditor from "../RichEditor";
import { APPROVAL_STYLES, LABEL_COLORS } from "../constants";
import { closeBtnStyle, labelStyle, overlayStyle } from "../styles";
import { isVideoFile, normalizeWhatsAppPhone, parseDateAtNoon } from "../utils";
import type { Case, CheckItem, Comment, Post } from "../types";
import type { Profile } from "../../../../lib/supabaseClient";
import { decodeExtraUrls, stripMediaTag, encodeExtraUrls } from "../tabs/TabConteudo";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { notifyAdmins, notifyClientByCase } from "../../../utils/notifyPush";

// Componente interno para Informações extras
function ExtraInfoSection({ extraInfo, readonly, color, onSave }: {
  extraInfo?: string | null;
  readonly: boolean;
  color: string;
  onSave: (text: string) => void;
}) {
  const text = stripMediaTag(extraInfo);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  if (!text && readonly) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontFamily: "Poppins", fontSize: ".58rem", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--ws-text2)", display: "block" }}>
          Informações extras
        </div>
        {!readonly && !editing && (
          <button onClick={() => { setDraft(text); setEditing(true); }}
            style={{ background: "none", border: "none", color, cursor: "pointer", fontSize: ".75rem", fontFamily: "inherit", fontWeight: 600 }}>
            ✏ Editar
          </button>
        )}
      </div>
      {editing ? (
        <div>
          <textarea className="ws-input" value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="Briefing, referências, observações..." autoFocus
            style={{ minHeight: 80, resize: "vertical", fontSize: ".84rem", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { onSave(draft); setEditing(false); }}
              style={{ background: color, border: "none", borderRadius: 6, color: "#fff", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>
              Salvar
            </button>
            <button onClick={() => setEditing(false)}
              style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "10px 12px", fontSize: ".82rem", color: "var(--ws-text2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {text || <span style={{ color: "var(--ws-text3)", fontStyle: "italic" }}>Sem informações extras</span>}
        </div>
      )}
    </div>
  );
}

interface PostDetailModalProps {
  post: Post;
  caseData: Case;
  onClose: () => void;
  onUpdate: (post: Post) => void;
  profile: Profile;
  readonly?: boolean;
  /** When true, renders inline (no fixed overlay) — navigated via URL */
  inline?: boolean;
}

export default function PostDetailModal({ post, caseData, onClose, onUpdate, profile, readonly = false, inline = false }: PostDetailModalProps) {
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
  const [rejectionReason, setRejectionReason] = useState(currentPost.rejection_reason || "");
  const [rejectionInput, setRejectionInput] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState<Post["approval_status"] | null>(null);
  const [editingReason, setEditingReason] = useState(false);
  const [editReasonInput, setEditReasonInput] = useState("");
  const [confirmApproval, setConfirmApproval] = useState(false);
  const [editSlug, setEditSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState(currentPost.slug || "");
  const [editTitle, setEditTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(currentPost.title || "");
  const [fullscreenSlide, setFullscreenSlide] = useState(false);
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

  // Histórico de motivos — backward compat: se não há array, usa rejection_reason avulso
  const rejectionHistory: Array<{ reason: string; type: string; created_at: string }> =
    Array.isArray(currentPost.rejection_history) && currentPost.rejection_history.length > 0
      ? currentPost.rejection_history
      : currentPost.rejection_reason
        ? [{ reason: currentPost.rejection_reason, type: currentPost.approval_status, created_at: currentPost.rejection_reason_at || "" }]
        : [];

  // Renderiza lista numerada de motivos
  function renderHistory(isActive: boolean, showEdit = false) {
    if (rejectionHistory.length === 0) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {rejectionHistory.map((item, i) => {
          const isLatest = i === rejectionHistory.length - 1;
          const color = item.type === "reprovado" ? "#ef4444" : "#f59e0b";
          const bg    = item.type === "reprovado" ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)";
          const hl    = isLatest && isActive;
          return (
            <div key={i} style={{
              border: `2px solid ${hl ? color : "var(--ws-border2)"}`,
              background: hl ? bg : "transparent",
              borderRadius: 10, padding: "10px 12px",
              fontSize: ".78rem", lineHeight: 1.5,
              opacity: !isLatest ? 0.7 : 1,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <b style={{ color: hl ? color : "var(--ws-text2)", fontSize: ".72rem", letterSpacing: ".3px" }}>
                    {item.type === "reprovado" ? "✕" : "⚠"}{" "}
                    Motivo {i + 1}{rejectionHistory.length > 1 ? ` de ${rejectionHistory.length}` : ""} — {item.type === "reprovado" ? "Reprovação" : "Alteração solicitada"}
                  </b>
                  <div style={{ marginTop: 4, color: "var(--ws-text)" }}>{item.reason}</div>
                </div>
                {showEdit && isLatest && (
                  <button onClick={() => { setEditReasonInput(item.reason); setEditingReason(true); }}
                    style={{ background: "none", border: "none", color: hl ? color : "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", fontFamily: "inherit", fontWeight: 600, flexShrink: 0 }}>
                    ✏ Editar
                  </button>
                )}
              </div>
              {item.created_at && (
                <div style={{ color: "var(--ws-text3)", fontSize: ".68rem", marginTop: 4 }}>
                  {new Date(item.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Salvar ──────────────────────────────────────────────────────
  async function save(updates: Partial<Post>) {
    const merged = { ...currentPost, ...updates };
    setCurrentPost(merged); // atualização otimista imediata
    const { data, error } = await supabase
      .from("posts")
      .update(updates)           // envia APENAS os campos alterados
      .eq("id", currentPost.id)
      .select()
      .single();
    if (error) console.error("[PostDetailModal] save error:", error);
    if (data) { onUpdate(data); setCurrentPost(data); }
  }

  async function saveApproval(status: Post["approval_status"]) {
    setSaving(true);
    await save({ approval_status: status, status_changed_at: new Date().toISOString() });

    // Notifica admin se for ação do cliente
    if (profile.role === "cliente") {
      const postTitle = currentPost.slug || currentPost.title || "Post";
      const caseName = caseData.name;
      const postMeta = { case_name: caseName, post_title: postTitle, case_id: caseData.id, post_id: currentPost.id, source: "cliente" as const };
      if (status === "aprovado") {
        void notifyAdmins({ type: "cliente_aprovacao", title: `✅ ${caseName} aprovou um post`, body: `"${postTitle}" foi aprovado. Acesse o Workspace.`, ...postMeta } as any);
      } else if (status === "reprovado") {
        void notifyAdmins({ type: "cliente_reprovacao", title: `❌ ${caseName} reprovou um post`, body: `"${postTitle}" foi reprovado.`, ...postMeta } as any);
      } else if (status === "alteracao") {
        void notifyAdmins({ type: "cliente_alteracao", title: `⚠️ ${caseName} solicitou alteração`, body: `"${postTitle}" precisa de ajustes.`, ...postMeta } as any);
      }
    }
    setSaving(false);
  }

  async function saveApprovalWithReason(status: Post["approval_status"], reason: string, isEdit = false) {
    setSaving(true);
    const now = new Date().toISOString();
    // Gerencia histórico numerado
    const existing: Array<{ reason: string; type: string; created_at: string }> =
      Array.isArray(currentPost.rejection_history) ? [...currentPost.rejection_history] : [];
    let newHistory: typeof existing;
    if (isEdit && existing.length > 0) {
      // Editar o último motivo sem criar novo
      newHistory = [...existing];
      newHistory[newHistory.length - 1] = { ...newHistory[newHistory.length - 1], reason, created_at: now };
    } else {
      // Novo motivo — acrescenta ao histórico
      newHistory = [...existing, { reason, type: status, created_at: now }];
    }
    await save({ approval_status: status, rejection_reason: reason, rejection_reason_at: now, rejection_history: newHistory, status_changed_at: now });
    setRejectionReason(reason);
    setShowRejectionInput(null);
    setRejectionInput("");
    setEditingReason(false);
    setEditReasonInput("");

    // Notifica admin quando cliente reprova ou solicita alteração
    if (profile.role === "cliente") {
      const postTitle = currentPost.slug || currentPost.title || "Post";
      const caseName = caseData.name;
      if (status === "reprovado") {
        void notifyAdmins({ type: "cliente_reprovacao", title: `❌ ${caseName} reprovou um post`, body: `"${postTitle}" foi reprovado: ${reason.slice(0, 80)}`, case_name: caseName, post_title: postTitle, reason, case_id: caseData.id, post_id: currentPost.id, source: "cliente" } as any);
      } else if (status === "alteracao") {
        void notifyAdmins({ type: "cliente_alteracao", title: `⚠️ ${caseName} solicitou alteração`, body: `"${postTitle}": ${reason.slice(0, 80)}`, case_name: caseName, post_title: postTitle, reason, case_id: caseData.id, post_id: currentPost.id, source: "cliente" } as any);
      }
    }
    setSaving(false);
  }

  // ── Enviar para nova aprovação (admin) ──────────────────────────
  async function sendForReapproval() {
    setSaving(true);
    const postTitle = currentPost.slug || currentPost.title || "Post";
    await save({
      approval_status: "pendente_alteracao",
      status_changed_at: new Date().toISOString(),
    });
    void notifyClientByCase({
      type: "ajuste_concluido",
      case_id: caseData.id,
      case_name: caseData.name,
      post_title: postTitle,
      post_id: currentPost.id,
      title: `✅ ${caseData.name} — post revisado!`,
      body: `Os ajustes em "${postTitle}" foram feitos. Por favor, revise e aprove.`,
    });
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

    // Notifica admin quando cliente comenta
    if (profile.role === "cliente") {
      const postTitle = currentPost.slug || currentPost.title || "Post";
      void notifyAdmins({ type: "cliente_comentario_post", title: `💬 ${caseData.name} comentou em um post`, body: `"${postTitle}": ${newComment.trim().slice(0, 80)}`, case_name: caseData.name, post_title: postTitle, comment: newComment.trim(), case_id: caseData.id, post_id: currentPost.id, source: "cliente" as const } as any);
    }
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

  const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";

  // Converte PNG → JPG via canvas antes do upload
  async function normalizeImageFile(file: File): Promise<{ file: File; ext: string }> {
    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    if (!isPng) return { file, ext: file.name.split(".").pop() ?? "jpg" };
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => {
          if (!blob) { resolve({ file, ext: "png" }); return; }
          resolve({ file: new File([blob], file.name.replace(/\.png$/i, ".jpg"), { type: "image/jpeg" }), ext: "jpg" });
        }, "image/jpeg", 0.92);
      };
      img.src = url;
    });
  }

  async function deleteFromR2(url: string) {
    if (!url.startsWith(R2_PUBLIC_URL)) return;
    const filename = url.replace(R2_PUBLIC_URL + "/", "");
    await supabase.functions.invoke("delete-r2-file", { body: { filename } });
  }

  async function removeSlide(idx: number) {
    if (!window.confirm("Remover esta mídia do post?")) return;
    const urlToRemove = allSlides[idx];
    const newSlides = allSlides.filter((_, i) => i !== idx);
    const newMediaUrl = newSlides[0] ?? "";
    const newMediaUrls = newSlides;
    const userText = stripMediaTag(currentPost.extra_info);
    const extraUrls = newSlides.slice(1);
    const newExtraInfo = encodeExtraUrls(extraUrls, userText);
    await save({ media_url: newMediaUrl, media_urls: newMediaUrls, extra_info: newExtraInfo });
    setSlideIdx(Math.min(idx, newSlides.length - 1));
    void deleteFromR2(urlToRemove);
  }

  const [uploadingSlide, setUploadingSlide] = useState(false);
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);
  const slideFileRef = { current: null as HTMLInputElement | null };
  const replaceFileRef = { current: null as HTMLInputElement | null };
  const dragSlideIdx = useRef<number | null>(null);
  const [dragOverSlideIdx, setDragOverSlideIdx] = useState<number | null>(null);

  async function reorderSlides(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const newSlides = [...allSlides];
    const [moved] = newSlides.splice(fromIdx, 1);
    newSlides.splice(toIdx, 0, moved);
    const newMediaUrl = newSlides[0] ?? "";
    const userText = stripMediaTag(currentPost.extra_info);
    const extraUrls = newSlides.slice(1);
    const newExtraInfo = encodeExtraUrls(extraUrls, userText);
    await save({ media_url: newMediaUrl, media_urls: newSlides, extra_info: newExtraInfo });
    setSlideIdx(toIdx);
  }

  async function replaceSlide(idx: number, files: FileList) {
    if (readonly || !files[0]) return;
    setUploadingSlide(true);
    const { file, ext } = await normalizeImageFile(files[0]);
    const filename = `posts/${caseData.id}/${Date.now()}-0.${ext}`;
    const { data, error } = await supabase.functions.invoke("get-r2-upload-url", {
      body: { filename, contentType: file.type },
    });
    if (!error && data?.signedUrl) {
      const res = await fetch(data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (res.ok) {
        const oldUrl = allSlides[idx];
        const newSlides = [...allSlides];
        newSlides[idx] = `${R2_PUBLIC_URL}/${filename}`;
        const newMediaUrl = newSlides[0] ?? "";
        const userText = stripMediaTag(currentPost.extra_info);
        const extraUrls = newSlides.slice(1);
        const newExtraInfo = encodeExtraUrls(extraUrls, userText);
        await save({ media_url: newMediaUrl, media_urls: newSlides, extra_info: newExtraInfo });
        void deleteFromR2(oldUrl);
      }
    }
    setReplacingIdx(null);
    setUploadingSlide(false);
  }

  const CAROUSEL_MAX = 10;

  async function addSlides(files: FileList) {
    if (readonly) return;

    // Limite do Instagram: máximo 10 itens por carrossel
    const slotsLeft = CAROUSEL_MAX - allSlides.length;
    if (slotsLeft <= 0) {
      alert(`Limite atingido! O Instagram permite no máximo ${CAROUSEL_MAX} fotos/vídeos por carrossel.`);
      return;
    }
    const filesToUpload = Array.from(files).slice(0, slotsLeft);
    if (filesToUpload.length < files.length) {
      alert(`Apenas ${filesToUpload.length} arquivo(s) serão adicionados. O carrossel já tem ${allSlides.length} itens e o limite é ${CAROUSEL_MAX}.`);
    }

    setUploadingSlide(true);
    const uploaded: string[] = [];
    for (let i = 0; i < filesToUpload.length; i++) {
      const { file, ext } = await normalizeImageFile(filesToUpload[i]);
      const filename = `posts/${caseData.id}/${Date.now()}-${i}.${ext}`;
      const { data, error } = await supabase.functions.invoke("get-r2-upload-url", {
        body: { filename, contentType: file.type },
      });
      if (error || !data?.signedUrl) continue;
      const res = await fetch(data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (res.ok) uploaded.push(`${R2_PUBLIC_URL}/${filename}`);
    }
    if (uploaded.length > 0) {
      const newSlides = [...allSlides, ...uploaded];
      const newMediaUrl = newSlides[0] ?? "";
      const userText = stripMediaTag(currentPost.extra_info);
      const extraUrls = newSlides.slice(1);
      const newExtraInfo = encodeExtraUrls(extraUrls, userText);
      await save({ media_url: newMediaUrl, media_urls: newSlides, extra_info: newExtraInfo });
    }
    setUploadingSlide(false);
  }

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
  const rawTime = scheduledDate ? scheduledDate.toTimeString().slice(0, 5) : "";
  const scheduledTimeValue = ["12:00","15:00","18:00"].includes(rawTime) ? rawTime : "12:00";

  const innerBox = (
      <div style={{
        background: "var(--ws-surface)",
        borderRadius: inline ? 14 : (isMobile ? 0 : 16),
        ...(inline ? {} : isMobile ? {} : { width: "min(860px,95vw)" }),
        maxHeight: inline ? undefined : (isMobile ? "100dvh" : "90vh"),
        overflowY: inline ? undefined : (isMobile ? "hidden" : "auto"),
        border: "1px solid var(--ws-border2)",
        boxShadow: inline ? "none" : "0 30px 80px #00000070",
        display: "flex",
        flexDirection: "column",
        ...((!inline && isMobile) ? { position: "fixed", bottom: 0, left: 0, right: 0, top: 0, margin: 0 } : {}),
      }}>
        {/* Inline mode: sticky back bar */}
        {inline && (
          <div style={{ position: "sticky", top: 0, zIndex: 10, padding: "10px 16px", borderBottom: "1px solid var(--ws-border)", background: "var(--ws-surface)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".78rem", fontFamily: "Poppins", padding: 0, display: "flex", alignItems: "center", gap: 5 }}>
              ← Voltar
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".85rem", color: "var(--ws-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentPost.slug || currentPost.title || "Post"}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ws-text3)", fontSize: "1rem", lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
        )}

        {/* Mobile: tabs para admin / info de tipo+plataforma para cliente */}
        {isMobile && !inline && (
          readonly ? (
            /* Cliente: mostra tipo e plataformas no topo + botão fechar fixo */
            <div style={{ position: "sticky", top: 0, zIndex: 10, padding: "8px 16px", borderBottom: "1px solid var(--ws-border)", background: "var(--ws-surface2)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "Poppins", fontSize: ".65rem", fontWeight: 700, color: "var(--ws-text2)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  {currentPost.media_type === "feed" ? "Feed" : currentPost.media_type === "stories" ? "Stories" : currentPost.media_type === "reels" ? "Reels" : "Carrossel"}
                </span>
                {(currentPost.platforms ?? []).length > 0 && (
                  <>
                    <span style={{ color: "var(--ws-border2)" }}>·</span>
                    <span style={{ fontFamily: "Poppins", fontSize: ".65rem", color: "var(--ws-text3)" }}>
                      {(currentPost.platforms ?? []).map(p => p === "instagram" ? "Instagram" : p === "linkedin" ? "LinkedIn" : "TikTok").join(" · ")}
                    </span>
                  </>
                )}
              </div>
              <button onClick={onClose} style={{ ...closeBtnStyle, flexShrink: 0 }}>×</button>
            </div>
          ) : (
            <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", borderBottom: "1px solid var(--ws-border)", background: "var(--ws-surface2)", flexShrink: 0 }}>
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
              <button onClick={onClose} style={{ ...closeBtnStyle, margin: "auto 10px", flexShrink: 0 }}>×</button>
            </div>
          )
        )}

        {/* Conteúdo desktop: grid 2 colunas | mobile: só uma coluna visível */}
        <div style={{
          display: isMobile ? "block" : "grid",
          gridTemplateColumns: isMobile ? undefined : "1fr 280px",
          flex: 1,
          minHeight: 0,
          overflowY: isMobile ? "auto" : undefined,
          overscrollBehavior: isMobile ? "contain" : undefined,
          WebkitOverflowScrolling: "touch",
          paddingBottom: isMobile && profile.role === "admin" ? 70 : undefined,
        } as React.CSSProperties}>
        {/* ── Coluna principal ── */}
        <div style={{ padding: "20px 18px", boxSizing: "border-box", borderRight: isMobile ? "none" : "1px solid var(--ws-border)", display: isMobile && sidebarVisible ? "none" : "block", minWidth: 0, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              {currentPost.label_color && (
                <div style={{ width: 40, height: 6, borderRadius: 3, background: currentPost.label_color, marginBottom: 8 }} />
              )}
              {/* Nome no calendário — editável só pelo admin */}
              {!readonly && editSlug ? (
                <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <input className="ws-input" value={slugDraft} onChange={e => setSlugDraft(e.target.value)}
                    style={{ fontWeight: 800, fontSize: "1rem", flex: 1 }}
                    onKeyDown={e => { if (e.key === "Enter") { void save({ slug: slugDraft }); setEditSlug(false); } if (e.key === "Escape") setEditSlug(false); }} autoFocus />
                  <button onClick={() => { void save({ slug: slugDraft }); setEditSlug(false); }}
                    style={{ background: caseData.color, border: "none", borderRadius: 6, color: "#fff", padding: "6px 12px", cursor: "pointer", fontSize: ".8rem", flexShrink: 0 }}>✓</button>
                  <button onClick={() => setEditSlug(false)}
                    style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".8rem", flexShrink: 0 }}>✕</button>
                </div>
              ) : (
                <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.1rem", color: "var(--ws-text)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  {currentPost.slug || currentPost.title || "Post"}
                  {!readonly && (
                    <button onClick={() => { setSlugDraft(currentPost.slug || ""); setEditSlug(true); }}
                      style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".7rem", padding: 0 }}>✏</button>
                  )}
                </div>
              )}
              {/* Título/tema — editável só pelo admin */}
              {!readonly && editTitle ? (
                <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <input className="ws-input" value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                    style={{ fontSize: ".85rem", flex: 1 }}
                    onKeyDown={e => { if (e.key === "Enter") { void save({ title: titleDraft }); setEditTitle(false); } if (e.key === "Escape") setEditTitle(false); }} autoFocus />
                  <button onClick={() => { void save({ title: titleDraft }); setEditTitle(false); }}
                    style={{ background: caseData.color, border: "none", borderRadius: 6, color: "#fff", padding: "6px 12px", cursor: "pointer", fontSize: ".8rem", flexShrink: 0 }}>✓</button>
                  <button onClick={() => setEditTitle(false)}
                    style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".8rem", flexShrink: 0 }}>✕</button>
                </div>
              ) : (
                <div style={{ fontSize: ".82rem", color: "var(--ws-text3)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  {currentPost.title || <span style={{ color: "var(--ws-text3)", fontStyle: "italic" }}>Sem tema</span>}
                  {!readonly && (
                    <button onClick={() => { setTitleDraft(currentPost.title || ""); setEditTitle(true); }}
                      style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".7rem", padding: 0 }}>✏</button>
                  )}
                </div>
              )}
              <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>
                {scheduledDate ? scheduledDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) + " às " + scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Sem data"}
              </div>
              {/* Tipo + Plataformas — linha compacta abaixo da data */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "Poppins", fontSize: ".65rem", fontWeight: 700, color: caseData.color, textTransform: "uppercase", letterSpacing: ".5px" }}>
                  {currentPost.media_type === "feed" ? "Feed" : currentPost.media_type === "stories" ? "Stories" : currentPost.media_type === "reels" ? "Reels" : "Carrossel"}
                </span>
                {(currentPost.platforms ?? []).length > 0 && (
                  <>
                    <span style={{ color: "var(--ws-border2)", fontSize: ".65rem" }}>·</span>
                    <span style={{ fontFamily: "Poppins", fontSize: ".65rem", color: "var(--ws-text3)" }}>
                      {(currentPost.platforms ?? []).map((p: string) => p === "instagram" ? "📸 Instagram" : p === "linkedin" ? "💼 LinkedIn" : "🎵 TikTok").join("  ")}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ ...closeBtnStyle, display: isMobile ? "none" : "flex" }}>×</button>
          </div>

          {/* ── Visualizador de slides ── */}
          <div style={{ marginBottom: 20 }}>
            {allSlides.length > 0 ? (
              <>
                {/* Viewer principal */}
                <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000", marginBottom: allSlides.length > 1 ? 8 : 0, maxWidth: "100%" }}>
                  {isVideoFile(activeSlideUrl) ? (
                    <video src={activeSlideUrl} controls style={{ width: "100%", maxWidth: "100%", aspectRatio, objectFit: "contain", maxHeight: 420, display: "block" }} />
                  ) : (
                    <img src={activeSlideUrl} alt={`Slide ${slideIdx + 1}`}
                      style={{ width: "100%", maxWidth: "100%", aspectRatio, objectFit: "contain", maxHeight: 420, display: "block" }} />
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

                  {/* Botão expandir — canto inferior direito */}
                  <button onClick={() => setFullscreenSlide(true)} title="Abrir em tela cheia" style={{
                    position: "absolute", bottom: 8, right: 8,
                    background: "rgba(0,0,0,.6)", border: "none", borderRadius: "50%",
                    width: 32, height: 32, color: "#fff", cursor: "pointer",
                    fontSize: ".75rem", display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .15s",
                  }}>⤢</button>
                </div>
              </>
            ) : !readonly ? (
              /* Estado vazio — só admin vê, cliente não vê área de upload vazia */
              <div
                onClick={() => slideFileRef.current?.click()}
                style={{
                  height: 110, borderRadius: 10, border: "1px dashed var(--ws-border2)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", marginBottom: 8, background: "var(--ws-surface2)", gap: 6,
                  color: "var(--ws-text3)", fontSize: ".84rem",
                }}
              >
                🖼 Clique para enviar foto ou vídeo
              </div>
            ) : null}

            {/* Thumbnails + gerenciamento de mídias — sempre visível para admin enquanto houver slides ou ao adicionar */}
            {(!readonly) && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, alignItems: "center" }}>
                {allSlides.map((url, i) => (
                  <div key={i}
                    draggable
                    onDragStart={() => { dragSlideIdx.current = i; }}
                    onDragOver={e => { e.preventDefault(); setDragOverSlideIdx(i); }}
                    onDragEnd={() => { dragSlideIdx.current = null; setDragOverSlideIdx(null); }}
                    onDrop={e => { e.preventDefault(); if (dragSlideIdx.current !== null) void reorderSlides(dragSlideIdx.current, i); setDragOverSlideIdx(null); }}
                    style={{ position: "relative", flexShrink: 0 }}
                  >
                    {/* Número do slide */}
                    <div style={{ position: "absolute", bottom: 2, left: 2, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: ".45rem", fontFamily: "Poppins", borderRadius: 3, padding: "1px 3px", lineHeight: 1, zIndex: 5, pointerEvents: "none" }}>{i + 1}</div>
                    <div onClick={() => setSlideIdx(i)} style={{
                      width: 44, height: 44, borderRadius: 6, overflow: "hidden",
                      border: dragOverSlideIdx === i ? `2px solid #fff` : i === slideIdx ? `2px solid ${caseData.color}` : "2px solid transparent",
                      cursor: "grab", opacity: dragSlideIdx.current === i ? 0.4 : i === slideIdx ? 1 : 0.55, transition: "all .15s",
                    }}>
                      {isVideoFile(url)
                        ? <video src={url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <img src={url} alt={`thumb ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      }
                    </div>
                    {/* Botão remover */}
                    <button onClick={e => { e.stopPropagation(); void removeSlide(i); }} title="Remover mídia"
                      style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "#ff4433", border: "none", color: "#fff", cursor: "pointer", fontSize: ".55rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, lineHeight: 1, zIndex: 5 }}
                    >×</button>
                    {/* Botão substituir — aparece na thumbnail ativa */}
                    {i === slideIdx && (
                      <button onClick={e => { e.stopPropagation(); setReplacingIdx(i); replaceFileRef.current?.click(); }} title="Substituir imagem"
                        style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 16, height: 16, borderRadius: "50%", background: caseData.color, border: "none", color: "#fff", cursor: "pointer", fontSize: ".5rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, zIndex: 5 }}
                      >↺</button>
                    )}
                  </div>
                ))}

                {/* Botão adicionar mídia — oculto quando limite atingido */}
                <button onClick={() => slideFileRef.current?.click()} disabled={uploadingSlide || allSlides.length >= CAROUSEL_MAX} title={allSlides.length >= CAROUSEL_MAX ? `Limite de ${CAROUSEL_MAX} itens atingido` : "Adicionar mídia"}
                  style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 6, border: "1px dashed var(--ws-border2)", background: "var(--ws-surface2)", color: allSlides.length >= CAROUSEL_MAX ? "var(--ws-border2)" : "var(--ws-text3)", cursor: allSlides.length >= CAROUSEL_MAX ? "not-allowed" : "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", opacity: allSlides.length >= CAROUSEL_MAX ? 0.4 : 1 }}
                >{uploadingSlide ? "⏳" : "+"}</button>
                <input ref={el => { slideFileRef.current = el; }} type="file" accept="image/*,video/*" multiple style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.length) void addSlides(e.target.files); e.target.value = ""; }} />
                {/* Input para substituição */}
                <input ref={el => { replaceFileRef.current = el; }} type="file" accept="image/*,video/*" style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.length && replacingIdx !== null) void replaceSlide(replacingIdx, e.target.files); e.target.value = ""; }} />
              </div>
            )}

            {/* Thumbnails readonly — cliente só vê as miniaturas sem botões de ação */}
            {readonly && allSlides.length > 1 && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, alignItems: "center" }}>
                {allSlides.map((url, i) => (
                  <div key={i} onClick={() => setSlideIdx(i)} style={{
                    width: 44, height: 44, borderRadius: 6, overflow: "hidden", flexShrink: 0,
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

          {/* ── Lightbox fullscreen ── */}
          {fullscreenSlide && (
            <div onClick={() => setFullscreenSlide(false)} style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "#000",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {/* Botão X fixo no topo */}
              <button onClick={() => setFullscreenSlide(false)} style={{
                position: "fixed", top: 16, right: 16, zIndex: 10000,
                background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%",
                width: 40, height: 40, color: "#fff", fontSize: "1.2rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>×</button>

              {/* Setas navegação no fullscreen */}
              {allSlides.length > 1 && (
                <>
                  <button onClick={e => { e.stopPropagation(); prevSlide(); }} disabled={slideIdx === 0} style={{
                    position: "fixed", left: 12, top: "50%", transform: "translateY(-50%)",
                    background: slideIdx === 0 ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.2)",
                    border: "none", borderRadius: "50%", width: 44, height: 44,
                    color: "#fff", cursor: slideIdx === 0 ? "default" : "pointer",
                    fontSize: "1.3rem", display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 10000,
                  }}>‹</button>
                  <button onClick={e => { e.stopPropagation(); nextSlide(); }} disabled={slideIdx === allSlides.length - 1} style={{
                    position: "fixed", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: slideIdx === allSlides.length - 1 ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.2)",
                    border: "none", borderRadius: "50%", width: 44, height: 44,
                    color: "#fff", cursor: slideIdx === allSlides.length - 1 ? "default" : "pointer",
                    fontSize: "1.3rem", display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 10000,
                  }}>›</button>
                  <div style={{
                    position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
                    background: "rgba(255,255,255,.15)", borderRadius: 20, padding: "4px 12px",
                    color: "#fff", fontSize: ".7rem", fontFamily: "Poppins", zIndex: 10000,
                  }}>{slideIdx + 1} / {allSlides.length}</div>
                </>
              )}

              {/* Mídia */}
              {isVideoFile(activeSlideUrl) ? (
                <video src={activeSlideUrl} controls onClick={e => e.stopPropagation()}
                  style={{ maxWidth: "100vw", maxHeight: "100vh", objectFit: "contain" }} />
              ) : (
                <img src={activeSlideUrl} alt={`Slide ${slideIdx + 1}`} onClick={e => e.stopPropagation()}
                  style={{ maxWidth: "100vw", maxHeight: "100vh", objectFit: "contain" }} />
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
              {currentPost.approval_status === "aprovado" ? "✓" : currentPost.approval_status === "reprovado" ? "✕" : currentPost.approval_status === "alteracao" ? "⚠" : currentPost.approval_status === "agendado" ? "🗓" : currentPost.approval_status === "postado" ? "✅" : currentPost.approval_status === "pendente_alteracao" ? "📤" : "◷"}{" "}
              {approval.label}
            </div>

            {/* Bloqueado para todos — postado */}
            {isPostado ? (
              <div style={{ fontSize: ".75rem", color: "var(--ws-text3)", background: "var(--ws-surface2)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                ✅ Post publicado — não é possível alterar o status.
              </div>

            ) : readonly ? (
              /* ── CLIENTE ── */
              isLocked ? (
                <div style={{ fontSize: ".75rem", color: "var(--ws-text3)", background: "var(--ws-surface2)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                  🔒 Você já aprovou este post.
                </div>
              ) : currentPost.approval_status === "agendado" ? (
                <div style={{ fontSize: ".75rem", color: "#4b6bff", background: "rgba(75,100,255,0.1)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                  🗓 Post agendado — será publicado no horário definido.
                </div>
              ) : confirmApproval ? (
                /* Confirmação de aprovação */
                <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "12px", marginTop: 4 }}>
                  <div style={{ fontSize: ".82rem", color: "var(--ws-text)", marginBottom: 10 }}>
                    Confirmar <b style={{ color: APPROVAL_STYLES["aprovado"].color }}>aprovação</b> deste post?
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={async () => { await saveApproval("aprovado"); setConfirmApproval(false); }} disabled={saving}
                      style={{ background: APPROVAL_STYLES["aprovado"].bg, color: APPROVAL_STYLES["aprovado"].color, border: `1px solid ${APPROVAL_STYLES["aprovado"].color}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600 }}>
                      ✓ Confirmar aprovação
                    </button>
                    <button onClick={() => setConfirmApproval(false)}
                      style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : showRejectionInput ? (
                /* Digitando motivo novo */
                <div style={{
                  borderRadius: 10, padding: "12px", marginTop: 4,
                  border: `2px solid ${showRejectionInput === "reprovado" ? "#ef4444" : "#f59e0b"}`,
                  background: showRejectionInput === "reprovado" ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.05)",
                }}>
                  <div style={{ fontSize: ".78rem", color: showRejectionInput === "reprovado" ? "#ef4444" : "#f59e0b", marginBottom: 8, fontWeight: 600 }}>
                    {showRejectionInput === "reprovado" ? "✕ Descreva o motivo da reprovação:" : "⚠ Descreva o que precisa ser alterado:"}
                  </div>
                  <textarea className="ws-input" value={rejectionInput} onChange={e => setRejectionInput(e.target.value)}
                    placeholder="Descreva o motivo..." autoFocus
                    style={{ minHeight: 80, resize: "vertical", fontSize: ".83rem", marginBottom: 8, borderColor: showRejectionInput === "reprovado" ? "#ef4444" : "#f59e0b" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => void saveApprovalWithReason(showRejectionInput, rejectionInput)} disabled={saving || !rejectionInput.trim()}
                      style={{ background: APPROVAL_STYLES[showRejectionInput].bg, color: APPROVAL_STYLES[showRejectionInput].color, border: `1px solid ${APPROVAL_STYLES[showRejectionInput].color}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600 }}>
                      Confirmar
                    </button>
                    <button onClick={() => { setShowRejectionInput(null); setRejectionInput(""); }}
                      style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : editingReason ? (
                /* Editando motivo já salvo */
                <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "12px", marginTop: 4 }}>
                  <div style={{ fontSize: ".82rem", color: "var(--ws-text)", marginBottom: 8 }}>Editar motivo:</div>
                  <textarea className="ws-input" value={editReasonInput} onChange={e => setEditReasonInput(e.target.value)}
                    autoFocus style={{ minHeight: 80, resize: "vertical", fontSize: ".83rem", marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => void saveApprovalWithReason(currentPost.approval_status, editReasonInput, true)} disabled={saving || !editReasonInput.trim()}
                      style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600 }}>
                      Salvar
                    </button>
                    <button onClick={() => setEditingReason(false)}
                      style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontFamily: "inherit", fontSize: ".78rem" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : currentPost.approval_status === "pendente_alteracao" ? (
                /* Post ajustado pelo time — cliente deve revisar */
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ border: "2px solid #3b82f6", background: "rgba(59,130,246,0.08)", borderRadius: 10, padding: "10px 14px", fontSize: ".78rem", color: "#3b82f6", fontWeight: 600, lineHeight: 1.5 }}>
                    📤 O time fez os ajustes solicitados! Por favor, revise o post acima e decida.
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <button onClick={() => setConfirmApproval(true)} disabled={saving} style={{
                      padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                      background: APPROVAL_STYLES["aprovado"].bg, color: APPROVAL_STYLES["aprovado"].color,
                    }}>✓ Aprovar</button>
                    <button onClick={() => setShowRejectionInput("reprovado")} disabled={saving} style={{
                      padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                      background: APPROVAL_STYLES["reprovado"].bg, color: APPROVAL_STYLES["reprovado"].color,
                    }}>✕ Reprovar</button>
                    <button onClick={() => setShowRejectionInput("alteracao")} disabled={saving} style={{
                      padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                      background: APPROVAL_STYLES["alteracao"].bg, color: APPROVAL_STYLES["alteracao"].color,
                    }}>⚠ Solicitar alteração</button>
                  </div>
                  {/* Histórico de motivos anteriores — para contexto */}
                  {renderHistory(false, false)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <button onClick={() => setConfirmApproval(true)} disabled={saving} style={{
                      padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                      background: APPROVAL_STYLES["aprovado"].bg, color: APPROVAL_STYLES["aprovado"].color,
                      opacity: currentPost.approval_status === "aprovado" ? 1 : 0.6,
                      outline: currentPost.approval_status === "aprovado" ? `2px solid ${APPROVAL_STYLES["aprovado"].color}` : "none",
                    }}>✓ Aprovar</button>
                    <button onClick={() => setShowRejectionInput("reprovado")} disabled={saving} style={{
                      padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                      background: APPROVAL_STYLES["reprovado"].bg, color: APPROVAL_STYLES["reprovado"].color,
                      opacity: currentPost.approval_status === "reprovado" ? 1 : 0.6,
                      outline: currentPost.approval_status === "reprovado" ? `2px solid ${APPROVAL_STYLES["reprovado"].color}` : "none",
                    }}>✕ Reprovar</button>
                    <button onClick={() => setShowRejectionInput("alteracao")} disabled={saving} style={{
                      padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                      background: APPROVAL_STYLES["alteracao"].bg, color: APPROVAL_STYLES["alteracao"].color,
                      opacity: currentPost.approval_status === "alteracao" ? 1 : 0.6,
                      outline: currentPost.approval_status === "alteracao" ? `2px solid ${APPROVAL_STYLES["alteracao"].color}` : "none",
                    }}>⚠ Alteração</button>
                  </div>
                  {/* Histórico numerado de motivos */}
                  {renderHistory(
                    currentPost.approval_status === "reprovado" || currentPost.approval_status === "alteracao",
                    true /* showEdit */
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
                      {/* Admin: Voltar para Pendente */}
                      {(currentPost.approval_status === "reprovado" || currentPost.approval_status === "alteracao" || currentPost.approval_status === "aprovado" || currentPost.approval_status === "pendente_alteracao") && (
                        <button onClick={() => setConfirmStatus("pendente")} style={{
                          padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                          fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                          background: APPROVAL_STYLES["pendente"].bg, color: APPROVAL_STYLES["pendente"].color,
                        }}>
                          ◷ Voltar para Pendente
                        </button>
                      )}
                      {/* Admin: Enviar para nova aprovação (quando reprovado ou alteracao) */}
                      {(currentPost.approval_status === "reprovado" || currentPost.approval_status === "alteracao") && (
                        <button onClick={() => void sendForReapproval()} disabled={saving} style={{
                          padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                          fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                          background: APPROVAL_STYLES["pendente_alteracao"].bg,
                          color: APPROVAL_STYLES["pendente_alteracao"].color,
                        }}>
                          📤 Enviar para nova aprovação
                        </button>
                      )}
                      <button onClick={() => setConfirmStatus("aprovado")} disabled={saving} style={{
                        padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                        background: APPROVAL_STYLES["aprovado"].bg, color: APPROVAL_STYLES["aprovado"].color,
                        opacity: currentPost.approval_status === "aprovado" ? 1 : 0.6,
                        outline: currentPost.approval_status === "aprovado" ? `2px solid ${APPROVAL_STYLES["aprovado"].color}` : "none",
                        transition: "all .15s",
                      }}>
                        ✓ Aprovar
                      </button>
                    </>
                  )}
                </div>
              )
            )}
            {/* Admin vê o histórico completo de motivos */}
            {!readonly && renderHistory(
              currentPost.approval_status === "reprovado" || currentPost.approval_status === "alteracao",
              false
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

          {/* ── Extra info — sempre visível, editável só pelo admin ── */}
          {(stripMediaTag(currentPost.extra_info) || !readonly) && (
            <ExtraInfoSection
              extraInfo={currentPost.extra_info}
              readonly={readonly}
              color={caseData.color}
              onSave={(text) => {
                const extraUrls = decodeExtraUrls(currentPost.extra_info);
                const encoded = extraUrls.length > 0
                  ? `__media_urls__:${JSON.stringify(extraUrls)}
${text}`
                  : text;
                void save({ extra_info: encoded });
              }}
            />
          )}

          {/* ── Comentários — no final, sempre simples ── */}
          <div style={{ marginTop: 8 }}>
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
                  placeholder="Escrever um comentário..."
                  style={{ minHeight: 64, resize: "vertical", fontSize: ".83rem", marginBottom: 6 }} />
                <button onClick={addComment}
                  style={{ background: caseData.color, border: "none", borderRadius: 8, color: "#fff", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}>
                  Comentar
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ── Coluna lateral ── */}
        <div style={{ padding: isMobile ? "16px 16px 32px" : "28px 18px", display: isMobile && !sidebarVisible ? "none" : "block", boxSizing: "border-box", width: "100%" }}>
          <div style={labelStyle}>Ações</div>


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
            <input type="date" className="ws-input" value={scheduledDateValue} style={{ fontSize: "16px", padding: "8px 12px", marginBottom: 6 }}
              onChange={e => {
                const newDate = e.target.value;
                const time = scheduledTimeValue || "12:00";
                void save({ scheduled_date: newDate ? `${newDate}T${time}:00` : null });
              }} />
            <select className="ws-input" value={scheduledTimeValue}
              onChange={e => {
                const newTime = e.target.value;
                const date = scheduledDateValue || new Date().toISOString().slice(0, 10);
                void save({ scheduled_date: `${date}T${newTime}:00` });
              }} style={{ fontSize: ".8rem" }}>
              <option value="12:00">12:00</option>
              <option value="15:00">15:00</option>
              <option value="18:00">18:00</option>
            </select>
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
  );  // end innerBox

  if (inline) {
    return innerBox;
  }

  return (
    <div style={{ ...overlayStyle, left: 0 }} onClick={e => e.target === e.currentTarget && onClose()}>
      {innerBox}
    </div>
  );
}
