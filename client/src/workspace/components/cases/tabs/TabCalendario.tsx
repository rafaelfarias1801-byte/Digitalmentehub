import { useEffect, useMemo, useState } from "react";
import type { Profile } from "../../../../lib/supabaseClient";
import { supabase } from "../../../../lib/supabaseClient";
import { APPROVAL_STYLES, MONTHS_FULL } from "../constants";
import PostDetailModal from "../modals/PostDetailModal";
import MediaThumb from "../shared/MediaThumb";
import Loader from "../shared/Loader";
import { navBtnStyle } from "../styles";
import { normalizeWhatsAppPhone, parseDateAtNoon } from "../utils";
import type { Case, Post } from "../types";

interface TabCalendarioProps {
  caseData: Case;
  profile: Profile;
}

export default function TabCalendario({
  caseData,
  profile,
}: TabCalendarioProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [selected, setSelected] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPosts() {
      setLoading(true);

      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("case_id", caseData.id);

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

  function updatePost(updatedPost: Post) {
    setPosts((prev) =>
      prev.map((item) => (item.id === updatedPost.id ? updatedPost : item))
    );
    setSelected(updatedPost);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const cells = Array.from(
    { length: firstDay + daysInMonth },
    (_, index) => (index < firstDay ? null : index - firstDay + 1)
  );

  function postsForDay(day: number) {
    return posts.filter((post) => {
      if (!post.scheduled_date) return false;

      const date = parseDateAtNoon(post.scheduled_date);
      if (!date) return false;

      return (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      );
    });
  }

  const monthPosts = useMemo(() => {
    return posts.filter((post) => {
      if (!post.scheduled_date) return false;

      const date = parseDateAtNoon(post.scheduled_date);
      if (!date) return false;

      return date.getFullYear() === year && date.getMonth() === month;
    });
  }, [posts, month, year]);

  function sendMonthApprovalToWhatsApp() {
    const phone = normalizeWhatsAppPhone(caseData.phone);

    if (!phone || monthPosts.length === 0) return;

    const message = encodeURIComponent(
      `Olá${caseData.name ? ` ${caseData.name}` : ""}! 👋\n\n` +
        `Seu conteúdo do mês de *${MONTHS_FULL[month]} ${year}* está pronto! ` +
        `São ${monthPosts.length} publicações aguardando sua aprovação.\n\n` +
        `Acesse com seu login e senha:\n` +
        `https://www.digitalmentehub.com.br/workspace\n\n` +
        `Aguardamos seu feedback! ✅`
    );

    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  }

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => {
            if (month === 0) {
              setMonth(11);
              setYear((prev) => prev - 1);
            } else {
              setMonth((prev) => prev - 1);
            }
          }}
          style={navBtnStyle}
        >
          ‹
        </button>

        <span
          style={{
            fontFamily: "Syne",
            fontWeight: 700,
            fontSize: "1rem",
            color: "var(--ws-text)",
            minWidth: 170,
            textAlign: "center",
          }}
        >
          {MONTHS_FULL[month]} {year}
        </span>

        <button
          onClick={() => {
            if (month === 11) {
              setMonth(0);
              setYear((prev) => prev + 1);
            } else {
              setMonth((prev) => prev + 1);
            }
          }}
          style={navBtnStyle}
        >
          ›
        </button>
      </div>

      {!!caseData.phone && monthPosts.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
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
            📩 Enviar conteúdo de {MONTHS_FULL[month]} para aprovação
          </button>
        </div>
      )}

      <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 2,
    marginBottom: 24,
  }}
