// client/src/workspace/components/ClientView.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import type { Case } from "./cases/types";
import { SUB_TABS } from "./cases/constants";
import { CasesGlobalStyle } from "./cases/styles";
import TabCalendario from "./cases/tabs/TabCalendario";
import TabConteudo from "./cases/tabs/TabConteudo";
import TabFinanceiro from "./cases/tabs/TabFinanceiro";
import TabDocumentos from "./cases/tabs/TabDocumentos";
import TabNotas from "./cases/tabs/TabNotas";
import { useIsMobile } from "../hooks/useIsMobile";
import { usePushNotification } from "../hooks/usePushNotification";

interface Props {
  profile: Profile;
}

type ClientProfile = Profile & {
  phone?: string | null;
  whatsapp?: string | null;
};

// Tabs que o cliente pode acessar (designer é exclusivo para admin/designer)
const CLIENT_TABS = SUB_TABS.filter(t => t.id !== "designer");

function getSavedTheme(): "dark" | "light" {
  try { return (localStorage.getItem("ws_theme") as "dark" | "light") || "dark"; }
  catch { return "dark"; }
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  try { localStorage.setItem("ws_theme", theme); } catch {}
}

function getInitials(name?: string) {
  if (!name) return "CL";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function UserAvatar({
  profile,
  size = 32,
  borderColor = "var(--ws-border2)",
  background = "var(--ws-surface2)",
  fontSize = ".75rem",
}: {
  profile: Partial<ClientProfile>;
  size?: number;
  borderColor?: string;
  background?: string;
  fontSize?: string;
}) {
  const initials = profile.initials || getInitials(profile.name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1px solid ${borderColor}`,
        flexShrink: 0,
        color: "#fff",
        fontWeight: 700,
        fontSize,
      }}
    >
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.name || "Perfil"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label className="ws-label" style={{ marginBottom: 0 }}>{label}</label>
      <input
        className="ws-input"
        value={value || ""}
        readOnly
        disabled
        style={{ opacity: 1, cursor: "default", color: "var(--ws-text)" }}
      />
    </div>
  );
}

export default function ClientView({ profile }: Props) {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ClientProfile>(profile);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("calendario");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(getSavedTheme);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [passwordResetMsg, setPasswordResetMsg] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = { current: null as HTMLInputElement | null };
  const isMobile = useIsMobile();

  usePushNotification(profile.id);

  useEffect(() => { applyTheme(theme); }, []);

  useEffect(() => {
    setCurrentProfile(prev => ({ ...prev, ...profile }));
  }, [profile]);

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";
    const ext = file.name.split(".").pop();
    const path = `avatars/${profile.id}.${ext}`;
    try {
      const { data, error } = await supabase.functions.invoke("get-r2-upload-url", {
        body: { filename: path, contentType: file.type },
      });
      if (error || !data?.signedUrl) throw new Error("Erro ao gerar URL");
      const res = await fetch(data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (res.ok) {
        const url = `${R2_PUBLIC_URL}/${path}?t=${Date.now()}`;
        await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
        setCurrentProfile(prev => ({ ...prev, avatar_url: url }));
      }
    } catch (err) {
      console.error("Erro ao enviar avatar:", err);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function fetchLatestProfile() {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", profile.id).single();
      if (data) setCurrentProfile(prev => ({ ...prev, ...(data as ClientProfile) }));
    } catch {
      // Mantém os dados atuais sem quebrar a tela
    }
  }

  useEffect(() => {
    void fetchLatestProfile();
  }, [profile.id]);

  useEffect(() => {
    if (!profile.case_id) { setLoading(false); return; }

    let mounted = true;

    async function loadCase() {
      try {
        await supabase.from("posts").select("case_id").eq("case_id", profile.case_id).limit(1);
        const { data } = await supabase.from("cases").select("*").eq("id", profile.case_id).single();
        if (mounted) setCaseData(data);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadCase();

    return () => { mounted = false; };
  }, [profile.case_id]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  async function handlePasswordReset() {
    if (!currentProfile.email || sendingPasswordReset) return;
    setSendingPasswordReset(true);
    setPasswordResetMsg("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(currentProfile.email, {
        redirectTo: `${window.location.origin}/workspace`,
      });
      if (error) throw error;
      setPasswordResetMsg("Enviamos um link para alteração de senha no seu email.");
    } catch {
      setPasswordResetMsg("Não foi possível enviar o link agora. Tente novamente em instantes.");
    } finally {
      setSendingPasswordReset(false);
    }
  }

  const displayName = currentProfile.name || profile.name;
  const displayRole = "cliente";
  const displayPhone = currentProfile.phone || currentProfile.whatsapp || "";
  const firstName = useMemo(() => displayName?.split(" ")[0] ?? "", [displayName]);

  const TabContent = () => (
    <>
      {activeTab === "calendario"  && <TabCalendario  caseData={caseData!} profile={currentProfile} readonly />}
      {activeTab === "conteudo"    && <TabConteudo    caseData={caseData!} profile={currentProfile} readonly />}
      {activeTab === "financeiro"  && <TabFinanceiro  caseData={caseData!} readonly />}
      {activeTab === "contratos"   && <TabDocumentos  caseData={caseData!} type="documento" readonly canUpload={false} />}
      {activeTab === "documentos"  && <TabDocumentos  caseData={caseData!} type="arquivo" readonly canUpload={true} />}
      {activeTab === "notas"       && <TabNotas       caseData={caseData!} profile={currentProfile} readonly />}
    </>
  );

  const ProfileModal = () => (
    <div
      onClick={() => setProfileModalOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#00000090",
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: isMobile ? "100%" : "min(520px, 96vw)",
          maxHeight: isMobile ? "100dvh" : "90vh",
          overflowY: "auto",
          background: "var(--ws-surface)",
          border: "1px solid var(--ws-border2)",
          borderRadius: isMobile ? 0 : 20,
          boxShadow: "0 30px 80px #00000070",
          padding: isMobile ? "24px 20px 28px" : "28px 26px 30px",
          position: "relative",
        }}
      >
        <button
          onClick={() => setProfileModalOpen(false)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid var(--ws-border2)",
            background: "none",
            color: "var(--ws-text3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: ".95rem",
          }}
        >
          ×
        </button>

        <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: isMobile ? "1.35rem" : "1.5rem", color: "var(--ws-text)", marginBottom: 22 }}>
          Meu perfil
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 24 }}>
          <UserAvatar profile={currentProfile} size={isMobile ? 96 : 104} borderColor={caseData?.color ? `${caseData.color}88` : "var(--ws-border2)"} background="var(--ws-surface2)" fontSize="1.15rem" />
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => avatarFileRef.current?.click()}
              disabled={uploadingAvatar}
              style={{
                background: "none", border: "1px solid var(--ws-border2)",
                borderRadius: 8, color: "var(--ws-text3)", cursor: "pointer",
                fontSize: ".76rem", padding: "6px 14px", fontFamily: "inherit",
              }}
            >
              {uploadingAvatar ? "Enviando..." : "📷 Alterar foto"}
            </button>
            <input
              ref={el => { avatarFileRef.current = el; }}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) void uploadAvatar(e.target.files[0]); e.target.value = ""; }}
            />
          </div>
          <div style={{ marginTop: 12, fontSize: ".88rem", color: "var(--ws-text2)", maxWidth: 320, lineHeight: 1.5 }}>
            Para editar outras informações, consulte um responsável da Dig.
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Nome" value={displayName} />
          <div>
            <Field label="Email" value={currentProfile.email} />
            <div style={{ marginTop: 6, fontSize: ".74rem", color: "var(--ws-text3)" }}>
              O email exibido aqui é apenas para visualização.
            </div>
          </div>
          <Field label="Telefone / WhatsApp" value={displayPhone} />
        </div>

        <div style={{ height: 1, background: "var(--ws-border)", margin: "22px 0 18px" }} />

        <button
          onClick={() => void handlePasswordReset()}
          style={{
            background: "none",
            border: "none",
            color: "var(--ws-accent)",
            cursor: "pointer",
            padding: 0,
            fontFamily: "Poppins",
            fontWeight: 700,
            fontSize: ".92rem",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          🔒 {sendingPasswordReset ? "Enviando link..." : "Alterar senha"}
        </button>

        {passwordResetMsg && (
          <div style={{ marginTop: 12, fontSize: ".8rem", color: "var(--ws-text2)", lineHeight: 1.45 }}>
            {passwordResetMsg}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) return (
    <div className="ws-loading"><div className="ws-loading-dot" /></div>
  );

  if (!caseData) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: "2rem" }}>⚠️</div>
      <div style={{ color: "var(--ws-text2)", fontSize: ".9rem" }}>Nenhum case vinculado ao seu perfil.</div>
      <div style={{ color: "var(--ws-text3)", fontSize: ".78rem" }}>Entre em contato com a equipe DIG.</div>
      <button onClick={() => supabase.auth.signOut()} style={{ marginTop: 8, background: "none", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text3)", padding: "6px 16px", cursor: "pointer", fontSize: ".78rem" }}>Sair</button>
    </div>
  );

  const isDark = theme === "dark";
  const MAIN_TABS = ["calendario", "conteudo", "financeiro"];
  const MAIN_TAB_ICONS: Record<string, string> = { calendario: "📅", conteudo: "📋", financeiro: "💰" };
  const MAIN_TAB_LABELS: Record<string, string> = { calendario: "Calendário", conteudo: "Conteúdo", financeiro: "Financeiro" };

  if (isMobile) {
    const isMainTab = MAIN_TABS.includes(activeTab);

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden", background: "var(--ws-bg)" }}>
        <CasesGlobalStyle />
        {profileModalOpen && <ProfileModal />}

        <div style={{ background: "var(--ws-surface)", borderBottom: "1px solid var(--ws-border)", flexShrink: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
              <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-1px", color: "var(--ws-text)", lineHeight: 1 }}>
                DIG<span style={{ color: caseData.color }}>.</span>
              </div>
              <div style={{ fontFamily: "Poppins", fontSize: ".52rem", letterSpacing: "2px", textTransform: "uppercase", color: "var(--ws-text3)" }}>
                Workspace
              </div>
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              {MAIN_TABS.map(tabId => (
                <button key={tabId} onClick={() => setActiveTab(tabId)} style={{
                  width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
                  background: activeTab === tabId ? `${caseData.color}22` : "none",
                  color: activeTab === tabId ? caseData.color : "var(--ws-text3)",
                  fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center",
                  outline: activeTab === tabId ? `2px solid ${caseData.color}44` : "none",
                  transition: "all .15s",
                }} title={MAIN_TAB_LABELS[tabId]}>
                  {MAIN_TAB_ICONS[tabId]}
                </button>
              ))}
            </div>

            <button onClick={() => setSidebarOpen(p => !p)} style={{
              width: 36, height: 36, borderRadius: 8, border: "1px solid var(--ws-border2)",
              background: sidebarOpen ? "var(--ws-surface2)" : "none",
              cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0,
            }}>
              <span style={{ width: 14, height: 1.5, background: "var(--ws-text3)", display: "block", borderRadius: 1 }} />
              <span style={{ width: 14, height: 1.5, background: "var(--ws-text3)", display: "block", borderRadius: 1 }} />
              <span style={{ width: 14, height: 1.5, background: "var(--ws-text3)", display: "block", borderRadius: 1 }} />
            </button>
          </div>
        </div>

        {sidebarOpen && (
          <>
            <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
            <div style={{
              position: "absolute", top: 58, right: 16, zIndex: 50,
              background: "var(--ws-surface)", border: "1px solid var(--ws-border2)",
              borderRadius: 16, boxShadow: "0 8px 32px #00000050",
              minWidth: 230, overflow: "hidden",
            }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ws-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.35rem", letterSpacing: "-1px", color: "var(--ws-text)", lineHeight: 1 }}>
                    DIG<span style={{ color: caseData.color }}>.</span>
                  </div>
                  <div style={{ fontFamily: "Poppins", fontSize: ".56rem", letterSpacing: "2.2px", textTransform: "uppercase", color: "var(--ws-text3)", marginTop: 7 }}>
                    Workspace
                  </div>
                </div>

                <div style={{
                  border: "1px solid var(--ws-border2)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "var(--ws-surface2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <UserAvatar profile={currentProfile} size={40} borderColor={`${caseData.color}55`} background={`${caseData.color}18`} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: ".92rem", fontWeight: 700, color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>{displayRole}</div>
                  </div>
                  <button
                    onClick={() => { setPasswordResetMsg(""); setProfileModalOpen(true); setSidebarOpen(false); void fetchLatestProfile(); }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--ws-accent)",
                      cursor: "pointer",
                      fontSize: ".72rem",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ver perfil
                  </button>
                </div>
              </div>

              {CLIENT_TABS.filter(t => !MAIN_TABS.includes(t.id)).map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  background: activeTab === tab.id ? `${caseData.color}18` : "none",
                  borderLeft: activeTab === tab.id ? `3px solid ${caseData.color}` : "3px solid transparent",
                  border: "none", borderTop: "1px solid var(--ws-border)",
                  color: activeTab === tab.id ? caseData.color : "var(--ws-text2)",
                  cursor: "pointer", fontSize: ".84rem", padding: "12px 16px",
                  textAlign: "left", fontFamily: "inherit",
                }}>
                  <span>{tab.icon}</span><span>{tab.label}</span>
                </button>
              ))}

              <div style={{ borderTop: "1px solid var(--ws-border)", padding: "8px 12px", display: "flex", gap: 8 }}>
                <button onClick={toggleTheme} style={{ flex: 1, background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 10, color: "var(--ws-text2)", cursor: "pointer", padding: "8px 10px", fontSize: ".72rem", fontFamily: "Poppins" }}>
                  {isDark ? "🌙 Escuro" : "☀️ Claro"}
                </button>
                <button onClick={() => supabase.auth.signOut()} style={{ flex: 1, background: "none", border: "1px solid var(--ws-border2)", borderRadius: 10, color: "var(--ws-text3)", cursor: "pointer", padding: "8px 10px", fontSize: ".72rem", fontFamily: "inherit" }}>
                  ↩ Sair
                </button>
              </div>
            </div>
          </>
        )}

        {isMainTab && activeTab === "calendario" && (
          <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.2rem", color: "var(--ws-text)" }}>
              Olá, {firstName}<span style={{ color: caseData.color }}>.</span>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 32px", minWidth: 0 }}>
          <TabContent />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {!sidebarOpen && (
        <div style={{ width: 56, flexShrink: 0, borderRight: "1px solid var(--ws-border)", background: "var(--ws-surface)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10, gap: 2, zIndex: 10 }}>
          <button onClick={() => setSidebarOpen(true)} className="ws-rail-expand" title="Expandir" style={{ marginBottom: 4 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div title={caseData.name} style={{ marginBottom: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, overflow: "hidden", background: `${caseData.color}22`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${caseData.color}44`, fontSize: ".65rem", fontWeight: 800, color: caseData.color }}>
              {caseData.logo_url
                ? <img src={caseData.logo_url} alt={caseData.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : caseData.name.slice(0, 2).toUpperCase()
              }
            </div>
          </div>
          <div style={{ width: 28, height: 1, background: "var(--ws-border)", margin: "4px 0" }} />
          {CLIENT_TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }} title={tab.label}
              className={`ws-rail-item${activeTab === tab.id ? " active" : ""}`}
              style={{ fontSize: "1rem" }}
            >
              <span className="ws-rail-icon">{tab.icon}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => supabase.auth.signOut()} title="Sair" className="ws-rail-item" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: ".9rem", color: "var(--ws-text3)" }}>↩</span>
          </button>
        </div>
      )}

      {sidebarOpen && (
        <aside style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--ws-border)", background: "var(--ws-surface)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--ws-border)", position: "relative" }}>
            <button onClick={() => setSidebarOpen(false)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "1px solid var(--ws-border2)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ws-text3)", fontSize: ".78rem" }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.8rem", letterSpacing: "-1px", color: "var(--ws-text)", lineHeight: 1 }}>
                DIG<span style={{ color: caseData.color }}>.</span>
              </div>
              <div style={{ fontFamily: "Poppins", fontSize: ".62rem", letterSpacing: "3px", textTransform: "uppercase", color: "var(--ws-text3)", marginTop: 10 }}>
                Workspace
              </div>
            </div>

            <div style={{
              border: "1px solid var(--ws-border2)",
              borderRadius: 14,
              padding: "12px",
              background: "var(--ws-surface2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <UserAvatar profile={currentProfile} size={42} borderColor={`${caseData.color}55`} background={`${caseData.color}18`} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: ".98rem", fontWeight: 700, color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>{displayRole}</div>
                </div>
              </div>

              <button
                onClick={() => { setPasswordResetMsg(""); setProfileModalOpen(true); void fetchLatestProfile(); }}
                style={{
                  marginTop: 10,
                  background: "none",
                  border: "none",
                  color: "var(--ws-accent)",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: ".78rem",
                  fontWeight: 700,
                }}
              >
                ver perfil
              </button>
            </div>
          </div>

          <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
            {CLIENT_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                background: activeTab === tab.id ? `${caseData.color}18` : "none", border: "none",
                borderLeft: activeTab === tab.id ? `2px solid ${caseData.color}` : "2px solid transparent",
                color: activeTab === tab.id ? caseData.color : "var(--ws-text2)",
                cursor: "pointer", fontSize: ".82rem", padding: "9px 16px",
                textAlign: "left", fontFamily: "inherit", transition: "all .15s",
              }}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--ws-border)", display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={toggleTheme} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: "var(--ws-text2)", fontFamily: "Poppins", fontSize: ".62rem", letterSpacing: "1px", textTransform: "uppercase" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>{isDark ? "🌙" : "☀️"}</span>
                {isDark ? "Escuro" : "Claro"}
              </span>
              <span style={{ width: 32, height: 18, borderRadius: 999, background: isDark ? "var(--ws-surface3)" : "var(--ws-accent)", position: "relative", flexShrink: 0, transition: "background .2s" }}>
                <span style={{ position: "absolute", top: 2, left: isDark ? 2 : 16, width: 14, height: 14, borderRadius: "50%", background: isDark ? "var(--ws-text3)" : "#fff", transition: "left .2s" }} />
              </span>
            </button>
            <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".78rem", fontFamily: "inherit", textAlign: "left", padding: "4px 0" }}>↩ Sair</button>
          </div>
        </aside>
      )}

      {profileModalOpen && <ProfileModal />}

      <div style={{ flex: 1, overflow: "auto", background: "var(--ws-bg)" }}>
        <CasesGlobalStyle />
        <div style={{ padding: "28px 32px" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.4rem", color: "var(--ws-text)" }}>
              {CLIENT_TABS.find(t => t.id === activeTab)?.icon} {CLIENT_TABS.find(t => t.id === activeTab)?.label}<span style={{ color: caseData.color }}>.</span>
            </div>
            <div style={{ color: "var(--ws-text3)", fontSize: ".8rem", fontFamily: "Poppins", marginTop: 2 }}>{caseData.name}</div>
          </div>
          <TabContent />
        </div>
      </div>
    </div>
  );
}
