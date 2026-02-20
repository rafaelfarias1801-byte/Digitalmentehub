import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { Check, Star } from "lucide-react";
import { packs } from "../data/packs";

export default function Packs() {
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
          <span className="font-display text-brand-pink text-lg">PACKS</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-white mt-2 mb-4">
            Packs de Conteúdo
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Pra manter presença com qualidade — mesmo fazendo internamente.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {packs.map((pack, i) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
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
      </div>
    </section>
  );
}
