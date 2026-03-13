// client/src/workspace/components/Financeiro.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";

interface FinEntry {
  id: string;
  description: string;
  type: "recebimento" | "assinatura" | "pagamento";
  due_date: string;
  amount: number;
  positive: boolean;
  status: "pago" | "pendente" | "vencido";
}

interface Props { profile: Profile; }

const EMPTY: Omit<FinEntry, "id"> = {
  description: "",
  type: "recebimento",
  due_date: "",
  amount: 0,
  positive: true,
  status: "pendente",
};

const TYPE_OPTIONS = [
  { value: "recebimento", label: "Recebimento", positive: true },
  { value: "assinatura",  label: "Assinatura",  positive: false },
  { value: "pagamento",   label: "Pagamento",   positive: false },
];

const STATUS_OPTIONS = ["pago", "pendente", "vencido"];

const fmt = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Financeiro({ profile }: Props) {
  const [entries, setEntries] = useState<FinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<FinEntry | null>(null);
  const [form, setForm]       = useState<Omit<FinEntry, "id">>(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [filter, setFilter]   = useState<"all"|"pago"|"pendente"|"vencido">("all");

  useEffect(() => {
    supabase.from("financial").select("*").order("due_date")
      .then(({ data }) => { setEntries(data ?? []); setLoading(false); });
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setModal(true);
  }

  function openEdit(e: FinEntry) {
    setEditing(e);
    setForm({
      description: e.description,
      type: e.type,
      due_date: e.due_date,
      amount: e.amount,
      positive: e.positive,
      status: e.status,
    });
    setModal(true);
  }

  async function save() {
    if (!form.description.trim() || !form.due_date || !form.amount) return;
    setSaving(true);

    // positive é determinado pelo tipo
    const typeOpt = TYPE_OPTIONS.find(t => t.value === form.type);
    const payload = { ...form, positive: typeOpt?.positive ?? form.positive };

    if (editing) {
      const { data, error } = await supabase
        .from("financial").update(payload).eq("id", editing.id).select().single();
      if (!error && data) setEntries(prev => prev.map(e => e.id === editing.id ? data : e));
    } else {
      const { data, error } = await supabase
        .from("financial").insert(payload).select().single();
      if (!error && data) setEntries(prev => [...prev, data]);
    }

    setSaving(false);
    setModal(false);
  }

  async function remove(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
    await supabase.from("financial").delete().eq("id", id);
  }

  async function toggleStatus(entry: FinEntry) {
    const next = entry.status === "pendente" ? "pago" : entry.status === "pago" ? "vencido" : "pendente";
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: next } : e));
    await supabase.from("financial").update({ status: next }).eq("id", entry.id);
  }

  const filtered = entries.filter(e => filter === "all" || e.status === filter);
  const receber  = entries.filter(e => e.positive).reduce((s, e) => s + Number(e.amount), 0);
  const pagar    = entries.filter(e => !e.positive).reduce((s, e) => s + Number(e.amount), 0);
  const saldo    = receber - pagar;

  const statusClass: Record<string, string> = {
    pago: "ws-s-pago", pendente: "ws-s-pend", vencido: "ws-s-venc",
  };

  return (
    <div className="ws-page">
      <div className="ws-page-title">Financeiro<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Recebimentos, assinaturas e pagamentos</div>

      {/* Totais */}
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
          <div className={`ws-fin-value ${saldo >= 0 ? "ws-green" : "ws-red"}`}>{fmt(saldo)}</div>
        </div>
      </div>

      {/* Filtros + botão */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="ws-filters" style={{ marginBottom: 0 }}>
          {(["all","pago","pendente","vencido"] as const).map(f => (
            <button key={f} className={`ws-filter ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="ws-btn" onClick={openAdd}>+ Entrada</button>
      </div>

      {/* Tabela */}
      <div className="ws-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 24, color: "var(--ws-text3)", fontFamily: "DM Mono", fontSize: ".8rem" }}>Carregando...</div>
        ) : (
          <table className="ws-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ws-text3)", padding: 24 }}>Nenhuma entrada.</td></tr>
              )}
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ color: "var(--ws-text)", fontWeight: 500 }}>{e.description}</td>
                  <td style={{ textTransform: "capitalize" }}>{e.type}</td>
                  <td style={{ fontFamily: "DM Mono", fontSize: ".8rem" }}>
                    {new Date(e.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </td>
                  <td className={e.positive ? "ws-green" : "ws-red"} style={{ fontWeight: 700 }}>
                    {e.positive ? "+" : "−"} {fmt(Number(e.amount))}
                  </td>
                  <td>
                    <span
                      className={`ws-status ${statusClass[e.status]}`}
                      style={{ cursor: "pointer" }}
                      title="Clique para alternar status"
                      onClick={() => toggleStatus(e)}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(e)} style={{
                        background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)",
                        borderRadius: 6, color: "var(--ws-text2)", cursor: "pointer",
                        padding: "4px 10px", fontSize: ".75rem",
                      }}>✎</button>
                      <button onClick={() => remove(e.id)} style={{
                        background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)",
                        borderRadius: 6, color: "var(--ws-accent)", cursor: "pointer",
                        padding: "4px 10px", fontSize: ".75rem",
                      }}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "#00000080", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{
            background: "var(--ws-surface)", border: "1px solid var(--ws-border2)",
            borderRadius: 20, padding: "36px 40px", width: 460,
            boxShadow: "0 30px 80px #00000060",
          }}>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.3rem", color: "var(--ws-text)", marginBottom: 24 }}>
              {editing ? "Editar entrada" : "Nova entrada"}
            </div>

            <label className="ws-label">Descrição</label>
            <input className="ws-input" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Carlos Cavalheiro — março" style={{ marginBottom: 16 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label className="ws-label">Tipo</label>
                <select className="ws-input" value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                  {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="ws-label">Status</label>
                <select className="ws-input" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div>
                <label className="ws-label">Valor (R$)</label>
                <input className="ws-input" type="number" min="0" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00" />
              </div>
              <div>
                <label className="ws-label">Vencimento</label>
                <input className="ws-input" type="date" value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="ws-btn" onClick={save} disabled={saving} style={{ flex: 1 }}>
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar"}
              </button>
              <button className="ws-btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
