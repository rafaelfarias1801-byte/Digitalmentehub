interface EmptyProps {
  label: string;
}

export default function Empty({ label }: EmptyProps) {
  return (
    <div
      style={{
        textAlign: "center",
        color: "var(--ws-text3)",
        fontFamily: "DM Mono",
        fontSize: ".75rem",
        padding: "48px 0",
      }}
    >
      {label}
    </div>
  );
}
