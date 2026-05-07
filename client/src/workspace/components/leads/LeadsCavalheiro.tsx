import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../../lib/supabaseClient";
import type { Profile } from "../../../lib/supabaseClient";

// ─── Substitua pelo user_id real do Carlos no Supabase ─────────────────────
export const CARLOS_USER_ID = "004a0191-3e94-4552-84b0-ae499ffde54d";

type LeadTipo = "livro" | "mentoria";
type LeadStatus = "novo" | "contatado" | "convertido";

interface Lead {
  id: string;
  tipo: LeadTipo;
  nome: string;
  email: string;
  cargo?: string;
  mensagem?: string;
  status: LeadStatus;
  created_at: string;
}

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  convertido: "Convertido",
};

const STATUS_COLOR: Record<LeadStatus, React.CSSProperties> = {
  novo: { background: "rgba(99,179,237,0.15)", color: "#63b3ed", border: "1px solid rgba(99,179,237,0.3)" },
  contatado: { background: "rgba(246,173,85,0.15)", color: "#f6ad55", border: "1px solid rgba(246,173,85,0.3)" },
  convertido: { background: "rgba(72,187,120,0.15)", color: "#48bb78", border: "1px solid rgba(72,187,120,0.3)" },
};

const STATUS_CYCLE: LeadStatus[] = ["novo", "contatado", "convertido"];

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Props {
  profile: Profile;
}

export default function LeadsCavalheiro({ profile }: Props) {
  const [tab, setTab] = useState<LeadTipo>("livro");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = profile.role === "admin";

  async function fetchLeads() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cc_leads")
      .select("*")
      .eq("tipo", tab)
      .order("created_at", { ascending: false });
    if (!error && data) setLeads(data as Lead[]);
    setLoading(false);
  }

  useEffect(() => { fetchLeads(); }, [tab]);

  async function cycleStatus(lead: Lead) {
    if (!isAdmin) return;
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(lead.status) + 1) % STATUS_CYCLE.length];
    setUpdatingId(lead.id);
    const { error } = await supabase
      .from("cc_leads")
      .update({ status: next })
      .eq("id", lead.id);
    if (!error) setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: next } : l));
    setUpdatingId(null);
  }

  function gerarPDF() {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Cabeçalho
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text("Carlos Cavalheiro", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Relatório de Leads — ${tab === "livro" ? "Pré-lançamento do Livro" : "Mentoria"}`, 14, 25);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, 14, 31);

    // Linha separadora
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 34, 196, 34);

    const isLivro = tab === "livro";
    const head = isLivro
      ? [["Nome", "E-mail", "Status", "Data"]]
      : [["Nome", "E-mail", "Cargo", "Mensagem", "Status", "Data"]];

    const body = leads.map(l =>
      isLivro
        ? [l.nome, l.email, STATUS_LABEL[l.status], fmt(l.created_at)]
        : [l.nome, l.email, l.cargo ?? "—", l.mensagem ?? "—", STATUS_LABEL[l.status], fmt(l.created_at)]
    );

    autoTable(doc, {
      startY: 38,
      head,
      body,
      theme: "striped",
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
      columnStyles: isLivro ? {} : { 3: { cellWidth: 55 } },
      margin: { left: 14, right: 14 },
    });

    // Rodapé com total
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Total de leads: ${leads.length}`, 14, finalY);

    const tabLabel = tab === "livro" ? "pre-lancamento-livro" : "mentoria";
    doc.save(`leads-cavalheiro-${tabLabel}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const filteredLeads = leads;

  return (
    <div className="ws-page" style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>
      {/* Título */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 600, color: "var(--ws-text)", letterSpacing: "-.3px" }}>
            Leads — Carlos Cavalheiro
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: ".8rem", color: "var(--ws-text3)" }}>
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} na aba ativa
          </p>
        </div>
        <button
          onClick={gerarPDF}
          disabled={filteredLeads.length === 0}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 18px", borderRadius: 10,
            background: "var(--ws-accent)", color: "#fff",
            border: "none", cursor: filteredLeads.length === 0 ? "not-allowed" : "pointer",
            fontSize: ".78rem", fontWeight: 600, letterSpacing: ".3px",
            opacity: filteredLeads.length === 0 ? .5 : 1,
            transition: "opacity .15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Gerar Relatório PDF
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--ws-border)", marginBottom: 24 }}>
        {(["livro", "mentoria"] as LeadTipo[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 20px", background: "none", border: "none",
              cursor: "pointer", fontSize: ".82rem", fontWeight: tab === t ? 600 : 400,
              color: tab === t ? "var(--ws-accent)" : "var(--ws-text3)",
              borderBottom: tab === t ? "2px solid var(--ws-accent)" : "2px solid transparent",
              marginBottom: -1, transition: "color .15s",
            }}
          >
            {t === "livro" ? "Pré-lançamento do Livro" : "Mentoria"}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ws-text3)", fontSize: ".85rem" }}>
          Carregando leads...
        </div>
      ) : filteredLeads.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ws-text3)" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>◎</div>
          <div style={{ fontSize: ".9rem" }}>Nenhum lead encontrado nesta aba.</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ws-border)" }}>
                <Th>Nome</Th>
                <Th>E-mail</Th>
                {tab === "mentoria" && <Th>Cargo</Th>}
                {tab === "mentoria" && <Th>Mensagem</Th>}
                <Th>Data</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => (
                <tr
                  key={lead.id}
                  style={{ borderBottom: "1px solid var(--ws-border)", transition: "background .1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--ws-surface2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <Td><span style={{ fontWeight: 500, color: "var(--ws-text)" }}>{lead.nome}</span></Td>
                  <Td><span style={{ color: "var(--ws-text2)" }}>{lead.email}</span></Td>
                  {tab === "mentoria" && <Td>{lead.cargo ?? <span style={{ color: "var(--ws-text3)" }}>—</span>}</Td>}
                  {tab === "mentoria" && (
                    <Td>
                      {lead.mensagem
                        ? <span title={lead.mensagem} style={{ cursor: "help", color: "var(--ws-text2)", display: "inline-block", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.mensagem}</span>
                        : <span style={{ color: "var(--ws-text3)" }}>—</span>}
                    </Td>
                  )}
                  <Td><span style={{ color: "var(--ws-text3)" }}>{fmt(lead.created_at)}</span></Td>
                  <Td>
                    <button
                      onClick={() => isAdmin && cycleStatus(lead)}
                      disabled={updatingId === lead.id || !isAdmin}
                      title={isAdmin ? "Clique para alterar o status" : undefined}
                      style={{
                        ...STATUS_COLOR[lead.status],
                        padding: "3px 10px", borderRadius: 999, fontSize: ".72rem", fontWeight: 600,
                        cursor: isAdmin ? "pointer" : "default",
                        transition: "opacity .15s",
                        opacity: updatingId === lead.id ? .5 : 1,
                        letterSpacing: ".3px",
                      }}
                    >
                      {STATUS_LABEL[lead.status]}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--ws-text3)", fontWeight: 600, fontSize: ".72rem", letterSpacing: ".5px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "12px 14px", color: "var(--ws-text2)", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}
