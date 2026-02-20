import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const tabs = [
  {
    id: "marca",
    label: "Marca",
    title: "Posicionamento & Identidade",
    image: "/brand/lab-marca.png",
    bullets: [
      "A gente entende onde sua marca está e onde ela pode chegar",
      "Criamos a identidade visual certa com parceiros que entendem de marca",
      "Manual de marca simples, prático e fácil de aplicar no dia a dia",
    ],
  },
  {
    id: "presenca",
    label: "Presença",
    title: "Conteúdo & Redes",
    image: "/brand/lab-presenca.png",
    bullets: [
      "Planejamento de conteúdo que conversa com seu público",
      "Criamos conteúdos visuais e copy que gera identidade",
      "Estruturamos seu perfil pra crescer de verdade",
    ],
  },
  {
    id: "performance",
    label: "Performance",
    title: "Tráfego & Site",
    image: "/brand/lab-performance.png",
    bullets: [
      "Anúncios pensados pra atrair as pessoas certas",
      "Páginas e sites que guiam o usuário até a ação",
      "Olhar estratégico pra cada resultado",
    ],
  },
];

export default function Laboratory() {
  const [active, setActive] = useState(0);
  const current = tabs[active];

  return (
    <section className="py-24 md:py-32 bg-brand-navy relative" data-testid="section-laboratorio">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/8 via-transparent to-brand-pink/5 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-white mt-2 mb-4 font-bold">
            A sua marca não precisa de mais posts
          </h2>
          <p className="max-w-xl mx-auto text-[19px] font-bold text-[#ffffff]">
            Ela precisa de uma estratégia que funcione
          </p>
        </motion.div>

        <div className="flex justify-center gap-2 md:gap-3 mb-12">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActive(i)}
              className="px-5 md:px-8 py-3 rounded-md text-sm transition-all duration-300 bg-brand-orange text-white font-semibold"
              data-testid={`button-lab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
            className="grid md:grid-cols-2 gap-8 md:gap-12 items-center"
          >
            <div className="relative rounded-lg overflow-hidden aspect-video">
              <img
                src={current.image}
                alt={current.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/60 via-transparent to-transparent" />
            </div>

            <div>
              <h3 className="text-2xl md:text-3xl text-white mb-6">
                {current.title}
              </h3>
              <ul className="space-y-4">
                {current.bullets.map((bullet, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-brand-orange mt-2 flex-shrink-0" />
                    <span className="text-white/70 text-base">{bullet}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
