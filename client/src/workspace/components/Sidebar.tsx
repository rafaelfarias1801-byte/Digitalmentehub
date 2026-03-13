// client/src/workspace/components/Sidebar.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import type { PageId } from "../WorkspaceApp";

interface Props {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  profile: Profile;
}

const NAV = [
  { section: "Projetos", items: [
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "checklist", icon: "✓", label: "Checklist" },
    { id: "agenda",    icon: "▦", label: "Agenda" },
  ]},
  { section: "Gestão", items: [
    { id: "financeiro", icon: "◈", label: "Financeiro" },
    { id: "cases",      icon: "◉", label: "Cases" },
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

function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

export default function Sidebar({ currentPage, onNavigate, profile }: Props) {
  const isAdmin = profile.role === "admin";

  // On mobile starts closed; on desktop starts open
  const [open, setOpen] = useState(!isMobile());

  // Close on resize to mobile
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) setOpen(false);
      else setOpen(true);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar when navigating on mobile
  function navigate(page: PageId) {
    onNavigate(page);
    if (isMobile()) setOpen(false);
  }

  return (
    <>
      {/* ── Hamburger button — always visible when sidebar is closed ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 300,
            background: "var(--ws-surface)",
            border: "1px solid var(--ws-border2)",
            borderRadius: 8,
            width: 38,
            height: 38,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            cursor: "pointer",
            boxShadow: "0 2px 12px #00000040",
            transition: "all .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--ws-accent)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--ws-border2)"}
        >
          {/* Hamburger lines */}
          <span style={{ display: "block", width: 16, height: 2, background: "var(--ws-text)", borderRadius: 2 }} />
          <span style={{ display: "block", width: 16, height: 2, background: "var(--ws-text)", borderRadius: 2 }} />
          <span style={{ display: "block", width: 12, height: 2, background: "var(--ws-text)", borderRadius: 2, alignSelf: "flex-start", marginLeft: 2 }} />
        </button>
      )}

      {/* ── Overlay for mobile when open ── */}
      {open && isMobile() && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "#00000060",
            zIndex: 198,
          }}
        />
      )}

      {/* ── Sidebar panel ── */}
      <aside
        className="ws-sidebar"
        style={{
          position: isMobile() ? "fixed" : "relative",
          top: 0,
          left: 0,
          height: "100%",
          zIndex: 199,
          transform: open ? "translateX(0)" : "translateX(-110%)",
          transition: "transform .22s cubic-bezier(.4,0,.2,1)",
          boxShadow: open && isMobile() ? "4px 0 24px #00000050" : "none",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Top: brand + close button ── */}
        <div className="ws-sidebar-top" style={{ position: "relative" }}>
          {/* Close / collapse button */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            title="Ocultar sidebar"
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "none",
              border: "1px solid var(--ws-border2)",
              borderRadius: 6,
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--ws-text3)",
              fontSize: ".75rem",
              transition: "all .15s",
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--ws-text2)";
              e.currentTarget.style.color = "var(--ws-text)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--ws-border2)";
              e.currentTarget.style.color = "var(--ws-text3)";
            }}
          >
            {/* X icon */}
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

        {/* ── Navigation ── */}
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

        {/* ── Footer: logout ── */}
        <div className="ws-sidebar-footer">
          <div className="ws-logout" onClick={() => supabase.auth.signOut()}>
            ↩ Sair
          </div>
        </div>
      </aside>
    </>
  );
}
