// client/src/workspace/components/Financeiro.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import { useIsMobile } from "../hooks/useIsMobile";

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

function getMonthKey(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00");
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Financeiro({ profile }: Props) {
  const [entries, setEntries] = useState<FinEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [calcModal, setCalcModal] = useState(false);

  const [editing, setEditing] = useState<FinEntry | null>(null);
  const [form, setForm] = useState<Omit<FinEntry, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  const [statusFilter, setStatusFilter] = useState<"all" | "pago" | "pendente" | "vencido">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | FinEntry["type"]>("all");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [calcDisplay, setCalcDisplay] = useState("0");
  const isMobile = useIsMobile();

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
      due_date: `${selectedMonth}-01`,
    });
    setDrawerOpen(true);
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
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
    setForm(EMPTY);
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
        closeDrawer();
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
        closeDrawer();
      } else if (error) {
        alert(`Erro ao criar entrada: ${error.message}`);
      }
    }

    setSaving(false);
  }

  async function remove(id: string) {
    const entry = entries.find((e) => e.id === id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("financial").delete().eq("id", id);

    // Se tiver related_name, remove o payment correspondente na case também
    if (entry?.related_name) {
      const { data: cases } = await supabase
        .from("cases")
        .select("id")
        .eq("name", entry.related_name)
        .maybeSingle();

      if (cases?.id) {
        await supabase
          .from("payments")
          .delete()
          .eq("case_id", cases.id)
          .eq("description", entry.description);
      }
    }

    if (editing?.id === id) {
      closeDrawer();
    }
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

  const availableMonths = useMemo(() => {
    const keys = Array.from(new Set(entries.map((e) => getMonthKey(e.due_date))));
    const sorted = keys.sort((a, b) => b.localeCompare(a));

    if (!sorted.includes(getCurrentMonthKey())) {
      sorted.unshift(getCurrentMonthKey());
    }

    return sorted;
  }, [entries]);

  const monthFilteredEntries = useMemo(() => {
    return entries.filter((e) => getMonthKey(e.due_date) === selectedMonth);
  }, [entries, selectedMonth]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return monthFilteredEntries.filter((e) => {
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesType = typeFilter === "all" || e.type === typeFilter;
      const matchesSearch =
        !term ||
        e.description.toLowerCase().includes(term) ||
        (e.related_name ?? "").toLowerCase().includes(term) ||
        (e.notes ?? "").toLowerCase().includes(term);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [monthFilteredEntries, search, statusFilter, typeFilter]);

  const metrics = useMemo(() => {
    const receitasPagas = monthFilteredEntries
      .filter((e) => e.positive && e.status === "pago")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const despesasPagas = monthFilteredEntries
      .filter((e) => !e.positive && e.status === "pago")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const receber = monthFilteredEntries
      .filter((e) => e.positive && e.status !== "pago")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const pagar = monthFilteredEntries
      .filter((e) => !e.positive && e.status !== "pago")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const vencidos = monthFilteredEntries
      .filter((e) => e.status === "vencido" || (e.status !== "pago" && isPastDue(e.due_date)))
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const saldoAtual = receitasPagas - despesasPagas;

    return {
      saldoAtual,
      receber,
      pagar,
      vencidos,
    };
  }, [monthFilteredEntries]);

  const monthlySummary = useMemo(() => {
    const receitasMes = monthFilteredEntries
      .filter((e) => e.positive)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const despesasMes = monthFilteredEntries
      .filter((e) => !e.positive)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const resultadoMes = receitasMes - despesasMes;

    return {
      receitasMes,
      despesasMes,
      resultadoMes,
    };
  }, [monthFilteredEntries]);

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

function handleCalcKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  const allowedKeys = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    ".", "+", "-", "*", "/",
    "Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter"
  ];

  if (!allowedKeys.includes(e.key)) {
    e.preventDefault();
    return;
  }

  if (e.key === "Enter") {
    e.preventDefault();
    calcResult();
    return;
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

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="ws-btn-ghost" onClick={() => setCalcModal(true)}>
            Calculadora
          </button>
          <button className="ws-btn" onClick={openAdd}>
            + Entrada
          </button>
        </div>
      </div>

      {/* período */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 280px) 1fr",
          gap: 14,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "Poppins, monospace",
              fontSize: ".58rem",
              letterSpacing: "1.4px",
              textTransform: "uppercase",
              color: "var(--ws-text3)",
              marginBottom: 8,
            }}
          >
            Período
          </div>
          <select
            className="ws-field"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: "100%" }}
          >
            {availableMonths.map((monthKey) => (
              <option key={monthKey} value={monthKey}>
                {getMonthLabel(monthKey)}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Poppins, monospace",
                fontSize: ".58rem",
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: "var(--ws-text3)",
              }}
            >
              Receitas do mês
            </div>
            <div style={{ marginTop: 6, color: "var(--ws-yellow)", fontSize: "1rem", fontWeight: 700 }}>
              {fmt(monthlySummary.receitasMes)}
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: "Poppins, monospace",
                fontSize: ".58rem",
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: "var(--ws-text3)",
              }}
            >
              Despesas do mês
            </div>
            <div style={{ marginTop: 6, color: "var(--ws-red)", fontSize: "1rem", fontWeight: 700 }}>
              {fmt(monthlySummary.despesasMes)}
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: "Poppins, monospace",
                fontSize: ".58rem",
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: "var(--ws-text3)",
              }}
            >
              Resultado do mês
            </div>
            <div
              style={{
                marginTop: 6,
                color: monthlySummary.resultadoMes >= 0 ? "var(--ws-green)" : "var(--ws-red)",
                fontSize: "1rem",
                fontWeight: 700,
              }}
            >
              {fmt(monthlySummary.resultadoMes)}
            </div>
          </div>
        </div>
      </div>

      {/* cards principais */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
          gap: isMobile ? 10 : 14,
          marginBottom: 16,
          width: "100%",
          boxSizing: "border-box",
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
          <div className="ws-fin-value" style={{ color: "var(--ws-accent)" }}>
            {fmt(metrics.vencidos)}
          </div>
          <div style={{ marginTop: 10, color: "var(--ws-text3)", fontSize: ".76rem" }}>
            tudo que já venceu e segue em aberto
          </div>
        </div>
      </div>

      {/* filtros */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "minmax(240px, 1.3fr) repeat(2, minmax(180px, .8fr)) auto",
          gap: 10,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <input
          className="ws-field"
          placeholder="Buscar por descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ gridColumn: isMobile ? "1 / -1" : "auto" }}
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

        <div className="ws-filters" style={{ marginBottom: 0, justifyContent: "flex-end", display: isMobile ? "none" : "flex" }}>
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

      {/* tabela */}
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
          <div style={{ padding: 24, color: "var(--ws-text3)", fontFamily: "Poppins", fontSize: ".8rem" }}>
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

                    <td style={{ fontFamily: "Poppins", fontSize: ".8rem" }}>
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
                        {confirmingId === e.id ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <span style={{ fontSize: ".65rem", color: "var(--ws-text3)", fontFamily: "Poppins", whiteSpace: "nowrap" }}>Excluir?</span>
                            <button onClick={() => { void remove(e.id); setConfirmingId(null); }} style={{
                              background: "#ff443315", border: "1px solid #ff443350", borderRadius: 6,
                              color: "#ff4433", cursor: "pointer", fontSize: ".72rem", padding: "4px 8px", fontFamily: "inherit",
                            }}>Sim</button>
                            <button onClick={() => setConfirmingId(null)} style={{
                              background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 6,
                              color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", padding: "4px 8px", fontFamily: "inherit",
                            }}>Não</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingId(e.id)}
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* drawer financeiro */}
      {drawerOpen && (
        <>
          <div
            onClick={closeDrawer}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.22)",
              zIndex: 100,
            }}
          />

          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: 460,
              maxWidth: "96vw",
              height: "100vh",
              background: "linear-gradient(180deg, rgba(16,21,39,0.98), rgba(12,16,30,0.99))",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              zIndex: 101,
              overflowY: "auto",
              padding: 24,
              boxShadow: "-20px 0 60px rgba(0,0,0,0.24)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontFamily: "Poppins, monospace",
                  fontSize: ".62rem",
                  letterSpacing: "1.4px",
                  textTransform: "uppercase",
                  color: "var(--ws-text3)",
                  marginTop: 8,
                }}
              >
                {editing ? "Editar entrada" : "Nova entrada"}
              </div>

              <button
                className="ws-btn-ghost"
                onClick={closeDrawer}
                style={{ padding: "8px 12px", fontSize: ".75rem", flexShrink: 0 }}
              >
                Fechar
              </button>
            </div>

            <div
              style={{
                fontFamily: "Poppins, system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "1.5rem",
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
                color: "var(--ws-text)",
                marginBottom: 22,
              }}
            >
              {editing ? "Editar movimentação financeira" : "Cadastrar nova movimentação"}
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
                minHeight: 130,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: "14px 15px",
                color: "var(--ws-text)",
                fontFamily: "Poppins, system-ui, sans-serif",
                fontSize: ".92rem",
                lineHeight: 1.55,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 24,
              }}
            />

            <div
              style={{
                paddingTop: 14,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ color: "var(--ws-text3)", fontSize: ".78rem" }}>
                {saving ? "Salvando..." : editing ? "Edite e salve quando quiser" : "Preencha e crie a entrada"}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                {editing && (
                  <button
                    onClick={() => remove(editing.id)}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,92,122,0.35)",
                      color: "var(--ws-red)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontFamily: "Poppins, system-ui, sans-serif",
                      fontWeight: 600,
                      fontSize: ".85rem",
                    }}
                  >
                    Excluir
                  </button>
                )}

                <button className="ws-btn" onClick={save} disabled={saving}>
                  {saving ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar"}
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* calculadora */}
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
                fontFamily: "Poppins, system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "1.15rem",
                color: "var(--ws-text)",
                marginBottom: 16,
              }}
            >
              Calculadora
            </div>

            <input
  value={calcDisplay}
  onChange={(e) => setCalcDisplay(e.target.value || "0")}
  onKeyDown={handleCalcKeyDown}
  style={{
    width: "100%",
    background: "var(--ws-surface2)",
    border: "1px solid var(--ws-border2)",
    borderRadius: 14,
    padding: "18px 16px",
    fontFamily: "Poppins, system-ui, sans-serif",
    fontWeight: 700,
    fontSize: "1.8rem",
    color: "var(--ws-text)",
    textAlign: "right",
    marginBottom: 14,
    boxSizing: "border-box",
    outline: "none",
  }}
/>


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
                  type="button"
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
              <button className="ws-btn-ghost" type="button" onClick={calcClear} style={{ flex: 1 }}>
                Limpar
              </button>
              <button className="ws-btn-ghost" type="button" onClick={calcBackspace} style={{ flex: 1 }}>
                Apagar
              </button>
              <button className="ws-btn" type="button" onClick={useCalcResultInForm} style={{ flex: 1 }}>
                Usar valor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
