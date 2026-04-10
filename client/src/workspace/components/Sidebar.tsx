// client/src/workspace/components/Sidebar.tsx
import React, { useState, useEffect, useRef } from "react";
import ProfileModal from "./ProfileModal";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import type { PageId } from "../WorkspaceApp";

interface Props {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  profile: Profile;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onProfileUpdate?: (profile: Profile) => void;
}

const NAV = [
  { section: "Projetos", items: [
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "checklist", icon: "✓", label: "Tarefas" },
    { id: "agenda",    icon: "▦", label: "Agenda" },
  ]},
  { section: "Gestão", items: [
    { id: "financeiro",   icon: "◈", label: "Financeiro" },
    { id: "cases",        icon: "◉", label: "Clientes" },
    { id: "notificacoes", icon: "◬", label: "Notificações" },
  ]},
  { section: "Conteúdo", items: [
    { id: "notas", icon: "▤", label: "Notas" },
    { id: "ia",    icon: "◎", label: "IA" },
  ]},
  { section: "Produtividade", items: [
    { id: "pomodoro", icon: "◷", label: "Pomodoro" },
  ]},
];

const ADMIN_ONLY: PageId[] = ["financeiro", "notas", "ia", "notificacoes"];

function getIsMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

function getSavedTheme(): "dark" | "light" {
  try {
    return (localStorage.getItem("ws_theme") as "dark" | "light") || "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  if (theme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  try { localStorage.setItem("ws_theme", theme); } catch {}
}

export default function Sidebar({ currentPage, onNavigate, profile, open: openProp, onOpenChange, onProfileUpdate }: Props) {
  const isAdmin = profile.role === "admin";
  const [openInternal, setOpenInternal] = useState(!getIsMobile());
  const open = openProp !== undefined ? openProp : openInternal;
  const [theme, setTheme] = useState<"dark" | "light">(getSavedTheme);

  // Ref para evitar closure stale no resize handler
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => { onOpenChangeRef.current = onOpenChange; }, [onOpenChange]);

  function setOpenAndNotify(val: boolean) {
    setOpenInternal(val);
    onOpenChangeRef.current?.(val);
  }

  useEffect(() => {
    applyTheme(theme);
  }, []);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) setOpenAndNotify(false);
      else setOpenAndNotify(true);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function navigate(page: PageId) {
    onNavigate(page);
    if (getIsMobile()) setOpenAndNotify(false);
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  const [profileModal, setProfileModal] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const isDark = theme === "dark";
  const isMobile = getIsMobile();

  const sidebarContent = (
    <>
      <div className="ws-sidebar-top" style={{ position: "relative" }}>
        <button
          onClick={() => setOpenAndNotify(false)}
          aria-label="Fechar menu"
          style={{
            position: "absolute", top: 10, right: 10,
            background: "none", border: "1px solid var(--ws-border2)",
            borderRadius: 6, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--ws-text3)", fontSize: ".75rem",
            transition: "all .15s", flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ws-text2)"; e.currentTarget.style.color = "var(--ws-text)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ws-border2)"; e.currentTarget.style.color = "var(--ws-text3)"; }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="ws-brand">DIG<span className="ws-dot">.</span></div>
        <div className="ws-brand-sub">Workspace</div>
        <div className="ws-user-pill" onClick={() => setProfileModal(true)} title="Editar perfil"
          style={{ cursor: "pointer", transition: "opacity .15s" }}
          onMouseEnter={e => { e.currentTarget.style.opacity = ".8"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <div className="ws-avatar" style={{ overflow: "hidden" }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : profile.initials
            }
          </div>
          <div>
            <div className="ws-user-name">{profile.name}</div>
            <div className="ws-user-role">{profile.role} · <span style={{ color: "var(--ws-accent)", fontSize: ".6rem" }}>✏ editar</span></div>
          </div>
        </div>
      </div>

      <nav className="ws-nav" style={{ flex: 1, overflowY: "auto" }}>
        {NAV.map(group => (
          <div key={group.section}>
            <div className="ws-nav-section">{group.section}</div>
            {group.items.map(item => {
              if (ADMIN_ONLY.includes(item.id as PageId) && !isAdmin) return null;
              return (
                <div
                  key={item.id}
                  className={`ws-nav-item ${currentPage === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id as PageId)}
                >
                  <span className="ws-nav-icon">{item.icon}</span>
                  {item.label}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--ws-border)" }}>
        <button
          onClick={toggleTheme}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", background: "var(--ws-surface2)",
            border: "1px solid var(--ws-border2)", borderRadius: 10,
            padding: "10px 14px", cursor: "pointer", transition: "all .15s",
            color: "var(--ws-text2)", fontFamily: "Poppins, monospace",
            fontSize: ".62rem", letterSpacing: "1px", textTransform: "uppercase",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ws-accent)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ws-border2)"; }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1rem" }}>{isDark ? "🌙" : "☀️"}</span>
            {isDark ? "Tema escuro" : "Tema claro"}
          </span>
          <span style={{
            width: 36, height: 20, borderRadius: 999,
            background: isDark ? "var(--ws-surface3)" : "var(--ws-accent)",
            position: "relative", flexShrink: 0, transition: "background .2s",
          }}>
            <span style={{
              position: "absolute", top: 3, left: isDark ? 3 : 19,
              width: 14, height: 14, borderRadius: "50%",
              background: isDark ? "var(--ws-text3)" : "#fff",
              transition: "left .2s",
            }} />
          </span>
        </button>
      </div>

      <div className="ws-sidebar-footer">
        <div className="ws-logout" onClick={() => supabase.auth.signOut()}>
          ↩ Sair
        </div>
      </div>
    </>
  );

  // ── Mobile Admin: Bottom Bar ────────────────────────────────────
  if (isMobile && isAdmin) {
    const allItems = NAV.flatMap(g => g.items);
    const PINNED: PageId[] = ["dashboard", "cases", "checklist"];
    const pinnedItems = PINNED.map(id => allItems.find(i => i.id === id)!).filter(Boolean);
    const moreItems = allItems.filter(i => !PINNED.includes(i.id as PageId));

    const btnBase: React.CSSProperties = {
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 3, background: "none", border: "none", cursor: "pointer", padding: "6px 2px",
      fontSize: ".58rem", fontFamily: "Poppins, sans-serif", letterSpacing: ".3px",
      transition: "color .15s",
    };

    return (
      <>
        {/* Sidebar overlay quando aberta (para perfil/tema) */}
        {open && (
          <>
            <div onClick={() => setOpenAndNotify(false)} style={{ position: "fixed", inset: 0, background: "#00000060", zIndex: 198 }} />
            <aside className="ws-sidebar" style={{ position: "fixed", top: 0, left: 0, height: "100%", zIndex: 199, boxShadow: "4px 0 24px #00000050", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {sidebarContent}
            </aside>
          </>
        )}

        {/* Sheet do "Mais" */}
        {mobileMoreOpen && (
          <>
            <div onClick={() => setMobileMoreOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000055", zIndex: 298 }} />
            <div style={{ position: "fixed", bottom: 60, left: 0, right: 0, background: "var(--ws-surface)", borderTop: "1px solid var(--ws-border)", borderRadius: "16px 16px 0 0", padding: "16px 12px 8px", zIndex: 299 }}>
              <div style={{ width: 36, height: 4, background: "var(--ws-border2)", borderRadius: 2, margin: "0 auto 16px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                {moreItems.map(item => {
                  const isActive = currentPage === item.id as PageId;
                  return (
                    <button key={item.id} onClick={() => { navigate(item.id as PageId); setMobileMoreOpen(false); }} style={{ ...btnBase, background: isActive ? "var(--ws-surface2)" : "transparent", borderRadius: 12, padding: "10px 4px", color: isActive ? "var(--ws-accent)" : "var(--ws-text3)" }}>
                      <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <button onClick={() => { toggleTheme(); }} style={{ ...btnBase, background: "transparent", borderRadius: 12, padding: "10px 4px", color: "var(--ws-text3)" }}>
                  <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{isDark ? "🌙" : "☀️"}</span>
                  <span>{isDark ? "Escuro" : "Claro"}</span>
                </button>
                <button onClick={() => { setMobileMoreOpen(false); setOpenAndNotify(true); }} style={{ ...btnBase, background: "transparent", borderRadius: 12, padding: "10px 4px", color: "var(--ws-text3)" }}>
                  <div className="ws-avatar" style={{ width: 26, height: 26, fontSize: ".6rem", overflow: "hidden" }}>
                    {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : profile.initials}
                  </div>
                  <span>Perfil</span>
                </button>
                <button onClick={() => supabase.auth.signOut()} style={{ ...btnBase, background: "transparent", borderRadius: 12, padding: "10px 4px", color: "#d63232" }}>
                  <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>↩</span>
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Bottom Bar fixa */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 60, background: "var(--ws-surface)", borderTop: "1px solid var(--ws-border)", zIndex: 200, display: "flex", alignItems: "stretch", paddingBottom: "env(safe-area-inset-bottom)" }}>
          {pinnedItems.map(item => {
            const isActive = currentPage === item.id as PageId;
            return (
              <button key={item.id} onClick={() => navigate(item.id as PageId)} style={{ ...btnBase, color: isActive ? "var(--ws-accent)" : "var(--ws-text3)", borderTop: isActive ? `2px solid var(--ws-accent)` : "2px solid transparent" }}>
                <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => setMobileMoreOpen(v => !v)} style={{ ...btnBase, color: mobileMoreOpen ? "var(--ws-accent)" : "var(--ws-text3)", borderTop: mobileMoreOpen ? "2px solid var(--ws-accent)" : "2px solid transparent" }}>
            <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>☰</span>
            <span>Mais</span>
          </button>
        </div>

        {/* Espaço para o conteúdo não ficar sob a barra + eleva o sino */}
        <style>{`.ws-page { padding-bottom: 70px !important; } :root { --ws-bottom-bar-height: 60px; }`}</style>

        {profileModal && (
          <ProfileModal profile={profile} onClose={() => setProfileModal(false)} onUpdate={(updated) => { setProfileModal(false); if (onProfileUpdate) onProfileUpdate(updated); }} />
        )}
      </>
    );
  }

  return (
    <>
      {/* Overlay escuro no mobile quando sidebar aberta */}
      {open && isMobile && (
        <div
          onClick={() => setOpenAndNotify(false)}
          style={{ position: "fixed", inset: 0, background: "#00000060", zIndex: 198 }}
        />
      )}

      {/* ══════════════════════════════════
          RAIL — sempre no layout
          Desktop: só quando sidebar fechada
          Mobile: SEMPRE visível (nunca some)
      ══════════════════════════════════ */}
      {(!open || isMobile) && (
        <div
          className="ws-sidebar ws-sidebar-mini"
          style={{ position: "relative", flexShrink: 0 }}
        >
          <div className="ws-sidebar-rail">
            <button
              onClick={() => setOpenAndNotify(true)}
              aria-label="Expandir menu"
              className="ws-rail-expand"
              title="Expandir"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="ws-rail-avatar" title="Editar perfil" onClick={() => setOpenAndNotify(true)} style={{ cursor: "pointer" }}>
              <div className="ws-avatar" style={{ overflow: "hidden" }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                  : profile.initials
                }
              </div>
            </div>

            <div className="ws-rail-divider" />

            {NAV.map(group =>
              group.items.map(item => {
                if (ADMIN_ONLY.includes(item.id as PageId) && !isAdmin) return null;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id as PageId)}
                    title={item.label}
                    className={`ws-rail-item${isActive ? " active" : ""}`}
                  >
                    <span className="ws-rail-icon">{item.icon}</span>
                  </button>
                );
              })
            )}

            <div style={{ flex: 1 }} />

            <button
              onClick={toggleTheme}
              title={isDark ? "Tema escuro" : "Tema claro"}
              className="ws-rail-item"
              style={{ marginBottom: 4 }}
            >
              <span style={{ fontSize: "1rem" }}>{isDark ? "🌙" : "☀️"}</span>
            </button>

            <button
              onClick={() => supabase.auth.signOut()}
              title="Sair"
              className="ws-rail-item"
              style={{ marginBottom: 12 }}
            >
              <span style={{ fontSize: ".9rem", color: "var(--ws-text3)" }}>↩</span>
            </button>
          </div>
        </div>
      )}

      {/* Sidebar completa — DESKTOP: empurra o conteúdo normalmente */}
      {open && !isMobile && (
        <aside
          className="ws-sidebar"
          style={{
            position: "relative",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {sidebarContent}
        </aside>
      )}

      {/* Sidebar completa — MOBILE: fixed overlay por cima da rail */}
      {open && isMobile && (
        <aside
          className="ws-sidebar"
          style={{
            position: "fixed",
            top: 0, left: 0, height: "100%",
            zIndex: 199,
            boxShadow: "4px 0 24px #00000050",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {sidebarContent}
        </aside>
      )}
      {profileModal && (
        <ProfileModal
          profile={profile}
          onClose={() => setProfileModal(false)}
          onUpdate={(updated) => {
            setProfileModal(false);
            if (onProfileUpdate) onProfileUpdate(updated);
          }}
        />
      )}
    </>
  );
}
