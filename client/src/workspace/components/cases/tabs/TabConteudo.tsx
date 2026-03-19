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

const EMPTY_POST: NewPostForm = {
  slug: "",
  title: "",
  caption: "",
  hashtags: "",
  media_url: "",
  media_type: "feed",
  scheduled_date: "",
  scheduled_time: "",
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

// Guarda URLs extras no campo extra_info sem apagar texto livre
export function encodeExtraUrls(urls: string[], userText: string): string {
  if (urls.length === 0) return userText;
  const tag = `__media_urls__:${JSON.stringify(urls)}`;
  return userText ? `${tag}\n${userText}` : tag;
}

// Extrai URLs extras do extra_info
export function decodeExtraUrls(extra_info?: string | null): string[] {
  if (!extra_info) return [];
  const match = extra_info.match(/^__media_urls__:(\[.*?\])/);
  if (!match) return [];
  try { return JSON.parse(match[1]) as string[]; } catch { return []; }
}

// Remove a tag para exibir só o texto do usuário
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

  // Lista ordenada de URLs — índice 0 = capa
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const dragIdx = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Carregar posts ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("posts").select("*").eq("case_id", caseData.id).order("scheduled_date");
      if (mounted) { setPosts(data ?? []); setLoading(false); }
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

  // ── Upload múltiplo (Cloudflare R2) ─────────────────────────────
  async function uploadFiles(files: FileList) {
    setUploading(true);
    const uploaded: string[] = [];
    
    // Nossa nova URL Pública do R2!
    const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Enviando ${i + 1} de ${files.length}...`);
      const file = files[i];
      const ext = file.name.split(".").pop();
      const filename = `posts/${caseData.id}/${Date.now()}-${i}.${ext}`;

      try {
        // 1. Pede a URL temporária para a Edge Function
        const { data, error } = await supabase.functions.invoke('get-r2-upload-url', {
          body: { filename, contentType: file.type }
        });

        if (error || !data?.signedUrl) {
          console.error("Erro na Edge Function:", error);
          throw new Error("Erro ao gerar link de upload seguro.");
        }

        // 2. Faz o upload direto pro Cloudflare R2
        const uploadRes = await fetch(data.signedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadRes.ok) throw new Error("Falha ao salvar no R2");

        // 3. Salva a URL pública final
        uploaded.push(`${R2_PUBLIC_URL}/${filename}`);

      } catch (err) {
        console.error("Erro no arquivo", file.name, err);
        alert(`Erro ao enviar o arquivo ${file.name}. Tente novamente.`);
      }
    }
    
    setMediaUrls(prev => [...prev, ...uploaded]);
    setUploading(false);
    setUploadProgress("");
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Drag & drop reordenação ─────────────────────────────────────
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

  // Move o item escolhido para índice 0 (vira capa)
  function setCover(i: number) {
    setMediaUrls(prev => {
      const next = [...prev];
      const [cover] = next.splice(i, 1);
      return [cover, ...next];
    });
  }

  // ── Modal ───────────────────────────────────────────────────────
  function openModal() { setForm(EMPTY_POST); setMediaUrls([]); setModal(true); }
  function closeModal() { setModal(false); setMediaUrls([]); setForm(EMPTY_POST); }

  // ── Salvar ──────────────────────────────────────────────────────
  async function save() {
    if (!form.slug.trim() && !form.title.trim()) return;
    setSaving(true);

    const coverUrl = mediaUrls[0] ?? "";
    const extraUrls = mediaUrls.slice(1);
    const userText = stripMediaTag(form.extra_info);
    const extra_info = encodeExtraUrls(extraUrls, userText);

    // Combina data + hora em timestamp
    const scheduledDateTime = form.scheduled_date
      ? `${form.scheduled_date}T${form.scheduled_time || "09:00"}:00`
      : null;

    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      caption: form.caption,
      hashtags: form.hashtags,
      media_url: coverUrl,
      media_type: form.media_type,
      scheduled_date: scheduledDateTime,
      approval_status: form.approval_status,
      extra_info,
      media_urls: mediaUrls,
      description: form.description ?? "",
      checklist: form.checklist ?? [],
      comments: form.comments ?? [],
      due_date: form.due_date || null,
      label_color: form.label_color ?? "",
      platforms: form.platforms ?? [],
      case_id: caseData.id,
    };

    const { data, error } = await supabase.from("posts").insert(payload).select().single();
    if (!error && data) { setPosts(prev => [...prev, data]); closeModal(); }
    else console.error("Erro ao salvar post:", error);

    setSaving(false);
  }

  async function removePost(post: Post) {
    // 1. Trava de segurança: pede confirmação
    const confirmacao = window.confirm(`Tem certeza que deseja excluir o post "${post.slug || post.title || 'selecionado'}"? Essa ação não pode ser desfeita.`);
    if (!confirmacao) return; // Se o usuário cancelar, a função para aqui

    const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";

    // 2. Pega todas as URLs de imagem/vídeo amarradas nesse post (capa + carrossel)
    const allUrls = [post.media_url, ...(post.media_urls || []), ...decodeExtraUrls(post.extra_info)].filter(Boolean);

    // 3. Deleta os arquivos físicos do Cloudflare R2
    for (const url of allUrls) {
      if (url && url.startsWith(R2_PUBLIC_URL)) {
        // Pega só o caminho final (ex: posts/ID/123-0.jpg)
        const filename = url.replace(`${R2_PUBLIC_URL}/`, "");

        await supabase.functions.invoke('delete-r2-file', {
          body: { filename }
        });
      }
    }

    // 4. Exclui da tela e do banco de dados (como já era antes)
    setPosts(prev => prev.filter(p => p.id !== post.id));
    await supabase.from("posts").delete().eq("id", post.id);
  }

  function updatePost(updated: Post) {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  }

  // ── Agrupamento ─────────────────────────────────────────────────
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

  function sendMonthApprovalToWhatsApp() {
    const phone = normalizeWhatsAppPhone(caseData.phone);
    if (!phone || currentMonth === "sem-data" || currentPosts.length === 0) return;
    const message = encodeURIComponent(
      `Olá${caseData.name ? ` ${caseData.name}` : ""}! 👋\n\n` +
      `Seu conteúdo do mês de *${getMonthLabel(currentMonth)}* está pronto! ` +
      `São ${currentPosts.length} publicações aguardando sua aprovação.\n\n` +
      `Acesse com seu login e senha:\nhttps://www.digitalmentehub.com.br/workspace\n\nAguardamos seu feedback! ✅`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
{!readonly && <button className="ws-btn" onClick={openModal}>+ Novo post</button>}
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

          {!!caseData.phone && currentMonth !== "sem-data" && currentPosts.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <button onClick={sendMonthApprovalToWhatsApp} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                backgroundColor: "#25D366", color: "#fff", border: "none", borderRadius: 8,
                cursor: "pointer", fontSize: ".78rem", fontWeight: 600, transition: "all .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#1da851"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#25D366"; }}
              >
                📩 Enviar conteúdo de {getMonthLabel(currentMonth)} para aprovação
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentPosts.map(post => {
              const approval = APPROVAL_STYLES[post.approval_status] ?? APPROVAL_STYLES["pendente"];
              const scheduledDate = parseDateAtNoon(post.scheduled_date);
              const extraCount = decodeExtraUrls(post.extra_info).length;
              return (
                <div key={post.id} onClick={() => setSelected(post)} style={{
                  background: "var(--ws-surface)", border: "1px solid var(--ws-border)",
                  borderLeft: `3px solid ${approval.color}`, borderRadius: 10,
                  padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
                }}>
                  <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", background: "var(--ws-surface2)", flexShrink: 0 }}>
                    <MediaThumb url={post.media_url} alt={post.title || post.slug || "Post"} mediaType={post.media_type} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {post.label_color && (
                        <span style={{
                          display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                          background: post.label_color, flexShrink: 0,
                        }} />
                      )}
                      {post.slug || post.title || "Post"}
                      {extraCount > 0 && (
                        <span style={{
                          fontSize: ".62rem", fontFamily: "Poppins",
                          background: "var(--ws-surface2)", color: "var(--ws-text3)",
                          padding: "1px 6px", borderRadius: 4,
                        }}>🎠 {extraCount + 1} slides</span>
                      )}
                    </div>
                    {post.title && post.slug && (
                      <div style={{ fontSize: ".75rem", color: "var(--ws-text3)", marginTop: 2 }}>{post.title}</div>
                    )}
                    <div style={{ fontSize: ".72rem", color: "var(--ws-text2)", marginTop: 3, fontFamily: "Poppins" }}>
                      {post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) + " às " + new Date(post.scheduled_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Sem data"}
                      {" · "}
                      {post.media_type === "feed" ? "Feed" : post.media_type === "stories" ? "Stories" : post.media_type === "reels" ? "Reels" : "Carrossel"}
                      {(post.platforms ?? []).length > 0 && (
                        <> · {(post.platforms ?? []).map(pl => pl === "instagram" ? "📸" : pl === "linkedin" ? "💼" : "🎵").join(" ")}</>
                      )}
                    </div>
                  </div>
                  <div style={{ background: approval.bg, color: approval.color, borderRadius: 20, padding: "3px 10px", fontSize: ".72rem", fontWeight: 600 }}>
                    {approval.label}
                  </div>
                  {!readonly && <button onClick={e => { e.stopPropagation(); void removePost(post); }}
  style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1rem", padding: "0 8px" }}>×</button>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Modal novo post ── */}
      {modal && !readonly && (
        <div style={getOverlayStyle(isMobile)} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ ...modalBoxStyle, width: 540, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={modalTitleStyle}>Novo post</div>

            <label className="ws-label">Nome no calendário</label>
            <input className="ws-input" value={form.slug} placeholder="Ex: Estático 02, Reels 03..."
              onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} style={{ marginBottom: 12 }} />

            <label className="ws-label">Título / tema</label>
            <input className="ws-input" value={form.title} placeholder="Assunto ou tema do post"
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={{ marginBottom: 12 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label className="ws-label">Tipo</label>
                <select className="ws-input" value={form.media_type}
                  onChange={e => setForm(p => ({ ...p, media_type: e.target.value as Post["media_type"] }))}>
                  <option value="feed">Feed (4:5)</option>
                  <option value="stories">Stories (9:16)</option>
                  <option value="reels">Reels (9:16)</option>
                  <option value="carousel">Carrossel (1:1)</option>
                </select>
              </div>
              <div>
                <label className="ws-label">Data de agendamento</label>
                <input className="ws-input" type="date" value={form.scheduled_date}
                  onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} />
              </div>
              <div>
                <label className="ws-label">Horário</label>
                <input className="ws-input" type="time" value={form.scheduled_time ?? "09:00"}
                  onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))} />
              </div>
            </div>

            {/* Mídia */}
            <label className="ws-label">
              Mídia
              {mediaUrls.length > 0 && (
                <span style={{ color: "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".57rem", marginLeft: 8 }}>
                  {mediaUrls.length} arquivo{mediaUrls.length > 1 ? "s" : ""} · arraste para reordenar · ★ define a capa
                </span>
              )}
            </label>

            {mediaUrls.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))", gap: 8, marginBottom: 10 }}>
                {mediaUrls.map((url, i) => (
                  <div key={url + i} draggable
                    onDragStart={() => onDragStart(i)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => onDrop(i)}
                    style={{
                      position: "relative", aspectRatio: "1/1", borderRadius: 8, overflow: "hidden",
                      border: i === 0 ? `2px solid ${caseData.color}` : "1px solid var(--ws-border2)",
                      cursor: "grab", userSelect: "none",
                    }}>
                    {isVideoUrl(url)
                      ? <video src={url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <img src={url} alt={`slide ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    }
                    {/* Número */}
                    <div style={{
                      position: "absolute", top: 3, left: 3, width: 16, height: 16, borderRadius: "50%",
                      background: "rgba(0,0,0,.65)", color: "#fff", fontSize: ".56rem",
                      fontFamily: "Poppins", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
                    }}>{i + 1}</div>
                    {/* Estrela: definir capa */}
                    {i !== 0 && (
                      <button onClick={() => setCover(i)} title="Definir como capa" style={{
                        position: "absolute", top: 3, right: 20, width: 16, height: 16, borderRadius: "50%",
                        background: "rgba(0,0,0,.65)", border: "none", color: "#ffd600",
                        cursor: "pointer", fontSize: ".65rem", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>★</button>
                    )}
                    {/* Badge CAPA */}
                    {i === 0 && (
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        background: `${caseData.color}dd`, color: "#fff",
                        fontSize: ".5rem", fontFamily: "Poppins", letterSpacing: "1px", textAlign: "center", padding: "2px 0",
                      }}>CAPA</div>
                    )}
                    {/* Remover */}
                    <button onClick={() => removeMedia(i)} style={{
                      position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: "50%",
                      background: "rgba(0,0,0,.7)", border: "none", color: "#fff",
                      cursor: "pointer", fontSize: ".7rem", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>×</button>
                  </div>
                ))}
                {/* Adicionar mais */}
                <div onClick={() => fileRef.current?.click()} style={{
                  aspectRatio: "1/1", borderRadius: 8, border: "1px dashed var(--ws-border2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "var(--ws-text3)", fontSize: "1.4rem", transition: "all .15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = caseData.color; e.currentTarget.style.color = caseData.color; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ws-border2)"; e.currentTarget.style.color = "var(--ws-text3)"; }}
                >+</div>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()} style={{
                height: 110, borderRadius: 10, border: "1px dashed var(--ws-border2)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "pointer", marginBottom: 10, background: "var(--ws-surface2)", gap: 6, transition: "all .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = caseData.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ws-border2)"; }}
              >
                <div style={{ fontSize: "1.5rem" }}>🖼</div>
                <div style={{ color: "var(--ws-text3)", fontSize: ".8rem" }}>
                  {uploading ? uploadProgress : "Clique para enviar foto ou vídeo"}
                </div>
                <div style={{ color: "var(--ws-text3)", fontSize: ".65rem", fontFamily: "Poppins" }}>
                  Selecione um ou mais arquivos de uma vez
                </div>
              </div>
            )}

            {uploading && (
              <div style={{ color: "var(--ws-text3)", fontSize: ".72rem", marginBottom: 8, fontFamily: "Poppins" }}>
                ⏳ {uploadProgress}
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }}
              onChange={e => { if (e.target.files?.length) void uploadFiles(e.target.files); }} />

            <label className="ws-label" style={{ marginTop: 4 }}>Legenda</label>
            <textarea className="ws-input" value={form.caption} placeholder="Texto do post..."
              onChange={e => setForm(p => ({ ...p, caption: e.target.value }))}
              style={{ minHeight: 80, resize: "vertical", marginBottom: 12 }} />

            <label className="ws-label">Informações extras</label>
            <textarea className="ws-input" value={stripMediaTag(form.extra_info)}
              placeholder="Briefing, referências, observações..."
              onChange={e => {
                const userText = e.target.value;
                const extraUrls = decodeExtraUrls(form.extra_info);
                setForm(p => ({ ...p, extra_info: encodeExtraUrls(extraUrls, userText) }));
              }}
              style={{ minHeight: 60, resize: "vertical", marginBottom: 20 }} />

            <label className="ws-label" style={{ marginBottom: 6 }}>Etiqueta</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {["#E91E8C", "#FF5722", "#FFC107", "#4CAF50", "#2196F3", "#9C27B0", "#9E9E9E"].map(color => (
                <button key={color} onClick={() => setForm(p => ({ ...p, label_color: p.label_color === color ? "" : color }))}
                  style={{
                    width: 20, height: 20, borderRadius: 4, background: color, border: "none",
                    cursor: "pointer", flexShrink: 0,
                    outline: form.label_color === color ? `3px solid ${color}` : "2px solid transparent",
                    outlineOffset: 2, transition: "outline .15s",
                  }} />
              ))}
              {/* Picker customizado */}
              <label title="Cor personalizada" style={{ position: "relative", width: 20, height: 20, borderRadius: 4, cursor: "pointer", flexShrink: 0, overflow: "hidden",
                background: form.label_color && !["#E91E8C","#FF5722","#FFC107","#4CAF50","#2196F3","#9C27B0","#9E9E9E"].includes(form.label_color)
                  ? form.label_color : "var(--ws-border2)",
                outline: form.label_color && !["#E91E8C","#FF5722","#FFC107","#4CAF50","#2196F3","#9C27B0","#9E9E9E"].includes(form.label_color)
                  ? `3px solid ${form.label_color}` : "2px solid var(--ws-border2)",
                outlineOffset: 2, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: ".7rem", color: "var(--ws-text3)", pointerEvents: "none" }}>+</span>
                <input type="color" value={form.label_color || "#000000"}
                  onChange={e => setForm(p => ({ ...p, label_color: e.target.value }))}
                  style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
              </label>
              {form.label_color && (
                <button onClick={() => setForm(p => ({ ...p, label_color: "" }))}
                  style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", fontFamily: "Poppins" }}>
                  limpar
                </button>
              )}
            </div>

            <label className="ws-label" style={{ marginTop: 4, marginBottom: 6 }}>Plataformas</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {PLATFORMS.map(({ value, label, icon }) => {
                const isSelected = (form.platforms ?? []).includes(value);
                return (
                  <button key={value} onClick={() => setForm(p => {
                    const current = p.platforms ?? [];
                    return {
                      ...p,
                      platforms: isSelected
                        ? current.filter(v => v !== value)
                        : [...current, value],
                    };
                  })} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: ".78rem", fontWeight: 600,
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

            <div style={{ display: "flex", gap: 10 }}>
              <button className="ws-btn" onClick={() => void save()} disabled={saving || uploading} style={{ flex: 1 }}>
                {saving ? "Salvando..." : uploading ? uploadProgress : "Salvar post"}
              </button>
              <button className="ws-btn-ghost" onClick={closeModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <PostDetailModal
          post={selected}
          caseData={caseData}
          onClose={() => setSelected(null)}
          onUpdate={updatePost}
          profile={profile}
          readonly={readonly}
        />
      )}
    </div>
  );
}