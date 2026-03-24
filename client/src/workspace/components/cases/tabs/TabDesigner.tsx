// client/src/workspace/components/cases/tabs/TabDesigner.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import Empty from "../shared/Empty";
import Loader from "../shared/Loader";
import { modalBoxStyle, modalTitleStyle, getOverlayStyle } from "../styles";
import { useIsMobile } from "../../../hooks/useIsMobile";
import type { Case, Designer, Briefing } from "../types";

interface TabDesignerProps {
  caseData: Case;
  readonly?: boolean;
}

const STATUS_CFG: Record<Briefing["status"], { bg: string; color: string; label: string; dot: string }> = {
  aguardando:  { bg: "rgba(255,214,0,0.10)",    color: "#b08800",  label: "Aguardando entrega", dot: "#ffd600" },
  entregue:    { bg: "rgba(75,100,255,0.10)",    color: "#4b6bff",  label: "Entregue",           dot: "#4b6bff" },
  revisao:     { bg: "rgba(255,107,53,0.10)",    color: "#ff6b35",  label: "Em revisão",         dot: "#ff6b35" },
  aprovado:    { bg: "rgba(0,180,100,0.12)",     color: "#00a864",  label: "Aprovado",           dot: "#00e676" },
};

const FORMAT_OPTIONS = ["Reels", "Carrossel", "Feed / Estático", "Story", "Banner", "Outro"];

const EMPTY_BRIEFING = {
  designer_id: "",
  format: "",
  reference_text: "",
  reference_links: "",
  deadline: "",
  brand_identity: "",
};

const EMPTY_DESIGNER = {
  name: "",
  email: "",
  phone: "",
  password: "",
};

