// client/src/workspace/components/Pomodoro.tsx
const MODES = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };

export default function Pomodoro({ pomoState }: any) {
  const { pomoMode, setPomoMode, pomoSecs, setPomoSecs, pomoRunning, setPomoRunning, pomoSessions, pomoTaskId, setPomoTaskId, tasks } = pomoState;

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
    <div className="ws-page">
      <div className="ws-page-title">Pomodoro<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Foco e produtividade vinculados às suas tarefas</div>

      <div style={{ maxWidth: 500, margin: "20px auto", textAlign: "center", padding: 40 }} className="ws-card">
        {/* SELETOR DE TAREFA */}
        <div style={{ marginBottom: 25 }}>
          <label style={{ display: "block", fontSize: ".65rem", color: "var(--ws-text3)", marginBottom: 8, letterSpacing: "1px" }}>TRABALHANDO EM:</label>
          <select 
            value={pomoTaskId || ""} 
            onChange={(e) => setPomoTaskId(e.target.value)}
            style={{ 
              width: "100%", background: "var(--ws-surface2)", border: "1px solid var(--ws-border)", 
              color: "var(--ws-text)", padding: "10px", borderRadius: 8, fontSize: ".82rem", outline: "none" 
            }}
          >
            <option value="">Nenhuma tarefa selecionada</option>
            {tasks.map((t: any) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => changeMode("focus")} style={{ background: pomoMode === "focus" ? "var(--ws-accent)" : "none", color: pomoMode === "focus" ? "#fff" : "var(--ws-text3)", border: "1px solid var(--ws-border)", borderRadius: 20, padding: "5px 15px", cursor: "pointer", fontSize: ".7rem" }}>FOCO</button>
          <button onClick={() => changeMode("short")} style={{ background: pomoMode === "short" ? "var(--ws-accent)" : "none", color: pomoMode === "short" ? "#fff" : "var(--ws-text3)", border: "1px solid var(--ws-border)", borderRadius: 20, padding: "5px 15px", cursor: "pointer", fontSize: ".7rem" }}>PAUSA CURTA</button>
          <button onClick={() => changeMode("long")} style={{ background: pomoMode === "long" ? "var(--ws-accent)" : "none", color: pomoMode === "long" ? "#fff" : "var(--ws-text3)", border: "1px solid var(--ws-border)", borderRadius: 20, padding: "5px 15px", cursor: "pointer", fontSize: ".7rem" }}>PAUSA LONGA</button>
        </div>

        <div style={{ fontSize: "5.5rem", fontWeight: 800, color: "var(--ws-text)", margin: "10px 0", fontFamily: "Poppins" }}>{fmt(pomoSecs)}</div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
          <button className="ws-btn" onClick={() => setPomoRunning(!pomoRunning)} style={{ padding: "12px 30px" }}>{pomoRunning ? "PAUSAR" : "INICIAR"}</button>
          <button className="ws-btn-ghost" onClick={() => { setPomoRunning(false); setPomoSecs(MODES[pomoMode]); }}>REINICIAR</button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 30 }}>
          {pomoSessions.map((on: boolean, i: number) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: on ? "var(--ws-accent)" : "var(--ws-border2)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}