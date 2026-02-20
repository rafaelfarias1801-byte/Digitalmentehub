import { motion } from "framer-motion";
import inateLogo from "@assets/2_1771623412063.png";
import caseBg from "@assets/image_1771623359585.png";

export default function CaseStudy() {
  return (
    <section id="case" className="relative overflow-hidden" data-testid="section-casestudy">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="text-center py-12 md:py-16 bg-brand-navy"
      >
        <h2 className="text-[38px] text-white font-display">
          Case de Sucesso
        </h2>
      </motion.div>

      <div className="relative w-full min-h-[500px] md:min-h-[600px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${caseBg})` }}
        />
        <div className="absolute inset-0 bg-brand-navy/40" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16 flex flex-col justify-center h-full min-h-[500px] md:min-h-[600px]">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <img
              src={inateLogo}
              alt="INATE"
              className="w-28 md:w-36 mb-4"
              loading="lazy"
            />

            <h3 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[0.95] mb-6">
              +7mil<br />seguidores
            </h3>

            <div className="bg-brand-pink px-5 py-4 md:px-6 md:py-5 inline-block max-w-xl">
              <p className="text-white text-sm md:text-base leading-relaxed font-medium">
                A INATE nos procurou com cerca de 400 seguidores e sem uma presença digital construída de forma estratégica. Através de reposicionamento, clareza de mensagem e conteúdo alinhado ao propósito da marca, a INATE ultrapassou 7 mil seguidores e passou a ocupar um espaço de autoridade, conexão e crescimento real no digital.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
