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
      <div className="pt-28 md:pt-36 pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-16">
              <span className="font-display text-brand-pink text-lg">PRODUTOS</span>
              <h2 className="font-display text-[32px] md:text-[46px] text-white mt-3 mb-6 leading-tight">
                Análise de Perfil Estratégica
              </h2>
              <p className="text-white/50 text-lg md:text-xl italic">
                Antes de postar mais, é preciso entender melhor.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 md:p-12">

              <div className="mb-12">
                <p className="text-white/70 leading-relaxed mb-4 text-[15px]">
                  Se o seu perfil não cresce, não gera resposta ou não transmite autoridade, o problema nem sempre é falta de conteúdo. Na maioria das vezes é falta de clareza.
                </p>
                <p className="text-white/70 leading-relaxed mb-4 text-[15px]">
                  A Análise de Perfil é uma leitura estratégica do seu Instagram para identificar o que está travando seu crescimento, o que está desalinhado no seu posicionamento e quais ajustes precisam ser feitos para gerar mais percepção, coerência e resultado.
                </p>
                <p className="text-brand-pink font-semibold text-[15px] leading-relaxed">
                  Nada de achismo. Nada de promessa vazia. Aqui você entende, de forma objetiva, onde está errando e como corrigir.
                </p>
              </div>

              <div className="w-full h-px bg-white/[0.06] mb-12" />

              <h4 className="text-brand-orange text-xl font-semibold mb-6">Para quem é</h4>
              <div className="mb-12">
                <p className="text-white/70 leading-relaxed mb-6 text-[15px]">
                  Este serviço é ideal para empreendedores, criadores e marcas que já produzem conteúdo, mas sentem estagnação. Também para quem não sabe se o problema é estética, posicionamento ou narrativa. E para quem pensa em investir em tráfego ou social media, mas quer clareza antes.
                </p>
                <div className="space-y-4 mb-6">
                  <p className="text-white/60 text-[15px]">Se você posta, mas não cresce.</p>
                  <p className="text-white/60 text-[15px]">Se o perfil parece bonito, mas não comunica.</p>
                  <p className="text-white/60 text-[15px]">Se o engajamento não vira oportunidade.</p>
                </div>
                <p className="text-brand-pink font-semibold text-lg">Essa análise é para você.</p>
              </div>

              <div className="w-full h-px bg-white/[0.06] mb-12" />

              <h4 className="text-brand-orange text-xl font-semibold mb-6">O que analisamos</h4>
              <div className="space-y-4 mb-12">
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
                  <div key={block.num} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-5">
                    <p className="text-white font-medium mb-2">
                      <span className="text-brand-pink mr-2 font-semibold">{block.num}.</span>
                      {block.title}
                    </p>
                    <div className="pl-6 space-y-1">
                      {block.items.map((item, j) => (
                        <p key={j} className="text-white/45 text-sm flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-brand-blue flex-shrink-0" />
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="w-full h-px bg-white/[0.06] mb-12" />

              <h4 className="text-brand-orange text-xl font-semibold mb-6">O que você recebe</h4>
              <div className="space-y-3 mb-4">
                {[
                  "Análise estratégica completa do perfil",
                  "Relatório claro e direto, sem linguagem técnica desnecessária",
                  "Diagnóstico do que está travando o perfil",
                  "Lista de ajustes prioritários",
                  "Recomendações práticas de conteúdo e posicionamento",
                  "Direcionamento de próximos passos, sem promessa vazia",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                    <span className="text-white/60 text-[15px]">{item}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-3 inline-flex items-center gap-2 text-white/50 text-sm mb-12">
                <FileText className="w-4 h-4" />
                Entrega em PDF ou documento digital
              </div>

              <div className="w-full h-px bg-white/[0.06] mb-12" />

              <h4 className="text-brand-orange text-xl font-semibold mb-6">Prazo e investimento</h4>
              <div className="text-white/50 text-[15px] mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                Prazo médio de entrega: 3 a 5 dias úteis
              </div>
              <div className="bg-brand-orange/[0.06] border border-brand-orange/15 rounded-xl p-6 mb-12">
                <p className="text-brand-orange text-2xl font-semibold">Investimento: R$397,00</p>
              </div>

              <div className="w-full h-px bg-white/[0.06] mb-12" />

              <h4 className="text-brand-orange text-xl font-semibold mb-6">Por que começar pela análise</h4>
              <div className="mb-14">
                <p className="text-white/70 leading-relaxed mb-4 text-[15px]">
                  Muitas pessoas investem mais tempo, mais postagens ou mais dinheiro em tráfego sem antes entender o básico.
                </p>
                <p className="text-white font-medium text-[15px] mb-4">
                  O perfil está preparado para o próximo passo?
                </p>
                <p className="text-white/70 leading-relaxed text-[15px]">
                  A Análise de Perfil existe para evitar desperdício de energia e investimento. Ela traz clareza e direção antes da execução.
                </p>
              </div>

              <div className="text-center pt-2 pb-4">
                <a
                  href={`https://wa.me/5541987907321?text=${encodeURIComponent(
                    "Olá! Quero minha Análise de Perfil. Pode me contar mais?"
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 bg-brand-orange text-white px-10 py-4 rounded-full text-base font-semibold transition-all duration-200 hover:brightness-110 hover:scale-[1.02] shadow-lg shadow-brand-orange/20"
                  data-testid="button-analise-whatsapp"
                >
                  <FaWhatsapp className="text-xl" />
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
