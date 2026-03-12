// client/src/workspace/components/Pomodoro.tsx
import { useState, useEffect, useRef } from "react";

type Mode = "focus" | "short" | "long";
const MODES: Record<Mode, number> = { focus: 25*60, short: 5*60, long: 15*60 };

export default function Pomodoro() {
  const [mode, setMode]       = useState<Mode>("focus");
  const [secs, setSecs]       = useState(MODES.focus);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState([false, false, false, false]);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            clearInterval(ref.current!);
            setRunning(false);
            setSessions(prev => {
              const next = [...prev];
              const i = next.findIndex(v => !v);
              if (i !== -1) next[i] = true;
              return next;
            });
            return MODES[mode];
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(ref.current!);
    }
    return () => clearInterval(ref.current!);
  }, [running, mode]);

  function setModeAndReset(m: Mode) {
    setMode(m); setRunning(false); setSecs(MODES[m]);
  }

  function reset() {
    setRunning(false); setSecs(MODES[mode]);
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div className="ws-page">
      <div className="ws-page-title">Pomodoro<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Foco e produtividade por sessões</div>

      <div className="ws-pomo-wrap">
        <div className="ws-pomo-box">
          <div className="ws-pomo-tabs">
            {(["focus","short","long"] as Mode[]).map(m => (
              <button key={m} className={`ws-pomo-tab ${mode === m ? "active" : ""}`}
                onClick={() => setModeAndReset(m)}>
                {m === "focus" ? "Foco" : m === "short" ? "Pausa Curta" : "Pausa Longa"}
              </button>
            ))}
          </div>
          <div className="ws-pomo-time">{fmt(secs)}</div>
          <div className="ws-pomo-btns">
            <button className="ws-btn" onClick={() => setRunning(r => !r)}>
              {running ? "PAUSAR" : secs < MODES[mode] ? "CONTINUAR" : "INICIAR"}
            </button>
            <button className="ws-btn-ghost" onClick={reset}>RESET</button>
          </div>
          <div className="ws-pomo-dots">
            {sessions.map((on, i) => (
              <div key={i} className={`ws-pomo-dot ${on ? "on" : ""}`} />
            ))}
          </div>
        </div>

        <div className="ws-card" style={{ flex: 1 }}>
          <div className="ws-card-title">Dica de foco</div>
          <div style={{ color: "var(--ws-text2)", fontSize: ".84rem", lineHeight: 1.7 }}>
            <p>🍅 Trabalhe focado por <strong style={{ color: "var(--ws-accent)" }}>25 minutos</strong></p>
            <p style={{ marginTop: 8 }}>⏸ Faça uma pausa de <strong style={{ color: "var(--ws-text)" }}>5 minutos</strong></p>
            <p style={{ marginTop: 8 }}>🔄 A cada 4 sessões, pausa longa de <strong style={{ color: "var(--ws-text)" }}>15 minutos</strong></p>
            <div style={{ marginTop: 20, padding: "14px", background: "var(--ws-surface2)", borderRadius: "var(--ws-radius-sm)", fontSize: ".78rem", color: "var(--ws-text3)", fontFamily: "DM Mono" }}>
              SESSÕES COMPLETAS: {sessions.filter(Boolean).length}/4
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
