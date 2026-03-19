import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import Empty from "../shared/Empty";
import Loader from "../shared/Loader";
import type { Case, CaseDocument } from "../types";
import { useIsMobile } from "../../../hooks/useIsMobile";

interface TabDocumentosProps {
  caseData: Case;
  type: "documento" | "arquivo" | "contrato";
  readonly?: boolean;
  canUpload?: boolean;
}

export default function TabDocumentos({
  caseData,
  type,
  readonly = false,
  canUpload = true,
}: TabDocumentosProps) {
  const [docs, setDocs] = useState<CaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CaseDocument | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const docType = type === "documento" ? "documento" : type === "contrato" ? "contrato" : "arquivo";
  const R2_PUBLIC_URL = "https://pub-5b6c395d6be84c3db8047e03bbb34bf0.r2.dev";

  useEffect(() => {
    let mounted = true;

    async function loadDocuments() {
      setLoading(true);

      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("case_id", caseData.id)
        .eq("doc_type", docType);

      if (mounted) {
        setDocs(data ?? []);
        setLoading(false);
      }
    }

    void loadDocuments();

    return () => {
      mounted = false;
    };
  }, [caseData.id, docType]);

  // ── Upload direto para o Cloudflare R2 ──
  async function upload(file: File) {
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `docs/${caseData.id}/${Date.now()}.${ext}`;

    try {
      const { data, error } = await supabase.functions.invoke('get-r2-upload-url', {
        body: { filename: path, contentType: file.type }
      });

      if (error || !data?.signedUrl) {
        throw new Error("Erro ao gerar link de upload seguro.");
      }

      const uploadRes = await fetch(data.signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) throw new Error("Falha ao salvar no R2");

      const publicUrl = `${R2_PUBLIC_URL}/${path}`;

      const { data: docData } = await supabase
        .from("documents")
        .insert({
          case_id: caseData.id,
          name: file.name,
          file_url: publicUrl,
          doc_type: docType,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (docData) {
        setDocs((prev) => [...prev, docData]);
      }

    } catch (err) {
      console.error("Erro no upload:", err);
      alert(`Erro ao enviar o ${type}. Tente novamente.`);
    }

    setUploading(false);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  // ── Exclusão do banco e do Cloudflare R2 ──
  async function removeDocument(doc: CaseDocument) {
    const confirmacao = window.confirm(`Tem certeza que deseja excluir o ${type} "${doc.name}"? Essa ação não pode ser desfeita.`);
    if (!confirmacao) return;

    if (doc.file_url && doc.file_url.startsWith(R2_PUBLIC_URL)) {
      const filename = doc.file_url.replace(`${R2_PUBLIC_URL}/`, "");
      await supabase.functions.invoke('delete-r2-file', {
        body: { filename }
      });
    }

    setDocs((prev) => prev.filter((item) => item.id !== doc.id));
    await supabase.from("documents").delete().eq("id", doc.id);
  }

  function isImage(name: string) {
    return /\.(png|jpg|jpeg|webp|gif)$/i.test(name);
  }

  function getIcon(name: string) {
    if (name.toLowerCase().endsWith(".pdf")) return "📄";
    if (/\.(png|jpg|jpeg|webp)$/i.test(name)) return "🖼";
    if (/\.(mp4|mov|webm)$/i.test(name)) return "🎥";
    return "📃";
  }

  return (
    <div>
      {/* Admin pode enviar em qualquer aba. Cliente só pode enviar em "arquivo" */}
      {(!readonly || (canUpload && type === "arquivo")) && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button
            className="ws-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? "Enviando..."
              : `+ Enviar ${type === "arquivo" ? "arquivo" : type === "contrato" ? "contrato" : "documento"}`}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp4,.mov"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </div>
      )}

      {loading ? (
        <Loader />
      ) : docs.length === 0 ? (
        <Empty
          label={`Nenhum ${type === "arquivo" ? "arquivo" : type === "contrato" ? "contrato" : "documento"} enviado ainda.`}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 12 }}>
          {docs.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: "var(--ws-surface)",
                border: "1px solid var(--ws-border)",
                borderRadius: 10,
                overflow: "hidden",
                cursor: isImage(doc.name) ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={() => isImage(doc.name) && setPreviewDoc(doc)}
            >
              {/* Thumbnail para imagens */}
              {isImage(doc.name) ? (
                <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", background: "#000" }}>
                  <img src={doc.file_url} alt={doc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{ width: "100%", aspectRatio: "4/3", background: "var(--ws-surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "2.5rem" }}>{getIcon(doc.name)}</span>
                </div>
              )}

              <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: ".82rem", color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: ".68rem", color: "var(--ws-text3)", fontFamily: "Poppins" }}>
                  {new Date(doc.uploaded_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }} onClick={e => e.stopPropagation()}>
                  <a href={doc.file_url} target="_blank" rel="noreferrer" style={{
                    flex: 1, background: caseData.color, border: "none",
                    borderRadius: 6, color: "#fff", padding: "7px 10px", fontSize: ".75rem",
                    fontWeight: 700, textDecoration: "none", textAlign: "center", display: "block",
                  }}>
                    Abrir
                  </a>
                  {!readonly && (
                    <button onClick={() => void removeDocument(doc)} style={{
                      background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)",
                      borderRadius: 6, color: "var(--ws-text3)", cursor: "pointer",
                      padding: "7px 10px", fontSize: ".75rem",
                    }}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Preview de imagem fullscreen */}
      {previewDoc && (
        <div
          onClick={() => setPreviewDoc(null)}
          style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <button onClick={() => setPreviewDoc(null)} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          <img
            src={previewDoc.file_url}
            alt={previewDoc.name}
            style={{ maxWidth: "95vw", maxHeight: "90dvh", objectFit: "contain", borderRadius: 8 }}
            onClick={e => e.stopPropagation()}
          />
          <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,.6)", borderRadius: 8, padding: "6px 14px", color: "#fff", fontSize: ".78rem", fontFamily: "Poppins", whiteSpace: "nowrap" }}>
            {previewDoc.name}
          </div>
        </div>
      )}
    </div>
  );
}