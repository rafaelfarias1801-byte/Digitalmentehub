import { motion } from "framer-motion";
import caseBg from "@assets/image_1771623716939.png";

export default function CaseStudy() {
  return (
    <section id="case" className="relative overflow-hidden scroll-mt-16" data-testid="section-casestudy">
      <div className="relative w-full">
        <img
          src={caseBg}
          alt="Case de Sucesso - INATE"
          className="w-full h-auto block"
        />
        <div className="absolute top-4 md:top-8 left-0 right-0 z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-[38px] text-white font-display text-center"
          >
            Case de Sucesso
          </motion.h2>
        </div>
      </div>
    </section>
  );
}
