// client/src/workspace/components/cases/tabs/TabConteudo.tsx
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Post | null>(null);
  const [form, setForm] = useState<NewPostForm>(EMPTY_POST);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [activeMonth, setActiveMonth] = useState<string>("");
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState<"ok" | "error" | "notoken" | null>(null);

  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const dragIdx = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpenPost = (e: any) => {
      const postId = e.detail;
      if (postId && posts.length > 0) {
        const postToOpen = posts.find(p => p.id === postId);
        if (postToOpen) {
          if (postToOpen.scheduled_date) {
            setActiveMonth(postToOpen.scheduled_date.slice(0, 7));
          }
          setSelected(postToOpen);
        }
      }
    };
    window.addEventListener("ws_open_post", handleOpenPost);
    if ((window as any)._pendingPostId && posts.length > 0) {
      handleOpenPost({ detail: (window as any)._pendingPostId });
      (window as any)._pendingPostId = null;
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

  async function uploadFiles(files: FileList) {
    setUploading(true);
    const uploaded: string[] = [];
    const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Enviando ${i + 1} de ${files.length}...`);
      const file = files[i];
      const ext = file.name.split(".").pop();
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
  function closeModal() { setModal(false); setMediaUrls([]); setForm(EMPTY_POST); }

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
    if (!window.confirm(`Excluir o post?`)) return;
    setPosts(prev => prev.filter(p => p.id !== post.id));
    await supabase.from("posts").delete().eq("id", post.id);
  }

  function updatePost(updated: Post) {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
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

  function getMonthLabel(key: string) {
    if (key === "sem-data") return "Sem data";
    const [year, month] = key.split("-");
    return `${MONTHS_FULL[parseInt(month, 10) - 1]} ${year}`;
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
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentPosts.map(post => {
              const approval = APPROVAL_STYLES[post.approval_status] ?? APPROVAL_STYLES["pendente"];
              return (
                <div key={post.id} onClick={() => setSelected(post)} style={{
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
                    <div style={{ fontSize: ".72rem", color: "var(--ws-text2)", marginTop: 3, fontFamily: "Poppins" }}>
                      {post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) + " às " + new Date(post.scheduled_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Sem data"}
                      {" · "}
                      {post.media_type === "feed" ? "Feed" : post.media_type === "stories" ? "Stories" : post.media_type === "reels" ? "Reels" : "Carrossel"}
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
                  <div key={url + i} style={{ position: "relative", aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", border: i === 0 ? `2px solid ${caseData.color}` : "1px solid var(--ws-border2)" }}>
                    {isVideoUrl(url) ? <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    <button onClick={() => removeMedia(i)} style={{ position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,.7)", color: "#fff", border: "none", fontSize: ".7rem" }}>×</button>
                  </div>
                ))}
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
        <PostDetailModal post={selected} caseData={caseData} onClose={() => setSelected(null)} onUpdate={updatePost} profile={profile} readonly={readonly} />
      )}
    </div>
  );
}