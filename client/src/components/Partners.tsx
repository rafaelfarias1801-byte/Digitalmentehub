import { useState } from "react";
import { motion } from "framer-motion";
import { partners, partnerAreas } from "../data/partners";

export default function Partners() {
  const [activeArea, setActiveArea] = useState("Todos");

  const filtered = activeArea === "Todos"
    ? partners
    : partners.filter((p) => p.area === activeArea);

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
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-white font-navycula mb-4">
            Parceiros
          </h2>
          <p className="text-white/50 font-navycula max-w-xl mx-auto">
            A gente coordena estratégia e direção. A execução acontece com especialistas por área.
          </p>
        </motion.div>

        <div className="flex justify-center flex-wrap gap-2 mb-12">
          {partnerAreas.map((area) => (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={`px-4 py-2 rounded-md text-sm font-navycula transition-all duration-200 ${
                activeArea === area
                  ? "bg-brand-orange text-white"
                  : "bg-white/[0.04] text-white/50 border border-white/10 hover:border-brand-orange/30 hover:text-white"
              }`}
              data-testid={`button-filter-${area.toLowerCase()}`}
            >
              {area}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filtered.map((partner, i) => (
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
                <h3 className="text-white font-navycula text-base">{partner.name}</h3>
                <span className="text-brand-blue/70 text-xs font-navycula">{partner.area}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-white/30 font-navycula py-12">
            Nenhum parceiro nesta área por enquanto.
          </p>
        )}
      </div>
    </section>
  );
}
