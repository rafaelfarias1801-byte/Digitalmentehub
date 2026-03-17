// client/src/workspace/components/cases/modals/SendAccessModal.tsx
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { modalBoxStyle, modalTitleStyle, overlayStyle } from "../styles";
import type { Case } from "../types";

interface Props {
  caseData: Case;
  onClose: () => void;
}

type UserRole = "cliente" | "admin";

// Cliente admin — só usado neste modal por admins autenticados
const supabaseAdmin = createClient(
  "https://nznyzjvtmqfcjkogkfju.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bnl6anZ0bXFmY2prb2drZmp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM1MDMxMCwiZXhwIjoyMDg4OTI2MzEwfQ.jBrZRB2VtYDuZD9u5leNxXQ3mWgiDAl2a65mwnV1AbQ",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default function SendAccessModal({ caseData, onClose }: Props) {
  const [email, setEmail]       = useState(caseData.client_email || "");
  const [password, setPassword] = useState("123456");
  const [name, setName]         = useState(caseData.name || "");
  const [role, setRole]         = useState<UserRole>("cliente");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");

  async function handleCreate() {
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
      });

      if (authError) throw new Error(authError.message);

      const userId = authData.user.id;
      const initials = name.trim().split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

      // 2. Criar perfil
      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email: email.trim(),
        name: name.trim(),
        role,
        initials,
        case_id: role === "cliente" ? caseData.id : null,
        must_change_password: true,
        created_at: new Date().toISOString(),
      });

      if (profileError) throw new Error(profileError.message);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ ...modalBoxStyle, width: 420, textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✅</div>
          <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1rem", color: "var(--ws-text)", marginBottom: 8 }}>
            Acesso criado com sucesso!
          </div>
          <div style={{ fontSize: ".83rem", color: "var(--ws-text2)", lineHeight: 1.6, marginBottom: 20 }}>
            <b>{email}</b> pode acessar o workspace.<br />
            No primeiro login, será solicitado que altere a senha.
          </div>
          <button className="ws-btn" onClick={onClose} style={{ width: "100%" }}>Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalBoxStyle, width: 440 }}>
        <div style={modalTitleStyle}>👤 Criar acesso ao workspace</div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {(["cliente", "admin"] as UserRole[]).map(r => (
            <button key={r} onClick={() => setRole(r)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: ".8rem", fontWeight: 600,
              background: role === r ? "var(--ws-accent)" : "var(--ws-surface2)",
              color: role === r ? "#fff" : "var(--ws-text3)",
              transition: "all .15s",
            }}>
              {r === "cliente" ? "👤 Cliente" : "🔑 Admin"}
            </button>
          ))}
        </div>

        {role === "cliente" && (
          <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: ".75rem", color: "var(--ws-text3)", lineHeight: 1.5 }}>
            📎 Este acesso será vinculado ao case <b style={{ color: "var(--ws-text2)" }}>{caseData.name}</b>
          </div>
        )}

        <label className="ws-label">Nome</label>
        <input className="ws-input" value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome completo"
          style={{ marginBottom: 12 }} />

        <label className="ws-label">Email</label>
        <input className="ws-input" type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="email@cliente.com.br"
          style={{ marginBottom: 12 }} />

        <label className="ws-label">Senha provisória</label>
        <input className="ws-input" value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Senha inicial"
          style={{ marginBottom: 4 }} />
        <div style={{ fontSize: ".7rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginBottom: 20 }}>
          O usuário será obrigado a trocar no primeiro acesso.
        </div>

        {error && (
          <div style={{ background: "rgba(220,50,50,0.12)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: 8, padding: "8px 12px", fontSize: ".78rem", color: "#d63232", marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="ws-btn" onClick={() => void handleCreate()} disabled={loading} style={{ flex: 1 }}>
            {loading ? "Criando..." : "Criar acesso"}
          </button>
          <button className="ws-btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
