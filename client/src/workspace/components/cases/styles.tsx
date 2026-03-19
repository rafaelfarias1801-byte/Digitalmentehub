import type { CSSProperties } from "react";

export const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export function CasesGlobalStyle() {
  return (
    <style>{`
      .ws-cs-and  { color: #ffd600 !important; border-color: #ffd600 !important; }
      .ws-s-venc  { color: #ff6060 !important; border-color: #ff6060 !important; }
      .ws-cs-ativo{ color: #00e676 !important; border-color: #00e676 !important; }
      .ws-case-status { background: transparent !important; }

      .ws-richtext ul {
        list-style-type: disc;
        padding-left: 1.5em;
        margin: 4px 0;
      }

      .ws-richtext ol {
        list-style-type: decimal;
        padding-left: 1.5em;
        margin: 4px 0;
      }

      .ws-richtext li {
        margin: 2px 0;
      }

      .ws-richtext b,
      .ws-richtext strong {
        font-weight: 700;
      }

      .ws-richtext i,
      .ws-richtext em {
        font-style: italic;
      }

      .ws-richtext u {
        text-decoration: underline;
      }

      .ws-richtext s {
        text-decoration: line-through;
      }
    `}</style>
  );
}

export const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#00000085",
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// Use este em componentes que têm acesso ao isMobile
export function getOverlayStyle(isMobile: boolean): CSSProperties {
  return {
    ...overlayStyle,
    left: 0,
  };
}

export const modalBoxStyle: CSSProperties = {
  background: "var(--ws-surface)",
  border: "1px solid var(--ws-border2)",
  borderRadius: 20,
  padding: "32px 36px",
  width: 500,
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 30px 80px #00000060",
};

export const modalTitleStyle: CSSProperties = {
  fontFamily: "Poppins",
  fontWeight: 800,
  fontSize: "1.2rem",
  color: "var(--ws-text)",
  marginBottom: 22,
};

export const labelStyle: CSSProperties = {
  fontFamily: "Poppins",
  fontSize: ".58rem",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  color: "var(--ws-text2)",
  marginBottom: 6,
  display: "block",
};

export const navBtnStyle: CSSProperties = {
  background: "var(--ws-surface2)",
  border: "1px solid var(--ws-border2)",
  borderRadius: 8,
  color: "var(--ws-text2)",
  width: 32,
  height: 32,
  cursor: "pointer",
  fontSize: "1rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const closeBtnStyle: CSSProperties = {
  background: "var(--ws-surface2)",
  border: "1px solid var(--ws-border2)",
  borderRadius: "50%",
  width: 28,
  height: 28,
  color: "var(--ws-text2)",
  cursor: "pointer",
  fontSize: "1rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
