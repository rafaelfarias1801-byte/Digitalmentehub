// supabase/functions/billing-reminders/index.ts
//
// Scheduled Edge Function that sends automatic payment reminders to clients.
//
// Notification timing:
//   - 3 days before due date → "vencimento_aviso" (days_until: 3)
//   - 1 day before due date  → "vencimento_aviso" (days_until: 1)
//   - On due date            → "vencimento_aviso" (days_until: 0)
//   - Past due (each day)    → "vencimento_atrasado"
//
// Duplicate protection: checks admin_notifications for same payment_id + type sent today.
//
// Supabase Cron Setup — run this SQL in Dashboard → SQL Editor to schedule daily at 9am Brasília (UTC-3 = 12:00 UTC):
//
//   CREATE EXTENSION IF NOT EXISTS pg_cron;
//   CREATE EXTENSION IF NOT EXISTS pg_net;
//
//   SELECT cron.schedule(
//     'billing-reminders-daily',
//     '0 12 * * *',
//     $$
//     SELECT net.http_post(
//       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/billing-reminders',
//       headers := jsonb_build_object(
//         'Content-Type', 'application/json',
//         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
//       ),
//       body := '{}'::jsonb
//     );
//     $$
//   );
//
// Replace YOUR_PROJECT_REF with your Supabase project reference
// and YOUR_SERVICE_ROLE_KEY with your service role key (Settings → API).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOTIFY_URL_PATH = "/functions/v1/notify-client";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, {
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" }
  });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Load all unpaid payments with their case names
  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, case_id, description, amount, due_date, cases(id, name)")
    .eq("paid", false)
    .not("due_date", "is", null);

  if (error) {
    console.error("Error loading payments:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  let sent = 0;
  let skipped = 0;

  for (const payment of (payments ?? [])) {
    const dueDate = new Date(payment.due_date + "T00:00:00");
    const diffMs = dueDate.getTime() - today.getTime();
    const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Only notify on specific days
    if (daysUntil !== 3 && daysUntil !== 1 && daysUntil !== 0 && daysUntil >= 0) {
      continue; // Not a reminder day
    }

    const type = daysUntil < 0 ? "vencimento_atrasado" : "vencimento_aviso";
    const caseId = payment.case_id;
    const caseName = (payment as any).cases?.name ?? "";

    // Check if we already sent this notification today for this payment
    const { data: existing } = await supabase
      .from("admin_notifications")
      .select("id")
      .eq("type", type)
      .filter("data->>payment_id", "eq", payment.id)
      .gte("created_at", todayISO)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // Send via notify-client edge function
    try {
      await fetch(`${supabaseUrl}${NOTIFY_URL_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          case_id: caseId,
          case_name: caseName,
          type,
          amount: payment.amount,
          due_date: payment.due_date,
          payment_id: payment.id,
          days_until: daysUntil,
        }),
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder for payment ${payment.id}:`, err);
    }
  }

  console.log(`Billing reminders: sent=${sent}, skipped=${skipped}`);
  return new Response(
    JSON.stringify({ ok: true, sent, skipped }),
    { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  );
});
