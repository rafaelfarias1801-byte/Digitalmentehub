import { motion } from "framer-motion";
import inateLogo from "@assets/2_1771623217111.png";

export default function CaseStudy() {
  return (
    <section id="case" className="py-24 md:py-32 bg-brand-navy relative" data-testid="section-casestudy">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-[38px] text-white mb-4 font-display">
            Case de Sucesso
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12"
        >
          <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden bg-black flex items-center justify-center">
            <img
              src={inateLogo}
              alt="INATE"
              className="w-full h-full object-contain p-4"
              loading="lazy"
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-brand-pink mb-4">
              +7 mil seguidores.
            </h3>
            <p className="text-white/70 text-base md:text-lg leading-relaxed">
              A INATE nos procurou com cerca de 400 seguidores e sem uma presença digital construída de forma estratégica. Através de reposicionamento, clareza de mensagem e conteúdo alinhado ao propósito da marca, a INATE ultrapassou 7 mil seguidores e passou a ocupar um espaço de autoridade, conexão e crescimento real no digital.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
