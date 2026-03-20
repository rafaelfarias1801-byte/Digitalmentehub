// client/src/workspace/components/cases/CaseWorkspace.tsx
import { useState, useEffect } from "react";
import SendAccessModal from "./modals/SendAccessModal";
import { CasesGlobalStyle } from "./styles";
import { STATUS_STYLES, SUB_TABS } from "./constants";
import type { CaseWorkspaceProps } from "./types";
import { useIsMobile } from "../../hooks/useIsMobile";

import TabCalendario from "./tabs/TabCalendario";
import TabConteudo from "./tabs/TabConteudo";
import TabFinanceiro from "./tabs/TabFinanceiro";
import TabDocumentos from "./tabs/TabDocumentos";
import TabNotas from "./tabs/TabNotas";

const LS_ACTIVE_TAB = "ws_case_tab";
const VALID_TABS = SUB_TABS.map((t) => t.id) as string[];

function getSavedTab(): string {
  const saved = localStorage.getItem(LS_ACTIVE_TAB);
  if (saved && VALID_TABS.includes(saved)) return saved;
  return "calendario";
}

// Adicionamos initialPostId nas props
export default function CaseWorkspace({ caseData, onBack, onEdit, onDelete, profile, initialPostId }: CaseWorkspaceProps & { initialPostId?: string | null }) {
  const [activeTab, setActiveTab] = useState<string>(getSavedTab);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accessModal, setAccessModal] = useState(false);
  const isMobile = useIsMobile();

  // GATILHO PARA ABRIR POST DA DASHBOARD
  useEffect(() => {
    if (initialPostId) {
      // 1. Muda para a aba de conteúdo onde os posts vivem
      setActiveTab("conteudo");
      
      // 2. Avisa o componente de conteúdo para abrir o modal
      // Usamos um pequeno delay para garantir que a aba carregou
      setTimeout(() => {
        const event = new CustomEvent("ws_open_post", { detail: initialPostId });
        window.dispatchEvent(event);
      }, 100);
    }
  }, [initialPostId]);

  function navigate(tabId: string) {
    localStorage.setItem(LS_ACTIVE_TAB, tabId);
    setActiveTab(tabId);
  }

  const activeTabData = SUB_TABS.find((t) => t.id === activeTab);
  const isClient = profile?.role === "cliente";

  const renderTabContent = () => (
    <>
      {activeTab === "calendario" && <TabCalendario caseData={caseData} profile={profile} readonly={isClient} />}
      {activeTab === "conteudo" && <TabConteudo caseData={caseData} profile={profile} readonly={isClient} />}
      {activeTab === "financeiro" && <TabFinanceiro caseData={caseData} readonly={isClient} />}
      {activeTab === "contratos" && <TabDocumentos caseData={caseData} type="documento" readonly={isClient} canUpload={false} />}
      {activeTab === "documentos" && <TabDocumentos caseData={caseData} type="arquivo" readonly={isClient} canUpload={true} />}
      {activeTab === "notas" && <TabNotas caseData={caseData} profile={profile} readonly={isClient} />}
    </>
  );

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--ws-bg)", width: "100%", maxWidth: "100vw" }}>
        <CasesGlobalStyle />
        <div style={{ background: "var(--ws-surface)", borderBottom: "1px solid var(--ws-border)", position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px 6px" }}>
            <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--ws-accent)", cursor: "pointer", fontSize: ".72rem", fontFamily: "Poppins", letterSpacing: "1px", padding: 0, flexShrink: 0 }}>← CLIENTES</button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              {caseData.logo_url ? <img src={caseData.logo_url} alt={caseData.name} style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0, background: `linear-gradient(135deg,${caseData.color}44,${caseData.color}22)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".55rem", fontWeight: 800, color: caseData.color }}>{caseData.name.slice(0, 2).toUpperCase()}</div>}
              <span style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: ".85rem", color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{caseData.name}</span>
              <span style={{ flexShrink: 0, fontSize: ".52rem", fontFamily: "Poppins", letterSpacing: "1px", padding: "1px 6px", borderRadius: 4, color: caseData.status === "ativo" ? "#00e676" : caseData.status === "pausado" ? "#ffd600" : "#aaa", border: `1px solid ${caseData.status === "ativo" ? "#00e676" : caseData.status === "pausado" ? "#ffd600" : "#aaa"}` }}>{caseData.status}</span>
            </div>
            <button onClick={onEdit} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 6, color: "var(--ws-text2)", cursor: "pointer", padding: "4px 8px", fontSize: ".68rem", flexShrink: 0 }}>✎</button>
          </div>
          <div style={{ display: "flex", overflowX: "auto", paddingBottom: 0, scrollbarWidth: "none" }}>
            {SUB_TABS.map((tab) => (
              <button key={tab.id} onClick={() => navigate(tab.id)} style={{ flexShrink: 0, background: "none", border: "none", borderBottom: activeTab === tab.id ? `2px solid ${caseData.color}` : "2px solid transparent", color: activeTab === tab.id ? caseData.color : "var(--ws-text3)", cursor: "pointer", fontSize: ".76rem", padding: "8px 12px", fontFamily: "inherit", transition: "all .15s", whiteSpace: "nowrap" }}>{tab.icon} {tab.label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, padding: "16px 14px 32px", minWidth: 0 }}>{renderTabContent()}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: "100vh" }}>
      {!sidebarOpen && (
        <div style={{ width: 36, flexShrink: 0, borderRight: "1px solid var(--ws-border)", background: "var(--ws-surface)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 60, gap: 8 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "1px solid var(--ws-border2)", borderRadius: 5, color: "var(--ws-text3)", cursor: "pointer", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem" }}>▶</button>
          <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: ".6rem", fontFamily: "Poppins", letterSpacing: "1.5px", color: "var(--ws-text3)", marginTop: 8, userSelect: "none" }}>{caseData.name.slice(0, 10).toUpperCase()}</div>
        </div>
      )}
      <div style={{ width: sidebarOpen ? 200 : 0, flexShrink: 0, borderRight: sidebarOpen ? "1px solid var(--ws-border)" : "none", background: "var(--ws-surface)", display: sidebarOpen ? "flex" : "none", flexDirection: "column", paddingTop: 8, overflow: "hidden", transition: "width .2s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 6px 16px" }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", fontFamily: "Poppins", letterSpacing: "1px", padding: 0 }}>← CLIENTES</button>
          <button onClick={() => setSidebarOpen(p => !p)} style={{ background: "none", border: "1px solid var(--ws-border2)", borderRadius: 5, color: "var(--ws-text3)", cursor: "pointer", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", flexShrink: 0 }}>{sidebarOpen ? "◀" : "▶"}</button>
        </div>
        <div style={{ padding: "12px 16px 16px", borderBottom: "1px solid var(--ws-border)" }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: caseData.logo_url ? undefined : `linear-gradient(135deg,${caseData.color}44,${caseData.color}22)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, border: `1px solid ${caseData.color}44` }}>
            {caseData.logo_url ? <img src={caseData.logo_url} alt={caseData.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: caseData.color, fontSize: ".9rem", fontWeight: 800 }}>{caseData.name.slice(0, 2).toUpperCase()}</span>}
          </div>
          <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: ".9rem", color: "var(--ws-text)", lineHeight: 1.2 }}>{caseData.name}</div>
          <span className={`ws-case-status ${STATUS_STYLES[caseData.status]}`} style={{ marginTop: 4, display: "inline-block", color: caseData.status === "ativo" ? "#00e676" : caseData.status === "pausado" ? "#ffd600" : "#aaa", borderColor: caseData.status === "ativo" ? "#00e676" : caseData.status === "pausado" ? "#ffd600" : "#aaa" }}>{caseData.status}</span>
        </div>
        <div style={{ flex: 1, padding: "8px 0" }}>
          {SUB_TABS.map((tab) => (
            <button key={tab.id} onClick={() => navigate(tab.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: activeTab === tab.id ? `${caseData.color}18` : "none", border: "none", borderLeft: activeTab === tab.id ? `2px solid ${caseData.color}` : "2px solid transparent", color: activeTab === tab.id ? caseData.color : "var(--ws-text2)", cursor: "pointer", fontSize: ".82rem", padding: "9px 16px", textAlign: "left", fontFamily: "inherit", transition: "all .15s" }}><span>{tab.icon}</span><span>{tab.label}</span></button>
          ))}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--ws-border)", display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={onEdit} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 6, color: "var(--ws-text2)", cursor: "pointer", padding: "6px 10px", fontSize: ".72rem", fontFamily: "inherit" }}>✎ Editar cliente</button>
          <button onClick={() => setAccessModal(true)} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 6, color: "var(--ws-text2)", cursor: "pointer", padding: "6px 10px", fontSize: ".72rem", fontFamily: "inherit" }}>👤 Criar acesso ao cliente</button>
          <button onClick={onDelete} style={{ background: "none", border: "1px solid var(--ws-border2)", borderRadius: 6, color: "var(--ws-accent)", cursor: "pointer", padding: "6px 10px", fontSize: ".72rem", fontFamily: "inherit" }}>× Excluir cliente</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", background: "var(--ws-bg)" }}>
        <CasesGlobalStyle />
        <div style={{ padding: "28px 32px" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.4rem", color: "var(--ws-text)" }}>{activeTabData?.icon} {activeTabData?.label}<span style={{ color: caseData.color }}>.</span></div>
            <div style={{ color: "var(--ws-text3)", fontSize: ".8rem", fontFamily: "Poppins", marginTop: 2 }}>{caseData.name}</div>
          </div>
          {renderTabContent()}
        </div>
      </div>
      {accessModal && <SendAccessModal caseData={caseData} onClose={() => setAccessModal(false)} />}
    </div>
  );
}