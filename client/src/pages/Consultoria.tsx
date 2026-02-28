import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion, AnimatePresence } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { Check, Video, Search, Compass, CalendarCheck, FileText, Plus, Minus, Target } from "lucide-react";

const WA_LINK = `https://wa.me/5541987907321?text=${encodeURIComponent(
  "Olá! Tenho interesse na Consultoria Estratégica Intensiva. Pode me contar mais?"
)}`;

const deliverables = [
  { icon: Video, title: "Reunião estratégica online (60 minutos)", desc: "Análise ao vivo do seu negócio e presença digital.", highlight: false },
  { icon: Search, title: "Diagnóstico do momento atual do negócio", desc: "Visão clara de onde você está hoje.", highlight: false },
  { icon: Compass, title: "Direcionamento claro e aplicável", desc: "O que fazer, onde focar e por quê.", highlight: false },
  { icon: CalendarCheck, title: "Plano de ação essencial com prioridades", desc: "Próximos passos organizados.", highlight: false },
  { icon: FileText, title: "Resumo estratégico em PDF após a consultoria", desc: "Documento para consultar sempre que precisar.", highlight: false },
  { icon: Target, title: "Análise de oportunidades e riscos", desc: "Mapeamento do que está travando seu crescimento e onde estão as oportunidades reais no seu momento atual.", highlight: false },
];

