// client/src/workspace/components/Cases.tsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";

/* ─── Types ─────────────────────────────────────────────────── */
interface Case {
  id: string; name: string; description: string;
  status: "ativo" | "pausado" | "encerrado";
  color: string; logo_url?: string; segment?: string;
  contact?: string; since?: string; notes?: string;
}

interface Post {
  id: string; case_id: string; title: string;
  caption: string; hashtags: string; media_url?: string;
  media_type: "image" | "video" | "carousel";
  scheduled_date: string;
  approval_status: "pendente" | "aprovado" | "reprovado" | "alteracao";
  extra_info?: string;
}

interface Payment {
  id: string; case_id: string; description: string;
  amount: number; due_date: string;
  paid: boolean; paid_date?: string;
}

interface Document {
  id: string; case_id: string; name: string;
  file_url: string; doc_type: "contrato" | "nfe" | "outro";
  uploaded_at: string;
}

interface NoteCard {
  id: string; case_id: string; column_id: string;
  content: string; order: number;
}

interface NoteColumn {
  id: string; case_id: string; title: string; order: number;
}

interface Props { profile: Profile; }

/* ─── Constants ─────────────────────────────────────────────── */
const COLORS = ["#e91e8c", "#7b2fff", "#4dabf7", "#00e676", "#ffd600", "#ff6b35", "#00bcd4"];
const EMPTY_CASE: Omit<Case, "id"> = {
  name: "", description: "", status: "ativo",
  color: "#e91e8c", logo_url: "", segment: "", contact: "", since: "", notes: "",
};
const STATUS_STYLES: Record<string, string> = {
  ativo: "ws-cs-ativo", pausado: "ws-cs-and", encerrado: "ws-s-venc",
};
const APPROVAL_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pendente:   { bg: "#2a2a3a", color: "#aaa",     label: "Pendente" },
  aprovado:   { bg: "#00e67622", color: "#00e676", label: "Aprovado" },
  reprovado:  { bg: "#ff443322", color: "#ff4433", label: "Reprovado" },
  alteracao:  { bg: "#ffd60022", color: "#ffd600", label: "Alteração solicitada" },
};
const SUB_TABS = [
  { id: "calendario", label: "Calendário", icon: "📅" },
  { id: "conteudo",   label: "Conteúdo",   icon: "📋" },
  { id: "financeiro", label: "Financeiro", icon: "💰" },
  { id: "contratos",  label: "Contratos",  icon: "📄" },
  { id: "documentos", label: "Documentos", icon: "🗂" },
  { id: "notas",      label: "Notas",      icon: "🗒" },
];

/* ─── Helpers ───────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function Cases({ profile }: Props) {
  const [cases, setCases]         = useState<Case[]>([]);
  const [loading, setLoading]     = useState(true);
  const [openCase, setOpenCase]   = useState<Case | null>(null);
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState<Case | null>(null);
  const [form, setForm]           = useState<Omit<Case, "id">>(EMPTY_CASE);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("cases").select("*").order("created_at")
      .then(({ data }) => { setCases(data ?? []); setLoading(false); });
  }, []);

  function openAdd() { setEditing(null); setForm(EMPTY_CASE); setModal(true); }
  function openEdit(c: Case) {
    setEditing(c);
    setForm({ name:c.name, description:c.description, status:c.status, color:c.color,
      logo_url:c.logo_url??"", segment:c.segment??"", contact:c.contact??"",
      since:c.since??"", notes:c.notes??"" });
    setModal(true);
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
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
      const { data, error } = await supabase.from("cases").update(form).eq("id", editing.id).select().single();
      if (!error && data) {
        setCases(prev => prev.map(c => c.id === editing.id ? data : c));
        if (openCase?.id === editing.id) setOpenCase(data);
      }
    } else {
      const { data, error } = await supabase.from("cases").insert(form).select().single();
      if (!error && data) setCases(prev => [...prev, data]);
    }
    setSaving(false); setModal(false);
  }

  async function remove(id: string) {
    setCases(prev => prev.filter(c => c.id !== id));
    if (openCase?.id === id) setOpenCase(null);
    await supabase.from("cases").delete().eq("id", id);
  }

  /* ── If a case is open → show full workspace ── */
  if (openCase) {
    return (
      <CaseWorkspace
        caseData={openCase}
        onBack={() => setOpenCase(null)}
        onEdit={() => openEdit(openCase)}
        onDelete={() => remove(openCase.id)}
        profile={profile}
      />
    );
  }

  /* ── Cases grid ── */
  return (
    <div className="ws-page">
      <div className="ws-page-title">Cases<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Clientes ativos e histórico de projetos</div>

      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button className="ws-btn" onClick={openAdd}>+ Novo Case</button>
      </div>

      {loading ? (
        <div style={{ color:"var(--ws-text3)", fontFamily:"DM Mono", fontSize:".8rem" }}>Carregando...</div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:16 }}>
          {cases.map(c => (
            <div key={c.id} className="ws-case"
              style={{ cursor:"pointer" }}
              onClick={() => setOpenCase(c)}
            >
              <div className="ws-case-thumb" style={{
                background: c.logo_url ? undefined : `linear-gradient(135deg,${c.color}33,${c.color}11)`,
                position:"relative", overflow:"hidden",
              }}>
                {c.logo_url
                  ? <img src={c.logo_url} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : <span style={{ color:c.color, fontSize:"2rem" }}>{c.name.slice(0,2).toUpperCase()}</span>
                }
                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:c.color }} />
              </div>
              <div className="ws-case-body">
                <div className="ws-case-name">{c.name}</div>
                <div className="ws-case-desc">{c.description||"—"}</div>
                <span className={`ws-case-status ${STATUS_STYLES[c.status]}`}>{c.status}</span>
              </div>
            </div>
          ))}

          {/* Add card */}
          <div onClick={openAdd} style={{
            background:"transparent", border:"2px dashed var(--ws-border2)",
            borderRadius:"var(--ws-radius)", minHeight:180,
            display:"flex", alignItems:"center", justifyContent:"center",
            flexDirection:"column", gap:8, cursor:"pointer",
            color:"var(--ws-text3)", fontSize:".8rem", transition:"all .15s",
          }}
            onMouseEnter={e=>(e.currentTarget.style.borderColor="var(--ws-accent)",e.currentTarget.style.color="var(--ws-accent)")}
            onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--ws-border2)",e.currentTarget.style.color="var(--ws-text3)")}
          >
            <div style={{ fontSize:"1.6rem" }}>+</div>
            <div style={{ fontFamily:"DM Mono", fontSize:".62rem", letterSpacing:"1px" }}>NOVO CASE</div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <CaseModal
          form={form} setForm={setForm} editing={editing}
          saving={saving} uploading={uploading}
          fileRef={fileRef} uploadLogo={uploadLogo}
          onSave={save} onClose={() => setModal(false)}
        />
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
        onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CASE WORKSPACE (full page when a case is open)
