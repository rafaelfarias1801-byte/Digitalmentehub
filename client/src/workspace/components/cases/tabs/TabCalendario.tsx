import { useEffect, useMemo, useState } from "react";
import type { Profile } from "../../../../lib/supabaseClient";
import { supabase } from "../../../../lib/supabaseClient";
import { MONTHS_FULL } from "../constants";
import PostDetailModal from "../modals/PostDetailModal";
import Loader from "../shared/Loader";
import { normalizeWhatsAppPhone, parseDateAtNoon } from "../utils";
import type { Case, Post } from "../types";
import { useIsMobile } from "../../../hooks/useIsMobile";

interface TabCalendarioProps {
  caseData: Case;
  profile: Profile;
}

const TYPE_CFG: Record<string, { bg: string; text: string; border: string }> = {
  reels:    { bg: "#e91e8c22", text: "#e91e8c",  border: "#e91e8c" },
  carousel: { bg: "#ffd60022", text: "#c59600",  border: "#ffd600" },
  feed:     { bg: "#4dabf722", text: "#4dabf7",  border: "#4dabf7" },
  stories:  { bg: "#7b2fff22", text: "#aa77ff",  border: "#7b2fff" },
};

function typeLabel(type: string) {
  return { reels: "Reels", carousel: "Carrossel", feed: "Feed", stories: "Stories" }[type] ?? type;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function TabCalendario({ caseData, profile }: TabCalendarioProps) {
  const [posts, setPosts]       = useState<Post[]>([]);
  const [month, setMonth]       = useState(new Date().getMonth());
  const [year, setYear]         = useState(new Date().getFullYear());
  const [selected, setSelected] = useState<Post | null>(null);
  const [loading, setLoading]   = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data } = await supabase.from("posts").select("*").eq("case_id", caseData.id);
      if (mounted) { setPosts(data ?? []); setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, [caseData.id]);

  function updatePost(p: Post) {
    setPosts(prev => prev.map(x => x.id === p.id ? p : x));
    setSelected(p);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const todayStr    = new Date().toISOString().slice(0, 10);

  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  function postsForDay(day: number) {
    return posts.filter(p => {
      const d = parseDateAtNoon(p.scheduled_date);
      return d && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const monthPosts = useMemo(() =>
    posts.filter(p => { const d = parseDateAtNoon(p.scheduled_date); return d && d.getFullYear() === year && d.getMonth() === month; }),
    [posts, month, year]
  );

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0);  setYear(y => y + 1); } else setMonth(m => m + 1); }

  function sendWA() {
    const phone = normalizeWhatsAppPhone(caseData.phone);
    if (!phone || monthPosts.length === 0) return;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(
      `Olá${caseData.name ? ` ${caseData.name}` : ""}! 👋\n\nSeu conteúdo de *${MONTHS_FULL[month]} ${year}* está pronto — ${monthPosts.length} publicações.\n\nAcesse: https://www.digitalmentehub.com.br/workspace\n\nAguardamos seu feedback! ✅`
    )}`, "_blank");
  }

  if (loading) return <Loader />;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={prevMonth} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text2)", cursor: "pointer", width: 32, height: 32, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>

          {/* FONTE Poppins para o mês/ano */}
          <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: isMobile ? "1.1rem" : "1.4rem", color: "var(--ws-text)", letterSpacing: "-0.03em", minWidth: isMobile ? 120 : 170, textAlign: "center" }}>
            {MONTHS_FULL[month]} {year}
          </span>

          <button onClick={nextMonth} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text2)", cursor: "pointer", width: 32, height: 32, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          <button onClick={() => { setMonth(new Date().getMonth()); setYear(new Date().getFullYear()); }}
            style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text3)", cursor: "pointer", padding: "0 10px", height: 32, fontSize: ".68rem", fontFamily: "Poppins" }}>
            Hoje
          </button>
        </div>

        {!!caseData.phone && monthPosts.length > 0 && (
          <button onClick={sendWA} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", backgroundColor: "#25D366", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: ".76rem", fontWeight: 600 }}>
            📩 {isMobile ? "Enviar" : `Enviar ${MONTHS_FULL[month]} para aprovação`}
          </button>
        )}
      </div>

      {/* ── Legenda ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        {Object.entries(TYPE_CFG).map(([key, cfg]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".65rem", fontFamily: "Poppins", color: cfg.text }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.border }} />
            {typeLabel(key)}
          </div>
        ))}
      </div>

      {/* ── Grade ── */}
      <div style={{ border: "1px solid var(--ws-border)", borderRadius: 12, overflow: "hidden", background: "var(--ws-bg)" }}>
        {/* Cabeçalho dias */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--ws-surface)", borderBottom: "1px solid var(--ws-border)" }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", padding: "8px 2px", fontFamily: "Poppins", fontSize: ".58rem", letterSpacing: "1px", color: "var(--ws-text3)", textTransform: "uppercase" }}>{d}</div>
          ))}
        </div>

        {/* Células */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((day, idx) => {
            const dayStr   = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
            const isToday  = dayStr === todayStr;
            const dayPosts = day ? postsForDay(day) : [];
            const maxShow  = isMobile ? 1 : 3;

            return (
              <div key={idx} style={{
                minHeight: isMobile ? 54 : 96,
                borderRight: (idx + 1) % 7 === 0 ? "none" : "1px solid var(--ws-border)",
                borderBottom: "1px solid var(--ws-border)",
                padding: isMobile ? "3px 2px" : "5px 4px",
                background: day ? "var(--ws-surface)" : "var(--ws-bg)",
                opacity: day ? 1 : 0.2,
                overflow: "hidden",
              }}>
                {day && (
                  <>
                    <div style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 22, height: 22, borderRadius: "50%",
                      background: isToday ? caseData.color : "transparent",
                      fontSize: isMobile ? ".62rem" : ".72rem",
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "#fff" : "var(--ws-text2)",
                      fontFamily: "Poppins, sans-serif",
                      marginBottom: 2,
                    }}>{day}</div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {dayPosts.slice(0, maxShow).map(post => {
                        const cfg = TYPE_CFG[post.media_type] ?? TYPE_CFG.feed;
                        const label = post.slug || post.title || typeLabel(post.media_type);
                        return (
                          <button key={post.id} onClick={() => setSelected(post)} style={{
                            display: "block", width: "100%", textAlign: "left",
                            background: cfg.bg, borderLeft: `2px solid ${cfg.border}`,
                            border: "none", borderRadius: 3, padding: isMobile ? "1px 3px" : "2px 5px",
                            cursor: "pointer", fontSize: isMobile ? ".5rem" : ".62rem",
                            color: cfg.text, fontFamily: "Poppins", lineHeight: 1.4,
                            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                          }}>
                            {isMobile ? label.slice(0, 10) : label}
                          </button>
                        );
                      })}
                      {dayPosts.length > maxShow && (
                        <div style={{ fontSize: ".52rem", color: "var(--ws-text3)", fontFamily: "Poppins", paddingLeft: 3 }}>
                          +{dayPosts.length - maxShow}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <PostDetailModal post={selected} caseData={caseData} onClose={() => setSelected(null)} onUpdate={updatePost} profile={profile} />
      )}
    </div>
  );
}
