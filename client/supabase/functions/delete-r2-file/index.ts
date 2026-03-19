import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, DeleteObjectCommand } from "npm:@aws-sdk/client-s3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { filename } = await req.json()

    if (!filename) {
      throw new Error("O nome do arquivo (filename) é obrigatório")
    }

    // Conecta no R2 usando as mesmas chaves que já salvamos antes
    const s3Client = new S3Client({
      region: "auto",
      endpoint: Deno.env.get("R2_ENDPOINT")!,
      credentials: {
        accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
      },
    })

    const bucketName = Deno.env.get("R2_BUCKET_NAME")!

    // Manda a ordem de exclusão
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: filename,
    })

    await s3Client.send(command)

    return new Response(
      JSON.stringify({ success: true, message: "Arquivo deletado do R2" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})