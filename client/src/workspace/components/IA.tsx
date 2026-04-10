// client/src/workspace/components/IA.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import { useIsMobile } from "../hooks/useIsMobile";

type Model = "claude" | "chatgpt" | "gemini";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  model: Model;
  messages: Message[];
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface Props { profile: Profile; }

const MODELS: { id: Model; name: string; desc: string; icon: string; color: string; available: boolean }[] = [
  { id: "gemini",  name: "Gemini",  desc: "Google — pesquisa e Google Suite",       icon: "✦",  color: "#4285f4", available: true  },
  { id: "claude",  name: "Claude",  desc: "Anthropic — copy, estratégia, análise",  icon: "🤖", color: "#e91e8c", available: false },
  { id: "chatgpt", name: "ChatGPT", desc: "OpenAI — assistente geral e brainstorm", icon: "◎",  color: "#10a37f", available: false },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<div style='font-weight:700;font-size:.9rem;margin-top:8px'>$1</div>")
    .replace(/^## (.+)$/gm, "<div style='font-weight:700;font-size:.95rem;margin-top:10px'>$1</div>")
    .replace(/^# (.+)$/gm, "<div style='font-weight:700;font-size:1rem;margin-top:12px'>$1</div>")
    .replace(/^\* (.+)$/gm, "<div style='padding-left:12px'>• $1</div>")
    .replace(/^- (.+)$/gm, "<div style='padding-left:12px'>• $1</div>");
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase();
}

export default function IA({ profile }: Props) {
  const [model, setModel]               = useState<Model>("gemini");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]         = useState<string | null>(null);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const bottomRef                       = useRef<HTMLDivElement>(null);

  const activeModel = MODELS.find(m => m.id === model)!;
  const isMobile = useIsMobile();;

  // ── Carregar conversas ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingConvs(true);
      const { data } = await supabase
        .from("ia_conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      setConversations((data ?? []) as Conversation[]);
      setLoadingConvs(false);
    }
    void load();
  }, []);

  // ── Selecionar conversa ─────────────────────────────────────────
  function selectConversation(conv: Conversation) {
    setActiveId(conv.id);
    setMessages(conv.messages);
    setModel(conv.model);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  // ── Nova conversa ───────────────────────────────────────────────
  function newConversation() {
    setActiveId(null);
    setMessages([]);
  }

  // ── Deletar conversa ────────────────────────────────────────────
  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Deseja excluir esta conversa?")) return;
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) newConversation();
    await supabase.from("ia_conversations").delete().eq("id", id);
  }

  // ── Enviar mensagem ─────────────────────────────────────────────
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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-ia`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Authorization": `Bearer ${ANON_KEY}`,
          "apikey": ANON_KEY,
        },
        body: JSON.stringify({ messages: next, model }),
      });

      const json = await res.json() as { reply?: string; error?: string };
      if (json.error) throw new Error(json.error);

      const assistantMsg: Message = { role: "assistant", content: json.reply ?? "Sem resposta." };
      const finalMessages = [...next, assistantMsg];
      setMessages(finalMessages);

      // Título automático: primeiras palavras da 1ª mensagem
      const title = text.slice(0, 50) + (text.length > 50 ? "..." : "");

      if (activeId) {
        // Atualiza conversa existente
        const { data } = await supabase
          .from("ia_conversations")
          .update({ messages: finalMessages, updated_at: new Date().toISOString() })
          .eq("id", activeId).select().single();
        if (data) setConversations(prev => prev.map(c => c.id === activeId ? data as Conversation : c));
      } else {
        // Cria nova conversa
        const { data } = await supabase
          .from("ia_conversations")
          .insert({ user_id: profile.id, model, messages: finalMessages, title })
          .select().single();
        if (data) {
          const conv = data as Conversation;
          setConversations(prev => [conv, ...prev]);
          setActiveId(conv.id);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao contatar a IA.";
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="ws-page">
      <div className="ws-page-title">IA<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Assistentes integrados via API</div>

      {/* Seleção de modelo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 20 }}>
        {MODELS.map(m => (
          <div key={m.id} onClick={() => m.available && setModel(m.id)} style={{
            background: model === m.id ? `${m.color}18` : "var(--ws-surface)",
            border: `1px solid ${model === m.id ? m.color : "var(--ws-border)"}`,
            borderRadius: "var(--ws-radius)", padding: "14px 16px",
            cursor: m.available ? "pointer" : "default",
            display: "flex", alignItems: "center", gap: 12,
            transition: "all .15s", opacity: m.available ? 1 : 0.45,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, fontSize: "1.1rem",
              background: `${m.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{m.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)" }}>{m.name}</div>
              <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", marginTop: 1 }}>{m.desc}</div>
            </div>
            <span style={{
              fontSize: ".58rem", fontFamily: "Poppins", letterSpacing: "1px", padding: "2px 7px", borderRadius: 6,
              background: model === m.id ? `${m.color}22` : "var(--ws-surface2)",
              color: model === m.id ? m.color : "var(--ws-text3)",
              border: `1px solid ${model === m.id ? m.color : "var(--ws-border2)"}`,
            }}>
              {!m.available ? "EM BREVE" : model === m.id ? "ATIVO" : "USAR"}
            </span>
          </div>
        ))}
      </div>

      {/* Layout chat + histórico */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "220px 1fr", gap: 16, alignItems: "start" }}>

        {/* Sidebar de conversas */}
        <div className="ws-card" style={{ padding: "12px 0" }}>
          <div style={{ padding: "0 14px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "Poppins", fontSize: ".6rem", letterSpacing: "1px", color: "var(--ws-text3)" }}>
              CONVERSAS
            </div>
            <button onClick={newConversation} style={{
              background: activeModel.color, border: "none", borderRadius: 6,
              color: "#fff", cursor: "pointer", padding: "3px 8px",
              fontSize: ".68rem", fontFamily: "inherit", fontWeight: 600,
            }}>+ Nova</button>
          </div>

          {loadingConvs ? (
            <div style={{ padding: "8px 14px", color: "var(--ws-text3)", fontSize: ".75rem" }}>Carregando...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "8px 14px", color: "var(--ws-text3)", fontSize: ".75rem" }}>Nenhuma conversa ainda.</div>
          ) : (
            <div style={{ maxHeight: 460, overflowY: "auto" }}>
              {conversations.map(conv => (
                <div key={conv.id} onClick={() => selectConversation(conv)} style={{
                  padding: "8px 14px", cursor: "pointer",
                  background: activeId === conv.id ? `${activeModel.color}14` : "transparent",
                  borderLeft: activeId === conv.id ? `2px solid ${activeModel.color}` : "2px solid transparent",
                  transition: "all .15s", display: "flex", alignItems: "flex-start", gap: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: ".78rem", color: "var(--ws-text)", fontWeight: activeId === conv.id ? 600 : 400,
                      overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                    }}>
                      {conv.title || "Conversa"}
                    </div>
                    <div style={{ fontSize: ".62rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>
                      {fmtDate(conv.updated_at)}
                    </div>
                  </div>
                  <button onClick={e => void deleteConversation(conv.id, e)} title="Excluir conversa" style={{
                    background: "none", border: "none", color: "var(--ws-text3)",
                    cursor: "pointer", fontSize: ".85rem", flexShrink: 0, lineHeight: 1,
                    opacity: 0.45, transition: "opacity .15s, color .15s", padding: "2px 4px",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#d63232"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "0.45"; e.currentTarget.style.color = "var(--ws-text3)"; }}
                  >🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="ws-card" style={{ display: "flex", flexDirection: "column", height: isMobile ? "70vh" : 560 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: activeModel.color, boxShadow: `0 0 6px ${activeModel.color}` }} />
            <span style={{ fontWeight: 600, fontSize: ".9rem", color: "var(--ws-text)" }}>
              {activeId ? conversations.find(c => c.id === activeId)?.title || "Conversa" : `Nova conversa com ${activeModel.name}`}
            </span>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--ws-text3)", gap: 8 }}>
                <div style={{ fontSize: "2rem" }}>{activeModel.icon}</div>
                <div style={{ fontSize: ".82rem" }}>Inicie uma conversa com {activeModel.name}</div>
                <div style={{ fontSize: ".7rem", fontFamily: "Poppins" }}>Digite sua mensagem abaixo</div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "78%", padding: "10px 14px", borderRadius: 12,
                  fontSize: ".86rem", lineHeight: 1.7,
                  background: msg.role === "user" ? `${activeModel.color}22` : "var(--ws-surface2)",
                  color: "var(--ws-text)",
                  borderBottomRightRadius: msg.role === "user" ? 2 : 12,
                  borderBottomLeftRadius: msg.role === "user" ? 12 : 2,
                  border: msg.role === "user" ? `1px solid ${activeModel.color}44` : "1px solid var(--ws-border)",
                  whiteSpace: "pre-wrap",
                }}
                  {...(msg.role === "assistant"
                    ? { dangerouslySetInnerHTML: { __html: renderMarkdown(msg.content) } }
                    : { children: msg.content }
                  )}
                />
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
                      animation: "ws-bounce .9s infinite", animationDelay: `${i * 0.15}s`,
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
      </div>

      <style>{`
        @keyframes ws-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
