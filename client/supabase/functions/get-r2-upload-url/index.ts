import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3"
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Lida com a requisição de preflight (CORS) do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Pegamos o nome do arquivo e o tipo que o frontend quer enviar
    const { filename, contentType } = await req.json()

    if (!filename || !contentType) {
      throw new Error("filename e contentType são obrigatórios")
    }

    // Configura o cliente S3 apontando para o seu Cloudflare R2 usando os secrets
    const s3Client = new S3Client({
      region: "auto",
      endpoint: Deno.env.get("R2_ENDPOINT")!,
      credentials: {
        accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
      },
    })

    const bucketName = Deno.env.get("R2_BUCKET_NAME")!

    // Prepara o comando de upload
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      ContentType: contentType,
    })

    // Gera uma URL temporária válida por 5 minutos (300 segundos)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })

    // Retorna a URL segura para o frontend
    return new Response(
      JSON.stringify({ signedUrl, filename }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})