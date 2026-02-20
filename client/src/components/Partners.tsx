import { motion } from "framer-motion";
import { partners } from "../data/partners";

export default function Partners() {
  return (
    <section id="parceiros" className="py-24 md:py-32 bg-brand-navy relative" data-testid="section-partners">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="md:text-5xl lg:text-6xl text-white mb-4 font-display text-[30px]">
            Parceiros
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            A gente coordena estratégia e direção. A execução acontece com especialistas por área.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {partners.map((partner, i) => (
            <motion.div
              key={partner.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 flex flex-col items-center gap-4 hover:border-brand-orange/20 transition-all duration-300"
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
                <span className="text-brand-blue/70 text-xs">{partner.area}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
