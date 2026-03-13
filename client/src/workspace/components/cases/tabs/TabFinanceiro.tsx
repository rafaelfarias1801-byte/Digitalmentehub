import { useEffect, useState } from "react";
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

export default function TabFinanceiro({ caseData }: TabFinanceiroProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
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
        setPayments(data ?? []);
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

    const { data } = await supabase
      .from("payments")
      .insert(payload)
      .select()
      .single();

    if (data) {
      setPayments((prev) => [...prev, data]);
      setModal(false);
      setForm(EMPTY_FORM);
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
        prev.map((item) => (item.id === payment.id ? data : item))
      );
    }
  }

  async function removePayment(id: string) {
    setPayments((prev) => prev.filter((item) => item.id !== id));
    await supabase.from("payments").delete().eq("id", id);
  }

  const paid = payments.filter((payment) => payment.paid);
  const pending = payments.filter((payment) => !payment.paid);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "#00e67612",
            border: "1px solid #00e67630",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontFamily: "DM Mono",
              fontSize: ".6rem",
              letterSpacing: "1.5px",
              color: "#00e676",
              marginBottom: 6,
            }}
          >
            RECEBIDO
          </div>
          <div
            style={{
              fontFamily: "Syne",
              fontWeight: 800,
              fontSize: "1.3rem",
              color: "#00e676",
            }}
          >
            {fmt(paid.reduce((sum, payment) => sum + payment.amount, 0))}
          </div>
        </div>

        <div
          style={{
            background: "#ffd60012",
            border: "1px solid #ffd60030",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontFamily: "DM Mono",
              fontSize: ".6rem",
              letterSpacing: "1.5px",
              color: "#ffd600",
              marginBottom: 6,
            }}
          >
            A VENCER
          </div>
          <div
            style={{
              fontFamily: "Syne",
              fontWeight: 800,
              fontSize: "1.3rem",
              color: "#ffd600",
            }}
          >
            {fmt(pending.reduce((sum, payment) => sum + payment.amount, 0))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="ws-btn" onClick={() => setModal(true)}>
          + Novo pagamento
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : payments.length === 0 ? (
        <Empty label="Nenhum pagamento cadastrado." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pending.length > 0 && (
            <>
              <div
                style={{
                  fontFamily: "DM Mono",
                  fontSize: ".6rem",
                  letterSpacing: "1.5px",
                  color: "var(--ws-text3)",
                  marginBottom: 4,
                }}
              >
                A VENCER
              </div>

              {pending.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  p={payment}
                  onToggle={togglePaid}
                  onRemove={removePayment}
                />
              ))}
            </>
          )}

          {paid.length > 0 && (
            <>
              <div
                style={{
                  fontFamily: "DM Mono",
                  fontSize: ".6rem",
                  letterSpacing: "1.5px",
                  color: "var(--ws-text3)",
                  marginTop: 12,
                  marginBottom: 4,
                }}
              >
                PAGOS
              </div>

              {paid.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  p={payment}
                  onToggle={togglePaid}
                  onRemove={removePayment}
                />
              ))}
            </>
          )}
        </div>
      )}

      {modal && (
        <div
          style={overlayStyle}
          onClick={(e) => e.target === e.currentTarget && setModal(false)}
        >
          <div style={modalBoxStyle}>
            <div style={modalTitleStyle}>Novo pagamento</div>

            <label className="ws-label">Descrição</label>
            <input
              className="ws-input"
              value={form.description}
              placeholder="Ex: Mensalidade março"
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
              <span style={{ fontSize: ".83rem", color: "var(--ws-text2)" }}>
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

              <button className="ws-btn-ghost" onClick={() => setModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}