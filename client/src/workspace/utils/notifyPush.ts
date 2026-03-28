// client/src/workspace/utils/notifyPush.ts
// Helper centralizado para enviar push notifications via Edge Function

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callNotify(body: object): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/notify-client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify(body),
    });
  } catch { /* silently ignore */ }
}

// ── Notifica todos os admins ─────────────────────────────────
export async function notifyAdmins(params: {
  type: string;
  title: string;
  body: string;
  [key: string]: any;
}): Promise<void> {
  await callNotify({ ...params, target_role: "admin" });
}

// ── Notifica um designer específico ─────────────────────────
export async function notifyDesigner(params: {
  designer_id: string;
  type: string;
  title: string;
  body: string;
  [key: string]: any;
}): Promise<void> {
  await callNotify({ ...params, profile_ids: [params.designer_id], target_user_id: params.designer_id });
}

export async function notifyUser(params: {
  user_id: string;
  type: string;
  title: string;
  body: string;
  [key: string]: any;
}): Promise<void> {
  await callNotify({ ...params, profile_ids: [params.user_id], target_user_id: params.user_id });
}
