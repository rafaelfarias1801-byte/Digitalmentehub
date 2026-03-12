// client/src/workspace/components/IA.tsx
import { useState } from "react";

export default function IA() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("Olá! Configure a API Key do Claude nas variáveis de ambiente para ativar o chat.");

  function send() {
    if (!input.trim()) return;
    setOutput(`Você: ${input}\n\nIntegração com Claude API em desenvolvimento. Adicione VITE_CLAUDE_API_KEY no .env para ativar.`);
    setInput("");
  }

  const tools = [
    { name: "Claude",      desc: "Anthropic — copy, estratégia, análise", icon: "🤖", bg: "#e91e8c20", on: true },
    { name: "ChatGPT",     desc: "OpenAI — assistente geral e brainstorm", icon: "◎",  bg: "#10a37f18", on: false },
    { name: "Gemini",      desc: "Google — pesquisa e Google Suite",        icon: "✦",  bg: "#4285f420", on: false },
    { name: "Perplexity",  desc: "Pesquisa em tempo real com fontes",       icon: "⚡",  bg: "#e91e8c15", on: false },
  ];

  return (
    <div className="ws-page">
      <div className="ws-page-title">IA<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Assistentes integrados via API</div>

      <div className="ws-ia-grid">
        {tools.map(t => (
          <div key={t.name} className="ws-ia-card">
            <div className="ws-ia-icon" style={{ background: t.bg }}>{t.icon}</div>
            <div>
              <div className="ws-ia-name">{t.name}</div>
              <div className="ws-ia-desc">{t.desc}</div>
            </div>
            <span className={`ws-ia-status ${t.on ? "ws-ia-on" : "ws-ia-off"}`}>
              {t.on ? "Conectado" : "Configurar"}
            </span>
          </div>
        ))}
      </div>

      <div className="ws-card">
        <div className="ws-card-title">Chat com IA <span className="ws-badge">claude integrado</span></div>
        <div className="ws-chat-out" style={{ whiteSpace: "pre-line" }}>{output}</div>
        <div className="ws-input-row">
          <input className="ws-field flex1" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()} placeholder="Pergunte algo..." />
          <button className="ws-btn" onClick={send}>Enviar</button>
        </div>
      </div>
    </div>
  );
}
