// client/src/workspace/WorkspaceApp.tsx
import { useState, useEffect, useRef, useCallback } from "react";
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
  const saved = localStorage.getItem("ws_page");
  if (saved && VALID_PAGES.includes(saved as PageId)) return saved as PageId;
  return "dashboard";
}

export default function WorkspaceApp() {
  const [page, setPage] = useState<PageId>(getSavedPage);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
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
    setLoading(true);
    setProfileError("");

    try {
      const { data: profileData, error: profileQueryError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileQueryError) {
        console.error("Erro ao buscar perfil:", profileQueryError);
        setProfile(null);
        setTasks([]);
        setProfileError("Não foi possível carregar seu perfil agora. Tente novamente em alguns segundos.");
        return;
      }

      if (!profileData) {
        console.warn("Perfil não encontrado para o usuário:", userId);
        setProfile(null);
        setTasks([]);
        setProfileError("Seu acesso foi encontrado, mas o perfil não está disponível no momento.");
        return;
      }

      setProfile(profileData);

      const { data: tks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, status")
        .neq("status", "concluido");

      if (tasksError) {
        console.error("Erro ao buscar tarefas do Pomodoro:", tasksError);
        setTasks([]);
      } else {
        setTasks(tks || []);
      }
    } catch (err) {
      console.error("Erro inesperado ao carregar sessão/perfil:", err);
      setProfile(null);
      setTasks([]);
      setProfileError("Ocorreu um erro ao restaurar sua sessão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("Erro ao obter sessão:", error);
          setProfile(null);
          setProfileError("Não foi possível verificar sua sessão.");
          setLoading(false);
          return;
        }

        const session = data.session;
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setProfileError("");
          setLoading(false);
        }
      } catch (err) {
        console.error("Erro ao iniciar autenticação:", err);
        if (!isMounted) return;
        setProfile(null);
        setProfileError("Não foi possível iniciar sua sessão.");
        setLoading(false);
      }
    }

    void bootstrapAuth();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setTasks([]);
        setProfileError("");
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  function navigate(newPage: PageId) {
    localStorage.setItem("ws_page", newPage);
    setPage(newPage);
  }

  if (loading) return <div className="ws-loading"><div className="ws-loading-dot" /></div>;

  if (!profile) {
    return (
      <>
        {profileError ? (
          <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 30, background: "rgba(233, 30, 140, 0.12)", border: "1px solid rgba(233, 30, 140, 0.35)", color: "#ffd6ec", padding: "10px 14px", borderRadius: 12, fontSize: ".88rem", fontFamily: "Poppins", maxWidth: 520, width: "calc(100% - 32px)" }}>
            {profileError}
          </div>
        ) : null}
        <LoginPage onLogin={setProfile} />
      </>
    );
  }

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
