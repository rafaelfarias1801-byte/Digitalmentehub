// client/src/workspace/pages/LoginPage.tsx
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";

interface Props {
  onLogin: (profile: Profile) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      // Mantemos o checkbox visualmente, mas não forçamos remoção manual de storage,
      // porque isso estava gerando instabilidade na restauração da sessão.
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) {
        // O listener global de auth ainda deve reconstruir a sessão,
        // mas evitamos deixar o botão travado caso o retorno venha sem user.
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!profileError && profile) {
        onLogin(profile as Profile);
      }

      // Se lembrar conectado estiver desmarcado, a sessão ainda viverá nesta aba.
      // Não removemos manualmente a chave do Supabase para evitar quebrar a restauração.
      void rememberMe;
    } catch (err: any) {
      console.error("Erro no login:", err);
      setError("Email ou senha inválidos.");
      setLoading(false);
    }
  }

  return (
    <div className="ws-login">
      <div className="ws-login-bg" />
      <div className="ws-login-waves">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="none" fill="none">
          <path d="M0 450 Q360 200 720 450 Q1080 700 1440 450" stroke="#7b2fff" strokeWidth="1.5" />
          <path d="M0 500 Q360 250 720 500 Q1080 750 1440 500" stroke="#e91e8c" strokeWidth="1" />
          <path d="M0 400 Q360 150 720 400 Q1080 650 1440 400" stroke="#7b2fff" strokeWidth="0.8" />
        </svg>
      </div>

      <form className="ws-login-card" onSubmit={handleLogin}>
        <div className="ws-logo">
          DIG<span className="ws-dot">.</span>
        </div>
        <div className="ws-logo-sub">Workspace Interno</div>

        <label className="ws-label">Email</label>
        <input
          className="ws-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
          required
        />

        <label className="ws-label">Senha</label>
        <input
          className="ws-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        {error && <div className="ws-login-error">{error}</div>}

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--ws-accent)", cursor: "pointer" }}
          />
          <span style={{ fontSize: ".82rem", color: "var(--ws-text2)", fontFamily: "Poppins" }}>
            Manter conectado
          </span>
        </label>

        <button className="ws-login-btn" type="submit" disabled={loading}>
          {loading ? "ENTRANDO..." : "ENTRAR"}
        </button>
      </form>
    </div>
  );
}