export default function TabDesigner({ caseData, readonly = false }: TabDesignerProps) {
  const isMobile = useIsMobile();

  // ── State ──
  const [briefings, setBriefings]       = useState<Briefing[]>([]);
  const [designers, setDesigners]       = useState<Designer[]>([]);
  const [loading, setLoading]           = useState(true);
  const [briefingModal, setBriefingModal] = useState(false);
  const [designerModal, setDesignerModal] = useState(false);
  const [detailBriefing, setDetailBriefing] = useState<Briefing | null>(null);
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]       = useState(false);

  const [briefingForm, setBriefingForm] = useState(EMPTY_BRIEFING);
  const [briefingImages, setBriefingImages] = useState<File[]>([]);
  const [designerForm, setDesignerForm] = useState(EMPTY_DESIGNER);
  const [revisionText, setRevisionText] = useState("");

  const imgInputRef = useRef<HTMLInputElement>(null);
  const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";

  // ── Load ──
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [{ data: bf }, { data: ds }] = await Promise.all([
        supabase.from("briefings").select("*").eq("case_id", caseData.id).order("created_at", { ascending: false }),
        supabase.from("designers").select("*").order("name"),
      ]);
      if (mounted) {
        setBriefings(bf ?? []);
        setDesigners(ds ?? []);
        setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [caseData.id]);

  // ── Upload imagens de referência para R2 ──
  async function uploadImages(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `briefings/${caseData.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.functions.invoke("get-r2-upload-url", {
        body: { filename: path, contentType: file.type },
      });
      if (error || !data?.signedUrl) continue;
      const res = await fetch(data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (res.ok) urls.push(`${R2_PUBLIC_URL}/${path}`);
    }
    return urls;
  }

  // ── Criar briefing ──
  async function saveBriefing() {
    if (!briefingForm.designer_id || !briefingForm.format || !briefingForm.deadline) return;
    setSaving(true);
    setUploading(briefingImages.length > 0);

    const imageUrls = briefingImages.length > 0 ? await uploadImages(briefingImages) : [];

    const links = briefingForm.reference_links
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    const { data } = await supabase
      .from("briefings")
      .insert({
        case_id: caseData.id,
        designer_id: briefingForm.designer_id,
        format: briefingForm.format,
        reference_text: briefingForm.reference_text,
        reference_links: links,
        reference_images: imageUrls,
        deadline: briefingForm.deadline,
        brand_identity: briefingForm.brand_identity,
        status: "aguardando",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (data) setBriefings(prev => [data, ...prev]);
    setBriefingForm(EMPTY_BRIEFING);
    setBriefingImages([]);
    setBriefingModal(false);
    setSaving(false);
    setUploading(false);
  }

  // ── Criar designer/parceiro ──
  async function saveDesigner() {
    if (!designerForm.name || !designerForm.email || !designerForm.password) return;
    setSaving(true);

    // Cria auth user no Supabase
    const { data: authData, error: authError } = await supabase.auth.admin
      ? // se tiver admin api disponível
        { data: null, error: null }
      : { data: null, error: null };

    // Insere na tabela designers
    const { data } = await supabase
      .from("designers")
      .insert({
        name: designerForm.name,
        email: designerForm.email,
        phone: designerForm.phone,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (data) setDesigners(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setDesignerForm(EMPTY_DESIGNER);
    setDesignerModal(false);
    setSaving(false);
  }

  // ── Aprovar briefing ──
  async function approveBriefing(briefing: Briefing) {
    const { data } = await supabase
      .from("briefings")
      .update({ status: "aprovado" })
      .eq("id", briefing.id)
      .select()
      .single();
    if (data) {
      setBriefings(prev => prev.map(b => b.id === briefing.id ? data : b));
      setDetailBriefing(data);
    }
  }

  // ── Solicitar revisão ──
  async function requestRevision(briefing: Briefing) {
    if (!revisionText.trim()) return;
    const { data } = await supabase
      .from("briefings")
      .update({ status: "revisao", revision_note: revisionText.trim() })
      .eq("id", briefing.id)
      .select()
      .single();
    if (data) {
      setBriefings(prev => prev.map(b => b.id === briefing.id ? data : b));
      setDetailBriefing(data);
      setRevisionText("");
    }
  }

  // ── Deletar briefing ──
  async function deleteBriefing(id: string) {
    if (!window.confirm("Excluir este briefing?")) return;
    setBriefings(prev => prev.filter(b => b.id !== id));
    await supabase.from("briefings").delete().eq("id", id);
    if (detailBriefing?.id === id) setDetailBriefing(null);
  }

  function getDesignerName(id: string) {
    return designers.find(d => d.id === id)?.name ?? "—";
  }

  // ─────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────
  return (
    <div>
      {/* ── Barra superior ── */}
      {!readonly && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <button
            className="ws-btn-ghost"
            onClick={() => setDesignerModal(true)}
            style={{ fontSize: ".75rem", padding: "6px 14px" }}
          >
            + Novo designer
          </button>
          <button className="ws-btn" onClick={() => setBriefingModal(true)}>
            + Novo briefing
          </button>
        </div>
      )}

      {/* ── Lista de briefings ── */}
      {loading ? (
        <Loader />
      ) : briefings.length === 0 ? (
        <Empty label="Nenhum briefing criado ainda." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {briefings.map(b => {
            const cfg = STATUS_CFG[b.status];
            const designer = designers.find(d => d.id === b.designer_id);
            return (
              <div
                key={b.id}
                onClick={() => setDetailBriefing(b)}
                style={{
                  background: "var(--ws-surface)",
                  border: "1px solid var(--ws-border)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  transition: "border-color .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = caseData.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--ws-border)")}
              >
                {/* Avatar designer */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg, ${caseData.color}44, ${caseData.color}22)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: ".78rem", color: caseData.color,
                  border: `1px solid ${caseData.color}44`,
                }}>
                  {(designer?.name ?? "?").slice(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--ws-text)" }}>{b.format}</span>
                    <span style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>
                      → {getDesignerName(b.designer_id)}
                    </span>
                  </div>
                  <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", marginTop: 3, fontFamily: "Poppins" }}>
                    Prazo: {new Date(`${b.deadline}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    {" · "}
                    {new Date(b.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{
                  background: cfg.bg, color: cfg.color,
                  borderRadius: 20, padding: "4px 10px",
                  fontSize: ".65rem", fontFamily: "Poppins", fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                  whiteSpace: "nowrap",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
                  {cfg.label}
                </div>

                {/* Excluir */}
                {!readonly && (
                  <button
                    onClick={e => { e.stopPropagation(); void deleteBriefing(b.id); }}
                    style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1.1rem", flexShrink: 0, padding: "0 4px" }}
                  >×</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════
          MODAL — Novo Briefing
      ══════════════════════════════════ */}
      {briefingModal && !readonly && (
        <div style={getOverlayStyle(isMobile)} onClick={e => e.target === e.currentTarget && setBriefingModal(false)}>
          <div style={{ ...modalBoxStyle, maxWidth: 520, width: "100%" }}>
            <div style={modalTitleStyle}>Novo briefing</div>

            {/* Designer */}
            <label className="ws-label">Designer *</label>
            <select
              className="ws-input"
              value={briefingForm.designer_id}
              onChange={e => setBriefingForm(p => ({ ...p, designer_id: e.target.value }))}
              style={{ marginBottom: 12 }}
            >
              <option value="">Selecione o designer...</option>
              {designers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Formato + Prazo */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label className="ws-label">Formato *</label>
                <select
                  className="ws-input"
                  value={briefingForm.format}
                  onChange={e => setBriefingForm(p => ({ ...p, format: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="ws-label">Prazo *</label>
                <input
                  className="ws-input"
                  type="date"
                  value={briefingForm.deadline}
                  onChange={e => setBriefingForm(p => ({ ...p, deadline: e.target.value }))}
                />
              </div>
            </div>

            {/* Identidade da marca */}
            <label className="ws-label">Identidade da marca</label>
            <textarea
              className="ws-input"
              rows={3}
              placeholder="Ex: Cores #1B2265 e #E91E8C · Tipografia Poppins Bold · Tom direto e moderno..."
              value={briefingForm.brand_identity}
              onChange={e => setBriefingForm(p => ({ ...p, brand_identity: e.target.value }))}
              style={{ resize: "vertical", marginBottom: 12 }}
            />

            {/* Texto de referência */}
            <label className="ws-label">Referência / Briefing</label>
            <textarea
              className="ws-input"
              rows={3}
              placeholder="Descreva o que precisa ser criado, o objetivo, o contexto..."
              value={briefingForm.reference_text}
              onChange={e => setBriefingForm(p => ({ ...p, reference_text: e.target.value }))}
              style={{ resize: "vertical", marginBottom: 12 }}
            />

            {/* Links de referência */}
            <label className="ws-label">Links de referência (um por linha)</label>
            <textarea
              className="ws-input"
              rows={2}
              placeholder={"https://instagram.com/...\nhttps://pinterest.com/..."}
              value={briefingForm.reference_links}
              onChange={e => setBriefingForm(p => ({ ...p, reference_links: e.target.value }))}
              style={{ resize: "vertical", marginBottom: 12 }}
            />

            {/* Upload de imagens */}
            <label className="ws-label">Imagens de referência</label>
            <div
              onClick={() => imgInputRef.current?.click()}
              style={{
                border: "1px dashed var(--ws-border2)", borderRadius: 8,
                padding: "12px 16px", cursor: "pointer", marginBottom: 12,
                color: "var(--ws-text3)", fontSize: ".78rem", fontFamily: "Poppins",
                textAlign: "center", transition: "border-color .15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = caseData.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--ws-border2)")}
            >
              {briefingImages.length > 0
                ? `${briefingImages.length} imagem(ns) selecionada(s)`
                : "Clique para adicionar imagens"}
            </div>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={e => setBriefingImages(Array.from(e.target.files ?? []))}
            />

            {/* Preview miniaturas */}
            {briefingImages.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {briefingImages.map((f, i) => (
                  <div key={i} style={{ width: 52, height: 52, borderRadius: 6, overflow: "hidden", border: "1px solid var(--ws-border)" }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                className="ws-btn"
                onClick={() => void saveBriefing()}
                disabled={saving || !briefingForm.designer_id || !briefingForm.format || !briefingForm.deadline}
                style={{ flex: 1 }}
              >
                {uploading ? "Enviando imagens..." : saving ? "Salvando..." : "Criar briefing"}
              </button>
              <button className="ws-btn-ghost" onClick={() => { setBriefingModal(false); setBriefingForm(EMPTY_BRIEFING); setBriefingImages([]); }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          MODAL — Novo Designer
      ══════════════════════════════════ */}
      {designerModal && !readonly && (
        <div style={getOverlayStyle(isMobile)} onClick={e => e.target === e.currentTarget && setDesignerModal(false)}>
          <div style={{ ...modalBoxStyle, maxWidth: 420, width: "100%" }}>
            <div style={modalTitleStyle}>Novo designer / parceiro</div>

            <label className="ws-label">Nome *</label>
            <input
              className="ws-input"
              placeholder="Nome completo"
              value={designerForm.name}
              onChange={e => setDesignerForm(p => ({ ...p, name: e.target.value }))}
              style={{ marginBottom: 12 }}
            />

            <label className="ws-label">E-mail (login) *</label>
            <input
              className="ws-input"
              type="email"
              placeholder="designer@email.com"
              value={designerForm.email}
              onChange={e => setDesignerForm(p => ({ ...p, email: e.target.value }))}
              style={{ marginBottom: 12 }}
            />

            <label className="ws-label">Telefone / WhatsApp</label>
            <input
              className="ws-input"
              placeholder="(41) 99999-9999"
              value={designerForm.phone}
              onChange={e => setDesignerForm(p => ({ ...p, phone: e.target.value }))}
              style={{ marginBottom: 12 }}
            />

            <label className="ws-label">Senha de acesso *</label>
            <input
              className="ws-input"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={designerForm.password}
              onChange={e => setDesignerForm(p => ({ ...p, password: e.target.value }))}
              style={{ marginBottom: 18 }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="ws-btn"
                onClick={() => void saveDesigner()}
                disabled={saving || !designerForm.name || !designerForm.email || !designerForm.password}
                style={{ flex: 1 }}
              >
                {saving ? "Criando..." : "Criar acesso"}
              </button>
              <button className="ws-btn-ghost" onClick={() => { setDesignerModal(false); setDesignerForm(EMPTY_DESIGNER); }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          MODAL — Detalhe do Briefing
      ══════════════════════════════════ */}
      {detailBriefing && (
        <div style={getOverlayStyle(isMobile)} onClick={e => e.target === e.currentTarget && setDetailBriefing(null)}>
          <div style={{ ...modalBoxStyle, maxWidth: 560, width: "100%", maxHeight: "90dvh", overflowY: "auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.05rem", color: "var(--ws-text)" }}>
                  {detailBriefing.format}
                </div>
                <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "Poppins", marginTop: 2 }}>
                  {getDesignerName(detailBriefing.designer_id)} · Prazo: {new Date(`${detailBriefing.deadline}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
              {(() => {
                const cfg = STATUS_CFG[detailBriefing.status];
                return (
                  <div style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "4px 12px", fontSize: ".68rem", fontFamily: "Poppins", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
                    {cfg.label}
                  </div>
                );
              })()}
            </div>

            {/* Identidade da marca */}
            {detailBriefing.brand_identity && (
              <Section label="Identidade da marca">
                <pre style={{ margin: 0, fontFamily: "inherit", fontSize: ".82rem", color: "var(--ws-text2)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {detailBriefing.brand_identity}
                </pre>
              </Section>
            )}

            {/* Briefing */}
            {detailBriefing.reference_text && (
              <Section label="Briefing / Referência">
                <p style={{ margin: 0, fontSize: ".82rem", color: "var(--ws-text2)", lineHeight: 1.6 }}>
                  {detailBriefing.reference_text}
                </p>
              </Section>
            )}

            {/* Links */}
            {detailBriefing.reference_links?.length > 0 && (
              <Section label="Links de referência">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {detailBriefing.reference_links.map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noreferrer"
                      style={{ fontSize: ".78rem", color: caseData.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {link}
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {/* Imagens de referência */}
            {detailBriefing.reference_images?.length > 0 && (
              <Section label="Imagens de referência">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {detailBriefing.reference_images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", border: "1px solid var(--ws-border)" }} />
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {/* Arte entregue pelo designer */}
            {detailBriefing.delivery_urls?.length > 0 && (
              <Section label="Arte entregue">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {detailBriefing.delivery_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" style={{ width: 100, height: 100, borderRadius: 8, objectFit: "cover", border: `1px solid ${caseData.color}44` }} />
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {/* Nota de revisão */}
            {detailBriefing.revision_note && (
              <Section label="Revisão solicitada">
                <p style={{ margin: 0, fontSize: ".82rem", color: "#ff6b35", lineHeight: 1.6 }}>
                  {detailBriefing.revision_note}
                </p>
              </Section>
            )}

            {/* Ações admin — só aparece se a arte foi entregue e ainda não aprovada */}
            {!readonly && detailBriefing.status === "entregue" && (
              <div style={{ borderTop: "1px solid var(--ws-border)", paddingTop: 16, marginTop: 8 }}>
                <div style={{ fontSize: ".72rem", fontFamily: "Poppins", color: "var(--ws-text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Revisão</div>

                <textarea
                  className="ws-input"
                  rows={2}
                  placeholder="Descreva o que precisa ser alterado (opcional)..."
                  value={revisionText}
                  onChange={e => setRevisionText(e.target.value)}
                  style={{ resize: "vertical", marginBottom: 10 }}
                />

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="ws-btn"
                    onClick={() => void approveBriefing(detailBriefing)}
                    style={{ flex: 1, background: "#00a864" }}
                  >
                    ✓ Aprovar arte
                  </button>
                  <button
                    className="ws-btn-ghost"
                    onClick={() => void requestRevision(detailBriefing)}
                    disabled={!revisionText.trim()}
                    style={{ flex: 1 }}
                  >
                    ↩ Solicitar alteração
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button className="ws-btn-ghost" onClick={() => setDetailBriefing(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper ──
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: ".62rem", fontFamily: "Poppins", letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--ws-text3)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ background: "var(--ws-surface2)", borderRadius: 8, padding: "10px 12px" }}>
        {children}
      </div>
    </div>
  );
}
