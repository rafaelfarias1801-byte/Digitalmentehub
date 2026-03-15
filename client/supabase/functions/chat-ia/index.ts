import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.text();
    if (!body) throw new Error("Body vazio.");

    const { messages, model } = JSON.parse(body) as {
      messages: { role: string; content: string }[];
      model: "claude" | "chatgpt" | "gemini";
    };

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    const OPENAI_KEY    = Deno.env.get("OPENAI_API_KEY") ?? "";
    const GEMINI_KEY    = Deno.env.get("GEMINI_API_KEY") ?? "";

    let reply = "";

    // ── Claude ──────────────────────────────────────────────────
    if (model === "claude") {
      if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY não configurada.");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: "Você é um assistente estratégico para a agência Digitalmente HUB. Responda sempre em português brasileiro, de forma direta e útil.",
          messages,
        }),
      });

      const text = await res.text();

      if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${text}`);

      const data = JSON.parse(text);
      reply = data?.content?.[0]?.text ?? "Sem resposta.";
    }

    // ── ChatGPT ─────────────────────────────────────────────────
    else if (model === "chatgpt") {
      if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY não configurada.");

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Você é um assistente estratégico para a agência Digitalmente HUB. Responda sempre em português brasileiro." },
            ...messages,
          ],
          max_tokens: 1024,
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${text}`);

      const data = JSON.parse(text);
      reply = data?.choices?.[0]?.message?.content ?? "Sem resposta.";
    }

    // ── Gemini ──────────────────────────────────────────────────
    else if (model === "gemini") {
      if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY não configurada.");

      const geminiMessages = messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contents: geminiMessages }),
        }
      );

      const text = await res.text();
      if (!res.ok) throw new Error(`Gemini error ${res.status}: ${text}`);

      const data = JSON.parse(text);
      reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sem resposta.";
    }

    else {
      throw new Error("Modelo não suportado.");
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...CORS, "content-type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
});
