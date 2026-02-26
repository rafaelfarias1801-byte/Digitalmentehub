import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema } from "@shared/schema";
import { ZodError, z } from "zod";
import { sendLeadNotification, sendPaymentNotification, sendCustomerBriefingEmail, sendCustomerDataToAgency } from "./gmail";

const serverLeadSchema = insertLeadSchema.extend({
  name: z.string().min(2, "Nome é obrigatório"),
  phone: z.string().min(8, "Telefone inválido"),
  company: z.string().optional().default(""),
  email: z.string().email("E-mail inválido"),
  contactType: z.string().optional().default("servico"),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/payment-notification", async (req, res) => {
    try {
      const { paymentId, status, merchantOrderId } = req.body || {};
      await sendPaymentNotification({ paymentId, status, merchantOrderId });
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao enviar notificação de pagamento:", error);
      res.json({ success: false });
    }
  });

  app.post("/api/payment-customer", async (req, res) => {
    try {
      const { email, whatsapp } = req.body || {};

      const results = await Promise.allSettled([
        email ? sendCustomerBriefingEmail({ email, whatsapp }) : Promise.resolve(),
        (email || whatsapp) ? sendCustomerDataToAgency({ email, whatsapp }) : Promise.resolve(),
      ]);

      const errors = results.filter((r) => r.status === "rejected");
      if (errors.length > 0) {
        console.error("Erro parcial ao enviar emails do cliente:", errors);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao processar dados do cliente:", error);
      res.json({ success: false });
    }
  });

  app.post("/api/lead", async (req, res) => {
    try {
      const data = serverLeadSchema.parse(req.body);
      const lead = await storage.createLead(data);

      try {
        await sendLeadNotification(data);
      } catch (emailError) {
        console.error("Erro ao enviar email de notificação:", emailError);
      }

      res.json({ success: true, id: lead.id });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
      } else {
        res.status(500).json({ success: false, message: "Erro interno" });
      }
    }
  });

  return httpServer;
}
