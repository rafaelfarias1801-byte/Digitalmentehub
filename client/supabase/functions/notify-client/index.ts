// supabase/functions/notify-client/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY  = "BClvrqhcKBe80xM5nqUMeuE8dfZLL8hxHmNFBDwgZzzLtr6S9ynNtyD-4GnPNHwMXsHtNuoSXdzg-4NZiFxQthg";
const VAPID_PRIVATE_KEY = "5YGYX10B_OvQB47O9gacUKcDKMBn9_3hQqIduYiVAb8";

webpush.setVapidDetails(
  "mailto:contato@digitalmentehub.com.br",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
    }
  });

  try {
    const { case_id, case_name } = await req.json() as { case_id: string; case_name: string };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: clientProfile, error } = await supabase
      .from("profiles")
      .select("push_token, name")
      .eq("case_id", case_id)
      .eq("role", "cliente")
      .maybeSingle();

    if (error || !clientProfile?.push_token) {
      return new Response(
        JSON.stringify({ error: "Cliente sem token de notificação. Ele precisa acessar o workspace primeiro." }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const subscription = JSON.parse(clientProfile.push_token);

    const payload = JSON.stringify({
      title: `${case_name} — conteúdo pronto 🎉`,
      body: "Seu calendário de conteúdo está pronto para revisão. Acesse o Workspace Dig.",
      icon: "/icon-192.png",
      url: "/workspace",
    });

    await webpush.sendNotification(subscription, payload);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );

  } catch (err: any) {
    console.error("notify-client error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Erro desconhecido" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
