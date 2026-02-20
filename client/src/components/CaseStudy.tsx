import { motion } from "framer-motion";
import caseBg from "@assets/image_1771623716939.png";

export default function CaseStudy() {
  return (
    <section id="case" className="relative overflow-hidden scroll-mt-16" data-testid="section-casestudy">
      <div className="relative w-full max-h-[calc(100vh-64px)] overflow-hidden">
        <img
          src={caseBg}
          alt="Case de Sucesso - INATE"
          className="w-full h-full object-cover object-top block"
        />
        <div className="absolute top-3 md:top-6 left-0 right-0 z-10">
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
