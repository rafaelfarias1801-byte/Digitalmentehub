import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { Check, FileText, Clock } from "lucide-react";

export default function Consultoria() {
  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />
      <div className="pt-24 pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <span className="font-display text-brand-pink text-lg">PRODUTOS</span>
              <h2 className="font-display text-[28px] md:text-[38px] text-white mt-2 mb-4">
                Consultoria Estratégica para Empreendedores
              </h2>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 md:p-10">
              <p className="text-white/70 leading-relaxed mb-6">
                Uma consultoria para empreendedores que sabem que precisam estar no digital, mas não sabem por onde começar, como se posicionar ou no que realmente investir em marketing.
              </p>
              <p className="text-white/70 leading-relaxed mb-8">
                Aqui, o objetivo é trazer clareza, direção e segurança para que o marketing deixe de ser confuso e passe a ser estratégico.
              </p>

              <h4 className="text-brand-orange text-lg font-medium mb-4">Para quem é</h4>
              <ul className="space-y-2 mb-8">
                {[
                  "Empreendedores no início ou em fase de estruturação",
                  "Negócios que ainda não têm posicionamento digital definido",
                  "Quem sente que \"está no digital\", mas sem estratégia",
                  "Quem quer evitar erros, gastos desnecessários e decisões no escuro",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                    <span className="text-white/60 text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <h4 className="text-brand-orange text-lg font-medium mb-4">O que trabalhamos na consultoria</h4>
              <ul className="space-y-2 mb-8">
                {[
                  "Clareza de posicionamento e proposta de valor",
                  "Definição de presença digital (onde estar e por quê)",
                  "Direcionamento de marketing adequado ao momento do negócio",
                  "Organização de ideias, prioridades e próximos passos",
                  "Alinhamento entre marca, comunicação e objetivos",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                    <span className="text-white/60 text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <h4 className="text-brand-orange text-lg font-medium mb-4">Entregáveis</h4>
              <ul className="space-y-2 mb-4">
                {[
                  "Reunião estratégica online",
                  "Diagnóstico do momento atual do negócio",
                  "Definição de posicionamento inicial no digital",
                  "Direcionamento prático de marketing (o que fazer primeiro)",
                  "Plano de ações essenciais para começar com estratégia",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                    <span className="text-white/60 text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="text-white/50 text-sm space-y-1 mb-8">
                <p className="flex items-center gap-2"><FileText className="w-4 h-4" /> Resumo estratégico entregue após a consultoria</p>
                <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> Duração: 60 a 90 minutos</p>
              </div>

              <div className="bg-brand-orange/[0.08] border border-brand-orange/20 rounded-lg p-5 mb-8">
                <p className="text-brand-orange text-xl font-medium">Investimento: R$699,00</p>
              </div>

              <p className="text-white/50 text-sm italic mb-2">
                Marketing não começa com post. Começa com direção.
              </p>
              <p className="text-white/50 text-sm mb-8">
                Essa consultoria pode ser o primeiro passo para estruturar sua presença digital ou para avançar para um plano estratégico completo com a Digitalmente.
              </p>

              <a
                href={`https://wa.me/5541987907321?text=${encodeURIComponent(
                  "Olá! Tenho interesse na Consultoria Estratégica para Empreendedores. Pode me contar mais?"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-8 py-3 rounded-full text-sm font-medium transition-all"
                data-testid="button-consultoria-whatsapp"
              >
                <FaWhatsapp className="text-lg" />
                Quero a consultoria estratégica
              </a>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
