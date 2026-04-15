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
    // ── Cliente → Admin ──────────────────────────────────────
    case "cliente_aprovacao":
      return {
        title: `✅ ${data.case_name} aprovou um post`,
        body: `"${data.post_title}" foi aprovado. Acesse o Workspace.`,
      };
    case "cliente_aprovacao_massa":
      return {
        title: `✅ ${data.case_name} aprovou todos os posts`,
        body: `${data.count} post${data.count !== 1 ? "s" : ""} aprovados de uma vez. Acesse o Workspace.`,
      };
    case "cliente_reprovacao":
      return {
        title: `❌ ${data.case_name} reprovou um post`,
        body: `"${data.post_title}" foi reprovado${data.reason ? `: ${data.reason}` : ""}. Acesse o Workspace.`,
      };
    case "cliente_alteracao":
      return {
        title: `⚠️ ${data.case_name} solicitou alteração`,
        body: `"${data.post_title}" precisa de ajustes. Acesse o Workspace.`,
      };
    case "cliente_comentario_post":
      return {
        title: `💬 ${data.case_name} comentou em um post`,
        body: `"${data.post_title}": ${data.comment?.slice(0, 80)}`,
      };
    case "cliente_comentario_nota":
      return {
        title: `💬 ${data.case_name} comentou em uma nota`,
        body: `"${data.card_title}": ${data.comment?.slice(0, 80)}`,
      };
    // ── Designer → Admin ─────────────────────────────────────
    case "designer_entregou_briefing":
      return {
        title: `🎨 ${data.designer_name} entregou uma arte`,
        body: `Briefing "${data.format}" do cliente ${data.case_name} aguarda aprovação.`,
      };
    case "designer_fechou_financeiro":
      return {
        title: `💰 ${data.designer_name} fechou o financeiro`,
        body: `Valor: ${fmtMoney(data.total_final)} — ${MONTHS[(data.month ?? 1) - 1]}/${data.year}. Acesse para aprovar.`,
      };
    // ── Admin → Designer ─────────────────────────────────────
    case "briefing_criado":
      return {
        title: `📋 Novo briefing para você`,
        body: `Briefing "${data.format}" do cliente ${data.case_name} foi criado. Acesse o Workspace Dig.`,
      };
    case "briefing_revisao":
      return {
        title: `🔄 Revisão solicitada`,
        body: `O briefing "${data.format}" de ${data.case_name} precisa de ajustes. Acesse o Workspace Dig.`,
      };
    case "briefing_aprovado":
      return {
        title: `✅ Arte aprovada!`,
        body: `Seu trabalho em "${data.format}" para ${data.case_name} foi aprovado pela Dig.`,
      };
    case "financeiro_aprovado":
      return {
        title: `💰 Financeiro aprovado`,
        body: `Seu fechamento de ${MONTHS[(data.month ?? 1) - 1]}/${data.year} foi aprovado. Pagamento previsto para ${data.payment_date ?? "em breve"}.`,
      };
    // ── Conteúdo (cliente) ───────────────────────────────────
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
      return { title: data.title ?? "Workspace Dig", body: data.body ?? "" };
  }
}

function buildUrl(type: string): string {
  const clientFinanceiro = ["cobranca_criada", "vencimento_aviso", "vencimento_atrasado", "pagamento_confirmado"];
  const clientConteudo = ["conteudo_pronto"];
  const designerTypes = ["briefing_criado", "briefing_revisao", "briefing_aprovado", "financeiro_aprovado"];
  if (clientFinanceiro.includes(type)) return "/workspace/cliente/financeiro";
  if (clientConteudo.includes(type)) return "/workspace/cliente/conteudo";
  if (designerTypes.includes(type)) return "/workspace/designer";
  // admin notifications
  return "/workspace/clientes";
}

async function sendToProfile(pushToken: string, notification: { title: string; body: string }, url: string) {
  const subscription = JSON.parse(pushToken);
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: "/icon-192.png",
    url,
  });
  await webpush.sendNotification(subscription, payload);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, {
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" }
  });

  try {
    const body = await req.json() as Record<string, any>;
    const { type = "custom", profile_ids, target_role, case_id } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let profiles: { push_token: string; name: string }[] = [];
    let caseClientId: string | null = null;

    if (target_role) {
      // Notifica todos de um role (ex: admin)
      const { data } = await supabase
        .from("profiles")
        .select("push_token, name")
        .eq("role", target_role)
        .not("push_token", "is", null);
      profiles = (data ?? []).filter(p => p.push_token);
    } else if (profile_ids && Array.isArray(profile_ids)) {
      const { data } = await supabase
        .from("profiles")
        .select("push_token, name")
        .in("id", profile_ids)
        .not("push_token", "is", null);
      profiles = (data ?? []).filter(p => p.push_token);
    } else if (case_id) {
      // Look up client for badge recording (regardless of push_token)
      const { data } = await supabase
        .from("profiles")
        .select("id, push_token, name")
        .eq("case_id", case_id)
        .eq("role", "cliente")
        .maybeSingle();
      if (data) {
        caseClientId = data.id;
        if (data.push_token) {
          profiles = [{ push_token: data.push_token, name: data.name }];
        }
      }
    }

    // Salva badge no banco para notificações visuais
    try {
      const notification = buildNotification(type, body);
      const notifPayload: any = {
        type,
        title: notification.title,
        body: notification.body,
        data: body,
        read: false,
        created_at: new Date().toISOString(),
      };

      if (target_role) {
        notifPayload.target_role = target_role;
      }
      if (body.target_user_id) {
        notifPayload.target_user_id = body.target_user_id;
      } else if (profile_ids && profile_ids.length === 1) {
        notifPayload.target_user_id = profile_ids[0];
      } else if (case_id && caseClientId) {
        // notificação de case: vai APENAS para o cliente específico, sem target_role
        notifPayload.target_user_id = caseClientId;
      }

      // Campos de navegação — permitem clicar direto no post pelo sino
      if (body.case_id)  notifPayload.case_id  = body.case_id;
      if (body.post_id)  notifPayload.post_id  = body.post_id;
      if (body.source)   notifPayload.source   = body.source;

      await supabase.from("admin_notifications").insert(notifPayload);
    } catch { /* best-effort */ }

    if (profiles.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, message: "Sem tokens registrados" }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const notifUrl = buildUrl(type);
    const results = await Promise.allSettled(
      profiles.map(p => {
        const caseName = body.case_name ?? p.name;
        const notification = buildNotification(type, { ...body, case_name: caseName, client_name: p.name });
        return sendToProfile(p.push_token, notification, notifUrl);
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
