// client/src/workspace/components/Cases.tsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";

interface Case {
  id: string;
  name: string;
  description: string;
  status: "ativo" | "pausado" | "encerrado";
  color: string;
  logo_url?: string;
  segment?: string;
  contact?: string;
  since?: string;
  notes?: string;
}

interface Props { profile: Profile; }

const COLORS = ["#e91e8c", "#7b2fff", "#4dabf7", "#00e676", "#ffd600", "#ff6b35", "#00bcd4"];

const EMPTY: Omit<Case, "id"> = {
  name: "", description: "", status: "ativo",
  color: "#e91e8c", logo_url: "", segment: "", contact: "", since: "", notes: "",
};

const STATUS_STYLES: Record<string, string> = {
  ativo:      "ws-cs-ativo",
  pausado:    "ws-cs-and",
  encerrado:  "ws-s-venc",
};

export default function Cases({ profile }: Props) {
  const [cases, setCases]       = useState<Case[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Case | null>(null);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<Case | null>(null);
  const [form, setForm]         = useState<Omit<Case, "id">>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("cases").select("*").order("created_at")
      .then(({ data }) => { setCases(data ?? []); setLoading(false); });
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setModal(true);
  }

  function openEdit(c: Case) {
    setEditing(c);
    setForm({
      name: c.name, description: c.description, status: c.status,
      color: c.color, logo_url: c.logo_url ?? "",
      segment: c.segment ?? "", contact: c.contact ?? "",
      since: c.since ?? "", notes: c.notes ?? "",
    });
    setModal(true);
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `cases/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("assets").getPublicUrl(path);
      setForm(f => ({ ...f, logo_url: data.publicUrl }));
    }
    setUploading(false);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) {
      const { data, error } = await supabase
        .from("cases").update(form).eq("id", editing.id).select().single();
      if (!error && data) {
        setCases(prev => prev.map(c => c.id === editing.id ? data : c));
        if (selected?.id === editing.id) setSelected(data);
      }
    } else {
      const { data, error } = await supabase
        .from("cases").insert(form).select().single();
      if (!error && data) setCases(prev => [...prev, data]);
    }
    setSaving(false);
    setModal(false);
  }

  async function remove(id: string) {
    setCases(prev => prev.filter(c => c.id !== id));
    if (selected?.id === id) setSelected(null);
    await supabase.from("cases").delete().eq("id", id);
  }

  return (
    <div className="ws-page">
      <div className="ws-page-title">Cases<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Clientes ativos e histórico de projetos</div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: 20, alignItems: "start" }}>

        {/* Grid de cards */}
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button className="ws-btn" onClick={openAdd}>+ Novo Case</button>
          </div>

          {loading ? (
            <div style={{ color: "var(--ws-text3)", fontFamily: "DM Mono", fontSize: ".8rem" }}>Carregando...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {cases.map(c => (
                <div
                  key={c.id}
                  className="ws-case"
                  style={{ borderColor: selected?.id === c.id ? c.color : undefined }}
                  onClick={() => setSelected(selected?.id === c.id ? null : c)}
                >
                  {/* Capa */}
                  <div className="ws-case-thumb" style={{
                    background: c.logo_url
                      ? undefined
                      : `linear-gradient(135deg, ${c.color}33, ${c.color}11)`,
                    position: "relative", overflow: "hidden",
                  }}>
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={c.name} style={{
                        width: "100%", height: "100%", objectFit: "cover",
                      }} />
                    ) : (
                      <span style={{ color: c.color, fontSize: "2rem" }}>
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    {/* Barra de cor */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      height: 3, background: c.color,
                    }} />
                  </div>

                  <div className="ws-case-body">
                    <div className="ws-case-name">{c.name}</div>
                    <div className="ws-case-desc">{c.description || "—"}</div>
                    <span className={`ws-case-status ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                  </div>
                </div>
              ))}

              {/* Card de adicionar */}
              <div
                onClick={openAdd}
                style={{
                  background: "transparent", border: "2px dashed var(--ws-border2)",
                  borderRadius: "var(--ws-radius)", minHeight: 180,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 8, cursor: "pointer",
                  color: "var(--ws-text3)", fontSize: ".8rem", transition: "all .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--ws-accent)", e.currentTarget.style.color = "var(--ws-accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--ws-border2)", e.currentTarget.style.color = "var(--ws-text3)")}
              >
                <div style={{ fontSize: "1.6rem" }}>+</div>
                <div style={{ fontFamily: "DM Mono", fontSize: ".62rem", letterSpacing: "1px" }}>NOVO CASE</div>
              </div>
            </div>
          )}
        </div>

        {/* Painel lateral */}
        {selected && (
          <div className="ws-card" style={{ borderColor: selected.color + "44", position: "sticky", top: 0 }}>
            {/* Header */}
            <div style={{
              height: 100, margin: "-20px -22px 20px",
              background: selected.logo_url
                ? undefined
                : `linear-gradient(135deg, ${selected.color}33, ${selected.color}11)`,
              borderRadius: "var(--ws-radius) var(--ws-radius) 0 0",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative", overflow: "hidden",
            }}>
              {selected.logo_url ? (
                <img src={selected.logo_url} alt={selected.name} style={{
                  width: "100%", height: "100%", objectFit: "cover",
                }} />
              ) : (
                <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "2.4rem", color: selected.color }}>
                  {selected.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: selected.color }} />
              {/* Fechar */}
              <button onClick={() => setSelected(null)} style={{
                position: "absolute", top: 10, right: 10,
                background: "#00000060", border: "none", borderRadius: "50%",
                width: 28, height: 28, color: "white", cursor: "pointer", fontSize: "1rem",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.2rem", color: "var(--ws-text)" }}>{selected.name}</div>
                <span className={`ws-case-status ${STATUS_STYLES[selected.status]}`} style={{ marginTop: 6, display: "inline-block" }}>{selected.status}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openEdit(selected)} style={{
                  background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)",
                  borderRadius: 6, color: "var(--ws-text2)", cursor: "pointer", padding: "5px 10px", fontSize: ".75rem",
                }}>✎ Editar</button>
                <button onClick={() => remove(selected.id)} style={{
                  background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)",
                  borderRadius: 6, color: "var(--ws-accent)", cursor: "pointer", padding: "5px 10px", fontSize: ".75rem",
                }}>× Excluir</button>
              </div>
            </div>

            {selected.description && (
              <div style={{ fontSize: ".83rem", color: "var(--ws-text2)", lineHeight: 1.6, marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--ws-border)" }}>
                {selected.description}
              </div>
            )}

            {/* Detalhes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Segmento",  value: selected.segment },
                { label: "Contato",   value: selected.contact },
                { label: "Cliente desde", value: selected.since },
              ].map(row => row.value ? (
                <div key={row.label}>
                  <div style={{ fontFamily: "DM Mono", fontSize: ".55rem", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--ws-text3)", marginBottom: 3 }}>{row.label}</div>
                  <div style={{ fontSize: ".84rem", color: "var(--ws-text)" }}>{row.value}</div>
                </div>
              ) : null)}

              {selected.notes && (
                <div style={{ borderTop: "1px solid var(--ws-border)", paddingTop: 14, marginTop: 2 }}>
                  <div style={{ fontFamily: "DM Mono", fontSize: ".55rem", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--ws-text3)", marginBottom: 6 }}>Observações</div>
                  <div style={{ fontSize: ".82rem", color: "var(--ws-text2)", lineHeight: 1.65 }}>{selected.notes}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "#00000080", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{
            background: "var(--ws-surface)", border: "1px solid var(--ws-border2)",
            borderRadius: 20, padding: "36px 40px", width: 500,
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 30px 80px #00000060",
          }}>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.3rem", color: "var(--ws-text)", marginBottom: 24 }}>
              {editing ? "Editar case" : "Novo case"}
            </div>

            {/* Capa / Logo */}
            <div style={{ marginBottom: 20 }}>
              <label className="ws-label">Logo / Capa</label>
              <div style={{
                height: 90, borderRadius: "var(--ws-radius-sm)", overflow: "hidden",
                background: form.logo_url ? undefined : `linear-gradient(135deg, ${form.color}33, ${form.color}11)`,
                border: "1px dashed var(--ws-border2)", display: "flex",
                alignItems: "center", justifyContent: "center",
                cursor: "pointer", position: "relative", marginBottom: 8,
              }} onClick={() => fileRef.current?.click()}>
                {form.logo_url ? (
                  <img src={form.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ textAlign: "center", color: "var(--ws-text3)", fontSize: ".78rem" }}>
                    {uploading ? "Enviando..." : "Clique para enviar logo"}
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              {form.logo_url && (
                <button onClick={() => setForm(f => ({ ...f, logo_url: "" }))}
                  style={{ fontSize: ".72rem", color: "var(--ws-accent)", background: "none", border: "none", cursor: "pointer" }}>
                  × Remover logo
                </button>
              )}
            </div>

            <label className="ws-label">Nome do cliente</label>
            <input className="ws-input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Carlos Cavalheiro" style={{ marginBottom: 16 }} />

            <label className="ws-label">Descrição</label>
            <input className="ws-input" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Gestão de conteúdo e estratégia" style={{ marginBottom: 16 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label className="ws-label">Status</label>
                <select className="ws-input" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="ativo">Ativo</option>
                  <option value="pausado">Pausado</option>
                  <option value="encerrado">Encerrado</option>
                </select>
              </div>
              <div>
                <label className="ws-label">Segmento</label>
                <input className="ws-input" value={form.segment}
                  onChange={e => setForm(f => ({ ...f, segment: e.target.value }))}
                  placeholder="Ex: F&B, Liderança..." />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label className="ws-label">Contato</label>
                <input className="ws-input" value={form.contact}
                  onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                  placeholder="Nome ou e-mail" />
              </div>
              <div>
                <label className="ws-label">Cliente desde</label>
                <input className="ws-input" value={form.since}
                  onChange={e => setForm(f => ({ ...f, since: e.target.value }))}
                  placeholder="Ex: Jan 2024" />
              </div>
            </div>

            {/* Cor */}
            <label className="ws-label">Cor do case</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                  width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                  border: form.color === c ? "3px solid white" : "3px solid transparent",
                  boxShadow: form.color === c ? `0 0 0 2px ${c}` : "none",
                  transition: "all .15s",
                }} />
              ))}
            </div>

            <label className="ws-label">Observações</label>
            <textarea className="ws-input" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Anotações internas sobre o cliente..."
              style={{ minHeight: 80, resize: "vertical", marginBottom: 24 }} />

            <div style={{ display: "flex", gap: 10 }}>
              <button className="ws-btn" onClick={save} disabled={saving || uploading} style={{ flex: 1 }}>
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar case"}
              </button>
              <button className="ws-btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
