import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const CHECKOUT_URL =
  "https://payfast.greenn.com.br/94458yv/offer/WZY1yF?b_id_1=2k6jf72&b_offer_1=9HYBPI";

const entregaveis = [
  {
    icon: "🔍",
    title: "Diagnóstico completo do perfil",
    desc: "Posicionamento, promessa e diferenciação analisados em profundidade.",
    destaque: false,
  },
  {
    icon: "✏️",
    title: "Ajuste estratégico de bio e jornada",
    desc: "Reestruturação completa da bio focada em conversão e clareza.",
    destaque: false,
  },
  {
    icon: "📋",
    title: "Estrutura de conteúdo",
    desc: "Pilares estratégicos e linha editorial definidos para o seu negócio.",
    destaque: false,
  },
  {
    icon: "💰",
    title: "Estratégia de vendas simplificada",
    desc: "Modelo prático e aplicável para transformar seguidores em clientes.",
    destaque: false,
  },
  {
    icon: "📅",
    title: "Plano de ação 30 dias",
    desc: "Passo a passo organizado para você saber exatamente o que fazer.",
    destaque: false,
  },
  {
    icon: "🎬",
    title: "Vídeo Mestre de Implementação",
    desc: "Explicação detalhada da metodologia aplicada no seu perfil e direcionamento estratégico para execução.",
    destaque: true,
  },
];

const problemas = [
  {
    title: "Posta com frequência mas não vende",
    desc: "Você é consistente, cria conteúdo, aparece — mas o faturamento não reflete esse esforço.",
  },
  {
    title: "Não sabe qual conteúdo gera resultado",
    desc: "Posta de tudo um pouco, sem saber o que realmente atrai cliente e o que só gera curtida.",
  },
  {
    title: "Sua bio não converte visitantes em clientes",
    desc: "Quem chega no seu perfil não entende o que você faz, para quem é, nem como contratar.",
  },
  {
    title: "Você sente que está improvisando",
    desc: "Sem estratégia clara, cada semana é uma decisão nova sobre o que postar, quando e por quê.",
  },
];

const passos = [
  { num: "1", title: "Garanta seu diagnóstico", desc: "Pagamento seguro via Pix ou cartão parcelado." },
  { num: "2", title: "Preencha o formulário", desc: "Compartilha seu perfil e objetivos para personalizarmos a análise." },
  { num: "3", title: "Receba o PDF", desc: "Diagnóstico completo entregue em até 5 dias úteis." },
  { num: "4", title: "Acesso ao Vídeo", desc: "Assista ao guia estratégico e aplique o novo posicionamento." },
];

const paraquem = [
  "Empreendedores que estão presentes nas redes mas não conseguem converter seguidores em clientes.",
  "Criadores de conteúdo que produzem com frequência mas sentem que o perfil não representa seu potencial.",
  "Profissionais liberais que precisam transmitir autoridade e credibilidade desde o primeiro acesso.",
  "Quem quer clareza estratégica antes de investir em gestão completa de redes sociais.",
];

const faqs = [
  {
    q: "O que exatamente é o Diagnóstico Estratégico?",
    a: "É uma análise 360° do seu perfil no Instagram: foto, bio, destaques, conteúdo, engajamento, links e posicionamento. Você recebe um PDF detalhado com diagnóstico + plano de ação de 30 dias + vídeo explicativo personalizado.",
  },
  {
    q: "Serve para qualquer nicho?",
    a: "Sim. A metodologia é adaptada ao seu posicionamento e objetivo. Atendemos empreendedores, criadores de conteúdo, profissionais liberais e pequenos negócios de qualquer segmento.",
  },
  {
    q: "Como recebo meu direcionamento?",
    a: "Após o pagamento, você preenche um formulário rápido com informações do seu perfil e objetivos. Em até 5 dias úteis você recebe o PDF completo no e-mail + acesso ao vídeo de implementação.",
  },
  {
    q: "Preciso ter muitos seguidores?",
    a: "Não. A análise é focada em estratégia e posicionamento, não em volume. Funciona exatamente para quem está começando a estruturar sua presença digital.",
  },
  {
    q: "Posso parcelar?",
    a: "Sim. Você pode pagar à vista no Pix ou parcelar no cartão de crédito (sujeito a taxas da operadora).",
  },
  {
    q: "Isso substitui uma gestão de Instagram?",
    a: "Não substitui — é complementar. O diagnóstico te dá a estratégia e o direcionamento. A gestão executa no dia a dia. Inclusive, se você quiser migrar para nossa Gestão Mensal em até 7 dias, abatemos 100% dos R$97 no investimento.",
  },
  {
    q: "É diferente dos Packs de Conteúdo?",
    a: "Sim. Os Packs entregam conteúdo pronto para publicar. O Diagnóstico entrega estratégia: o que ajustar no seu perfil, como se posicionar e um plano de ação completo para crescer com intenção.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border border-white/[0.06] rounded-lg overflow-hidden">
      <summary className="flex justify-between items-center gap-4 px-6 py-5 cursor-pointer text-white text-sm font-medium list-none select-none">
        {q}
        <span className="text-brand-pink text-xl flex-shrink-0 transition-transform duration-200 group-open:rotate-45">+</span>
      </summary>
      <p className="px-6 pb-5 text-white/50 text-sm leading-relaxed">{a}</p>
    </details>
  );
}

