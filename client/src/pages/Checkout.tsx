import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Minus } from "lucide-react";
import { Link } from "wouter";
import { packs } from "../data/packs";
import CheckoutSocialProof from "@/components/CheckoutSocialProof";

const pageTitles: Record<string, string> = {
  start: "Pack Start | Digitalmente Hub",
  pro: "Pack Pro | Digitalmente Hub",
  elite: "Pack Elite | Digitalmente Hub",
};

const displayNames: Record<string, string> = {
  start: "Start",
  pro: "Pro",
  elite: "Elite",
};

const packFaqs: Record<string, { q: string; a: string }[]> = {
  start: [
    { q: "O que eu recebo?", a: "Você recebe um pacote de artes estratégicas com legendas prontas e calendário no Trello focado em Atrair, Aquecer e Vender. O conteúdo é organizado por semana e o prazo de entrega é de até 7 dias." },
    { q: "O que acontece depois do pagamento?", a: "Assim que o pagamento for confirmado, você será direcionado para um briefing rápido. A partir dele, iniciamos a criação e alinhamos o que for necessário." },
    { q: "Em quanto tempo recebo o material?", a: "Entrega em até 7 dias úteis após o envio completo do briefing." },
    { q: "Posso pedir ajustes?", a: "Sim. Você tem 1 rodada de ajustes por peça para refinar detalhes e garantir que fique alinhado com o que você precisa." },
    { q: "As artes são editáveis?", a: "As artes são entregues prontas para postar. O acesso aos templates editáveis no Canva é um benefício exclusivo do Pack Elite." },
    { q: "Vocês criam minha identidade visual?", a: "Não. Os packs utilizam sua identidade já existente. A criação de Identidade Visual é um serviço à parte que exige orçamento específico." },
    { q: "Vocês fazem a postagem no meu perfil?", a: "Não neste pack. Aqui você recebe criação + textos prontos. Para gestão e postagem, oferecemos planos mensais." },
    { q: "Serve para qualquer nicho?", a: "Sim. O conteúdo é adaptado ao seu mercado e posicionamento. O briefing direciona a linguagem, visual e proposta de cada post." },
    { q: "Posso parcelar?", a: "Sim. A Greenn oferece parcelamento conforme as condições disponíveis no momento do pagamento." },
    { q: "Esse pack vai fazer meu perfil crescer?", a: "Ele organiza sua comunicação e melhora sua presença com consistência visual e texto alinhado. Crescimento depende também de frequência, oferta e estratégia contínua." },
  ],
  pro: [
    { q: "O que eu recebo?", a: "Você recebe um pacote de artes estratégicas com legendas prontas e calendário no Trello focado em Atrair, Aquecer e Vender. O conteúdo é organizado por semana e o prazo de entrega é de até 7 dias." },
    { q: "O que acontece depois do pagamento?", a: "Assim que o pagamento for confirmado, você será direcionado para um briefing rápido. A partir dele, iniciamos a criação e alinhamos o que for necessário." },
    { q: "Em quanto tempo recebo o material?", a: "Entrega em até 7 dias úteis após o envio completo do briefing." },
    { q: "Posso pedir ajustes?", a: "Sim. Você tem 1 rodada de ajustes por peça para refinar detalhes e garantir que fique alinhado com o que você precisa." },
    { q: "As artes são editáveis?", a: "As artes são entregues prontas para postar. O acesso aos templates editáveis no Canva é um benefício exclusivo do Pack Elite." },
    { q: "Vocês criam minha identidade visual?", a: "Não. Os packs utilizam sua identidade já existente. A criação de Identidade Visual é um serviço à parte que exige orçamento específico." },
    { q: "Vocês fazem a postagem no meu perfil?", a: "Não neste pack. Aqui você recebe criação + textos prontos + calendário organizado. Para gestão e postagem, oferecemos planos mensais." },
    { q: "Serve para qualquer nicho?", a: "Sim. O conteúdo é adaptado ao seu mercado e posicionamento. O briefing direciona a linguagem, visual e proposta de cada post." },
    { q: "Posso parcelar?", a: "Sim. A Greenn oferece parcelamento conforme as condições disponíveis no momento do pagamento." },
    { q: "Esse pack vai fazer meu perfil crescer?", a: "Ele organiza sua comunicação e melhora sua presença com consistência visual e texto alinhado. Crescimento depende também de frequência, oferta e estratégia contínua." },
  ],
  elite: [
    { q: "O que eu recebo?", a: "Você recebe um pacote de artes estratégicas com legendas prontas e calendário no Trello focado em Atrair, Aquecer e Vender. O conteúdo é organizado por semana e o prazo de entrega é de até 7 dias." },
    { q: "O que acontece depois do pagamento?", a: "Assim que o pagamento for confirmado, você será direcionado para um briefing rápido. A partir dele, iniciamos a criação e alinhamos o que for necessário." },
    { q: "Em quanto tempo recebo o material?", a: "Entrega em até 7 dias úteis após o envio completo do briefing." },
    { q: "Posso pedir ajustes?", a: "Sim. Você tem 1 rodada de ajustes por peça para refinar detalhes e garantir que fique alinhado com o que você precisa." },
    { q: "As artes são editáveis?", a: "Sim. O Pack Elite inclui acesso aos templates editáveis no Canva." },
    { q: "Vocês criam minha identidade visual?", a: "Não. Os packs utilizam sua identidade já existente. A criação de Identidade Visual é um serviço à parte que exige orçamento específico." },
    { q: "Vocês fazem a postagem no meu perfil?", a: "Não neste pack. Aqui você recebe criação completa + organização + templates editáveis. Para gestão e postagem, oferecemos planos mensais." },
    { q: "Serve para qualquer nicho?", a: "Sim. O conteúdo é adaptado ao seu mercado e posicionamento. O briefing direciona a linguagem, visual e proposta de cada post." },
    { q: "Posso parcelar?", a: "Sim. A Greenn oferece parcelamento conforme as condições disponíveis no momento do pagamento." },
    { q: "Esse pack vai fazer meu perfil crescer?", a: "Ele estrutura toda sua presença digital: comunicação, organização semanal e templates editáveis. Crescimento depende também de frequência, oferta e estratégia contínua." },
  ],
};

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
  const pack = packs.find((p) => p.id === packId);
  const faqs = packFaqs[packId] || [];

  useEffect(() => {
    document.title = pageTitles[packId] || "Checkout | Digitalmente Hub";
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
                Pack {displayNames[packId]}
              </h1>
              <p className="text-white/45 text-[15px] max-w-md mx-auto">
                Após o pagamento, você será direcionado para preencher o briefing.
              </p>
            </div>

            <CheckoutSocialProof packId={packId} />

            <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-8 md:p-10 mb-6">
              <h3 className="text-lg text-white font-medium mb-1" data-testid={`text-checkout-pack-name-${packId}`}>{pack.name}</h3>
              <p className="text-white/40 text-sm mb-5">{pack.subtitle}</p>

              <ul className="space-y-3 mb-6">
                {pack.features.map((feat, fi) => (
                  <li key={fi} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                    <span className={`text-sm ${feat.bold ? "text-white font-semibold" : "text-white/60"}`}>{feat.text}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-white/[0.06] pt-5 text-center">
                <p className="text-2xl md:text-3xl text-brand-orange font-bold" data-testid={`text-checkout-price-${packId}`}>{pack.installment}</p>
                <p className="text-white/40 text-sm mt-1">à vista {pack.price}</p>
              </div>
            </div>

            <div className="text-center mb-3">
              <a
                href={pack.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-brand-pink text-white px-10 py-4 rounded-full text-[15px] font-bold transition-all duration-200 hover:bg-brand-pink/80 shadow-lg shadow-brand-pink/20"
                data-testid={`button-checkout-${packId}`}
              >
                {pack.buttonText}
              </a>
            </div>

            <div className="text-center mb-10">
              <p className="text-white/30 text-xs leading-relaxed">
                Após a confirmação, você será direcionado para o briefing.
              </p>
            </div>

            <div className="text-center mb-10">
              <p className="text-white/50 text-sm mb-1">Tem alguma dúvida antes de finalizar?</p>
              <p className="text-white/30 text-xs">Leia as perguntas frequentes abaixo e feche com segurança.</p>
            </div>

            <div className="mb-10">
              <h4 className="text-white text-lg font-semibold mb-1 text-center">Perguntas Frequentes</h4>
              <p className="text-white/35 text-sm text-center mb-6">Tudo o que você precisa saber para finalizar com confiança.</p>
              <FaqAccordion faqs={faqs} />
            </div>

            <div className="bg-white/[0.025] border border-white/[0.05] rounded-xl p-6 text-center mb-6">
              <p className="text-white/60 text-sm">Pronto para sair do improviso e estruturar sua presença digital?</p>
            </div>

            <div className="text-center mb-8">
              <a
                href={pack.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-brand-pink text-white px-10 py-4 rounded-full text-[15px] font-bold transition-all duration-200 hover:bg-brand-pink/80 shadow-lg shadow-brand-pink/20"
                data-testid={`button-checkout-bottom-${packId}`}
              >
                {pack.buttonText}
              </a>
            </div>

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
