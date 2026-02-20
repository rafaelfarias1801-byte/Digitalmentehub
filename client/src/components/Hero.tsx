import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { ArrowDown } from "lucide-react";

export default function Hero() {
  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center overflow-hidden"
      data-testid="section-hero"
    >
      <div className="absolute inset-0 z-0">
        <img
          src="/brand/hero-bg.png"
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/80 via-brand-navy/70 to-brand-navy/95" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.1] mb-8"
          >
            Estratégias criativas pra transformar{" "}
            <span className="text-brand-orange">presença</span> em{" "}
            <span className="text-brand-orange">resultado.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-lg md:text-xl text-white/70 leading-relaxed mb-10 max-w-2xl mx-auto"
          >
            Somos a Dig, um <span className="text-brand-orange font-bold">HUB</span> de estratégia digital, onde conteúdo, marketing e criatividade viram presença online.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <a
              href="https://wa.me/5541987907321?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20quero%20receber%20um%20diagn%C3%B3stico%20gratuito."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-brand-orange text-white px-10 py-4 rounded-full transition-all duration-200 hover:brightness-110 hover:scale-[1.02] text-[16px] font-bold"
              data-testid="button-hero-diagnostico"
            >
              <FaWhatsapp className="text-xl" />
              Receber um diagnóstico gratuito
            </a>
          </motion.div>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <button
          onClick={() => scrollTo("#sobre")}
          className="text-white/40 hover:text-brand-orange transition-colors"
          aria-label="Rolar para baixo"
        >
          <ArrowDown className="w-6 h-6 animate-bounce" />
        </button>
      </motion.div>
    </section>
  );
}
