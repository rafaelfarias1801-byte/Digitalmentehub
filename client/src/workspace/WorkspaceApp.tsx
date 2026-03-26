// client/src/workspace/WorkspaceApp.tsx
import { useState, useEffect, useRef } from "react";
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
import Notificacoes from "./components/Notificacoes";
import DesignerView from "./components/DesignerView";
import "./workspace.css";

export type PageId = "dashboard" | "checklist" | "agenda" | "financeiro" | "cases" | "notas" | "ia" | "pomodoro" | "notificacoes";

const PAGES: Record<PageId, React.ComponentType<any>> = {
  dashboard:  Dashboard,
  checklist:  Checklist,
  agenda:     Agenda,
  financeiro: Financeiro,
  cases:      Cases,
  notas:      Notas,
  ia:         IA,
  pomodoro:   Pomodoro,
  notificacoes: Notificacoes,
};

const VALID_PAGES = Object.keys(PAGES) as PageId[];

function getSavedPage(): PageId {
  const saved = localStorage.getItem("ws_page");
  if (saved && VALID_PAGES.includes(saved as PageId)) return saved as PageId;
  return "dashboard";
}

export default function WorkspaceApp() {
  const [page, setPage] = useState<PageId>(getSavedPage);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingPost, setPendingPost] = useState<{ caseId: string, postId: string } | null>(null);

  // --- LÓGICA GLOBAL DO POMODORO ---
  const [pomoMode, setPomoMode] = useState<"focus" | "short" | "long">("focus");
  const [pomoSecs, setPomoSecs] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoSessions, setPomoSessions] = useState([false, false, false, false]);
  const [pomoTaskId, setPomoTaskId] = useState<string | null>(null); // Vínculo com tarefa
  const [tasks, setTasks] = useState<any[]>([]); // Lista de tarefas para o seletor
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const notify = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.value = 440; gain.gain.value = 0.1;
    osc.start(); osc.stop(audioCtx.currentTime + 0.5);

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Digitalmente Hub", { 
        body: pomoMode === "focus" ? "Foco encerrado! Hora de uma pausa. ☕" : "Pausa encerrada! Vamos focar? 🚀" 
      });
    }
  };

  useEffect(() => {
    if (pomoRunning) {
      timerRef.current = setInterval(() => {
        setPomoSecs(s => {
          if (s <= 1) {
            clearInterval(timerRef.current!);
            setPomoRunning(false);
            notify();
            if (pomoMode === "focus") {
              setPomoSessions(prev => {
                const next = [...prev];
                const i = next.findIndex(v => !v);
                if (i !== -1) next[i] = true;
                return next;
              });
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pomoRunning, pomoMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
    
    // Busca as tarefas abertas para o Pomodoro
    const { data: tks } = await supabase.from("tasks").select("id, title, status").neq("status", "concluido");
    setTasks(tks || []);
    setLoading(false);
  }

  function navigate(newPage: PageId) {
    localStorage.setItem("ws_page", newPage);
    setPage(newPage);
  }

  if (loading) return <div className="ws-loading"><div className="ws-loading-dot" /></div>;
  if (!profile) return <LoginPage onLogin={setProfile} />;
  if (profile.role === "cliente") return <ClientView profile={profile} />;
  if (profile.role === "designer") return <DesignerView profile={profile} />;

  const CurrentPage = PAGES[page];

  return (
    <div className="ws-layout">
      <Sidebar currentPage={page} onNavigate={navigate} profile={profile} open={sidebarOpen} onOpenChange={setSidebarOpen} onProfileUpdate={setProfile} />
      <main className="ws-main">
        <CurrentPage
          profile={profile}
          onCaseOpen={() => setSidebarOpen(false)}
          onCaseClose={() => setSidebarOpen(true)}
          onNavigateToPost={(caseId: string, postId: string) => { setPendingPost({ caseId, postId }); navigate("cases"); }}
          initialPostId={pendingPost?.postId}
          // ESTADO COMPLETO DO POMODORO
          pomoState={{ pomoMode, setPomoMode, pomoSecs, setPomoSecs, pomoRunning, setPomoRunning, pomoSessions, pomoTaskId, setPomoTaskId, tasks }}
        />
      </main>
    </div>
  );
}