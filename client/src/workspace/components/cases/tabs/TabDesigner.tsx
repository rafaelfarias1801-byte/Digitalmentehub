// client/src/workspace/components/cases/tabs/TabDesigner.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "../../../../lib/supabaseClient";
import Empty from "../shared/Empty";
import Loader from "../shared/Loader";
import { modalBoxStyle, modalTitleStyle, getOverlayStyle } from "../styles";
import { useIsMobile } from "../../../hooks/useIsMobile";
import type { Case, Designer, Briefing, BrandIdentity, DesignerClosing } from "../types";
import { notifyAdmins, notifyDesigner } from "../../../../utils/notifyPush";

interface TabDesignerProps {
  caseData: Case;
  readonly?: boolean;
}

function deadlineStatus(deadline: string): "ok" | "warning" | "overdue" {
  const d = new Date(`${deadline}T23:59:59`);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "warning";
  return "ok";
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const status = deadlineStatus(deadline);
  const cfg = {
    ok:      { color: "#00a864", bg: "rgba(0,180,100,0.10)", icon: "" },
    warning: { color: "#b08800", bg: "rgba(255,214,0,0.12)", icon: "⚠️ " },
    overdue: { color: "#d63232", bg: "rgba(220,50,50,0.12)", icon: "🚨 " },
  }[status];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 6, padding: "2px 8px", fontSize: ".68rem", fontFamily: "Poppins", fontWeight: 600 }}>
      {cfg.icon}Prazo: {new Date(`${deadline}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
    </span>
  );
}

const STATUS_CFG: Record<Briefing["status"], { bg: string; color: string; label: string; dot: string }> = {
  aguardando: { bg: "rgba(255,214,0,0.10)",  color: "#b08800", label: "Aguardando entrega", dot: "#ffd600" },
  entregue:   { bg: "rgba(75,100,255,0.10)", color: "#4b6bff", label: "Entregue",           dot: "#4b6bff" },
  revisao:    { bg: "rgba(255,107,53,0.10)", color: "#ff6b35", label: "Em revisão",         dot: "#ff6b35" },
  aprovado:   { bg: "rgba(0,180,100,0.12)",  color: "#00a864", label: "Aprovado",           dot: "#00e676" },
};

const FORMAT_OPTIONS = ["Reels", "Carrossel", "Feed / Estático", "Story", "Banner", "Outro"];
const EMPTY_BRIEFING = { format: "", reference_text: "", reference_links: "", deadline: "" };
const EMPTY_DESIGNER = { name: "", email: "", phone: "", password: "" };
const EMPTY_BRAND: BrandIdentity = { colors: [], fonts: [], links: [], style_notes: "", warnings: "" };

// ═══════════════════════════════════════════════════════════
export default function TabDesigner({ caseData, readonly = false }: TabDesignerProps) {
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();

  // Parse briefing ID from URL (e.g. /workspace/clientes/:id/designer/briefing/:briefingId)
  const briefingUrlMatch = location.match(/\/workspace\/clientes\/[^/]+\/designer\/briefing\/([^/]+)/);
  const urlBriefingId = briefingUrlMatch?.[1] ?? null;

  const [view, setView]                       = useState<"cards" | "workspace">("cards");
  const [activeDesigner, setActiveDesigner]   = useState<Designer | null>(null);
  const [activeClientId, setActiveClientId]   = useState<string>(caseData.id);
  const [activeSubTab, setActiveSubTab]       = useState<"identidade" | "briefings" | "financeiro">("briefings");
  const [closings, setClosings]               = useState<DesignerClosing[]>([]);
  const [approvingClosing, setApprovingClosing] = useState<string | null>(null);

  const [designers, setDesigners]             = useState<Designer[]>([]);
  const [designerProfiles, setDesignerProfiles] = useState<Record<string, { name: string; avatar_url?: string }>>({});
  const [briefings, setBriefings]             = useState<Briefing[]>([]);
  const [brandIdentity, setBrandIdentity]     = useState<BrandIdentity>(EMPTY_BRAND);
  const [designerCases, setDesignerCases]     = useState<Case[]>([]);
  const [allCases, setAllCases]               = useState<Case[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  const [designerModal, setDesignerModal]     = useState(false);
  const [briefingModal, setBriefingModal]     = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [uploading, setUploading]             = useState(false);

  const [designerForm, setDesignerForm]       = useState(EMPTY_DESIGNER);
  const [editingDesigner, setEditingDesigner] = useState<Designer | null>(null);
  const [briefingForm, setBriefingForm]       = useState(EMPTY_BRIEFING);
  const [briefingImages, setBriefingImages]   = useState<File[]>([]);
  const [brandForm, setBrandForm]             = useState<BrandIdentity>(EMPTY_BRAND);
  const [editingBrand, setEditingBrand]       = useState(false);
  const [previewImg, setPreviewImg]         = useState<string | null>(null);
  const [revisionText, setRevisionText]       = useState("");
  const [editingBriefing, setEditingBriefing] = useState<Briefing | null>(null);
  const [editBriefingForm, setEditBriefingForm] = useState(EMPTY_BRIEFING);
  const [savingEdit, setSavingEdit]           = useState(false);
  const [editingValue, setEditingValue]       = useState("");
  const [savingValue, setSavingValue]         = useState(false);

  const imgInputRef = useRef<HTMLInputElement>(null);
  const replaceRefRef = useRef<HTMLInputElement>(null);
  const dragRefImgIdx = useRef<number | null>(null);
  const [dragOverRefImg, setDragOverRefImg] = useState<number | null>(null);
  const [replacingRefImg, setReplacingRefImg] = useState<number | null>(null);
  const R2 = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [{ data: ds }, { data: cs }] = await Promise.all([
        supabase.from("designers").select("*").order("name"),
        supabase.from("cases").select("id, name, color, logo_url, status").order("name"),
      ]);
      if (mounted) {
        setDesigners(ds ?? []);
        setAllCases(cs ?? []);
        // Busca profiles para avatar e nome correto
        if (ds && ds.length > 0) {
          const ids = ds.map((d: any) => d.id);
          const { data: profs } = await supabase.from("profiles").select("id, name, avatar_url").in("id", ids);
          const map: Record<string, { name: string; avatar_url?: string }> = {};
          (profs ?? []).forEach((p: any) => { map[p.id] = { name: p.name, avatar_url: p.avatar_url }; });
          setDesignerProfiles(map);
        }
        setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  async function openDesigner(designer: Designer) {
    setActiveDesigner(designer);
    setActiveClientId(caseData.id);
    setActiveSubTab("briefings");
    setView("workspace");
    setLoadingWorkspace(true);

    // Carrega clientes de designer_cases (vínculo permanente)
    const { data: dcRows } = await supabase
      .from("designer_cases")
      .select("case_id")
      .eq("designer_id", designer.id);

    const caseIds = (dcRows ?? []).map((r: any) => r.case_id as string);
    setDesignerCases(allCases.filter(c => caseIds.includes(c.id)));

    await loadClientData(designer.id, caseData.id);
    setLoadingWorkspace(false);
  }

  async function loadClientData(designerId: string, clientId: string) {
    const [{ data: bf }, { data: bi }, { data: cl }] = await Promise.all([
      supabase.from("briefings").select("*").eq("designer_id", designerId).eq("case_id", clientId).order("created_at", { ascending: false }),
      supabase.from("brand_identity").select("*").eq("case_id", clientId).maybeSingle(),
      supabase.from("designer_closings").select("*").eq("designer_id", designerId).order("year", { ascending: false }).order("month", { ascending: false }),
    ]);
    setBriefings(bf ?? []);
    const identity = bi ?? EMPTY_BRAND;
    setBrandIdentity(identity);
    setBrandForm(identity);
    setClosings(cl ?? []);
  }

  async function switchClient(clientId: string) {
    if (!activeDesigner) return;
    setActiveClientId(clientId);
    setLoadingWorkspace(true);
    await loadClientData(activeDesigner.id, clientId);
    setLoadingWorkspace(false);
  }

  async function saveDesigner() {
    if (!designerForm.name || !designerForm.email || !designerForm.password) return;
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: designerForm.email, password: designerForm.password,
        options: { data: { name: designerForm.name, role: "designer" } },
      });

      if (authError) {
        alert(`Erro ao criar acesso: ${authError.message}`);
        setSaving(false);
        return;
      }

      if (!authData.user) {
        alert("Erro: usuário não foi criado. Verifique se o email já está em uso.");
        setSaving(false);
        return;
      }

      // Confirma o email automaticamente via SQL (sem precisar de Edge Function)
      await supabase.rpc("confirm_user_email", { user_id: authData.user.id }).maybeSingle();

      const { data, error: dbError } = await supabase.from("designers").insert({
        id: authData.user.id, name: designerForm.name,
        email: designerForm.email, phone: designerForm.phone || null,
        created_at: new Date().toISOString(),
      }).select().single();

      if (dbError) {
        alert(`Erro ao salvar designer: ${dbError.message}`);
        setSaving(false);
        return;
      }

      if (data) setDesigners(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setDesignerForm(EMPTY_DESIGNER);
      setDesignerModal(false);
    } catch (err: any) {
      alert(`Erro inesperado: ${err?.message ?? err}`);
    }
    setSaving(false);
  }

  async function updateDesigner() {
    if (!editingDesigner || !designerForm.name || !designerForm.email) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("designers")
      .update({ name: designerForm.name, email: designerForm.email, phone: designerForm.phone || null })
      .eq("id", editingDesigner.id)
      .select()
      .single();
    if (error) { alert(`Erro: ${error.message}`); setSaving(false); return; }
    if (data) {
      setDesigners(prev => prev.map(d => d.id === data.id ? data : d).sort((a, b) => a.name.localeCompare(b.name)));
      if (activeDesigner?.id === data.id) setActiveDesigner(data);
    }
    setEditingDesigner(null);
    setDesignerForm(EMPTY_DESIGNER);
    setDesignerModal(false);
    setSaving(false);
  }

  async function uploadImages(files: File[], prefix: string): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.functions.invoke("get-r2-upload-url", { body: { filename: path, contentType: file.type } });
      if (error || !data?.signedUrl) continue;
      const res = await fetch(data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (res.ok) urls.push(`${R2}/${path}`);
    }
    return urls;
  }

  async function saveBriefing() {
    if (!activeDesigner || !briefingForm.format || !briefingForm.deadline) return;
    setSaving(true); setUploading(briefingImages.length > 0);
    const imageUrls = briefingImages.length > 0 ? await uploadImages(briefingImages, `briefings/${activeClientId}`) : [];
    const links = briefingForm.reference_links.split("\n").map(l => l.trim()).filter(Boolean);
    const { data } = await supabase.from("briefings").insert({
      case_id: activeClientId, designer_id: activeDesigner.id,
      format: briefingForm.format, reference_text: briefingForm.reference_text,
      reference_links: links, reference_images: imageUrls,
      deadline: briefingForm.deadline, status: "aguardando",
      created_at: new Date().toISOString(),
    }).select().single();
    if (data) {
      setBriefings(prev => [data, ...prev]);

      // Notifica designer sobre novo briefing
      const caseName = allCases.find(c => c.id === activeClientId)?.name ?? activeClientId;
      void notifyDesigner({ designer_id: activeDesigner.id, type: "briefing_criado", title: "📋 Novo briefing para você", body: `Briefing "${briefingForm.format}" do cliente ${caseName} foi criado. Acesse o Workspace Dig.`, format: briefingForm.format, case_name: caseName } as any);

      // Vínculo permanente em designer_cases
      await supabase.from("designer_cases").upsert(
        { designer_id: activeDesigner!.id, case_id: activeClientId },
        { onConflict: "designer_id,case_id" }
      );
      const currentCase = allCases.find(c => c.id === activeClientId);
      if (currentCase && !designerCases.find(c => c.id === activeClientId)) {
        setDesignerCases(prev => [...prev, currentCase]);
      }
    }
    setBriefingForm(EMPTY_BRIEFING); setBriefingImages([]);
    setBriefingModal(false); setSaving(false); setUploading(false);
  }

  async function saveBrand() {
    setSaving(true);
    const existing = brandIdentity as any;
    if (existing?.id) {
      await supabase.from("brand_identity").update({ ...brandForm, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("brand_identity").insert({ ...brandForm, case_id: activeClientId, updated_at: new Date().toISOString() });
    }
    setBrandIdentity(brandForm); setEditingBrand(false); setSaving(false);
  }

  async function saveBriefingEdit() {
    if (!editingBriefing) return;
    setSavingEdit(true);
    const links = editBriefingForm.reference_links.split("\n").map(l => l.trim()).filter(Boolean);
    const { data } = await supabase.from("briefings").update({
      format: editBriefingForm.format,
      reference_text: editBriefingForm.reference_text,
      reference_links: links,
      deadline: editBriefingForm.deadline,
    }).eq("id", editingBriefing.id).select().single();
    if (data) {
      setBriefings(prev => prev.map(b => b.id === data.id ? data : b));
    }
    setEditingBriefing(null);
    setSavingEdit(false);
  }

  async function saveDesignerValue(b: Briefing) {
    const val = parseFloat(editingValue);
    if (isNaN(val)) return;
    setSavingValue(true);
    const { data } = await supabase
      .from("briefings")
      .update({ designer_value: val })
      .eq("id", b.id)
      .select()
      .single();
    if (data) {
      setBriefings(prev => prev.map(x => x.id === b.id ? data : x));
    }
    setSavingValue(false);
  }

  async function approveBriefing(b: Briefing) {
    const { data } = await supabase.from("briefings").update({ status: "aprovado" }).eq("id", b.id).select().single();
    if (data) {
      setBriefings(prev => prev.map(x => x.id === b.id ? data : x));

      // Notifica designer que arte foi aprovada
      const caseName = allCases.find(c => c.id === activeClientId)?.name ?? "";
      void notifyDesigner({ designer_id: activeDesigner!.id, type: "briefing_aprovado", title: "✅ Arte aprovada!", body: `Seu trabalho em "${b.format}" para ${caseName} foi aprovado pela Dig.`, format: b.format, case_name: caseName } as any);
    }
  }

  async function requestRevision(b: Briefing) {
    if (!revisionText.trim()) return;
    const { data } = await supabase.from("briefings").update({ status: "revisao", revision_note: revisionText.trim() }).eq("id", b.id).select().single();
    if (data) {
      setBriefings(prev => prev.map(x => x.id === b.id ? data : x));
      setRevisionText("");

      // Notifica designer sobre revisão
      const caseName = allCases.find(c => c.id === activeClientId)?.name ?? "";
      void notifyDesigner({ designer_id: activeDesigner!.id, type: "briefing_revisao", title: "🔄 Revisão solicitada", body: `O briefing "${b.format}" de ${caseName} precisa de ajustes. Acesse o Workspace Dig.`, format: b.format, case_name: caseName } as any);
    }
  }

  async function deleteBriefing(id: string) {
    if (!window.confirm("Excluir este briefing?")) return;
    setBriefings(prev => prev.filter(b => b.id !== id));
    await supabase.from("briefings").delete().eq("id", id);
    if (urlBriefingId === id) setLocation(`/workspace/clientes/${caseData.id}/designer`);
  }

  const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  function fmtMoney(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

  async function approveClosing(closing: DesignerClosing) {
    if (!activeDesigner) return;
    setApprovingClosing(closing.id ?? null);
    try {
      // Marca como aprovado
      await supabase.from("designer_closings")
        .update({ approved_at: new Date().toISOString() })
        .eq("designer_id", closing.designer_id)
        .eq("month", closing.month)
        .eq("year", closing.year);

      // Lança no financeiro global como pagamento para o designer
      const monthLabel = `${MONTHS_PT[closing.month - 1]}/${closing.year}`;
      const designerName = activeDesigner.name;
      await supabase.from("financial").insert({
        description: `Pagamento designer — ${designerName} — ${monthLabel}`,
        type: "pagamento",
        due_date: closing.payment_date ?? new Date().toISOString().slice(0, 10),
        amount: closing.total_final,
        positive: false,
        status: "pendente",
        related_name: designerName,
        notes: `Fechamento aprovado via workspace. Total bruto: ${fmtMoney(closing.total_bruto)}${closing.discount ? ` | Desconto: ${fmtMoney(closing.discount)}` : ""}${closing.notes ? ` | ${closing.notes}` : ""}`,
        created_at: new Date().toISOString(),
      });

      // Notifica designer
      void notifyDesigner({
        designer_id: activeDesigner.id,
        type: "financeiro_aprovado",
        title: "💰 Financeiro aprovado",
        body: `Seu fechamento de ${monthLabel} foi aprovado. Valor: ${fmtMoney(closing.total_final)}${closing.payment_date ? `. Pagamento: ${new Date(closing.payment_date + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}.`,
        month: closing.month,
        year: closing.year,
        total_final: closing.total_final,
        payment_date: closing.payment_date,
      } as any);

      // Atualiza lista local
      setClosings(prev => prev.map(c =>
        c.month === closing.month && c.year === closing.year
          ? { ...c, approved_at: new Date().toISOString() }
          : c
      ));
    } catch (err) {
      console.error("Erro ao aprovar fechamento:", err);
    } finally {
      setApprovingClosing(null);
    }
  }

  // Derived from URL — no useState needed
  const detailBriefing = urlBriefingId ? (briefings.find(b => b.id === urlBriefingId) ?? null) : null;

  const activeCase = allCases.find(c => c.id === activeClientId) ?? caseData;

  // ════════════════════════════════════════
  //  VIEW — CARDS
  // ════════════════════════════════════════
  if (view === "cards") {
    return (
      <div>
        {!readonly && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={{ fontSize: ".78rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>{designers.length} designer{designers.length !== 1 ? "s" : ""} cadastrado{designers.length !== 1 ? "s" : ""}</div>
            <button className="ws-btn" onClick={() => setDesignerModal(true)}>+ Novo designer</button>
          </div>
        )}

        {loading ? <Loader /> : designers.length === 0 ? <Empty label="Nenhum designer cadastrado ainda." /> : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {designers.map(d => (
              <div key={d.id} onClick={() => void openDesigner(d)}
                style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "border-color .15s, transform .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = caseData.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ws-border)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ height: 72, background: `linear-gradient(135deg, ${caseData.color}33, ${caseData.color}11)`, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${caseData.color}22` }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", border: `2px solid ${caseData.color}44`, flexShrink: 0 }}>
                    {designerProfiles[d.id]?.avatar_url ? (
                      <img src={designerProfiles[d.id].avatar_url} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${caseData.color}55, ${caseData.color}33)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem", color: caseData.color }}>
                        {(designerProfiles[d.id]?.name || d.name).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)", marginBottom: 2 }}>{designerProfiles[d.id]?.name || d.name}</div>
                  <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.email}</div>
                  {d.phone && <div style={{ fontSize: ".65rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>{d.phone}</div>}
                  {!readonly && (
                    <button
                      onClick={e => { e.stopPropagation(); setEditingDesigner(d); setDesignerForm({ name: d.name, email: d.email, phone: d.phone ?? "", password: "" }); setDesignerModal(true); }}
                      style={{ marginTop: 8, background: "var(--ws-surface2)", border: "1px solid var(--ws-border)", borderRadius: 6, color: "var(--ws-text3)", cursor: "pointer", fontSize: ".65rem", padding: "3px 10px", fontFamily: "Poppins" }}
                    >✎ Editar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {designerModal && (
          <div style={getOverlayStyle(isMobile)} onClick={e => e.target === e.currentTarget && setDesignerModal(false)}>
            <div style={{ ...modalBoxStyle, maxWidth: 420, width: "100%" }}>
              <div style={modalTitleStyle}>{editingDesigner ? "Editar designer" : "Novo designer / parceiro"}</div>
              <label className="ws-label">Nome *</label>
              <input className="ws-input" placeholder="Nome completo" value={designerForm.name} onChange={e => setDesignerForm(p => ({ ...p, name: e.target.value }))} style={{ marginBottom: 12 }} />
              <label className="ws-label">E-mail (login) *</label>
              <input className="ws-input" type="email" placeholder="designer@email.com" value={designerForm.email} onChange={e => setDesignerForm(p => ({ ...p, email: e.target.value }))} style={{ marginBottom: 12 }} />
              <label className="ws-label">Telefone / WhatsApp</label>
              <input className="ws-input" placeholder="(41) 99999-9999" value={designerForm.phone} onChange={e => setDesignerForm(p => ({ ...p, phone: e.target.value }))} style={{ marginBottom: 12 }} />
              {!editingDesigner && (
                <>
                  <label className="ws-label">Senha de acesso *</label>
                  <input className="ws-input" type="password" placeholder="Mínimo 8 caracteres" value={designerForm.password} onChange={e => setDesignerForm(p => ({ ...p, password: e.target.value }))} style={{ marginBottom: 18 }} />
                </>
              )}
              {editingDesigner && <div style={{ marginBottom: 18 }} />}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="ws-btn" onClick={() => editingDesigner ? void updateDesigner() : void saveDesigner()} disabled={saving || !designerForm.name || !designerForm.email || (!editingDesigner && !designerForm.password)} style={{ flex: 1 }}>{saving ? "Salvando..." : editingDesigner ? "Salvar alterações" : "Criar acesso"}</button>
                <button className="ws-btn-ghost" onClick={() => { setDesignerModal(false); setDesignerForm(EMPTY_DESIGNER); setEditingDesigner(null); }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  //  VIEW — WORKSPACE DO DESIGNER
  // ════════════════════════════════════════
  return (
    <div style={{ display: "flex", gap: 0, minHeight: 520, border: "1px solid var(--ws-border)", borderRadius: 14, overflow: "hidden" }}>

      {/* Sidebar clientes */}
      <div style={{ width: 176, flexShrink: 0, borderRight: "1px solid var(--ws-border)", background: "var(--ws-surface)", display: "flex", flexDirection: "column" }}>
        <button onClick={() => setView("cards")} style={{ background: "none", border: "none", borderBottom: "1px solid var(--ws-border)", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".68rem", fontFamily: "Poppins", letterSpacing: "1px", padding: "10px 14px", textAlign: "left" }}>
          ← Designers
        </button>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--ws-border)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg, ${caseData.color}55, ${caseData.color}22)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: ".85rem", color: caseData.color, marginBottom: 6 }}>
            {(activeDesigner as any)?.avatar_url
            ? <img src={(activeDesigner as any).avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }} />
            : activeDesigner?.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--ws-text)" }}>{activeDesigner?.name}</div>
          <div style={{ fontSize: ".62rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeDesigner?.email}</div>
        </div>
        <div style={{ fontSize: ".55rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", padding: "10px 14px 4px" }}>Clientes</div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {designerCases.length === 0 ? (
            <div style={{ padding: "14px", fontSize: ".7rem", color: "var(--ws-text3)", fontFamily: "Poppins", lineHeight: 1.5, textAlign: "center", marginTop: 8 }}>
              Nenhum cliente vinculado ainda. Crie um briefing.
            </div>
          ) : (() => {
            const ativos    = designerCases.filter(c => c.status === "ativo");
            const pausados  = designerCases.filter(c => c.status === "pausado");
            const encerrados = designerCases.filter(c => c.status === "encerrado");
            const allAtivos = pausados.length === 0 && encerrados.length === 0;

            const renderClient = (c: Case) => (
              <button key={c.id} onClick={() => void switchClient(c.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: activeClientId === c.id ? `${c.color}18` : "none", border: "none", borderLeft: activeClientId === c.id ? `2px solid ${c.color}` : "2px solid transparent", color: activeClientId === c.id ? c.color : "var(--ws-text2)", cursor: "pointer", fontSize: ".78rem", padding: "8px 14px", textAlign: "left", fontFamily: "inherit", transition: "all .15s" }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, background: `${c.color}33`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".5rem", fontWeight: 800, color: c.color }}>
                  {c.logo_url ? <img src={c.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : c.name.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              </button>
            );

            const GroupLabel = ({ label }: { label: string }) => (
              <div style={{ fontSize: ".52rem", fontFamily: "Poppins", letterSpacing: "1px", textTransform: "uppercase", color: "var(--ws-text3)", padding: "8px 14px 2px" }}>{label}</div>
            );

            if (allAtivos) return <>{ativos.map(renderClient)}</>;

            return <>
              {ativos.length > 0 && <><GroupLabel label="Ativos" />{ativos.map(renderClient)}</>}
              {pausados.length > 0 && <><GroupLabel label="Pausados" />{pausados.map(renderClient)}</>}
              {encerrados.length > 0 && <><GroupLabel label="Encerrados" />{encerrados.map(renderClient)}</>}
            </>;
          })()}
        </div>

      </div>

      {/* Área principal */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--ws-bg)", minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: "14px 20px 0", borderBottom: "1px solid var(--ws-border)", background: "var(--ws-surface)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1rem", color: "var(--ws-text)" }}>{activeCase.name}<span style={{ color: activeCase.color }}>.</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, background: `linear-gradient(135deg, ${caseData.color}55, ${caseData.color}22)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".5rem", fontWeight: 800, color: caseData.color, flexShrink: 0 }}>
                  {(activeDesigner as any)?.avatar_url
            ? <img src={(activeDesigner as any).avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }} />
            : activeDesigner?.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ fontSize: ".75rem", color: "var(--ws-text2)", fontFamily: "Poppins", fontWeight: 600 }}>{activeDesigner?.name}</div>
              </div>
            </div>
            {!readonly && activeSubTab === "briefings" && <button className="ws-btn" style={{ fontSize: ".78rem", padding: "7px 14px" }} onClick={() => setBriefingModal(true)}>+ Novo briefing</button>}
            {!readonly && activeSubTab === "identidade" && !editingBrand && <button className="ws-btn-ghost" style={{ fontSize: ".78rem", padding: "7px 14px" }} onClick={() => { setBrandForm(brandIdentity); setEditingBrand(true); }}>✎ Editar</button>}
          </div>
          <div style={{ display: "flex" }}>
            {(["briefings", "identidade", "financeiro"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveSubTab(tab)} style={{ background: "none", border: "none", cursor: "pointer", borderBottom: activeSubTab === tab ? `2px solid ${activeCase.color}` : "2px solid transparent", color: activeSubTab === tab ? activeCase.color : "var(--ws-text3)", fontSize: ".78rem", padding: "6px 14px", fontFamily: "inherit", transition: "all .15s", marginBottom: -1 }}>
                {tab === "briefings" ? "📋 Briefings" : tab === "identidade" ? "🎨 Identidade Visual" : "💰 Financeiro"}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loadingWorkspace ? <Loader /> : (
            <>
              {activeSubTab === "briefings" && (
                detailBriefing ? (
                  /* Inline detail view — no modal */
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setLocation(`/workspace/clientes/${caseData.id}/designer`)}
                      title="Fechar"
                      style={{ position: "absolute", top: 0, right: 0, background: "var(--ws-surface2)", border: "1px solid var(--ws-border)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ws-text3)", fontSize: "1.1rem", lineHeight: 1, zIndex: 1 }}
                    >×</button>

                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div>
                          <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1rem", color: "var(--ws-text)" }}>{detailBriefing.format}</div>
                          <DeadlineBadge deadline={detailBriefing.deadline} />
                        </div>
                        {(() => { const cfg = STATUS_CFG[detailBriefing.status]; return (
                          <div style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "4px 10px", fontSize: ".65rem", fontFamily: "Poppins", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot }} />{cfg.label}
                          </div>
                        ); })()}
                      </div>
                      {!readonly && (
                        <button onClick={() => { setEditingBriefing(detailBriefing); setEditBriefingForm({ format: detailBriefing.format, reference_text: detailBriefing.reference_text ?? "", reference_links: (detailBriefing.reference_links ?? []).join("\n"), deadline: detailBriefing.deadline }); }}
                          style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 6, color: "var(--ws-text2)", cursor: "pointer", fontSize: ".72rem", padding: "5px 12px", fontFamily: "Poppins" }}>✎ Editar</button>
                      )}
                    </div>

                    {detailBriefing.revision_note && detailBriefing.status === "revisao" && (
                      <div style={{ background: "rgba(255,107,53,0.10)", border: "1px solid rgba(255,107,53,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1rem" }}>↩</span>
                        <div>
                          <div style={{ fontSize: ".65rem", fontFamily: "Poppins", letterSpacing: "1px", textTransform: "uppercase", color: "#ff6b35", marginBottom: 2 }}>Revisão solicitada</div>
                          <div style={{ fontSize: ".82rem", color: "#ff6b35" }}>{detailBriefing.revision_note}</div>
                        </div>
                      </div>
                    )}

                    {detailBriefing.reference_text && <BSection label="Briefing / Referência"><p style={{ margin: 0, fontSize: ".82rem", color: "var(--ws-text2)", lineHeight: 1.6 }}>{detailBriefing.reference_text}</p></BSection>}

                    {detailBriefing.reference_links?.length > 0 && (
                      <BSection label="Links de referência">
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {detailBriefing.reference_links.map((link, li) => (
                            <a key={li} href={link} target="_blank" rel="noreferrer" style={{ fontSize: ".78rem", color: activeCase.color, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</a>
                          ))}
                        </div>
                      </BSection>
                    )}

                    <BSection label="Imagens de referência">
                      {(detailBriefing.reference_images?.length ?? 0) > 0 && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                          {detailBriefing.reference_images.map((url, i) => (
                            <div key={i}
                              draggable={!readonly}
                              onDragStart={() => { dragRefImgIdx.current = i; }}
                              onDragOver={e => { e.preventDefault(); setDragOverRefImg(i); }}
                              onDragLeave={() => setDragOverRefImg(null)}
                              onDrop={async e => {
                                e.preventDefault();
                                setDragOverRefImg(null);
                                const from = dragRefImgIdx.current;
                                dragRefImgIdx.current = null;
                                if (from === null || from === i) return;
                                const imgs = [...detailBriefing.reference_images];
                                const [moved] = imgs.splice(from, 1);
                                imgs.splice(i, 0, moved);
                                const { data } = await supabase.from("briefings").update({ reference_images: imgs }).eq("id", detailBriefing.id).select().single();
                                if (data) { setBriefings(prev => prev.map(b => b.id === data.id ? data : b)); }
                              }}
                              style={{ position: "relative", opacity: dragOverRefImg === i ? 0.5 : 1, transition: "opacity .15s" }}>
                              <img src={url} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover", border: "1px solid var(--ws-border)", display: "block" }} />
                              <div style={{ position: "absolute", bottom: 3, right: 3, background: "rgba(0,0,0,.55)", borderRadius: 3, fontSize: ".5rem", color: "#fff", padding: "1px 4px", fontFamily: "Poppins" }}>{i + 1}</div>
                              <button onClick={e => { e.preventDefault(); void downloadFile(url); }}
                                style={{ position: "absolute", top: 3, left: 3, background: "rgba(0,0,0,.6)", border: "none", borderRadius: 4, padding: "2px 5px", fontSize: ".55rem", color: "#fff", cursor: "pointer" }}>↓</button>
                              {!readonly && (
                                <button onClick={() => { setReplacingRefImg(i); replaceRefRef.current?.click(); }}
                                  style={{ position: "absolute", bottom: 3, left: 3, background: "rgba(0,100,220,.8)", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: ".6rem", padding: "2px 5px" }}>↺</button>
                              )}
                              {!readonly && (
                                <button onClick={async () => {
                                  const newImgs = detailBriefing.reference_images.filter((_, idx) => idx !== i);
                                  const { data } = await supabase.from("briefings").update({ reference_images: newImgs }).eq("id", detailBriefing.id).select().single();
                                  if (data) { setBriefings(prev => prev.map(b => b.id === data.id ? data : b)); }
                                }} style={{ position: "absolute", top: 3, right: 3, background: "rgba(220,50,50,.8)", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: ".65rem", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {!readonly && (
                        <>
                          <input ref={replaceRefRef} type="file" accept="image/*" style={{ display: "none" }}
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file || replacingRefImg === null) return;
                              e.target.value = "";
                              const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
                              const filename = `briefings/${detailBriefing.id}/ref_${Date.now()}.${ext}`;
                              const { data: urlData } = await supabase.functions.invoke("get-r2-upload-url", { body: { filename, contentType: file.type } });
                              if (!urlData?.signedUrl) return;
                              await fetch(urlData.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
                              const newUrl = `${R2}/${filename}`;
                              const newImgs = [...(detailBriefing.reference_images ?? [])];
                              newImgs[replacingRefImg] = newUrl;
                              const { data } = await supabase.from("briefings").update({ reference_images: newImgs }).eq("id", detailBriefing.id).select().single();
                              if (data) { setBriefings(prev => prev.map(b => b.id === data.id ? data : b)); }
                              setReplacingRefImg(null);
                            }}
                          />
                          <DetailImgUpload caseData={activeCase} briefing={detailBriefing} r2base={R2}
                            onUploaded={newUrls => {
                              const updated = { ...detailBriefing, reference_images: [...(detailBriefing.reference_images ?? []), ...newUrls] };
                              setBriefings(prev => prev.map(b => b.id === updated.id ? updated : b));
                            }}
                          />
                        </>
                      )}
                    </BSection>

                    {/* Arte entregue */}
                    {(detailBriefing.delivery_urls?.length ?? 0) > 0 && (
                      <BSection label="Arte entregue">
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {detailBriefing.delivery_urls!.map((url, i) => (
                            <div key={i} style={{ position: "relative" }}>
                              <img src={url} alt="" onClick={() => setPreviewImg(url)} style={{ width: 100, height: 100, borderRadius: 8, objectFit: "cover", border: `1px solid ${activeCase.color}44`, display: "block", cursor: "pointer" }} />
                              <button onClick={e => { e.stopPropagation(); void downloadFile(url); }}
                                style={{ position: "absolute", bottom: 3, left: 3, background: "rgba(0,0,0,.65)", border: "none", borderRadius: 4, padding: "2px 7px", fontSize: ".6rem", color: "#fff", cursor: "pointer", fontFamily: "Poppins" }}>↓</button>
                            </div>
                          ))}
                        </div>
                      </BSection>
                    )}

                    {detailBriefing.designer_value > 0 && (
                      <BSection label="Valor cobrado pelo designer">
                        <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: "1rem", color: "var(--ws-text)" }}>
                          R$ {detailBriefing.designer_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </BSection>
                    )}

                    {!readonly && (
                      <div style={{ borderTop: "1px solid var(--ws-border)", paddingTop: 16, marginTop: 8 }}>
                        <div style={{ fontSize: ".65rem", fontFamily: "Poppins", color: "var(--ws-text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Ações</div>
                        <textarea className="ws-input" rows={2} placeholder="Descreva o que precisa ser alterado (para solicitar revisão)..." value={revisionText} onChange={e => setRevisionText(e.target.value)} style={{ resize: "vertical", marginBottom: 10 }} />
                        <div style={{ display: "flex", gap: 10 }}>
                          <button className="ws-btn" onClick={() => void approveBriefing(detailBriefing)} style={{ flex: 1, background: "#00a864" }} disabled={detailBriefing.status !== "entregue"}>✓ Aprovar arte</button>
                          <button className="ws-btn-ghost" onClick={() => void requestRevision(detailBriefing)} disabled={!revisionText.trim()} style={{ flex: 1 }}>↩ Solicitar alteração</button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  briefings.length === 0 ? <Empty label="Nenhum briefing para este cliente ainda." /> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {briefings.map(b => {
                        const cfg = STATUS_CFG[b.status];
                        return (
                          <div key={b.id} onClick={() => { setLocation(`/workspace/clientes/${caseData.id}/designer/briefing/${b.id}`); setRevisionText(""); }}
                            style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 12, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, transition: "border-color .15s" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = activeCase.color}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--ws-border)"}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)", marginBottom: 4 }}>{b.format}</div>
                              <DeadlineBadge deadline={b.deadline} />
                              <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 3 }}>
                                Criado: {new Date(b.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                              </div>
                              {b.reference_links?.length > 0 && (
                                <div style={{ marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {b.reference_links.map((link, li) => (
                                    <a key={li} href={link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                      style={{ fontSize: ".62rem", color: activeCase.color, background: `${activeCase.color}15`, borderRadius: 4, padding: "2px 7px", textDecoration: "none", fontFamily: "Poppins", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                                      ↗ {link.replace(/^https?:\/\//, "").slice(0, 30)}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "4px 10px", fontSize: ".65rem", fontFamily: "Poppins", fontWeight: 700, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />{cfg.label}
                            </div>
                            {!readonly && (
                              <button onClick={e => { e.stopPropagation(); void deleteBriefing(b.id); }} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1.1rem", padding: "0 4px", flexShrink: 0 }}>×</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )
              )}

              {activeSubTab === "identidade" && (
                editingBrand
                  ? <BrandEditor form={brandForm} setForm={setBrandForm} caseData={activeCase} onSave={() => void saveBrand()} onCancel={() => setEditingBrand(false)} saving={saving} />
                  : <BrandView identity={brandIdentity} caseData={activeCase} />
              )}

              {activeSubTab === "financeiro" && (() => {
                // Build month map: ALL months from briefings + closings
                const monthMap = new Map<string, { month: number; year: number; monthBriefings: Briefing[]; closing?: DesignerClosing }>();

                briefings.forEach(b => {
                  const d = new Date(b.created_at);
                  const m = d.getMonth() + 1;
                  const y = d.getFullYear();
                  const key = `${y}-${String(m).padStart(2, "0")}`;
                  const existing = monthMap.get(key) ?? { month: m, year: y, monthBriefings: [] };
                  monthMap.set(key, { ...existing, monthBriefings: [...existing.monthBriefings, b] });
                });

                closings.forEach(cl => {
                  const key = `${cl.year}-${String(cl.month).padStart(2, "0")}`;
                  const existing = monthMap.get(key) ?? { month: cl.month, year: cl.year, monthBriefings: [] };
                  monthMap.set(key, { ...existing, closing: cl });
                });

                const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));

                return (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {sortedMonths.length === 0 ? (
                    <div style={{ color: "var(--ws-text3)", fontSize: ".82rem", textAlign: "center", padding: "32px 0" }}>
                      Nenhum briefing ou fechamento financeiro ainda.
                    </div>
                  ) : sortedMonths.map(([key, { month, year, monthBriefings, closing }]) => {
                    const monthLabel = `${MONTHS_PT[month - 1]}/${year}`;
                    const isApproved = !!(closing as any)?.approved_at;
                    const approving = approvingClosing === (closing?.id ?? `${month}-${year}`);

                    return (
                      <div key={key} style={{
                        background: "var(--ws-surface)", border: `1px solid ${isApproved ? "rgba(0,230,118,0.3)" : "var(--ws-border)"}`,
                        borderRadius: 14, overflow: "hidden",
                      }}>
                        {/* Header */}
                        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ws-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".92rem", color: "var(--ws-text)" }}>{monthLabel}</div>
                            {closing?.payment_date && (
                              <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>
                                📅 Pagamento preferido: {new Date(closing.payment_date + "T12:00:00").toLocaleDateString("pt-BR")}
                              </div>
                            )}
                          </div>
                          {closing ? (
                            isApproved ? (
                              <span style={{ background: "rgba(0,230,118,0.12)", color: "#00a864", borderRadius: 8, padding: "4px 12px", fontSize: ".72rem", fontFamily: "Poppins", fontWeight: 700 }}>✅ Aprovado</span>
                            ) : (
                              <span style={{ background: "rgba(255,214,0,0.12)", color: "#b08800", borderRadius: 8, padding: "4px 12px", fontSize: ".72rem", fontFamily: "Poppins", fontWeight: 700 }}>⏳ Aguardando fechamento</span>
                            )
                          ) : (
                            <span style={{ background: "rgba(100,100,100,0.10)", color: "var(--ws-text3)", borderRadius: 8, padding: "4px 12px", fontSize: ".72rem", fontFamily: "Poppins", fontWeight: 700 }}>Sem fechamento</span>
                          )}
                        </div>

                        {/* Briefings do mês */}
                        <div style={{ padding: "14px 18px" }}>
                          {monthBriefings.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", marginBottom: 8 }}>Briefings do mês</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {monthBriefings.map(b => (
                                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--ws-surface2)", borderRadius: 8 }}>
                                    <div>
                                      <span style={{ fontSize: ".82rem", color: "var(--ws-text)", fontWeight: 600 }}>{b.format}</span>
                                      <span style={{ fontSize: ".68rem", color: "var(--ws-text3)", marginLeft: 8, fontFamily: "Poppins" }}>{allCases.find(c => c.id === b.case_id)?.name ?? "—"}</span>
                                    </div>
                                    <span style={{ fontSize: ".82rem", fontFamily: "Poppins", fontWeight: 700, color: b.designer_value ? "var(--ws-text)" : "var(--ws-text3)" }}>
                                      {b.designer_value ? fmtMoney(b.designer_value) : "R$ 0,00"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Valor fixo mensal (only if closing exists) */}
                          {closing && closing.total_bruto > 0 && closing.discount !== undefined && (
                            <div style={{ background: "var(--ws-surface2)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                              {closing.total_bruto - (monthBriefings.reduce((s, b) => s + (b.designer_value ?? 0), 0)) > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                  <span style={{ fontSize: ".78rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>💼 Valor fixo / adicional</span>
                                  <span style={{ fontSize: ".78rem", color: "var(--ws-text2)", fontFamily: "Poppins", fontWeight: 600 }}>
                                    {fmtMoney(closing.total_bruto - monthBriefings.reduce((s, b) => s + (b.designer_value ?? 0), 0))}
                                  </span>
                                </div>
                              )}
                              {closing.discount > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                  <span style={{ fontSize: ".78rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>Desconto</span>
                                  <span style={{ fontSize: ".78rem", color: "#ff6b35", fontFamily: "Poppins" }}>− {fmtMoney(closing.discount)}</span>
                                </div>
                              )}
                              {closing.notes && (
                                <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 6, fontStyle: "italic" }}>{closing.notes}</div>
                              )}
                              <div style={{ borderTop: "1px solid var(--ws-border)", paddingTop: 8, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)" }}>Total final</span>
                                <span style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1rem", color: "#00a864" }}>{fmtMoney(closing.total_final)}</span>
                              </div>
                            </div>
                          )}

                          {/* Botão aprovar (only if closing exists and not yet approved) */}
                          {closing && !readonly && !isApproved && (
                            <button
                              onClick={() => void approveClosing(closing)}
                              disabled={approving}
                              style={{
                                width: "100%", background: "#00e676", border: "none", borderRadius: 10,
                                color: "#003322", cursor: "pointer", fontSize: ".84rem", fontWeight: 700,
                                padding: "11px 0", fontFamily: "Poppins", opacity: approving ? 0.7 : 1,
                              }}
                            >
                              {approving ? "Aprovando..." : "✅ Aprovar e lançar no financeiro"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* MODAL — Novo Briefing */}
      {briefingModal && !readonly && (
        <div style={getOverlayStyle(isMobile)} onClick={e => e.target === e.currentTarget && setBriefingModal(false)}>
          <div style={{ ...modalBoxStyle, maxWidth: 500, width: "100%" }}>
            <div style={modalTitleStyle}>Novo briefing — {activeCase.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label className="ws-label">Formato *</label>
                <select className="ws-input" value={briefingForm.format} onChange={e => setBriefingForm(p => ({ ...p, format: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="ws-label">Prazo *</label>
                <input className="ws-input" type="date" value={briefingForm.deadline} onChange={e => setBriefingForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <label className="ws-label">Referência / Briefing</label>
            <textarea className="ws-input" rows={3} placeholder="Descreva o que precisa ser criado..." value={briefingForm.reference_text} onChange={e => setBriefingForm(p => ({ ...p, reference_text: e.target.value }))} style={{ resize: "vertical", marginBottom: 12 }} />
            <label className="ws-label">Links de referência (um por linha)</label>
            <textarea className="ws-input" rows={2} placeholder={"https://instagram.com/...\nhttps://pinterest.com/..."} value={briefingForm.reference_links} onChange={e => setBriefingForm(p => ({ ...p, reference_links: e.target.value }))} style={{ resize: "vertical", marginBottom: 12 }} />
            <label className="ws-label">Imagens de referência</label>
            <div onClick={() => imgInputRef.current?.click()} style={{ border: "1px dashed var(--ws-border2)", borderRadius: 8, padding: "10px 14px", cursor: "pointer", marginBottom: briefingImages.length ? 10 : 16, color: "var(--ws-text3)", fontSize: ".76rem", fontFamily: "Poppins", textAlign: "center" }}>
              {briefingImages.length > 0 ? `${briefingImages.length} imagem(ns) selecionada(s)` : "Clique para adicionar imagens"}
            </div>
            <input ref={imgInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => setBriefingImages(Array.from(e.target.files ?? []))} />
            {briefingImages.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {briefingImages.map((f, i) => (
                  <div key={i} style={{ width: 52, height: 52, borderRadius: 6, overflow: "hidden", border: "1px solid var(--ws-border)" }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="ws-btn" onClick={() => void saveBriefing()} disabled={saving || !briefingForm.format || !briefingForm.deadline} style={{ flex: 1 }}>
                {uploading ? "Enviando imagens..." : saving ? "Salvando..." : "Criar briefing"}
              </button>
              <button className="ws-btn-ghost" onClick={() => { setBriefingModal(false); setBriefingForm(EMPTY_BRIEFING); setBriefingImages([]); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — Preview de imagem */}
      {previewImg && (
        <div onClick={() => setPreviewImg(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <button onClick={() => setPreviewImg(null)} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          <button onClick={e => { e.stopPropagation(); void downloadFile(previewImg); }} style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: ".78rem", padding: "8px 20px", fontFamily: "Poppins" }}>↓ Baixar</button>
          <img src={previewImg} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "85dvh", borderRadius: 10, objectFit: "contain" }} />
        </div>
      )}

      {/* MODAL — Editar Briefing */}
      {editingBriefing && !readonly && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => e.target === e.currentTarget && setEditingBriefing(null)}>
          <div style={{ background: "var(--ws-surface)", borderRadius: 16, padding: "28px", maxWidth: 500, width: "100%" }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1rem", color: "var(--ws-text)", marginBottom: 20 }}>Editar briefing</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label className="ws-label">Formato *</label>
                <select className="ws-input" value={editBriefingForm.format} onChange={e => setEditBriefingForm(p => ({ ...p, format: e.target.value }))}>
                  {["Reels","Carrossel","Feed / Estático","Story","Banner","Outro"].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="ws-label">Prazo *</label>
                <input className="ws-input" type="date" value={editBriefingForm.deadline} onChange={e => setEditBriefingForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <label className="ws-label">Referência / Briefing</label>
            <textarea className="ws-input" rows={3} value={editBriefingForm.reference_text} onChange={e => setEditBriefingForm(p => ({ ...p, reference_text: e.target.value }))} style={{ resize: "vertical", marginBottom: 12 }} />
            <label className="ws-label">Links de referência (um por linha)</label>
            <textarea className="ws-input" rows={2} value={editBriefingForm.reference_links} onChange={e => setEditBriefingForm(p => ({ ...p, reference_links: e.target.value }))} style={{ resize: "vertical", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="ws-btn" onClick={() => void saveBriefingEdit()} disabled={savingEdit} style={{ flex: 1 }}>{savingEdit ? "Salvando..." : "Salvar alterações"}</button>
              <button className="ws-btn-ghost" onClick={() => setEditingBriefing(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ════════════════════════════════════════
//  SUB-COMPONENTES
// ════════════════════════════════════════

async function downloadFile(url: string, filename?: string) {
  const name = filename || url.split("/").pop()?.split("?")[0] || "arquivo";
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const res = await fetch(
      "https://nznyzjvtmqfcjkogkfju.supabase.co/functions/v1/download-file",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bnl6anZ0bXFmY2prb2drZmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTAzMTAsImV4cCI6MjA4ODkyNjMxMH0.NLf83n9WS3v-e0u_H3WvHGvEgOq1xMgpCP1m7C8LFIY",
        },
        body: JSON.stringify({ url, filename: name }),
      }
    );
    if (!res.ok) throw new Error("download failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch {
    window.open(url, "_blank");
  }
}
function BSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", marginBottom: 6 }}>{label}</div>
      <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "10px 12px" }}>{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", marginBottom: 8 }}>{children}</div>;
}

function BrandView({ identity, caseData }: { identity: BrandIdentity; caseData: Case }) {
  const empty = !identity.colors?.length && !identity.fonts?.length && !identity.links?.length && !identity.style_notes && !identity.warnings;
  if (empty) return <Empty label="Nenhuma identidade visual cadastrada. Clique em Editar para começar." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {identity.colors?.length > 0 && (
        <div>
          <Label>Paleta de cores</Label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {identity.colors.map((c, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: c.hex, border: "1px solid var(--ws-border)", boxShadow: `0 2px 8px ${c.hex}44` }} />
                <span style={{ fontSize: ".6rem", fontFamily: "Poppins", color: "var(--ws-text3)" }}>{c.hex}</span>
                {c.name && <span style={{ fontSize: ".6rem", fontFamily: "Poppins", color: "var(--ws-text2)" }}>{c.name}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {identity.fonts?.length > 0 && (
        <div>
          <Label>Tipografia</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {identity.fonts.map((f, i) => (
              <div key={i} style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: ".84rem", color: "var(--ws-text)" }}>{f.name}</span>
                <span style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>{f.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {identity.style_notes && (
        <div>
          <Label>Estilo / Personalidade</Label>
          <div style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 8, padding: "10px 14px", fontSize: ".82rem", color: "var(--ws-text2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{identity.style_notes}</div>
        </div>
      )}
      {identity.links?.length > 0 && (
        <div>
          <Label>Links</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {identity.links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 8, padding: "8px 12px", textDecoration: "none" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: caseData.color }}>{l.label}</span>
                <span style={{ fontSize: ".65rem", color: "var(--ws-text3)", fontFamily: "Poppins", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>↗ {l.url}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {identity.warnings && (
        <div>
          <Label>⚠️ Avisos</Label>
          <div style={{ background: "rgba(255,214,0,0.08)", border: "1px solid rgba(255,214,0,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: ".82rem", color: "#b08800", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{identity.warnings}</div>
        </div>
      )}
    </div>
  );
}

function BrandEditor({ form, setForm, caseData, onSave, onCancel, saving }: {
  form: BrandIdentity; setForm: (f: BrandIdentity) => void;
  caseData: Case; onSave: () => void; onCancel: () => void; saving: boolean;
}) {
  function addColor() { setForm({ ...form, colors: [...(form.colors ?? []), { hex: "#000000", name: "" }] }); }
  function updateColor(i: number, key: "hex" | "name", val: string) { const c = [...(form.colors ?? [])]; c[i] = { ...c[i], [key]: val }; setForm({ ...form, colors: c }); }
  function removeColor(i: number) { setForm({ ...form, colors: form.colors.filter((_, idx) => idx !== i) }); }
  function addFont() { setForm({ ...form, fonts: [...(form.fonts ?? []), { name: "", role: "" }] }); }
  function updateFont(i: number, key: "name" | "role", val: string) { const f = [...(form.fonts ?? [])]; f[i] = { ...f[i], [key]: val }; setForm({ ...form, fonts: f }); }
  function removeFont(i: number) { setForm({ ...form, fonts: form.fonts.filter((_, idx) => idx !== i) }); }
  function addLink() { setForm({ ...form, links: [...(form.links ?? []), { label: "", url: "" }] }); }
  function updateLink(i: number, key: "label" | "url", val: string) { const l = [...(form.links ?? [])]; l[i] = { ...l[i], [key]: val }; setForm({ ...form, links: l }); }
  function removeLink(i: number) { setForm({ ...form, links: form.links.filter((_, idx) => idx !== i) }); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Label>Paleta de cores</Label>
          <button onClick={addColor} style={{ background: "none", border: `1px dashed ${caseData.color}`, borderRadius: 6, color: caseData.color, cursor: "pointer", fontSize: ".7rem", padding: "3px 10px", fontFamily: "Poppins" }}>+ Cor</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {form.colors?.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--ws-surface)", border: "1px solid var(--ws-border)", borderRadius: 8, padding: "6px 10px" }}>
              <input type="color" value={c.hex} onChange={e => updateColor(i, "hex", e.target.value)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer", padding: 0 }} />
              <input className="ws-input" value={c.hex} onChange={e => updateColor(i, "hex", e.target.value)} placeholder="#000000" style={{ width: 80, marginBottom: 0, padding: "4px 6px", fontSize: ".72rem" }} />
              <input className="ws-input" value={c.name} onChange={e => updateColor(i, "name", e.target.value)} placeholder="Nome" style={{ width: 80, marginBottom: 0, padding: "4px 6px", fontSize: ".72rem" }} />
              <button onClick={() => removeColor(i)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: ".9rem" }}>×</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Label>Tipografia</Label>
          <button onClick={addFont} style={{ background: "none", border: `1px dashed ${caseData.color}`, borderRadius: 6, color: caseData.color, cursor: "pointer", fontSize: ".7rem", padding: "3px 10px", fontFamily: "Poppins" }}>+ Fonte</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.fonts?.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className="ws-input" value={f.name} onChange={e => updateFont(i, "name", e.target.value)} placeholder="Nome da fonte" style={{ flex: 2, marginBottom: 0 }} />
              <input className="ws-input" value={f.role} onChange={e => updateFont(i, "role", e.target.value)} placeholder="Ex: Título, Corpo" style={{ flex: 1, marginBottom: 0 }} />
              <button onClick={() => removeFont(i)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>Estilo / Personalidade da marca</Label>
        <textarea className="ws-input" rows={3} placeholder="Ex: Marca premium, tom sério mas acessível, paleta escura com dourado..." value={form.style_notes ?? ""} onChange={e => setForm({ ...form, style_notes: e.target.value })} style={{ resize: "vertical" }} />
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Label>Links</Label>
          <button onClick={addLink} style={{ background: "none", border: `1px dashed ${caseData.color}`, borderRadius: 6, color: caseData.color, cursor: "pointer", fontSize: ".7rem", padding: "3px 10px", fontFamily: "Poppins" }}>+ Link</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.links?.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className="ws-input" value={l.label} onChange={e => updateLink(i, "label", e.target.value)} placeholder="Ex: Drive, Instagram" style={{ flex: 1, marginBottom: 0 }} />
              <input className="ws-input" value={l.url} onChange={e => updateLink(i, "url", e.target.value)} placeholder="https://..." style={{ flex: 2, marginBottom: 0 }} />
              <button onClick={() => removeLink(i)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>⚠️ Avisos</Label>
        <textarea className="ws-input" rows={2} placeholder="Ex: Nunca usar vermelho. Sempre apresentar em fundo escuro..." value={form.warnings ?? ""} onChange={e => setForm({ ...form, warnings: e.target.value })} style={{ resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="ws-btn" onClick={onSave} disabled={saving} style={{ flex: 1 }}>{saving ? "Salvando..." : "Salvar identidade"}</button>
        <button className="ws-btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function DeliveryUpload({ briefing, caseData, r2base, onDelivered }: {
  briefing: Briefing;
  caseData: Case;
  r2base: string;
  onDelivered: (b: Briefing) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `deliveries/${caseData.id}/${briefing.id}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.functions.invoke("get-r2-upload-url", { body: { filename: path, contentType: file.type } });
      if (error || !data?.signedUrl) continue;
      const res = await fetch(data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (res.ok) urls.push(`${r2base}/${path}`);
    }
    if (urls.length > 0) {
      const newUrls = [...(briefing.delivery_urls ?? []), ...urls];
      const { data } = await supabase
        .from("briefings")
        .update({ delivery_urls: newUrls, status: "entregue" })
        .eq("id", briefing.id)
        .select()
        .single();
      if (data) {
        onDelivered(data);

        // Notifica admin que designer entregou
        const { data: designerProfile } = await supabase.from("profiles").select("name").eq("id", briefing.designer_id).maybeSingle();
        const designerName = designerProfile?.name ?? "Designer";
        void notifyAdmins({ type: "designer_entregou_briefing", title: `🎨 ${designerName} entregou uma arte`, body: `Briefing "${briefing.format}" do cliente ${caseData.name} aguarda aprovação.`, designer_name: designerName, case_name: caseData.name, format: briefing.format } as any);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  if (briefing.status === "aprovado") return null;

  return (
    <div>
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          border: `1px dashed ${caseData.color}55`,
          borderRadius: 8, padding: "10px 14px",
          cursor: uploading ? "default" : "pointer",
          background: `${caseData.color}08`,
          color: caseData.color, fontSize: ".76rem",
          fontFamily: "Poppins", textAlign: "center",
          fontWeight: 600, transition: "opacity .15s",
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? "Enviando arte..." : "📤 Enviar arte para aprovação"}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*,.pdf"
        multiple
        style={{ display: "none" }}
        onChange={e => void handleFiles(Array.from(e.target.files ?? []))}
      />
    </div>
  );
}

function DetailImgUpload({ caseData, briefing, r2base, onUploaded }: { caseData: Case; briefing: Briefing; r2base: string; onUploaded: (urls: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `briefings/${caseData.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.functions.invoke("get-r2-upload-url", { body: { filename: path, contentType: file.type } });
      if (error || !data?.signedUrl) continue;
      const res = await fetch(data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (res.ok) urls.push(`${r2base}/${path}`);
    }
    if (urls.length > 0) {
      const newImages = [...(briefing.reference_images ?? []), ...urls];
      await supabase.from("briefings").update({ reference_images: newImages }).eq("id", briefing.id);
      onUploaded(urls);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }
  return (
    <div>
      <div onClick={() => !uploading && fileRef.current?.click()} style={{ border: "1px dashed var(--ws-border2)", borderRadius: 7, padding: "7px 12px", cursor: uploading ? "default" : "pointer", color: "var(--ws-text3)", fontSize: ".74rem", fontFamily: "Poppins", textAlign: "center", opacity: uploading ? 0.6 : 1 }}>
        {uploading ? "Enviando..." : "+ Adicionar imagens"}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => void handleFiles(Array.from(e.target.files ?? []))} />
    </div>
  );
}
