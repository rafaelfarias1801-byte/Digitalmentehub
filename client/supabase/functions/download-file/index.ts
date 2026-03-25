import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, filename } = await req.json();
    if (!url) return new Response("Missing url", { status: 400, headers: corsHeaders });

    const res = await fetch(url);
    if (!res.ok) return new Response("Failed to fetch", { status: 502, headers: corsHeaders });

    const contentType = res.headers.get("Content-Type") || "application/octet-stream";
    const arrayBuffer = await res.arrayBuffer();
    const name = filename || url.split("/").pop()?.split("?")[0] || "arquivo";

    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (err) {
    return new Response(String(err), { status: 500, headers: corsHeaders });
  }
});