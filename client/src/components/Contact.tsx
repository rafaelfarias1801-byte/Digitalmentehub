import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLeadSchema } from "@shared/schema";
import type { InsertLead } from "@shared/schema";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { Mail, MapPin, Check, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formSchema = insertLeadSchema.extend({
  name: insertLeadSchema.shape.name.min(2, "Nome é obrigatório"),
  phone: insertLeadSchema.shape.phone.min(8, "Telefone inválido"),
  company: insertLeadSchema.shape.company.min(1, "Empresa é obrigatória"),
  email: insertLeadSchema.shape.email.email("E-mail inválido"),
  contactType: insertLeadSchema.shape.contactType.min(1, "Selecione o tipo"),
});

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<InsertLead>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      company: "",
      email: "",
      contactType: "servico",
      message: "",
    },
  });

  const contactType = form.watch("contactType");
  const formValues = form.watch();

  const onSubmit = async (data: InsertLead) => {
    setSubmitting(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappFallback = () => {
    const text = `Olá! Meu nome é ${formValues.name || "..."}, da empresa ${formValues.company || "..."}. E-mail: ${formValues.email || "..."}. Telefone: ${formValues.phone || "..."}. Tipo: ${formValues.contactType === "parceiro" ? "Parceiro" : "Serviço"}. ${formValues.message ? `Mensagem: ${formValues.message}` : ""}`;
    return `https://wa.me/5541987907321?text=${encodeURIComponent(text)}`;
  };

  return (
    <section id="contato" className="py-24 md:py-32 bg-brand-navy relative" data-testid="section-contact">
      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 to-transparent pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-white font-navycula mb-4">
            Vamos conversar?
          </h2>
          <p className="text-white/50 font-navycula max-w-xl mx-auto">
            Conte o que você precisa. A gente responde rápido.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="space-y-4">
              <a
                href="https://wa.me/5541987907321"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white/70 hover:text-brand-orange transition-colors group"
                data-testid="link-whatsapp-1"
              >
                <div className="w-10 h-10 rounded-md bg-brand-orange/10 flex items-center justify-center group-hover:bg-brand-orange/20 transition-colors">
                  <FaWhatsapp className="text-brand-orange" />
                </div>
                <span className="font-navycula text-sm">(41) 98790-7321</span>
              </a>

              <a
                href="https://wa.me/5541920059509"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white/70 hover:text-brand-orange transition-colors group"
                data-testid="link-whatsapp-2"
              >
                <div className="w-10 h-10 rounded-md bg-brand-orange/10 flex items-center justify-center group-hover:bg-brand-orange/20 transition-colors">
                  <FaWhatsapp className="text-brand-orange" />
                </div>
                <span className="font-navycula text-sm">(41) 92005-9509</span>
              </a>

              <a
                href="https://instagram.com/digital.mentte"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white/70 hover:text-brand-orange transition-colors group"
                data-testid="link-instagram"
              >
                <div className="w-10 h-10 rounded-md bg-brand-purple/15 flex items-center justify-center group-hover:bg-brand-purple/25 transition-colors">
                  <FaInstagram className="text-brand-purple" />
                </div>
                <span className="font-navycula text-sm">@digital.mentte</span>
              </a>

              <a
                href="mailto:digitalmente.oficial.mkt@gmail.com"
                className="flex items-center gap-3 text-white/70 hover:text-brand-orange transition-colors group"
                data-testid="link-email"
              >
                <div className="w-10 h-10 rounded-md bg-brand-blue/10 flex items-center justify-center group-hover:bg-brand-blue/20 transition-colors">
                  <Mail className="w-4 h-4 text-brand-blue" />
                </div>
                <span className="font-navycula text-sm break-all">digitalmente.oficial.mkt@gmail.com</span>
              </a>

              <div className="flex items-center gap-3 text-white/50" data-testid="text-address">
                <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white/40" />
                </div>
                <span className="font-navycula text-sm">Sítio Cercado, Curitiba-PR</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            {submitted ? (
              <div className="bg-white/[0.03] border border-brand-orange/20 rounded-lg p-8 text-center" data-testid="text-success">
                <div className="w-14 h-14 rounded-full bg-brand-orange/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-brand-orange" />
                </div>
                <h3 className="text-xl text-white font-navycula mb-2">Mensagem enviada!</h3>
                <p className="text-white/50 font-navycula text-sm mb-6">
                  Respondemos em até 24h. Ou se preferir, fale agora pelo WhatsApp.
                </p>
                <a
                  href={whatsappFallback()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-brand-orange text-white px-6 py-3 rounded-md text-sm font-navycula hover:brightness-110 transition-all"
                  data-testid="button-whatsapp-fallback"
                >
                  <FaWhatsapp />
                  Falar pelo WhatsApp
                </a>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 md:p-8 space-y-5"
                  data-testid="form-contact"
                >
                  <div className="flex gap-1 p-1 bg-white/[0.03] rounded-md">
                    <button
                      type="button"
                      onClick={() => form.setValue("contactType", "servico")}
                      className={`flex-1 py-2.5 rounded-md text-sm font-navycula transition-all duration-200 ${
                        contactType === "servico"
                          ? "bg-brand-orange text-white"
                          : "text-white/50 hover:text-white"
                      }`}
                      data-testid="button-type-servico"
                    >
                      Serviço
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setValue("contactType", "parceiro")}
                      className={`flex-1 py-2.5 rounded-md text-sm font-navycula transition-all duration-200 ${
                        contactType === "parceiro"
                          ? "bg-brand-orange text-white"
                          : "text-white/50 hover:text-white"
                      }`}
                      data-testid="button-type-parceiro"
                    >
                      Parceiro
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Nome"
                              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-brand-blue/50"
                              data-testid="input-name"
                            />
                          </FormControl>
                          <FormMessage className="text-brand-orange text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Telefone"
                              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-brand-blue/50"
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage className="text-brand-orange text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Empresa"
                              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-brand-blue/50"
                              data-testid="input-company"
                            />
                          </FormControl>
                          <FormMessage className="text-brand-orange text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="E-mail"
                              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-brand-blue/50"
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage className="text-brand-orange text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Mensagem (opcional)"
                            rows={3}
                            className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-brand-blue/50 resize-none"
                            data-testid="input-message"
                          />
                        </FormControl>
                        <FormMessage className="text-brand-orange text-xs" />
                      </FormItem>
                    )}
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-brand-orange text-white py-3.5 rounded-md text-sm font-navycula transition-all duration-200 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
                    data-testid="button-submit"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar mensagem"
                    )}
                  </button>
                </form>
              </Form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
