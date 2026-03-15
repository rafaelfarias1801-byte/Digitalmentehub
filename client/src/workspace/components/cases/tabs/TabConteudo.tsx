import { useEffect, useMemo, useRef, useState } from "react";
import type { Profile } from "../../../../lib/supabaseClient";
import { supabase } from "../../../../lib/supabaseClient";
import { APPROVAL_STYLES, MONTHS_FULL } from "../constants";
import PostDetailModal from "../modals/PostDetailModal";
import Empty from "../shared/Empty";
import Loader from "../shared/Loader";
import MediaThumb from "../shared/MediaThumb";
import { modalBoxStyle, modalTitleStyle, overlayStyle } from "../styles";
import { normalizeWhatsAppPhone, parseDateAtNoon } from "../utils";
import type { Case, Post } from "../types";

interface TabConteudoProps {
  caseData: Case;
  profile: Profile;
}

type NewPostForm = Omit<Post, "id" | "case_id">;

const EMPTY_POST: NewPostForm = {
  slug: "",
  title: "",
  caption: "",
  hashtags: "",
  media_url: "",
  media_type: "feed",
  scheduled_date: "",
  approval_status: "pendente",
  extra_info: "",
  description: "",
  checklist: [],
  comments: [],
  due_date: "",
  label_color: "",
};

