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
  const [activeMonth, setActiveMonth] = useState<string>("");

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

  async function uploadMedia(file: File) {
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `posts/${caseData.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("assets")
      .upload(path, file, { upsert: true });

    if (!error) {
      const { data } = supabase.storage.from("assets").getPublicUrl(path);

      setForm((prev) => ({
        ...prev,
        media_url: data.publicUrl,
      }));
    }

    setUploading(false);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function save() {
    if (!form.slug.trim() && !form.title.trim()) return;

    setSaving(true);

    const payload = {
      ...form,
      case_id: caseData.id,
      slug: form.slug.trim(),
      title: form.title.trim(),
    };

    const { data } = await supabase
      .from("posts")
      .insert(payload)
      .select()
      .single();

    if (data) {
      setPosts((prev) => [...prev, data]);
      setModal(false);
      setForm(EMPTY_POST);
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="ws-btn" onClick={() => setModal(true)}>
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

      {modal && (
        <div
          style={overlayStyle}
          onClick={(e) => e.target === e.currentTarget && setModal(false)}
        >
          <div style={{ ...modalBoxStyle, width: 500 }}>
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

            <label className="ws-label">Mídia</label>
            <div
              style={{
                height: 120,
                borderRadius: 10,
                border: "1px dashed var(--ws-border2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                marginBottom: 8,
                background: "var(--ws-surface2)",
                overflow: "hidden",
              }}
              onClick={() => fileRef.current?.click()}
            >
              {form.media_url ? (
                <div style={{ width: "100%", height: "100%" }}>
                  <MediaThumb
                    url={form.media_url}
                    alt={form.title || form.slug || "Prévia"}
                    mediaType={form.media_type}
                  />
                </div>
              ) : (
                <div style={{ color: "var(--ws-text3)", fontSize: ".8rem" }}>
                  {uploading ? "Enviando..." : "Clique para enviar foto ou vídeo"}
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadMedia(file);
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
                {saving ? "Salvando..." : "Salvar post"}
              </button>

              <button className="ws-btn-ghost" onClick={() => setModal(false)}>
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
