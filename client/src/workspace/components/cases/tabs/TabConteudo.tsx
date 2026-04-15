// client/src/workspace/components/cases/tabs/TabConteudo.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import type { Profile } from "../../../../lib/supabaseClient";
import { supabase } from "../../../../lib/supabaseClient";
import { APPROVAL_STYLES, MONTHS_FULL } from "../constants";
import PostDetailModal from "../modals/PostDetailModal";
import Empty from "../shared/Empty";
import Loader from "../shared/Loader";
import MediaThumb from "../shared/MediaThumb";
import { modalBoxStyle, modalTitleStyle, overlayStyle, getOverlayStyle } from "../styles";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { normalizeWhatsAppPhone, parseDateAtNoon } from "../utils";
import type { Case, Post } from "../types";

interface TabConteudoProps {
  caseData: Case;
  profile: Profile;
  readonly?: boolean;
}

type NewPostForm = Omit<Post, "id" | "case_id">;

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "linkedin",  label: "LinkedIn",  icon: "💼" },
  { value: "tiktok",    label: "TikTok",    icon: "🎵" },
] as const;

// Mapeamento de cores automático por tipo de conteúdo (igual ao calendário)
const TYPE_COLORS: Record<string, string> = {
  reels: "#E91E8C",
  carousel: "#FFC107",
  feed: "#2196F3",
  stories: "#9C27B0"
};

const EMPTY_POST: NewPostForm = {
  slug: "",
  title: "",
  caption: "",
  hashtags: "",
  media_url: "",
  media_type: "feed",
  scheduled_date: "",
  scheduled_time: "12:00",
  approval_status: "pendente",
  extra_info: "",
  media_urls: [],
  description: "",
  checklist: [],
  comments: [],
  due_date: "",
  label_color: "",
  platforms: [],
};

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|ogg)$/i.test(url);
}

export function encodeExtraUrls(urls: string[], userText: string): string {
  if (urls.length === 0) return userText;
  const tag = `__media_urls__:${JSON.stringify(urls)}`;
  return userText ? `${tag}\n${userText}` : tag;
}

export function decodeExtraUrls(extra_info?: string | null): string[] {
  if (!extra_info) return [];
  const match = extra_info.match(/^__media_urls__:(\[.*?\])/);
  if (!match) return [];
  try { return JSON.parse(match[1]) as string[]; } catch { return []; }
}

export function stripMediaTag(extra_info?: string | null): string {
  if (!extra_info) return "";
  return extra_info.replace(/^__media_urls__:\[.*?\]\n?/, "");
}

