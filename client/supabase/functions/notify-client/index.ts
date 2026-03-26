// supabase/functions/notify-client/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY  = "BClvrqhcKBe80xM5nqUMeuE8dfZLL8hxHmNFBDwgZzzLtr6S9ynNtyD-4GnPNHwMXsHtNuoSXdzg-4NZiFxQthg";
const VAPID_PRIVATE_KEY = "5YGYX10B_OvQB47O9gacUKcDKMBn9_3hQqIduYiVAb8";
const VAPID_SUBJECT     = "mailto:contato@digitalmentehub.com.br";

// ── VAPID JWT ────────────────────────────────────────────────────────────────
function b64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return new Uint8Array([...bin].map(c => c.charCodeAt(0)));
}

async function buildVapidJwt(audience: string): Promise<string> {
  const header  = b64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })));

  const sigInput = `${header}.${payload}`;
  const keyData  = b64urlDecode(VAPID_PRIVATE_KEY);

  const key = await crypto.subtle.importKey(
    "raw", keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(sigInput)
  );

  return `${sigInput}.${b64url(new Uint8Array(sig))}`;
}

// ── Send push ────────────────────────────────────────────────────────────────
async function sendPush(subscription: PushSubscriptionJSON, payload: string) {
  const endpoint  = subscription.endpoint!;
  const origin    = new URL(endpoint).origin;
  const jwt       = await buildVapidJwt(origin);
  const authHeader = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;

  const keyAuth   = b64urlDecode(subscription.keys!.auth);
  const keyP256dh = b64urlDecode(subscription.keys!.p256dh);

  // ── Encrypt payload (aesgcm / RFC 8291) ─────────────────────────────────
  const salt      = crypto.getRandomValues(new Uint8Array(16));
  const serverKey = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  const serverPub = new Uint8Array(await crypto.subtle.exportKey("raw", serverKey.publicKey));

  const clientKey = await crypto.subtle.importKey(
    "raw", keyP256dh, { name: "ECDH", namedCurve: "P-256" }, false, []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey }, serverKey.privateKey, 256
  );

  // PRK via HKDF-SHA256
  const authInfo  = new TextEncoder().encode("Content-Encoding: auth\0");
  const prk = await crypto.subtle.importKey("raw", new Uint8Array(sharedSecret), { name: "HKDF" }, false, ["deriveBits"]);
  const prkBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: keyAuth, info: authInfo }, prk, 256
  );

  // CEK + nonce
  const keyInfo   = buildInfo("aesgcm", keyP256dh, serverPub);
  const nonceInfo = buildInfo("nonce", keyP256dh, serverPub);
  const prkKey = await crypto.subtle.importKey("raw", prkBits, { name: "HKDF" }, false, ["deriveBits"]);

  const cekBits   = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: keyInfo   }, prkKey, 128);
  const nonceBits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, prkKey, 96);

  const cek   = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
  const body  = new TextEncoder().encode(payload);
  const padded = new Uint8Array([0, 0, ...body]); // 2-byte padding length prefix

  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonceBits, tagLength: 128 }, cek, padded);

  // Assemble body: salt(16) + rs(4) + keyLen(1) + serverPub(65) + ciphertext
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096, false);
  const chunks = [salt, rs, new Uint8Array([65]), serverPub, new Uint8Array(encrypted)];
  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const bodyBuf = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) { bodyBuf.set(c, offset); offset += c.length; }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Encoding": "aesgcm",
      "Content-Type": "application/octet-stream",
      Encryption: `salt=${b64url(salt)}`,
      "Crypto-Key": `dh=${b64url(serverPub)};p256ecdsa=${VAPID_PUBLIC_KEY}`,
      TTL: "86400",
    },
    body: bodyBuf,
  });

  if (!res.ok) throw new Error(`Push failed: ${res.status} ${await res.text()}`);
}

function buildInfo(type: string, clientPub: Uint8Array, serverPub: Uint8Array): Uint8Array {
  const enc = new TextEncoder();
  const label = enc.encode(`Content-Encoding: ${type}\0P-256\0`);
  const buf = new Uint8Array(label.length + 2 + clientPub.length + 2 + serverPub.length);
  let i = 0;
  buf.set(label, i); i += label.length;
  new DataView(buf.buffer).setUint16(i, clientPub.length, false); i += 2;
  buf.set(clientPub, i); i += clientPub.length;
  new DataView(buf.buffer).setUint16(i, serverPub.length, false); i += 2;
  buf.set(serverPub, i);
  return buf;
}

// ── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, {
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" }
  });

  try {
    const { case_id, case_name } = await req.json() as { case_id: string; case_name: string };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca push_token do cliente vinculado ao case
    const { data: clientProfile, error } = await supabase
      .from("profiles")
      .select("push_token, name")
      .eq("case_id", case_id)
      .eq("role", "cliente")
      .maybeSingle();

    if (error || !clientProfile?.push_token) {
      return new Response(JSON.stringify({ error: "Cliente sem token de notificação. Ele precisa acessar o workspace primeiro." }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const subscription = JSON.parse(clientProfile.push_token) as PushSubscriptionJSON;

    const payload = JSON.stringify({
      title: `${case_name} — conteúdo pronto 🎉`,
      body: "Seu calendário de conteúdo está pronto para revisão. Acesse o Workspace Dig.",
      icon: "/icon-192.png",
      url: "/workspace",
    });

    await sendPush(subscription, payload);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});
