import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShieldCheck, Clock, MessageCircle, Plus, Minus } from "lucide-react";
import { Link } from "wouter";
import { FaWhatsapp } from "react-icons/fa";
import { packs } from "../data/packs";

const preferenceIds: Record<string, string> = {
  basico: "3035532652-2c14a7e7-188a-45bf-983a-4d9b7e34b3bd",
  intermediario: "3035532652-7925d708-1102-4fe4-9e13-3220d9148e6b",
  premium: "3035532652-ee68e755-9433-4ae6-bd27-8c3b8158040c",
  diamante: "3035532652-fa82901e-8c1e-46dd-ab68-044cf8948c7a",
};

const pageTitles: Record<string, string> = {
  basico: "Checkout Pack Básico | Digitalmente Hub",
  intermediario: "Checkout Pack Intermediário | Digitalmente Hub",
  premium: "Checkout Pack Premium | Digitalmente Hub",
  diamante: "Checkout Pack Diamante | Digitalmente Hub",
};

const displayNames: Record<string, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  premium: "Premium",
  diamante: "Diamante",
};

function getFaqs(packName: string) {
  return [
    {
      q: `O que eu recebo exatamente no ${packName}?`,
      a: (() => {
        const pack = packs.find(p => p.name === packName);
        if (!pack) return "Consulte os detalhes do pack acima.";
        const items = pack.features.filter(f => !f.muted).map(f => f.text.toLowerCase()).join(", ");
        return `Você recebe ${items}. É o essencial para começar com presença e consistência.`;
      })(),
    },
    {
      q: "O que acontece depois do pagamento?",
      a: "Assim que o pagamento for confirmado, você será direcionado para um briefing rápido. A partir dele, iniciamos a criação e alinhamos o que for necessário.",
    },
    {
      q: "Em quanto tempo eu recebo o material?",
      a: "Entrega em até 7 dias úteis após o envio completo do briefing. Se você enviar tudo certinho, o processo flui mais rápido.",
    },
    {
      q: "Posso pedir ajustes?",
      a: "Sim. Você tem 1 rodada de ajustes por peça para refinar detalhes e garantir que fique alinhado com o que você precisa.",
    },
    {
      q: "As artes são editáveis?",
      a: "Não. As peças são entregues prontas para publicar. Se precisar de arquivos editáveis, temos a opção de upgrade.",
    },
    {
      q: "Vocês fazem a postagem no meu perfil?",
      a: "Não neste pack. Aqui você recebe criação + textos prontos. Para gestão e postagem, oferecemos planos mensais.",
    },
    {
      q: "Serve para qualquer nicho?",
      a: "Sim. O conteúdo é adaptado ao seu mercado e posicionamento. O briefing direciona a linguagem, visual e proposta de cada post.",
    },
    {
      q: "Preciso já ter identidade visual?",
      a: "Não obrigatoriamente. Mas se você já tiver paleta, fontes e referências, o resultado fica mais consistente. Se não tiver, o briefing ajuda a orientar um caminho.",
    },
    {
      q: "Posso parcelar?",
      a: "Sim. O Mercado Pago oferece parcelamento conforme as condições disponíveis no momento do pagamento.",
    },
    {
      q: "Esse pack vai fazer meu perfil crescer?",
      a: "Ele organiza sua comunicação e melhora sua presença com consistência visual e texto alinhado. Crescimento depende também de frequência, oferta e estratégia contínua.",
    },
  ];
}

