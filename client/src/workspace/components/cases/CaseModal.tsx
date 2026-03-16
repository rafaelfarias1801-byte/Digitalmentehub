import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { COLORS } from "./constants";
import { modalBoxStyle, modalTitleStyle, overlayStyle } from "./styles";
import type { Case } from "./types";

interface CaseModalProps {
  form: Omit<Case, "id">;
  setForm: Dispatch<SetStateAction<Omit<Case, "id">>>;
  editing: Case | null;
  saving: boolean;
  uploading: boolean;
  fileRef: MutableRefObject<HTMLInputElement | null>;
  uploadLogo: (file: File) => Promise<void> | void;
  onSave: () => Promise<void> | void;
  onClose: () => void;
}

export default function CaseModal({
  form,
  setForm,
  editing,
  saving,
  uploading,
  fileRef,
  uploadLogo,
  onSave,
  onClose,
}: CaseModalProps) {
  return (
    <div
      style={overlayStyle}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ ...modalBoxStyle, width: 500 }}>
        <div style={modalTitleStyle}>
          {editing ? "Editar case" : "Novo case"}
        </div>

        <label className="ws-label">Logo / Capa</label>
        <div
          style={{
            height: 90,
            borderRadius: 10,
            overflow: "hidden",
            background: form.logo_url
              ? undefined
              : `linear-gradient(135deg,${form.color}33,${form.color}11)`,
            border: "1px dashed var(--ws-border2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            marginBottom: 8,
          }}
          onClick={() => fileRef.current?.click()}
        >
          {form.logo_url ? (
            <img
              src={form.logo_url}
              alt="logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ color: "var(--ws-text3)", fontSize: ".78rem" }}>
              {uploading ? "Enviando..." : "Clique para enviar logo"}
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) =>
            e.target.files?.[0] && uploadLogo(e.target.files[0])
          }
        />

        {form.logo_url && (
          <button
            onClick={() => setForm((prev) => ({ ...prev, logo_url: "" }))}
            style={{
              fontSize: ".72rem",
              color: "var(--ws-accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            × Remover logo
          </button>
        )}

        <label className="ws-label">Nome do cliente</label>
        <input
          className="ws-input"
          value={form.name}
          placeholder="Ex: Carlos Cavalheiro"
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          style={{ marginBottom: 12 }}
        />

        <label className="ws-label">Descrição</label>
        <input
          className="ws-input"
          value={form.description}
          placeholder="Ex: Gestão de conteúdo e estratégia"
          onChange={(e) =>
            setForm((prev) => ({ ...prev, description: e.target.value }))
          }
          style={{ marginBottom: 12 }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label className="ws-label">Status</label>
            <select
              className="ws-input"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as Case["status"],
                }))
              }
            >
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </div>

          <div>
            <label className="ws-label">Segmento</label>
            <input
              className="ws-input"
              value={form.segment}
              placeholder="Ex: F&B, Liderança..."
              onChange={(e) =>
                setForm((prev) => ({ ...prev, segment: e.target.value }))
              }
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label className="ws-label">Contato</label>
            <input
              className="ws-input"
              value={form.contact}
              placeholder="Nome ou e-mail"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contact: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="ws-label">Cliente desde</label>
            <input
              className="ws-input"
              value={form.since}
              placeholder="Ex: Jan 2024"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, since: e.target.value }))
              }
            />
          </div>
        </div>

        <label className="ws-label">WhatsApp do cliente</label>
        <input
          className="ws-input"
          value={form.phone || ""}
          placeholder="Ex: 5511999999999"
          onChange={(e) =>
            setForm((prev) => ({ ...prev, phone: e.target.value }))
          }
          style={{ marginBottom: 12 }}
        />

        <label className="ws-label">Cor do case</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {COLORS.map((color) => (
            <div
              key={color}
              onClick={() => setForm((prev) => ({ ...prev, color }))}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: color,
                cursor: "pointer",
                border:
                  form.color === color
                    ? "3px solid white"
                    : "3px solid transparent",
                boxShadow:
                  form.color === color ? `0 0 0 2px ${color}` : "none",
                transition: "all .15s",
              }}
            />
          ))}
        </div>

        <label className="ws-label">Observações</label>
        <textarea
          className="ws-input"
          value={form.notes}
          placeholder="Anotações internas..."
          onChange={(e) =>
            setForm((prev) => ({ ...prev, notes: e.target.value }))
          }
          style={{ minHeight: 70, resize: "vertical", marginBottom: 20 }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="ws-btn"
            onClick={() => void onSave()}
            disabled={saving || uploading}
            style={{ flex: 1 }}
          >
            {saving
              ? "Salvando..."
              : editing
              ? "Salvar alterações"
              : "Criar case"}
          </button>

          <button className="ws-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