═══════════════════════════════════════════════════════════════ */
function CaseWorkspace({ caseData, onBack, onEdit, onDelete, profile }:
  { caseData: Case; onBack: ()=>void; onEdit: ()=>void; onDelete: ()=>void; profile: Profile }) {

  const [activeTab, setActiveTab] = useState("calendario");

  return (
    <div style={{ display:"flex", height:"100%", minHeight:"100vh" }}>
      {/* ── Left sidebar ── */}
      <div style={{
        width:200, flexShrink:0, borderRight:"1px solid var(--ws-border)",
        background:"var(--ws-surface)", display:"flex", flexDirection:"column",
        paddingTop:8,
      }}>
        {/* Back button */}
        <button onClick={onBack} style={{
          display:"flex", alignItems:"center", gap:6,
          background:"none", border:"none", color:"var(--ws-text3)",
          cursor:"pointer", fontSize:".78rem", padding:"8px 16px",
          fontFamily:"DM Mono", letterSpacing:"1px",
          transition:"color .15s",
        }}
          onMouseEnter={e=>e.currentTarget.style.color="var(--ws-text)"}
          onMouseLeave={e=>e.currentTarget.style.color="var(--ws-text3)"}
        >
          ← CASES
        </button>

        {/* Case identity */}
        <div style={{ padding:"12px 16px 16px", borderBottom:"1px solid var(--ws-border)" }}>
          <div style={{
            width:40, height:40, borderRadius:8, overflow:"hidden",
            background: caseData.logo_url ? undefined : `linear-gradient(135deg,${caseData.color}44,${caseData.color}22)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            marginBottom:8, border:`1px solid ${caseData.color}44`,
          }}>
            {caseData.logo_url
              ? <img src={caseData.logo_url} alt={caseData.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <span style={{ color:caseData.color, fontSize:".9rem", fontWeight:800 }}>
                  {caseData.name.slice(0,2).toUpperCase()}
                </span>
            }
          </div>
          <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:".9rem", color:"var(--ws-text)", lineHeight:1.2 }}>
            {caseData.name}
          </div>
          <span className={`ws-case-status ${STATUS_STYLES[caseData.status]}`} style={{ marginTop:4, display:"inline-block" }}>
            {caseData.status}
          </span>
        </div>

        {/* Sub-tabs */}
        <div style={{ flex:1, padding:"8px 0" }}>
          {SUB_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display:"flex", alignItems:"center", gap:8,
              width:"100%", background: activeTab===tab.id ? `${caseData.color}18` : "none",
              border:"none", borderLeft: activeTab===tab.id ? `2px solid ${caseData.color}` : "2px solid transparent",
              color: activeTab===tab.id ? caseData.color : "var(--ws-text2)",
              cursor:"pointer", fontSize:".82rem", padding:"9px 16px",
              textAlign:"left", fontFamily:"inherit", transition:"all .15s",
            }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Edit / Delete */}
        <div style={{ padding:"12px 16px", borderTop:"1px solid var(--ws-border)", display:"flex", flexDirection:"column", gap:6 }}>
          <button onClick={onEdit} style={{
            background:"var(--ws-surface2)", border:"1px solid var(--ws-border2)",
            borderRadius:6, color:"var(--ws-text2)", cursor:"pointer",
            padding:"6px 10px", fontSize:".72rem", fontFamily:"inherit",
          }}>✎ Editar case</button>
          <button onClick={onDelete} style={{
            background:"none", border:"1px solid var(--ws-border2)",
            borderRadius:6, color:"var(--ws-accent)", cursor:"pointer",
            padding:"6px 10px", fontSize:".72rem", fontFamily:"inherit",
          }}>× Excluir case</button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex:1, overflow:"auto", background:"var(--ws-bg)" }}>
        <div style={{ padding:"28px 32px" }}>
          {/* Tab header */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:"1.4rem", color:"var(--ws-text)" }}>
              {SUB_TABS.find(t=>t.id===activeTab)?.icon}{" "}
              {SUB_TABS.find(t=>t.id===activeTab)?.label}
              <span style={{ color:caseData.color }}>.</span>
            </div>
            <div style={{ color:"var(--ws-text3)", fontSize:".8rem", fontFamily:"DM Mono", marginTop:2 }}>
              {caseData.name}
            </div>
          </div>

          {activeTab === "calendario"  && <TabCalendario  caseData={caseData} />}
          {activeTab === "conteudo"    && <TabConteudo    caseData={caseData} />}
          {activeTab === "financeiro"  && <TabFinanceiro  caseData={caseData} />}
          {activeTab === "contratos"   && <TabDocumentos  caseData={caseData} type="contrato" />}
          {activeTab === "documentos"  && <TabDocumentos  caseData={caseData} type="documento" />}
          {activeTab === "notas"       && <TabNotas       caseData={caseData} />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: CALENDÁRIO
═══════════════════════════════════════════════════════════════ */
function TabCalendario({ caseData }: { caseData: Case }) {
  const [posts, setPosts]     = useState<Post[]>([]);
  const [month, setMonth]     = useState(new Date().getMonth());
  const [year, setYear]       = useState(new Date().getFullYear());
  const [selected, setSelected] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("posts").select("*").eq("case_id", caseData.id)
      .then(({ data }) => { setPosts(data ?? []); setLoading(false); });
  }, [caseData.id]);

  async function updateApproval(post: Post, status: Post["approval_status"]) {
    const { data } = await supabase.from("posts").update({ approval_status: status }).eq("id", post.id).select().single();
    if (data) {
      setPosts(prev => prev.map(p => p.id === post.id ? data : p));
      setSelected(data);
    }
  }

  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const cells       = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );
  const postsForDay = (day: number) => posts.filter(p => {
    const d = new Date(p.scheduled_date);
    return d.getFullYear()===year && d.getMonth()===month && d.getDate()===day;
  });

  return (
    <div>
      {/* Month nav */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={()=>{ if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1); }}
          style={navBtnStyle}>‹</button>
        <span style={{ fontFamily:"Syne", fontWeight:700, fontSize:"1rem", color:"var(--ws-text)", minWidth:140, textAlign:"center" }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={()=>{ if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1); }}
          style={navBtnStyle}>›</button>
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:24 }}>
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
          <div key={d} style={{ textAlign:"center", fontFamily:"DM Mono", fontSize:".6rem",
            color:"var(--ws-text3)", padding:"6px 0", letterSpacing:"1px" }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          const dayPosts = day ? postsForDay(day) : [];
          return (
            <div key={i} style={{
              minHeight:72, background:"var(--ws-surface)", borderRadius:6,
              border:"1px solid var(--ws-border)", padding:"4px 5px",
              opacity: day ? 1 : 0,
            }}>
              {day && <>
                <div style={{ fontSize:".7rem", color:"var(--ws-text3)", marginBottom:3, fontFamily:"DM Mono" }}>{day}</div>
                {dayPosts.map(p => (
                  <div key={p.id} onClick={() => setSelected(p)} style={{
                    background: `${caseData.color}22`, border:`1px solid ${caseData.color}44`,
                    borderRadius:4, padding:"2px 5px", fontSize:".62rem",
                    color:caseData.color, cursor:"pointer", marginBottom:2,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                    borderLeft:`3px solid ${APPROVAL_STYLES[p.approval_status]?.color||caseData.color}`,
                  }}>{p.title||"Post"}</div>
                ))}
              </>}
            </div>
          );
        })}
      </div>

      {/* Post detail modal */}
      {selected && (
        <div style={{
          position:"fixed", inset:0, background:"#00000090", zIndex:200,
          display:"flex", alignItems:"center", justifyContent:"center",
        }} onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div style={{
            background:"var(--ws-surface)", borderRadius:16, width:520,
            maxHeight:"85vh", overflowY:"auto", padding:32,
            border:"1px solid var(--ws-border2)", boxShadow:"0 30px 80px #00000060",
          }}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
              <div>
                <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:"1.1rem", color:"var(--ws-text)" }}>
                  {selected.title||"Post"}
                </div>
                <div style={{ fontSize:".75rem", color:"var(--ws-text3)", fontFamily:"DM Mono", marginTop:3 }}>
                  {new Date(selected.scheduled_date).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}
                </div>
              </div>
              <button onClick={()=>setSelected(null)} style={closeBtnStyle}>×</button>
            </div>

            {/* Media */}
            {selected.media_url && (
              <div style={{ borderRadius:10, overflow:"hidden", marginBottom:18, background:"#000" }}>
                {selected.media_type==="video"
                  ? <video src={selected.media_url} controls style={{ width:"100%", maxHeight:280, objectFit:"contain" }} />
                  : <img src={selected.media_url} alt="" style={{ width:"100%", maxHeight:280, objectFit:"cover" }} />
                }
              </div>
            )}

            {/* Caption */}
            <div style={{ marginBottom:14 }}>
              <div style={labelStyle}>Legenda</div>
              <div style={{ fontSize:".84rem", color:"var(--ws-text)", lineHeight:1.7,
                background:"var(--ws-surface2)", borderRadius:8, padding:"10px 14px" }}>
                {selected.caption||"—"}
              </div>
            </div>

            {/* Hashtags */}
            {selected.hashtags && (
              <div style={{ marginBottom:14 }}>
                <div style={labelStyle}>Hashtags</div>
                <div style={{ fontSize:".8rem", color:caseData.color, lineHeight:1.7,
                  background:`${caseData.color}11`, borderRadius:8, padding:"8px 14px",
                  wordBreak:"break-word" }}>
                  {selected.hashtags}
                </div>
              </div>
            )}

            {/* Extra info */}
            {selected.extra_info && (
              <div style={{ marginBottom:18 }}>
                <div style={labelStyle}>Informações extras</div>
                <div style={{ fontSize:".82rem", color:"var(--ws-text2)", lineHeight:1.65 }}>{selected.extra_info}</div>
              </div>
            )}

            {/* Approval status */}
            <div style={{ marginBottom:18 }}>
              <div style={labelStyle}>Status de aprovação</div>
              <div style={{
                display:"inline-flex", alignItems:"center", gap:6,
                background:APPROVAL_STYLES[selected.approval_status].bg,
                color:APPROVAL_STYLES[selected.approval_status].color,
                borderRadius:20, padding:"4px 12px", fontSize:".78rem", fontWeight:600,
              }}>
                {selected.approval_status==="aprovado"  ? "✓" :
                 selected.approval_status==="reprovado" ? "✕" :
                 selected.approval_status==="alteracao" ? "⚠" : "◷"}
                {APPROVAL_STYLES[selected.approval_status].label}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={()=>updateApproval(selected,"aprovado")} style={{
                flex:1, padding:"9px 0", borderRadius:8, border:"none",
                background:"#00e67622", color:"#00e676",
                cursor:"pointer", fontFamily:"inherit", fontSize:".82rem", fontWeight:600,
              }}>✓ Aprovar</button>
              <button onClick={()=>updateApproval(selected,"reprovado")} style={{
                flex:1, padding:"9px 0", borderRadius:8, border:"none",
                background:"#ff443322", color:"#ff4433",
                cursor:"pointer", fontFamily:"inherit", fontSize:".82rem", fontWeight:600,
              }}>✕ Reprovar</button>
              <button onClick={()=>updateApproval(selected,"alteracao")} style={{
                flex:1, padding:"9px 0", borderRadius:8, border:"none",
                background:"#ffd60022", color:"#ffd600",
                cursor:"pointer", fontFamily:"inherit", fontSize:".82rem", fontWeight:600,
              }}>⚠ Solicitar alteração</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: CONTEÚDO
═══════════════════════════════════════════════════════════════ */
function TabConteudo({ caseData }: { caseData: Case }) {
  const [posts, setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState<Omit<Post,"id"|"case_id">>({
    title:"", caption:"", hashtags:"", media_url:"",
    media_type:"image", scheduled_date:"", approval_status:"pendente", extra_info:"",
  });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("posts").select("*").eq("case_id", caseData.id).order("scheduled_date")
      .then(({ data }) => { setPosts(data??[]); setLoading(false); });
  }, [caseData.id]);

  async function uploadMedia(file: File) {
    setUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `posts/${caseData.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert:true });
    if (!error) {
      const { data } = supabase.storage.from("assets").getPublicUrl(path);
      const isVideo = file.type.startsWith("video");
      setForm(f => ({ ...f, media_url:data.publicUrl, media_type: isVideo?"video":"image" }));
    }
    setUploading(false);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("posts")
      .insert({ ...form, case_id: caseData.id }).select().single();
    if (!error && data) setPosts(prev => [...prev, data]);
    setSaving(false); setModal(false);
    setForm({ title:"", caption:"", hashtags:"", media_url:"", media_type:"image",
      scheduled_date:"", approval_status:"pendente", extra_info:"" });
  }

  async function removePost(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id));
    await supabase.from("posts").delete().eq("id", id);
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button className="ws-btn" onClick={() => setModal(true)}>+ Novo post</button>
      </div>

      {loading ? <Loader /> : posts.length === 0 ? (
        <Empty label="Nenhum post cadastrado ainda." />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {posts.map(p => {
            const ap = APPROVAL_STYLES[p.approval_status];
            return (
              <div key={p.id} style={{
                background:"var(--ws-surface)", border:"1px solid var(--ws-border)",
                borderLeft:`3px solid ${ap.color}`, borderRadius:10,
                padding:"14px 18px", display:"flex", alignItems:"center", gap:16,
              }}>
                {/* Thumb */}
                <div style={{
                  width:52, height:52, borderRadius:8, overflow:"hidden",
                  background:"var(--ws-surface2)", flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  {p.media_url
                    ? p.media_type==="video"
                      ? <video src={p.media_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <img src={p.media_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <span style={{ fontSize:"1.4rem" }}>
                        {p.media_type==="video"?"🎬":p.media_type==="carousel"?"🎠":"🖼"}
                      </span>
                  }
                </div>

                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:".88rem", color:"var(--ws-text)" }}>{p.title}</div>
                  <div style={{ fontSize:".77rem", color:"var(--ws-text3)", marginTop:3, fontFamily:"DM Mono" }}>
                    {p.scheduled_date
                      ? new Date(p.scheduled_date).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})
                      : "Sem data"
                    }
                  </div>
                </div>

                <div style={{
                  background:ap.bg, color:ap.color,
                  borderRadius:20, padding:"3px 10px", fontSize:".72rem", fontWeight:600,
                }}>
                  {ap.label}
                </div>

                <button onClick={()=>removePost(p.id)} style={{
                  background:"none", border:"none", color:"var(--ws-text3)",
                  cursor:"pointer", fontSize:"1rem", padding:"0 4px",
                }}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal novo post */}
      {modal && (
        <div style={overlayStyle} onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div style={modalBoxStyle}>
            <div style={modalTitleStyle}>Novo post</div>

            <label className="ws-label">Mídia</label>
            <div style={{
              height:100, borderRadius:10, border:"1px dashed var(--ws-border2)",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", marginBottom:8, background:"var(--ws-surface2)",
              overflow:"hidden",
            }} onClick={() => fileRef.current?.click()}>
              {form.media_url
                ? form.media_type==="video"
                  ? <video src={form.media_url} style={{ height:"100%", objectFit:"contain" }} />
                  : <img src={form.media_url} alt="" style={{ height:"100%", objectFit:"contain" }} />
                : <div style={{ color:"var(--ws-text3)", fontSize:".8rem" }}>
                    {uploading ? "Enviando..." : "Clique para enviar foto ou vídeo"}
                  </div>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display:"none" }}
              onChange={e=>e.target.files?.[0]&&uploadMedia(e.target.files[0])} />

            <label className="ws-label" style={{ marginTop:12 }}>Título</label>
            <input className="ws-input" value={form.title} placeholder="Ex: Post de segunda-feira"
              onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={{ marginBottom:12 }} />

            <label className="ws-label">Legenda</label>
            <textarea className="ws-input" value={form.caption} placeholder="Texto do post..."
              onChange={e=>setForm(f=>({...f,caption:e.target.value}))}
              style={{ minHeight:80, resize:"vertical", marginBottom:12 }} />

            <label className="ws-label">Hashtags</label>
            <input className="ws-input" value={form.hashtags} placeholder="#marca #instagram..."
              onChange={e=>setForm(f=>({...f,hashtags:e.target.value}))} style={{ marginBottom:12 }} />

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label className="ws-label">Data agendada</label>
                <input className="ws-input" type="date" value={form.scheduled_date}
                  onChange={e=>setForm(f=>({...f,scheduled_date:e.target.value}))} />
              </div>
              <div>
                <label className="ws-label">Tipo</label>
                <select className="ws-input" value={form.media_type}
                  onChange={e=>setForm(f=>({...f,media_type:e.target.value as any}))}>
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                  <option value="carousel">Carrossel</option>
                </select>
              </div>
            </div>

            <label className="ws-label">Informações extras</label>
            <textarea className="ws-input" value={form.extra_info}
              placeholder="Notas sobre o post, briefing, referências..."
              onChange={e=>setForm(f=>({...f,extra_info:e.target.value}))}
              style={{ minHeight:60, resize:"vertical", marginBottom:20 }} />

            <div style={{ display:"flex", gap:10 }}>
              <button className="ws-btn" onClick={save} disabled={saving||uploading} style={{ flex:1 }}>
                {saving?"Salvando...":"Salvar post"}
              </button>
              <button className="ws-btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: FINANCEIRO
═══════════════════════════════════════════════════════════════ */
function TabFinanceiro({ caseData }: { caseData: Case }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ description:"", amount:"", due_date:"", paid:false, paid_date:"" });
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    supabase.from("payments").select("*").eq("case_id", caseData.id).order("due_date")
      .then(({ data }) => { setPayments(data??[]); setLoading(false); });
  }, [caseData.id]);

  async function save() {
    if (!form.description.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("payments").insert({
      case_id: caseData.id, description: form.description,
      amount: parseFloat(form.amount)||0, due_date: form.due_date,
      paid: form.paid, paid_date: form.paid_date||null,
    }).select().single();
    if (data) setPayments(prev => [...prev, data]);
    setSaving(false); setModal(false);
    setForm({ description:"", amount:"", due_date:"", paid:false, paid_date:"" });
  }

  async function togglePaid(p: Payment) {
    const { data } = await supabase.from("payments")
      .update({ paid: !p.paid, paid_date: !p.paid ? new Date().toISOString().split("T")[0] : null })
      .eq("id", p.id).select().single();
    if (data) setPayments(prev => prev.map(x => x.id===p.id ? data : x));
  }

  async function removePayment(id: string) {
    setPayments(prev => prev.filter(p => p.id !== id));
    await supabase.from("payments").delete().eq("id", id);
  }

  const paid    = payments.filter(p => p.paid);
  const pending = payments.filter(p => !p.paid);
  const totalPaid    = paid.reduce((s,p) => s+p.amount, 0);
  const totalPending = pending.reduce((s,p) => s+p.amount, 0);

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
        <div style={{ background:"#00e67612", border:"1px solid #00e67630", borderRadius:12, padding:"16px 20px" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:".6rem", letterSpacing:"1.5px", color:"#00e676", marginBottom:6 }}>RECEBIDO</div>
          <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:"1.3rem", color:"#00e676" }}>{fmt(totalPaid)}</div>
        </div>
        <div style={{ background:"#ffd60012", border:"1px solid #ffd60030", borderRadius:12, padding:"16px 20px" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:".6rem", letterSpacing:"1.5px", color:"#ffd600", marginBottom:6 }}>A VENCER</div>
          <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:"1.3rem", color:"#ffd600" }}>{fmt(totalPending)}</div>
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button className="ws-btn" onClick={() => setModal(true)}>+ Novo pagamento</button>
      </div>

      {loading ? <Loader /> : payments.length===0 ? <Empty label="Nenhum pagamento cadastrado." /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {/* Pending first */}
          {pending.length>0 && (
            <>
              <div style={{ fontFamily:"DM Mono", fontSize:".6rem", letterSpacing:"1.5px", color:"var(--ws-text3)", marginBottom:4 }}>A VENCER</div>
              {pending.map(p => <PaymentRow key={p.id} p={p} onToggle={togglePaid} onRemove={removePayment} />)}
            </>
          )}
          {paid.length>0 && (
            <>
              <div style={{ fontFamily:"DM Mono", fontSize:".6rem", letterSpacing:"1.5px", color:"var(--ws-text3)", marginTop:12, marginBottom:4 }}>PAGOS</div>
              {paid.map(p => <PaymentRow key={p.id} p={p} onToggle={togglePaid} onRemove={removePayment} />)}
            </>
          )}
        </div>
      )}

      {modal && (
        <div style={overlayStyle} onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div style={modalBoxStyle}>
            <div style={modalTitleStyle}>Novo pagamento</div>
            <label className="ws-label">Descrição</label>
            <input className="ws-input" value={form.description} placeholder="Ex: Mensalidade março"
              onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{ marginBottom:12 }} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label className="ws-label">Valor (R$)</label>
                <input className="ws-input" type="number" value={form.amount} placeholder="0,00"
                  onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
              </div>
              <div>
                <label className="ws-label">Vencimento</label>
                <input className="ws-input" type="date" value={form.due_date}
                  onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} />
              </div>
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:20 }}>
              <input type="checkbox" checked={form.paid} onChange={e=>setForm(f=>({...f,paid:e.target.checked}))} />
              <span style={{ fontSize:".83rem", color:"var(--ws-text2)" }}>Já pago</span>
            </label>
            {form.paid && (
              <>
                <label className="ws-label">Data de pagamento</label>
                <input className="ws-input" type="date" value={form.paid_date}
                  onChange={e=>setForm(f=>({...f,paid_date:e.target.value}))} style={{ marginBottom:16 }} />
              </>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button className="ws-btn" onClick={save} disabled={saving} style={{ flex:1 }}>
                {saving?"Salvando...":"Salvar"}
              </button>
              <button className="ws-btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentRow({ p, onToggle, onRemove }:
  { p: Payment; onToggle:(p:Payment)=>void; onRemove:(id:string)=>void }) {
  const overdue = !p.paid && p.due_date && new Date(p.due_date) < new Date();
  return (
    <div style={{
      background:"var(--ws-surface)", border:`1px solid ${p.paid?"#00e67630":overdue?"#ff443330":"var(--ws-border)"}`,
      borderLeft:`3px solid ${p.paid?"#00e676":overdue?"#ff4433":"#ffd600"}`,
      borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:12,
      opacity: p.paid ? 0.7 : 1,
    }}>
      <input type="checkbox" checked={p.paid} onChange={()=>onToggle(p)}
        style={{ width:16, height:16, cursor:"pointer", accentColor:"#00e676" }} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:".87rem", color:"var(--ws-text)", fontWeight:600,
          textDecoration:p.paid?"line-through":"none" }}>{p.description}</div>
        <div style={{ fontSize:".72rem", color:"var(--ws-text3)", fontFamily:"DM Mono", marginTop:2 }}>
          {p.paid && p.paid_date
            ? `Pago em ${new Date(p.paid_date).toLocaleDateString("pt-BR")}`
            : p.due_date
              ? `Vence ${new Date(p.due_date).toLocaleDateString("pt-BR")}${overdue?" · VENCIDO":""}`
              : "Sem data"
          }
        </div>
      </div>
      <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:".95rem",
        color: p.paid?"#00e676":overdue?"#ff4433":"#ffd600" }}>
        {fmt(p.amount)}
      </div>
      <button onClick={()=>onRemove(p.id)} style={{
        background:"none", border:"none", color:"var(--ws-text3)",
        cursor:"pointer", fontSize:"1rem",
      }}>×</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: DOCUMENTOS / CONTRATOS
