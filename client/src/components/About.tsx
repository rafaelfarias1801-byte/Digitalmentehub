import { motion } from "framer-motion";
import { Lightbulb, Users, TrendingUp } from "lucide-react";

const cards = [
  {
    icon: Lightbulb,
    title: "Estratégia",
    description: "Diagnóstico real, posicionamento claro e plano de ação com direção.",
  },
  {
    icon: Users,
    title: "Execução com parceiros",
    description: "Cada entrega feita por quem entende do assunto. Sem improvisos.",
  },
  {
    icon: TrendingUp,
    title: "Otimização contínua",
    description: "Acompanhamos métricas e ajustamos a rota. O plano evolui com a marca.",
  },
];

export default function About() {
  return (
    <section id="sobre" className="py-24 md:py-32 bg-brand-navy relative" data-testid="section-about">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-navy via-brand-dark/30 to-brand-navy pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-display text-brand-pink text-lg">HUB</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-white mt-2 mb-4">
            O que é a Digitalmente HUB
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            Um hub de marketing que centraliza estratégia e coordena execução — com uma rede de especialistas por área.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="group relative bg-white/[0.03] border border-white/[0.06] rounded-lg p-8 hover:border-brand-orange/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-md bg-brand-orange/10 flex items-center justify-center mb-5 group-hover:bg-brand-orange/20 transition-colors">
                <card.icon className="w-6 h-6 text-brand-orange" />
              </div>
              <h3 className="text-xl text-white mb-3">{card.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{card.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
