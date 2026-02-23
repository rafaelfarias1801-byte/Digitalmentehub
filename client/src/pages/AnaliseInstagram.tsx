import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { FileText, Clock, CheckCircle2 } from "lucide-react";

export default function AnaliseInstagram() {
  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />
      <div className="pt-32 md:pt-40 pb-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-20">
              <span className="font-display text-brand-pink text-lg tracking-wider">PRODUTOS</span>
              <h2 className="font-display text-[34px] md:text-[50px] text-white mt-4 mb-2 leading-[1] tracking-tight">
                Análise de Perfil<br />Estratégica
              </h2>
              <p className="text-white/40 text-lg md:text-xl mt-3">
                Antes de postar mais, é preciso entender melhor.
              </p>
            </div>

            <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-8 md:p-12">

              <div className="mb-10">
                <p className="text-white/65 leading-[1.8] mb-5 text-[15px]">
                  Se o seu perfil não cresce, não gera resposta ou não transmite autoridade, o problema nem sempre é falta de conteúdo. Na maioria das vezes é falta de clareza.
                </p>
                <p className="text-white/65 leading-[1.8] mb-8 text-[15px]">
                  A Análise de Perfil é uma leitura estratégica do seu Instagram para identificar o que está travando seu crescimento, o que está desalinhado no seu posicionamento e quais ajustes precisam ser feitos para gerar mais percepção, coerência e resultado.
                </p>
              </div>

              <div className="relative mb-16 mt-2">
                <div className="absolute -left-8 md:-left-12 top-0 bottom-0 w-[3px] bg-brand-pink/60 rounded-full" />
                <div className="bg-brand-pink/[0.06] border border-brand-pink/10 rounded-xl px-7 py-6">
                  <p className="text-brand-pink font-semibold text-[15px] leading-relaxed">
                    Nada de achismo. Nada de promessa vazia. Aqui você entende, de forma objetiva, onde está errando e como corrigir.
                  </p>
                </div>
              </div>

              <div className="w-full h-px bg-white/[0.04] mb-16" />

              <h4 className="text-brand-orange text-xl font-semibold mb-8 tracking-tight">Para quem é</h4>
              <div className="mb-16">
                <p className="text-white/65 leading-[1.8] mb-8 text-[15px]">
                  Este serviço é ideal para empreendedores, criadores e marcas que já produzem conteúdo, mas sentem estagnação. Também para quem não sabe se o problema é estética, posicionamento ou narrativa. E para quem pensa em investir em tráfego ou social media, mas quer clareza antes.
                </p>
                <div className="space-y-6 mb-8 pl-1">
                  <p className="text-white/75 text-[15px] font-medium leading-snug">Se você posta, mas não cresce.</p>
                  <p className="text-white/75 text-[15px] font-medium leading-snug">Se o perfil parece bonito, mas não comunica.</p>
                  <p className="text-white/75 text-[15px] font-medium leading-snug">Se o engajamento não vira oportunidade.</p>
                </div>
                <p className="text-brand-pink font-bold text-lg tracking-tight">Essa análise é para você.</p>
              </div>

              <div className="w-full h-px bg-white/[0.04] mb-16" />

              <h4 className="text-brand-orange text-xl font-semibold mb-8 tracking-tight">O que analisamos</h4>
              <div className="space-y-3 mb-14">
                {[
                  {
                    num: "1",
                    title: "Estrutura do perfil",
                    items: ["Nome e bio", "Clareza de proposta", "Leitura rápida para novos visitantes"],
                  },
                  {
                    num: "2",
                    title: "Foto de perfil e identidade visual",
                    items: ["Coerência com a marca", "Percepção profissional", "Alinhamento visual com o posicionamento"],
                  },
                  {
                    num: "3",
                    title: "Conteúdo publicado",
                    items: ["Tipos de post", "Consistência", "Narrativa", "Alinhamento com o objetivo do perfil"],
                  },
                  {
                    num: "4",
                    title: "Engajamento e comportamento do público",
                    items: ["O que gera resposta real", "O que passa despercebido", "Padrões de interação"],
                  },
                  {
                    num: "5",
                    title: "Pontos de melhoria imediatos",
                    items: ["Ajustes simples que destravam percepção", "O que mudar agora", "O que parar de fazer"],
                  },
                ].map((block) => (
                  <div key={block.num} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5 md:p-6">
                    <p className="text-white font-medium mb-3 text-[15px]">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-pink/15 text-brand-pink text-xs font-bold mr-3">{block.num}</span>
                      {block.title}
                    </p>
                    <div className="pl-9 space-y-1.5">
                      {block.items.map((item, j) => (
                        <p key={j} className="text-white/40 text-sm flex items-center gap-2.5">
                          <span className="w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="w-full h-px bg-white/[0.04] mb-14" />

              <h4 className="text-brand-orange text-xl font-semibold mb-8 tracking-tight">O que você recebe</h4>
              <div className="space-y-3.5 mb-6">
                {[
                  "Análise estratégica completa do perfil",
                  "Relatório claro e direto, sem linguagem técnica desnecessária",
                  "Diagnóstico do que está travando o perfil",
                  "Lista de ajustes prioritários",
                  "Recomendações práticas de conteúdo e posicionamento",
                  "Direcionamento de próximos passos, sem promessa vazia",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-[18px] h-[18px] text-brand-blue/70 mt-0.5 flex-shrink-0" />
                    <span className="text-white/55 text-[15px] leading-snug">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 bg-white/[0.03] border border-white/[0.05] rounded-lg px-5 py-3.5 inline-flex items-center gap-2.5 text-white/40 text-sm mb-16">
                <FileText className="w-4 h-4" />
                Entrega em PDF ou documento digital
              </div>

              <div className="w-full h-px bg-white/[0.04] mb-16" />

              <h4 className="text-brand-orange text-xl font-semibold mb-8 tracking-tight">Prazo e investimento</h4>
              <div className="text-white/45 text-[15px] mb-6 flex items-center gap-2.5">
                <Clock className="w-4 h-4 flex-shrink-0" />
                Prazo médio de entrega: 3 a 5 dias úteis
              </div>
              <div className="bg-white/[0.02] border border-brand-orange/10 rounded-xl px-8 py-10 mb-16 text-center">
                <p className="text-white/35 text-xs mb-3 tracking-[0.15em] uppercase">Investimento</p>
                <p className="text-brand-orange text-3xl md:text-4xl font-bold tracking-tight">R$397,00</p>
              </div>

              <div className="w-full h-px bg-white/[0.04] mb-16" />

              <h4 className="text-brand-orange text-xl font-semibold mb-8 tracking-tight">Por que começar pela análise</h4>
              <div className="mb-16">
                <p className="text-white/65 leading-[1.8] mb-5 text-[15px]">
                  Muitas pessoas investem mais tempo, mais postagens ou mais dinheiro em tráfego sem antes entender o básico.
                </p>
                <p className="text-white font-semibold text-base mb-5 italic">
                  O perfil está preparado para o próximo passo?
                </p>
                <p className="text-white/65 leading-[1.8] text-[15px]">
                  A Análise de Perfil existe para evitar desperdício de energia e investimento. Ela traz clareza e direção antes da execução.
                </p>
              </div>

              <div className="text-center pt-8 pb-8">
                <a
                  href={`https://wa.me/5541987907321?text=${encodeURIComponent(
                    "Olá! Quero minha Análise de Perfil. Pode me contar mais?"
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 bg-brand-orange text-white px-12 py-5 rounded-full text-[17px] font-bold transition-all duration-200 hover:brightness-110 hover:scale-[1.03] shadow-xl shadow-brand-orange/25"
                  data-testid="button-analise-whatsapp"
                >
                  <FaWhatsapp className="text-2xl" />
                  Quero minha Análise de Perfil
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
