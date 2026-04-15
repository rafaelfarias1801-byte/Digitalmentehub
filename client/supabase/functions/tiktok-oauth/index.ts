// supabase/functions/tiktok-oauth/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Production: awxnasje0hynuk0i / L0QMMoSt7O7p2XaKCtEYbo6Nduxh6oig
const CLIENT_KEY    = Deno.env.get("TIKTOK_CLIENT_KEY")    ?? "awxnasje0hynuk0i";
const CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET") ?? "L0QMMoSt7O7p2XaKCtEYbo6Nduxh6oig";
const REDIRECT_URI  = "https://digitalmentehub.com.br/workspace/tiktok/callback";
const SCOPE         = "user.info.basic,video.upload";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body   = await req.json() as Record<string, string>;
    const action = body.action;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Gera URL de autorização ──────────────────────────────────
    if (action === "auth-url") {
      const { case_id } = body;
      const params = new URLSearchParams({
        client_key:    CLIENT_KEY,
        scope:         SCOPE,
        response_type: "code",
        redirect_uri:  REDIRECT_URI,
        state:         case_id,
      });
      const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
      return new Response(JSON.stringify({ url }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    // ── Troca code por access_token ──────────────────────────────
    if (action === "exchange") {
      const { code, state: case_id } = body;

      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key:    CLIENT_KEY,
          client_secret: CLIENT_SECRET,
          code,
          grant_type:   "authorization_code",
          redirect_uri:  REDIRECT_URI,
        }),
      });

      const tokenData = await tokenRes.json() as Record<string, any>;
      console.log("[tiktok-oauth] token response:", JSON.stringify(tokenData));
      if (tokenData.error) {
        console.error("[tiktok-oauth] token error:", tokenData.error, tokenData.error_description);
        return new Response(
          JSON.stringify({ error: tokenData.error_description ?? tokenData.error }),
          { status: 400, headers: { "Content-Type": "application/json", ...CORS } }
        );
      }

      const { access_token, refresh_token, expires_in, open_id } = tokenData;
      const expires_at = new Date(Date.now() + (expires_in as number) * 1000).toISOString();

      // Busca username do usuário
      let username = "";
      try {
        const userRes = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username",
          { headers: { "Authorization": `Bearer ${access_token}` } }
        );
        const userData = await userRes.json() as Record<string, any>;
        username = userData?.data?.user?.username
          ?? userData?.data?.user?.display_name
          ?? "";
      } catch { /* best-effort */ }

      // Salva tokens + info no cases
      const { error: dbErr } = await supabase
        .from("cases")
        .update({
          tiktok_access_token:     access_token,
          tiktok_refresh_token:    refresh_token,
          tiktok_token_expires_at: expires_at,
          tiktok_open_id:          open_id,
          tiktok_username:         username,
          tiktok_user_id:          open_id,
        })
        .eq("id", case_id);

      if (dbErr) throw dbErr;

      return new Response(JSON.stringify({ ok: true, username, open_id }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });

  } catch (err: any) {
    console.error("tiktok-oauth error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Erro desconhecido" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
});