export default function TabConteudo({ caseData, profile, readonly = false }: TabConteudoProps) {
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();
  const SESSION_KEY = `ws_novo_post_${caseData.id}`;

  // Parse post ID from URL — e.g. /workspace/clientes/:id/conteudo/post/:postId
  const postUrlMatch = location.match(/\/workspace\/clientes\/[^/]+\/conteudo\/post\/([^/]+)/);
  const urlPostId = postUrlMatch?.[1] ?? null;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<NewPostForm>(EMPTY_POST);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [activeMonth, setActiveMonth] = useState<string>("");
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState<"ok" | "error" | "notoken" | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkApproveResult, setBulkApproveResult] = useState<"ok" | "error" | null>(null);

  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const dragIdx = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Restaura modal de novo post se o app foi recarregado com ele aberto
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const { form: savedForm, mediaUrls: savedMedia } = JSON.parse(saved);
        setForm(savedForm ?? EMPTY_POST);
        setMediaUrls(savedMedia ?? []);
        setModal(true);
      }
    } catch {}
  }, []);

  // Persiste estado do formulário enquanto o modal estiver aberto
  useEffect(() => {
    if (modal) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ form, mediaUrls }));
      } catch {}
    }
  }, [modal, form, mediaUrls]);

  useEffect(() => {
    const handleOpenPost = (e: any) => {
      const postId = e.detail;
      if (postId && posts.length > 0) {
        const postToOpen = posts.find(p => p.id === postId);
        if (postToOpen) navigateToPost(postToOpen);
      }
    };
    window.addEventListener("ws_open_post", handleOpenPost);
    if ((window as any)._pendingPostId && posts.length > 0) {
      const pendingId = (window as any)._pendingPostId as string;
      (window as any)._pendingPostId = null;
      handleOpenPost({ detail: pendingId });
    }
    return () => window.removeEventListener("ws_open_post", handleOpenPost);
  }, [posts]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("posts").select("*").eq("case_id", caseData.id).order("scheduled_date");
      
      if (data && mounted) {
        // CORREÇÃO: Se houver posts sem data, define para amanhã para permitir edição
        const fixedData = data.map(p => {
          if (!p.scheduled_date) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(12, 0, 0, 0);
            return { ...p, scheduled_date: tomorrow.toISOString() };
          }
          return p;
        });
        setPosts(fixedData);
      }
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [caseData.id]);

  useEffect(() => {
    if (posts.length === 0) { setActiveMonth(""); return; }
    if (activeMonth) return;
    const now = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const keys = [...new Set(posts.map(p => p.scheduled_date ? p.scheduled_date.slice(0, 7) : "sem-data"))].sort();
    setActiveMonth(keys.includes(now) ? now : keys[0] || "sem-data");
  }, [posts, activeMonth]);

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

  async function uploadFiles(files: FileList) {
    setUploading(true);
    const uploaded: string[] = [];
    const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Enviando ${i + 1} de ${files.length}...`);
      const { file, ext } = await normalizeImageFile(files[i]);
      const filename = `posts/${caseData.id}/${Date.now()}-${i}.${ext}`;

      try {
        const { data, error } = await supabase.functions.invoke('get-r2-upload-url', {
          body: { filename, contentType: file.type }
        });
        if (error || !data?.signedUrl) throw new Error("Erro no upload.");
        const uploadRes = await fetch(data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        if (uploadRes.ok) uploaded.push(`${R2_PUBLIC_URL}/${filename}`);
      } catch (err) { console.error(err); }
    }
    setMediaUrls(prev => [...prev, ...uploaded]);
    setUploading(false);
    setUploadProgress("");
  }

  function onDragStart(i: number) { dragIdx.current = i; }
  function onDrop(i: number) {
    const from = dragIdx.current;
    if (from === null || from === i) return;
    setMediaUrls(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(i, 0, moved);
      return next;
    });
    dragIdx.current = null;
  }
  function removeMedia(i: number) { setMediaUrls(prev => prev.filter((_, idx) => idx !== i)); }
  function setCover(i: number) {
    setMediaUrls(prev => {
      const next = [...prev];
      const [cover] = next.splice(i, 1);
      return [cover, ...next];
    });
  }
  function openModal() { setForm(EMPTY_POST); setMediaUrls([]); setModal(true); }
  function closeModal() {
    setModal(false);
    setMediaUrls([]);
    setForm(EMPTY_POST);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }

  async function save() {
    // BLOQUEIO DE INFORMAÇÕES FALTANTES
    if (!form.slug.trim()) return alert("O campo 'Nome no calendário' é obrigatório.");
    if (!form.title.trim()) return alert("O campo 'Título / Tema' é obrigatório.");
    if (!form.scheduled_date) return alert("A 'Data de agendamento' é obrigatória.");
    if (mediaUrls.length === 0) return alert("Você precisa enviar pelo menos uma mídia (foto ou vídeo).");
    if (!form.caption.trim()) return alert("A 'Legenda' é obrigatória.");
    if (form.platforms.length === 0) return alert("Selecione pelo menos uma plataforma.");

    setSaving(true);
    const coverUrl = mediaUrls[0] ?? "";
    const extraUrls = mediaUrls.slice(1);
    const userText = stripMediaTag(form.extra_info);
    const extra_info = encodeExtraUrls(extraUrls, userText);
    const scheduledDateTime = `${form.scheduled_date}T${form.scheduled_time || "12:00"}:00`;

    const payload = {
      slug: form.slug.trim(), title: form.title.trim(), caption: form.caption, media_url: coverUrl,
      media_type: form.media_type, scheduled_date: scheduledDateTime, approval_status: form.approval_status,
      extra_info, media_urls: mediaUrls, comments: form.comments ?? [], 
      label_color: TYPE_COLORS[form.media_type] || "#9E9E9E", // Atribuição automática da cor igual ao calendário
      platforms: form.platforms ?? [], case_id: caseData.id,
    };

    const { data, error } = await supabase.from("posts").insert(payload).select().single();
    if (!error && data) { setPosts(prev => [...prev, data]); closeModal(); }
    setSaving(false);
  }

  async function removePost(post: Post) {
    if (!window.confirm(`Excluir o post "${post.slug || post.title}"? As mídias também serão removidas.`)) return;
    setPosts(prev => prev.filter(p => p.id !== post.id));
    await supabase.from("posts").delete().eq("id", post.id);

    // Deleta mídias do R2
    const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";
    const urls = [...(post.media_urls || []), ...(post.media_url ? [post.media_url] : [])];
    const unique = [...new Set(urls)].filter(u => u.startsWith(R2_PUBLIC_URL));
    for (const url of unique) {
      const filename = url.replace(R2_PUBLIC_URL + "/", "");
      void supabase.functions.invoke("delete-r2-file", { body: { filename } });
    }
  }

  // Derived from URL — no useState needed
  const selected = urlPostId ? (posts.find(p => p.id === urlPostId) ?? null) : null;

  function navigateToPost(post: Post) {
    if (post.scheduled_date) setActiveMonth(post.scheduled_date.slice(0, 7));
    setLocation(`/workspace/clientes/${caseData.id}/conteudo/post/${post.id}`);
  }

  function closePost() {
    setLocation(`/workspace/clientes/${caseData.id}/conteudo`);
  }

  function updatePost(updated: Post) {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    // selected is derived from posts — no explicit setSelected needed
  }

  const postsByMonth = useMemo(() => {
    const grouped: Record<string, Post[]> = {};
    posts.forEach(p => {
      const key = p.scheduled_date ? p.scheduled_date.slice(0, 7) : "sem-data";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return grouped;
  }, [posts]);

  const sortedMonths = useMemo(() =>
    Object.keys(postsByMonth).sort((a, b) => {
      if (a === "sem-data") return 1;
      if (b === "sem-data") return -1;
      return a.localeCompare(b);
    }), [postsByMonth]);

  const currentMonth = sortedMonths.includes(activeMonth) ? activeMonth : sortedMonths[0] || "sem-data";
  const currentPosts = postsByMonth[currentMonth] || [];
  const approvableCurrentPosts = currentPosts.filter(
    post => post.approval_status !== "aprovado" && post.approval_status !== "postado"
  );

  function getMonthLabel(key: string) {
    if (key === "sem-data") return "Sem data";
    const [year, month] = key.split("-");
    return `${MONTHS_FULL[parseInt(month, 10) - 1]} ${year}`;
  }

  async function approveCurrentMonthPosts() {
    const monthPosts = currentPosts.filter(
      post => post.approval_status !== "aprovado" && post.approval_status !== "postado"
    );

    if (monthPosts.length === 0) {
      alert("Não há posts pendentes para aprovar neste mês.");
      return;
    }

    const monthLabel = getMonthLabel(currentMonth);
    const confirmApprove = window.confirm(
      `Aprovar todos os ${monthPosts.length} post(s) de ${monthLabel}?`
    );

    if (!confirmApprove) return;

    setBulkApproving(true);
    setBulkApproveResult(null);

    try {
      const ids = monthPosts.map(post => post.id);
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("posts")
        .update({
          approval_status: "aprovado",
          status_changed_at: now,
        })
        .in("id", ids);

      if (error) throw error;

      setPosts(prev =>
        prev.map(post =>
          ids.includes(post.id)
            ? {
                ...post,
                approval_status: "aprovado",
                status_changed_at: now,
              }
            : post
        )
      );

      // selected is derived — just update posts state above; no setSelected needed

      setBulkApproveResult("ok");
    } catch (err) {
      console.error("Erro ao aprovar posts em massa:", err);
      setBulkApproveResult("error");
    } finally {
      setBulkApproving(false);
      setTimeout(() => setBulkApproveResult(null), 4000);
    }
  }

  async function notifyClient() {
    setNotifying(true);
    setNotifyResult(null);
    try {
      const monthLabel = getMonthLabel(currentMonth);
      const postCount = currentPosts.length;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-client`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            case_id: caseData.id,
            case_name: caseData.name,
            type: "conteudo_pronto",
            month_label: monthLabel,
            post_count: postCount,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        setNotifyResult(json.error?.includes("sem token") ? "notoken" : "error");
      } else {
        setNotifyResult("ok");
      }
    } catch {
      setNotifyResult("error");
    } finally {
      setNotifying(false);
      setTimeout(() => setNotifyResult(null), 4000);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {!readonly && (
          <>
            {notifyResult && (
              <span style={{
                fontSize: ".75rem", fontFamily: "Poppins",
                color: notifyResult === "ok" ? "#00e676" : notifyResult === "notoken" ? "#ffd600" : "#ff5c7a",
              }}>
                {notifyResult === "ok"      && "✅ Notificação enviada!"}
                {notifyResult === "notoken" && "⚠ Cliente ainda não habilitou notificações"}
                {notifyResult === "error"   && "❌ Erro ao enviar notificação"}
              </span>
            )}
            <button
              className="ws-btn-ghost"
              onClick={() => void notifyClient()}
              disabled={notifying}
              title="Notificar cliente que o conteúdo está pronto"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {notifying ? "Enviando..." : "🔔 Notificar cliente"}
            </button>
            <button className="ws-btn" onClick={openModal}>+ Novo post</button>
          </>
        )}
      </div>

      {loading ? <Loader /> : posts.length === 0 ? <Empty label="Nenhum post cadastrado ainda." /> : (
        <>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {sortedMonths.map(key => (
                <button key={key} onClick={() => setActiveMonth(key)} style={{
                  padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
                  background: currentMonth === key ? `${caseData.color}22` : "var(--ws-surface)",
                  color: currentMonth === key ? caseData.color : "var(--ws-text3)",
                  outline: currentMonth === key ? `2px solid ${caseData.color}` : "1px solid var(--ws-border)",
                  transition: "all .15s",
                }}>
                  {getMonthLabel(key)}
                  <span style={{
                    marginLeft: 6, fontSize: ".65rem",
                    background: currentMonth === key ? caseData.color : "var(--ws-border)",
                    color: currentMonth === key ? "#fff" : "var(--ws-text3)",
                    borderRadius: 10, padding: "1px 6px",
                  }}>{(postsByMonth[key] || []).length}</span>
                </button>
              ))}
            </div>

            {currentMonth !== "sem-data" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {bulkApproveResult && (
                  <span
                    style={{
                      fontSize: ".75rem",
                      fontFamily: "Poppins",
                      color: bulkApproveResult === "ok" ? "#00e676" : "#ff5c7a",
                    }}
                  >
                    {bulkApproveResult === "ok" && "✅ Conteúdo do mês aprovado!"}
                    {bulkApproveResult === "error" && "❌ Erro ao aprovar o conteúdo do mês"}
                  </span>
                )}

                <button
                  className="ws-btn"
                  onClick={() => void approveCurrentMonthPosts()}
                  disabled={bulkApproving || approvableCurrentPosts.length === 0}
                  title={`Aprovar todos os posts de ${getMonthLabel(currentMonth)}`}
                  style={{
                    whiteSpace: "nowrap",
                    opacity: bulkApproving || approvableCurrentPosts.length === 0 ? 0.6 : 1,
                  }}
                >
                  {bulkApproving
                    ? "Aprovando..."
                    : `✓ Aprovar todo o conteúdo desse mês${approvableCurrentPosts.length > 0 ? ` (${approvableCurrentPosts.length})` : ""}`}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentPosts.map(post => {
              const approval = APPROVAL_STYLES[post.approval_status] ?? APPROVAL_STYLES["pendente"];
              return (
                <div key={post.id} onClick={() => navigateToPost(post)} style={{
                  background: "var(--ws-surface)", border: "1px solid var(--ws-border)",
                  borderLeft: `3px solid ${approval.color}`, borderRadius: 10,
                  padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
                }}>
                  <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", background: "var(--ws-surface2)", flexShrink: 0 }}>
                    <MediaThumb url={post.media_url} alt={post.title || post.slug} mediaType={post.media_type} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)", display: "flex", alignItems: "center", gap: 6 }}>
                      {/* ETIQUETA AUTOMÁTICA POR TIPO */}
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: TYPE_COLORS[post.media_type] || "#9E9E9E", flexShrink: 0 }} />
                      {post.slug || post.title}
                    </div>

                    {!!post.title?.trim() && (
                      <div
                        style={{
                          fontSize: ".78rem",
                          color: "var(--ws-text2)",
                          marginTop: 4,
                          fontFamily: "Poppins",
                          lineHeight: 1.35,
                        }}
                      >
                        {post.title}
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: ".72rem",
                        color: "var(--ws-text2)",
                        marginTop: 3,
                        fontFamily: "Poppins",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>
                        {post.scheduled_date
                          ? new Date(post.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) +
                            " às " +
                            new Date(post.scheduled_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                          : "Sem data"}
                      </span>

                      <span style={{ opacity: 0.7 }}>·</span>

                      <span>
                        {post.media_type === "feed"
                          ? "Feed"
                          : post.media_type === "stories"
                            ? "Stories"
                            : post.media_type === "reels"
                              ? "Reels"
                              : "Carrossel"}
                      </span>

                      {!!post.platforms?.length && post.platforms.map(platform => {
                        const platformMeta = PLATFORMS.find(p => p.value === platform);
                        if (!platformMeta) return null;

                        return (
                          <span
                            key={platform}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "3px 9px",
                              borderRadius: 999,
                              background: `${caseData.color}14`,
                              border: `1px solid ${caseData.color}40`,
                              color: "var(--ws-text)",
                              lineHeight: 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span style={{ fontSize: ".7rem", lineHeight: 1 }}>{platformMeta.icon}</span>
                            <span style={{ fontSize: ".68rem", fontWeight: 500 }}>{platformMeta.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ background: approval.bg, color: approval.color, borderRadius: 20, padding: "3px 10px", fontSize: ".72rem", fontWeight: 600 }}>{approval.label}</div>
                  {!readonly && <button onClick={e => { e.stopPropagation(); void removePost(post); }} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1rem", padding: "0 8px" }}>×</button>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {modal && !readonly && (
        <div style={getOverlayStyle(isMobile)} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ ...modalBoxStyle, width: 540, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={modalTitleStyle}>Novo post</div>
            
            <label className="ws-label">Nome no calendário *</label>
            <input className="ws-input" value={form.slug} placeholder="Ex: Estático 02, Reels 03..." onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} style={{ marginBottom: 12 }} />
            
            <label className="ws-label">Título / tema *</label>
            <input className="ws-input" value={form.title} placeholder="Assunto ou tema do post" onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={{ marginBottom: 12 }} />
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label className="ws-label">Tipo *</label>
                <select className="ws-input" value={form.media_type} onChange={e => setForm(p => ({ ...p, media_type: e.target.value as Post["media_type"] }))}>
                  <option value="feed">Feed (4:5)</option>
                  <option value="stories">Stories (9:16)</option>
                  <option value="reels">Reels (9:16)</option>
                  <option value="carousel">Carrossel (1:1)</option>
                </select>
              </div>
              <div>
                <label className="ws-label">Data *</label>
                <input className="ws-input" type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} />
              </div>
              <div>
                <label className="ws-label">Horário *</label>
                <select className="ws-input" value={form.scheduled_time ?? "12:00"} onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))}>
                  <option value="12:00">12:00</option>
                  <option value="15:00">15:00</option>
                  <option value="18:00">18:00</option>
                </select>
              </div>
            </div>

            <label className="ws-label">Mídia *</label>
            <div onClick={() => fileRef.current?.click()} style={{ height: 110, borderRadius: 10, border: "1px dashed var(--ws-border2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 10, background: "var(--ws-surface2)", gap: 6 }}>
               {mediaUrls.length > 0 ? `✅ ${mediaUrls.length} arquivo(s) selecionado(s)` : "🖼 Clique para enviar foto ou vídeo"}
            </div>
            {mediaUrls.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))", gap: 8, marginBottom: 10 }}>
                {mediaUrls.map((url, i) => (
                  <div key={url + i} style={{ position: "relative", aspectRatio: "1/1", borderRadius: 8, overflow: "visible", border: i === 0 ? `2px solid ${caseData.color}` : "1px solid var(--ws-border2)" }}>
                    <div style={{ width: "100%", height: "100%", borderRadius: 6, overflow: "hidden" }}>
                      {isVideoUrl(url) ? <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeMedia(i); }}
                      style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#ff4d4d", color: "#fff", border: "2px solid var(--ws-surface)", fontSize: ".7rem", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
                {/* Botão de adicionar mais mídias sempre visível dentro do grid */}
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ aspectRatio: "1/1", borderRadius: 8, border: "1px dashed var(--ws-border2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "var(--ws-surface2)", fontSize: "1.4rem", color: "var(--ws-text3)" }}
                  title="Adicionar mais arquivos"
                >+</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={e => { if (e.target.files?.length) void uploadFiles(e.target.files); }} />

            <label className="ws-label">Legenda *</label>
            <textarea className="ws-input" value={form.caption} placeholder="Texto do post..." onChange={e => setForm(p => ({ ...p, caption: e.target.value }))} style={{ minHeight: 80, resize: "vertical", marginBottom: 12 }} />

            <label className="ws-label">Informações extras (opcional)</label>
            <textarea className="ws-input" value={stripMediaTag(form.extra_info)} placeholder="Briefing, referências..." onChange={e => { const userText = e.target.value; const extraUrls = decodeExtraUrls(form.extra_info); setForm(p => ({ ...p, extra_info: encodeExtraUrls(extraUrls, userText) })); }} style={{ minHeight: 60, resize: "vertical", marginBottom: 20 }} />

            <label className="ws-label">Plataformas *</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {PLATFORMS.map(({ value, label, icon }) => {
                const isSelected = (form.platforms ?? []).includes(value);
                return (
                  <button key={value} onClick={() => setForm(p => { const current = p.platforms ?? []; return { ...p, platforms: isSelected ? current.filter(v => v !== value) : [...current, value] }; })} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: ".78rem", background: isSelected ? `${caseData.color}22` : "var(--ws-surface2)", color: isSelected ? caseData.color : "var(--ws-text3)", outline: isSelected ? `2px solid ${caseData.color}` : "1px solid var(--ws-border)" }}><span>{icon}</span> {label}</button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="ws-btn" onClick={() => void save()} disabled={saving || uploading} style={{ flex: 1 }}>{saving ? "Salvando..." : "Salvar post"}</button>
              <button className="ws-btn-ghost" onClick={closeModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <PostDetailModal post={selected} caseData={caseData} onClose={closePost} onUpdate={updatePost} profile={profile} readonly={readonly} inline />
      )}
    </div>
  );
}