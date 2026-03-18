// client/src/workspace/components/Sidebar.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import type { PageId } from "../WorkspaceApp";

interface Props {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  profile: Profile;
  onOpenChange?: (open: boolean) => void;
}

const NAV = [
  { section: "Projetos", items: [
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "checklist", icon: "✓", label: "Checklist" },
    { id: "agenda",    icon: "▦", label: "Agenda" },
  ]},
  { section: "Gestão", items: [
    { id: "financeiro", icon: "◈", label: "Financeiro" },
    { id: "cases",      icon: "◉", label: "Clientes" },
  ]},
  { section: "Conteúdo", items: [
    { id: "notas", icon: "▤", label: "Notas" },
    { id: "ia",    icon: "◎", label: "IA" },
  ]},
  { section: "Produtividade", items: [
    { id: "pomodoro", icon: "◷", label: "Pomodoro" },
  ]},
];

const ADMIN_ONLY: PageId[] = ["financeiro", "notas", "ia"];

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

export default function Sidebar({ currentPage, onNavigate, profile, onOpenChange }: Props) {
  const isAdmin = profile.role === "admin";
  const [open, setOpen] = useState(!getIsMobile());
  const [theme, setTheme] = useState<"dark" | "light">(getSavedTheme);

  function setOpenAndNotify(val: boolean) {
    setOpen(val);
    onOpenChange?.(val);
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

  const isDark = theme === "dark";
  const isMobile = getIsMobile();

  return (
    <>
      {/* ── Overlay mobile ── */}
      {open && isMobile && (
        <div
          onClick={() => setOpenAndNotify(false)}
          style={{ position: "fixed", inset: 0, background: "#00000060", zIndex: 198 }}
        />
      )}

      {/* ── Painel da sidebar ── */}
      <aside
        className={`ws-sidebar${open ? "" : " ws-sidebar-mini"}`}
        style={{
          position: isMobile ? "fixed" : "relative",
          top: 0, left: 0, height: "100%",
          zIndex: 199,
          // Rail sempre visível (mobile e desktop). Slide só da sidebar completa.
          transform: "translateX(0)",
          transition: "transform .22s cubic-bezier(.4,0,.2,1), width .22s cubic-bezier(.4,0,.2,1), min-width .22s cubic-bezier(.4,0,.2,1)",
          boxShadow: "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ══════════════════════════════════
            MINI RAIL (desktop collapsed)
            Só ícones + botão de expandir
        ══════════════════════════════════ */}
        {!open && (
          <div className="ws-sidebar-rail">
            {/* Botão expandir */}
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

            {/* Avatar mini */}
            <div className="ws-rail-avatar" title={profile.name}>
              <div className="ws-avatar">{profile.initials}</div>
            </div>

            <div className="ws-rail-divider" />

            {/* Ícones de navegação */}
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

            {/* Theme toggle mini */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Tema escuro" : "Tema claro"}
              className="ws-rail-item"
              style={{ marginBottom: 4 }}
            >
              <span style={{ fontSize: "1rem" }}>{isDark ? "🌙" : "☀️"}</span>
            </button>

            {/* Logout mini */}
            <button
              onClick={() => supabase.auth.signOut()}
              title="Sair"
              className="ws-rail-item"
              style={{ marginBottom: 12 }}
            >
              <span style={{ fontSize: ".9rem", color: "var(--ws-text3)" }}>↩</span>
            </button>
          </div>
        )}

        {/* ══════════════════════════════════
            SIDEBAR COMPLETA
        ══════════════════════════════════ */}
        {open && (
          <>
            {/* ── Topo: brand + fechar ── */}
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

              <div className="ws-user-pill">
                <div className="ws-avatar">{profile.initials}</div>
                <div>
                  <div className="ws-user-name">{profile.name}</div>
                  <div className="ws-user-role">{profile.role}</div>
                </div>
              </div>
            </div>

            {/* ── Navegação ── */}
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

            {/* ── Toggle de tema ── */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--ws-border)" }}>
              <button
                onClick={toggleTheme}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "var(--ws-surface2)",
                  border: "1px solid var(--ws-border2)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  transition: "all .15s",
                  color: "var(--ws-text2)",
                  fontFamily: "Poppins, monospace",
                  fontSize: ".62rem",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
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

            {/* ── Footer: logout ── */}
            <div className="ws-sidebar-footer">
              <div className="ws-logout" onClick={() => supabase.auth.signOut()}>
                ↩ Sair
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
