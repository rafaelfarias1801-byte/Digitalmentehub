// client/src/workspace/components/Agenda.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";
import { useIsMobile } from "../hooks/useIsMobile";

interface CalEvent {
  id: string;
  title: string;
  date: string;
  type: "reuniao" | "prazo" | "pagamento" | "pessoal";
  client?: string;
  note?: string;
  source?: "google";
  google_event_id?: string;
  time?: string;       
  time_end?: string;   
  meet_link?: string;  
  attendees?: string;  
}

interface Props { profile: Profile; }

const TYPE_COLORS: Record<string, string> = {
  reuniao: "#e91e8c", prazo: "#4dabf7", pagamento: "#ffd600", pessoal: "#00e676",
};
const TYPE_LABELS: Record<string, string> = {
  reuniao: "Reunião", prazo: "Prazo", pagamento: "Pagamento", pessoal: "Pessoal",
};
const CLIENTS = ["—", "Carlos Cavalheiro", "Ana Carla", "ARBOL"];
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_HDR = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const EMPTY_FORM = { title: "", type: "reuniao" as CalEvent["type"], client: "", note: "" };

export default function Agenda({ profile }: Props) {
  const [cal, setCal]             = useState(new Date());
  const [events, setEvents]       = useState<CalEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [selected, setSelected]   = useState<string>(toYMD(new Date()));
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState<CalEvent | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const isMobile                  = useIsMobile();
  const [eventDetail, setEventDetail] = useState<CalEvent | null>(null);

  // Busca inicial de eventos do banco
  const fetchLocalEvents = async () => {
    const { data } = await supabase.from("events").select("*");
    setEvents(data ?? []);
  };

  useEffect(() => {
    fetchLocalEvents();
    
    if (window.location.search.includes("google_connected=1")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    fetchGoogleEvents();
  }, []);

  async function fetchGoogleEvents() {
    setGoogleLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await supabase.functions.invoke("google-calendar/events", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (res.data?.connected) {
        setGoogleConnected(true);
        // Após sincronizar com o Google, recarregamos os eventos do banco
        // pois a Edge Function acabou de dar 'upsert' neles.
        fetchLocalEvents();
      } else if (res.data?.expired) {
        setGoogleConnected(false);
      }
    } catch (e) {
      console.error("Google Calendar Sync Error:", e);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function connectGoogle() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await supabase.functions.invoke("google-calendar/auth-url", {
      body: { user_id: session.user.id },
    });
    if (res.data?.url) window.location.href = res.data.url;
  }

  async function disconnectGoogle() {
    await supabase.from("profiles").update({ google_calendar_token: null }).eq("id", profile.id);
    // Opcional: deletar eventos do google do banco ao desconectar
    await supabase.from("events").delete().eq("source", "google");
    setGoogleConnected(false);
    fetchLocalEvents();
  }

  const today    = toYMD(new Date());
  const firstDay = new Date(cal.getFullYear(), cal.getMonth(), 1);
  const lastDay  = new Date(cal.getFullYear(), cal.getMonth()+1, 0);
  const prevPad  = Array.from({ length: firstDay.getDay() }, (_, i) =>
    new Date(cal.getFullYear(), cal.getMonth(), i - firstDay.getDay() + 1).getDate()
  );
  const currDays = Array.from({ length: lastDay.getDate() }, (_, i) => i + 1);

  function eventsOn(ymd: string) { return events.filter(e => e.date === ymd); }

  function openAdd(ymd: string) {
    setSelected(ymd); setEditing(null); setForm(EMPTY_FORM); setModal(true);
  }
  function openEdit(ev: CalEvent) {
    setEditing(ev); setForm({ title: ev.title, type: ev.type, client: ev.client ?? "", note: ev.note ?? "" }); setModal(true);
  }

  async function saveEvent() {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editing) {
      const { data, error } = await supabase.from("events").update({ ...form, client: form.client || null, note: form.note || null }).eq("id", editing.id).select().single();
      if (!error && data) setEvents(prev => prev.map(e => e.id === editing.id ? data : e));
    } else {
      const { data, error } = await supabase.from("events").insert({ ...form, date: selected, client: form.client || null, note: form.note || null }).select().single();
      if (!error && data) setEvents(prev => [...prev, data]);
    }
    setSaving(false); setModal(false);
  }

  async function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
    await supabase.from("events").delete().eq("id", id);
  }

  const selectedEvents = events.filter(e => e.date === selected);
  const selectedDate   = new Date(selected + "T12:00:00");

  const CalendarBlock = (
    <div className="ws-card">
      <div className="ws-cal-nav">
        <button className="ws-cal-btn" onClick={() => setCal(new Date(cal.getFullYear(), cal.getMonth()-1, 1))}>←</button>
        <div className="ws-cal-month">{MONTHS[cal.getMonth()]} {cal.getFullYear()}</div>
        <button className="ws-cal-btn" onClick={() => setCal(new Date(cal.getFullYear(), cal.getMonth()+1, 1))}>→</button>
      </div>

      <div className="ws-cal-grid">
        {DAYS_HDR.map(d => <div key={d} className="ws-cal-hdr">{d}</div>)}
        {prevPad.map((d, i) => (
          <div key={`p${i}`} className="ws-cal-day other"><div className="ws-cal-day-num">{d}</div></div>
        ))}
        {currDays.map(d => {
          const ymd    = `${cal.getFullYear()}-${String(cal.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const dayEvs = eventsOn(ymd);
          const isToday = ymd === today;
          const isSel   = ymd === selected;
          return (
            <div key={d} className={`ws-cal-day ${isToday ? "today" : ""}`}
              style={{ cursor: "pointer", background: isSel ? "#e91e8c22" : undefined, borderColor: isSel ? "var(--ws-accent)" : undefined }}
              onClick={() => setSelected(ymd)}
              onDoubleClick={() => openAdd(ymd)}
            >
              <div className="ws-cal-day-num">{d}</div>
              {dayEvs.length > 0 && (
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                  {dayEvs.slice(0, 3).map(ev => (
                    <div key={ev.id} style={{ width: 6, height: 6, borderRadius: "50%", background: TYPE_COLORS[ev.type] }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: ".72rem", color: "var(--ws-text2)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_COLORS[k] }} />{v}
          </div>
        ))}
      </div>
    </div>
  );

  const PanelBlock = (
    <div>
      <div className="ws-card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "Poppins, system-ui, sans-serif", fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.15, letterSpacing: "-0.03em", color: "var(--ws-text)" }}>
              {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <div style={{ fontFamily: "Poppins, system-ui, sans-serif", fontSize: ".78rem", color: "var(--ws-text2)", marginTop: 4 }}>
              {selectedEvents.length} evento{selectedEvents.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button className="ws-btn" style={{ padding: "8px 14px", fontSize: ".75rem" }} onClick={() => openAdd(selected)}>+ Evento</button>
        </div>

        {selectedEvents.length === 0 ? (
          <div style={{ color: "var(--ws-text3)", fontSize: ".82rem", padding: "12px 0", textAlign: "center" }}>
            Nenhum evento.<br/><span style={{ fontSize: ".75rem" }}>{isMobile ? "Toque duas vezes no calendário." : "Duplo clique no calendário para adicionar."}</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {selectedEvents.map(ev => (
              <div key={ev.id}
                onClick={() => ev.source === "google" && setEventDetail(ev)}
                style={{ background: "var(--ws-surface2)", borderRadius: "var(--ws-radius-sm)", padding: "12px 14px", borderLeft: `3px solid ${TYPE_COLORS[ev.type]}`, cursor: ev.source === "google" ? "pointer" : "default", transition: "opacity .15s" }}
                onMouseEnter={e => { if (ev.source === "google") e.currentTarget.style.opacity = ".85"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".87rem", fontWeight: 600, color: "var(--ws-text)", marginBottom: 4 }}>{ev.title}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "Poppins", fontSize: ".55rem", letterSpacing: "1px", textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, background: TYPE_COLORS[ev.type] + "22", color: TYPE_COLORS[ev.type] }}>{TYPE_LABELS[ev.type]}</span>
                      {ev.source === "google" && (
                        <span style={{ fontFamily: "Poppins", fontSize: ".55rem", padding: "2px 7px", borderRadius: 4, background: "#4285f422", color: "#4285f4", fontWeight: 600 }}>🗓 Google</span>
                      )}
                      {ev.time && <span style={{ fontFamily: "Poppins", fontSize: ".65rem", color: "var(--ws-text3)" }}>🕐 {ev.time}{ev.time_end ? ` – ${ev.time_end}` : ""}</span>}
                      {ev.client && ev.client !== "—" && <span style={{ fontSize: ".72rem", color: "var(--ws-text3)" }}>{ev.client}</span>}
                    </div>
                    {ev.meet_link && <div style={{ fontSize: ".72rem", color: "#4285f4", marginTop: 4, fontFamily: "Poppins" }}>📹 Google Meet</div>}
                    {ev.note && !ev.meet_link && <div style={{ fontSize: ".75rem", color: "var(--ws-text3)", marginTop: 6 }}>{ev.note}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {!ev.source && <button onClick={e => { e.stopPropagation(); openEdit(ev); }} style={{ background: "var(--ws-surface3)", border: "none", borderRadius: 6, color: "var(--ws-text2)", cursor: "pointer", padding: "4px 8px", fontSize: ".75rem" }}>✎</button>}
                    {!ev.source && <button onClick={e => { e.stopPropagation(); deleteEvent(ev.id); }} style={{ background: "var(--ws-surface3)", border: "none", borderRadius: 6, color: "var(--ws-accent)", cursor: "pointer", padding: "4px 8px", fontSize: ".75rem" }}>×</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ws-card">
        <div className="ws-card-title" style={{ marginBottom: 12 }}>Próximos eventos</div>
        {events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map(ev => (
          <div key={ev.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--ws-border)", cursor: "pointer" }}
            onClick={() => { setSelected(ev.date); setCal(new Date(ev.date + "T12:00:00")); }}>
            <div style={{ width: 3, height: 32, borderRadius: 2, background: TYPE_COLORS[ev.type], flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".82rem", color: "var(--ws-text)" }}>{ev.title}</div>
              <div style={{ fontFamily: "Poppins", fontSize: ".58rem", color: "var(--ws-accent)", marginTop: 2 }}>
                {new Date(ev.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase()}
              </div>
            </div>
          </div>
        ))}
        {events.filter(e => e.date >= today).length === 0 && <div style={{ color: "var(--ws-text3)", fontSize: ".8rem" }}>Nenhum evento próximo.</div>}
      </div>
    </div>
  );

  return (
    <div className="ws-page">
      <div className="ws-page-title">Agenda<span className="ws-dot">.</span></div>
      <div className="ws-page-sub" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span>Compromissos, prazos e reuniões</span>
        {googleLoading ? (
          <span style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Sincronizando Google...</span>
        ) : googleConnected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: ".72rem", background: "#4285f422", color: "#4285f4", borderRadius: 20, padding: "3px 10px", fontFamily: "Poppins", fontWeight: 600 }}>
              🗓 Google Agenda conectado
            </span>
            <button onClick={disconnectGoogle} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".7rem", fontFamily: "Poppins", textDecoration: "underline" }}>
              desconectar
            </button>
          </div>
        ) : (
          <button onClick={connectGoogle} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#fff", border: "1px solid #dadce0", borderRadius: 20,
            padding: "4px 12px", cursor: "pointer", fontSize: ".72rem", fontWeight: 600,
            color: "#3c4043", fontFamily: "Poppins", boxShadow: "0 1px 3px #0002",
          }}>
            <svg width="14" height="14" viewBox="0 0 48 48"><path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></svg>
            Conectar Google Agenda
          </button>
        )}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 340px",
        gap: 20,
        alignItems: "start",
      }}>
        {CalendarBlock}
        {PanelBlock}
      </div>


      {/* ── Modal detalhe evento Google ── */}
      {eventDetail && (
        <div style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}
          onClick={e => e.target === e.currentTarget && setEventDetail(null)}>
          <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border2)", borderRadius: 20, padding: "32px 36px", width: "100%", maxWidth: 420, boxShadow: "0 30px 80px #00000060" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.1rem", color: "var(--ws-text)", lineHeight: 1.3, marginBottom: 6 }}>{eventDetail.title}</div>
                <span style={{ fontFamily: "Poppins", fontSize: ".6rem", padding: "2px 8px", borderRadius: 4, background: "#4285f422", color: "#4285f4", fontWeight: 600 }}>🗓 Google Agenda</span>
              </div>
              <button onClick={() => setEventDetail(null)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1.2rem", flexShrink: 0 }}>×</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--ws-surface2)", borderRadius: 10, marginBottom: 12 }}>
              <span style={{ fontSize: "1.2rem" }}>📅</span>
              <div>
                <div style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--ws-text)" }}>
                  {new Date(eventDetail.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </div>
                {eventDetail.time && (
                  <div style={{ fontSize: ".75rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>
                    {eventDetail.time}{eventDetail.time_end ? ` – ${eventDetail.time_end}` : ""}
                  </div>
                )}
              </div>
            </div>

            {eventDetail.meet_link && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginBottom: 6, letterSpacing: "1px", textTransform: "uppercase" }}>Link da reunião</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--ws-surface2)", borderRadius: 10, border: "1px solid #4285f433" }}>
                  <span style={{ fontSize: "1.1rem" }}>📹</span>
                  <div style={{ flex: 1, fontSize: ".8rem", color: "#4285f4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eventDetail.meet_link}</div>
                  <button onClick={() => { navigator.clipboard.writeText(eventDetail.meet_link!); }}
                    style={{ background: "#4285f4", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", padding: "5px 10px", fontSize: ".72rem", fontFamily: "Poppins", fontWeight: 600, flexShrink: 0 }}>
                    Copiar
                  </button>
                </div>
                <a href={eventDetail.meet_link} target="_blank" rel="noreferrer"
                  style={{ display: "block", marginTop: 8, textAlign: "center", background: "#4285f4", color: "#fff", borderRadius: 10, padding: "10px 0", fontSize: ".82rem", fontWeight: 700, textDecoration: "none", fontFamily: "Poppins" }}>
                  Entrar na reunião
                </a>
              </div>
            )}

            {eventDetail.attendees && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginBottom: 6, letterSpacing: "1px", textTransform: "uppercase" }}>Participantes</div>
                <div style={{ fontSize: ".8rem", color: "var(--ws-text2)", padding: "10px 14px", background: "var(--ws-surface2)", borderRadius: 10, lineHeight: 1.6 }}>
                  {eventDetail.attendees}
                </div>
              </div>
            )}

            {eventDetail.note && (
              <div>
                <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginBottom: 6, letterSpacing: "1px", textTransform: "uppercase" }}>Observação</div>
                <div style={{ fontSize: ".8rem", color: "var(--ws-text2)", padding: "10px 14px", background: "var(--ws-surface2)", borderRadius: 10, lineHeight: 1.6 }}>
                  {eventDetail.note}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}
          onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border2)", borderRadius: 20, padding: isMobile ? "24px 20px" : "36px 40px", width: "100%", maxWidth: 440, boxShadow: "0 30px 80px #00000060", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: "Poppins, system-ui, sans-serif", fontWeight: 700, fontSize: "1.2rem", letterSpacing: "-0.03em", color: "var(--ws-text)", marginBottom: 24 }}>
              {editing ? "Editar evento" : `Novo evento — ${new Date(selected + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`}
            </div>
            <label className="ws-label">Título</label>
            <input className="ws-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nome do evento..." style={{ marginBottom: 16 }} />
            <label className="ws-label">Tipo</label>
            <select className="ws-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} style={{ marginBottom: 16 }}>
              <option value="reuniao">Reunião</option>
              <option value="prazo">Prazo de entrega</option>
              <option value="pagamento">Pagamento</option>
              <option value="pessoal">Pessoal</option>
            </select>
            <label className="ws-label">Cliente (opcional)</label>
            <select className="ws-input" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} style={{ marginBottom: 16 }}>
              {CLIENTS.map(c => <option key={c} value={c === "—" ? "" : c}>{c}</option>)}
            </select>
            <label className="ws-label">Observação (opcional)</label>
            <input className="ws-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Detalhes..." style={{ marginBottom: 24 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="ws-btn" onClick={saveEvent} disabled={saving} style={{ flex: 1 }}>
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar evento"}
              </button>
              <button className="ws-btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}