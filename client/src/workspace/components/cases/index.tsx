// client/src/workspace/components/cases/index.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import CaseModal from "./CaseModal";
import CaseWorkspace from "./CaseWorkspace";
import { EMPTY_CASE, STATUS_STYLES } from "./constants";
import Loader from "./shared/Loader";
import { CasesGlobalStyle } from "./styles";
import type { Case, CasesProps } from "./types";

const LS_OPEN_CASE = "ws_open_case_id";

// Adicionamos initialPost nas Props para receber o sinal da Dashboard
export default function Cases({ profile, onCaseOpen, onCaseClose, onCaseTabChange, onNavigateToPost, initialPost, initialCaseId, initialTab }: CasesProps & { onCaseOpen?: (id: string) => void; onCaseClose?: () => void; onCaseTabChange?: (caseId: string, tab: string) => void; onNavigateToPost?: (caseId: string, postId: string) => void; initialPost?: {caseId: string, postId: string} | null; initialCaseId?: string; initialTab?: string }) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCase, setOpenCase] = useState<Case | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Case | null>(null);
  const [form, setForm] = useState<Omit<Case, "id">>(EMPTY_CASE);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [clientAvatarUrl, setClientAvatarUrl] = useState<string>("");

  const fileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // EFEITO DE NAVEGAÇÃO AUTOMÁTICA via initialCaseId (URL)
  useEffect(() => {
    if (initialCaseId && cases.length > 0) {
      const found = cases.find(c => c.id === initialCaseId);
      if (found && (!openCase || openCase.id !== initialCaseId)) {
        setOpenCase(found);
      }
    }
    if (!initialCaseId && openCase) {
      setOpenCase(null);
    }
  }, [initialCaseId, cases]);

  // EFEITO DE NAVEGAÇÃO AUTOMÁTICA via initialPost
  useEffect(() => {
    if (initialPost && cases.length > 0) {
      const targetCase = cases.find(c => c.id === initialPost.caseId);
      if (targetCase) {
        selectCase(targetCase);
        // O ID do post é passado para o CaseWorkspace via window event ou prop interna
        // para ele saber que deve abrir o modal do post assim que carregar.
        (window as any)._pendingPostId = initialPost.postId;
      }
    }
  }, [initialPost, cases]);

  useEffect(() => {
    let mounted = true;
    async function loadCases() {
      setLoading(true);
      const { data } = await supabase.from("cases").select("*").order("created_at");
      if (mounted) {
        const list = data ?? [];
        setCases(list);
        setLoading(false);
      }
    }
    void loadCases();
    return () => { mounted = false; };
  }, []);

  function selectCase(caseItem: Case) {
    localStorage.setItem(LS_OPEN_CASE, caseItem.id);
    setOpenCase(caseItem);
    onCaseOpen?.(caseItem.id);
  }

  function closeCase() {
    localStorage.removeItem(LS_OPEN_CASE);
    setOpenCase(null);
    onCaseClose?.();
    (window as any)._pendingPostId = null;
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_CASE);
    setModal(true);
  }

  function openEdit(caseItem: Case) {
    setEditing(caseItem);
    // Fetch client avatar
    setClientAvatarUrl("");
    supabase.from("profiles").select("avatar_url").eq("case_id", caseItem.id).eq("role", "cliente").maybeSingle()
      .then(({ data }) => { if (data?.avatar_url) setClientAvatarUrl(data.avatar_url); });
    setForm({
      name: caseItem.name,
      description: caseItem.description,
      status: caseItem.status,
      color: caseItem.color,
      logo_url: caseItem.logo_url ?? "",
      segment: caseItem.segment ?? "",
      contact: caseItem.contact ?? "",
      phone: caseItem.phone ?? "",
      since: caseItem.since ?? "",
      notes: caseItem.notes ?? "",
      client_email: caseItem.client_email ?? "",
      instagram_username: caseItem.instagram_username ?? "",
      instagram_page_id: caseItem.instagram_page_id ?? "",
      facebook_page_id: caseItem.facebook_page_id ?? "",
      tiktok_username: caseItem.tiktok_username ?? "",
      tiktok_user_id: caseItem.tiktok_user_id ?? "",
      linkedin_url: caseItem.linkedin_url ?? "",
    });
    setModal(true);
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `cases/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("assets").getPublicUrl(path);
      setForm((prev) => ({ ...prev, logo_url: data.publicUrl }));
    }
    setUploading(false);
  }

  async function removeAvatar() {
    if (!editing) return;
    const { data: clientProfile } = await supabase
      .from("profiles").select("id").eq("case_id", editing.id).eq("role", "cliente").maybeSingle();
    if (clientProfile) {
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", clientProfile.id);
      setClientAvatarUrl("");
    }
  }

  async function uploadAvatar(file: File, onSuccess?: (url: string) => void) {
    setUploadingAvatar(true);
    const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";
    const ext = file.name.split(".").pop();
    const path = `avatars/case_${editing?.id ?? "new"}_${Date.now()}.${ext}`;
    try {
      const { data, error } = await supabase.functions.invoke("get-r2-upload-url", {
        body: { filename: path, contentType: file.type },
      });
      if (error || !data?.signedUrl) throw new Error("Erro ao gerar URL");
      const res = await fetch(data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (res.ok) {
        const url = `${R2_PUBLIC_URL}/${path}?t=${Date.now()}`;
        onSuccess?.(url);
        setClientAvatarUrl(url);
        // Salva no perfil do cliente vinculado
        if (editing) {
          const { data: clientProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("case_id", editing.id)
            .eq("role", "cliente")
            .maybeSingle();
          if (clientProfile) {
            await supabase.from("profiles").update({ avatar_url: url }).eq("id", clientProfile.id);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao enviar avatar:", err);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) {
      const { data, error } = await supabase.from("cases").update(form).eq("id", editing.id).select().single();
      if (error) {
        alert("Erro do Supabase ao atualizar: " + error.message);
      } else if (data) {
        setCases((prev) => prev.map((item) => (item.id === editing.id ? data : item)));
        if (openCase?.id === editing.id) setOpenCase(data);
      }
    } else {
      const { data, error } = await supabase.from("cases").insert(form).select().single();
      if (error) {
        alert("Erro do Supabase ao criar: " + error.message);
      } else if (data) {
        setCases((prev) => [...prev, data]);
      }
    }
    setSaving(false);
    if (!editing || (editing && openCase?.id === editing.id)) setModal(false);
  }

  async function remove(id: string) {
    setCases((prev) => prev.filter((item) => item.id !== id));
    if (openCase?.id === id) closeCase();
    await supabase.from("cases").delete().eq("id", id);
  }

  if (openCase) {
    return (
      <>
        <CaseWorkspace
          caseData={openCase}
          onBack={closeCase}
          onEdit={() => openEdit(openCase)}
          onDelete={() => void remove(openCase.id)}
          profile={profile}
          // Passamos o ID pendente para o workspace do cliente
          initialPostId={(window as any)._pendingPostId}
          initialTab={initialTab}
          onTabChange={(tabId: string) => onCaseTabChange?.(openCase.id, tabId)}
        />
        {modal && (
          <CaseModal
            form={form} setForm={setForm} editing={editing} saving={saving}
            uploading={uploading} fileRef={fileRef} uploadLogo={uploadLogo}
            uploadingAvatar={uploadingAvatar} avatarFileRef={avatarFileRef}
            uploadAvatar={(file, onSuccess) => void uploadAvatar(file, onSuccess)}
            currentAvatarUrl={clientAvatarUrl}
            onRemoveAvatar={removeAvatar}
            onSave={save} onClose={() => setModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="ws-page">
      <CasesGlobalStyle />
      <div className="ws-page-title">Clientes<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Clientes ativos e histórico de projetos</div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="ws-btn" onClick={openAdd}>+ Novo Cliente</button>
      </div>
      {loading ? ( <Loader /> ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
          {cases.map((caseItem) => (
            <div key={caseItem.id} className="ws-case" style={{ cursor: "pointer" }} onClick={() => selectCase(caseItem)}>
              <div className="ws-case-thumb" style={{ background: caseItem.logo_url ? undefined : `linear-gradient(135deg,${caseItem.color}33,${caseItem.color}11)`, position: "relative", overflow: "hidden" }}>
                {caseItem.logo_url ? ( <img src={caseItem.logo_url} alt={caseItem.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> ) : (
                  <span style={{ color: caseItem.color, fontSize: "2rem" }}>{caseItem.name.slice(0, 2).toUpperCase()}</span>
                )}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: caseItem.color }} />
              </div>
              <div className="ws-case-body">
                <div className="ws-case-name">{caseItem.name}</div>
                <div className="ws-case-desc">{caseItem.description || "—"}</div>
                <span className={`ws-case-status ${STATUS_STYLES[caseItem.status]}`}>{caseItem.status}</span>
              </div>
            </div>
          ))}
          <div onClick={openAdd} style={{ background: "transparent", border: "2px dashed var(--ws-border2)", borderRadius: "var(--ws-radius)", minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, cursor: "pointer", color: "var(--ws-text3)", fontSize: ".8rem", transition: "all .15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ws-accent)"; e.currentTarget.style.color = "var(--ws-accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--ws-border2)"; e.currentTarget.style.color = "var(--ws-text3)"; }}
          >
            <div style={{ fontSize: "1.6rem" }}>+</div>
            <div style={{ fontFamily: "Poppins", fontSize: ".62rem", letterSpacing: "1px" }}>NOVO CLIENTE</div>
          </div>
        </div>
      )}
      {modal && (
        <CaseModal
          form={form} setForm={setForm} editing={editing} saving={saving}
          uploading={uploading} fileRef={fileRef} uploadLogo={uploadLogo}
          onSave={save} onClose={() => setModal(false)}
        />
      )}
    </div>
  );
}