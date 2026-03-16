import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import Empty from "../shared/Empty";
import Loader from "../shared/Loader";
import type { Case, CaseDocument } from "../types";
import { useIsMobile } from "../../../hooks/useIsMobile";

interface TabDocumentosProps {
  caseData: Case;
  type: "contrato" | "documento";
}

export default function TabDocumentos({
  caseData,
  type,
}: TabDocumentosProps) {
  const [docs, setDocs] = useState<CaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const docType = type === "contrato" ? "contrato" : "outro";

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

  async function upload(file: File) {
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `docs/${caseData.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("assets")
      .upload(path, file, { upsert: true });

    if (!error) {
      const { data: publicData } = supabase.storage
        .from("assets")
        .getPublicUrl(path);

      const { data } = await supabase
        .from("documents")
        .insert({
          case_id: caseData.id,
          name: file.name,
          file_url: publicData.publicUrl,
          doc_type: docType,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (data) {
        setDocs((prev) => [...prev, data]);
      }
    }

    setUploading(false);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function removeDocument(id: string) {
    setDocs((prev) => prev.filter((item) => item.id !== id));
    await supabase.from("documents").delete().eq("id", id);
  }

  function getIcon(name: string) {
    if (name.toLowerCase().endsWith(".pdf")) return "📄";
    if (/\.(png|jpg|jpeg|webp)$/i.test(name)) return "🖼";
    return "📃";
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          className="ws-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? "Enviando..."
            : `+ Enviar ${type === "contrato" ? "contrato" : "documento"}`}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>

      {loading ? (
        <Loader />
      ) : docs.length === 0 ? (
        <Empty
          label={`Nenhum ${
            type === "contrato" ? "contrato" : "documento"
          } enviado ainda.`}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {docs.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: "var(--ws-surface)",
                border: "1px solid var(--ws-border)",
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                alignItems: isMobile ? "flex-start" : "center",
                gap: 12,
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>{getIcon(doc.name)}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: ".87rem", color: "var(--ws-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: ".72rem", color: "var(--ws-text3)", fontFamily: "DM Mono", marginTop: 2 }}>
                    {new Date(doc.uploaded_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>

                {!isMobile && (
                  <button onClick={() => void removeDocument(doc.id)} style={{ background: "none", border: "none", color: "var(--ws-text3)", cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>×</button>
                )}
              </div>

              {/* Ações — linha separada no mobile para garantir visibilidade */}
              <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto" }}>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: isMobile ? 1 : undefined,
                    background: caseData.color,
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    padding: "10px 20px",
                    fontSize: ".8rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    textAlign: "center",
                    display: "block",
                  }}
                >
                  Abrir
                </a>
                {isMobile && (
                  <button onClick={() => void removeDocument(doc.id)} style={{ background: "var(--ws-surface2)", border: "1px solid var(--ws-border2)", borderRadius: 8, color: "var(--ws-text3)", cursor: "pointer", padding: "10px 16px", fontSize: ".8rem" }}>
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}