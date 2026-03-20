// client/src/workspace/components/Pomodoro.tsx
const MODES = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };

export default function Pomodoro({ pomoState }: any) {
  const { pomoMode, setPomoMode, pomoSecs, setPomoSecs, pomoRunning, setPomoRunning, pomoSessions } = pomoState;

  const changeMode = (m: "focus" | "short" | "long") => {
    setPomoRunning(false);
    setPomoMode(m);
    setPomoSecs(MODES[m]);
  };

  const fmt = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", padding: 40 }} className="ws-card">
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
        {Object.keys(MODES).map((m: any) => (
          <button key={m} onClick={() => changeMode(m)} style={{ 
            background: pomoMode === m ? "var(--ws-accent)" : "none",
            color: pomoMode === m ? "#fff" : "var(--ws-text3)",
            border: "1px solid var(--ws-border)", borderRadius: 20, padding: "5px 15px", cursor: "pointer"
          }}>{m.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ fontSize: "5rem", fontWeight: 800, color: "var(--ws-text)", margin: "20px 0" }}>{fmt(pomoSecs)}</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        <button className="ws-btn" onClick={() => setPomoRunning(!pomoRunning)}>{pomoRunning ? "PAUSAR" : "INICIAR"}</button>
        <button className="ws-btn-ghost" onClick={() => { setPomoRunning(false); setPomoSecs(MODES[pomoMode]); }}>RESET</button>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
        {pomoSessions.map((on: boolean, i: number) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: on ? "var(--ws-accent)" : "var(--ws-border2)" }} />
        ))}
      </div>
    </div>
  );
}