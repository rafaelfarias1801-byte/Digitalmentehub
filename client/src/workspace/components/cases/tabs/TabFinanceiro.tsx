import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import Empty from "../shared/Empty";
import Loader from "../shared/Loader";
import PaymentRow from "../shared/PaymentRow";
import { fmt, modalBoxStyle, modalTitleStyle, overlayStyle } from "../styles";
import { todayLocalISO } from "../utils";
import type { Case, Payment } from "../types";

interface TabFinanceiroProps {
  caseData: Case;
}

interface PaymentFormState {
  description: string;
  amount: string;
  due_date: string;
  paid: boolean;
  paid_date: string;
}

const EMPTY_FORM: PaymentFormState = {
  description: "",
  amount: "",
  due_date: "",
  paid: false,
  paid_date: "",
};

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "Poppins, monospace",
  fontSize: ".68rem",
  letterSpacing: "1.4px",
  textTransform: "uppercase",
  color: "var(--ws-text3)",
};

const summaryCardBaseStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: "18px 20px",
  minHeight: 104,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
};

const summaryValueStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontWeight: 700,
  fontSize: "1.9rem",
  lineHeight: 1.05,
  letterSpacing: "-0.03em",
};

const summaryHintStyle: React.CSSProperties = {
  fontSize: ".82rem",
  color: "var(--ws-text3)",
  marginTop: 6,
};

function sortPayments(list: Payment[]) {
  return [...list].sort((a, b) => {
    const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return aDate - bDate;
  });
}

