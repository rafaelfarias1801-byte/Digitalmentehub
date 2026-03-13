// client/src/workspace/components/Cases.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { Profile } from "../../lib/supabaseClient";

/* ─── Types ─────────────────────────────────────────────────── */
interface Case {
  id: string; name: string; description: string;
  status: "ativo" | "pausado" | "encerrado";
  color: string; logo_url?: string; segment?: string;
  contact?: string; phone?: string; since?: string; notes?: string;
}

interface Post {
  id: string; case_id: string;
  slug: string;
  title: string;
  caption: string; hashtags: string; media_url?: string;
  media_type: "feed" | "stories" | "reels" | "carousel";
  scheduled_date: string;
  approval_status: "pendente" | "aprovado" | "reprovado" | "alteracao";
  extra_info?: string;
  description?: string;
  checklist?: CheckItem[];
  due_date?: string;
  label_color?: string;
  comments?: Comment[];
}

interface CheckItem { id: string; text: string; done: boolean; }
interface Comment   { id: string; author: string; text: string; created_at: string; }

interface Payment {
  id: string; case_id: string; description: string;
  amount: number; due_date: string; paid: boolean; paid_date?: string;
}

interface Document {
  id: string; case_id: string; name: string;
  file_url: string; doc_type: "contrato" | "nfe" | "outro";
  uploaded_at: string;
}

interface NoteCard {
  id: string; case_id: string; column_id: string;
  title: string; description: string;
  checklist: CheckItem[]; comments: Comment[];
  due_date?: string; label_color?: string; order: number;
}

interface NoteColumn { id: string; case_id: string; title: string; order: number; }

interface Props { profile: Profile; }

