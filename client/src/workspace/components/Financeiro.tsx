// client/src/workspace/components/Financeiro.tsx
import { useEffect, useMemo, useState } from "react";
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
  related_name?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

interface Props {
  profile: Profile;
}

const EMPTY: Omit<FinEntry, "id"> = {
  description: "",
  type: "recebimento",
  due_date: "",
  amount: 0,
  positive: true,
  status: "pendente",
  related_name: "",
  notes: "",
  created_at: null,
};

const TYPE_OPTIONS = [
  { value: "recebimento", label: "Recebimento", positive: true },
  { value: "assinatura", label: "Assinatura", positive: false },
  { value: "pagamento", label: "Pagamento", positive: false },
] as const;

const STATUS_OPTIONS = ["pago", "pendente", "vencido"] as const;

const fmt = (v: number) =>
  Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function isPastDue(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(date + "T00:00:00");
  return due < today;
}

export default function Financeiro({ profile }: Props) {
  const [entries, setEntries] = useState<FinEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [calcModal, setCalcModal] = useState(false);

  const [editing, setEditing] = useState<FinEntry | null>(null);
  const [form, setForm] = useState<Omit<FinEntry, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  const [statusFilter, setStatusFilter] = useState<"all" | "pago" | "pendente" | "vencido">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | FinEntry["type"]>("all");
  const [search, setSearch] = useState("");

  const [calcDisplay, setCalcDisplay] = useState("0");

  useEffect(() => {
    supabase
      .from("financial")
      .select("*")
      .order("due_date")
      .then(({ data }) => {
        const normalized = (data ?? []).map((item: any) => ({
          ...item,
          related_name: item.related_name ?? "",
          notes: item.notes ?? "",
          created_at: item.created_at ?? null,
        }));
        setEntries(normalized);
        setLoading(false);
      });
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({
      ...EMPTY,
      created_at: new Date().toISOString(),
    });
    setModal(true);
  }

  function openEdit(entry: FinEntry) {
    setEditing(entry);
    setForm({
      description: entry.description,
      type: entry.type,
      due_date: entry.due_date,
      amount: entry.amount,
      positive: entry.positive,
      status: entry.status,
      related_name: entry.related_name ?? "",
      notes: entry.notes ?? "",
      created_at: entry.created_at ?? null,
    });
    setModal(true);
  }

  async function save() {
    if (!form.description.trim() || !form.due_date || !form.amount) return;
    setSaving(true);

    const typeOpt = TYPE_OPTIONS.find((t) => t.value === form.type);
    const payload = {
      ...form,
      positive: typeOpt?.positive ?? form.positive,
      related_name: form.related_name || null,
      notes: form.notes || null,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("financial")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();

      if (!error && data) {
        setEntries((prev) => prev.map((e) => (e.id === editing.id ? data : e)));
      } else if (error) {
        alert(`Erro ao salvar entrada: ${error.message}`);
      }
    } else {
      const { data, error } = await supabase
        .from("financial")
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        setEntries((prev) => [...prev, data]);
      } else if (error) {
        alert(`Erro ao criar entrada: ${error.message}`);
      }
    }

    setSaving(false);
    setModal(false);
  }

  async function remove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("financial").delete().eq("id", id);
  }

  async function updateStatus(entry: FinEntry, nextStatus: FinEntry["status"]) {
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, status: nextStatus } : e))
    );

    const { error } = await supabase
      .from("financial")
      .update({ status: nextStatus })
      .eq("id", entry.id);

    if (error) {
      alert(`Erro ao atualizar status: ${error.message}`);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return entries.filter((e) => {
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesType = typeFilter === "all" || e.type === typeFilter;
      const matchesSearch =
        !term ||
        e.description.toLowerCase().includes(term) ||
        (e.related_name ?? "").toLowerCase().includes(term) ||
        (e.notes ?? "").toLowerCase().includes(term);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [entries, search, statusFilter, typeFilter]);

  const metrics = useMemo(() => {
    const receitasPagas = entries
      .filter((e) => e.positive && e.status === "pago")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const despesasPagas = entries
      .filter((e) => !e.positive && e.status === "pago")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const receber = entries
      .filter((e) => e.positive && e.status !== "pago")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const pagar = entries
      .filter((e) => !e.positive && e.status !== "pago")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const vencidos = entries
      .filter((e) => e.status === "vencido" || (e.status !== "pago" && isPastDue(e.due_date)))
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const saldoAtual = receitasPagas - despesasPagas;

    return {
      saldoAtual,
      receber,
      pagar,
      vencidos,
    };
  }, [entries]);

  const statusClass: Record<string, string> = {
    pago: "ws-s-pago",
    pendente: "ws-s-pend",
    vencido: "ws-s-venc",
  };

  const typeColor: Record<FinEntry["type"], string> = {
    recebimento: "var(--ws-yellow)",
    assinatura: "var(--ws-red)",
    pagamento: "var(--ws-red)",
  };

  function calcInput(value: string) {
    if (calcDisplay === "0" && value !== ".") {
      setCalcDisplay(value);
      return;
    }
    setCalcDisplay((prev) => prev + value);
  }

  function calcClear() {
    setCalcDisplay("0");
  }

  function calcBackspace() {
    setCalcDisplay((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  }

  function calcResult() {
    try {
      const sanitized = calcDisplay.replace(/,/g, ".");
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === "number" && Number.isFinite(result)) {
        setCalcDisplay(String(result));
      }
    } catch {
      alert("Conta inválida.");
    }
  }

  function useCalcResultInForm() {
    const value = Number(calcDisplay.replace(",", "."));
    if (!Number.isNaN(value)) {
      setForm((f) => ({ ...f, amount: value }));
      setCalcModal(false);
    }
  }

  return (
    <div className="ws-page">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div className="ws-page-title">
            Financeiro<span className="ws-dot">.</span>
          </div>
          <div className="ws-page-sub">Receitas, despesas e controle operacional</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="ws-btn-ghost" onClick={() => setCalcModal(true)}>
            Calculadora
          </button>
          <button className="ws-btn" onClick={openAdd}>
            + Entrada
          </button>
        </div>
      </div>

      {/* Cards principais */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div className="ws-fin-card" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="ws-fin-label">Saldo Atual</div>
          <div className={`ws-fin-value ${metrics.saldoAtual >= 0 ? "ws-green" : "ws-red"}`}>
            {fmt(metrics.saldoAtual)}
          </div>
          <div style={{ marginTop: 10, color: "var(--ws-text3)", fontSize: ".76rem" }}>
            receitas pagas − despesas pagas
          </div>
        </div>

        <div className="ws-fin-card" style={{ borderColor: "rgba(255,214,0,0.25)" }}>
          <div className="ws-fin-label" style={{ color: "var(--ws-yellow)" }}>A Receber</div>
          <div className="ws-fin-value ws-yel">{fmt(metrics.receber)}</div>
          <div style={{ marginTop: 10, color: "var(--ws-text3)", fontSize: ".76rem" }}>
            entradas pendentes e vencidas
          </div>
        </div>

        <div className="ws-fin-card" style={{ borderColor: "rgba(255,92,122,0.22)" }}>
          <div className="ws-fin-label" style={{ color: "var(--ws-red)" }}>A Pagar</div>
          <div className="ws-fin-value ws-red">{fmt(metrics.pagar)}</div>
          <div style={{ marginTop: 10, color: "var(--ws-text3)", fontSize: ".76rem" }}>
            saídas pendentes e vencidas
          </div>
        </div>

        <div className="ws-fin-card" style={{ borderColor: "rgba(233,30,140,0.22)" }}>
          <div className="ws-fin-label" style={{ color: "var(--ws-accent)" }}>Vencidos</div>
          <div className="ws-fin-value" style={{ color: "var(--ws-accent)" }}>{fmt(metrics.vencidos)}</div>
          <div style={{ marginTop: 10, color: "var(--ws-text3)", fontSize: ".76rem" }}>
            tudo que já venceu e segue em aberto
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 1.3fr) repeat(2, minmax(180px, .8fr)) auto",
          gap: 10,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <input
          className="ws-field"
          placeholder="Buscar por descrição, cliente/projeto ou observação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="ws-field"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="vencido">Vencido</option>
        </select>

        <select
          className="ws-field"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
        >
          <option value="all">Todos os tipos</option>
          <option value="recebimento">Recebimento</option>
          <option value="assinatura">Assinatura</option>
          <option value="pagamento">Pagamento</option>
        </select>

        <div className="ws-filters" style={{ marginBottom: 0, justifyContent: "flex-end" }}>
          {(["all", "pago", "pendente", "vencido"] as const).map((f) => (
            <button
              key={f}
              className={`ws-filter ${statusFilter === f ? "active" : ""}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === "all" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div
        className="ws-card"
        style={{
          padding: 0,
          overflow: "hidden",
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {loading ? (
          <div style={{ padding: 24, color: "var(--ws-text3)", fontFamily: "DM Mono", fontSize: ".8rem" }}>
            Carregando...
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="ws-table" style={{ width: "100%", minWidth: 1120 }}>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Cliente / Projeto</th>
                  <th>Tipo</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Observação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--ws-text3)", padding: 24 }}>
                      Nenhuma entrada.
                    </td>
                  </tr>
                )}

                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td style={{ color: "var(--ws-text)", fontWeight: 600 }}>
                      {e.description}
                    </td>

                    <td style={{ color: "var(--ws-text2)" }}>
                      {e.related_name || "—"}
                    </td>

                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: ".72rem",
                          fontWeight: 600,
                          background: `${typeColor[e.type]}20`,
                          color: typeColor[e.type],
                        }}
                      >
                        {TYPE_OPTIONS.find((t) => t.value === e.type)?.label ?? e.type}
                      </span>
                    </td>

                    <td style={{ fontFamily: "DM Mono", fontSize: ".8rem" }}>
                      {new Date(e.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>

                    <td className={e.positive ? "ws-yel" : "ws-red"} style={{ fontWeight: 700 }}>
                      {e.positive ? "+" : "−"} {fmt(Number(e.amount))}
                    </td>

                    <td>
                      <select
                        value={e.status}
                        onChange={(ev) => updateStatus(e, ev.target.value as FinEntry["status"])}
                        className="ws-field"
                        style={{
                          minWidth: 130,
                          padding: "8px 10px",
                          fontSize: ".74rem",
                          background: "var(--ws-surface2)",
                        }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ color: "var(--ws-text2)", maxWidth: 220 }}>
                      <div
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.4,
                        }}
                      >
                        {e.notes || "—"}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => openEdit(e)}
                          style={{
                            background: "var(--ws-surface2)",
                            border: "1px solid var(--ws-border2)",
                            borderRadius: 8,
                            color: "var(--ws-text2)",
                            cursor: "pointer",
                            padding: "6px 10px",
                            fontSize: ".75rem",
                          }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => remove(e.id)}
                          style={{
                            background: "var(--ws-surface2)",
                            border: "1px solid var(--ws-border2)",
                            borderRadius: 8,
                            color: "var(--ws-accent)",
                            cursor: "pointer",
                            padding: "6px 10px",
                            fontSize: ".75rem",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal financeiro */}
      {modal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#00000080",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => e.target === e.currentTarget && setModal(false)}
        >
          <div
            style={{
              background: "var(--ws-surface)",
              border: "1px solid var(--ws-border2)",
              borderRadius: 20,
              padding: "36px 40px",
              width: 560,
              maxWidth: "94vw",
              boxShadow: "0 30px 80px #00000060",
            }}
          >
            <div
              style={{
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "1.3rem",
                letterSpacing: "-0.03em",
                color: "var(--ws-text)",
                marginBottom: 24,
              }}
            >
              {editing ? "Editar entrada" : "Nova entrada"}
            </div>

            <label className="ws-label">Descrição</label>
            <input
              className="ws-input"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Mensalidade Carlos Cavalheiro — março"
              style={{ marginBottom: 16 }}
            />

            <label className="ws-label">Cliente / Projeto relacionado</label>
            <input
              className="ws-input"
              value={form.related_name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, related_name: e.target.value }))}
              placeholder="Ex: Arbol, Carlos Cavalheiro, DIG..."
              style={{ marginBottom: 16 }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <label className="ws-label">Tipo</label>
                <select
                  className="ws-input"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ws-label">Status</label>
                <select
                  className="ws-input"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <label className="ws-label">Valor (R$)</label>
                <input
                  className="ws-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="ws-label">Vencimento</label>
                <input
                  className="ws-input"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>

            <label className="ws-label">Observação</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Detalhes, contexto, lembrete ou referência..."
              style={{
                width: "100%",
                minHeight: 110,
                background: "var(--ws-surface2)",
                border: "1px solid var(--ws-border2)",
                borderRadius: 12,
                padding: "14px 15px",
                color: "var(--ws-text)",
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontSize: ".92rem",
                lineHeight: 1.55,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 24,
              }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button className="ws-btn" onClick={save} disabled={saving} style={{ flex: 1 }}>
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar"}
              </button>
              <button className="ws-btn-ghost" onClick={() => setModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal calculadora */}
      {calcModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#00000080",
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => e.target === e.currentTarget && setCalcModal(false)}
        >
          <div
            style={{
              background: "var(--ws-surface)",
              border: "1px solid var(--ws-border2)",
              borderRadius: 20,
              padding: 24,
              width: 360,
              boxShadow: "0 30px 80px #00000060",
            }}
          >
            <div
              style={{
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "1.15rem",
                color: "var(--ws-text)",
                marginBottom: 16,
              }}
            >
              Calculadora
            </div>

            <div
              style={{
                background: "var(--ws-surface2)",
                border: "1px solid var(--ws-border2)",
                borderRadius: 14,
                padding: "18px 16px",
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "1.8rem",
                color: "var(--ws-text)",
                textAlign: "right",
                marginBottom: 14,
                minHeight: 68,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                overflow: "hidden",
              }}
            >
              {calcDisplay}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
                marginBottom: 14,
              }}
            >
              {[
                "7", "8", "9", "/",
                "4", "5", "6", "*",
                "1", "2", "3", "-",
                "0", ".", "=", "+",
              ].map((key) => (
                <button
                  key={key}
                  onClick={() => (key === "=" ? calcResult() : calcInput(key))}
                  className={key === "=" ? "ws-btn" : "ws-btn-ghost"}
                  style={{
                    height: 46,
                    padding: 0,
                  }}
                >
                  {key}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="ws-btn-ghost" onClick={calcClear} style={{ flex: 1 }}>
                Limpar
              </button>
              <button className="ws-btn-ghost" onClick={calcBackspace} style={{ flex: 1 }}>
                Apagar
              </button>
              <button className="ws-btn" onClick={useCalcResultInForm} style={{ flex: 1 }}>
                Usar valor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}