export default function AnalisePerfilLanding() {
  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />

      {/* HERO */}
      <section className="pt-32 pb-24 px-4 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-pink/[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto relative">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6"
          >
            Diagnóstico Estratégico
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl md:text-6xl text-white leading-tight mb-5"
          >
            Análise Estratégica de Instagram +{" "}
            <span className="text-brand-pink">Plano de Ação</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/50 text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-10"
          >
            Descubra o que está travando seu crescimento e receba um plano claro para vender com estratégia. Vídeo de direcionamento exclusivo incluso.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <a
              href={CHECKOUT_URL}
              className="inline-block bg-brand-pink text-white font-display font-bold text-base px-10 py-4 rounded-full transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 shadow-[0_0_32px_rgba(232,25,125,0.35)]"
            >
              Quero meu Diagnóstico →
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-wrap justify-center gap-6 mt-8 text-white/40 text-sm"
          >
            {["Análise personalizada", "Plano de ação 30 dias", "Vídeo estratégico incluso"].map((p) => (
              <span key={p} className="flex items-center gap-1.5">
                <span className="text-brand-pink">•</span> {p}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="py-20 px-4 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <span className="text-brand-pink text-xs font-semibold tracking-widest uppercase">O Problema</span>
            <h2 className="font-display text-3xl md:text-4xl text-white mt-2">
              Você sente que está fazendo tudo e mesmo assim não avança?
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {problemas.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 hover:border-brand-pink/20 transition-colors duration-200"
              >
                <p className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-pink flex-shrink-0" />
                  {p.title}
                </p>
                <p className="text-white/50 text-sm leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 bg-brand-pink/[0.07] border border-brand-pink/20 rounded-lg px-6 py-4 text-center text-brand-pink font-display font-bold text-base"
          >
            O problema não é esforço. É falta de estratégia.
          </motion.div>
        </div>
      </section>

      {/* O QUE É */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-brand-pink text-xs font-semibold tracking-widest uppercase">O que é a Análise Estratégica</span>
            <h2 className="font-display text-3xl md:text-4xl text-white mt-2 mb-4">
              Um Raio X completo do seu perfil.
            </h2>
            <p className="text-white/50 text-base leading-relaxed">
              Identificamos gargalos, oportunidades e estruturamos um plano claro de crescimento e vendas. Nada genérico. Nada superficial. Análise real baseada no seu posicionamento e objetivo.
            </p>
            <p className="text-white/30 text-sm italic mt-4">Baseado em metodologia aplicada em marcas reais.</p>
          </motion.div>
        </div>
      </section>

      {/* O QUE RECEBE */}
      <section className="py-20 px-4 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <span className="text-brand-pink text-xs font-semibold tracking-widest uppercase">O que você recebe</span>
            <h2 className="font-display text-3xl md:text-4xl text-white mt-2">
              Tudo que seu perfil precisa para funcionar.
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entregaveis.map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className={`relative rounded-lg p-6 border transition-all duration-200 hover:-translate-y-0.5 ${
                  e.destaque
                    ? "bg-brand-pink/[0.06] border-brand-pink/30"
                    : "bg-white/[0.03] border-white/[0.06] hover:border-brand-pink/20"
                }`}
              >
                {e.destaque && (
                  <span className="absolute top-3 right-3 bg-brand-pink text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full">
                    INCLUSO
                  </span>
                )}
                <span className="text-2xl mb-3 block">{e.icon}</span>
                <h3 className="text-white font-semibold text-sm mb-2">{e.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{e.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <span className="text-brand-pink text-xs font-semibold tracking-widest uppercase">Como Funciona</span>
            <h2 className="font-display text-3xl md:text-4xl text-white mt-2">Simples. Direto. Aplicável.</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {passos.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-full border-2 border-brand-pink bg-brand-pink/10 flex items-center justify-center font-display font-bold text-brand-pink text-lg mb-4">
                  {p.num}
                </div>
                <h3 className="text-white font-semibold text-sm mb-2">{p.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PARA QUEM */}
      <section className="py-20 px-4 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <span className="text-brand-pink text-xs font-semibold tracking-widest uppercase">Para quem é</span>
            <h2 className="font-display text-3xl md:text-4xl text-white mt-2">
              Não é para quem quer fórmula mágica.
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {paraquem.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-start gap-4 bg-white/[0.03] border border-white/[0.06] rounded-lg p-5"
              >
                <div className="w-5 h-5 rounded-full border border-brand-pink bg-brand-pink/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-brand-pink" />
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{item}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center text-white font-display font-bold text-lg mt-10"
          >
            É para quem quer <span className="text-brand-pink">clareza estratégica</span> e crescimento estruturado.
          </motion.p>
        </div>
      </section>

      {/* PREÇO */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <span className="text-brand-pink text-xs font-semibold tracking-widest uppercase">Investimento</span>
            <h2 className="font-display text-3xl md:text-4xl text-white mt-2">
              Um diagnóstico que se paga na primeira venda.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/[0.03] border border-brand-pink/25 rounded-2xl p-8 shadow-[0_0_60px_rgba(232,25,125,0.08)]"
          >
            <p className="text-white/40 text-xs tracking-widest uppercase mb-2">Análise Estratégica + Plano de Ação</p>
            <h3 className="text-white font-display font-bold text-lg mb-6">Diagnóstico Estratégico de Instagram</h3>
            <p className="text-brand-pink font-display font-bold text-6xl leading-none">
              <span className="text-2xl font-normal text-white/40">R$</span> 97
            </p>
            <p className="text-white/40 text-sm mt-3">Entrega em até 5 dias úteis · Pix ou cartão parcelado</p>
            <div className="mt-5 bg-brand-pink/[0.07] border border-brand-pink/15 rounded-lg px-4 py-3 text-brand-pink text-sm leading-relaxed">
              🎁 Abatemos 100% deste valor caso você migre para nossa Gestão Mensal em até 7 dias.
            </div>
            <a
              href={CHECKOUT_URL}
              className="block mt-6 bg-brand-pink text-white font-display font-bold text-base py-4 rounded-full transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 shadow-[0_0_32px_rgba(232,25,125,0.3)]"
            >
              Garantir meu Diagnóstico
            </a>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-white/[0.02]">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <span className="text-brand-pink text-xs font-semibold tracking-widest uppercase">Perguntas Frequentes</span>
            <h2 className="font-display text-3xl md:text-4xl text-white mt-2">
              Tudo que você precisa saber antes de comprar.
            </h2>
          </motion.div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <FaqItem q={faq.q} a={faq.a} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-pink/[0.06] rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-2xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-3xl md:text-5xl text-white leading-tight mb-4">
              Pronto para saber o que está travando seus resultados?
            </h2>
            <p className="text-white/50 text-base leading-relaxed mb-10">
              Análise completa + plano de ação + vídeo de direcionamento. Entrega em até 5 dias úteis.
            </p>
            <a
              href={CHECKOUT_URL}
              className="inline-block bg-brand-pink text-white font-display font-bold text-lg px-12 py-5 rounded-full transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 shadow-[0_0_40px_rgba(232,25,125,0.4)]"
            >
              Garantir meu Diagnóstico agora →
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
