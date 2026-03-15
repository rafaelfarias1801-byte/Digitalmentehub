import type { Payment } from "../types";
import { fmt } from "../styles";
import { formatDateBR, isOverdueDate } from "../utils";

interface PaymentRowProps {
  p: Payment;
  onToggle: (payment: Payment) => void;
  onRemove: (id: string) => void;
}

export default function PaymentRow({
  p,
  onToggle,
  onRemove,
}: PaymentRowProps) {
  const overdue = !p.paid && isOverdueDate(p.due_date);

  return (
    <div
      style={{
        background: "var(--ws-surface)",
        border: `1px solid ${
          p.paid ? "#00e67630" : overdue ? "#ff443330" : "var(--ws-border)"
        }`,
        borderLeft: `3px solid ${
          p.paid ? "#00e676" : overdue ? "#ff4433" : "#ffd600"
        }`,
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: p.paid ? 0.7 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={p.paid}
        onChange={() => onToggle(p)}
        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#00e676" }}
      />

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: ".87rem",
            color: "var(--ws-text)",
            fontWeight: 600,
            textDecoration: p.paid ? "line-through" : "none",
          }}
        >
          {p.description}
        </div>

        <div
          style={{
            fontSize: ".72rem",
            color: "var(--ws-text3)",
            fontFamily: "DM Mono",
            marginTop: 2,
          }}
        >
          {p.paid && p.paid_date
            ? `Pago em ${formatDateBR(p.paid_date)}`
            : p.due_date
            ? `Vence ${formatDateBR(p.due_date)}${overdue ? " · VENCIDO" : ""}`
            : "Sem data"}
        </div>
      </div>

      <div
        style={{
          fontFamily: "inherit",
          fontWeight: 700,
          fontSize: "1.05rem",
          letterSpacing: "-0.02em",
          color: p.paid ? "#31d98b" : overdue ? "#ff4433" : "#ffd84d",
          whiteSpace: "nowrap",
        }}
      >
        {fmt(p.amount)}
      </div>

      <button
        onClick={() => onRemove(p.id)}
        style={{
          background: "none",
          border: "none",
          color: "var(--ws-text3)",
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        ×
      </button>
    </div>
  );
}