/* ─── Constants ─────────────────────────────────────────────── */
const COLORS = ["#e91e8c","#7b2fff","#4dabf7","#00e676","#ffd600","#ff6b35","#00bcd4"];
const LABEL_COLORS = ["#e91e8c","#ff6b35","#ffd600","#00e676","#4dabf7","#7b2fff","#aaa"];
const EMPTY_CASE: Omit<Case,"id"> = {
  name:"",description:"",status:"ativo",color:"#e91e8c",
  logo_url:"",segment:"",contact:"",phone:"",since:"",notes:"",
};
const STATUS_STYLES: Record<string,string> = {
  ativo:"ws-cs-ativo", pausado:"ws-cs-and", encerrado:"ws-s-venc",
};
const APPROVAL_STYLES: Record<string,{bg:string;color:string;label:string}> = {
  pendente:  {bg:"#2a2a3a",    color:"#e0e0e0",  label:"Pendente"},
  aprovado:  {bg:"#00e67622",  color:"#00e676",  label:"Aprovado"},
  reprovado: {bg:"#ff443322",  color:"#ff4433",  label:"Reprovado"},
  alteracao: {bg:"#ffd60022",  color:"#ffd600",  label:"Alteração solicitada"},
};
const SUB_TABS = [
  {id:"calendario",label:"Calendário",icon:"📅"},
  {id:"conteudo",  label:"Conteúdo",  icon:"📋"},
  {id:"financeiro",label:"Financeiro",icon:"💰"},
  {id:"contratos", label:"Contratos", icon:"📄"},
  {id:"documentos",label:"Documentos",icon:"🗂"},
  {id:"notas",     label:"Notas",     icon:"🗒"},
];
const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                     "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const fmt = (n:number) =>
  new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function Cases({ profile }: Props) {
  const [cases,setCases]       = useState<Case[]>([]);
  const [loading,setLoading]   = useState(true);
  const [openCase,setOpenCase] = useState<Case|null>(null);
  const [modal,setModal]       = useState(false);
  const [editing,setEditing]   = useState<Case|null>(null);
  const [form,setForm]         = useState<Omit<Case,"id">>(EMPTY_CASE);
  const [saving,setSaving]     = useState(false);
  const [uploading,setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    supabase.from("cases").select("*").order("created_at")
      .then(({data})=>{ setCases(data??[]); setLoading(false); });
  },[]);

  function openAdd(){ setEditing(null); setForm(EMPTY_CASE); setModal(true); }
  function openEdit(c:Case){
    setEditing(c);
    setForm({name:c.name,description:c.description,status:c.status,color:c.color,
      logo_url:c.logo_url??"",segment:c.segment??"",contact:c.contact??"",
      phone:c.phone??"",since:c.since??"",notes:c.notes??""});
    setModal(true);
  }
  async function uploadLogo(file:File){
    setUploading(true);
    const ext=file.name.split(".").pop();
    const path=`cases/${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from("assets").upload(path,file,{upsert:true});
    if(!error){ const {data}=supabase.storage.from("assets").getPublicUrl(path); setForm(f=>({...f,logo_url:data.publicUrl})); }
    setUploading(false);
  }
  async function save(){
    if(!form.name.trim()) return;
    setSaving(true);
    if(editing){
      const {data,error}=await supabase.from("cases").update(form).eq("id",editing.id).select().single();
      if(!error&&data){ setCases(p=>p.map(c=>c.id===editing.id?data:c)); if(openCase?.id===editing.id) setOpenCase(data); }
    } else {
      const {data,error}=await supabase.from("cases").insert(form).select().single();
      if(!error&&data) setCases(p=>[...p,data]);
    }
    setSaving(false); setModal(false);
  }
  async function remove(id:string){
    setCases(p=>p.filter(c=>c.id!==id));
    if(openCase?.id===id) setOpenCase(null);
    await supabase.from("cases").delete().eq("id",id);
  }

  if(openCase) return (
    <CaseWorkspace caseData={openCase} onBack={()=>setOpenCase(null)}
      onEdit={()=>openEdit(openCase)} onDelete={()=>remove(openCase.id)} profile={profile}/>
  );

  return (
    <div className="ws-page">
      <CasesGlobalStyle/>
      <div className="ws-page-title">Cases<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Clientes ativos e histórico de projetos</div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button className="ws-btn" onClick={openAdd}>+ Novo Case</button>
      </div>
      {loading ? <Loader/> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16}}>
          {cases.map(c=>(
            <div key={c.id} className="ws-case" style={{cursor:"pointer"}} onClick={()=>setOpenCase(c)}>
              <div className="ws-case-thumb" style={{
                background:c.logo_url?undefined:`linear-gradient(135deg,${c.color}33,${c.color}11)`,
                position:"relative",overflow:"hidden"}}>
                {c.logo_url
                  ? <img src={c.logo_url} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : <span style={{color:c.color,fontSize:"2rem"}}>{c.name.slice(0,2).toUpperCase()}</span>
                }
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:c.color}}/>
              </div>
              <div className="ws-case-body">
                <div className="ws-case-name">{c.name}</div>
                <div className="ws-case-desc">{c.description||"—"}</div>
                <span className={`ws-case-status ${STATUS_STYLES[c.status]}`}>{c.status}</span>
              </div>
            </div>
          ))}
          <div onClick={openAdd} style={{
            background:"transparent",border:"2px dashed var(--ws-border2)",
            borderRadius:"var(--ws-radius)",minHeight:180,
            display:"flex",alignItems:"center",justifyContent:"center",
            flexDirection:"column",gap:8,cursor:"pointer",
            color:"var(--ws-text3)",fontSize:".8rem",transition:"all .15s"}}
            onMouseEnter={e=>(e.currentTarget.style.borderColor="var(--ws-accent)",e.currentTarget.style.color="var(--ws-accent)")}
            onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--ws-border2)",e.currentTarget.style.color="var(--ws-text3)")}>
            <div style={{fontSize:"1.6rem"}}>+</div>
            <div style={{fontFamily:"DM Mono",fontSize:".62rem",letterSpacing:"1px"}}>NOVO CASE</div>
          </div>
        </div>
      )}
      {modal && <CaseModal form={form} setForm={setForm} editing={editing}
        saving={saving} uploading={uploading} fileRef={fileRef}
        uploadLogo={uploadLogo} onSave={save} onClose={()=>setModal(false)}/>}
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
        onChange={e=>e.target.files?.[0]&&uploadLogo(e.target.files[0])}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CASE WORKSPACE
═══════════════════════════════════════════════════════════════ */
function CaseWorkspace({caseData,onBack,onEdit,onDelete,profile}:
  {caseData:Case;onBack:()=>void;onEdit:()=>void;onDelete:()=>void;profile:Profile}){
  const [activeTab,setActiveTab]=useState("calendario");
  const [sidebarOpen,setSidebarOpen]=useState(true);
  function onToggleSidebar(){ setSidebarOpen(v=>!v); }
  return (
    <div style={{display:"flex",height:"100%",minHeight:"100vh",position:"relative"}}>
      {!sidebarOpen&&(
        <div style={{width:36,flexShrink:0,borderRight:"1px solid var(--ws-border)",
          background:"var(--ws-surface)",display:"flex",flexDirection:"column",
          alignItems:"center",paddingTop:10,gap:8}}>
          <button onClick={()=>setSidebarOpen(true)} title="Expandir" style={{
            background:"none",border:"1px solid var(--ws-border2)",borderRadius:5,
            color:"var(--ws-text3)",cursor:"pointer",width:24,height:24,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:".75rem",
            transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--ws-text2)";e.currentTarget.style.color="var(--ws-text)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--ws-border2)";e.currentTarget.style.color="var(--ws-text3)";}}>
            ▶
          </button>
          <div style={{writingMode:"vertical-rl",transform:"rotate(180deg)",
            fontSize:".6rem",fontFamily:"DM Mono",letterSpacing:"1.5px",
            color:"var(--ws-text3)",marginTop:8,userSelect:"none"}}>
            {caseData.name.slice(0,10).toUpperCase()}
          </div>
        </div>
      )}
      <div style={{width:sidebarOpen?200:0,flexShrink:0,borderRight:sidebarOpen?"1px solid var(--ws-border)":"none",
        background:"var(--ws-surface)",display:sidebarOpen?"flex":"none",flexDirection:"column",paddingTop:8,
        overflow:"hidden",transition:"width .2s"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px 6px 16px"}}>
          <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:5,
            background:"none",border:"none",color:"var(--ws-text3)",cursor:"pointer",
            fontSize:".72rem",fontFamily:"DM Mono",letterSpacing:"1px",transition:"color .15s",padding:0}}
            onMouseEnter={e=>e.currentTarget.style.color="var(--ws-text)"}
            onMouseLeave={e=>e.currentTarget.style.color="var(--ws-text3)"}>← CASES</button>
          <button onClick={onToggleSidebar} title={sidebarOpen?"Recolher":"Expandir"} style={{
            background:"none",border:"1px solid var(--ws-border2)",borderRadius:5,
            color:"var(--ws-text3)",cursor:"pointer",width:24,height:24,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:".75rem",flexShrink:0,
            transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--ws-text2)";e.currentTarget.style.color="var(--ws-text)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--ws-border2)";e.currentTarget.style.color="var(--ws-text3)";}}>
            {sidebarOpen?"◀":"▶"}
          </button>
        </div>
        <div style={{padding:"12px 16px 16px",borderBottom:"1px solid var(--ws-border)"}}>
          <div style={{width:40,height:40,borderRadius:8,overflow:"hidden",
            background:caseData.logo_url?undefined:`linear-gradient(135deg,${caseData.color}44,${caseData.color}22)`,
            display:"flex",alignItems:"center",justifyContent:"center",
            marginBottom:8,border:`1px solid ${caseData.color}44`}}>
            {caseData.logo_url
              ? <img src={caseData.logo_url} alt={caseData.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <span style={{color:caseData.color,fontSize:".9rem",fontWeight:800}}>{caseData.name.slice(0,2).toUpperCase()}</span>
            }
          </div>
          <div style={{fontFamily:"Syne",fontWeight:800,fontSize:".9rem",color:"var(--ws-text)",lineHeight:1.2}}>
            {caseData.name}</div>
          <span className={`ws-case-status ${STATUS_STYLES[caseData.status]}`}
            style={{marginTop:4,display:"inline-block",
              color: caseData.status==="ativo"?"#00e676":caseData.status==="pausado"?"#ffd600":"#aaa",
              borderColor: caseData.status==="ativo"?"#00e676":caseData.status==="pausado"?"#ffd600":"#aaa",
            }}>{caseData.status}</span>
        </div>
        <div style={{flex:1,padding:"8px 0"}}>
          {SUB_TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{
              display:"flex",alignItems:"center",gap:8,width:"100%",
              background:activeTab===tab.id?`${caseData.color}18`:"none",
              border:"none",borderLeft:activeTab===tab.id?`2px solid ${caseData.color}`:"2px solid transparent",
              color:activeTab===tab.id?caseData.color:"var(--ws-text2)",
              cursor:"pointer",fontSize:".82rem",padding:"9px 16px",
              textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}>
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div style={{padding:"12px 16px",borderTop:"1px solid var(--ws-border)",display:"flex",flexDirection:"column",gap:6}}>
          <button onClick={onEdit} style={{background:"var(--ws-surface2)",border:"1px solid var(--ws-border2)",
            borderRadius:6,color:"var(--ws-text2)",cursor:"pointer",padding:"6px 10px",fontSize:".72rem",fontFamily:"inherit"}}>
            ✎ Editar case</button>
          <button onClick={onDelete} style={{background:"none",border:"1px solid var(--ws-border2)",
            borderRadius:6,color:"var(--ws-accent)",cursor:"pointer",padding:"6px 10px",fontSize:".72rem",fontFamily:"inherit"}}>
            × Excluir case</button>
        </div>
      </div>
      <div style={{flex:1,overflow:"auto",background:"var(--ws-bg)"}}>
        <CasesGlobalStyle/>
        <div style={{padding:"28px 32px"}}>
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:"Syne",fontWeight:800,fontSize:"1.4rem",color:"var(--ws-text)"}}>
              {SUB_TABS.find(t=>t.id===activeTab)?.icon}{" "}
              {SUB_TABS.find(t=>t.id===activeTab)?.label}
              <span style={{color:caseData.color}}>.</span>
            </div>
            <div style={{color:"var(--ws-text3)",fontSize:".8rem",fontFamily:"DM Mono",marginTop:2}}>{caseData.name}</div>
          </div>
          {activeTab==="calendario"  && <TabCalendario  caseData={caseData} profile={profile}/>}
          {activeTab==="conteudo"    && <TabConteudo    caseData={caseData} profile={profile}/>}
          {activeTab==="financeiro"  && <TabFinanceiro  caseData={caseData}/>}
          {activeTab==="contratos"   && <TabDocumentos  caseData={caseData} type="contrato"/>}
          {activeTab==="documentos"  && <TabDocumentos  caseData={caseData} type="documento"/>}
          {activeTab==="notas"       && <TabNotas       caseData={caseData} profile={profile}/>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RICH TEXT MINI-EDITOR
═══════════════════════════════════════════════════════════════ */
function RichEditor({value,onChange,placeholder}:
  {value:string;onChange:(v:string)=>void;placeholder?:string}){
  const ref=useRef<HTMLDivElement>(null);
  const initialized=useRef(false);

  useEffect(()=>{
    if(ref.current&&!initialized.current){
      ref.current.innerHTML=value||"";
      initialized.current=true;
    }
  },[]);

  function runCmd(cmd:string){
    const el=ref.current;
    if(!el) return;
    const sel=window.getSelection();
    const savedRange=sel&&sel.rangeCount>0?sel.getRangeAt(0).cloneRange():null;
    el.focus();
    if(savedRange&&sel){
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
    document.execCommand(cmd,false,undefined);
    onChange(el.innerHTML||"");
  }

  function handleKeyDown(e:React.KeyboardEvent<HTMLDivElement>){
    if(e.key!=="Enter"||e.shiftKey) return;
    const sel=window.getSelection();
    if(!sel||!sel.rangeCount) return;
    let n:Node|null=sel.getRangeAt(0).startContainer;
    while(n&&n!==ref.current){
      if((n as Element).tagName==="LI"){
        if((n as HTMLElement).textContent?.trim()===""){
          e.preventDefault();
          const list=(n as HTMLElement).parentElement!;
          (n as HTMLElement).remove();
          if(!list.querySelector("li")) list.remove();
          const div=document.createElement("div");
          div.innerHTML="<br/>";
          const par=list.parentNode||ref.current!;
          par.insertBefore(div,list.nextSibling);
          const r=document.createRange();
          r.setStart(div,0); r.collapse(true);
          sel.removeAllRanges(); sel.addRange(r);
          onChange(ref.current?.innerHTML||"");
        }
        return;
      }
      n=n.parentNode;
    }
  }

  const tools:[string,React.ReactNode][]=[
    ["bold",        <b  key="b" style={{fontFamily:"sans-serif",fontSize:".9rem"}}>B</b>],
    ["italic",      <i  key="i" style={{fontFamily:"sans-serif",fontSize:".9rem"}}>I</i>],
    ["underline",   <u  key="u" style={{fontFamily:"sans-serif",fontSize:".9rem"}}>U</u>],
    ["strikeThrough",<s key="s" style={{fontFamily:"sans-serif",fontSize:".9rem"}}>S</s>],
    ["insertUnorderedList", <span key="ul" style={{fontSize:".9rem",fontWeight:700}}>•</span>],
    ["insertOrderedList",   <span key="ol" style={{fontSize:".8rem",fontWeight:700}}>1.</span>],
  ];

  return (
    <div>
      <div style={{display:"flex",gap:2,padding:"4px 6px",
        background:"var(--ws-surface2)",borderRadius:"6px 6px 0 0",
        border:"1px solid var(--ws-border2)",borderBottom:"none"}}>
        {tools.map(([cmd,label],i)=>(
          <button key={i}
            onMouseDown={e=>{e.preventDefault(); runCmd(cmd);}}
            style={{background:"none",border:"none",color:"var(--ws-text)",cursor:"pointer",
              padding:"3px 9px",borderRadius:4,lineHeight:1.4,minWidth:28,textAlign:"center"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.08)"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            {label}
          </button>
        ))}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={()=>onChange(ref.current?.innerHTML||"")}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder||"Escreva aqui..."}
        style={{minHeight:100,padding:"10px 12px",
          background:"var(--ws-surface2)",border:"1px solid var(--ws-border2)",
          borderRadius:"0 0 6px 6px",color:"var(--ws-text)",
          fontSize:".84rem",lineHeight:1.7,outline:"none"}}/>
      <style>{`
        [contenteditable]:empty:before{content:attr(data-placeholder);color:var(--ws-text3);}
        [contenteditable] ul{list-style-type:disc;padding-left:1.5em;margin:4px 0;}
        [contenteditable] ol{list-style-type:decimal;padding-left:1.5em;margin:4px 0;}
        [contenteditable] li{margin:1px 0;}
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POST DETAIL MODAL (Trello-style)
═══════════════════════════════════════════════════════════════ */
function PostDetailModal({post,caseData,onClose,onUpdate,profile}:
  {post:Post;caseData:Case;onClose:()=>void;onUpdate:(p:Post)=>void;profile:Profile}){
  const [p,setP]             = useState<Post>(post);
  const [editDesc,setEditDesc]=useState(false);
  const [newCheck,setNewCheck]=useState("");
  const [newComment,setNewComment]=useState("");
  const [saving,setSaving]   = useState(false);

  async function save(updates:Partial<Post>){
    const merged={...p,...updates};
    setP(merged);
    const {data}=await supabase.from("posts").update(merged).eq("id",p.id).select().single();
    if(data) onUpdate(data);
  }
  async function saveApproval(status:Post["approval_status"]){
    setSaving(true); await save({approval_status:status}); setSaving(false);
  }
  function addCheckItem(){
    if(!newCheck.trim()) return;
    save({checklist:[...(p.checklist||[]),{id:Date.now().toString(),text:newCheck,done:false}]});
    setNewCheck("");
  }
  function toggleCheck(id:string){ save({checklist:(p.checklist||[]).map(c=>c.id===id?{...c,done:!c.done}:c)}); }
  function removeCheck(id:string){ save({checklist:(p.checklist||[]).filter(c=>c.id!==id)}); }
  function addComment(){
    if(!newComment.trim()) return;
    save({comments:[...(p.comments||[]),{id:Date.now().toString(),
      author:profile.name||"Você",text:newComment,created_at:new Date().toISOString()}]});
    setNewComment("");
  }

  const ap=APPROVAL_STYLES[p.approval_status];
  const doneCount=(p.checklist||[]).filter(c=>c.done).length;
  const totalCheck=(p.checklist||[]).length;
  const aspectRatio=p.media_type==="feed"?"4/5":p.media_type==="carousel"?"1/1":"9/16";
  const isVideo=p.media_url?.match(/\.(mp4|mov|webm)$/i);

  return (
    <div style={overlayStyle} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"var(--ws-surface)",borderRadius:16,
        width:"min(860px,95vw)",maxHeight:"90vh",overflowY:"auto",
        border:"1px solid var(--ws-border2)",boxShadow:"0 30px 80px #00000070",
        display:"grid",gridTemplateColumns:"1fr 280px"}}>
        {/* Left */}
        <div style={{padding:"28px 24px",borderRight:"1px solid var(--ws-border)"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:20}}>
            <div style={{flex:1}}>
              {p.label_color&&<div style={{width:40,height:6,borderRadius:3,background:p.label_color,marginBottom:8}}/>}
              <div style={{fontFamily:"Syne",fontWeight:800,fontSize:"1.1rem",color:"var(--ws-text)",marginBottom:4}}>
                {p.slug||p.title||"Post"}</div>
              {p.title&&p.slug&&<div style={{fontSize:".82rem",color:"var(--ws-text3)",marginBottom:4}}>{p.title}</div>}
              <div style={{fontSize:".72rem",color:"var(--ws-text3)",fontFamily:"DM Mono"}}>
                {p.scheduled_date
                  ? new Date(p.scheduled_date+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})
                  : "Sem data"}
              </div>
            </div>
            <button onClick={onClose} style={closeBtnStyle}>×</button>
          </div>

          {p.media_url&&(
            <div style={{marginBottom:20,borderRadius:10,overflow:"hidden",
              background:"#000",display:"flex",justifyContent:"center",alignItems:"flex-start"}}>
              {isVideo
                ? <video src={p.media_url} controls style={{
                    width:"100%",aspectRatio,objectFit:"contain",maxHeight:400,display:"block"}}/>
                : <img src={p.media_url} alt="" style={{
                    width:"100%",aspectRatio,objectFit:"contain",maxHeight:400,display:"block"}}/>
              }
            </div>
          )}

          {/* Approval */}
          <div style={{marginBottom:20}}>
            <div style={labelStyle}>Status de aprovação</div>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,
              background:ap.bg,color:ap.color,borderRadius:20,
              padding:"4px 12px",fontSize:".78rem",fontWeight:600,marginBottom:12}}>
              {p.approval_status==="aprovado"?"✓":p.approval_status==="reprovado"?"✕":
               p.approval_status==="alteracao"?"⚠":"◷"} {ap.label}
            </div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              {(["aprovado","reprovado","alteracao"] as const).map(st=>(
                <button key={st} onClick={()=>saveApproval(st)} disabled={saving} style={{
                  padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",
                  fontFamily:"inherit",fontSize:".78rem",fontWeight:600,
                  background:APPROVAL_STYLES[st].bg,color:APPROVAL_STYLES[st].color,
                  opacity:p.approval_status===st?1:0.6,
                  outline:p.approval_status===st?`2px solid ${APPROVAL_STYLES[st].color}`:"none",
                  transition:"all .15s"}}>
                  {st==="aprovado"?"✓ Aprovar":st==="reprovado"?"✕ Reprovar":"⚠ Alteração"}
                </button>
              ))}
            </div>
          </div>

          {/* Botão WhatsApp */}
          {caseData?.phone && (
            <div style={{marginTop:12, marginBottom:16}}>
              <button
                onClick={() => {
                  const phone = caseData.phone?.replace(/[\s\-\(\)\+]/g, '');
                  const statusMessages: Record<string, string> = {
                    pendente: `Olá! 👋\n\nTemos o conteúdo "${p.title}" aguardando sua aprovação.\n\nAcesse: https://www.digitalmentehub.com.br/workspace`,
                    aprovado: `Olá! 👋\n\nO conteúdo "${p.title}" foi aprovado! ✅`,
                    reprovado: `Olá! 👋\n\nSobre o conteúdo "${p.title}", vamos ajustar. Podemos conversar?`,
                    alteracao: `Olá! 👋\n\nRecebemos seu pedido de alteração em "${p.title}". Vamos alinhar?`,
                  };
                  const msg = encodeURIComponent(
                    statusMessages[p.approval_status] || statusMessages.pendente
                  );
                  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                }}
                style={{
                  display:'flex',
                  alignItems:'center',
                  gap:8,
                  padding:'8px 16px',
                  backgroundColor:'#25D366',
                  color:'#fff',
                  border:'none',
                  borderRadius:8,
                  cursor:'pointer',
                  fontSize:'.78rem',
                  fontWeight:600,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.111.547 4.099 1.504 5.832L0 24l6.335-1.652A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.875 0-3.632-.508-5.145-1.388l-.368-.22-3.821.997 1.018-3.715-.24-.382A9.71 9.71 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/>
                </svg>
                Enviar via WhatsApp
              </button>
            </div>
          )}

          {/* Description */}
          <div style={{marginBottom:20}}>
            <div style={labelStyle}>Descrição</div>
            {editDesc?(
              <div>
                <RichEditor value={p.description||""} onChange={v=>setP(pp=>({...pp,description:v}))}
                  placeholder="Descrição detalhada..."/>
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button onClick={()=>{save({description:p.description});setEditDesc(false);}} style={{
                    background:caseData.color,border:"none",borderRadius:6,color:"#fff",
                    padding:"6px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:".8rem"}}>Salvar</button>
                  <button onClick={()=>setEditDesc(false)} style={{background:"none",border:"none",
                    color:"var(--ws-text3)",cursor:"pointer",fontFamily:"inherit",fontSize:".8rem"}}>Cancelar</button>
                </div>
              </div>
            ):(
              <div onClick={()=>setEditDesc(true)} style={{minHeight:60,padding:"10px 12px",
                background:"var(--ws-surface2)",borderRadius:8,cursor:"pointer",
                border:"1px solid transparent",transition:"border-color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="var(--ws-border2)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}>
                {p.description
                  ? <div style={{fontSize:".84rem",color:"var(--ws-text)",lineHeight:1.7}}
                      dangerouslySetInnerHTML={{__html:p.description}} className="ws-richtext"/>
                  : <div style={{fontSize:".82rem",color:"var(--ws-text3)"}}>Clique para adicionar descrição...</div>
                }
              </div>
            )}
          </div>

          {/* Caption */}
          <div style={{marginBottom:14}}>
            <div style={labelStyle}>Legenda</div>
            <div style={{fontSize:".84rem",color:"var(--ws-text)",lineHeight:1.7,
              background:"var(--ws-surface2)",borderRadius:8,padding:"10px 14px"}}>{p.caption||"—"}</div>
          </div>

          {p.hashtags&&(
            <div style={{marginBottom:14}}>
              <div style={labelStyle}>Hashtags</div>
              <div style={{fontSize:".8rem",color:caseData.color,lineHeight:1.7,
                background:`${caseData.color}11`,borderRadius:8,padding:"8px 14px",wordBreak:"break-word"}}>
                {p.hashtags}</div>
            </div>
          )}

          {p.extra_info&&(
            <div style={{marginBottom:14}}>
              <div style={labelStyle}>Informações extras</div>
              <div style={{fontSize:".82rem",color:"var(--ws-text2)",lineHeight:1.65}}>{p.extra_info}</div>
            </div>
          )}

          {/* Checklist */}
          <div style={{marginBottom:20}}>
            <div style={labelStyle}>Checklist {totalCheck>0&&`(${doneCount}/${totalCheck})`}</div>
            {totalCheck>0&&(
              <div style={{height:4,background:"var(--ws-border)",borderRadius:2,marginBottom:10,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,background:caseData.color,
                  width:`${(doneCount/totalCheck)*100}%`,transition:"width .3s"}}/>
              </div>
            )}
            {(p.checklist||[]).map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <input type="checkbox" checked={item.done} onChange={()=>toggleCheck(item.id)}
                  style={{width:15,height:15,cursor:"pointer",accentColor:caseData.color}}/>
                <span style={{fontSize:".84rem",color:"var(--ws-text)",flex:1,
                  textDecoration:item.done?"line-through":"none",opacity:item.done?0.5:1}}>{item.text}</span>
                <button onClick={()=>removeCheck(item.id)} style={{background:"none",border:"none",
                  color:"var(--ws-text3)",cursor:"pointer",fontSize:".85rem"}}>×</button>
              </div>
            ))}
            <div style={{display:"flex",gap:6,marginTop:6}}>
              <input className="ws-input" value={newCheck} placeholder="Adicionar item..."
                onChange={e=>setNewCheck(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCheckItem()}
                style={{flex:1,padding:"6px 10px",fontSize:".8rem"}}/>
              <button onClick={addCheckItem} style={{background:caseData.color,border:"none",borderRadius:8,
                color:"#fff",padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:".8rem"}}>+</button>
            </div>
          </div>

          {/* Comments */}
          <div>
            <div style={labelStyle}>Comentários e atividade</div>
            {(p.comments||[]).map(c=>(
              <div key={c.id} style={{display:"flex",gap:10,marginBottom:14}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:caseData.color,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",fontSize:".75rem",fontWeight:700,flexShrink:0}}>
                  {c.author.slice(0,1).toUpperCase()}</div>
                <div>
                  <div style={{fontSize:".78rem",color:"var(--ws-text2)",marginBottom:3}}>
                    <b style={{color:"var(--ws-text)"}}>{c.author}</b>{" "}
                    <span style={{color:"var(--ws-text3)",fontFamily:"DM Mono",fontSize:".65rem"}}>
                      {new Date(c.created_at).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </span>
                  </div>
                  <div style={{background:"var(--ws-surface2)",borderRadius:8,
                    padding:"8px 12px",fontSize:".83rem",color:"var(--ws-text)"}}>{c.text}</div>
                </div>
              </div>
            ))}
            <div style={{display:"flex",gap:8}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:caseData.color,
                display:"flex",alignItems:"center",justifyContent:"center",
                color:"#fff",fontSize:".75rem",fontWeight:700,flexShrink:0}}>
                {(profile.name||"V").slice(0,1).toUpperCase()}</div>
              <div style={{flex:1}}>
                <textarea className="ws-input" value={newComment} onChange={e=>setNewComment(e.target.value)}
                  placeholder="Escrever um comentário..."
                  style={{minHeight:64,resize:"vertical",fontSize:".83rem",marginBottom:6}}/>
                <button onClick={addComment} style={{background:caseData.color,border:"none",borderRadius:8,
                  color:"#fff",padding:"6px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:".8rem"}}>
                  Comentar</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{padding:"28px 18px"}}>
          <div style={labelStyle}>Ações</div>
          <div style={{marginBottom:20}}>
            <div style={labelStyle}>Etiqueta</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {LABEL_COLORS.map(lc=>(
                <div key={lc} onClick={()=>save({label_color:p.label_color===lc?"":lc})} style={{
                  width:24,height:24,borderRadius:4,background:lc,cursor:"pointer",
                  border:p.label_color===lc?"3px solid white":"3px solid transparent",
                  boxShadow:p.label_color===lc?`0 0 0 2px ${lc}`:"none",transition:"all .15s"}}/>
              ))}
            </div>
          </div>
          <div style={{marginBottom:20}}>
            <div style={labelStyle}>Data de entrega</div>
            <input type="date" className="ws-input" value={p.due_date||""}
              onChange={e=>save({due_date:e.target.value})} style={{fontSize:".8rem"}}/>
          </div>
          <div style={{marginBottom:20}}>
            <div style={labelStyle}>Tipo de conteúdo</div>
            <select className="ws-input" value={p.media_type}
              onChange={e=>save({media_type:e.target.value as any})} style={{fontSize:".8rem"}}>
              <option value="feed">Feed (4:5 · 1080×1350)</option>
              <option value="stories">Stories (9:16 · 1080×1920)</option>
              <option value="reels">Reels (9:16 · 1080×1920)</option>
              <option value="carousel">Carrossel (1:1 · 1080×1080)</option>
            </select>
          </div>
          <div style={{padding:"10px 12px",background:"var(--ws-surface2)",borderRadius:8,
            fontSize:".73rem",color:"var(--ws-text3)",lineHeight:1.6}}>
            {p.media_type==="feed"    && "📐 1080 × 1350 px — Feed"}
            {p.media_type==="stories" && "📐 1080 × 1920 px — Stories"}
            {p.media_type==="reels"   && "📐 1080 × 1920 px — Reels"}
            {p.media_type==="carousel"&& "📐 1080 × 1080 px — Carrossel"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: CALENDÁRIO
═══════════════════════════════════════════════════════════════ */
function TabCalendario({caseData,profile}:{caseData:Case;profile:Profile}){
  const [posts,setPosts]       = useState<Post[]>([]);
  const [month,setMonth]       = useState(new Date().getMonth());
  const [year,setYear]         = useState(new Date().getFullYear());
  const [selected,setSelected] = useState<Post|null>(null);
  const [loading,setLoading]   = useState(true);

  useEffect(()=>{
    supabase.from("posts").select("*").eq("case_id",caseData.id)
      .then(({data})=>{ setPosts(data??[]); setLoading(false); });
  },[caseData.id]);

  function updatePost(p:Post){ setPosts(prev=>prev.map(x=>x.id===p.id?p:x)); setSelected(p); }

  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();
  const cells=Array.from({length:firstDay+daysInMonth},(_,i)=>i<firstDay?null:i-firstDay+1);
  const postsForDay=(day:number)=>posts.filter(p=>{
    if(!p.scheduled_date) return false;
    const d=new Date(p.scheduled_date+"T12:00:00");
    return d.getFullYear()===year&&d.getMonth()===month&&d.getDate()===day;
  });

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>{ if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1); }} style={navBtnStyle}>‹</button>
        <span style={{fontFamily:"Syne",fontWeight:700,fontSize:"1rem",
          color:"var(--ws-text)",minWidth:170,textAlign:"center"}}>{MONTHS_FULL[month]} {year}</span>
        <button onClick={()=>{ if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1); }} style={navBtnStyle}>›</button>
      </div>
{/* Botão enviar conteúdo do mês */}
{caseData?.phone && posts.filter(p => {
  if (!p.scheduled_date) return false;
  const d = new Date(p.scheduled_date + "T12:00:00");
  return d.getFullYear() === year && d.getMonth() === month;
}).length > 0 && (
  <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
    <button
      onClick={() => {
        const phone = caseData.phone?.replace(/[\s\-\(\)\+]/g, '');
        const monthPosts = posts.filter(p => {
          if (!p.scheduled_date) return false;
          const d = new Date(p.scheduled_date + "T12:00:00");
          return d.getFullYear() === year && d.getMonth() === month;
        });
        const msg = encodeURIComponent(
          `Olá${caseData.name ? ` ${caseData.name}` : ''}! 👋\n\n` +
          `Seu conteúdo do mês de *${MONTHS_FULL[month]} ${year}* está pronto! ` +
          `São ${monthPosts.length} publicações aguardando sua aprovação.\n\n` +
          `Acesse com seu login e senha:\n` +
          `https://www.digitalmentehub.com.br/workspace\n\n` +
          `Aguardamos seu feedback! ✅`
        );
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
      }}
      style={{
        display:'flex',
        alignItems:'center',
        gap:8,
        padding:'8px 16px',
        backgroundColor:'#25D366',
        color:'#fff',
        border:'none',
        borderRadius:8,
        cursor:'pointer',
        fontSize:'.78rem',
        fontWeight:600,
        transition:'all .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1da851'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#25D366'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.111.547 4.099 1.504 5.832L0 24l6.335-1.652A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.875 0-3.632-.508-5.145-1.388l-.368-.22-3.821.997 1.018-3.715-.24-.382A9.71 9.71 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/>
      </svg>
      📩 Enviar conteúdo de {MONTHS_FULL[month]} para aprovação
    </button>
  </div>
)}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:24}}>
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=>(
          <div key={d} style={{textAlign:"center",fontFamily:"DM Mono",fontSize:".6rem",
            color:"var(--ws-text3)",padding:"6px 0",letterSpacing:"1px"}}>{d}</div>
        ))}
        {cells.map((day,i)=>{
          const dayPosts=day?postsForDay(day):[];
          return (
            <div key={i} style={{minHeight:90,background:"var(--ws-surface)",borderRadius:6,
              border:"1px solid var(--ws-border)",padding:"4px",opacity:day?1:0}}>
              {day&&<>
                <div style={{fontSize:".68rem",color:"var(--ws-text3)",marginBottom:3,
                  fontFamily:"DM Mono",padding:"0 2px"}}>{day}</div>
                {dayPosts.map(p=>{
                  const ap=APPROVAL_STYLES[p.approval_status];
                  const isImg=p.media_url&&!p.media_url.match(/\.(mp4|mov|webm)$/i);
                  const ar=p.media_type==="feed"?"4/5":p.media_type==="carousel"?"1/1":"9/16";
                  return (
                    <div key={p.id} onClick={()=>setSelected(p)} style={{
                      borderRadius:4,marginBottom:3,cursor:"pointer",overflow:"hidden",
                      border:`1px solid ${ap.color}55`,background:"var(--ws-surface2)",
                    }}>
                      {isImg?(
                        <div style={{position:"relative"}}>
                          <img src={p.media_url} alt="" style={{
                            width:"100%",aspectRatio:ar,objectFit:"cover",display:"block"}}/>
                          <div style={{position:"absolute",bottom:0,left:0,right:0,
                            background:"linear-gradient(transparent,#00000099)",padding:"10px 4px 3px"}}>
                            <div style={{fontSize:".58rem",color:"#fff",fontFamily:"DM Mono",
                              lineHeight:1.2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                              {p.slug||p.title||"Post"}</div>
                          </div>
                          <div style={{position:"absolute",top:2,right:2,
                            width:6,height:6,borderRadius:"50%",background:ap.color}}/>
                        </div>
                      ):(
                        <div style={{padding:"3px 5px",background:`${ap.color}18`,
                          borderLeft:`3px solid ${ap.color}`}}>
                          <div style={{fontSize:".62rem",color:ap.color,fontFamily:"DM Mono",
                            lineHeight:1.3,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                            {p.slug||p.title||"Post"}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>}
            </div>
          );
        })}
      </div>
      {selected&&<PostDetailModal post={selected} caseData={caseData}
        onClose={()=>setSelected(null)} onUpdate={updatePost} profile={profile}/>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: CONTEÚDO
═══════════════════════════════════════════════════════════════ */
function TabConteudo({caseData,profile}:{caseData:Case;profile:Profile}){
  const [posts,setPosts]    = useState<Post[]>([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]    = useState(false);
  const [selected,setSelected]=useState<Post|null>(null);
  const EMPTY_POST: Omit<Post,"id"|"case_id">={
    slug:"",title:"",caption:"",hashtags:"",media_url:"",
    media_type:"feed",scheduled_date:"",approval_status:"pendente",
    extra_info:"",description:"",checklist:[],comments:[],
  };
  const [form,setForm]=useState<Omit<Post,"id"|"case_id">>(EMPTY_POST);
  const [saving,setSaving]  = useState(false);
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const [activeMonth, setActiveMonth] = useState<string>("");

  useEffect(()=>{
    supabase.from("posts").select("*").eq("case_id",caseData.id).order("scheduled_date")
      .then(({data})=>{ setPosts(data??[]); setLoading(false); });
  },[caseData.id]);

  useEffect(() => {
    if (posts.length > 0 && !activeMonth) {
      const now = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const keys = [...new Set(posts.map(p => p.scheduled_date ? p.scheduled_date.slice(0, 7) : "sem-data"))].sort();
      setActiveMonth(keys.includes(now) ? now : keys[0] || "sem-data");
    }
  }, [posts]);

  async function uploadMedia(file:File){
    setUploading(true);
    const ext=file.name.split(".").pop();
    const path=`posts/${caseData.id}/${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from("assets").upload(path,file,{upsert:true});
    if(!error){
      const {data}=supabase.storage.from("assets").getPublicUrl(path);
      setForm(f=>({...f,media_url:data.publicUrl}));
    }
    setUploading(false);
  }

  async function save(){
    if(!form.slug.trim()&&!form.title.trim()) return;
    setSaving(true);
    const {data,error}=await supabase.from("posts").insert({...form,case_id:caseData.id}).select().single();
    if(!error&&data) setPosts(p=>[...p,data]);
    setSaving(false); setModal(false); setForm(EMPTY_POST);
  }

  async function removePost(id:string){
    setPosts(p=>p.filter(x=>x.id!==id));
    await supabase.from("posts").delete().eq("id",id);
  }

  function updatePost(p:Post){ setPosts(prev=>prev.map(x=>x.id===p.id?p:x)); setSelected(p); }

  // Agrupar posts por mês
  const postsByMonth: Record<string, Post[]> = {};
  posts.forEach(p => {
    const key = p.scheduled_date ? p.scheduled_date.slice(0, 7) : "sem-data";
    if (!postsByMonth[key]) postsByMonth[key] = [];
    postsByMonth[key].push(p);
  });

  const sortedMonths = Object.keys(postsByMonth).sort((a, b) => {
    if (a === "sem-data") return 1;
    if (b === "sem-data") return -1;
    return a.localeCompare(b);
  });

  const currentMonth = sortedMonths.includes(activeMonth) ? activeMonth : sortedMonths[0] || "sem-data";
  const currentPosts = postsByMonth[currentMonth] || [];

  function getMonthLabel(key: string) {
    if (key === "sem-data") return "Sem data";
    const [y, m] = key.split("-");
    return `${MONTHS_FULL[parseInt(m) - 1]} ${y}`;
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button className="ws-btn" onClick={()=>setModal(true)}>+ Novo post</button>
      </div>

      {loading ? <Loader/> : posts.length === 0 ? <Empty label="Nenhum post cadastrado ainda."/> : (
        <>
          {/* Abas de meses */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            {sortedMonths.map(key => (
              <button key={key} onClick={() => setActiveMonth(key)} style={{
                padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",
                fontFamily:"inherit",fontSize:".78rem",fontWeight:600,
                background: currentMonth === key ? `${caseData.color}22` : "var(--ws-surface)",
                color: currentMonth === key ? caseData.color : "var(--ws-text3)",
                outline: currentMonth === key ? `2px solid ${caseData.color}` : "1px solid var(--ws-border)",
                transition:"all .15s",
              }}>
                {getMonthLabel(key)}
                <span style={{
                  marginLeft:6,fontSize:".65rem",
                  background: currentMonth === key ? caseData.color : "var(--ws-border)",
                  color: currentMonth === key ? "#fff" : "var(--ws-text3)",
                  borderRadius:10,padding:"1px 6px",
                }}>
                  {(postsByMonth[key] || []).length}
                </span>
              </button>
            ))}
          </div>

          {/* Botão WhatsApp do mês */}
          {caseData?.phone && currentMonth !== "sem-data" && currentPosts.length > 0 && (
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
              <button
                onClick={() => {
                  const phone = caseData.phone?.replace(/[\s\-\(\)\+]/g, '');
                  const msg = encodeURIComponent(
                    `Olá${caseData.name ? ` ${caseData.name}` : ''}! 👋\n\n` +
                    `Seu conteúdo do mês de *${getMonthLabel(currentMonth)}* está pronto! ` +
                    `São ${currentPosts.length} publicações aguardando sua aprovação.\n\n` +
                    `Acesse com seu login e senha:\n` +
                    `https://www.digitalmentehub.com.br/workspace\n\n` +
                    `Aguardamos seu feedback! ✅`
                  );
                  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                }}
                style={{
                  display:'flex',alignItems:'center',gap:8,
                  padding:'8px 16px',backgroundColor:'#25D366',
                  color:'#fff',border:'none',borderRadius:8,
                  cursor:'pointer',fontSize:'.78rem',fontWeight:600,
                  transition:'all .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1da851'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#25D366'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.111.547 4.099 1.504 5.832L0 24l6.335-1.652A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.875 0-3.632-.508-5.145-1.388l-.368-.22-3.821.997 1.018-3.715-.24-.382A9.71 9.71 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/>
                </svg>
                📩 Enviar conteúdo de {getMonthLabel(currentMonth)} para aprovação
              </button>
            </div>
          )}

          {/* Lista de posts do mês selecionado */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {currentPosts.map(p => {
              const ap = APPROVAL_STYLES[p.approval_status];
              return (
                <div key={p.id} onClick={() => setSelected(p)} style={{
                  background:"var(--ws-surface)",border:"1px solid var(--ws-border)",
                  borderLeft:`3px solid ${ap.color}`,borderRadius:10,
                  padding:"14px 18px",display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
                  <div style={{width:52,height:52,borderRadius:8,overflow:"hidden",
                    background:"var(--ws-surface2)",flexShrink:0,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {p.media_url
                      ? <img src={p.media_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      : <span style={{fontSize:"1.4rem"}}>
                          {p.media_type==="reels"?"🎬":p.media_type==="carousel"?"🎠":"🖼"}</span>
                    }
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:".88rem",color:"var(--ws-text)"}}>{p.slug||p.title||"Post"}</div>
                    {p.title&&p.slug&&<div style={{fontSize:".75rem",color:"var(--ws-text3)",marginTop:2}}>{p.title}</div>}
                    <div style={{fontSize:".72rem",color:"var(--ws-text2)",marginTop:3,fontFamily:"DM Mono"}}>
                      {p.scheduled_date
                        ? new Date(p.scheduled_date+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})
                        : "Sem data"}
                      {" · "}{p.media_type==="feed"?"Feed":p.media_type==="stories"?"Stories":
                              p.media_type==="reels"?"Reels":"Carrossel"}
                    </div>
                  </div>
                  <div style={{background:ap.bg,color:ap.color,borderRadius:20,
                    padding:"3px 10px",fontSize:".72rem",fontWeight:600}}>{ap.label}</div>
                  <button onClick={e=>{e.stopPropagation();removePost(p.id);}} style={{
                    background:"none",border:"none",color:"var(--ws-text3)",cursor:"pointer",fontSize:"1rem"}}>×</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {modal&&(
        <div style={overlayStyle} onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div style={{...modalBoxStyle,width:500}}>
            <div style={modalTitleStyle}>Novo post</div>

            <label className="ws-label">Nome no calendário</label>
            <input className="ws-input" value={form.slug} placeholder="Ex: Estático 02, Reels 03..."
              onChange={e=>setForm(f=>({...f,slug:e.target.value}))} style={{marginBottom:12}}/>

            <label className="ws-label">Título / tema</label>
            <input className="ws-input" value={form.title} placeholder="Assunto ou tema do post"
              onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={{marginBottom:12}}/>

            <label className="ws-label">Mídia</label>
            <div style={{height:90,borderRadius:10,border:"1px dashed var(--ws-border2)",
              display:"flex",alignItems:"center",justifyContent:"center",
              cursor:"pointer",marginBottom:8,background:"var(--ws-surface2)",overflow:"hidden"}}
              onClick={()=>fileRef.current?.click()}>
              {form.media_url
                ? <img src={form.media_url} alt="" style={{height:"100%",objectFit:"contain"}}/>
                : <div style={{color:"var(--ws-text3)",fontSize:".8rem"}}>
                    {uploading?"Enviando...":"Clique para enviar foto ou vídeo"}</div>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{display:"none"}}
              onChange={e=>e.target.files?.[0]&&uploadMedia(e.target.files[0])}/>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12,marginTop:8}}>
              <div><label className="ws-label">Tipo</label>
                <select className="ws-input" value={form.media_type}
                  onChange={e=>setForm(f=>({...f,media_type:e.target.value as any}))}>
                  <option value="feed">Feed (4:5)</option>
                  <option value="stories">Stories (9:16)</option>
                  <option value="reels">Reels (9:16)</option>
                  <option value="carousel">Carrossel (1:1)</option>
                </select></div>
              <div><label className="ws-label">Data agendada</label>
                <input className="ws-input" type="date" value={form.scheduled_date}
                  onChange={e=>setForm(f=>({...f,scheduled_date:e.target.value}))}/></div>
            </div>

            <label className="ws-label">Legenda</label>
            <textarea className="ws-input" value={form.caption} placeholder="Texto do post..."
              onChange={e=>setForm(f=>({...f,caption:e.target.value}))}
              style={{minHeight:80,resize:"vertical",marginBottom:12}}/>

            <label className="ws-label">Hashtags</label>
            <input className="ws-input" value={form.hashtags} placeholder="#marca #instagram..."
              onChange={e=>setForm(f=>({...f,hashtags:e.target.value}))} style={{marginBottom:12}}/>

            <label className="ws-label">Informações extras</label>
            <textarea className="ws-input" value={form.extra_info}
              placeholder="Briefing, referências, observações..."
              onChange={e=>setForm(f=>({...f,extra_info:e.target.value}))}
              style={{minHeight:60,resize:"vertical",marginBottom:20}}/>

            <div style={{display:"flex",gap:10}}>
              <button className="ws-btn" onClick={save} disabled={saving||uploading} style={{flex:1}}>
                {saving?"Salvando...":"Salvar post"}</button>
              <button className="ws-btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {selected&&<PostDetailModal post={selected} caseData={caseData}
        onClose={()=>setSelected(null)} onUpdate={updatePost} profile={profile}/>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: FINANCEIRO
═══════════════════════════════════════════════════════════════ */
function TabFinanceiro({caseData}:{caseData:Case}){
  const [payments,setPayments]=useState<Payment[]>([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({description:"",amount:"",due_date:"",paid:false,paid_date:""});
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    supabase.from("payments").select("*").eq("case_id",caseData.id).order("due_date")
      .then(({data})=>{ setPayments(data??[]); setLoading(false); });
  },[caseData.id]);

  async function save(){
    if(!form.description.trim()) return;
    setSaving(true);
    const {data}=await supabase.from("payments").insert({
      case_id:caseData.id,description:form.description,
      amount:parseFloat(form.amount)||0,due_date:form.due_date,
      paid:form.paid,paid_date:form.paid_date||null,
    }).select().single();
    if(data) setPayments(p=>[...p,data]);
    setSaving(false); setModal(false);
    setForm({description:"",amount:"",due_date:"",paid:false,paid_date:""});
  }

  async function togglePaid(p:Payment){
    const {data}=await supabase.from("payments")
      .update({paid:!p.paid,paid_date:!p.paid?new Date().toISOString().split("T")[0]:null})
      .eq("id",p.id).select().single();
    if(data) setPayments(prev=>prev.map(x=>x.id===p.id?data:x));
  }

  async function removePayment(id:string){
    setPayments(p=>p.filter(x=>x.id!==id));
    await supabase.from("payments").delete().eq("id",id);
  }

  const paid=payments.filter(p=>p.paid);
  const pending=payments.filter(p=>!p.paid);

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
        <div style={{background:"#00e67612",border:"1px solid #00e67630",borderRadius:12,padding:"16px 20px"}}>
          <div style={{fontFamily:"DM Mono",fontSize:".6rem",letterSpacing:"1.5px",color:"#00e676",marginBottom:6}}>RECEBIDO</div>
          <div style={{fontFamily:"Syne",fontWeight:800,fontSize:"1.3rem",color:"#00e676"}}>{fmt(paid.reduce((s,p)=>s+p.amount,0))}</div>
        </div>
        <div style={{background:"#ffd60012",border:"1px solid #ffd60030",borderRadius:12,padding:"16px 20px"}}>
          <div style={{fontFamily:"DM Mono",fontSize:".6rem",letterSpacing:"1.5px",color:"#ffd600",marginBottom:6}}>A VENCER</div>
          <div style={{fontFamily:"Syne",fontWeight:800,fontSize:"1.3rem",color:"#ffd600"}}>{fmt(pending.reduce((s,p)=>s+p.amount,0))}</div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button className="ws-btn" onClick={()=>setModal(true)}>+ Novo pagamento</button>
      </div>
      {loading?<Loader/>:payments.length===0?<Empty label="Nenhum pagamento cadastrado."/>:(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {pending.length>0&&<>
            <div style={{fontFamily:"DM Mono",fontSize:".6rem",letterSpacing:"1.5px",color:"var(--ws-text3)",marginBottom:4}}>A VENCER</div>
            {pending.map(p=><PaymentRow key={p.id} p={p} onToggle={togglePaid} onRemove={removePayment}/>)}
          </>}
          {paid.length>0&&<>
            <div style={{fontFamily:"DM Mono",fontSize:".6rem",letterSpacing:"1.5px",color:"var(--ws-text3)",marginTop:12,marginBottom:4}}>PAGOS</div>
            {paid.map(p=><PaymentRow key={p.id} p={p} onToggle={togglePaid} onRemove={removePayment}/>)}
          </>}
        </div>
      )}
      {modal&&(
        <div style={overlayStyle} onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div style={modalBoxStyle}>
            <div style={modalTitleStyle}>Novo pagamento</div>
            <label className="ws-label">Descrição</label>
            <input className="ws-input" value={form.description} placeholder="Ex: Mensalidade março"
              onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{marginBottom:12}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><label className="ws-label">Valor (R$)</label>
                <input className="ws-input" type="number" value={form.amount}
                  onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
              <div><label className="ws-label">Vencimento</label>
                <input className="ws-input" type="date" value={form.due_date}
                  onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}/></div>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:form.paid?12:20}}>
              <input type="checkbox" checked={form.paid} onChange={e=>setForm(f=>({...f,paid:e.target.checked}))}/>
              <span style={{fontSize:".83rem",color:"var(--ws-text2)"}}>Já pago</span>
            </label>
            {form.paid&&<>
              <label className="ws-label">Data de pagamento</label>
              <input className="ws-input" type="date" value={form.paid_date}
                onChange={e=>setForm(f=>({...f,paid_date:e.target.value}))} style={{marginBottom:16}}/>
            </>}
            <div style={{display:"flex",gap:10}}>
              <button className="ws-btn" onClick={save} disabled={saving} style={{flex:1}}>
                {saving?"Salvando...":"Salvar"}</button>
              <button className="ws-btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentRow({p,onToggle,onRemove}:{p:Payment;onToggle:(p:Payment)=>void;onRemove:(id:string)=>void}){
  const overdue=!p.paid&&p.due_date&&new Date(p.due_date)<new Date();
  return (
    <div style={{background:"var(--ws-surface)",
      border:`1px solid ${p.paid?"#00e67630":overdue?"#ff443330":"var(--ws-border)"}`,
      borderLeft:`3px solid ${p.paid?"#00e676":overdue?"#ff4433":"#ffd600"}`,
      borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,opacity:p.paid?0.7:1}}>
      <input type="checkbox" checked={p.paid} onChange={()=>onToggle(p)}
        style={{width:16,height:16,cursor:"pointer",accentColor:"#00e676"}}/>
      <div style={{flex:1}}>
        <div style={{fontSize:".87rem",color:"var(--ws-text)",fontWeight:600,
          textDecoration:p.paid?"line-through":"none"}}>{p.description}</div>
        <div style={{fontSize:".72rem",color:"var(--ws-text3)",fontFamily:"DM Mono",marginTop:2}}>
          {p.paid&&p.paid_date
            ? `Pago em ${new Date(p.paid_date+"T12:00:00").toLocaleDateString("pt-BR")}`
            : p.due_date ? `Vence ${new Date(p.due_date+"T12:00:00").toLocaleDateString("pt-BR")}${overdue?" · VENCIDO":""}` : "Sem data"}
        </div>
      </div>
      <div style={{fontFamily:"Syne",fontWeight:800,fontSize:".95rem",
        color:p.paid?"#00e676":overdue?"#ff4433":"#ffd600"}}>{fmt(p.amount)}</div>
      <button onClick={()=>onRemove(p.id)} style={{background:"none",border:"none",
        color:"var(--ws-text3)",cursor:"pointer",fontSize:"1rem"}}>×</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: DOCUMENTOS / CONTRATOS
═══════════════════════════════════════════════════════════════ */
function TabDocumentos({caseData,type}:{caseData:Case;type:"contrato"|"documento"}){
  const [docs,setDocs]=useState<Document[]>([]);
  const [loading,setLoading]=useState(true);
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const docType=type==="contrato"?"contrato":"outro";

  useEffect(()=>{
    supabase.from("documents").select("*").eq("case_id",caseData.id).eq("doc_type",docType)
      .then(({data})=>{ setDocs(data??[]); setLoading(false); });
  },[caseData.id,docType]);

  async function upload(file:File){
    setUploading(true);
    const ext=file.name.split(".").pop();
    const path=`docs/${caseData.id}/${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from("assets").upload(path,file,{upsert:true});
    if(!error){
      const {data:u}=supabase.storage.from("assets").getPublicUrl(path);
      const {data}=await supabase.from("documents").insert({
        case_id:caseData.id,name:file.name,file_url:u.publicUrl,
        doc_type:docType,uploaded_at:new Date().toISOString(),
      }).select().single();
      if(data) setDocs(p=>[...p,data]);
    }
    setUploading(false);
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button className="ws-btn" onClick={()=>fileRef.current?.click()} disabled={uploading}>
          {uploading?"Enviando...":`+ Enviar ${type==="contrato"?"contrato":"documento"}`}</button>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          style={{display:"none"}} onChange={e=>e.target.files?.[0]&&upload(e.target.files[0])}/>
      </div>
      {loading?<Loader/>:docs.length===0
        ?<Empty label={`Nenhum ${type==="contrato"?"contrato":"documento"} enviado ainda.`}/>:(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {docs.map(d=>(
            <div key={d.id} style={{background:"var(--ws-surface)",border:"1px solid var(--ws-border)",
              borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
              <div style={{fontSize:"1.8rem"}}>{d.name.endsWith(".pdf")?"📄":d.name.match(/\.(png|jpg|jpeg)$/)?"🖼":"📃"}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:".87rem",color:"var(--ws-text)"}}>{d.name}</div>
                <div style={{fontSize:".72rem",color:"var(--ws-text3)",fontFamily:"DM Mono",marginTop:2}}>
                  {new Date(d.uploaded_at).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}</div>
              </div>
              <a href={d.file_url} target="_blank" rel="noreferrer" style={{
                background:"var(--ws-surface2)",border:"1px solid var(--ws-border2)",
                borderRadius:6,color:"var(--ws-text2)",padding:"5px 12px",
                fontSize:".75rem",textDecoration:"none"}}>Abrir</a>
              <button onClick={async()=>{setDocs(p=>p.filter(x=>x.id!==d.id));await supabase.from("documents").delete().eq("id",d.id);}}
                style={{background:"none",border:"none",color:"var(--ws-text3)",cursor:"pointer",fontSize:"1rem"}}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: NOTAS (Trello-style + drag & drop + named labels)
═══════════════════════════════════════════════════════════════ */

interface NoteLabel { color: string; name: string; }

const DEFAULT_LABELS: NoteLabel[] = [
  {color:"#e91e8c", name:""},
  {color:"#ff6b35", name:""},
  {color:"#ffd600", name:""},
  {color:"#00e676", name:""},
  {color:"#4dabf7", name:""},
  {color:"#7b2fff", name:""},
  {color:"#aaa",    name:""},
];

function TabNotas({caseData,profile}:{caseData:Case;profile:Profile}){
  const [columns,setColumns]   = useState<NoteColumn[]>([]);
  const [cards,setCards]       = useState<NoteCard[]>([]);
  const [loading,setLoading]   = useState(true);
  const [newColTitle,setNewColTitle]=useState("");
  const [addingCol,setAddingCol]=useState(false);
  const [addingCard,setAddingCard]=useState<string|null>(null);
  const [newCardText,setNewCardText]=useState("");
  const [openCard,setOpenCard] = useState<NoteCard|null>(null);

  const dragCard   = useRef<string|null>(null);
  const dragOverCol= useRef<string|null>(null);
  const [dragOverColId, setDragOverColId]=useState<string|null>(null);

  useEffect(()=>{
    Promise.all([
      supabase.from("note_columns").select("*").eq("case_id",caseData.id).order("order"),
      supabase.from("note_cards").select("*").eq("case_id",caseData.id).order("order"),
    ]).then(([col,k])=>{ setColumns(col.data??[]); setCards(k.data??[]); setLoading(false); });
  },[caseData.id]);

  async function addColumn(){
    if(!newColTitle.trim()) return;
    const {data}=await supabase.from("note_columns").insert({
      case_id:caseData.id,title:newColTitle,order:columns.length,
    }).select().single();
    if(data) setColumns(p=>[...p,data]);
    setNewColTitle(""); setAddingCol(false);
  }

  async function removeColumn(id:string){
    setColumns(p=>p.filter(x=>x.id!==id)); setCards(p=>p.filter(x=>x.column_id!==id));
    await supabase.from("note_columns").delete().eq("id",id);
  }

  async function addCard(colId:string){
    if(!newCardText.trim()) return;
    const {data}=await supabase.from("note_cards").insert({
      case_id:caseData.id,column_id:colId,
      title:newCardText,description:"",checklist:[],comments:[],
      order:cards.filter(x=>x.column_id===colId).length,
    }).select().single();
    if(data) setCards(p=>[...p,data]);
    setNewCardText(""); setAddingCard(null);
  }

  async function updateCard(card:NoteCard){
    const {data}=await supabase.from("note_cards").update(card).eq("id",card.id).select().single();
    if(data){ setCards(p=>p.map(x=>x.id===card.id?data:x)); setOpenCard(data); }
  }

  async function removeCard(id:string){
    setCards(p=>p.filter(x=>x.id!==id)); setOpenCard(null);
    await supabase.from("note_cards").delete().eq("id",id);
  }

  function onDragStart(e:React.DragEvent, cardId:string){
    dragCard.current=cardId;
    e.dataTransfer.effectAllowed="move";
    (e.currentTarget as HTMLElement).style.opacity="0.4";
  }
  function onDragEnd(e:React.DragEvent){
    (e.currentTarget as HTMLElement).style.opacity="1";
    dragCard.current=null;
    setDragOverColId(null);
  }
  function onDragOverCol(e:React.DragEvent, colId:string){
    e.preventDefault();
    e.dataTransfer.dropEffect="move";
    dragOverCol.current=colId;
    setDragOverColId(colId);
  }
  function onDragLeaveCol(){
    setDragOverColId(null);
  }
  async function onDropCol(e:React.DragEvent, colId:string){
    e.preventDefault();
    setDragOverColId(null);
    const cardId=dragCard.current;
    if(!cardId||cardId==="") return;
    const card=cards.find(x=>x.id===cardId);
    if(!card||card.column_id===colId) return;
    const newOrder=cards.filter(x=>x.column_id===colId).length;
    const updated={...card,column_id:colId,order:newOrder};
    setCards(p=>p.map(x=>x.id===cardId?updated:x));
    await supabase.from("note_cards").update({column_id:colId,order:newOrder}).eq("id",cardId);
  }

  if(loading) return <Loader/>;

  return (
    <div style={{display:"flex",gap:16,overflowX:"auto",paddingBottom:16,alignItems:"flex-start"}}>
      {columns.map(col=>{
        const colCards=cards.filter(x=>x.column_id===col.id);
        const isDragTarget=dragOverColId===col.id;
        return (
          <div key={col.id}
            onDragOver={e=>onDragOverCol(e,col.id)}
            onDragLeave={onDragLeaveCol}
            onDrop={e=>onDropCol(e,col.id)}
            style={{
              background: isDragTarget?`${caseData.color}12`:"var(--ws-surface)",
              border:`1px solid ${isDragTarget?caseData.color:"var(--ws-border)"}`,
              borderRadius:12,padding:"12px 12px 8px",width:260,flexShrink:0,
              transition:"border-color .15s,background .15s",
            }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontFamily:"Syne",fontWeight:800,fontSize:".88rem",color:"var(--ws-text)"}}>{col.title}</div>
              <button onClick={()=>removeColumn(col.id)} style={{background:"none",border:"none",
                color:"var(--ws-text3)",cursor:"pointer",fontSize:".9rem",lineHeight:1}}>×</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,minHeight:8}}>
              {colCards.map(card=>{
                const done=(card.checklist||[]).filter(x=>x.done).length;
                const tot=(card.checklist||[]).length;
                let labelColor=""; let labelName="";
                if(card.label_color){
                  try{ const lbl=JSON.parse(card.label_color); labelColor=lbl.color||""; labelName=lbl.name||""; }
                  catch{ labelColor=card.label_color; }
                }
                return (
                  <div key={card.id}
                    draggable
                    onDragStart={e=>onDragStart(e,card.id)}
                    onDragEnd={onDragEnd}
                    onClick={()=>setOpenCard(card)}
                    style={{
                      background:"var(--ws-surface2)",border:"1px solid var(--ws-border)",
                      borderRadius:8,padding:"10px 12px",cursor:"grab",transition:"border-color .15s",
                      userSelect:"none",
                    }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=caseData.color}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="var(--ws-border)"}>
                    {labelColor&&(
                      <div style={{
                        display:"inline-flex",alignItems:"center",
                        background:labelColor,borderRadius:4,
                        padding: labelName?"2px 8px":"3px 20px",
                        marginBottom:6,fontSize:".62rem",fontWeight:700,
                        color:"#fff",textShadow:"0 1px 2px #00000040",
                        maxWidth:"100%",overflow:"hidden",
                      }}>
                        {labelName||""}
                      </div>
                    )}
                    <div style={{fontSize:".83rem",color:"var(--ws-text)",lineHeight:1.5}}>{card.title}</div>
                    <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                      {card.due_date&&(
                        <span style={{fontSize:".65rem",fontFamily:"DM Mono",padding:"2px 6px",borderRadius:4,
                          background:"var(--ws-border)",color:"var(--ws-text2)"}}>
                          📅 {new Date(card.due_date+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</span>
                      )}
                      {tot>0&&(
                        <span style={{fontSize:".65rem",fontFamily:"DM Mono",padding:"2px 6px",borderRadius:4,
                          background:done===tot?"#00e67622":"var(--ws-border)",
                          color:done===tot?"#00e676":"var(--ws-text2)"}}>
                          ✓ {done}/{tot}</span>
                      )}
                      {(card.comments||[]).length>0&&(
                        <span style={{fontSize:".65rem",fontFamily:"DM Mono",padding:"2px 6px",
                          borderRadius:4,background:"var(--ws-border)",color:"var(--ws-text2)"}}>
                          💬 {(card.comments||[]).length}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {addingCard===col.id?(
              <div style={{marginTop:8}}>
                <textarea value={newCardText} onChange={e=>setNewCardText(e.target.value)}
                  placeholder="Escreva o cartão..." autoFocus
                  style={{width:"100%",background:"var(--ws-surface2)",
                    border:`1px solid ${caseData.color}`,borderRadius:8,
                    color:"var(--ws-text)",padding:"8px 10px",fontSize:".82rem",
                    resize:"vertical",minHeight:72,fontFamily:"inherit",boxSizing:"border-box"}}
                  onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addCard(col.id);} }}/>
                <div style={{display:"flex",gap:6,marginTop:6}}>
                  <button onClick={()=>addCard(col.id)} style={{background:caseData.color,border:"none",
                    borderRadius:6,color:"#fff",padding:"5px 12px",fontSize:".78rem",cursor:"pointer",fontFamily:"inherit"}}>
                    Adicionar</button>
                  <button onClick={()=>{setAddingCard(null);setNewCardText("");}} style={{background:"none",
                    border:"none",color:"var(--ws-text3)",cursor:"pointer",fontSize:".78rem"}}>Cancelar</button>
                </div>
              </div>
            ):(
              <button onClick={()=>{setAddingCard(col.id);setNewCardText("");}} style={{
                background:"none",border:"none",color:"var(--ws-text3)",cursor:"pointer",
                width:"100%",textAlign:"left",fontSize:".78rem",padding:"8px 4px",marginTop:4,
                fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}
                onMouseEnter={e=>e.currentTarget.style.color="var(--ws-text)"}
                onMouseLeave={e=>e.currentTarget.style.color="var(--ws-text3)"}>
                + Adicionar um cartão</button>
            )}
          </div>
        );
      })}

      <div style={{width:240,flexShrink:0}}>
        {addingCol?(
          <div style={{background:"var(--ws-surface)",border:"1px solid var(--ws-border)",borderRadius:12,padding:12}}>
            <input value={newColTitle} onChange={e=>setNewColTitle(e.target.value)}
              placeholder="Título da lista" autoFocus className="ws-input"
              style={{marginBottom:8}} onKeyDown={e=>e.key==="Enter"&&addColumn()}/>
            <div style={{display:"flex",gap:6}}>
              <button onClick={addColumn} style={{background:caseData.color,border:"none",borderRadius:6,
                color:"#fff",padding:"5px 12px",fontSize:".78rem",cursor:"pointer",fontFamily:"inherit"}}>
                Adicionar lista</button>
              <button onClick={()=>{setAddingCol(false);setNewColTitle("");}} style={{background:"none",
                border:"none",color:"var(--ws-text3)",cursor:"pointer",fontSize:".78rem"}}>×</button>
            </div>
          </div>
        ):(
          <button onClick={()=>setAddingCol(true)} style={{
            background:"var(--ws-surface)",border:"1px dashed var(--ws-border2)",
            borderRadius:12,padding:"12px 16px",width:"100%",
            color:"var(--ws-text3)",cursor:"pointer",fontFamily:"inherit",
            fontSize:".82rem",display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=caseData.color;e.currentTarget.style.color=caseData.color;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--ws-border2)";e.currentTarget.style.color="var(--ws-text3)";}}>
            + Adicionar outra lista</button>
        )}
      </div>

      {openCard&&<NoteCardModal card={openCard} caseData={caseData}
        onClose={()=>setOpenCard(null)} onUpdate={updateCard}
        onDelete={removeCard} profile={profile}/>}
    </div>
  );
}

/* ─── Label Picker with names (Trello-style) ──────────────── */
function LabelPicker({value,onChange,accentColor}:
  {value:string;onChange:(v:string)=>void;accentColor:string}){
  const [labels,setLabels]=useState<NoteLabel[]>(()=>{
    try{ const s=localStorage.getItem("dig_labels"); if(s) return JSON.parse(s); }catch{}
    return DEFAULT_LABELS.map(l=>({...l}));
  });
  const [editIdx,setEditIdx]=useState<number|null>(null);
  const [editName,setEditName]=useState("");

  let selColor="";
  if(value){ try{ selColor=JSON.parse(value).color; }catch{ selColor=value; } }

  function saveLabel(idx:number,name:string){
    const next=labels.map((l,i)=>i===idx?{...l,name}:l);
    setLabels(next);
    try{ localStorage.setItem("dig_labels",JSON.stringify(next)); }catch{}
    setEditIdx(null);
    if(selColor===next[idx].color){
      onChange(JSON.stringify({color:next[idx].color,name}));
    }
  }

  function selectLabel(lbl:NoteLabel){
    const encoded=JSON.stringify({color:lbl.color,name:lbl.name});
    if(selColor===lbl.color) onChange("");
    else onChange(encoded);
  }

  return (
    <div>
      <div style={{...labelStyle,marginBottom:8}}>Etiqueta</div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {labels.map((lbl,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
            {editIdx===i?(
              <>
                <div style={{width:36,height:28,borderRadius:4,background:lbl.color,flexShrink:0,
                  border:selColor===lbl.color?"3px solid white":"3px solid transparent",
                  boxShadow:selColor===lbl.color?`0 0 0 2px ${lbl.color}`:"none",
                  cursor:"pointer"}} onClick={()=>selectLabel(lbl)}/>
                <input autoFocus value={editName} onChange={e=>setEditName(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter") saveLabel(i,editName); if(e.key==="Escape") setEditIdx(null); }}
                  placeholder="Nome da etiqueta"
                  style={{flex:1,background:"var(--ws-surface)",border:`1px solid ${accentColor}`,
                    borderRadius:5,color:"var(--ws-text)",padding:"4px 8px",fontSize:".78rem",
                    fontFamily:"inherit",outline:"none"}}/>
                <button onClick={()=>saveLabel(i,editName)} style={{background:accentColor,border:"none",
                  borderRadius:5,color:"#fff",padding:"4px 8px",cursor:"pointer",fontSize:".72rem",fontFamily:"inherit"}}>
                  ✓</button>
              </>
            ):(
              <>
                <div onClick={()=>selectLabel(lbl)} style={{
                  flex:1,height:28,borderRadius:4,background:lbl.color,cursor:"pointer",
                  border:selColor===lbl.color?"3px solid white":"3px solid transparent",
                  boxShadow:selColor===lbl.color?`0 0 0 2px ${lbl.color}`:"none",
                  transition:"all .15s",display:"flex",alignItems:"center",
                  paddingLeft:lbl.name?8:0,justifyContent:lbl.name?"flex-start":"center",
                }}>
                  {lbl.name&&<span style={{fontSize:".72rem",fontWeight:700,color:"#fff",
                    textShadow:"0 1px 2px #00000050"}}>{lbl.name}</span>}
                </div>
                <button onClick={()=>{setEditIdx(i);setEditName(lbl.name);}} style={{
                  background:"none",border:"1px solid var(--ws-border2)",borderRadius:4,
                  color:"var(--ws-text3)",cursor:"pointer",width:24,height:24,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:".7rem",
                  flexShrink:0}}
                  onMouseEnter={e=>{e.currentTarget.style.color="var(--ws-text)";e.currentTarget.style.borderColor="var(--ws-text2)";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="var(--ws-text3)";e.currentTarget.style.borderColor="var(--ws-border2)";}}>
                  ✎
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Note Card Detail Modal ──────────────────────────────── */
function NoteCardModal({card,caseData,onClose,onUpdate,onDelete,profile}:
  {card:NoteCard;caseData:Case;onClose:()=>void;onUpdate:(c:NoteCard)=>void;
   onDelete:(id:string)=>void;profile:Profile}){
  const [c,setC]           = useState<NoteCard>(card);
  const [editTitle,setEditTitle]=useState(false);
  const [titleVal,setTitleVal]=useState(card.title);
  const [editDesc,setEditDesc]=useState(false);
  const [newCheck,setNewCheck]=useState("");
  const [newComment,setNewComment]=useState("");

  async function save(updates:Partial<NoteCard>){
    const merged={...c,...updates}; setC(merged); onUpdate(merged);
  }
  function addCheckItem(){ if(!newCheck.trim()) return;
    save({checklist:[...(c.checklist||[]),{id:Date.now().toString(),text:newCheck,done:false}]});
    setNewCheck(""); }
  function toggleCheck(id:string){ save({checklist:(c.checklist||[]).map(x=>x.id===id?{...x,done:!x.done}:x)}); }
  function removeCheck(id:string){ save({checklist:(c.checklist||[]).filter(x=>x.id!==id)}); }
  function addComment(){ if(!newComment.trim()) return;
    save({comments:[...(c.comments||[]),{id:Date.now().toString(),
      author:profile.name||"Você",text:newComment,created_at:new Date().toISOString()}]});
    setNewComment(""); }

  let labelColor=""; let labelName="";
  if(c.label_color){
    try{ const lbl=JSON.parse(c.label_color); labelColor=lbl.color||""; labelName=lbl.name||""; }
    catch{ labelColor=c.label_color; }
  }

  const done=(c.checklist||[]).filter(x=>x.done).length;
  const tot=(c.checklist||[]).length;

  return (
    <div style={overlayStyle} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"var(--ws-surface)",borderRadius:16,
        width:"min(780px,95vw)",maxHeight:"90vh",overflowY:"auto",
        border:"1px solid var(--ws-border2)",boxShadow:"0 30px 80px #00000070",
        display:"grid",gridTemplateColumns:"1fr 260px"}}>
        <div style={{padding:"28px 24px",borderRight:"1px solid var(--ws-border)"}}>
          {labelColor&&(
            <div style={{
              display:"inline-flex",alignItems:"center",
              background:labelColor,borderRadius:4,
              padding:labelName?"3px 10px":"4px 24px",
              marginBottom:12,fontSize:".7rem",fontWeight:700,
              color:"#fff",textShadow:"0 1px 2px #00000040",
            }}>
              {labelName||""}
            </div>
          )}

          <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:20}}>
            <div style={{flex:1}}>
              {editTitle?(
                <div style={{display:"flex",gap:8}}>
                  <input className="ws-input" value={titleVal} autoFocus
                    onChange={e=>setTitleVal(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){save({title:titleVal});setEditTitle(false);}}}
                    style={{flex:1,fontFamily:"Syne",fontWeight:800,fontSize:"1.05rem"}}/>
                  <button onClick={()=>{save({title:titleVal});setEditTitle(false);}} style={{
                    background:caseData.color,border:"none",borderRadius:8,color:"#fff",
                    padding:"0 12px",cursor:"pointer"}}>✓</button>
                </div>
              ):(
                <div onClick={()=>{setEditTitle(true);setTitleVal(c.title);}} style={{
                  fontFamily:"Syne",fontWeight:800,fontSize:"1.05rem",color:"var(--ws-text)",
                  cursor:"pointer",padding:"4px 6px",borderRadius:6,
                  border:"1px solid transparent",transition:"border-color .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--ws-border2)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}>
                  {c.title}
                </div>
              )}
            </div>
            <button onClick={onClose} style={closeBtnStyle}>×</button>
          </div>

          <div style={{marginBottom:20}}>
            <div style={labelStyle}>Descrição</div>
            {editDesc?(
              <div>
                <RichEditor value={c.description||""} onChange={v=>setC(cc=>({...cc,description:v}))}
                  placeholder="Adicione uma descrição detalhada..."/>
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button onClick={()=>{save({description:c.description});setEditDesc(false);}} style={{
                    background:caseData.color,border:"none",borderRadius:6,color:"#fff",
                    padding:"6px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:".8rem"}}>Salvar</button>
                  <button onClick={()=>setEditDesc(false)} style={{background:"none",border:"none",
                    color:"var(--ws-text3)",cursor:"pointer",fontFamily:"inherit",fontSize:".8rem"}}>Cancelar</button>
                </div>
              </div>
            ):(
              <div onClick={()=>setEditDesc(true)} style={{minHeight:60,padding:"10px 12px",
                background:"var(--ws-surface2)",borderRadius:8,cursor:"pointer",
                border:"1px solid transparent",transition:"border-color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="var(--ws-border2)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}>
                {c.description
                  ? <div className="ws-richtext" style={{fontSize:".84rem",color:"var(--ws-text)",lineHeight:1.7}}
                      dangerouslySetInnerHTML={{__html:c.description}}/>
                  : <div style={{fontSize:".82rem",color:"var(--ws-text3)"}}>Clique para adicionar uma descrição...</div>
                }
              </div>
            )}
          </div>

          <div style={{marginBottom:20}}>
            <div style={labelStyle}>Checklist {tot>0&&`(${done}/${tot})`}</div>
            {tot>0&&<div style={{height:4,background:"var(--ws-border)",borderRadius:2,marginBottom:10,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,background:caseData.color,
                width:`${(done/tot)*100}%`,transition:"width .3s"}}/></div>}
            {(c.checklist||[]).map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <input type="checkbox" checked={item.done} onChange={()=>toggleCheck(item.id)}
                  style={{width:15,height:15,cursor:"pointer",accentColor:caseData.color}}/>
                <span style={{fontSize:".84rem",color:"var(--ws-text)",flex:1,
                  textDecoration:item.done?"line-through":"none",opacity:item.done?0.5:1}}>{item.text}</span>
                <button onClick={()=>removeCheck(item.id)} style={{background:"none",border:"none",
                  color:"var(--ws-text3)",cursor:"pointer",fontSize:".85rem"}}>×</button>
              </div>
            ))}
            <div style={{display:"flex",gap:6,marginTop:6}}>
              <input className="ws-input" value={newCheck} placeholder="Adicionar item..."
                onChange={e=>setNewCheck(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCheckItem()}
                style={{flex:1,padding:"6px 10px",fontSize:".8rem"}}/>
              <button onClick={addCheckItem} style={{background:caseData.color,border:"none",borderRadius:8,
                color:"#fff",padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:".8rem"}}>+</button>
            </div>
          </div>

          <div>
            <div style={labelStyle}>Comentários e atividade</div>
            {(c.comments||[]).map(cm=>(
              <div key={cm.id} style={{display:"flex",gap:10,marginBottom:14}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:caseData.color,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",fontSize:".75rem",fontWeight:700,flexShrink:0}}>
                  {cm.author.slice(0,1).toUpperCase()}</div>
                <div>
                  <div style={{fontSize:".78rem",color:"var(--ws-text2)",marginBottom:3}}>
                    <b style={{color:"var(--ws-text)"}}>{cm.author}</b>{" "}
                    <span style={{color:"var(--ws-text3)",fontFamily:"DM Mono",fontSize:".65rem"}}>
                      {new Date(cm.created_at).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                  <div style={{background:"var(--ws-surface2)",borderRadius:8,
                    padding:"8px 12px",fontSize:".83rem",color:"var(--ws-text)"}}>{cm.text}</div>
                </div>
              </div>
            ))}
            <div style={{display:"flex",gap:8}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:caseData.color,
                display:"flex",alignItems:"center",justifyContent:"center",
                color:"#fff",fontSize:".75rem",fontWeight:700,flexShrink:0}}>
                {(profile.name||"V").slice(0,1).toUpperCase()}</div>
              <div style={{flex:1}}>
                <textarea className="ws-input" value={newComment} onChange={e=>setNewComment(e.target.value)}
                  placeholder="Escrever um comentário..."
                  style={{minHeight:64,resize:"vertical",fontSize:".83rem",marginBottom:6}}/>
                <button onClick={addComment} style={{background:caseData.color,border:"none",borderRadius:8,
                  color:"#fff",padding:"6px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:".8rem"}}>
                  Comentar</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{padding:"28px 18px"}}>
          <div style={labelStyle}>Ações</div>
          <div style={{marginBottom:20}}>
            <LabelPicker
              value={c.label_color||""}
              onChange={v=>save({label_color:v})}
              accentColor={caseData.color}
            />
          </div>
          <div style={{marginBottom:20}}>
            <div style={labelStyle}>Data</div>
            <input type="date" className="ws-input" value={c.due_date||""}
              onChange={e=>save({due_date:e.target.value})} style={{fontSize:".8rem"}}/>
          </div>
          <button onClick={()=>onDelete(c.id)} style={{background:"none",border:"1px solid var(--ws-accent)",
            borderRadius:8,color:"var(--ws-accent)",cursor:"pointer",width:"100%",
            padding:"8px 0",fontSize:".8rem",fontFamily:"inherit",marginTop:8}}>
            × Excluir cartão</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CASE MODAL
═══════════════════════════════════════════════════════════════ */
function CaseModal({form,setForm,editing,saving,uploading,fileRef,uploadLogo,onSave,onClose}:any){
  return (
    <div style={overlayStyle} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...modalBoxStyle,width:500}}>
        <div style={modalTitleStyle}>{editing?"Editar case":"Novo case"}</div>
        <label className="ws-label">Logo / Capa</label>
        <div style={{height:90,borderRadius:10,overflow:"hidden",
          background:form.logo_url?undefined:`linear-gradient(135deg,${form.color}33,${form.color}11)`,
          border:"1px dashed var(--ws-border2)",display:"flex",alignItems:"center",
          justifyContent:"center",cursor:"pointer",marginBottom:8}}
          onClick={()=>fileRef.current?.click()}>
          {form.logo_url
            ? <img src={form.logo_url} alt="logo" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            : <div style={{color:"var(--ws-text3)",fontSize:".78rem"}}>{uploading?"Enviando...":"Clique para enviar logo"}</div>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
          onChange={e=>e.target.files?.[0]&&uploadLogo(e.target.files[0])}/>
        {form.logo_url&&<button onClick={()=>setForm((f:any)=>({...f,logo_url:""}))}
          style={{fontSize:".72rem",color:"var(--ws-accent)",background:"none",border:"none",cursor:"pointer",marginBottom:8}}>
          × Remover logo</button>}
        <label className="ws-label">Nome do cliente</label>
        <input className="ws-input" value={form.name} placeholder="Ex: Carlos Cavalheiro"
          onChange={e=>setForm((f:any)=>({...f,name:e.target.value}))} style={{marginBottom:12}}/>
        <label className="ws-label">Descrição</label>
        <input className="ws-input" value={form.description} placeholder="Ex: Gestão de conteúdo e estratégia"
          onChange={e=>setForm((f:any)=>({...f,description:e.target.value}))} style={{marginBottom:12}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div><label className="ws-label">Status</label>
            <select className="ws-input" value={form.status} onChange={e=>setForm((f:any)=>({...f,status:e.target.value}))}>
              <option value="ativo">Ativo</option><option value="pausado">Pausado</option><option value="encerrado">Encerrado</option>
            </select></div>
          <div><label className="ws-label">Segmento</label>
            <input className="ws-input" value={form.segment} placeholder="Ex: F&B, Liderança..."
              onChange={e=>setForm((f:any)=>({...f,segment:e.target.value}))}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div><label className="ws-label">Contato</label>
            <input className="ws-input" value={form.contact} placeholder="Nome ou e-mail"
              onChange={e=>setForm((f:any)=>({...f,contact:e.target.value}))}/></div>
          <div><label className="ws-label">Cliente desde</label>
            <input className="ws-input" value={form.since} placeholder="Ex: Jan 2024"
              onChange={e=>setForm((f:any)=>({...f,since:e.target.value}))}/></div>
        </div>
        <label className="ws-label">WhatsApp do cliente</label>
        <input className="ws-input" value={form.phone||""} placeholder="Ex: 5511999999999"
          onChange={e=>setForm((f:any)=>({...f,phone:e.target.value}))} style={{marginBottom:12}}/>
        <label className="ws-label">Cor do case</label>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {COLORS.map(c=>(<div key={c} onClick={()=>setForm((f:any)=>({...f,color:c}))} style={{
            width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",
            border:form.color===c?"3px solid white":"3px solid transparent",
            boxShadow:form.color===c?`0 0 0 2px ${c}`:"none",transition:"all .15s"}}/>))}
        </div>
        <label className="ws-label">Observações</label>
        <textarea className="ws-input" value={form.notes} placeholder="Anotações internas..."
          onChange={e=>setForm((f:any)=>({...f,notes:e.target.value}))}
          style={{minHeight:70,resize:"vertical",marginBottom:20}}/>
        <div style={{display:"flex",gap:10}}>
          <button className="ws-btn" onClick={onSave} disabled={saving||uploading} style={{flex:1}}>
            {saving?"Salvando...":editing?"Salvar alterações":"Criar case"}</button>
          <button className="ws-btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Global color fixes injected by Cases ──────────────────── */
const CasesGlobalStyle = () => (
  <style>{`
    .ws-cs-and  { color: #ffd600 !important; border-color: #ffd600 !important; }
    .ws-s-venc  { color: #ff6060 !important; border-color: #ff6060 !important; }
    .ws-cs-ativo{ color: #00e676 !important; border-color: #00e676 !important; }
    .ws-case-status { background: transparent !important; }
    .ws-richtext ul { list-style-type: disc; padding-left: 1.5em; margin: 4px 0; }
    .ws-richtext ol { list-style-type: decimal; padding-left: 1.5em; margin: 4px 0; }
    .ws-richtext li { margin: 2px 0; }
    .ws-richtext b, .ws-richtext strong { font-weight: 700; }
    .ws-richtext i, .ws-richtext em { font-style: italic; }
    .ws-richtext u { text-decoration: underline; }
    .ws-richtext s { text-decoration: line-through; }
  `}</style>
);

/* ─── Micro-components & Shared styles ───────────────────── */
const Loader=()=>(
  <div style={{color:"var(--ws-text3)",fontFamily:"DM Mono",fontSize:".8rem"}}>Carregando...</div>
);
const Empty=({label}:{label:string})=>(
  <div style={{textAlign:"center",color:"var(--ws-text3)",fontFamily:"DM Mono",
    fontSize:".75rem",padding:"48px 0"}}>{label}</div>
);
const overlayStyle: React.CSSProperties={
  position:"fixed",inset:0,background:"#00000085",zIndex:200,
  display:"flex",alignItems:"center",justifyContent:"center",
};
const modalBoxStyle: React.CSSProperties={
  background:"var(--ws-surface)",border:"1px solid var(--ws-border2)",
  borderRadius:20,padding:"32px 36px",width:500,
  maxHeight:"90vh",overflowY:"auto",boxShadow:"0 30px 80px #00000060",
};
const modalTitleStyle: React.CSSProperties={
  fontFamily:"Syne",fontWeight:800,fontSize:"1.2rem",
  color:"var(--ws-text)",marginBottom:22,
};
const labelStyle: React.CSSProperties={
  fontFamily:"DM Mono",fontSize:".58rem",letterSpacing:"1.5px",
  textTransform:"uppercase" as const,color:"var(--ws-text2)",marginBottom:6,display:"block",
};
const navBtnStyle: React.CSSProperties={
  background:"var(--ws-surface2)",border:"1px solid var(--ws-border2)",
  borderRadius:8,color:"var(--ws-text2)",width:32,height:32,
  cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center",
};
const closeBtnStyle: React.CSSProperties={
  background:"var(--ws-surface2)",border:"1px solid var(--ws-border2)",
  borderRadius:"50%",width:28,height:28,color:"var(--ws-text2)",
  cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
};