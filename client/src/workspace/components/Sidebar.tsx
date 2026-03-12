// client/src/workspace/components/Sidebar.tsx
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

export default function Sidebar({ currentPage, onNavigate, profile }: Props) {
  const isAdmin = profile.role === "admin";

  return (
    <aside className="ws-sidebar">
      <div className="ws-sidebar-top">
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

      <nav className="ws-nav">
        {NAV.map(group => (
          <div key={group.section}>
            <div className="ws-nav-section">{group.section}</div>
            {group.items.map(item => {
              if (ADMIN_ONLY.includes(item.id as PageId) && !isAdmin) return null;
              return (
                <div
                  key={item.id}
                  className={`ws-nav-item ${currentPage === item.id ? "active" : ""}`}
                  onClick={() => onNavigate(item.id as PageId)}
                >
                  <span className="ws-nav-icon">{item.icon}</span>
                  {item.label}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="ws-sidebar-footer">
        <div className="ws-logout" onClick={() => supabase.auth.signOut()}>
          ↩ Sair
        </div>
      </div>
    </aside>
  );
}
