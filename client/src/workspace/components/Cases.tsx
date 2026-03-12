// client/src/workspace/components/Cases.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Case } from "../../lib/supabaseClient";

export default function Cases() {
  const [cases, setCases] = useState<Case[]>([]);

  useEffect(() => {
    supabase.from("cases").select("*").order("created_at").then(({ data }) => setCases(data ?? []));
  }, []);

  const bg: Record<string, string> = {
    "#e91e8c": "linear-gradient(135deg,#1a0814,#2a0b1e)",
    "#4dabf7": "linear-gradient(135deg,#080e1e,#0b1535)",
    "#00e676": "linear-gradient(135deg,#071710,#0d2a16)",
  };

  return (
    <div className="ws-page">
      <div className="ws-page-title">Cases<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Clientes ativos e portfólio de referência</div>
      <div className="ws-cases">
        {cases.map(c => (
          <div key={c.id} className="ws-case">
            <div className="ws-case-thumb" style={{ background: bg[c.color] || "var(--ws-surface2)" }}>
              <span style={{ color: c.color }}>{c.name.split(" ")[0]}</span>
            </div>
            <div className="ws-case-body">
              <div className="ws-case-name">{c.name}</div>
              <div className="ws-case-desc">{c.description}</div>
              <span className={`ws-case-status ${c.status === "ativo" ? "ws-cs-ativo" : "ws-cs-and"}`}>
                {c.status === "ativo" ? "Ativo" : c.status === "andamento" ? "Em andamento" : "Concluído"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
