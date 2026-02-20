import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";

export default function BrandsServed() {
  return (
    <section className="py-16 md:py-20 bg-brand-navy relative" data-testid="section-brands">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-2xl md:text-3xl text-white mb-8">
            Marcas atendidas
          </h2>

          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 mb-10 opacity-60">
            <div className="w-24 h-12 bg-white/5 rounded-md flex items-center justify-center text-white/30 text-xs">Logo</div>
            <div className="w-24 h-12 bg-white/5 rounded-md flex items-center justify-center text-white/30 text-xs">Logo</div>
            <div className="w-24 h-12 bg-white/5 rounded-md flex items-center justify-center text-white/30 text-xs">Logo</div>
            <div className="w-24 h-12 bg-white/5 rounded-md flex items-center justify-center text-white/30 text-xs">Logo</div>
            <div className="w-24 h-12 bg-white/5 rounded-md flex items-center justify-center text-white/30 text-xs">Logo</div>
          </div>

          <a
            href="https://wa.me/5541987907321?text=Ol%C3%A1!%20Quero%20fazer%20parte%20das%20marcas%20atendidas."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-8 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:brightness-110 hover:scale-[1.02]"
            data-testid="button-brands-cta"
          >
            <FaWhatsapp className="text-lg" />
            Quero fazer parte
          </a>
        </motion.div>
      </div>
    </section>
  );
}