export default function TabConteudo({
  caseData,
  profile,
}: TabConteudoProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Post | null>(null);
  const [form, setForm] = useState<NewPostForm>(EMPTY_POST);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [activeMonth, setActiveMonth] = useState<string>("");

  // Múltiplos arquivos: lista de URLs já enviadas
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPosts() {
      setLoading(true);

      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("case_id", caseData.id)
        .order("scheduled_date");

      if (mounted) {
        setPosts(data ?? []);
        setLoading(false);
      }
    }

    void loadPosts();

    return () => {
      mounted = false;
    };
  }, [caseData.id]);

  useEffect(() => {
    if (posts.length === 0) {
      setActiveMonth("");
      return;
    }

    if (activeMonth) return;

    const now = `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`;

    const keys = [
      ...new Set(
        posts.map((post) =>
          post.scheduled_date ? post.scheduled_date.slice(0, 7) : "sem-data"
        )
      ),
    ].sort();

    setActiveMonth(keys.includes(now) ? now : keys[0] || "sem-data");
  }, [posts, activeMonth]);

  // Upload de múltiplos arquivos em sequência
  async function uploadFiles(files: FileList) {
    setUploading(true);
    const uploaded: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Enviando ${i + 1} de ${files.length}...`);

      const ext = file.name.split(".").pop();
      const path = `posts/${caseData.id}/${Date.now()}-${i}.${ext}`;

      const { error } = await supabase.storage
        .from("assets")
        .upload(path, file, { upsert: true });

      if (!error) {
        const { data } = supabase.storage.from("assets").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
    }

    setMediaUrls((prev) => [...prev, ...uploaded]);
    // O primeiro arquivo vira o media_url principal (usado como thumbnail)
    setForm((prev) => ({
      ...prev,
      media_url: prev.media_url || uploaded[0] || "",
    }));

    setUploading(false);
    setUploadProgress("");

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function removeMedia(index: number) {
    setMediaUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Atualiza media_url principal para o primeiro restante
      setForm((f) => ({ ...f, media_url: next[0] || "" }));
      return next;
    });
  }

  function openModal() {
    setForm(EMPTY_POST);
    setMediaUrls([]);
    setModal(true);
  }

  function closeModal() {
    setModal(false);
    setMediaUrls([]);
    setForm(EMPTY_POST);
  }

  async function save() {
    if (!form.slug.trim() && !form.title.trim()) return;

    setSaving(true);

    // Salva o primeiro arquivo como media_url (thumbnail),
    // os demais ficam em extra_info como JSON se não houver outro uso
    const extraUrls = mediaUrls.slice(1);
    const extraInfo = extraUrls.length > 0
      ? `__media_urls__:${JSON.stringify(extraUrls)}${form.extra_info ? `\n${form.extra_info}` : ""}`
      : form.extra_info;

    const payload = {
      ...form,
      case_id: caseData.id,
      slug: form.slug.trim(),
      title: form.title.trim(),
      media_url: mediaUrls[0] || form.media_url || "",
      extra_info: extraInfo,
    };

    const { data } = await supabase
      .from("posts")
      .insert(payload)
      .select()
      .single();

    if (data) {
      setPosts((prev) => [...prev, data]);
      closeModal();
    }

    setSaving(false);
  }

  async function removePost(id: string) {
    setPosts((prev) => prev.filter((item) => item.id !== id));
    await supabase.from("posts").delete().eq("id", id);
  }

  function updatePost(updatedPost: Post) {
    setPosts((prev) =>
      prev.map((item) => (item.id === updatedPost.id ? updatedPost : item))
    );
    setSelected(updatedPost);
  }

  const postsByMonth = useMemo(() => {
    const grouped: Record<string, Post[]> = {};

    posts.forEach((post) => {
      const key = post.scheduled_date
        ? post.scheduled_date.slice(0, 7)
        : "sem-data";

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(post);
    });

    return grouped;
  }, [posts]);

  const sortedMonths = useMemo(() => {
    return Object.keys(postsByMonth).sort((a, b) => {
      if (a === "sem-data") return 1;
      if (b === "sem-data") return -1;
      return a.localeCompare(b);
    });
  }, [postsByMonth]);

  const currentMonth =
    sortedMonths.includes(activeMonth) ? activeMonth : sortedMonths[0] || "sem-data";

  const currentPosts = postsByMonth[currentMonth] || [];

  function getMonthLabel(key: string) {
    if (key === "sem-data") return "Sem data";

    const [year, month] = key.split("-");
    return `${MONTHS_FULL[parseInt(month, 10) - 1]} ${year}`;
  }

  function sendMonthApprovalToWhatsApp() {
    const phone = normalizeWhatsAppPhone(caseData.phone);

    if (!phone || currentMonth === "sem-data" || currentPosts.length === 0) {
      return;
    }

    const message = encodeURIComponent(
      `Olá${caseData.name ? ` ${caseData.name}` : ""}! 👋\n\n` +
        `Seu conteúdo do mês de *${getMonthLabel(currentMonth)}* está pronto! ` +
        `São ${currentPosts.length} publicações aguardando sua aprovação.\n\n` +
        `Acesse com seu login e senha:\n` +
        `https://www.digitalmentehub.com.br/workspace\n\n` +
        `Aguardamos seu feedback! ✅`
    );

    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  }

  function isVideo(url: string) {
    return /\.(mp4|mov|webm|ogg)$/i.test(url);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="ws-btn" onClick={openModal}>
          + Novo post
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : posts.length === 0 ? (
        <Empty label="Nenhum post cadastrado ainda." />
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {sortedMonths.map((key) => (
              <button
                key={key}
                onClick={() => setActiveMonth(key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: ".78rem",
                  fontWeight: 600,
                  background:
                    currentMonth === key ? `${caseData.color}22` : "var(--ws-surface)",
                  color:
                    currentMonth === key ? caseData.color : "var(--ws-text3)",
                  outline:
                    currentMonth === key
                      ? `2px solid ${caseData.color}`
                      : "1px solid var(--ws-border)",
                  transition: "all .15s",
                }}
              >
                {getMonthLabel(key)}
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: ".65rem",
                    background:
                      currentMonth === key ? caseData.color : "var(--ws-border)",
                    color: currentMonth === key ? "#fff" : "var(--ws-text3)",
                    borderRadius: 10,
                    padding: "1px 6px",
                  }}
                >
                  {(postsByMonth[key] || []).length}
                </span>
              </button>
            ))}
          </div>

          {!!caseData.phone &&
            currentMonth !== "sem-data" &&
            currentPosts.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 14,
                }}
              >
                <button
                  onClick={sendMonthApprovalToWhatsApp}
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
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#1da851";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#25D366";
                  }}
                >
                  📩 Enviar conteúdo de {getMonthLabel(currentMonth)} para aprovação
                </button>
              </div>
            )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentPosts.map((post) => {
              const approval = APPROVAL_STYLES[post.approval_status];
              const scheduledDate = parseDateAtNoon(post.scheduled_date);

              return (
                <div
                  key={post.id}
                  onClick={() => setSelected(post)}
                  style={{
                    background: "var(--ws-surface)",
                    border: "1px solid var(--ws-border)",
                    borderLeft: `3px solid ${approval.color}`,
                    borderRadius: 10,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "var(--ws-surface2)",
                      flexShrink: 0,
                    }}
                  >
                    <MediaThumb
                      url={post.media_url}
                      alt={post.title || post.slug || "Post"}
                      mediaType={post.media_type}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: ".88rem",
                        color: "var(--ws-text)",
                      }}
                    >
                      {post.slug || post.title || "Post"}
                    </div>

                    {post.title && post.slug && (
                      <div
                        style={{
                          fontSize: ".75rem",
                          color: "var(--ws-text3)",
                          marginTop: 2,
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
                        fontFamily: "DM Mono",
                      }}
                    >
                      {scheduledDate
                        ? scheduledDate.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Sem data"}
                      {" · "}
                      {post.media_type === "feed"
                        ? "Feed"
                        : post.media_type === "stories"
                        ? "Stories"
                        : post.media_type === "reels"
                        ? "Reels"
                        : "Carrossel"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: approval.bg,
                      color: approval.color,
                      borderRadius: 20,
                      padding: "3px 10px",
                      fontSize: ".72rem",
                      fontWeight: 600,
                    }}
                  >
                    {approval.label}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void removePost(post.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--ws-text3)",
                      cursor: "pointer",
                      fontSize: "1rem",
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Modal novo post ── */}
      {modal && (
        <div
          style={overlayStyle}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={{ ...modalBoxStyle, width: 520 }}>
            <div style={modalTitleStyle}>Novo post</div>

            <label className="ws-label">Nome no calendário</label>
            <input
              className="ws-input"
              value={form.slug}
              placeholder="Ex: Estático 02, Reels 03..."
              onChange={(e) =>
                setForm((prev) => ({ ...prev, slug: e.target.value }))
              }
              style={{ marginBottom: 12 }}
            />

            <label className="ws-label">Título / tema</label>
            <input
              className="ws-input"
              value={form.title}
              placeholder="Assunto ou tema do post"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              style={{ marginBottom: 12 }}
            />

            {/* ── Área de mídia com múltiplos arquivos ── */}
            <label className="ws-label">
              Mídia
              {form.media_type === "carousel" && (
                <span style={{ color: "var(--ws-text3)", fontFamily: "DM Mono", fontSize: ".58rem", marginLeft: 8 }}>
                  MÚLTIPLOS ARQUIVOS PERMITIDOS
                </span>
              )}
            </label>

            {/* Grid de previews */}
            {mediaUrls.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                {mediaUrls.map((url, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      aspectRatio: "1/1",
                      borderRadius: 8,
                      overflow: "hidden",
                      border: i === 0 ? `2px solid ${caseData.color}` : "1px solid var(--ws-border2)",
                    }}
                  >
                    {isVideo(url) ? (
                      <video
                        src={url}
                        muted
                        playsInline
                        preload="metadata"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <img
                        src={url}
                        alt={`mídia ${i + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}

                    {/* Badge "capa" no primeiro */}
                    {i === 0 && (
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: `${caseData.color}cc`,
                        color: "#fff",
                        fontSize: ".52rem",
                        fontFamily: "DM Mono",
                        letterSpacing: "1px",
                        textAlign: "center",
                        padding: "2px 0",
                      }}>
                        CAPA
                      </div>
                    )}

                    {/* Botão remover */}
                    <button
                      onClick={() => removeMedia(i)}
                      style={{
                        position: "absolute",
                        top: 3,
                        right: 3,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,.7)",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: ".7rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Botão adicionar mais */}
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    aspectRatio: "1/1",
                    borderRadius: 8,
                    border: "1px dashed var(--ws-border2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--ws-text3)",
                    fontSize: "1.4rem",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = caseData.color;
                    e.currentTarget.style.color = caseData.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--ws-border2)";
                    e.currentTarget.style.color = "var(--ws-text3)";
                  }}
                >
                  +
                </div>
              </div>
            )}

            {/* Área de drop quando não há arquivos ainda */}
            {mediaUrls.length === 0 && (
              <div
                style={{
                  height: 110,
                  borderRadius: 10,
                  border: "1px dashed var(--ws-border2)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  marginBottom: 8,
                  background: "var(--ws-surface2)",
                  gap: 6,
                  transition: "all .15s",
                }}
                onClick={() => fileRef.current?.click()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = caseData.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--ws-border2)";
                }}
              >
                <div style={{ fontSize: "1.5rem" }}>🖼</div>
                <div style={{ color: "var(--ws-text3)", fontSize: ".8rem" }}>
                  {uploading
                    ? uploadProgress
                    : "Clique para enviar foto ou vídeo"}
                </div>
                <div style={{ color: "var(--ws-text3)", fontSize: ".68rem", fontFamily: "DM Mono" }}>
                  Selecione um ou mais arquivos
                </div>
              </div>
            )}

            {/* Progress enquanto sobe */}
            {uploading && mediaUrls.length > 0 && (
              <div style={{ color: "var(--ws-text3)", fontSize: ".75rem", marginBottom: 8, fontFamily: "DM Mono" }}>
                {uploadProgress}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void uploadFiles(e.target.files);
                }
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 12,
                marginTop: 8,
              }}
            >
              <div>
                <label className="ws-label">Tipo</label>
                <select
                  className="ws-input"
                  value={form.media_type}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      media_type: e.target.value as Post["media_type"],
                    }))
                  }
                >
                  <option value="feed">Feed (4:5)</option>
                  <option value="stories">Stories (9:16)</option>
                  <option value="reels">Reels (9:16)</option>
                  <option value="carousel">Carrossel (1:1)</option>
                </select>
              </div>

              <div>
                <label className="ws-label">Data agendada</label>
                <input
                  className="ws-input"
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      scheduled_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <label className="ws-label">Legenda</label>
            <textarea
              className="ws-input"
              value={form.caption}
              placeholder="Texto do post..."
              onChange={(e) =>
                setForm((prev) => ({ ...prev, caption: e.target.value }))
              }
              style={{ minHeight: 80, resize: "vertical", marginBottom: 12 }}
            />

            <label className="ws-label">Hashtags</label>
            <input
              className="ws-input"
              value={form.hashtags}
              placeholder="#marca #instagram..."
              onChange={(e) =>
                setForm((prev) => ({ ...prev, hashtags: e.target.value }))
              }
              style={{ marginBottom: 12 }}
            />

            <label className="ws-label">Informações extras</label>
            <textarea
              className="ws-input"
              value={form.extra_info}
              placeholder="Briefing, referências, observações..."
              onChange={(e) =>
                setForm((prev) => ({ ...prev, extra_info: e.target.value }))
              }
              style={{ minHeight: 60, resize: "vertical", marginBottom: 20 }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="ws-btn"
                onClick={() => void save()}
                disabled={saving || uploading}
                style={{ flex: 1 }}
              >
                {saving ? "Salvando..." : uploading ? uploadProgress : "Salvar post"}
              </button>

              <button className="ws-btn-ghost" onClick={closeModal}>
                Cancelar
              </button>
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
        />
      )}
    </div>
  );
}
