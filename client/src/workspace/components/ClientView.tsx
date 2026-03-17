// client/src/workspace/components/ClientView.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import type { Case } from "../cases/types";
import { SUB_TABS } from "../cases/constants";
import { CasesGlobalStyle } from "../cases/styles";
import TabCalendario from "../cases/tabs/TabCalendario";
import TabConteudo from "../cases/tabs/TabConteudo";
import TabFinanceiro from "../cases/tabs/TabFinanceiro";
import TabDocumentos from "../cases/tabs/TabDocumentos";
import TabNotas from "../cases/tabs/TabNotas";
import { useIsMobile } from "../../hooks/useIsMobile";

interface Props {
  profile: Profile;
}

// Tabs que o cliente pode acessar (todas, mas readonly onde necessário)
const CLIENT_TABS = SUB_TABS;

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">(getSavedTheme);
  const isMobile = useIsMobile();

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
      {activeTab === "calendario"  && <TabCalendario  caseData={caseData} profile={profile} />}
      {activeTab === "conteudo"    && <TabConteudo    caseData={caseData} profile={profile} readonly />}
      {activeTab === "financeiro"  && <TabFinanceiro  caseData={caseData} readonly />}
      {activeTab === "contratos"   && <TabDocumentos  caseData={caseData} type="contrato"  readonly canUpload={false} />}
      {activeTab === "documentos"  && <TabDocumentos  caseData={caseData} type="documento" readonly canUpload={true} />}
      {activeTab === "notas"       && <TabNotas       caseData={caseData} profile={profile} readonly />}
    </>
  );

  // ── MOBILE ──
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--ws-bg)" }}>
        <CasesGlobalStyle />
        <div style={{ background: "var(--ws-surface)", borderBottom: "1px solid var(--ws-border)", position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px 6px" }}>
            {caseData.logo_url ? (
              <img src={caseData.logo_url} alt={caseData.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${caseData.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".6rem", fontWeight: 800, color: caseData.color }}>
                {caseData.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: ".9rem", color: "var(--ws-text)", flex: 1 }}>{caseData.name}</span>
            <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", fontFamily: "Poppins" }}>↩ Sair</button>
          </div>
          <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
            {CLIENT_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flexShrink: 0, background: "none", border: "none",
                borderBottom: activeTab === tab.id ? `2px solid ${caseData.color}` : "2px solid transparent",
                color: activeTab === tab.id ? caseData.color : "var(--ws-text3)",
                cursor: "pointer", fontSize: ".76rem", padding: "8px 12px",
                fontFamily: "inherit", transition: "all .15s", whiteSpace: "nowrap",
              }}>{tab.icon} {tab.label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, padding: "16px 14px 32px" }}><TabContent /></div>
      </div>
    );
  }

  // ── DESKTOP ──
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Mini sidebar fechada */}
      {!sidebarOpen && (
        <div style={{ width: 36, flexShrink: 0, borderRight: "1px solid var(--ws-border)", background: "var(--ws-surface)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10, gap: 8 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "1px solid var(--ws-border2)", borderRadius: 5, color: "var(--ws-text3)", cursor: "pointer", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem" }}>▶</button>
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
            {/* Logo do case */}
            <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", background: `${caseData.color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, border: `1px solid ${caseData.color}44` }}>
              {caseData.logo_url
                ? <img src={caseData.logo_url} alt={caseData.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ color: caseData.color, fontSize: ".9rem", fontWeight: 800 }}>{caseData.name.slice(0, 2).toUpperCase()}</span>
              }
            </div>
            <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: ".88rem", color: "var(--ws-text)", lineHeight: 1.2 }}>{caseData.name}</div>
            <div style={{ fontSize: ".7rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>Workspace do cliente</div>
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