>
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div
            key={day}
            style={{
              textAlign: "center",
              fontFamily: "DM Mono",
              fontSize: ".6rem",
              color: "var(--ws-text3)",
              padding: "6px 0",
              letterSpacing: "1px",
            }}
          >
            {day}
          </div>
        ))}

        {cells.map((day, index) => {
          const dayPosts = day ? postsForDay(day) : [];

          return (
            <div
  key={index}
  style={{
    aspectRatio: "1 / 1",
    minHeight: 150,
    background: "var(--ws-surface)",
    borderRadius: 8,
    border: "1px solid var(--ws-border)",
    padding: "4px",
    opacity: day ? 1 : 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  }}
>
              {day && (
                <>
                  <div
                    style={{
                      fontSize: ".68rem",
                      color: "var(--ws-text3)",
                      marginBottom: 3,
                      fontFamily: "DM Mono",
                      padding: "0 2px",
                    }}
                  >
                    {day}
                  </div>

                  <div
  style={{
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  }}
>
  {dayPosts.slice(0, 1).map((post) => {
    const approval = APPROVAL_STYLES[post.approval_status];

    return (
      <div
        key={post.id}
        onClick={() => setSelected(post)}
        style={{
          borderRadius: 6,
          cursor: "pointer",
          overflow: "hidden",
          border: `1px solid ${approval.color}55`,
          background: "var(--ws-surface2)",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {post.media_url ? (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              minHeight: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: "#000",
              }}
            >
              <MediaThumb
                url={post.media_url}
                alt={post.title || post.slug || "Post"}
                mediaType={post.media_type}
              />
            </div>

            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(transparent 45%, #000000b5 100%)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                bottom: 4,
                left: 4,
                right: 4,
              }}
            >
              <div
                style={{
                  fontSize: ".58rem",
                  color: "#fff",
                  fontFamily: "DM Mono",
                  lineHeight: 1.2,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {post.slug || post.title || "Post"}
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: approval.color,
                boxShadow: "0 0 0 2px rgba(0,0,0,.35)",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              padding: "6px",
              background: `${approval.color}14`,
              borderLeft: `3px solid ${approval.color}`,
            }}
          >
            <div
              style={{
                fontSize: ".62rem",
                color: approval.color,
                fontFamily: "DM Mono",
                lineHeight: 1.3,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                width: "100%",
              }}
            >
              {post.slug || post.title || "Post"}
            </div>
          </div>
        )}
      </div>
    );
  })}

  {dayPosts.length > 1 && (
    <div
      style={{
        fontSize: ".56rem",
        color: "var(--ws-text3)",
        fontFamily: "DM Mono",
        textAlign: "center",
        paddingTop: 2,
      }}
    >
      +{dayPosts.length - 1} item(ns)
    </div>
  )}
</div>
                    const approval = APPROVAL_STYLES[post.approval_status];

                    return (
                      <div
  key={post.id}
  onClick={() => setSelected(post)}
  style={{
    borderRadius: 6,
    cursor: "pointer",
    overflow: "hidden",
    border: `1px solid ${approval.color}55`,
    background: "var(--ws-surface2)",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  }}
>
  {post.media_url ? (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        flex: 1,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "#000",
        }}
      >
        <MediaThumb
          url={post.media_url}
          alt={post.title || post.slug || "Post"}
          mediaType={post.media_type}
        />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(transparent 45%, #000000b5 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 4,
          left: 4,
          right: 4,
        }}
      >
        <div
          style={{
            fontSize: ".58rem",
            color: "#fff",
            fontFamily: "DM Mono",
            lineHeight: 1.2,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {post.slug || post.title || "Post"}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: approval.color,
          boxShadow: "0 0 0 2px rgba(0,0,0,.35)",
        }}
      />
    </div>
  ) : (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "flex-end",
        padding: "6px",
        background: `${approval.color}14`,
        borderLeft: `3px solid ${approval.color}`,
      }}
    >
      <div
        style={{
          fontSize: ".62rem",
          color: approval.color,
          fontFamily: "DM Mono",
          lineHeight: 1.3,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          width: "100%",
        }}
      >
        {post.slug || post.title || "Post"}
      </div>
    </div>
  )}
</div>
                    );
                  })}
              )}
            </div>
          );
        })}
      </div>

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