function FaqAccordion({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden transition-colors"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${i}`}
              data-testid={`button-faq-${i}`}
            >
              <span className="text-white/80 text-sm font-medium leading-snug">{faq.q}</span>
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-brand-orange">
                {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-answer-${i}`}
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

export default function Checkout({ packId }: { packId: string }) {
  const mpRef = useRef<HTMLDivElement>(null);
  const pack = packs.find((p) => p.id === packId);
  const faqs = getFaqs(pack?.name || "");

  useEffect(() => {
    document.title = pageTitles[packId] || "Checkout | Digitalmente Hub";
  }, [packId]);

  useEffect(() => {
    if (!mpRef.current || !preferenceIds[packId]) return;

    mpRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://www.mercadopago.com.br/integrations/v1/web-payment-checkout.js";
    script.setAttribute("data-preference-id", preferenceIds[packId]);
    script.setAttribute("data-source", "button");
    mpRef.current.appendChild(script);

    return () => {
      if (mpRef.current) {
        mpRef.current.innerHTML = "";
      }
    };
  }, [packId]);

  if (!pack) return null;

  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />
      <div className="pt-32 md:pt-40 pb-28">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-10">
              <h1 className="font-display text-[28px] md:text-[42px] text-white mb-3 leading-tight tracking-tight" data-testid={`text-checkout-title-${packId}`}>
                Checkout do Pack {displayNames[packId]}
              </h1>
              <p className="text-white/45 text-[15px] max-w-md mx-auto">
                Pagamento seguro via Mercado Pago. Após o pagamento, você será direcionado para preencher o briefing.
              </p>
            </div>

            <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-8 md:p-10 mb-10">
              <h3 className="text-lg text-white font-medium mb-1" data-testid={`text-checkout-pack-name-${packId}`}>{pack.name}</h3>
              <p className="text-white/40 text-sm mb-5">{pack.subtitle}</p>

              <ul className="space-y-3 mb-6">
                {pack.features.map((feat, fi) => (
                  <li key={fi} className={`flex items-start gap-2.5 ${feat.muted ? "mt-1" : ""}`}>
                    {feat.muted ? (
                      <span className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Check className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${feat.muted ? "text-white/35 italic text-xs" : feat.bold ? "text-white font-semibold" : "text-white/60"}`}>{feat.text}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-white/[0.06] pt-5">
                <p className="text-2xl md:text-3xl text-brand-orange font-bold" data-testid={`text-checkout-price-${packId}`}>{pack.price}</p>
              </div>
            </div>

            <div className="mb-10">
              <div className="text-center mb-6">
                <p className="text-white/70 text-sm font-semibold mb-1">Feche com segurança</p>
                <p className="text-white/40 text-xs max-w-sm mx-auto">
                  Checkout simples, entrega clara e processo guiado. Você sabe exatamente o que recebe antes de pagar.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 mb-10">
                <span className="flex items-center gap-2 text-white/45 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
                  Pagamento seguro via Mercado Pago
                </span>
                <span className="flex items-center gap-2 text-white/45 text-xs">
                  <Clock className="w-3.5 h-3.5 text-brand-blue" />
                  Prazo e entregáveis transparentes
                </span>
                <span className="flex items-center gap-2 text-white/45 text-xs">
                  <MessageCircle className="w-3.5 h-3.5 text-brand-blue" />
                  Suporte no briefing
                </span>
              </div>

              <div className="mb-8">
                <h4 className="text-white text-lg font-semibold mb-1 text-center">Perguntas Frequentes</h4>
                <p className="text-white/35 text-sm text-center mb-6">Tudo o que você precisa saber para finalizar com confiança.</p>
                <FaqAccordion faqs={faqs} />
              </div>

              <div className="bg-white/[0.025] border border-white/[0.05] rounded-xl p-6 text-center mb-10">
                <p className="text-white/60 text-sm mb-4">Pronto para sair do improviso e começar com um pacote objetivo?</p>
                <a
                  href="https://wa.me/5541987907321?text=Olá! Tenho uma dúvida sobre o checkout."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-white/10 text-white/50 px-6 py-2.5 rounded-full text-xs font-medium transition-all duration-200 hover:bg-white/[0.04] hover:text-white/70"
                  data-testid={`button-checkout-whatsapp-${packId}`}
                >
                  <FaWhatsapp className="text-sm" />
                  Tirar uma dúvida no WhatsApp
                </a>
              </div>
            </div>

            <div className="text-center mb-4" data-testid={`container-mp-button-${packId}`}>
              <div ref={mpRef} className="inline-block" />
            </div>

            <p className="text-white/30 text-xs text-center leading-relaxed mb-8">
              Pagamento processado com segurança pelo Mercado Pago. Após pagar, você já segue para o briefing.
            </p>

            <p className="text-white/30 text-xs text-center leading-relaxed mb-8">
              Se você tiver qualquer problema no pagamento, fale com a gente pelo{" "}
              <a
                href="https://wa.me/5541987907321"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 underline"
              >
                WhatsApp
              </a>
              .
            </p>

            <div className="text-center">
              <Link
                href="/produtos/packs"
                className="inline-flex items-center justify-center gap-2 border border-brand-orange/30 text-brand-orange px-8 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:bg-brand-orange/10"
                data-testid={`button-voltar-packs-${packId}`}
              >
                Voltar para os packs
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
