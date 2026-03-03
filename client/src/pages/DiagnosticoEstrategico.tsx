import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion, AnimatePresence } from "framer-motion";
import { Search, PenTool, LayoutGrid, ShoppingBag, CalendarCheck, Video, Plus, Minus } from "lucide-react";

const CHECKOUT_URL = "https://payfast.greenn.com.br/94458yv";

const deliverables = [
  { icon: Search, title: "Diagnóstico completo do perfil", desc: "Posicionamento, promessa e diferenciação.", highlight: false },
  { icon: PenTool, title: "Ajuste estratégico de bio e jornada", desc: "Reestruturação para conversão.", highlight: false },
  { icon: LayoutGrid, title: "Estrutura de conteúdo", desc: "Pilares e linha editorial.", highlight: false },
  { icon: ShoppingBag, title: "Estratégia de vendas simplificada", desc: "Modelo prático para vender.", highlight: false },
  { icon: CalendarCheck, title: "Plano de ação 30 dias", desc: "Passo a passo organizado.", highlight: false },
  { icon: Video, title: "Vídeo Mestre de Implementação", desc: "Explicação detalhada da metodologia aplicada no seu perfil e direcionamento estratégico para execução.", highlight: true },
];

const steps = [
  { num: "1", title: "Garanta seu diagnóstico", desc: "Pagamento seguro." },
  { num: "2", title: "Preencha o formulário", desc: "Perfil e objetivos." },
  { num: "3", title: "Receba o PDF", desc: "Em até 5 dias úteis." },
  { num: "4", title: "Acesso ao Vídeo", desc: "Assista ao guia estratégico para aplicar seu novo posicionamento e escalar seus resultados." },
];

