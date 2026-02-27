import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion, AnimatePresence } from "framer-motion";
import { Search, PenTool, LayoutGrid, ShoppingBag, CalendarCheck, Video, Plus, Minus } from "lucide-react";

const PREFERENCE_ID = "3035532652-2c14a7e7-188a-45bf-983a-4d9b7e34b3bd";

const deliverables = [
  {
    icon: Search,
    title: "Diagnóstico completo do perfil",
    desc: "Análise de posicionamento, promessa e diferenciação.",
  },
  {
    icon: PenTool,
    title: "Ajuste estratégico de bio e jornada",
    desc: "Reestruturação para conversão.",
  },
  {
    icon: LayoutGrid,
    title: "Estrutura de conteúdo",
    desc: "Definição de pilares e linha editorial.",
  },
  {
    icon: ShoppingBag,
    title: "Estratégia de vendas simplificada",
    desc: "Modelo prático para começar a vender.",
  },
  {
    icon: CalendarCheck,
    title: "Plano de ação 30 dias",
    desc: "Passo a passo organizado.",
  },
  {
    icon: Video,
    title: "Reunião individual de 20 minutos",
    desc: "Explicação detalhada + direcionamento.",
  },
];

const steps = [
  { num: "1", title: "Você garante seu diagnóstico", desc: "Pagamento seguro via Mercado Pago." },
  { num: "2", title: "Preenche um formulário estratégico", desc: "Informações sobre seu perfil e objetivos." },
  { num: "3", title: "Recebe seu PDF em até 5 dias úteis", desc: "Análise completa e personalizada." },
  { num: "4", title: "Participa da reunião individual", desc: "20 minutos de direcionamento estratégico." },
];

const faqs = [
  { q: "O que exatamente é o Diagnóstico Estratégico?", a: "É uma análise completa do seu perfil no Instagram que identifica gargalos, oportunidades e estrutura um plano claro de crescimento e vendas. Inclui relatório em PDF e reunião individual de 20 minutos." },
  { q: "Serve para qualquer nicho?", a: "Sim. A análise é personalizada para o seu mercado, posicionamento e objetivos. Funciona para qualquer segmento." },
  { q: "Como funciona a reunião?", a: "Após a entrega do PDF, agendamos uma videochamada de 20 minutos para explicar os pontos da análise e direcionar os próximos passos." },
  { q: "Em quanto tempo recebo o diagnóstico?", a: "Em até 5 dias úteis após o preenchimento completo do formulário estratégico." },
  { q: "Posso parcelar?", a: "Sim. O Mercado Pago oferece parcelamento conforme as condições disponíveis no momento do pagamento." },
  { q: "O que acontece depois do pagamento?", a: "Você será direcionado para preencher um formulário estratégico com informações sobre seu perfil e objetivos. A partir dele, iniciamos a análise." },
  { q: "É diferente dos Packs de Conteúdo?", a: "Sim. Os Packs entregam conteúdo pronto para publicação. O Diagnóstico entrega estratégia, clareza e direção para o seu perfil crescer de forma estruturada." },
  { q: "Preciso ter muitos seguidores?", a: "Não. O diagnóstico funciona para perfis de qualquer tamanho. O foco é estratégia, não volume." },
];

function MercadoPagoButton() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://www.mercadopago.com.br/integrations/v1/web-payment-checkout.js";
    script.setAttribute("data-preference-id", PREFERENCE_ID);
    script.setAttribute("data-source", "button");
    ref.current.appendChild(script);
    return () => {
      if (ref.current) ref.current.innerHTML = "";
    };
  }, []);

  return <div ref={ref} className="inline-block" />;
}

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
              data-testid={`button-diag-faq-${i}`}
            >
              <span className="text-white/80 text-sm font-medium leading-snug">{faq.q}</span>
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-brand-orange">
                {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4">
                    <p className="text-white/45 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6 },
};

