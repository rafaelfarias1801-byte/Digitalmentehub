import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { FileText, Clock } from "lucide-react";

export default function AnaliseInstagram() {
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
                Análise de Perfil Estratégica
              </h2>
              <p className="text-white/60 text-lg">
                Antes de postar mais, é preciso entender melhor.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 md:p-10">

              <div className="mb-10">
                <p className="text-white/70 leading-relaxed mb-4">
                  Se o seu perfil não cresce, não gera resposta ou não transmite autoridade, o problema nem sempre é falta de conteúdo. Na maioria das vezes é falta de clareza.
                </p>
                <p className="text-white/70 leading-relaxed mb-4">
                  A Análise de Perfil é uma leitura estratégica do seu Instagram para identificar o que está travando seu crescimento, o que está desalinhado no seu posicionamento e quais ajustes precisam ser feitos para gerar mais percepção, coerência e resultado.
                </p>
                <p className="text-white/70 leading-relaxed">
                  Nada de achismo. Nada de promessa vazia. Aqui você entende, de forma objetiva, onde está errando e como corrigir.
                </p>
              </div>

              <h4 className="text-brand-orange text-lg font-medium mb-4">Para quem é</h4>
              <div className="mb-10">
                <p className="text-white/70 leading-relaxed mb-4">
                  Este serviço é ideal para empreendedores, criadores e marcas que já produzem conteúdo, mas sentem estagnação. Também para quem não sabe se o problema é estética, posicionamento ou narrativa. E para quem pensa em investir em tráfego ou social media, mas quer clareza antes.
                </p>
                <p className="text-white/70 leading-relaxed mb-2">Se você posta, mas não cresce.</p>
                <p className="text-white/70 leading-relaxed mb-2">Se o perfil parece bonito, mas não comunica.</p>
                <p className="text-white/70 leading-relaxed mb-2">Se o engajamento não vira oportunidade.</p>
                <p className="text-white font-medium mt-3">Essa análise é para você.</p>
              </div>

              <h4 className="text-brand-orange text-lg font-medium mb-4">O que analisamos</h4>
              <div className="space-y-5 mb-10">
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
                  <div key={block.num}>
                    <p className="text-white text-sm font-medium mb-1">
                      <span className="text-brand-blue mr-2">{block.num}.</span>
                      {block.title}
                    </p>
                    <div className="pl-5 space-y-0.5">
                      {block.items.map((item, j) => (
                        <p key={j} className="text-white/50 text-sm flex items-start gap-2">
                          <span className="text-brand-blue mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-blue flex-shrink-0" />
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <h4 className="text-brand-orange text-lg font-medium mb-4">O que você recebe</h4>
              <div className="space-y-2 mb-4">
                {[
                  "Análise estratégica completa do perfil",
                  "Relatório claro e direto, sem linguagem técnica desnecessária",
                  "Diagnóstico do que está travando o perfil",
                  "Lista de ajustes prioritários",
                  "Recomendações práticas de conteúdo e posicionamento",
                  "Direcionamento de próximos passos, sem promessa vazia",
                ].map((item, i) => (
                  <p key={i} className="text-white/60 text-sm flex items-start gap-2">
                    <span className="text-brand-blue font-medium mr-1">{i + 1}.</span>
                    {item}
                  </p>
                ))}
              </div>
              <div className="text-white/50 text-sm mb-10">
                <p className="flex items-center gap-2"><FileText className="w-4 h-4" /> Entrega em PDF ou documento digital</p>
              </div>

              <h4 className="text-brand-orange text-lg font-medium mb-4">Prazo e investimento</h4>
              <div className="text-white/50 text-sm mb-3">
                <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> Prazo médio de entrega: 3 a 5 dias úteis</p>
              </div>
              <div className="bg-brand-orange/[0.08] border border-brand-orange/20 rounded-lg p-5 mb-10">
                <p className="text-brand-orange text-xl font-medium">Investimento: R$397,00</p>
              </div>

              <h4 className="text-brand-orange text-lg font-medium mb-4">Por que começar pela análise</h4>
              <div className="mb-10">
                <p className="text-white/70 leading-relaxed mb-4">
                  Muitas pessoas investem mais tempo, mais postagens ou mais dinheiro em tráfego sem antes entender o básico. O perfil está preparado para o próximo passo?
                </p>
                <p className="text-white/70 leading-relaxed">
                  A Análise de Perfil existe para evitar desperdício de energia e investimento. Ela traz clareza e direção antes da execução.
                </p>
              </div>

              <a
                href={`https://wa.me/5541987907321?text=${encodeURIComponent(
                  "Olá! Quero minha Análise de Perfil. Pode me contar mais?"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-8 py-3 rounded-full text-sm font-medium transition-all"
                data-testid="button-analise-whatsapp"
              >
                <FaWhatsapp className="text-lg" />
                Quero minha Análise de Perfil
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
