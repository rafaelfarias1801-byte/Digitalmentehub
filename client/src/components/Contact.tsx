import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { SiThreads } from "react-icons/si";
import { Check, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ⚠️ SUBSTITUA pelo seu endpoint do Formspree
// Crie uma conta em formspree.io, crie um novo form e cole o endpoint aqui
// Exemplo: "https://formspree.io/f/xabcdefg"
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mnjgnegg";
const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(8, "Telefone inválido"),
  company: z.string().optional().default(""),
  contactType: z.string().optional().default("servico"),
  message: z.string().optional().default(""),
});

type FormData = z.infer<typeof formSchema>;

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
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

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao enviar");
      setSubmitted(true);
    } catch {
      setSubmitted(false);
      alert("Erro ao enviar mensagem. Tente novamente ou entre em contato pelo WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contato" className="py-24 md:py-32 bg-brand-navy relative" data-testid="section-contact">
      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 to-transparent pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-[28px] md:text-[38px] mb-6 font-display" data-testid="text-contact-title">
              <span className="text-white">Fale </span>
              <span className="text-brand-orange">Conosco</span>
            </h2>

            <p className="text-white/60 text-sm leading-relaxed mb-4">
              Entre em contato com a Dig, nosso HUB digital que pode transformar a presença online do seu negócio. Nossa equipe de especialistas está pronta para entender suas necessidades, esclarecer suas dúvidas e desenvolver uma estratégia personalizada para impulsionar seus resultados no digital.
            </p>

            <p className="text-white/60 text-sm leading-relaxed mb-8">
              Seja para atrair mais clientes, fortalecer sua marca ou aumentar suas vendas, temos as soluções ideais para você. Vamos criar juntos campanhas eficazes e inovadoras que realmente fazem a diferença. Fale conosco e descubra como podemos levar sua empresa ao próximo nível!
            </p>

            <div className="flex items-center gap-4 mb-8">
              <a
                href="https://instagram.com/digital.mentte"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/50 hover:text-brand-orange transition-colors text-sm"
                data-testid="link-instagram"
              >
                <FaInstagram className="text-base" />
                Instagram
              </a>
              <a
                href="https://www.threads.net/@digital.mentte"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/50 hover:text-brand-orange transition-colors text-sm"
                data-testid="link-threads"
              >
                <SiThreads className="text-base" />
                Threads
              </a>
            </div>

            <a
              href="https://wa.me/5541987907321?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20quero%20entrar%20em%20contato."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand-orange text-white px-6 py-3 rounded-full text-sm font-medium hover:brightness-110 transition-all"
              data-testid="button-whatsapp-contact"
            >
              <FaWhatsapp className="text-lg" />
              Entrar em contato
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {submitted ? (
              <div className="bg-white/[0.03] border border-brand-orange/20 rounded-lg p-8 text-center" data-testid="text-success">
                <div className="w-14 h-14 rounded-full bg-brand-orange/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-brand-orange" />
                </div>
                <h3 className="text-xl text-white mb-2">Mensagem enviada!</h3>
                <p className="text-white/50 text-sm mb-6">
                  Respondemos em até 24h. Ou se preferir, fale agora pelo WhatsApp.
                </p>
                <a
                  href="https://wa.me/5541987907321"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-brand-orange text-white px-6 py-3 rounded-full text-sm hover:brightness-110 transition-all"
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
                  className="space-y-4"
                  data-testid="form-contact"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-white/60 text-xs mb-1 block">Nome</label>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Digite seu nome"
                            className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-brand-blue/50"
                            data-testid="input-name"
                          />
                        </FormControl>
                        <FormMessage className="text-brand-orange text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-white/60 text-xs mb-1 block">E-mail</label>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="Digite seu e-mail"
                              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-brand-blue/50"
                              data-testid="input-email"
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
                          <label className="text-white/60 text-xs mb-1 block">Telefone WhatsApp</label>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Digite seu telefone"
                              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-brand-blue/50"
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage className="text-brand-orange text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-white/60 text-xs mb-1 block">Empresa</label>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Nome da sua empresa"
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
                    name="contactType"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-white/60 text-xs mb-1 block">O contato é para:</label>
                        <FormControl>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => field.onChange("servico")}
                              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                                field.value === "servico"
                                  ? "bg-brand-pink text-white"
                                  : "bg-white/[0.04] border border-white/10 text-white/50 hover:border-white/20"
                              }`}
                              data-testid="button-tipo-servico"
                            >
                              Serviço
                            </button>
                            <button
                              type="button"
                              onClick={() => field.onChange("parceria")}
                              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                                field.value === "parceria"
                                  ? "bg-brand-pink text-white"
                                  : "bg-white/[0.04] border border-white/10 text-white/50 hover:border-white/20"
                              }`}
                              data-testid="button-tipo-parceria"
                            >
                              Parceria
                            </button>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-white/60 text-xs mb-1 block">Mensagem</label>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Digite sua mensagem"
                            rows={4}
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
                    className="w-full bg-brand-orange text-white py-3.5 rounded-full text-sm font-medium transition-all duration-200 hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
                    data-testid="button-submit"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Mensagem"
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
