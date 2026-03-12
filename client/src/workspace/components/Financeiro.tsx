// client/src/workspace/components/Financeiro.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { FinancialEntry } from "../../lib/supabaseClient";

export default function Financeiro() {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);

  useEffect(() => {
    supabase.from("financial").select("*").order("due_date").then(({ data }) => setEntries(data ?? []));
  }, []);

  const receber = entries.filter(e => e.positive).reduce((s, e) => s + Number(e.amount), 0);
  const pagar   = entries.filter(e => !e.positive).reduce((s, e) => s + Number(e.amount), 0);
  const saldo   = receber - pagar;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="ws-page">
      <div className="ws-page-title">Financeiro<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Recebimentos, assinaturas e pagamentos</div>

      <div className="ws-fin-cards">
        <div className="ws-fin-card">
          <div className="ws-fin-label">A Receber</div>
          <div className="ws-fin-value ws-green">{fmt(receber)}</div>
        </div>
        <div className="ws-fin-card">
          <div className="ws-fin-label">A Pagar</div>
          <div className="ws-fin-value ws-red">{fmt(pagar)}</div>
        </div>
        <div className="ws-fin-card">
          <div className="ws-fin-label">Saldo Projetado</div>
          <div className="ws-fin-value ws-yel">{fmt(saldo)}</div>
        </div>
      </div>

      <div className="ws-card">
        <div className="ws-card-title">Movimentações</div>
        <table className="ws-table">
          <thead>
            <tr>
              <th>Descrição</th><th>Tipo</th><th>Vencimento</th><th>Valor</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td>{e.description}</td>
                <td>{e.type}</td>
                <td>{new Date(e.due_date).toLocaleDateString("pt-BR")}</td>
                <td className={e.positive ? "ws-green" : "ws-red"}>
                  {e.positive ? "+" : "-"} {fmt(Number(e.amount))}
                </td>
                <td>
                  <span className={`ws-status ws-s-${e.status === "pago" ? "pago" : e.status === "pendente" ? "pend" : "venc"}`}>
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
