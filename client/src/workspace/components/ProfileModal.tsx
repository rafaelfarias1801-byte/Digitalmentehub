// client/src/workspace/components/ProfileModal.tsx
import { useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";

interface Props {
  profile: Profile;
  onClose: () => void;
  onUpdate: (updated: Profile) => void;
}

const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";

export default function ProfileModal({ profile, onClose, onUpdate }: Props) {
  const [name, setName]       = useState(profile.name || "");
  const [phone, setPhone]     = useState(profile.phone || "");
  const [email, setEmail]     = useState(profile.email || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Troca de senha
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError]     = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [savingPw, setSavingPw]   = useState(false);

  async function changePassword() {
    setPwError(""); setPwSuccess("");
    if (!currentPassword) { setPwError("Digite a senha atual."); return; }
    if (newPassword.length < 6) { setPwError("A nova senha deve ter pelo menos 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { setPwError("As senhas não coincidem."); return; }
    if (newPassword === currentPassword) { setPwError("A nova senha deve ser diferente da atual."); return; }
    setSavingPw(true);
    try {
      // Verifica senha atual tentando reautenticar
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email || email,
        password: currentPassword,
      });
      if (signInError) { setPwError("Senha atual incorreta."); setSavingPw(false); return; }
      // Atualiza para a nova senha
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setPwSuccess("Senha alterada com sucesso!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => { setPwSuccess(""); setShowPwSection(false); }, 2000);
    } catch (err: any) {
      setPwError(err.message || "Erro ao alterar senha.");
    }
    setSavingPw(false);
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${profile.id}/${Date.now()}.${ext}`;

      const { data, error: fnError } = await supabase.functions.invoke("get-r2-upload-url", {
        body: { filename: path, contentType: file.type },
      });

      if (fnError || !data?.signedUrl) throw new Error("Erro ao gerar link de upload.");

      const res = await fetch(data.signedUrl, {
        method: "PUT", body: file,
        headers: { "Content-Type": file.type },
      });

      if (!res.ok) throw new Error("Falha ao enviar imagem.");

      setAvatarUrl(`${R2_PUBLIC_URL}/${path}`);
    } catch (err) {
      setError("Erro ao enviar foto. Tente novamente.");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    if (!name.trim()) { setError("Nome não pode ser vazio."); return; }
    setSaving(true); setError(""); setSuccess("");

    try {
      // 1. Atualiza perfil na tabela profiles
      const initials = name.trim().split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();

      const { data, error: dbError } = await supabase
        .from("profiles")
        .update({ name: name.trim(), phone: phone.trim(), avatar_url: avatarUrl || null, initials })
        .eq("id", profile.id)
        .select()
        .single();

      if (dbError) throw dbError;

      // 2. Se email mudou, atualiza no Auth
      if (email.trim() && email.trim() !== profile.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) {
          setError("Perfil salvo, mas erro ao atualizar email: " + emailError.message);
          setSaving(false);
          if (data) onUpdate(data);
          return;
        }
      }

      if (data) onUpdate(data);
      setSuccess("Perfil atualizado com sucesso!");
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar.");
    }
    setSaving(false);
  }

  const initials = name.trim().split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() || profile.initials;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000085", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border2)", borderRadius: 20, padding: "28px 28px", width: "min(460px, 95vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 30px 80px #00000060" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.1rem", color: "var(--ws-text)" }}>
            Meu perfil
          </div>
          <button onClick={onClose} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", color: "var(--ws-text2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>×</button>
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24, gap: 10 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{ width: 80, height: 80, borderRadius: "50%", background: avatarUrl ? undefined : "var(--ws-accent)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", border: "3px solid var(--ws-border2)", position: "relative" }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.4rem" }}>{initials}</span>
            }
            <div style={{ position: "absolute", inset: 0, background: "#00000040", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0"; }}
            >
              <span style={{ color: "#fff", fontSize: ".7rem", fontFamily: "Poppins" }}>✏ Trocar</span>
            </div>
          </div>
          <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", color: "var(--ws-accent)", cursor: "pointer", fontSize: ".78rem", fontFamily: "Poppins", fontWeight: 600 }}>
            {uploading ? "Enviando..." : "Trocar foto de perfil"}
          </button>
          {avatarUrl && (
            <button onClick={() => setAvatarUrl("")} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", fontFamily: "inherit" }}>
              × Remover foto
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.[0]) void uploadAvatar(e.target.files[0]); }} />
        </div>

        {/* Campos */}
        <label className="ws-label">Nome</label>
        <input className="ws-input" value={name} onChange={e => setName(e.target.value)}
          placeholder="Seu nome completo" style={{ marginBottom: 14 }} />

        <label className="ws-label">Email</label>
        <input className="ws-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com" style={{ marginBottom: 4 }} />
        <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginBottom: 14 }}>
          Ao alterar o email, você receberá um link de confirmação.
        </div>

        <label className="ws-label">Telefone / WhatsApp</label>
        <input className="ws-input" value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="5511999999999" style={{ marginBottom: 20 }} />

        {/* ── Seção de troca de senha ── */}
        <div style={{ borderTop: "1px solid var(--ws-border)", marginTop: 8, paddingTop: 16, marginBottom: 20 }}>
          <button
            onClick={() => { setShowPwSection(p => !p); setPwError(""); setPwSuccess(""); }}
            style={{ background: "none", border: "none", color: "var(--ws-accent)", cursor: "pointer", fontSize: ".8rem", fontFamily: "Poppins", fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            🔒 {showPwSection ? "Cancelar troca de senha" : "Alterar senha"}
          </button>

          {showPwSection && (
            <div style={{ marginTop: 14 }}>
              <label className="ws-label">Senha atual</label>
              <input className="ws-input" type="password" value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••" style={{ marginBottom: 12 }} autoComplete="current-password" />

              <label className="ws-label">Nova senha</label>
              <input className="ws-input" type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" style={{ marginBottom: 12 }} autoComplete="new-password" />

              <label className="ws-label">Confirmar nova senha</label>
              <input className="ws-input" type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha" style={{ marginBottom: 12 }} autoComplete="new-password"
                onKeyDown={e => e.key === "Enter" && void changePassword()} />

              {pwError && <div style={{ color: "var(--ws-red)", fontSize: ".78rem", marginBottom: 10, fontFamily: "Poppins" }}>{pwError}</div>}
              {pwSuccess && <div style={{ color: "var(--ws-green)", fontSize: ".78rem", marginBottom: 10, fontFamily: "Poppins" }}>✓ {pwSuccess}</div>}

              <button
                onClick={() => void changePassword()}
                disabled={savingPw}
                style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text)", cursor: "pointer", padding: "8px 16px", fontSize: ".82rem", fontFamily: "inherit", fontWeight: 600, transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ws-accent)"; e.currentTarget.style.color = "var(--ws-accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ws-border2)"; e.currentTarget.style.color = "var(--ws-text)"; }}
              >
                {savingPw ? "Alterando..." : "Confirmar nova senha"}
              </button>
            </div>
          )}
        </div>

        {error && <div style={{ color: "var(--ws-red)", fontSize: ".78rem", marginBottom: 12, fontFamily: "Poppins" }}>{error}</div>}
        {success && <div style={{ color: "var(--ws-green)", fontSize: ".78rem", marginBottom: 12, fontFamily: "Poppins" }}>✓ {success}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="ws-btn" onClick={() => void save()} disabled={saving || uploading} style={{ flex: 1 }}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
          <button className="ws-btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
