import { motion } from "framer-motion";
import caseBg from "@assets/Digitalmente_(1)_1771625189778.png";
import inateLogo from "@assets/2_1771623412063.png";

export default function CaseStudy() {
  return (
    <section id="case" className="relative overflow-hidden scroll-mt-16" data-testid="section-casestudy">
      <div className="relative w-full">
        <img
          src={caseBg}
          alt="Case de Sucesso - INATE"
          className="w-full h-auto block"
        />

        <div className="absolute inset-0 z-10 flex flex-col justify-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-[38px] text-white font-display text-center absolute top-2 md:top-4 left-0 right-0"
            >
              Case de Sucesso
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-[55%] md:max-w-[45%]"
            >
              <img
                src={inateLogo}
                alt="INATE"
                className="w-16 md:w-24 lg:w-28 mb-1 md:mb-2"
              />

              <h3 className="text-2xl md:text-5xl lg:text-6xl font-bold text-white leading-[0.95] mb-2 md:mb-4">
                +7mil<br />seguidores
              </h3>

              <div className="bg-brand-pink px-3 py-2 md:px-5 md:py-4 inline-block">
                <p className="text-white text-[8px] md:text-xs lg:text-sm leading-relaxed font-medium">
                  A INATE nos procurou com cerca de 400 seguidores e sem uma presença digital construída de forma estratégica. Através de reposicionamento, clareza de mensagem e conteúdo alinhado ao propósito da marca, a INATE ultrapassou 7 mil seguidores e passou a ocupar um espaço de autoridade, conexão e crescimento real no digital.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
