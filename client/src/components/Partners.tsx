import { motion } from "framer-motion";
import { partners } from "../data/partners";

export default function Partners() {
  return (
    <section id="parceiros" className="pt-24 md:pt-32 pb-32 md:pb-40 bg-brand-pink relative overflow-hidden scroll-mt-16" data-testid="section-partners">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="md:text-5xl lg:text-6xl text-white mb-4 font-display text-[40px]">
            Parceiros
          </h2>
          <p className="max-w-xl mx-auto text-white">
            A gente coordena estratégia e direção. A execução acontece com especialistas por área.
          </p>
        </motion.div>
      </div>
      <div className="relative w-full overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-brand-pink to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-brand-pink to-transparent pointer-events-none" />

        <div className="flex animate-marquee items-center gap-8 md:gap-12 w-max">
          {[...partners, ...partners].map((partner, i) => (
            <div
              key={i}
              className="flex-shrink-0 bg-white/[0.08] rounded-lg p-6 flex flex-col items-center gap-4 w-[200px]"
              data-testid={`card-partner-${i}`}
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/5">
                <img
                  src={partner.logoPath}
                  alt={partner.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="text-center">
                <h3 className="text-white text-base">{partner.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
