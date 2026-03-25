// client/src/workspace/components/DesignerChangePassword.tsx
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Props {
  onDone: () => void;
  isFirstAccess?: boolean;
}

export default function DesignerChangePassword({ onDone, isFirstAccess = false }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("A senha deve ter ao menos 6 caracteres."); return; }
    if (password !== confirm)  { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
      }
      setSuccess(true);
      setTimeout(() => onDone(), 1200);
    } catch (err: any) {
      setError(err?.message || "Erro ao atualizar senha.");
      setLoading(false);
    }
  }

  if (isFirstAccess) {
    return (
      <div className="ws-login">
        <div className="ws-login-bg" />
        <div className="ws-login-waves">
          <svg viewBox="0 0 1440 900" preserveAspectRatio="none" fill="none">
            <path d="M0 450 Q360 200 720 450 Q1080 700 1440 450" stroke="#7b2fff" strokeWidth="1.5"/>
            <path d="M0 500 Q360 250 720 500 Q1080 750 1440 500" stroke="#e91e8c" strokeWidth="1"/>
            <path d="M0 400 Q360 150 720 400 Q1080 650 1440 400" stroke="#7b2fff" strokeWidth="0.8"/>
          </svg>
        </div>
        <form className="ws-login-card" onSubmit={handleSubmit}>
          <div className="ws-logo">DIG<span className="ws-dot">.</span></div>
          <div className="ws-logo-sub">Primeiro acesso — defina sua senha</div>
          <p style={{ fontSize: ".8rem", color: "var(--ws-text3)", marginBottom: 16, lineHeight: 1.5 }}>
            Bem-vindo! Por segurança, crie uma senha personalizada para continuar.
          </p>
          <label className="ws-label">Nova senha</label>
          <input className="ws-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
          <label className="ws-label" style={{ marginTop: 12 }}>Confirmar senha</label>
          <input className="ws-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" required />
          {error && <div className="ws-login-error" style={{ marginTop: 10 }}>{error}</div>}
          {success && <div style={{ marginTop: 10, color: "#00e676", fontSize: ".82rem", fontFamily: "Poppins" }}>✓ Senha definida! Entrando...</div>}
          <button className="ws-login-btn" type="submit" disabled={loading || success} style={{ marginTop: 16 }}>
            {loading ? "SALVANDO..." : "DEFINIR SENHA E ENTRAR"}
          </button>
        </form>
      </div>
    );
  }

  // Modal de troca de senha (não primeiro acesso)
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onDone()}>
      <form onSubmit={handleSubmit} style={{ background: "var(--ws-surface)", borderRadius: 16, padding: "28px", maxWidth: 380, width: "100%" }}>
        <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1rem", color: "var(--ws-text)", marginBottom: 4 }}>Alterar senha</div>
        <div style={{ fontSize: ".74rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginBottom: 20 }}>Defina uma nova senha de acesso.</div>

        <label className="ws-label">Nova senha</label>
        <input className="ws-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required style={{ marginBottom: 12 }} />

        <label className="ws-label">Confirmar senha</label>
        <input className="ws-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" required style={{ marginBottom: 16 }} />

        {error && <div style={{ color: "#e91e8c", fontSize: ".78rem", fontFamily: "Poppins", marginBottom: 12 }}>{error}</div>}
        {success && <div style={{ color: "#00e676", fontSize: ".78rem", fontFamily: "Poppins", marginBottom: 12 }}>✓ Senha alterada com sucesso!</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={loading || success} style={{ flex: 1, background: "#e91e8c", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: ".84rem", fontWeight: 700, padding: "10px 0", fontFamily: "Poppins" }}>
            {loading ? "Salvando..." : "Salvar senha"}
          </button>
          <button type="button" onClick={onDone} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text2)", cursor: "pointer", fontSize: ".82rem", padding: "10px 16px", fontFamily: "Poppins" }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
