import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import CaseModal from "./CaseModal";
import CaseWorkspace from "./CaseWorkspace";
import { EMPTY_CASE, STATUS_STYLES } from "./constants";
import Loader from "./shared/Loader";
import { CasesGlobalStyle } from "./styles";
import type { Case, CasesProps } from "./types";

const LS_OPEN_CASE = "ws_open_case_id";

export default function Cases({ profile }: CasesProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCase, setOpenCase] = useState<Case | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Case | null>(null);
  const [form, setForm] = useState<Omit<Case, "id">>(EMPTY_CASE);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCases() {
      setLoading(true);

      const { data } = await supabase
        .from("cases")
        .select("*")
        .order("created_at");

      if (mounted) {
        const list = data ?? [];
        setCases(list);

        // Restaura o case aberto se havia um salvo
        const savedId = localStorage.getItem(LS_OPEN_CASE);
        if (savedId) {
          const found = list.find((c) => c.id === savedId);
          if (found) setOpenCase(found);
        }

        setLoading(false);
      }
    }

    void loadCases();

    return () => {
      mounted = false;
    };
  }, []);

  function selectCase(caseItem: Case) {
    localStorage.setItem(LS_OPEN_CASE, caseItem.id);
    setOpenCase(caseItem);
  }

  function closeCase() {
    localStorage.removeItem(LS_OPEN_CASE);
    setOpenCase(null);
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_CASE);
    setModal(true);
  }

  function openEdit(caseItem: Case) {
    setEditing(caseItem);
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
    });
    setModal(true);
  }

  async function uploadLogo(file: File) {
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `cases/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("assets")
      .upload(path, file, { upsert: true });

    if (!error) {
      const { data } = supabase.storage.from("assets").getPublicUrl(path);

      setForm((prev) => ({
        ...prev,
        logo_url: data.publicUrl,
      }));
    }

    setUploading(false);
  }

  async function save() {
    if (!form.name.trim()) return;

    setSaving(true);

    if (editing) {
      const { data, error } = await supabase
        .from("cases")
        .update(form)
        .eq("id", editing.id)
        .select()
        .single();

      if (!error && data) {
        setCases((prev) =>
          prev.map((item) => (item.id === editing.id ? data : item))
        );

        if (openCase?.id === editing.id) {
          setOpenCase(data);
        }
      }
    } else {
      const { data, error } = await supabase
        .from("cases")
        .insert(form)
        .select()
        .single();

      if (!error && data) {
        setCases((prev) => [...prev, data]);
      }
    }

    setSaving(false);
    setModal(false);
  }

  async function remove(id: string) {
    setCases((prev) => prev.filter((item) => item.id !== id));

    if (openCase?.id === id) {
      closeCase();
    }

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
        />

        {modal && (
          <CaseModal
            form={form}
            setForm={setForm}
            editing={editing}
            saving={saving}
            uploading={uploading}
            fileRef={fileRef}
            uploadLogo={uploadLogo}
            onSave={save}
            onClose={() => setModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="ws-page">
      <CasesGlobalStyle />

      <div className="ws-page-title">
        Cases<span className="ws-dot">.</span>
      </div>

      <div className="ws-page-sub">
        Clientes ativos e histórico de projetos
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="ws-btn" onClick={openAdd}>
          + Novo Case
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
            gap: 16,
          }}
        >
          {cases.map((caseItem) => (
            <div
              key={caseItem.id}
              className="ws-case"
              style={{ cursor: "pointer" }}
              onClick={() => selectCase(caseItem)}
            >
              <div
                className="ws-case-thumb"
                style={{
                  background: caseItem.logo_url
                    ? undefined
                    : `linear-gradient(135deg,${caseItem.color}33,${caseItem.color}11)`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {caseItem.logo_url ? (
                  <img
                    src={caseItem.logo_url}
                    alt={caseItem.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{ color: caseItem.color, fontSize: "2rem" }}>
                    {caseItem.name.slice(0, 2).toUpperCase()}
                  </span>
                )}

                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: caseItem.color,
                  }}
                />
              </div>

              <div className="ws-case-body">
                <div className="ws-case-name">{caseItem.name}</div>
                <div className="ws-case-desc">
                  {caseItem.description || "—"}
                </div>
                <span
                  className={`ws-case-status ${STATUS_STYLES[caseItem.status]}`}
                >
                  {caseItem.status}
                </span>
              </div>
            </div>
          ))}

          <div
            onClick={openAdd}
            style={{
              background: "transparent",
              border: "2px dashed var(--ws-border2)",
              borderRadius: "var(--ws-radius)",
              minHeight: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
              cursor: "pointer",
              color: "var(--ws-text3)",
              fontSize: ".8rem",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--ws-accent)";
              e.currentTarget.style.color = "var(--ws-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--ws-border2)";
              e.currentTarget.style.color = "var(--ws-text3)";
            }}
          >
            <div style={{ fontSize: "1.6rem" }}>+</div>
            <div
              style={{
                fontFamily: "Poppins",
                fontSize: ".62rem",
                letterSpacing: "1px",
              }}
            >
              NOVO CASE
            </div>
          </div>
        </div>
      )}

      {modal && (
        <CaseModal
          form={form}
          setForm={setForm}
          editing={editing}
          saving={saving}
          uploading={uploading}
          fileRef={fileRef}
          uploadLogo={uploadLogo}
          onSave={save}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  );
}
