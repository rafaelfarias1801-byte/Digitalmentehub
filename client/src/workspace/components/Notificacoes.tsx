// client/src/workspace/components/Notificacoes.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";

interface Props { profile: Profile; }

interface ClientProfile {
  id: string;
  name: string;
  case_id: string | null;
  case_name: string;
  push_token: string | null;
}

interface Scheduled {
  id: string;
  title: string;
  body: string;
  scheduled_at: string;
  sent: boolean;
  sent_at: string | null;
}

const labelStyle: React.CSSProperties = {
  fontFamily: "Poppins, monospace",
  fontSize: ".68rem",
  letterSpacing: "1.4px",
  textTransform: "uppercase",
  color: "var(--ws-text3)",
  marginBottom: 8,
  display: "block",
};

function toLocalDatetimeValue(iso?: string) {
  if (!iso) {
    // default: agora + 1h
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  }
  return new Date(iso).toISOString().slice(0, 16);
}

export default function Notificacoes({ profile: _profile }: Props) {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState(toLocalDatetimeValue());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent?: number; failed?: number; noToken?: number; scheduled?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(true);

  useEffect(() => {
    async function load() {
      const [profilesRes, casesRes, scheduledRes] = await Promise.all([
        supabase.from("profiles").select("id, name, case_id, push_token").eq("role", "cliente").order("name"),
        supabase.from("cases").select("id, name"),
        supabase.from("scheduled_notifications").select("id, title, body, scheduled_at, sent, sent_at").order("scheduled_at", { ascending: false }).limit(20),
      ]);

      const caseMap = Object.fromEntries((casesRes.data ?? []).map(c => [c.id, c.name]));
      const list: ClientProfile[] = (profilesRes.data ?? []).map(p => ({
        id: p.id,
        name: p.name ?? "—",
        case_id: p.case_id,
        case_name: p.case_id ? (caseMap[p.case_id] ?? "—") : "Sem case",
        push_token: p.push_token,
      }));

      setClients(list);
      setSelected(new Set(list.map(c => c.id)));
      setScheduled(scheduledRes.data ?? []);
      setLoading(false);
      setLoadingScheduled(false);
    }
    void load();
  }, []);

  function toggleAll() {
    if (selected.size === clients.length) setSelected(new Set());
    else setSelected(new Set(clients.map(c => c.id)));
  }

  function toggleClient(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function send() {
    if (!title.trim() || !body.trim() || selected.size === 0) return;
    setSending(true);
    setResult(null);

    const selectedList = clients.filter(c => selected.has(c.id));

    // Agendado — salva no banco e o cron cuida do envio
    if (sendMode === "schedule") {
      const { error } = await supabase.from("scheduled_notifications").insert({
        title: title.trim(),
        body: body.trim(),
        profile_ids: selectedList.map(c => c.id),
        scheduled_at: new Date(scheduledAt).toISOString(),
      });

      if (!error) {
        setResult({ scheduled: true });
        setTitle(""); setBody("");
        // Atualiza lista
        const { data } = await supabase.from("scheduled_notifications")
          .select("id, title, body, scheduled_at, sent, sent_at")
          .order("scheduled_at", { ascending: false }).limit(20);
        setScheduled(data ?? []);
      } else {
        setResult({ failed: 1 });
      }
      setSending(false);
      setTimeout(() => setResult(null), 4000);
      return;
    }

    // Envio imediato
    const withToken = selectedList.filter(c => c.push_token);
    const noToken = selectedList.length - withToken.length;

    if (withToken.length === 0) {
      setResult({ sent: 0, failed: 0, noToken });
      setSending(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-client`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            type: "custom",
            title: title.trim(),
            body: body.trim(),
            profile_ids: withToken.map(c => c.id),
          }),
        }
      );
      const json = await res.json();
      setResult({ sent: json.sent ?? 0, failed: json.failed ?? 0, noToken });
      if (json.ok) { setTitle(""); setBody(""); }
    } catch {
      setResult({ sent: 0, failed: withToken.length, noToken });
    } finally {
      setSending(false);
      setTimeout(() => setResult(null), 5000);
    }
  }

  async function cancelScheduled(id: string) {
    await supabase.from("scheduled_notifications").delete().eq("id", id);
    setScheduled(prev => prev.filter(s => s.id !== id));
  }

  function fmtDatetime(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="ws-page">
      <div className="ws-page-title">🔔 Notificações<span className="ws-dot">.</span></div>
      <div className="ws-page-sub" style={{ marginBottom: 24 }}>Envie ou agende notificações push para seus clientes</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Coluna esquerda: composição ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ws-card">
            <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--ws-text)", marginBottom: 16 }}>
              Compor notificação
            </div>

            <label style={labelStyle}>Título</label>
            <input
              className="ws-input"
              value={title}
              placeholder="Ex: Recesso de feriado"
              onChange={e => setTitle(e.target.value)}
              style={{ marginBottom: 12 }}
            />

            <label style={labelStyle}>Mensagem</label>
            <textarea
              className="ws-input"
              value={body}
              placeholder="Ex: Hoje estaremos de recesso. Voltamos na segunda-feira, dia 07."
              onChange={e => setBody(e.target.value)}
              style={{ minHeight: 90, resize: "vertical", marginBottom: 16 }}
            />

            {/* Preview */}
            {(title || body) && (
              <div style={{
                background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)",
                borderRadius: 12, padding: "12px 14px", marginBottom: 16,
              }}>
                <div style={{ fontSize: ".62rem", fontFamily: "Poppins", color: "var(--ws-text3)", marginBottom: 6, letterSpacing: "1px", textTransform: "uppercase" }}>Preview</div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e91e8c22", border: "1px solid #e91e8c44", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: ".55rem", fontWeight: 800, color: "#e91e8c" }}>DIG</div>
                  <div>
                    <div style={{ fontSize: ".84rem", fontWeight: 700, color: "var(--ws-text)" }}>{title || "Título"}</div>
                    <div style={{ fontSize: ".76rem", color: "var(--ws-text2)", marginTop: 2 }}>{body || "Mensagem..."}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Modo de envio */}
            <label style={labelStyle}>Quando enviar</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["now", "schedule"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSendMode(mode)}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                    fontSize: ".8rem", fontFamily: "inherit", fontWeight: 600,
                    background: sendMode === mode ? "#e91e8c22" : "var(--ws-surface2)",
                    color: sendMode === mode ? "#e91e8c" : "var(--ws-text3)",
                    outline: sendMode === mode ? "2px solid #e91e8c66" : "1px solid var(--ws-border)",
                    transition: "all .15s",
                  }}
                >
                  {mode === "now" ? "⚡ Enviar agora" : "🕐 Agendar"}
                </button>
              ))}
            </div>

            {sendMode === "schedule" && (
              <>
                <label style={labelStyle}>Data e horário</label>
                <input
                  className="ws-input"
                  type="datetime-local"
                  value={scheduledAt}
                  min={toLocalDatetimeValue()}
                  onChange={e => setScheduledAt(e.target.value)}
                  style={{ marginBottom: 16 }}
                />
              </>
            )}

            <button
              className="ws-btn"
              onClick={() => void send()}
              disabled={sending || !title.trim() || !body.trim() || selected.size === 0}
              style={{ width: "100%" }}
            >
              {sending
                ? "Processando..."
                : sendMode === "now"
                  ? `⚡ Enviar para ${selected.size} cliente${selected.size !== 1 ? "s" : ""}`
                  : `🕐 Agendar para ${selected.size} cliente${selected.size !== 1 ? "s" : ""}`
              }
            </button>

            {result && (
              <div style={{
                marginTop: 12, padding: "10px 14px", borderRadius: 10,
                background: (result.scheduled || (result.sent ?? 0) > 0) ? "rgba(0,230,118,0.08)" : "rgba(255,92,122,0.08)",
                border: `1px solid ${(result.scheduled || (result.sent ?? 0) > 0) ? "rgba(0,230,118,0.3)" : "rgba(255,92,122,0.3)"}`,
                fontSize: ".78rem", color: "var(--ws-text2)", fontFamily: "Poppins",
              }}>
                {result.scheduled && <div>✅ Notificação agendada com sucesso!</div>}
                {result.sent !== undefined && result.sent > 0 && <div>✅ {result.sent} notificação{result.sent !== 1 ? "ões" : ""} enviada{result.sent !== 1 ? "s" : ""}</div>}
                {(result.failed ?? 0) > 0 && <div>❌ {result.failed} falha{result.failed !== 1 ? "s" : ""}</div>}
                {(result.noToken ?? 0) > 0 && <div>⚠ {result.noToken} cliente{result.noToken !== 1 ? "s" : ""} sem notificação habilitada</div>}
              </div>
            )}
          </div>

          {/* Agendadas */}
          {!loadingScheduled && scheduled.length > 0 && (
            <div className="ws-card">
              <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--ws-text)", marginBottom: 14 }}>
                Agendadas / enviadas
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scheduled.map(s => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 10,
                    background: "var(--ws-surface2)",
                    borderLeft: `3px solid ${s.sent ? "#00e676" : "#e91e8c"}`,
                    opacity: s.sent ? 0.7 : 1,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: ".84rem", fontWeight: 600, color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{s.title}</div>
                      <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>
                        {s.sent
                          ? `✅ Enviada em ${fmtDatetime(s.sent_at!)}`
                          : `🕐 Agendada para ${fmtDatetime(s.scheduled_at)}`
                        }
                      </div>
                    </div>
                    {!s.sent && (
                      <button
                        onClick={() => void cancelScheduled(s.id)}
                        title="Cancelar"
                        style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1rem", padding: "0 4px" }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Coluna direita: destinatários ── */}
        <div className="ws-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--ws-text)" }}>
              Destinatários
              <span style={{ marginLeft: 8, fontSize: ".72rem", fontFamily: "Poppins", color: "var(--ws-text3)" }}>
                {selected.size}/{clients.length}
              </span>
            </div>
            <button onClick={toggleAll} className="ws-btn-ghost" style={{ fontSize: ".72rem", padding: "4px 10px" }}>
              {selected.size === clients.length ? "Desmarcar todos" : "Marcar todos"}
            </button>
          </div>

          {loading ? (
            <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Carregando clientes...</div>
          ) : clients.length === 0 ? (
            <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>Nenhum cliente cadastrado.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {clients.map(c => (
                <div
                  key={c.id}
                  onClick={() => toggleClient(c.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    background: selected.has(c.id) ? "rgba(233,30,140,0.08)" : "var(--ws-surface2)",
                    border: `1px solid ${selected.has(c.id) ? "rgba(233,30,140,0.3)" : "var(--ws-border)"}`,
                    transition: "all .15s",
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    background: selected.has(c.id) ? "#e91e8c" : "var(--ws-surface)",
                    border: `2px solid ${selected.has(c.id) ? "#e91e8c" : "var(--ws-border2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .15s",
                  }}>
                    {selected.has(c.id) && <span style={{ color: "#fff", fontSize: ".6rem", fontWeight: 800 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".84rem", fontWeight: 600, color: "var(--ws-text)" }}>{c.name}</div>
                    <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 1 }}>
                      {c.case_name}
                      {!c.push_token && <span style={{ color: "#ffd600", marginLeft: 6 }}>⚠ sem notificação</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
