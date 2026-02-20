import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { Check, Star, Package, Compass, Search, FileText, Clock } from "lucide-react";
import { packs } from "../data/packs";

type ProductView = "main" | "packs" | "consultoria" | "analise";

export default function Packs() {
  const [view, setView] = useState<ProductView>("main");

  const products = [
    {
      id: "packs" as const,
      title: "Pack's de Conteúdos",
      description: "Packs prontos para manter sua presença digital com qualidade e consistência.",
      icon: Package,
      image: "/products/packs-content.png",
    },
    {
      id: "consultoria" as const,
      title: "Consultoria Estratégica para Empreendedores",
      description: "Clareza, direção e segurança para seu marketing digital.",
      icon: Compass,
      image: "/products/consultoria.png",
    },
    {
      id: "analise" as const,
      title: "Análise Estratégica de Instagram",
      description: "Leitura estratégica do seu perfil para destravar crescimento.",
      icon: Search,
      image: "/products/analise-instagram.png",
    },
  ];

  return (
    <section id="packs" className="py-24 md:py-32 relative" data-testid="section-packs">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-navy via-brand-purple/10 to-brand-navy pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <span className="font-display text-brand-pink text-lg">PRODUTOS</span>
          <h2 className="font-display text-[38px] text-white mt-2 mb-4">
            Nossos Produtos
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Soluções pensadas para cada momento do seu negócio no digital.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {view === "main" && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid sm:grid-cols-3 gap-6 mt-12"
            >
              {products.map((product, i) => (
                <motion.button
                  key={product.id}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  onClick={() => setView(product.id)}
                  className="group relative rounded-xl overflow-hidden border border-white/[0.06] hover:border-brand-orange/30 transition-all duration-300 text-left cursor-pointer bg-white/[0.03]"
                  data-testid={`button-product-${product.id}`}
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg text-white font-medium mb-2">{product.title}</h3>
                    <p className="text-white/50 text-sm">{product.description}</p>
                    <span className="inline-block mt-3 text-brand-orange text-sm font-medium group-hover:translate-x-1 transition-transform">
                      Saiba mais →
                    </span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {view === "packs" && (
            <motion.div
              key="packs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={() => setView("main")}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8 text-sm"
                data-testid="button-back-products"
              >
                ← Voltar aos produtos
              </button>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {packs.map((pack, i) => (
                  <motion.div
                    key={pack.id}
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className={`relative rounded-lg p-6 border transition-all duration-300 flex flex-col ${
                      pack.highlight
                        ? "bg-brand-orange/[0.08] border-brand-orange/30"
                        : "bg-white/[0.03] border-white/[0.06] hover:border-brand-orange/20"
                    }`}
                    data-testid={`card-pack-${pack.id}`}
                  >
                    {pack.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 bg-brand-pink text-white text-xs px-3 py-1 rounded-md">
                          <Star className="w-3 h-3" />
                          Popular
                        </span>
                      </div>
                    )}

                    <h3 className="text-base text-white mb-1">{pack.name}</h3>
                    <p className="text-2xl md:text-3xl text-brand-orange mb-5">{pack.price}</p>

                    <ul className="space-y-3 mb-6 flex-1">
                      {pack.features.map((feat, fi) => (
                        <li key={fi} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                          <span className="text-white/60 text-sm">{feat}</span>
                        </li>
                      ))}
                      {pack.extras && (
                        <li className="flex items-start gap-2.5">
                          <span className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-white/35 text-xs italic">{pack.extras}</span>
                        </li>
                      )}
                    </ul>

                    <a
                      href={`https://wa.me/5541987907321?text=${encodeURIComponent(
                        `Olá! Tenho interesse no ${pack.name}. Pode me contar mais?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center gap-2 w-full py-3 rounded-md text-sm transition-all duration-200 ${
                        pack.highlight
                          ? "bg-brand-orange text-white hover:brightness-110"
                          : "border border-brand-orange/30 text-brand-orange hover:bg-brand-orange/10"
                      }`}
                      data-testid={`button-pack-${pack.id}`}
                    >
                      <FaWhatsapp />
                      Quero esse pack
                    </a>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {view === "consultoria" && (
            <motion.div
              key="consultoria"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              <button
                onClick={() => setView("main")}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8 text-sm"
                data-testid="button-back-consultoria"
              >
                ← Voltar aos produtos
              </button>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 md:p-10">
                <h3 className="text-2xl text-white font-medium mb-6">Consultoria Estratégica para Empreendedores</h3>

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
                  <p className="text-brand-orange text-xl font-medium mb-2">Investimento: R$699,00</p>
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
                  className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-8 py-3 rounded-full text-sm font-medium hover:brightness-110 transition-all"
                  data-testid="button-consultoria-whatsapp"
                >
                  <FaWhatsapp className="text-lg" />
                  Quero a consultoria estratégica
                </a>
              </div>
            </motion.div>
          )}

          {view === "analise" && (
            <motion.div
              key="analise"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              <button
                onClick={() => setView("main")}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8 text-sm"
                data-testid="button-back-analise"
              >
                ← Voltar aos produtos
              </button>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 md:p-10">
                <h3 className="text-2xl text-white font-medium mb-6">Análise Estratégica de Instagram</h3>

                <p className="text-white/70 leading-relaxed mb-8">
                  Uma leitura estratégica do seu perfil para identificar o que está travando seu crescimento e o que precisa ser ajustado para gerar mais clareza, posicionamento e resultado.
                </p>

                <h4 className="text-brand-orange text-lg font-medium mb-4">O que analisamos</h4>
                <div className="space-y-4 mb-8">
                  {[
                    { title: "Bio e nome do perfil", desc: "Clareza de proposta, posicionamento e leitura rápida para novos visitantes." },
                    { title: "Foto de perfil e identidade visual", desc: "Coerência com a marca e percepção profissional." },
                    { title: "Conteúdo publicado", desc: "Tipos de post, consistência, narrativa e alinhamento com o objetivo do perfil." },
                    { title: "Engajamento e comportamento do público", desc: "O que gera resposta real e o que passa despercebido." },
                    { title: "Pontos de melhoria imediatos", desc: "Ajustes simples que destravam percepção e crescimento." },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-white text-sm font-medium">{item.title}</p>
                      <p className="text-white/50 text-sm">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <h4 className="text-brand-orange text-lg font-medium mb-4">Entregáveis</h4>
                <ul className="space-y-2 mb-4">
                  {[
                    "Análise estratégica do perfil",
                    "Relatório com diagnóstico claro e direto",
                    "Lista de ajustes prioritários (o que mudar agora)",
                    "Recomendações práticas de conteúdo e posicionamento",
                    "Direcionamento de próximos passos (sem promessa vazia)",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                      <span className="text-white/60 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-white/50 text-sm space-y-1 mb-8">
                  <p className="flex items-center gap-2"><FileText className="w-4 h-4" /> Entrega em PDF ou documento digital</p>
                  <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> Prazo médio: 3 a 5 dias úteis</p>
                </div>

                <div className="bg-brand-orange/[0.08] border border-brand-orange/20 rounded-lg p-5 mb-8">
                  <p className="text-brand-orange text-xl font-medium mb-2">Investimento: R$397,00</p>
                </div>

                <p className="text-white/50 text-sm mb-2">
                  Ideal para quem quer entender onde está errando antes de investir mais em conteúdo ou tráfego.
                </p>
                <p className="text-white/50 text-sm italic mb-8">
                  Antes de postar mais, é preciso entender melhor.
                </p>

                <a
                  href={`https://wa.me/5541987907321?text=${encodeURIComponent(
                    "Olá! Tenho interesse na Análise Estratégica de Instagram. Pode me contar mais?"
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-8 py-3 rounded-full text-sm font-medium hover:brightness-110 transition-all"
                  data-testid="button-analise-whatsapp"
                >
                  <FaWhatsapp className="text-lg" />
                  Quero a análise estratégica
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
