// client/src/workspace/WorkspaceApp.tsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../lib/supabaseClient";
import LoginPage from "./pages/LoginPage";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Checklist from "./components/Checklist";
import Agenda from "./components/Agenda";
import Financeiro from "./components/Financeiro";
import Cases from "./components/Cases";
import Notas from "./components/Notas";
import IA from "./components/IA";
import Pomodoro from "./components/Pomodoro";
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

export default function WorkspaceApp() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<PageId>("dashboard");

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

  if (loading) return (
    <div className="ws-loading">
      <div className="ws-loading-dot" />
    </div>
  );

  if (!profile) return <LoginPage onLogin={setProfile} />;

  const CurrentPage = PAGES[page];

  return (
    <div className="ws-layout">
      <Sidebar currentPage={page} onNavigate={setPage} profile={profile} />
      <main className="ws-main">
        <CurrentPage profile={profile} />
      </main>
    </div>
  );
}