const faqs = [
  { q: "O que exatamente é o Diagnóstico Estratégico?", a: "É uma análise completa do seu perfil no Instagram que identifica gargalos, oportunidades e estrutura um plano claro de crescimento e vendas. Inclui relatório em PDF e vídeo estratégico exclusivo." },
  { q: "Serve para qualquer nicho?", a: "Sim. A análise é personalizada para o seu mercado, posicionamento e objetivos. Funciona para qualquer segmento." },
  { q: "Como recebo meu direcionamento?", a: "Para garantir agilidade, você receberá um vídeo estratégico exclusivo detalhando como aplicar cada ponto do seu plano de ação, permitindo que você consulte as estratégias sempre que precisar." },
  { q: "Em quanto tempo recebo o diagnóstico?", a: "Em até 5 dias úteis após o preenchimento completo do formulário estratégico." },
  { q: "Posso parcelar?", a: "Sim. A plataforma de pagamento oferece parcelamento conforme as condições disponíveis no momento da compra." },
  { q: "O que acontece depois do pagamento?", a: "Você será direcionado para preencher um formulário estratégico com informações sobre seu perfil e objetivos. A partir dele, iniciamos a análise." },
  { q: "É diferente dos Packs de Conteúdo?", a: "Sim. Os Packs entregam conteúdo pronto para publicação. O Diagnóstico entrega estratégia, clareza e direção para o seu perfil crescer de forma estruturada." },
  { q: "Preciso ter muitos seguidores?", a: "Não. O diagnóstico funciona para perfis de qualquer tamanho. O foco é estratégia, não volume." },
  { q: "Isso substitui uma gestão de Instagram?", a: "Não. O Diagnóstico entrega clareza e direção estratégica. A gestão envolve execução contínua. São complementares: o diagnóstico mostra o caminho, a gestão executa." },
  { q: "Esse diagnóstico pode evoluir para um trabalho maior?", a: "Sim. Se você busca uma execução profissional feita por nós, o valor pago neste diagnóstico é totalmente abatido na sua primeira mensalidade de Gestão Mensal." },
];

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
              className="w-full flex items-center justify-between px-5 py-3.5 text-left gap-3"
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
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
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

      <section className="pt-28 md:pt-36 pb-14 md:pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy via-brand-purple/[0.04] to-brand-navy pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <h1
              className="font-display text-[26px] md:text-[40px] text-white leading-[1.15] tracking-tight mb-4"
              data-testid="text-diag-headline"
            >
              Diagnóstico Estratégico de Instagram + Plano de Ação
            </h1>
            <p className="text-white/50 text-base md:text-lg max-w-xl mx-auto mb-3 leading-relaxed">
              Descubra o que está travando seu crescimento e receba um plano claro para vender com estratégia. Vídeo de direcionamento exclusivo incluso.
            </p>
            <div className="mb-6">
              <a
                href={CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-brand-pink text-white px-10 md:px-12 py-3.5 md:py-4 rounded-full text-[15px] md:text-base font-bold transition-all duration-200 hover:bg-brand-pink/85 shadow-lg shadow-brand-pink/20"
                data-testid="button-diag-hero-cta"
              >
                Quero meu Diagnóstico
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-white/40 text-xs md:text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-blue/60" />
                Análise personalizada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-blue/60" />
                Plano de ação 30 dias
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-blue/60" />
                Vídeo estratégico incluso
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-white/[0.02]">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-[20px] md:text-[28px] text-white text-center mb-6 leading-tight tracking-tight">
              Você sente que está fazendo tudo e mesmo assim não avança?
            </h2>
            <div className="space-y-2.5 mb-7">
              {[
                "Posta com frequência mas não vende",
                "Não sabe qual conteúdo realmente gera resultado",
                "Sua bio não converte visitantes em clientes",
                "Você sente que está improvisando",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-pink/60 mt-[7px] flex-shrink-0" />
                  <p className="text-white/65 text-[14px] md:text-[15px] leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
            <div className="bg-brand-pink/[0.06] border border-brand-pink/10 rounded-xl px-5 py-4 text-center">
              <p className="text-brand-pink font-semibold text-[14px] md:text-[15px] leading-relaxed">
                O problema não é esforço. É falta de estratégia.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-[20px] md:text-[28px] text-white mb-4 leading-tight tracking-tight">
              O que é o Diagnóstico Estratégico
            </h2>
            <p className="text-white/55 text-[14px] md:text-[15px] leading-relaxed mb-3">
              Um Raio X completo do seu perfil para identificar gargalos, oportunidades e estruturar um plano claro de crescimento e vendas.
            </p>
            <p className="text-white/40 text-[13px] leading-relaxed mb-4">
              Nada genérico. Nada superficial. Análise real baseada no seu posicionamento e objetivo.
            </p>
            <p className="text-white/30 text-xs italic">
              Baseado em metodologia aplicada em marcas reais.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-8">
            <h2 className="font-display text-[20px] md:text-[28px] text-white mb-3 leading-tight tracking-tight">
              O que você recebe
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {deliverables.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className={`rounded-xl p-5 relative ${
                  item.highlight
                    ? "bg-brand-pink/[0.06] border border-brand-pink/20 shadow-lg shadow-brand-pink/[0.04]"
                    : "bg-white/[0.025] border border-white/[0.05]"
                }`}
                data-testid={`card-deliverable-${i}`}
              >
                {item.highlight && (
                  <span className="absolute top-3 right-3 bg-brand-pink/20 text-brand-pink text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full">
                    Incluso
                  </span>
                )}
                <item.icon className={`w-5 h-5 mb-3 ${item.highlight ? "text-brand-pink" : "text-brand-orange"}`} />
                <h3 className="text-white font-medium text-[14px] mb-1">{item.title}</h3>
                <p className="text-white/40 text-[13px] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-8">
            <h2 className="font-display text-[20px] md:text-[28px] text-white mb-3 leading-tight tracking-tight">
              Como funciona
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="text-center"
                data-testid={`step-${i}`}
              >
                <div className="w-9 h-9 rounded-full bg-brand-orange/10 text-brand-orange font-bold text-sm flex items-center justify-center mx-auto mb-3">
                  {step.num}
                </div>
                <h3 className="text-white font-medium text-[13px] md:text-[14px] mb-1">{step.title}</h3>
                <p className="text-white/40 text-[12px] md:text-[13px] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-white/25 text-xs mt-7">Simples. Direto. Aplicável.</p>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-white/[0.02]" ref={checkoutRef}>
        <div className="max-w-sm mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp}>
            <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-7 md:p-9 text-center">
              <p className="text-white/40 text-[10px] tracking-[0.15em] uppercase mb-2">Investimento</p>
              <h3 className="text-white font-medium text-base mb-1">Diagnóstico Estratégico + Plano de Ação</h3>
              <p className="text-brand-orange text-3xl md:text-4xl font-bold tracking-tight my-4" data-testid="text-diag-price">
                R$ 97
              </p>
              <p className="text-white/40 text-[13px] mb-2">Entrega em até 5 dias úteis</p>
              <p className="text-brand-pink/70 text-[12px] mb-6 leading-relaxed">
                Abatemos 100% deste valor caso você migre para nossa Gestão Mensal em até 7 dias.
              </p>
              <a
                href={CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full bg-brand-pink text-white py-3.5 rounded-full text-[15px] font-bold transition-all duration-200 hover:bg-brand-pink/80 shadow-lg shadow-brand-pink/20"
                data-testid="button-diag-checkout"
              >
                Garantir meu Diagnóstico
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <p className="text-white/50 text-[14px] leading-relaxed mb-1.5">
              Não é para quem quer fórmula mágica.
            </p>
            <p className="text-white font-semibold text-[15px] md:text-base">
              É para quem quer clareza estratégica e crescimento estruturado.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-white/[0.02]">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-7">
            <h2 className="font-display text-[20px] md:text-[28px] text-white mb-2 leading-tight tracking-tight">
              Perguntas Frequentes
            </h2>
            <p className="text-white/35 text-[13px]">Tudo o que você precisa saber para decidir com segurança.</p>
          </motion.div>
          <FaqAccordion />
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-sm mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <a
              href={CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-brand-pink text-white px-10 md:px-12 py-3.5 md:py-4 rounded-full text-[15px] md:text-base font-bold transition-all duration-200 hover:bg-brand-pink/85 shadow-lg shadow-brand-pink/20"
              data-testid="button-diag-final-cta"
            >
              Garantir meu Diagnóstico agora
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
