import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichEditor({
  value,
  onChange,
  placeholder,
}: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const isFocused = document.activeElement === ref.current;
    const nextValue = value || "";

    if (!isFocused && ref.current.innerHTML !== nextValue) {
      ref.current.innerHTML = nextValue;
    }
  }, [value]);

  function runCmd(cmd: string) {
    const el = ref.current;
    if (!el) return;

    const selection = window.getSelection();
    const savedRange =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).cloneRange()
        : null;

    el.focus();

    if (savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }

    document.execCommand(cmd, false, undefined);
    onChange(el.innerHTML || "");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    let node: Node | null = selection.getRangeAt(0).startContainer;

    while (node && node !== ref.current) {
      if ((node as Element).tagName === "LI") {
        if ((node as HTMLElement).textContent?.trim() === "") {
          e.preventDefault();

          const list = (node as HTMLElement).parentElement;
          if (!list) return;

          (node as HTMLElement).remove();

          if (!list.querySelector("li")) {
            list.remove();
          }

          const div = document.createElement("div");
          div.innerHTML = "<br/>";

          const parent = list.parentNode || ref.current;
          parent.insertBefore(div, list.nextSibling);

          const range = document.createRange();
          range.setStart(div, 0);
          range.collapse(true);

          selection.removeAllRanges();
          selection.addRange(range);

          onChange(ref.current?.innerHTML || "");
        }

        return;
      }

      node = node.parentNode;
    }
  }

  const tools: [string, ReactNode][] = [
    [
      "bold",
      <b key="b" style={{ fontFamily: "sans-serif", fontSize: ".9rem" }}>
        B
      </b>,
    ],
    [
      "italic",
      <i key="i" style={{ fontFamily: "sans-serif", fontSize: ".9rem" }}>
        I
      </i>,
    ],
    [
      "underline",
      <u key="u" style={{ fontFamily: "sans-serif", fontSize: ".9rem" }}>
        U
      </u>,
    ],
    [
      "strikeThrough",
      <s key="s" style={{ fontFamily: "sans-serif", fontSize: ".9rem" }}>
        S
      </s>,
    ],
    [
      "insertUnorderedList",
      <span key="ul" style={{ fontSize: ".9rem", fontWeight: 700 }}>
        •
      </span>,
    ],
    [
      "insertOrderedList",
      <span key="ol" style={{ fontSize: ".8rem", fontWeight: 700 }}>
        1.
      </span>,
    ],
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: "4px 6px",
          background: "var(--ws-surface2)",
          borderRadius: "6px 6px 0 0",
          border: "1px solid var(--ws-border2)",
          borderBottom: "none",
        }}
      >
        {tools.map(([cmd, label], index) => (
          <button
            key={index}
            onMouseDown={(e) => {
              e.preventDefault();
              runCmd(cmd);
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--ws-text)",
              cursor: "pointer",
              padding: "3px 9px",
              borderRadius: 4,
              lineHeight: 1.4,
              minWidth: 28,
              textAlign: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML || "")}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder || "Escreva aqui..."}
        style={{
          minHeight: 100,
          padding: "10px 12px",
          background: "var(--ws-surface2)",
          border: "1px solid var(--ws-border2)",
          borderRadius: "0 0 6px 6px",
          color: "var(--ws-text)",
          fontSize: ".84rem",
          lineHeight: 1.7,
          outline: "none",
        }}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: var(--ws-text3);
        }

        [contenteditable] ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 4px 0;
        }

        [contenteditable] ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin: 4px 0;
        }

        [contenteditable] li {
          margin: 1px 0;
        }
      `}</style>
    </div>
  );
}
