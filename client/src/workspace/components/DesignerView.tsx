// client/src/workspace/components/DesignerView.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import TabDesigner from "./cases/tabs/TabDesigner";
import Loader from "./cases/shared/Loader";
import { CasesGlobalStyle } from "./cases/styles";
import type { Case } from "./cases/types";

interface DesignerViewProps {
  profile: Profile;
}

export default function DesignerView({ profile }: DesignerViewProps) {
  const [cases, setCases]     = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Busca clientes via vínculo permanente em designer_cases
      const { data: dcRows } = await supabase
        .from("designer_cases")
        .select("case_id")
        .eq("designer_id", profile.id);

      const caseIds = (dcRows ?? []).map((r: any) => r.case_id as string);

      if (caseIds.length === 0) { setLoading(false); return; }

      const { data: cs } = await supabase
        .from("cases")
        .select("*")
        .in("id", caseIds);

      setCases(cs ?? []);
      setLoading(false);
    }
    void load();
  }, [profile.id]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--ws-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader /></div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--ws-bg)", display: "flex", flexDirection: "column" }}>
      <CasesGlobalStyle />

      {/* Header */}
      <div style={{ background: "var(--ws-surface)", borderBottom: "1px solid var(--ws-border)", padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: "Poppins", fontWeight: 900, fontSize: "1.1rem", color: "var(--ws-text)", letterSpacing: "-0.03em" }}>
            DIG.<span style={{ color: "#e91e8c" }}>.</span>
          </div>
          <div style={{ width: 1, height: 18, background: "var(--ws-border2)" }} />
          <div style={{ fontSize: ".75rem", fontFamily: "Poppins", color: "var(--ws-text3)", letterSpacing: "1px", textTransform: "uppercase" }}>Designer</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: ".78rem", color: "var(--ws-text2)", fontFamily: "Poppins" }}>{profile.name}</div>
          <button
            onClick={handleLogout}
            style={{ background: "none", border: "1px solid var(--ws-border2)", borderRadius: 6, color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", padding: "5px 12px", fontFamily: "Poppins" }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: "28px 28px" }}>
        {cases.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
            <div style={{ fontSize: "2rem" }}>📋</div>
            <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: "1rem", color: "var(--ws-text)" }}>Nenhum briefing ainda</div>
            <div style={{ fontSize: ".82rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Aguarde a equipe DIG enviar um briefing para você.</div>
          </div>
        ) : (
          // Usa o primeiro cliente como contexto (a TabDesigner cuida da navegação interna)
          <TabDesigner caseData={cases[0]} readonly={true} />
        )}
      </div>
    </div>
  );
}
