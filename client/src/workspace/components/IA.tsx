// client/src/workspace/components/IA.tsx
import { useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Model = "claude" | "chatgpt" | "gemini";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MODELS: { id: Model; name: string; desc: string; icon: string; color: string }[] = [
  { id: "claude",   name: "Claude",     desc: "Anthropic — copy, estratégia, análise", icon: "🤖", color: "#e91e8c" },
  { id: "chatgpt",  name: "ChatGPT",    desc: "OpenAI — assistente geral e brainstorm", icon: "◎",  color: "#10a37f" },
  { id: "gemini",   name: "Gemini",     desc: "Google — pesquisa e Google Suite",       icon: "✦",  color: "#4285f4" },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default function IA() {
  const [model, setModel]       = useState<Model>("claude");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const activeModel = MODELS.find(m => m.id === model)!;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-ia`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ messages: next, model }),
      });

      const json = await res.json() as { reply?: string; error?: string };

      if (json.error) throw new Error(json.error);

      const assistantMsg: Message = { role: "assistant", content: json.reply ?? "Sem resposta." };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao contatar a IA.";
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function clearChat() { setMessages([]); }

  return (
    <div className="ws-page">
      <div className="ws-page-title">IA<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Assistentes integrados via API</div>

      {/* Seleção de modelo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 24 }}>
        {MODELS.map(m => (
          <div key={m.id} onClick={() => setModel(m.id)} style={{
            background: model === m.id ? `${m.color}18` : "var(--ws-surface)",
            border: `1px solid ${model === m.id ? m.color : "var(--ws-border)"}`,
            borderRadius: "var(--ws-radius)", padding: "16px 18px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
            transition: "all .15s",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, fontSize: "1.2rem",
              background: `${m.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>{m.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--ws-text)" }}>{m.name}</div>
              <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", marginTop: 2 }}>{m.desc}</div>
            </div>
            <span style={{
              fontSize: ".6rem", fontFamily: "DM Mono", letterSpacing: "1px",
              padding: "3px 8px", borderRadius: 6,
              background: model === m.id ? `${m.color}22` : "var(--ws-surface2)",
              color: model === m.id ? m.color : "var(--ws-text3)",
              border: `1px solid ${model === m.id ? m.color : "var(--ws-border2)"}`,
            }}>
              {model === m.id ? "ATIVO" : "USAR"}
            </span>
          </div>
        ))}
      </div>

      {/* Chat */}
      <div className="ws-card" style={{ display: "flex", flexDirection: "column", height: 520 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: activeModel.color, boxShadow: `0 0 6px ${activeModel.color}`,
            }} />
            <span style={{ fontWeight: 600, fontSize: ".9rem", color: "var(--ws-text)" }}>
              Chat com {activeModel.name}
            </span>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} style={{
              background: "none", border: "1px solid var(--ws-border2)", borderRadius: 6,
              color: "var(--ws-text3)", cursor: "pointer", padding: "4px 10px",
              fontSize: ".72rem", fontFamily: "inherit",
            }}>Limpar conversa</button>
          )}
        </div>

        {/* Mensagens */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
          {messages.length === 0 && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", color: "var(--ws-text3)", gap: 8,
            }}>
              <div style={{ fontSize: "2rem" }}>{activeModel.icon}</div>
              <div style={{ fontSize: ".82rem" }}>Inicie uma conversa com {activeModel.name}</div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "78%", padding: "10px 14px", borderRadius: 12,
                fontSize: ".86rem", lineHeight: 1.6,
                background: msg.role === "user"
                  ? `${activeModel.color}22`
                  : "var(--ws-surface2)",
                color: "var(--ws-text)",
                borderBottomRightRadius: msg.role === "user" ? 2 : 12,
                borderBottomLeftRadius:  msg.role === "user" ? 12 : 2,
                border: msg.role === "user"
                  ? `1px solid ${activeModel.color}44`
                  : "1px solid var(--ws-border)",
                whiteSpace: "pre-wrap",
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{
                padding: "10px 16px", borderRadius: 12, borderBottomLeftRadius: 2,
                background: "var(--ws-surface2)", border: "1px solid var(--ws-border)",
                display: "flex", gap: 5, alignItems: "center",
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%", background: activeModel.color,
                    animation: "ws-bounce .9s infinite",
                    animationDelay: `${i * 0.15}s`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder={`Pergunte ao ${activeModel.name}... (Enter para enviar)`}
            rows={2}
            style={{
              flex: 1, background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)",
              borderRadius: 10, color: "var(--ws-text)", padding: "10px 14px",
              fontFamily: "inherit", fontSize: ".86rem", resize: "none", outline: "none",
              lineHeight: 1.5, transition: "border-color .15s",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = activeModel.color; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--ws-border2)"; }}
          />
          <button onClick={() => void send()} disabled={loading || !input.trim()} style={{
            background: loading || !input.trim() ? "var(--ws-surface2)" : activeModel.color,
            border: "none", borderRadius: 10, color: "#fff",
            padding: "0 20px", height: 52, cursor: loading || !input.trim() ? "default" : "pointer",
            fontFamily: "inherit", fontWeight: 600, fontSize: ".86rem",
            transition: "all .15s", flexShrink: 0,
          }}>
            {loading ? "..." : "Enviar"}
          </button>
        </div>
      </div>

      {/* CSS da animação dos dots */}
      <style>{`
        @keyframes ws-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
