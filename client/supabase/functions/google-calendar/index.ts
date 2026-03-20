import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REDIRECT_URI         = Deno.env.get("GOOGLE_REDIRECT_URI")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  // ── AUTH URL ──
  if (path === "auth-url") {
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.readonly");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    const body = await req.json().catch(() => ({}));
    authUrl.searchParams.set("state", body.user_id ?? "");
    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── CALLBACK ──
  if (path === "callback") {
    const code = url.searchParams.get("code");
    const userId = url.searchParams.get("state");
    if (!code || !userId) return new Response("Parâmetros inválidos", { status: 400 });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) return new Response("Erro ao obter token", { status: 500 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from("profiles").update({
      google_calendar_token: tokens.refresh_token ?? tokens.access_token,
    }).eq("id", userId);

    const appUrl = Deno.env.get("APP_URL") ?? "https://www.digitalmentehub.com.br/workspace";
    return Response.redirect(`${appUrl}?google_connected=1`, 302);
  }

  // ── EVENTS (Busca e Salva no Banco) ──
  if (path === "events") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!)
      .auth.getUser(jwt);

    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { data: profile } = await supabase.from("profiles").select("google_calendar_token").eq("id", user.id).single();
    if (!profile?.google_calendar_token) {
      return new Response(JSON.stringify({ events: [], connected: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: profile.google_calendar_token,
        client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });

    const refreshed = await refreshRes.json();
    if (!refreshed.access_token) {
      await supabase.from("profiles").update({ google_calendar_token: null }).eq("id", user.id);
      return new Response(JSON.stringify({ events: [], connected: false, expired: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const gcalRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${in60}&singleEvents=true&orderBy=startTime&maxResults=50`,
      { headers: { Authorization: `Bearer ${refreshed.access_token}` } }
    );

    const gcal = await gcalRes.json();
    const events = (gcal.items ?? []).map((item: any) => {
      const startDateTime = item.start?.dateTime;
      const endDateTime = item.end?.dateTime;

      return {
        google_event_id: item.id,
        title: item.summary ?? "(Sem título)",
        date: (item.start?.date ?? startDateTime ?? "").slice(0, 10),
        type: "reuniao",
        note: item.description ?? item.location ?? "",
        source: "google",
        // CORREÇÃO DO FUSO HORÁRIO AQUI:
        time: startDateTime ? new Date(startDateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : undefined,
        time_end: endDateTime ? new Date(endDateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : undefined,
        meet_link: item.hangoutLink ?? undefined,
        attendees: item.attendees ? item.attendees.map((a: any) => a.displayName ?? a.email).join(", ") : undefined,
      };
    });

    // SALVA NO SUPABASE (UPSERT)
    if (events.length > 0) {
      await supabase.from("events").upsert(events, { onConflict: "google_event_id" });
    }

    return new Response(JSON.stringify({ events, connected: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
});