import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { useState } from "react";
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

const TAB_STYLES = {
  base: {
    padding: "6px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: ".8rem",
    fontWeight: 600,
    transition: "all .15s",
  } as React.CSSProperties,
  active: {
    background: "var(--ws-accent)",
    color: "#fff",
  } as React.CSSProperties,
  inactive: {
    background: "transparent",
    color: "var(--ws-text2)",
  } as React.CSSProperties,
};

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
  const [activeTab, setActiveTab] = useState<"geral" | "redes">("geral");

  return (
    <div
      style={overlayStyle}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ ...modalBoxStyle, width: 500 }}>
        <div style={modalTitleStyle}>
          {editing ? "Editar case" : "Novo case"}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "var(--ws-surface2)", borderRadius: 10, padding: 4 }}>
          {[
            { id: "geral", label: "Geral" },
            { id: "redes", label: "🔗 Redes Sociais" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "geral" | "redes")}
              style={{
                ...TAB_STYLES.base,
                ...(activeTab === tab.id ? TAB_STYLES.active : TAB_STYLES.inactive),
                flex: 1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Geral */}
        {activeTab === "geral" && (
          <>
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
                  placeholder="Nome do contato"
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

            <label className="ws-label">Email do cliente</label>
            <input
              className="ws-input"
              type="email"
              value={form.client_email || ""}
              placeholder="email@cliente.com.br"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, client_email: e.target.value }))
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
          </>
        )}

        {/* Tab: Redes Sociais */}
        {activeTab === "redes" && (
          <>
            <div style={{
              background: "var(--ws-surface2)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: ".75rem",
              color: "var(--ws-text2)",
              lineHeight: 1.5,
            }}>
              💡 Os <strong>IDs de integração</strong> são usados para automações (Make, n8n). Os <strong>@usuários</strong> são para referência interna do time.
            </div>

            {/* Instagram */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: "1rem" }}>📸</span>
                <span style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--ws-text1)" }}>Instagram</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="ws-label">@ Usuário</label>
                  <input
                    className="ws-input"
                    value={form.instagram_username || ""}
                    placeholder="@cliente"
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, instagram_username: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="ws-label">Page ID (integração)</label>
                  <input
                    className="ws-input"
                    value={form.instagram_page_id || ""}
                    placeholder="Ex: 17841449..."
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, instagram_page_id: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Facebook */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: "1rem" }}>👤</span>
                <span style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--ws-text1)" }}>Facebook</span>
              </div>
              <div>
                <label className="ws-label">Page ID (integração)</label>
                <input
                  className="ws-input"
                  value={form.facebook_page_id || ""}
                  placeholder="Ex: 123456789..."
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, facebook_page_id: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* TikTok */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: "1rem" }}>🎵</span>
                <span style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--ws-text1)" }}>TikTok</span>
              </div>
              <div>
                <label className="ws-label">@ Usuário</label>
                <input
                  className="ws-input"
                  value={form.tiktok_username || ""}
                  placeholder="@cliente"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tiktok_username: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* LinkedIn */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: "1rem" }}>💼</span>
                <span style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--ws-text1)" }}>LinkedIn</span>
              </div>
              <div>
                <label className="ws-label">URL do perfil</label>
                <input
                  className="ws-input"
                  value={form.linkedin_url || ""}
                  placeholder="linkedin.com/in/cliente"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, linkedin_url: e.target.value }))
                  }
                />
              </div>
            </div>
          </>
        )}

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
