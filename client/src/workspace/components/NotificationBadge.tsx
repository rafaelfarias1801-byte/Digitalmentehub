// client/src/workspace/components/NotificationBadge.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  target_user_id?: string | null;
  target_role?: string | null;
  source?: "designer" | "cliente" | null;
  // Navigation fields — stored in DB when notification is fired
  case_id?: string | null;
  post_id?: string | null;
}

// Tipos originados de ações do designer (mostram com cor roxa para admin)
const DESIGNER_TYPES = new Set([
  "briefing_entregue",
  "designer_fechou_financeiro",
]);

// Tipos originados de ações do admin → não devem aparecer para o admin no sino
const ADMIN_TO_DESIGNER_TYPES = new Set([
  "briefing_criado",
  "briefing_revisao",
  "briefing_aprovado",
  "financeiro_aprovado",
]);

function getNotifStyle(n: AdminNotification): { color: string; bg: string; unreadDot: string } {
  const isDesigner = n.source === "designer" || DESIGNER_TYPES.has(n.type);
  if (isDesigner) {
    return {
      color:     "#6366f1",
      bg:        "rgba(99,102,241,0.07)",
      unreadDot: "#6366f1",
    };
  }
  return {
    color:     "#e91e8c",
    bg:        "rgba(233,30,140,0.05)",
    unreadDot: "var(--ws-accent)",
  };
}

interface Props { profile: Profile; }

