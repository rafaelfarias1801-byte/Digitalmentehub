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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-brand-orange/20 border border-brand-orange/40 text-brand-orange px-4 py-1.5 rounded-md text-xs tracking-wider uppercase mb-6">
              Especialidade em Alimentos & Bebidas
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.05] mb-6"
          >
            Estratégias criativas pra transformar{" "}
            <span className="text-brand-orange">presença</span> em{" "}
            <span className="text-brand-orange">resultado.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-lg md:text-xl text-white/70 leading-relaxed mb-4 max-w-2xl"
          >
            Somos a Digitalmente{" "}
            <span className="font-display text-brand-orange text-2xl md:text-3xl align-middle">HUB</span>
            : estratégia, conteúdo, tráfego e estrutura digital — com execução coordenada por especialistas.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="text-sm text-brand-blue mb-8"
          >
            E marcas que precisam de desejo de marca.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <a
              href="https://wa.me/5541987907321?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20quero%20saber%20mais."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-8 py-4 rounded-md text-base transition-all duration-200 hover:brightness-110 hover:scale-[1.02]"
              data-testid="button-hero-whatsapp"
            >
              <FaWhatsapp className="text-xl" />
              Falar no WhatsApp
            </a>
            <button
              onClick={() => scrollTo("#contato")}
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-8 py-4 rounded-md text-base transition-all duration-200 hover:border-brand-orange hover:text-brand-orange"
              data-testid="button-hero-diagnostico"
            >
              Quero um diagnóstico
            </button>
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
