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

const MONTHS = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [, m] = iso.split("-");
  return MONTHS[parseInt(m, 10) - 1] ?? "";
}

function buildNotification(type: string, data: Record<string, any>): { title: string; body: string } {
  const firstName = (data.client_name as string | undefined)?.split(" ")[0] ?? "";
  const hi = firstName ? `Olá ${firstName}, ` : "";

  switch (type) {
    case "conteudo_pronto":
      return {
        title: `${data.case_name} — conteúdo pronto 🎉`,
        body: `${hi}${data.post_count} post${data.post_count !== 1 ? "s" : ""} do mês de ${data.month_label} ${data.post_count !== 1 ? "estão prontos" : "está pronto"} para revisão. Acesse o Workspace Dig.`,
      };
    case "cobranca_criada":
      return {
        title: `${data.case_name} — nova cobrança 💰`,
        body: `${hi}uma cobrança de ${fmtMoney(data.amount)} foi criada para o mês de ${fmtDate(data.due_date)}. Acesse e confira.`,
      };
    case "pagamento_confirmado":
      return {
        title: `${data.case_name} — pagamento confirmado ✅`,
        body: `Recebemos seu pagamento do mês de ${fmtDate(data.due_date)} no valor de ${fmtMoney(data.amount)}. Obrigado!`,
      };
    case "vencimento_aviso": {
      const dias = data.days_until as number;
      const label = dias === 0 ? "vence hoje" : dias === 1 ? "vence amanhã" : `vence em ${dias} dias`;
      return {
        title: `${data.case_name} — cobrança ${label} ⏰`,
        body: `${hi}sua cobrança de ${fmtMoney(data.amount)} ${label}. Acesse o Workspace Dig.`,
      };
    }
    case "vencimento_atrasado":
      return {
        title: `${data.case_name} — cobrança em atraso ⚠️`,
        body: `${hi}sua cobrança de ${fmtMoney(data.amount)} está em atraso. Acesse o Workspace Dig para regularizar.`,
      };
    case "custom":
      return {
        title: data.title ?? `${data.case_name} — aviso`,
        body: data.body ?? "",
      };
    default:
      return {
        title: data.case_name ?? "Workspace Dig",
        body: data.body ?? "",
      };
  }
}

async function sendToProfile(pushToken: string, notification: { title: string; body: string }) {
  const subscription = JSON.parse(pushToken);
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: "/icon-192.png",
    url: "/workspace",
  });
  await webpush.sendNotification(subscription, payload);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
    }
  });

  try {
    const body = await req.json() as Record<string, any>;
    const { case_id, case_name, type = "conteudo_pronto", profile_ids } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Se profile_ids fornecido (broadcast), envia para lista específica
    // Se case_id fornecido, busca o cliente do case
    let profiles: { push_token: string; name: string }[] = [];

    if (profile_ids && Array.isArray(profile_ids)) {
      const { data } = await supabase
        .from("profiles")
        .select("push_token, name")
        .in("id", profile_ids)
        .not("push_token", "is", null);
      profiles = (data ?? []).filter(p => p.push_token);
    } else if (case_id) {
      const { data } = await supabase
        .from("profiles")
        .select("push_token, name")
        .eq("case_id", case_id)
        .eq("role", "cliente")
        .not("push_token", "is", null)
        .maybeSingle();
      if (data?.push_token) profiles = [data];
    }

    if (profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cliente sem token de notificação. Ele precisa acessar o workspace primeiro." }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const results = await Promise.allSettled(
      profiles.map(p => {
        const notification = buildNotification(type, { ...body, case_name: case_name ?? p.name, client_name: p.name });
        return sendToProfile(p.push_token, notification);
      })
    );

    const failed = results.filter(r => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ ok: true, sent: results.length - failed, failed }),
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
