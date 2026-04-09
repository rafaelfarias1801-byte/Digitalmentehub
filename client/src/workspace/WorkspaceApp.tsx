// client/src/workspace/WorkspaceApp.tsx
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
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
import { usePushNotification } from "./hooks/usePushNotification";
import NotificationBadge from "./components/NotificationBadge";
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

const PAGE_PATHS: Record<PageId, string> = {
  dashboard: "/workspace/dashboard",
  checklist: "/workspace/tarefas",
  agenda: "/workspace/agenda",
  financeiro: "/workspace/financeiro",
  cases: "/workspace/clientes",
  notas: "/workspace/notas",
  ia: "/workspace/ia",
  pomodoro: "/workspace/pomodoro",
  notificacoes: "/workspace/notificacoes",
};

function parseWorkspacePath(loc: string): { page: PageId; caseId?: string; tab?: string } {
  const path = loc.replace(/^\/workspace\/?/, "");
  const parts = path.split("/").filter(Boolean);
  const [segment = "", caseId, tab] = parts;
  const pageMap: Record<string, PageId> = {
    "": "dashboard", "dashboard": "dashboard",
    "tarefas": "checklist", "agenda": "agenda",
    "financeiro": "financeiro", "clientes": "cases",
    "notas": "notas", "ia": "ia",
    "pomodoro": "pomodoro", "notificacoes": "notificacoes",
  };
  return { page: pageMap[segment] ?? "dashboard", caseId, tab };
}

export default function WorkspaceApp() {
  const [location, setLocation] = useLocation();
  const { page, caseId, tab } = parseWorkspacePath(location);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingPost, setPendingPost] = useState<{ caseId: string; postId: string } | null>(null);

  const [pomoMode, setPomoMode] = useState<"focus" | "short" | "long">("focus");
  const [pomoSecs, setPomoSecs] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoSessions, setPomoSessions] = useState([false, false, false, false]);
  const [pomoTaskId, setPomoTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Push notifications para admin — deve ficar antes de qualquer return condicional
  usePushNotification(profile?.id);

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

  async function fetchProfile(userId: string) {
    try {
      setLoading(true);

      const [{ data: profileData, error: profileError }, { data: tks, error: tasksError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("tasks").select("id, title, status").neq("status", "concluido"),
      ]);

      if (!mountedRef.current) return;

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError);
        setProfile(null);
      } else {
        setProfile((profileData as Profile | null) ?? null);
      }

      if (tasksError) {
        console.error("Erro ao buscar tarefas:", tasksError);
        setTasks([]);
      } else {
        setTasks(tks || []);
      }
    } catch (error) {
      console.error("Erro ao carregar sessão/perfil:", error);
      if (!mountedRef.current) return;
      setProfile(null);
      setTasks([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    async function bootstrap() {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        if (error) {
          console.error("Erro ao restaurar sessão:", error);
          setProfile(null);
          setTasks([]);
          setLoading(false);
          return;
        }

        const userId = data.session?.user?.id ?? null;
        lastUserIdRef.current = userId;

        if (userId) {
          await fetchProfile(userId);
        } else {
          setProfile(null);
          setTasks([]);
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro no bootstrap:", error);
        if (!mountedRef.current) return;
        setProfile(null);
        setTasks([]);
        setLoading(false);
      }
    }

    bootstrap();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;

      if (event === "SIGNED_OUT") {
        lastUserIdRef.current = null;
        if (mountedRef.current) {
          setProfile(null);
          setTasks([]);
          setLoading(false);
        }
        return;
      }

      if (!userId) {
        lastUserIdRef.current = null;
        if (mountedRef.current) {
          setProfile(null);
          setTasks([]);
          setLoading(false);
        }
        return;
      }

      if (lastUserIdRef.current === userId && event === "INITIAL_SESSION") {
        return;
      }

      lastUserIdRef.current = userId;
      void fetchProfile(userId);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  function navigate(newPage: PageId) {
    setLocation(PAGE_PATHS[newPage]);
  }

  if (loading) return <div className="ws-loading"><div className="ws-loading-dot" /></div>;
  if (!profile) return <LoginPage onLogin={setProfile} />;
  if (profile.must_change_password) {
    return (
      <ChangePasswordPage
        profile={profile}
        onPasswordChanged={() => setProfile({ ...profile, must_change_password: false })}
      />
    );
  }
  if (profile.role === "cliente") {
    // Normaliza URL do cliente para /workspace/cliente/:tab
    const clientTabMatch = location.match(/^\/workspace\/cliente\/([^/]+)$/);
    const clientTab = clientTabMatch ? clientTabMatch[1] : "calendario";
    // Se a URL não está no formato correto do cliente, redireciona
    if (!location.startsWith("/workspace/cliente")) {
      setLocation(`/workspace/cliente/${clientTab}`);
    }
    return (
      <ClientView
        profile={profile}
        initialTab={clientTab}
        onTabChange={(t) => setLocation(`/workspace/cliente/${t}`)}
      />
    );
  }
  if (profile.role === "designer") return <DesignerView profile={profile} />;

  function renderContent() {
    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            profile={profile!}
            onNavigateToPost={(cId: string, postId: string) => {
              setPendingPost({ caseId: cId, postId });
              setLocation(`/workspace/clientes/${cId}`);
            }}
          />
        );
      case "checklist":
        return <Checklist profile={profile!} />;
      case "agenda":
        return <Agenda profile={profile!} />;
      case "financeiro":
        return <Financeiro profile={profile!} />;
      case "notas":
        return <Notas profile={profile!} />;
      case "ia":
        return <IA profile={profile!} />;
      case "pomodoro":
        return (
          <Pomodoro
            profile={profile!}
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
        );
      case "notificacoes":
        return <Notificacoes profile={profile!} />;
      case "cases":
        return (
          <Cases
            profile={profile!}
            initialCaseId={caseId}
            initialTab={tab}
            initialPost={pendingPost}
            onCaseOpen={(id: string) => { setSidebarOpen(false); setLocation(`/workspace/clientes/${id}`); }}
            onCaseClose={() => { setSidebarOpen(true); setLocation("/workspace/clientes"); }}
            onCaseTabChange={(id: string, tabId: string) => { setLocation(`/workspace/clientes/${id}/${tabId}`); }}
            onNavigateToPost={(cId: string, postId: string) => { setPendingPost({ caseId: cId, postId }); setLocation(`/workspace/clientes/${cId}`); }}
          />
        );
      default:
        setLocation("/workspace/dashboard");
        return null;
    }
  }

  return (
    <div className="ws-layout">
      <Sidebar
        currentPage={page}
        onNavigate={navigate}
        profile={profile}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onProfileUpdate={setProfile}
      />
      <NotificationBadge profile={profile} />
      <main className="ws-main">
        {renderContent()}
      </main>
    </div>
  );
}
