import { motion } from "framer-motion";
import { segments } from "../data/segments";

export default function Segments() {
  return (
    <section className="py-20 md:py-28 bg-brand-purple/20 relative" data-testid="section-segments">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-navy to-brand-navy pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-white mb-4">
            Segmentos que atendemos
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Hoje atendemos vários mercados — e colocamos energia extra onde somos mais fortes:{" "}
            <span className="text-brand-orange">A&B.</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {segments.map((seg, i) => {
            const isAB = seg === "Alimentos" || seg === "Bebidas";
            return (
              <motion.span
                key={seg}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className={`px-5 py-2.5 rounded-md text-sm border transition-all duration-200 cursor-default ${
                  isAB
                    ? "bg-brand-orange/10 border-brand-orange/40 text-brand-orange"
                    : "bg-white/[0.03] border-brand-blue/30 text-white/70 hover:border-brand-orange/40 hover:text-brand-orange"
                }`}
                data-testid={`chip-segment-${seg.toLowerCase().replace(/\s/g, "-")}`}
              >
                {seg}
              </motion.span>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
