// client/src/workspace/WorkspaceApp.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./lib/supabaseClient";
import type { Profile } from "./lib/supabaseClient";
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

export type PageId =
  | "dashboard"
  | "checklist"
  | "agenda"
  | "financeiro"
  | "cases"
  | "notas"
  | "ia"
  | "pomodoro"
  | "notificacoes";

const PAGES: Record<PageId, React.ComponentType<any>> = {
  dashboard: Dashboard,
  checklist: Checklist,
  agenda: Agenda,
  financeiro: Financeiro,
  cases: Cases,
  notas: Notas,
  ia: IA,
  pomodoro: Pomodoro,
  notificacoes: Notificacoes,
};

const VALID_PAGES = Object.keys(PAGES) as PageId[];

function getSavedPage(): PageId {
  try {
    const saved = localStorage.getItem("ws_page");
    if (saved && VALID_PAGES.includes(saved as PageId)) return saved as PageId;
  } catch {}
  return "dashboard";
}

export default function WorkspaceApp() {
  const [page, setPage] = useState<PageId>(getSavedPage);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingPost, setPendingPost] = useState<{ caseId: string; postId: string } | null>(null);

  // --- LÓGICA GLOBAL DO POMODORO ---
  const [pomoMode, setPomoMode] = useState<"focus" | "short" | "long">("focus");
  const [pomoSecs, setPomoSecs] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoSessions, setPomoSessions] = useState([false, false, false, false]);
  const [pomoTaskId, setPomoTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const notify = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 440;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Digitalmente Hub", {
        body: pomoMode === "focus" ? "Foco encerrado! Hora de uma pausa. ☕" : "Pausa encerrada! Vamos focar? 🚀",
      });
    }
  };

  useEffect(() => {
    if (pomoRunning) {
      timerRef.current = setInterval(() => {
        setPomoSecs((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current!);
            setPomoRunning(false);
            notify();
            if (pomoMode === "focus") {
              setPomoSessions((prev) => {
                const next = [...prev];
                const i = next.findIndex((v) => !v);
                if (i !== -1) next[i] = true;
                return next;
              });
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pomoRunning, pomoMode]);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      setLoading(true);

      const profilePromise = supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      const tasksPromise = supabase.from("tasks").select("id, title, status").neq("status", "concluido");

      const [profileResult, tasksResult] = await Promise.allSettled([profilePromise, tasksPromise]);

      if (profileResult.status === "fulfilled") {
        const { data, error } = profileResult.value;
        if (error) {
          console.error("Erro ao buscar perfil:", error);
          setProfile(null);
        } else {
          setProfile((data as Profile | null) ?? null);
        }
      } else {
        console.error("Falha inesperada ao buscar perfil:", profileResult.reason);
        setProfile(null);
      }

      if (tasksResult.status === "fulfilled") {
        const { data, error } = tasksResult.value;
        if (error) {
          console.error("Erro ao buscar tarefas:", error);
          setTasks([]);
        } else {
          setTasks(data || []);
        }
      } else {
        console.error("Falha inesperada ao buscar tarefas:", tasksResult.reason);
        setTasks([]);
      }
    } catch (error) {
      console.error("Erro ao reconstruir sessão:", error);
      setProfile(null);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        setLoading(true);
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("Erro ao restaurar sessão:", error);
          setProfile(null);
          setTasks([]);
          setLoading(false);
          return;
        }

        if (session?.user?.id) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setTasks([]);
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro no bootstrap da sessão:", error);
        if (isMounted) {
          setProfile(null);
          setTasks([]);
          setLoading(false);
        }
      }
    }

    bootstrap();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setTasks([]);
        setLoading(false);
        return;
      }

      if (session?.user?.id) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setTasks([]);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  function navigate(newPage: PageId) {
    try {
      localStorage.setItem("ws_page", newPage);
    } catch {}
    setPage(newPage);
  }

  if (loading) return <div className="ws-loading"><div className="ws-loading-dot" /></div>;
  if (!profile) return <LoginPage onLogin={setProfile} />;
  if (profile.must_change_password) return <ChangePasswordPage profile={profile} onPasswordChanged={() => setProfile({ ...profile, must_change_password: false })} />;
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
          onNavigateToPost={(caseId: string, postId: string) => {
            setPendingPost({ caseId, postId });
            navigate("cases");
          }}
          initialPostId={pendingPost?.postId}
          pomoState={{
            pomoMode,
            setPomoMode,
            pomoSecs,
            setPomoSecs,
            pomoRunning,
            setPomoRunning,
            pomoSessions,
            pomoTaskId,
            setPomoTaskId,
            tasks,
          }}
        />
      </main>
    </div>
  );
}