═══════════════════════════════════════════════════════════════ */
function TabDocumentos({ caseData, type }: { caseData: Case; type: "contrato"|"documento" }) {
  const [docs, setDocs]         = useState<Document[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const docType = type === "contrato" ? "contrato" : "outro";

  useEffect(() => {
    supabase.from("documents").select("*").eq("case_id", caseData.id).eq("doc_type", docType)
      .then(({ data }) => { setDocs(data??[]); setLoading(false); });
  }, [caseData.id, docType]);

  async function upload(file: File) {
    setUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `docs/${caseData.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert:true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
      const { data } = await supabase.from("documents").insert({
        case_id: caseData.id, name: file.name,
        file_url: urlData.publicUrl, doc_type: docType,
        uploaded_at: new Date().toISOString(),
      }).select().single();
      if (data) setDocs(prev => [...prev, data]);
    }
    setUploading(false);
  }

  async function removeDoc(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id));
    await supabase.from("documents").delete().eq("id", id);
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button className="ws-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Enviando..." : `+ Enviar ${type==="contrato"?"contrato":"documento"}`}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          style={{ display:"none" }} onChange={e=>e.target.files?.[0]&&upload(e.target.files[0])} />
      </div>

      {loading ? <Loader /> : docs.length===0 ? (
        <Empty label={`Nenhum ${type==="contrato"?"contrato":"documento"} enviado ainda.`} />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {docs.map(d => (
            <div key={d.id} style={{
              background:"var(--ws-surface)", border:"1px solid var(--ws-border)",
              borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14,
            }}>
              <div style={{ fontSize:"1.8rem" }}>
                {d.name.endsWith(".pdf") ? "📄" : d.name.match(/\.(png|jpg|jpeg)$/) ? "🖼" : "📃"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:".87rem", color:"var(--ws-text)" }}>{d.name}</div>
                <div style={{ fontSize:".72rem", color:"var(--ws-text3)", fontFamily:"DM Mono", marginTop:2 }}>
                  {new Date(d.uploaded_at).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}
                </div>
              </div>
              <a href={d.file_url} target="_blank" rel="noreferrer" style={{
                background:"var(--ws-surface2)", border:"1px solid var(--ws-border2)",
                borderRadius:6, color:"var(--ws-text2)", padding:"5px 12px",
                fontSize:".75rem", textDecoration:"none",
              }}>Abrir</a>
              <button onClick={()=>removeDoc(d.id)} style={{
                background:"none", border:"none", color:"var(--ws-text3)",
                cursor:"pointer", fontSize:"1rem",
              }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: NOTAS (Trello-style)
═══════════════════════════════════════════════════════════════ */
function TabNotas({ caseData }: { caseData: Case }) {
  const [columns, setColumns]  = useState<NoteColumn[]>([]);
  const [cards, setCards]      = useState<NoteCard[]>([]);
  const [loading, setLoading]  = useState(true);
  const [newColTitle, setNewColTitle] = useState("");
  const [addingCol, setAddingCol]     = useState(false);
  const [addingCard, setAddingCard]   = useState<string|null>(null); // column_id
  const [newCardText, setNewCardText] = useState("");
  const [editCard, setEditCard]       = useState<NoteCard|null>(null);
  const [editText, setEditText]       = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("note_columns").select("*").eq("case_id", caseData.id).order("order"),
      supabase.from("note_cards").select("*").eq("case_id", caseData.id).order("order"),
    ]).then(([c,k]) => {
      setColumns(c.data??[]);
      setCards(k.data??[]);
      setLoading(false);
    });
  }, [caseData.id]);

  async function addColumn() {
    if (!newColTitle.trim()) return;
    const { data } = await supabase.from("note_columns").insert({
      case_id: caseData.id, title: newColTitle, order: columns.length,
    }).select().single();
    if (data) setColumns(prev => [...prev, data]);
    setNewColTitle(""); setAddingCol(false);
  }

  async function removeColumn(id: string) {
    setColumns(prev => prev.filter(c => c.id !== id));
    setCards(prev => prev.filter(c => c.column_id !== id));
    await supabase.from("note_columns").delete().eq("id", id);
  }

  async function addCard(colId: string) {
    if (!newCardText.trim()) return;
    const colCards = cards.filter(c => c.column_id === colId);
    const { data } = await supabase.from("note_cards").insert({
      case_id: caseData.id, column_id: colId,
      content: newCardText, order: colCards.length,
    }).select().single();
    if (data) setCards(prev => [...prev, data]);
    setNewCardText(""); setAddingCard(null);
  }

  async function saveCardEdit() {
    if (!editCard) return;
    const { data } = await supabase.from("note_cards")
      .update({ content: editText }).eq("id", editCard.id).select().single();
    if (data) setCards(prev => prev.map(c => c.id===editCard.id ? data : c));
    setEditCard(null);
  }

  async function removeCard(id: string) {
    setCards(prev => prev.filter(c => c.id !== id));
    await supabase.from("note_cards").delete().eq("id", id);
  }

  if (loading) return <Loader />;

  return (
    <div style={{ display:"flex", gap:16, overflowX:"auto", paddingBottom:16, alignItems:"flex-start" }}>
      {columns.map(col => {
        const colCards = cards.filter(c => c.column_id === col.id);
        return (
          <div key={col.id} style={{
            background:"var(--ws-surface)", border:"1px solid var(--ws-border)",
            borderRadius:12, padding:"12px 12px 8px", width:260, flexShrink:0,
          }}>
            {/* Column header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:".88rem", color:"var(--ws-text)" }}>
                {col.title}
              </div>
              <button onClick={()=>removeColumn(col.id)} style={{
                background:"none", border:"none", color:"var(--ws-text3)",
                cursor:"pointer", fontSize:".9rem", lineHeight:1,
              }}>×</button>
            </div>

            {/* Cards */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {colCards.map(card => (
                <div key={card.id} style={{
                  background:"var(--ws-surface2)", border:"1px solid var(--ws-border)",
                  borderRadius:8, padding:"10px 12px", fontSize:".82rem",
                  color:"var(--ws-text)", lineHeight:1.55, cursor:"pointer",
                  transition:"border-color .15s",
                }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=caseData.color}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--ws-border)"}
                  onClick={()=>{ setEditCard(card); setEditText(card.content); }}
                >
                  {card.content}
                </div>
              ))}
            </div>

            {/* Add card */}
            {addingCard === col.id ? (
              <div style={{ marginTop:8 }}>
                <textarea
                  value={newCardText}
                  onChange={e=>setNewCardText(e.target.value)}
                  placeholder="Escreva o cartão..."
                  autoFocus
                  style={{
                    width:"100%", background:"var(--ws-surface2)",
                    border:`1px solid ${caseData.color}`, borderRadius:8,
                    color:"var(--ws-text)", padding:"8px 10px", fontSize:".82rem",
                    resize:"vertical", minHeight:72, fontFamily:"inherit",
                    boxSizing:"border-box",
                  }}
                  onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addCard(col.id);} }}
                />
                <div style={{ display:"flex", gap:6, marginTop:6 }}>
                  <button onClick={()=>addCard(col.id)} style={{
                    background:caseData.color, border:"none", borderRadius:6,
                    color:"#fff", padding:"5px 12px", fontSize:".78rem",
                    cursor:"pointer", fontFamily:"inherit",
                  }}>Adicionar</button>
                  <button onClick={()=>{setAddingCard(null);setNewCardText("");}} style={{
                    background:"none", border:"none", color:"var(--ws-text3)",
                    cursor:"pointer", fontSize:".78rem",
                  }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>{setAddingCard(col.id);setNewCardText("");}} style={{
                background:"none", border:"none", color:"var(--ws-text3)",
                cursor:"pointer", width:"100%", textAlign:"left",
                fontSize:".78rem", padding:"8px 4px", marginTop:4,
                fontFamily:"inherit", display:"flex", alignItems:"center", gap:4,
              }}
                onMouseEnter={e=>e.currentTarget.style.color="var(--ws-text)"}
                onMouseLeave={e=>e.currentTarget.style.color="var(--ws-text3)"}
              >
                + Adicionar um cartão
              </button>
            )}
          </div>
        );
      })}

      {/* Add column */}
      <div style={{ width:240, flexShrink:0 }}>
        {addingCol ? (
          <div style={{
            background:"var(--ws-surface)", border:"1px solid var(--ws-border)",
            borderRadius:12, padding:12,
          }}>
            <input
              value={newColTitle}
              onChange={e=>setNewColTitle(e.target.value)}
              placeholder="Título da lista"
              autoFocus
              className="ws-input"
              style={{ marginBottom:8 }}
              onKeyDown={e=>e.key==="Enter"&&addColumn()}
            />
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={addColumn} style={{
                background:caseData.color, border:"none", borderRadius:6,
                color:"#fff", padding:"5px 12px", fontSize:".78rem",
                cursor:"pointer", fontFamily:"inherit",
              }}>Adicionar lista</button>
              <button onClick={()=>{setAddingCol(false);setNewColTitle("");}} style={{
                background:"none", border:"none", color:"var(--ws-text3)",
                cursor:"pointer", fontSize:".78rem",
              }}>×</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setAddingCol(true)} style={{
            background:"var(--ws-surface)", border:"1px dashed var(--ws-border2)",
            borderRadius:12, padding:"12px 16px", width:"100%",
            color:"var(--ws-text3)", cursor:"pointer", fontFamily:"inherit",
            fontSize:".82rem", display:"flex", alignItems:"center", gap:6,
            transition:"all .15s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=caseData.color;e.currentTarget.style.color=caseData.color;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--ws-border2)";e.currentTarget.style.color="var(--ws-text3)";}}
          >
            + Adicionar outra lista
          </button>
        )}
      </div>

      {/* Edit card modal */}
      {editCard && (
        <div style={overlayStyle} onClick={e=>e.target===e.currentTarget&&setEditCard(null)}>
          <div style={{ ...modalBoxStyle, width:420 }}>
            <div style={modalTitleStyle}>Editar cartão</div>
            <textarea
              value={editText}
              onChange={e=>setEditText(e.target.value)}
              autoFocus
              className="ws-input"
              style={{ minHeight:120, resize:"vertical", marginBottom:16 }}
            />
            <div style={{ display:"flex", gap:10 }}>
              <button className="ws-btn" onClick={saveCardEdit} style={{ flex:1 }}>Salvar</button>
              <button className="ws-btn-ghost" onClick={()=>removeCard(editCard.id)} style={{ color:"var(--ws-accent)" }}>
                Excluir
              </button>
              <button className="ws-btn-ghost" onClick={()=>setEditCard(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CASE MODAL (create / edit)
═══════════════════════════════════════════════════════════════ */
function CaseModal({ form, setForm, editing, saving, uploading, fileRef, uploadLogo, onSave, onClose }: any) {
  return (
    <div style={overlayStyle} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ ...modalBoxStyle, width:500 }}>
        <div style={modalTitleStyle}>{editing?"Editar case":"Novo case"}</div>

        <label className="ws-label">Logo / Capa</label>
        <div style={{
          height:90, borderRadius:10, overflow:"hidden",
          background: form.logo_url ? undefined : `linear-gradient(135deg,${form.color}33,${form.color}11)`,
          border:"1px dashed var(--ws-border2)", display:"flex",
          alignItems:"center", justifyContent:"center",
          cursor:"pointer", position:"relative", marginBottom:8,
        }} onClick={() => fileRef.current?.click()}>
          {form.logo_url
            ? <img src={form.logo_url} alt="logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <div style={{ textAlign:"center", color:"var(--ws-text3)", fontSize:".78rem" }}>
                {uploading?"Enviando...":"Clique para enviar logo"}
              </div>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
          onChange={e=>e.target.files?.[0]&&uploadLogo(e.target.files[0])} />
        {form.logo_url && (
          <button onClick={()=>setForm((f:any)=>({...f,logo_url:""}))}
            style={{ fontSize:".72rem", color:"var(--ws-accent)", background:"none", border:"none", cursor:"pointer", marginBottom:8 }}>
            × Remover logo
          </button>
        )}

        <label className="ws-label">Nome do cliente</label>
        <input className="ws-input" value={form.name}
          onChange={e=>setForm((f:any)=>({...f,name:e.target.value}))}
          placeholder="Ex: Carlos Cavalheiro" style={{ marginBottom:12 }} />

        <label className="ws-label">Descrição</label>
        <input className="ws-input" value={form.description}
          onChange={e=>setForm((f:any)=>({...f,description:e.target.value}))}
          placeholder="Ex: Gestão de conteúdo e estratégia" style={{ marginBottom:12 }} />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <label className="ws-label">Status</label>
            <select className="ws-input" value={form.status}
              onChange={e=>setForm((f:any)=>({...f,status:e.target.value}))}>
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </div>
          <div>
            <label className="ws-label">Segmento</label>
            <input className="ws-input" value={form.segment}
              onChange={e=>setForm((f:any)=>({...f,segment:e.target.value}))}
              placeholder="Ex: F&B, Liderança..." />
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <label className="ws-label">Contato</label>
            <input className="ws-input" value={form.contact}
              onChange={e=>setForm((f:any)=>({...f,contact:e.target.value}))}
              placeholder="Nome ou e-mail" />
          </div>
          <div>
            <label className="ws-label">Cliente desde</label>
            <input className="ws-input" value={form.since}
              onChange={e=>setForm((f:any)=>({...f,since:e.target.value}))}
              placeholder="Ex: Jan 2024" />
          </div>
        </div>

        <label className="ws-label">Cor do case</label>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          {COLORS.map(c => (
            <div key={c} onClick={()=>setForm((f:any)=>({...f,color:c}))} style={{
              width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer",
              border: form.color===c ? "3px solid white" : "3px solid transparent",
              boxShadow: form.color===c ? `0 0 0 2px ${c}` : "none",
              transition:"all .15s",
            }} />
          ))}
        </div>

        <label className="ws-label">Observações</label>
        <textarea className="ws-input" value={form.notes}
          onChange={e=>setForm((f:any)=>({...f,notes:e.target.value}))}
          placeholder="Anotações internas..."
          style={{ minHeight:70, resize:"vertical", marginBottom:20 }} />

        <div style={{ display:"flex", gap:10 }}>
          <button className="ws-btn" onClick={onSave} disabled={saving||uploading} style={{ flex:1 }}>
            {saving?"Salvando...":editing?"Salvar alterações":"Criar case"}
          </button>
          <button className="ws-btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared micro-components ─────────────────────────────── */
const Loader = () => (
  <div style={{ color:"var(--ws-text3)", fontFamily:"DM Mono", fontSize:".8rem" }}>Carregando...</div>
);
const Empty = ({ label }: { label: string }) => (
  <div style={{
    textAlign:"center", color:"var(--ws-text3)", fontFamily:"DM Mono",
    fontSize:".75rem", padding:"48px 0",
  }}>{label}</div>
);

/* ─── Shared styles ───────────────────────────────────────── */
const overlayStyle: React.CSSProperties = {
  position:"fixed", inset:0, background:"#00000085", zIndex:200,
  display:"flex", alignItems:"center", justifyContent:"center",
};
const modalBoxStyle: React.CSSProperties = {
  background:"var(--ws-surface)", border:"1px solid var(--ws-border2)",
  borderRadius:20, padding:"32px 36px", width:500,
  maxHeight:"90vh", overflowY:"auto",
  boxShadow:"0 30px 80px #00000060",
};
const modalTitleStyle: React.CSSProperties = {
  fontFamily:"Syne", fontWeight:800, fontSize:"1.2rem",
  color:"var(--ws-text)", marginBottom:22,
};
const labelStyle: React.CSSProperties = {
  fontFamily:"DM Mono", fontSize:".58rem", letterSpacing:"1.5px",
  textTransform:"uppercase", color:"var(--ws-text3)", marginBottom:6,
};
const navBtnStyle: React.CSSProperties = {
  background:"var(--ws-surface2)", border:"1px solid var(--ws-border2)",
  borderRadius:8, color:"var(--ws-text2)", width:32, height:32,
  cursor:"pointer", fontSize:"1rem", display:"flex",
  alignItems:"center", justifyContent:"center",
};
const closeBtnStyle: React.CSSProperties = {
  background:"var(--ws-surface2)", border:"1px solid var(--ws-border2)",
  borderRadius:"50%", width:28, height:28, color:"var(--ws-text2)",
  cursor:"pointer", fontSize:"1rem", display:"flex",
  alignItems:"center", justifyContent:"center", flexShrink:0,
};
