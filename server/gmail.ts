// Gmail integration via Replit connector
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

interface LeadData {
  name: string;
  phone: string;
  email: string;
  company?: string;
  contactType?: string;
  message?: string | null;
}

const contactTypeLabels: Record<string, string> = {
  servico: "Serviço",
  consultoria: "Consultoria",
  parceria: "Parceria",
  outro: "Outro",
};

interface PaymentData {
  paymentId?: string;
  status?: string;
  merchantOrderId?: string;
}

export async function sendPaymentNotification(payment: PaymentData) {
  const gmail = await getUncachableGmailClient();

  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #e4552d; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Pagamento Confirmado - Digitalmente HUB</h1>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #333; font-size: 15px; margin-bottom: 16px;">Um cliente finalizou o pagamento via Mercado Pago e foi direcionado para a página de confirmação.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333; width: 180px;">Data/Hora:</td>
            <td style="padding: 8px 0; color: #555;">${now}</td>
          </tr>
          ${payment.paymentId ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">ID do Pagamento:</td>
            <td style="padding: 8px 0; color: #555;">${payment.paymentId}</td>
          </tr>` : ''}
          ${payment.status ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Status:</td>
            <td style="padding: 8px 0; color: #555;">${payment.status}</td>
          </tr>` : ''}
          ${payment.merchantOrderId ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">ID do Pedido:</td>
            <td style="padding: 8px 0; color: #555;">${payment.merchantOrderId}</td>
          </tr>` : ''}
        </table>
        <div style="margin-top: 20px; padding: 16px; background: #fff3e0; border-radius: 6px; border-left: 4px solid #e4552d;">
          <p style="color: #333; margin: 0; font-size: 14px;">O cliente foi orientado a preencher o briefing em: <a href="https://tally.so/r/jaBQgJ" style="color: #e4552d;">https://tally.so/r/jaBQgJ</a></p>
        </div>
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 16px; text-align: center;">
        Enviado automaticamente pelo site digitalmentehub.com.br
      </p>
    </div>
  `;

  const to = "digitalmente.oficial.mkt@gmail.com";
  const subject = `Pagamento Confirmado - Digitalmente HUB`;

  const message = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
  ].join('\r\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}

interface CustomerData {
  email?: string;
  whatsapp?: string;
}

export async function sendCustomerBriefingEmail(customer: CustomerData) {
  if (!customer.email) return;

  const gmail = await getUncachableGmailClient();

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #152256; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Digitalmente HUB</h1>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="color: #333; font-size: 16px; margin-bottom: 8px;">Pagamento confirmado!</p>
        <p style="color: #555; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
          Agora precisamos que você preencha o briefing para iniciarmos a criação do seu conteúdo. Leva menos de 5 minutos.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://tally.so/r/jaBQgJ" style="background: #e4552d; color: white; padding: 14px 32px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">Preencher briefing</a>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.6;">
          Se preferir preencher depois, salve este link:<br/>
          <a href="https://tally.so/r/jaBQgJ" style="color: #e4552d;">https://tally.so/r/jaBQgJ</a>
        </p>
      </div>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          Digitalmente HUB — digitalmentehub.com.br
        </p>
      </div>
    </div>
  `;

  const to = customer.email;
  const subject = "Pagamento confirmado - Preencha seu briefing | Digitalmente HUB";

  const message = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
  ].join('\r\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}

export async function sendCustomerDataToAgency(customer: CustomerData) {
  const gmail = await getUncachableGmailClient();

  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const whatsappLink = customer.whatsapp
    ? `https://wa.me/55${customer.whatsapp.replace(/\D/g, "")}`
    : null;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #671f75; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Dados do Cliente - Pós-Pagamento</h1>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #333; font-size: 15px; margin-bottom: 16px;">Um cliente preencheu seus dados de contato após confirmar o pagamento.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333; width: 140px;">Data/Hora:</td>
            <td style="padding: 8px 0; color: #555;">${now}</td>
          </tr>
          ${customer.email ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">E-mail:</td>
            <td style="padding: 8px 0; color: #555;">${customer.email}</td>
          </tr>` : ''}
          ${customer.whatsapp ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">WhatsApp:</td>
            <td style="padding: 8px 0; color: #555;">${customer.whatsapp}</td>
          </tr>` : ''}
        </table>
        ${whatsappLink ? `
        <div style="margin-top: 20px; text-align: center;">
          <a href="${whatsappLink}" style="background: #25D366; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Enviar mensagem no WhatsApp</a>
        </div>` : ''}
        <div style="margin-top: 16px; padding: 12px; background: #f0e6f3; border-radius: 6px; border-left: 4px solid #671f75;">
          <p style="color: #333; margin: 0; font-size: 13px;">Mensagem sugerida para o WhatsApp:</p>
          <p style="color: #555; margin: 8px 0 0; font-size: 13px; font-style: italic;">Oi! Pagamento confirmado. Agora é só preencher o briefing (leva menos de 5 min) para iniciarmos a criação: https://tally.so/r/jaBQgJ — Se preferir, me avise quando enviar.</p>
        </div>
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 16px; text-align: center;">
        Enviado automaticamente pelo site digitalmentehub.com.br
      </p>
    </div>
  `;

  const to = "digitalmente.oficial.mkt@gmail.com";
  const subject = `Dados do Cliente Pós-Pagamento - Digitalmente HUB`;

  const message = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
  ].join('\r\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}

export async function sendLeadNotification(lead: LeadData) {
  const gmail = await getUncachableGmailClient();

  const tipoContato = contactTypeLabels[lead.contactType || "servico"] || lead.contactType || "Não informado";

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #c80180; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Novo Lead - Digitalmente HUB</h1>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333; width: 140px;">Nome:</td>
            <td style="padding: 8px 0; color: #555;">${lead.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">E-mail:</td>
            <td style="padding: 8px 0; color: #555;">${lead.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Telefone:</td>
            <td style="padding: 8px 0; color: #555;">${lead.phone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Empresa:</td>
            <td style="padding: 8px 0; color: #555;">${lead.company || "Não informado"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">Tipo de Contato:</td>
            <td style="padding: 8px 0; color: #555;">${tipoContato}</td>
          </tr>
          ${lead.message ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #333; vertical-align: top;">Mensagem:</td>
            <td style="padding: 8px 0; color: #555;">${lead.message}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 16px; text-align: center;">
        Enviado automaticamente pelo site digitalmentehub.com.br
      </p>
    </div>
  `;

  const to = "digitalmente.oficial.mkt@gmail.com";
  const subject = `Novo Lead: ${lead.name} - Digitalmente HUB`;

  const message = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
  ].join('\r\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}
