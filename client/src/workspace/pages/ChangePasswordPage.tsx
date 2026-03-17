// client/src/workspace/pages/ChangePasswordPage.tsx
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Props {
  onDone: () => void;
}

export default function ChangePasswordPage({ onDone }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("A senha deve ter ao menos 6 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      // Marca must_change_password = false no profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
      }
      onDone();
    } catch (err: any) {
      setError(err?.message || "Erro ao atualizar senha.");
      setLoading(false);
    }
  }

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
        <input className="ws-input" type="password" value={password}
          onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
        <label className="ws-label" style={{ marginTop: 12 }}>Confirmar senha</label>
        <input className="ws-input" type="password" value={confirm}
          onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" required />
        {error && <div className="ws-login-error" style={{ marginTop: 10 }}>{error}</div>}
        <button className="ws-login-btn" type="submit" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? "SALVANDO..." : "DEFINIR SENHA E ENTRAR"}
        </button>
      </form>
    </div>
  );
}
