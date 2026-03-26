// client/src/workspace/components/ClientView.tsx
import { useEffect, useState } from "react";
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

export default function ClientView({ profile }: Props) {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("calendario");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(getSavedTheme);
  const isMobile = useIsMobile();
  usePushNotification(profile.id);

  useEffect(() => { applyTheme(theme); }, []);

  useEffect(() => {
    if (!profile.case_id) { setLoading(false); return; }
    supabase.from("posts").select("case_id").eq("case_id", profile.case_id).limit(1)
      .then(() => {});
    supabase.from("cases").select("*").eq("id", profile.case_id).single()
      .then(({ data }) => { setCaseData(data); setLoading(false); });
  }, [profile.case_id]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

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

  const TabContent = () => (
    <>
      {activeTab === "calendario"  && <TabCalendario  caseData={caseData} profile={profile} readonly />}
      {activeTab === "conteudo"    && <TabConteudo    caseData={caseData} profile={profile} readonly />}
      {activeTab === "financeiro"  && <TabFinanceiro  caseData={caseData} readonly />}
      {activeTab === "contratos"   && <TabDocumentos  caseData={caseData} type="documento" readonly canUpload={false} />}
      {activeTab === "documentos"  && <TabDocumentos  caseData={caseData} type="arquivo"   readonly canUpload={true} />}
      {activeTab === "notas"       && <TabNotas       caseData={caseData} profile={profile} readonly />}
    </>
  );

  // Tabs principais (topo) e extras (hamburguer)
  const MAIN_TABS = ["calendario", "conteudo", "financeiro"];
  const MAIN_TAB_ICONS: Record<string, string> = { calendario: "📅", conteudo: "📋", financeiro: "💰" };
  const MAIN_TAB_LABELS: Record<string, string> = { calendario: "Calendário", conteudo: "Conteúdo", financeiro: "Financeiro" };

  // ── MOBILE — novo layout: top bar + hamburger ──
  if (isMobile) {
    const firstName = profile.name?.split(" ")[0] ?? "";
    const isMainTab = MAIN_TABS.includes(activeTab);

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden", background: "var(--ws-bg)" }}>
        <CasesGlobalStyle />

        {/* ── Top bar fixa ── */}
        <div style={{ background: "var(--ws-surface)", borderBottom: "1px solid var(--ws-border)", flexShrink: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", gap: 12 }}>
            {/* DIG. Workspace */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
              <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-1px", color: "var(--ws-text)", lineHeight: 1 }}>
                DIG<span style={{ color: caseData.color }}>.</span>
              </div>
              <div style={{ fontFamily: "Poppins", fontSize: ".52rem", letterSpacing: "2px", textTransform: "uppercase", color: "var(--ws-text3)" }}>
                Workspace
              </div>
            </div>

            {/* 3 ícones principais */}
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

            {/* Hamburger */}
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

        {/* Dropdown hamburger */}
        {sidebarOpen && (
          <>
            <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
            <div style={{
              position: "absolute", top: 58, right: 16, zIndex: 50,
              background: "var(--ws-surface)", border: "1px solid var(--ws-border2)",
              borderRadius: 12, boxShadow: "0 8px 32px #00000050",
              minWidth: 200, overflow: "hidden",
            }}>
              {/* Info do usuário */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ws-border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: caseData.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: ".75rem", fontWeight: 700, flexShrink: 0 }}>
                  {profile.initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{profile.name}</div>
                  <div style={{ fontSize: ".62rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>cliente</div>
                </div>
              </div>

              {/* Tabs extras */}
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

              {/* Tema + Sair */}
              <div style={{ borderTop: "1px solid var(--ws-border)", padding: "8px 12px", display: "flex", gap: 8 }}>
                <button onClick={toggleTheme} style={{ flex: 1, background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text2)", cursor: "pointer", padding: "6px 8px", fontSize: ".72rem", fontFamily: "Poppins" }}>
                  {isDark ? "🌙 Escuro" : "☀️ Claro"}
                </button>
                <button onClick={() => supabase.auth.signOut()} style={{ flex: 1, background: "none", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text3)", cursor: "pointer", padding: "6px 8px", fontSize: ".72rem", fontFamily: "inherit" }}>
                  ↩ Sair
                </button>
              </div>
            </div>
          </>
        )}

        {/* Saudação — só aparece na aba principal */}
        {isMainTab && activeTab === "calendario" && (
          <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.2rem", color: "var(--ws-text)" }}>
              Olá, {firstName}<span style={{ color: caseData.color }}>.</span>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 32px", minWidth: 0 }}>
          <TabContent />
        </div>
      </div>
    );
  }

  // ── DESKTOP ──
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Mini rail — sempre visível quando sidebar fechada (mobile e desktop) */}
      {!sidebarOpen && (
        <div style={{ width: 56, flexShrink: 0, borderRight: "1px solid var(--ws-border)", background: "var(--ws-surface)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10, gap: 2, zIndex: 10 }}>
          {/* Expandir */}
          <button onClick={() => setSidebarOpen(true)} className="ws-rail-expand" title="Expandir" style={{ marginBottom: 4 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Avatar */}
          <div title={caseData.name} style={{ marginBottom: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, overflow: "hidden", background: `${caseData.color}22`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${caseData.color}44`, fontSize: ".65rem", fontWeight: 800, color: caseData.color }}>
              {caseData.logo_url
                ? <img src={caseData.logo_url} alt={caseData.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : caseData.name.slice(0, 2).toUpperCase()
              }
            </div>
          </div>
          <div style={{ width: 28, height: 1, background: "var(--ws-border)", margin: "4px 0" }} />
          {/* Tabs */}
          {CLIENT_TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }} title={tab.label}
              className={`ws-rail-item${activeTab === tab.id ? " active" : ""}`}
              style={{ fontSize: "1rem" }}
            >
              <span className="ws-rail-icon">{tab.icon}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {/* Logout */}
          <button onClick={() => supabase.auth.signOut()} title="Sair" className="ws-rail-item" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: ".9rem", color: "var(--ws-text3)" }}>↩</span>
          </button>
        </div>
      )}

      {/* Sidebar principal */}
      {sidebarOpen && (
        <aside style={{ width: 200, flexShrink: 0, borderRight: "1px solid var(--ws-border)", background: "var(--ws-surface)", display: "flex", flexDirection: "column" }}>
          {/* Topo: logo + fechar */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--ws-border)", position: "relative" }}>
            <button onClick={() => setSidebarOpen(false)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "1px solid var(--ws-border2)", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ws-text3)", fontSize: ".75rem" }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            {/* Logo do case — banner horizontal */}
            <div style={{ width: "100%", height: 52, borderRadius: 8, overflow: "hidden", background: caseData.logo_url ? "#000" : `${caseData.color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, border: `1px solid ${caseData.color}44` }}>
              {caseData.logo_url
                ? <img src={caseData.logo_url} alt={caseData.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <span style={{ color: caseData.color, fontSize: ".9rem", fontWeight: 800 }}>{caseData.name.slice(0, 2).toUpperCase()}</span>
              }
            </div>
            <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: ".88rem", color: "var(--ws-text)", lineHeight: 1.2 }}>{caseData.name}</div>
            {/* Avatar do usuário */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "8px 0", borderTop: "1px solid var(--ws-border)" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: caseData.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: ".7rem", fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : profile.initials
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{profile.name}</div>
                <div style={{ fontSize: ".62rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>cliente</div>
              </div>
            </div>
          </div>

          {/* Nav */}
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

          {/* Footer */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--ws-border)", display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Toggle tema */}
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

      {/* Conteúdo principal */}
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
