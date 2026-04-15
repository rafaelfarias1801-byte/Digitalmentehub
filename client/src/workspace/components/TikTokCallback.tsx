// client/src/workspace/components/TikTokCallback.tsx
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "../../lib/supabaseClient";

export default function TikTokCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus]   = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [caseId, setCaseId]   = useState<string | null>(null);

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const code    = params.get("code");
    const state   = params.get("state");   // case_id
    const errParam = params.get("error");

    if (errParam) {
      setStatus("error");
      setMessage(`TikTok negou o acesso: ${errParam}`);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Parâmetros inválidos na URL de callback.");
      return;
    }

    setCaseId(state);

    async function exchange() {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("tiktok-oauth", {
          body: { action: "exchange", code, state },
        });

        if (fnError || data?.error) {
          throw new Error(data?.error ?? fnError?.message ?? "Erro desconhecido");
        }

        const username = data.username ? `@${data.username}` : "conta conectada";
        setStatus("success");
        setMessage(`TikTok conectado com sucesso: ${username}`);

        // Redireciona para o workspace do cliente após 2s
        setTimeout(() => {
          setLocation(`/workspace/clientes/${state}/conteudo`);
        }, 2000);
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message ?? "Erro ao conectar TikTok.");
      }
    }

    void exchange();
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100vh", background: "var(--ws-bg)",
      fontFamily: "Poppins", gap: 16, padding: 24,
      textAlign: "center",
    }}>
      {status === "loading" && (
        <>
          <div style={{ fontSize: "3rem" }}>🎵</div>
          <div style={{ color: "var(--ws-text)", fontWeight: 700, fontSize: "1rem" }}>
            Conectando TikTok...
          </div>
          <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>
            Trocando código de autorização por token de acesso.
          </div>
        </>
      )}
      {status === "success" && (
        <>
          <div style={{ fontSize: "3rem" }}>✅</div>
          <div style={{ color: "#00a864", fontWeight: 700, fontSize: "1.1rem" }}>
            {message}
          </div>
          <div style={{ color: "var(--ws-text3)", fontSize: ".82rem" }}>
            Redirecionando para o workspace...
          </div>
        </>
      )}
      {status === "error" && (
        <>
          <div style={{ fontSize: "3rem" }}>❌</div>
          <div style={{ color: "#d63232", fontWeight: 700, fontSize: "1rem" }}>
            Erro ao conectar TikTok
          </div>
          <div style={{ color: "var(--ws-text2)", fontSize: ".85rem", maxWidth: 360 }}>
            {message}
          </div>
          <button
            onClick={() => setLocation(caseId ? `/workspace/clientes/${caseId}` : "/workspace/clientes")}
            style={{
              marginTop: 8, padding: "10px 24px", borderRadius: 10,
              border: "none", background: "var(--ws-accent)", color: "#fff",
              cursor: "pointer", fontFamily: "Poppins", fontWeight: 600,
              fontSize: ".88rem",
            }}
          >
            Voltar ao Workspace
          </button>
        </>
      )}
    </div>
  );
}
