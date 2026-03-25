import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { url, filename } = await req.json();

  if (!url) return new Response("Missing url", { status: 400 });

  const res = await fetch(url);
  if (!res.ok) return new Response("Failed to fetch file", { status: 502 });

  const blob = await res.blob();
  const name = filename || url.split("/").pop()?.split("?")[0] || "arquivo";

  return new Response(blob, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Access-Control-Allow-Origin": "*",
    },
  });
});