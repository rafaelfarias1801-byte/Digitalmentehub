import { motion } from "framer-motion";
import inateLogo from "@assets/2_1771623412063.png";
import caseBg from "@assets/image_1771623359585.png";

export default function CaseStudy() {
  return (
    <section id="case" className="relative overflow-hidden scroll-mt-16" data-testid="section-casestudy">
      <div className="relative w-full min-h-[100vh]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${caseBg})` }}
        />
        <div className="absolute inset-0 bg-brand-navy/40" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-16 flex flex-col justify-center h-full min-h-[100vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-[38px] text-white font-display">
              Case de Sucesso
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
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
