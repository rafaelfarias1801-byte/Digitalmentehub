import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Link } from "wouter";
import { packs } from "../data/packs";

export default function PacksConteudo() {
  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />
      <div className="pt-24 pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="font-display text-brand-pink text-lg">PRODUTOS</span>
            <h2 className="font-display text-[28px] md:text-[38px] text-white mt-2 mb-4">
              Pack's de Conteúdos
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Conteúdo estratégico focado na mensagem central da sua marca e autoridade, organizado por linha editorial mensal (Feed, Reels e Stories).
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {packs.map((pack, i) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`relative rounded-lg p-6 border transition-all duration-300 flex flex-col ${
                  pack.highlight
                    ? "bg-brand-orange/[0.08] border-brand-orange/30"
                    : "bg-white/[0.03] border-white/[0.06]"
                }`}
                data-testid={`card-pack-${pack.id}`}
              >
                {pack.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-brand-pink text-white text-xs px-3 py-1 rounded-md">
                      <Star className="w-3 h-3" />
                      Mais escolhido
                    </span>
                  </div>
                )}

                <h3 className="text-base text-white mb-1">{pack.name}</h3>
                <p className="text-white/40 text-sm mb-3">{pack.subtitle}</p>
                <div className="mb-5 text-center">
                  <p className="text-2xl md:text-3xl text-brand-orange font-bold">{pack.price}</p>
                  <p className="text-white/40 text-sm mt-1">ou até {pack.installment}</p>
                </div>

                <ul className="space-y-3 flex-1">
                  {pack.features.map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                      <span className={`text-sm ${feat.bold ? "text-white font-semibold" : "text-white/60"}`}>{feat.text}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-white/80 text-sm font-semibold mt-4 mb-5">{pack.anchorPhrase}</p>

                <Link
                  href={`/checkout-${pack.id}`}
                  className={`inline-flex items-center justify-center gap-2 w-full py-3 rounded-md text-sm transition-all duration-200 ${
                    pack.highlight
                      ? "bg-brand-orange text-white"
                      : "border border-brand-orange/30 text-brand-orange"
                  }`}
                  data-testid={`button-pack-${pack.id}`}
                >
                  Saber mais
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 max-w-3xl mx-auto"
          >
            <p className="text-white/30 text-xs leading-relaxed text-center" data-testid="text-packs-disclaimer">
              Importante: Os packs são focados na criação de conteúdo (arte + legenda). Não incluem gestão de perfil, estratégia contínua, acompanhamento de métricas ou interação diária. Para marcas que buscam crescimento estratégico e gestão completa, oferecemos planos personalizados.
            </p>
          </motion.div>
        </div>
      </div>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