export default function DiagnosticoEstrategico() {
  const checkoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Diagnóstico Estratégico | Digitalmente Hub";
  }, []);

  const scrollToCheckout = () => {
    checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />

      {/* HERO */}
      <section className="pt-32 md:pt-44 pb-20 md:pb-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy via-brand-purple/[0.06] to-brand-navy pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <h1
              className="font-display text-[32px] md:text-[52px] text-white leading-[1.1] tracking-tight mb-6"
              data-testid="text-diag-headline"
            >
              Seu Instagram não cresce porque falta direção estratégica.
            </h1>
            <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Receba um diagnóstico completo do seu perfil + reunião individual de 20 minutos para traçar um plano real de crescimento e vendas.
            </p>
            <button
              onClick={scrollToCheckout}
              className="inline-flex items-center justify-center bg-brand-orange text-white px-10 md:px-14 py-4 md:py-5 rounded-full text-base md:text-lg font-bold transition-all duration-200 hover:brightness-110 hover:scale-[1.03] shadow-xl shadow-brand-orange/25 mb-8"
              data-testid="button-diag-hero-cta"
            >
              Quero meu Diagnóstico Estratégico
            </button>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-white/40 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue/60" />
                Análise personalizada
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue/60" />
                Plano de ação 30 dias
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue/60" />
                Reunião estratégica inclusa
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* DOR */}
      <section className="py-20 md:py-28 bg-white/[0.02]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-[24px] md:text-[36px] text-white text-center mb-10 leading-tight tracking-tight">
              Você sente que está fazendo tudo e mesmo assim não avança?
            </h2>
            <div className="space-y-4 mb-10">
              {[
                "Posta com frequência mas não vende",
                "Não sabe qual conteúdo realmente gera resultado",
                "Sua bio não converte visitantes em clientes",
                "Você sente que está improvisando",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-pink/60 mt-2 flex-shrink-0" />
                  <p className="text-white/55 text-[15px] md:text-base leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
            <div className="bg-brand-pink/[0.06] border border-brand-pink/10 rounded-xl px-6 py-5 text-center">
              <p className="text-brand-pink font-semibold text-[15px] md:text-base leading-relaxed">
                O problema não é esforço. É falta de estratégia.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* O QUE É */}
      <section className="py-20 md:py-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-[24px] md:text-[36px] text-white mb-6 leading-tight tracking-tight">
              O que é o Diagnóstico Estratégico
            </h2>
            <p className="text-white/55 text-[15px] md:text-base leading-relaxed mb-4">
              Um Raio X completo do seu perfil para identificar gargalos, oportunidades e estruturar um plano claro de crescimento e vendas.
            </p>
            <p className="text-white/40 text-sm leading-relaxed">
              Nada genérico. Nada superficial. Análise real baseada no seu posicionamento e objetivo.
            </p>
          </motion.div>
        </div>
      </section>

      {/* O QUE VOCÊ RECEBE */}
      <section className="py-20 md:py-28 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-[24px] md:text-[36px] text-white mb-4 leading-tight tracking-tight">
              O que você recebe
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliverables.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="bg-white/[0.025] border border-white/[0.05] rounded-xl p-6"
                data-testid={`card-deliverable-${i}`}
              >
                <item.icon className="w-6 h-6 text-brand-orange mb-4" />
                <h3 className="text-white font-medium text-[15px] mb-1.5">{item.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-[24px] md:text-[36px] text-white mb-4 leading-tight tracking-tight">
              Como funciona
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
                data-testid={`step-${i}`}
              >
                <div className="w-10 h-10 rounded-full bg-brand-orange/10 text-brand-orange font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="text-white font-medium text-[15px] mb-1.5">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-white/30 text-sm mt-10">Simples. Direto. Aplicável.</p>
        </div>
      </section>

      {/* INVESTIMENTO */}
      <section className="py-20 md:py-28 bg-white/[0.02]" ref={checkoutRef}>
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp}>
            <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-8 md:p-10 text-center">
              <p className="text-white/40 text-xs tracking-[0.15em] uppercase mb-2">Investimento</p>
              <h3 className="text-white font-medium text-lg mb-1">Diagnóstico Estratégico + Reunião</h3>
              <p className="text-brand-orange text-4xl md:text-5xl font-bold tracking-tight my-5" data-testid="text-diag-price">
                R$ 397
              </p>
              <p className="text-white/40 text-sm mb-8">Entrega em até 5 dias úteis</p>
              <div className="mb-4" data-testid="container-mp-diag">
                <MercadoPagoButton />
              </div>
              <p className="text-white/25 text-xs">Pagamento seguro via Mercado Pago</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AUTORIDADE */}
      <section className="py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <p className="text-white/55 text-[15px] md:text-base leading-relaxed mb-2">
              Não é para quem quer fórmula mágica.
            </p>
            <p className="text-white font-semibold text-base md:text-lg">
              É para quem quer clareza estratégica e crescimento estruturado.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 bg-white/[0.02]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="font-display text-[24px] md:text-[36px] text-white mb-3 leading-tight tracking-tight">
              Perguntas Frequentes
            </h2>
            <p className="text-white/40 text-sm">Tudo o que você precisa saber para decidir com segurança.</p>
          </motion.div>
          <FaqAccordion />
        </div>
      </section>

      {/* BOTÃO FINAL */}
      <section className="py-16 md:py-20">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <button
              onClick={scrollToCheckout}
              className="inline-flex items-center justify-center bg-brand-orange text-white px-10 md:px-14 py-4 md:py-5 rounded-full text-base md:text-lg font-bold transition-all duration-200 hover:brightness-110 hover:scale-[1.03] shadow-xl shadow-brand-orange/25"
              data-testid="button-diag-final-cta"
            >
              Garantir meu Diagnóstico agora
            </button>
          </motion.div>
        </div>
      </section>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
