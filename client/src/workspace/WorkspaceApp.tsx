// client/src/workspace/WorkspaceApp.tsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../lib/supabaseClient";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Checklist from "./components/Checklist";
import Agenda from "./components/Agenda";
import Financeiro from "./components/Financeiro";
import Cases from "./components/Cases";
import Notas from "./components/Notas";
import IA from "./components/IA";
import Pomodoro from "./components/Pomodoro";
import ClientView from "./components/ClientView";
import "./workspace.css";

export type PageId =
  | "dashboard"
  | "checklist"
  | "agenda"
  | "financeiro"
  | "cases"
  | "notas"
  | "ia"
  | "pomodoro";

const PAGES: Record<PageId, React.ComponentType<any>> = {
  dashboard:  Dashboard,
  checklist:  Checklist,
  agenda:     Agenda,
  financeiro: Financeiro,
  cases:      Cases,
  notas:      Notas,
  ia:         IA,
  pomodoro:   Pomodoro,
};

const VALID_PAGES = Object.keys(PAGES) as PageId[];

function getSavedPage(): PageId {
  const saved = localStorage.getItem("ws_page");
  if (saved && VALID_PAGES.includes(saved as PageId)) return saved as PageId;
  return "dashboard";
}

export default function WorkspaceApp() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<PageId>(getSavedPage);
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" && window.innerWidth >= 768);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
    setLoading(false);
  }

  function navigate(newPage: PageId) {
    localStorage.setItem("ws_page", newPage);
    setPage(newPage);
  }

  if (loading) return (
    <div className="ws-loading">
      <div className="ws-loading-dot" />
    </div>
  );

  if (!profile) return <LoginPage onLogin={setProfile} />;

  // Primeiro acesso: forçar troca de senha
  if (profile.must_change_password) {
    return (
      <ChangePasswordPage onDone={() => setProfile(p => p ? { ...p, must_change_password: false } : p)} />
    );
  }

  // Cliente: layout dedicado com apenas o case dele
  if (profile.role === "cliente") {
    return <ClientView profile={profile} />;
  }

  const CurrentPage = PAGES[page];

  return (
    <div className={`ws-layout${sidebarOpen ? "" : " ws-sidebar-collapsed"}`}>
      <Sidebar currentPage={page} onNavigate={navigate} profile={profile} onOpenChange={setSidebarOpen} />
      <main className="ws-main">
        <CurrentPage profile={profile} />
      </main>
    </div>
  );
}