export default function TabFinanceiro({ caseData }: TabFinanceiroProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState<PaymentFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadPayments() {
      setLoading(true);

      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("case_id", caseData.id)
        .order("due_date");

      if (mounted) {
        setPayments(sortPayments(data ?? []));
        setLoading(false);
      }
    }

    void loadPayments();

    return () => {
      mounted = false;
    };
  }, [caseData.id]);

  async function save() {
    if (!form.description.trim()) return;

    setSaving(true);

    const payload = {
      case_id: caseData.id,
      description: form.description.trim(),
      amount: parseFloat(form.amount) || 0,
      due_date: form.due_date || null,
      paid: form.paid,
      paid_date: form.paid ? form.paid_date || todayLocalISO() : null,
    };

    if (editingPayment) {
      // Edição
      const { data } = await supabase
        .from("payments")
        .update(payload)
        .eq("id", editingPayment.id)
        .select()
        .single();

      if (data) {
        setPayments((prev) => sortPayments(prev.map(p => p.id === editingPayment.id ? data : p)));

        // Atualiza no financeiro global
        await supabase
          .from("financial")
          .update({
            description: payload.description,
            amount: payload.amount,
            due_date: payload.due_date || todayLocalISO(),
            status: payload.paid ? "pago" : "pendente",
          })
          .eq("description", editingPayment.description)
          .eq("related_name", caseData.name);

        setModal(false);
        setEditingPayment(null);
        setForm(EMPTY_FORM);
      }
    } else {
      // Novo pagamento
      const { data } = await supabase
        .from("payments")
        .insert(payload)
        .select()
        .single();

      if (data) {
        setPayments((prev) => sortPayments([...prev, data]));

        // Sincroniza com o financeiro global
        await supabase.from("financial").insert({
          description: payload.description,
          type: "recebimento",
          due_date: payload.due_date || todayLocalISO(),
          amount: payload.amount,
          positive: true,
          status: payload.paid ? "pago" : "pendente",
          related_name: caseData.name || null,
          notes: `Lançado automaticamente via case: ${caseData.name}`,
          created_at: new Date().toISOString(),
        });

        setModal(false);
        setForm(EMPTY_FORM);
      }
    }

    setSaving(false);
  }

  async function togglePaid(payment: Payment) {
    const nextPaid = !payment.paid;

    const { data } = await supabase
      .from("payments")
      .update({
        paid: nextPaid,
        paid_date: nextPaid ? todayLocalISO() : null,
      })
      .eq("id", payment.id)
      .select()
      .single();

    if (data) {
      setPayments((prev) =>
        sortPayments(prev.map((item) => (item.id === payment.id ? data : item)))
      );

      // Atualiza status no financeiro global se existir entrada correspondente
      const { data: finEntry } = await supabase
        .from("financial")
        .select("id")
        .eq("description", payment.description)
        .eq("related_name", caseData.name)
        .maybeSingle();

      if (finEntry) {
        await supabase
          .from("financial")
          .update({ status: nextPaid ? "pago" : "pendente" })
          .eq("id", finEntry.id);
      }
    }
  }

  function openEdit(payment: Payment) {
    setEditingPayment(payment);
    setForm({
      description: payment.description,
      amount: String(payment.amount),
      due_date: payment.due_date || "",
      paid: payment.paid,
      paid_date: payment.paid_date || "",
    });
    setModal(true);
  }

  async function removePayment(id: string) {
    const payment = payments.find(p => p.id === id);
    setPayments((prev) => prev.filter((item) => item.id !== id));
    await supabase.from("payments").delete().eq("id", id);

    // Remove do financeiro global também
    if (payment) {
      await supabase
        .from("financial")
        .delete()
        .eq("description", payment.description)
        .eq("related_name", caseData.name);
    }
  }

  const paid = useMemo(
    () => payments.filter((payment) => payment.paid),
    [payments]
  );

  const pending = useMemo(
    () => payments.filter((payment) => !payment.paid),
    [payments]
  );

  const totalPaid = paid.reduce((sum, payment) => sum + payment.amount, 0);
  const totalPending = pending.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        <div
          style={{
            ...summaryCardBaseStyle,
            background: "linear-gradient(180deg, rgba(0,230,118,0.14), rgba(0,230,118,0.07))",
            border: "1px solid rgba(0,230,118,0.30)",
          }}
        >
          <div style={{ ...sectionLabelStyle, color: "#00b864" }}>Recebido</div>

          <div>
            <div style={{ ...summaryValueStyle, color: "#009e54" }}>
              {fmt(totalPaid)}
            </div>
            <div style={summaryHintStyle}>
              {paid.length} {paid.length === 1 ? "pagamento recebido" : "pagamentos recebidos"}
            </div>
          </div>
        </div>

        <div
          style={{
            ...summaryCardBaseStyle,
            background: "linear-gradient(180deg, rgba(255,214,0,0.14), rgba(255,214,0,0.06))",
            border: "1px solid rgba(255,214,0,0.30)",
          }}
        >
          <div style={{ ...sectionLabelStyle, color: "#a07800" }}>A vencer</div>

          <div>
            <div style={{ ...summaryValueStyle, color: "#b08800" }}>
              {fmt(totalPending)}
            </div>
            <div style={summaryHintStyle}>
              {pending.length} {pending.length === 1 ? "pagamento pendente" : "pagamentos pendentes"}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={sectionLabelStyle}>Lançamentos financeiros</div>

        <button className="ws-btn" onClick={() => setModal(true)}>
          + Novo pagamento
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : payments.length === 0 ? (
        <Empty label="Nenhum pagamento cadastrado." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {pending.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={sectionLabelStyle}>A vencer</div>

              {pending.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  p={payment}
                  onToggle={togglePaid}
                  onRemove={removePayment}
                  onEdit={openEdit}
                />
              ))}
            </section>
          )}

          {paid.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ ...sectionLabelStyle, marginTop: pending.length ? 4 : 0 }}>
                Pagos
              </div>

              {paid.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  p={payment}
                  onToggle={togglePaid}
                  onRemove={removePayment}
                  onEdit={openEdit}
                />
              ))}
            </section>
          )}
        </div>
      )}

      {modal && (
        <div
          style={overlayStyle}
          onClick={(e) => e.target === e.currentTarget && setModal(false)}
        >
          <div style={modalBoxStyle}>
            <div style={modalTitleStyle}>{editingPayment ? "Editar pagamento" : "Novo pagamento"}</div>

            <label className="ws-label">Descrição</label>
            <input
              className="ws-input"
              value={form.description}
              placeholder="Ex: Mensalidade abril"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              style={{ marginBottom: 12 }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <label className="ws-label">Valor (R$)</label>
                <input
                  className="ws-input"
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="ws-label">Vencimento</label>
                <input
                  className="ws-input"
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, due_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                marginBottom: form.paid ? 12 : 20,
              }}
            >
              <input
                type="checkbox"
                checked={form.paid}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    paid: e.target.checked,
                    paid_date: e.target.checked
                      ? prev.paid_date || todayLocalISO()
                      : "",
                  }))
                }
              />
              <span style={{ fontSize: ".86rem", color: "var(--ws-text2)" }}>
                Já pago
              </span>
            </label>

            {form.paid && (
              <>
                <label className="ws-label">Data de pagamento</label>
                <input
                  className="ws-input"
                  type="date"
                  value={form.paid_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, paid_date: e.target.value }))
                  }
                  style={{ marginBottom: 16 }}
                />
              </>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="ws-btn"
                onClick={() => void save()}
                disabled={saving}
                style={{ flex: 1 }}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>

              <button className="ws-btn-ghost" onClick={() => { setModal(false); setEditingPayment(null); setForm(EMPTY_FORM); }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