const faqs = [
  { q: "O que é a Consultoria Estratégica Intensiva?", a: "É uma consultoria pontual, estruturada, para definir direção no digital com base no seu momento atual." },
  { q: "Isso é mentoria ou acompanhamento?", a: "Não. É uma reunião única, com análise e direcionamento." },
  { q: "Qual a duração?", a: "60 minutos." },
  { q: "Vou sair com plano prático?", a: "Sim. Você sai com prioridades claras e próximos passos organizados." },
  { q: "Para qual tipo de negócio serve?", a: "Para prestadores de serviço, negócios locais e marcas que precisam estruturar presença digital." },
  { q: "E se eu quiser implementação depois?", a: "Se fizer sentido, podemos apresentar um plano de execução com a Digitalmente." },
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
              data-testid={`button-consultoria-faq-${i}`}
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

export default function Consultoria() {
  useEffect(() => {
    document.title = "Consultoria Estratégica Intensiva | Digitalmente";
  }, []);

  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />

      <section className="pt-28 md:pt-36 pb-14 md:pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy via-brand-purple/[0.04] to-brand-navy pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <span className="text-brand-pink text-xs tracking-[0.2em] uppercase font-medium">PRODUTOS</span>
            <h1
              className="font-display text-[26px] md:text-[40px] text-white leading-[1.15] tracking-tight mt-3 mb-4"
              data-testid="text-consultoria-headline"
            >
              Consultoria Estratégica Intensiva
            </h1>
            <p className="text-white/50 text-base md:text-lg max-w-xl mx-auto mb-7 leading-relaxed">
              Uma consultoria estratégica única para organizar seu marketing e sair com direção clara do que fazer primeiro.
            </p>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 bg-brand-pink text-white px-10 md:px-12 py-3.5 md:py-4 rounded-full text-[15px] md:text-base font-bold transition-all duration-200 hover:bg-brand-pink/85 shadow-lg shadow-brand-pink/20"
              data-testid="button-consultoria-hero-cta"
            >
              <FaWhatsapp className="text-lg" />
              Quero minha consultoria estratégica
            </a>
          </motion.div>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-white/[0.02]">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-[20px] md:text-[28px] text-white text-center mb-6 leading-tight tracking-tight">
              Você sente que está fazendo tudo, mas sem saber se está fazendo certo?
            </h2>
            <div className="space-y-2.5 mb-7">
              {[
                "Posta, mas não tem estrutura",
                "Investe, mas não tem clareza do que funciona",
                "Sente que está improvisando no digital",
                "Quer crescer, mas não sabe o próximo passo",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-pink/60 mt-[7px] flex-shrink-0" />
                  <p className="text-white/65 text-[14px] md:text-[15px] leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
            <div className="bg-brand-pink/[0.06] border border-brand-pink/10 rounded-xl px-5 py-4 text-center">
              <p className="text-brand-pink font-semibold text-[14px] md:text-[15px] leading-relaxed">
                O problema não é esforço. É falta de direção.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-[20px] md:text-[28px] text-white mb-4 leading-tight tracking-tight">
              O que é a Consultoria Estratégica Intensiva
            </h2>
            <p className="text-white/55 text-[14px] md:text-[15px] leading-relaxed mb-3">
              Em 60 minutos estruturados, analisamos seu negócio, seu momento e sua presença digital para definir foco, prioridades e um caminho estratégico.
            </p>
            <p className="text-white/30 text-xs italic">
              Direto ao ponto. Sem achismo. Sem enrolação.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-white/[0.02]">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-[20px] md:text-[28px] text-white text-center mb-6 leading-tight tracking-tight">
              O que a gente destrava na consultoria
            </h2>
            <div className="space-y-2.5">
              {[
                "Clareza de posicionamento e proposta de valor",
                "Definição do foco digital (onde estar e por quê)",
                "Direcionamento de marketing conforme seu momento",
                "Organização de prioridades e próximos passos",
                "Ajustes de comunicação para converter melhor",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-brand-blue/70 mt-0.5 flex-shrink-0" />
                  <p className="text-white/60 text-[14px] md:text-[15px] leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-8">
            <h2 className="font-display text-[20px] md:text-[28px] text-white mb-3 leading-tight tracking-tight">
              O que você recebe
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {deliverables.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="bg-white/[0.025] border border-white/[0.05] rounded-xl p-5"
                data-testid={`card-consultoria-deliverable-${i}`}
              >
                <item.icon className="w-5 h-5 text-brand-orange mb-3" />
                <h3 className="text-white font-medium text-[14px] mb-1">{item.title}</h3>
                <p className="text-white/40 text-[13px] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-white/25 text-xs mt-5">
            Não é acompanhamento. É uma consultoria pontual para definir direção e decisões.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-white/[0.02]">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-[20px] md:text-[28px] text-white text-center mb-6 leading-tight tracking-tight">
              Para quem é
            </h2>
            <div className="space-y-2.5">
              {[
                "Empreendedores no início ou em fase de estruturação",
                "Negócios que ainda não têm posicionamento digital definido",
                "Quem está no digital, mas sem estratégia",
                "Quem quer evitar erros, gastos desnecessários e decisões no escuro",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-brand-blue/70 mt-0.5 flex-shrink-0" />
                  <p className="text-white/60 text-[14px] md:text-[15px] leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="max-w-sm mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp}>
            <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-7 md:p-9 text-center">
              <p className="text-white/40 text-[10px] tracking-[0.15em] uppercase mb-2">Investimento</p>
              <h3 className="text-white font-medium text-base mb-1">Consultoria Estratégica Intensiva</h3>
              <p className="text-brand-orange text-3xl md:text-4xl font-bold tracking-tight my-4" data-testid="text-consultoria-price">
                R$ 699,00
              </p>
              <p className="text-white/40 text-[13px] mb-6">Reunião online de 60 minutos + resumo em PDF</p>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-brand-pink text-white py-3.5 px-6 rounded-full text-[14px] font-bold transition-all duration-200 hover:bg-brand-pink/80 shadow-lg shadow-brand-pink/20"
                data-testid="button-consultoria-checkout"
              >
                <FaWhatsapp className="text-base flex-shrink-0" />
                Quero minha consultoria estratégica
              </a>
              <p className="text-white/20 text-[11px] mt-3">Agendamento via WhatsApp</p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <p className="text-white/50 text-[14px] leading-relaxed mb-1.5">
              Não é sobre postar mais.
            </p>
            <p className="text-white font-semibold text-[15px] md:text-base">
              É sobre saber exatamente o que fazer primeiro.
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
            <p className="text-white/35 text-[13px]">Tudo o que você precisa saber antes de agendar.</p>
          </motion.div>
          <FaqAccordion />
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-sm mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 bg-brand-pink text-white px-10 md:px-12 py-3.5 md:py-4 rounded-full text-[15px] md:text-base font-bold transition-all duration-200 hover:bg-brand-pink/85 shadow-lg shadow-brand-pink/20"
              data-testid="button-consultoria-final-cta"
            >
              <FaWhatsapp className="text-lg" />
              Quero minha consultoria estratégica
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
