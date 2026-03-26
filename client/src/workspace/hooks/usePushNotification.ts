// client/src/workspace/hooks/usePushNotification.ts
import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

const VAPID_PUBLIC_KEY = "BClvrqhcKBe80xM5nqUMeuE8dfZLL8hxHmNFBDwgZzzLtr6S9ynNtyD-4GnPNHwMXsHtNuoSXdzg-4NZiFxQthg";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotification(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    async function register() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // Pede permissão — só abre o prompt se ainda não foi decidido
        if (Notification.permission === "denied") return;
        if (Notification.permission === "default") {
          const result = await Notification.requestPermission();
          if (result !== "granted") return;
        }

        // Verifica se já tem subscription ativa
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        const token = JSON.stringify(sub.toJSON());

        // Salva no Supabase só se mudou
        const { data: profile } = await supabase
          .from("profiles")
          .select("push_token")
          .eq("id", userId)
          .single();

        if (profile?.push_token !== token) {
          await supabase
            .from("profiles")
            .update({ push_token: token })
            .eq("id", userId);
        }
      } catch (err) {
        console.warn("[PushNotification] Falha ao registrar:", err);
      }
    }

    void register();
  }, [userId]);
}
