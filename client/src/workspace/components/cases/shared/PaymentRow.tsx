import { useState } from "react";
import type { Payment } from "../types";
import { fmt } from "../styles";
import { formatDateBR, isOverdueDate } from "../utils";

interface PaymentRowProps {
  p: Payment;
  onToggle: (payment: Payment) => void;
  onRemove: (id: string) => void;
  onEdit?: (payment: Payment) => void;
}

export default function PaymentRow({ p, onToggle, onRemove, onEdit }: PaymentRowProps) {
  const [confirming, setConfirming] = useState(false);
  const overdue = !p.paid && isOverdueDate(p.due_date);

  function handleRemove() {
    if (confirming) {
      onRemove(p.id);
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  }

  return (
    <div style={{
      background: "var(--ws-surface)",
      border: `1px solid ${p.paid ? "#00e67630" : overdue ? "#ff443330" : "var(--ws-border)"}`,
      borderLeft: `3px solid ${p.paid ? "#00e676" : overdue ? "#ff4433" : "#ffd600"}`,
      borderRadius: 10,
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      opacity: p.paid ? 0.7 : 1,
    }}>
      <input type="checkbox" checked={p.paid} onChange={() => onToggle(p)}
        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#00e676" }} />

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: ".87rem", color: "var(--ws-text)", fontWeight: 600, textDecoration: p.paid ? "line-through" : "none" }}>
          {p.description}
        </div>
        <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>
          {p.paid && p.paid_date
            ? `Pago em ${formatDateBR(p.paid_date)}`
            : p.due_date
            ? `Vence ${formatDateBR(p.due_date)}${overdue ? " · VENCIDO" : ""}`
            : "Sem data"}
        </div>
      </div>

      <div style={{
        fontFamily: "inherit", fontWeight: 700, fontSize: "1.05rem",
        letterSpacing: "-0.02em",
        color: p.paid ? "#31d98b" : overdue ? "#ff4433" : "#ffd84d",
        whiteSpace: "nowrap",
      }}>
        {fmt(p.amount)}
      </div>

      {/* Botão editar */}
      {onEdit && (
        <button onClick={() => onEdit(p)} title="Editar" style={{
          background: "none", border: "1px solid var(--ws-border)", borderRadius: 6,
          color: "var(--ws-text3)", cursor: "pointer", fontSize: ".75rem",
          padding: "4px 8px", fontFamily: "inherit", transition: "all .15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ws-text3)"; e.currentTarget.style.color = "var(--ws-text)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ws-border)"; e.currentTarget.style.color = "var(--ws-text3)"; }}
        >✏</button>
      )}

      {/* Botão excluir com confirmação */}
      {confirming ? (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins", whiteSpace: "nowrap" }}>Excluir?</span>
          <button onClick={handleRemove} style={{
            background: "#ff443315", border: "1px solid #ff443350", borderRadius: 6,
            color: "#ff4433", cursor: "pointer", fontSize: ".72rem", padding: "3px 8px", fontFamily: "inherit",
          }}>Sim</button>
          <button onClick={() => setConfirming(false)} style={{
            background: "none", border: "1px solid var(--ws-border)", borderRadius: 6,
            color: "var(--ws-text3)", cursor: "pointer", fontSize: ".72rem", padding: "3px 8px", fontFamily: "inherit",
          }}>Não</button>
        </div>
      ) : (
        <button onClick={handleRemove} title="Excluir" style={{
          background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1rem",
        }}>×</button>
      )}
    </div>
  );
}