export default function NotificationBadge({ profile }: Props) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<{ id: string; name: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // Load cases list once for notification navigation fallback
  useEffect(() => {
    supabase.from("cases").select("id, name").then(({ data }) => setCases(data ?? []));
  }, []);

  // Extract case name from notification title
  // e.g. "✅ ClienteName aprovou um post" → "ClienteName"
  function extractCaseName(title: string): string | null {
    // Strip leading emoji/symbols
    const cleaned = title.replace(/^[\p{Emoji}\s]+/u, "").trim();
    // Match up to the action verb
    const match = cleaned.match(/^(.+?)\s+(?:aprovou|comentou|reprovou|solicitou|fechou|enviou|pediu)/i);
    return match?.[1]?.trim() ?? null;
  }

  // Extract post title from notification body
  // e.g. '"Post Title" foi aprovado...' → "Post Title"
  function extractPostTitle(body: string): string | null {
    const match = body.match(/^"([^"]+)"/);
    return match?.[1] ?? null;
  }

  // Navigate to the resource the notification is about, then mark as read
  async function handleNotifClick(n: AdminNotification) {
    void markRead(n.id);
    setOpen(false);

    // Best case: notification already has case_id + post_id stored
    if (n.case_id && n.post_id) {
      setLocation(`/workspace/clientes/${n.case_id}/conteudo/post/${n.post_id}`);
      return;
    }
    if (n.case_id) {
      setLocation(`/workspace/clientes/${n.case_id}/conteudo`);
      return;
    }

    // Fallback: parse from notification content
    const caseName = extractCaseName(n.title);
    if (!caseName) return;

    const matched = cases.find(c => c.name.toLowerCase() === caseName.toLowerCase());
    if (!matched) return;

    const postTitle = extractPostTitle(n.body);
    if (postTitle) {
      const { data } = await supabase
        .from("posts")
        .select("id")
        .eq("case_id", matched.id)
        .or(`slug.eq.${postTitle},title.eq.${postTitle}`)
        .limit(1);
      if (data && data.length > 0) {
        setLocation(`/workspace/clientes/${matched.id}/conteudo/post/${data[0].id}`);
        return;
      }
    }
    // Navigate to case content tab even without specific post
    setLocation(`/workspace/clientes/${matched.id}/conteudo`);
  }

  const unread = notifications.filter(n => !n.read).length;
  // Cor do sino baseada no tipo da notificação não lida mais recente
  const firstUnread = notifications.find(n => !n.read);
  const bellColor = firstUnread && (firstUnread.source === "designer" || DESIGNER_TYPES.has(firstUnread.type))
    ? "#6366f1"
    : "var(--ws-accent)";

  useEffect(() => {
    load();

    // Realtime — escuta novas notificações para este usuário
    // Canal 1: notificações por role (ex: target_role=admin)
    const channelRole = supabase
      .channel(`notif_role_${profile.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "admin_notifications",
        filter: `target_role=eq.${profile.role}`,
      }, payload => {
        const n = payload.new as AdminNotification;
        const isAdminToDesigner = profile.role === "admin" && ADMIN_TO_DESIGNER_TYPES.has(n.type);
        if (!isAdminToDesigner) {
          setNotifications(prev => {
            if (prev.some(x => x.id === n.id)) return prev;
            return [n, ...prev].slice(0, 50);
          });
        }
      })
      .subscribe();

    // Canal 2: notificações diretas para este usuário (target_user_id)
    const channelUser = supabase
      .channel(`notif_user_${profile.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "admin_notifications",
        filter: `target_user_id=eq.${profile.id}`,
      }, payload => {
        const n = payload.new as AdminNotification;
        const isAdminToDesigner = profile.role === "admin" && ADMIN_TO_DESIGNER_TYPES.has(n.type);
        if (!isAdminToDesigner) {
          setNotifications(prev => {
            if (prev.some(x => x.id === n.id)) return prev;
            return [n, ...prev].slice(0, 50);
          });
        }
      })
      .subscribe();

    // Polling de fallback — garante que novas notificações apareçam mesmo se
    // o Realtime não estiver habilitado na tabela admin_notifications
    const pollInterval = setInterval(() => { void load(); }, 20000);

    return () => {
      void supabase.removeChannel(channelRole);
      void supabase.removeChannel(channelUser);
      clearInterval(pollInterval);
    };
  }, [profile.id]);

  async function load() {
    const { data } = await supabase
      .from("admin_notifications")
      .select("*")
      .or(`target_user_id.eq.${profile.id},target_role.eq.${profile.role}`)
      .order("created_at", { ascending: false })
      .limit(100);

    const filtered = (data ?? []).filter(n => {
      // Admin não vê notificações que ele mesmo disparou (admin→designer)
      if (profile.role === "admin" && ADMIN_TO_DESIGNER_TYPES.has(n.type)) return false;
      // Não mostrar notificações destinadas explicitamente a outro usuário
      if (n.target_user_id != null && n.target_user_id !== profile.id) return false;
      return true;
    });

    setNotifications(filtered);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase.from("admin_notifications").update({ read: true }).in("id", unreadIds);
  }

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from("admin_notifications").update({ read: true }).eq("id", id);
  }

  async function clearAll() {
    const readIds = notifications.filter(n => n.read).map(n => n.id);
    setNotifications([]);
    if (readIds.length > 0) {
      await supabase.from("admin_notifications").delete().in("id", readIds);
    }
  }

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function fmtTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "agora";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  return (
    <div ref={ref} style={{ position: "fixed", bottom: "calc(24px + var(--ws-bottom-bar-height, 0px))", right: 24, zIndex: 999 }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(p => !p); if (!open && unread > 0) void markAllRead(); }}
        style={{
          width: 48, height: 48, borderRadius: "50%",
          background: unread > 0 ? bellColor : "var(--ws-surface)",
          border: `2px solid ${unread > 0 ? bellColor : "var(--ws-border2)"}`,
          boxShadow: unread > 0 ? `0 4px 20px ${bellColor}55` : "0 2px 12px #00000030",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.2rem", transition: "all .2s", position: "relative",
        }}
        title="Notificações"
      >
        🔔
        {unread > 0 && (
          <div style={{
            position: "absolute", top: -4, right: -4,
            background: "#ff4433", color: "#fff",
            borderRadius: "50%", width: 20, height: 20,
            fontSize: ".62rem", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Poppins", border: "2px solid var(--ws-bg)",
          }}>
            {unread > 9 ? "9+" : unread}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", bottom: 58, right: 0,
          width: 340, maxHeight: 480,
          background: "var(--ws-surface)", border: "1px solid var(--ws-border2)",
          borderRadius: 16, boxShadow: "0 16px 48px #00000060",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ws-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)" }}>
              Notificações
              {unread > 0 && <span style={{ marginLeft: 8, background: "var(--ws-accent)", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: ".62rem", fontWeight: 800 }}>{unread}</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {notifications.length > 0 && (
                <button onClick={() => void clearAll()} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".68rem", fontFamily: "Poppins" }}>Limpar</button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--ws-text3)", fontSize: ".82rem", fontFamily: "Poppins" }}>
                Nenhuma notificação ainda.
              </div>
            ) : (
              notifications.map(n => {
                const style = getNotifStyle(n);
                // Every notification is navigable — either via stored ids or content parsing
                const isNavigable = true;
                return (
                <div
                  key={n.id}
                  onClick={() => void handleNotifClick(n)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--ws-border)",
                    background: n.read ? "transparent" : style.bg,
                    borderLeft: `3px solid ${n.read ? "transparent" : style.color}`,
                    cursor: "pointer", transition: "background .15s",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--ws-surface2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read ? "transparent" : style.bg; }}
                >
                  {!n.read && (
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: style.unreadDot, flexShrink: 0, marginTop: 5 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0, marginLeft: n.read ? 17 : 0 }}>
                    <div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ws-text)", marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: ".74rem", color: "var(--ws-text2)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {n.body}
                    </div>
                    {/* Tag de origem */}
                    <div style={{ fontSize: ".58rem", fontFamily: "Poppins", letterSpacing: ".8px", textTransform: "uppercase", color: style.color, marginTop: 4, fontWeight: 700 }}>
                      {(n.source === "designer" || DESIGNER_TYPES.has(n.type)) ? "🎨 Designer" : "👤 Cliente"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <div style={{ fontSize: ".65rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>
                      {fmtTime(n.created_at)}
                    </div>
                    {isNavigable && (
                      <div style={{ fontSize: ".6rem", color: style.color, fontFamily: "Poppins", fontWeight: 700 }}>↗ Ver</div>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
