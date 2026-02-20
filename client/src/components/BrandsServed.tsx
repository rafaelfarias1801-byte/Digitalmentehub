import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";

import brand1 from "@assets/1_1771612831050.png";
import brand2 from "@assets/2_1771612831050.png";
import brand3 from "@assets/3_1771612831051.png";
import brand4 from "@assets/4_1771612831044.png";
import brand5 from "@assets/5_1771612831047.png";
import brand6 from "@assets/6_1771612831048.png";
import brand7 from "@assets/7_1771612831048.png";
import brand8 from "@assets/8_1771612831049.png";

const brands = [
  { src: brand4, alt: "Comuniquei" },
  { src: brand5, alt: "Achados da Nina" },
  { src: brand6, alt: "Carlos Cavalheiro" },
  { src: brand7, alt: "Rhaissa Ament" },
  { src: brand8, alt: "Marca 5" },
  { src: brand1, alt: "Marca 6" },
  { src: brand2, alt: "Marca 7" },
  { src: brand3, alt: "Marca 8" },
];

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

          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 mb-10">
            {brands.map((brand, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="w-20 h-20 md:w-28 md:h-28 flex items-center justify-center"
              >
                <img
                  src={brand.src}
                  alt={brand.alt}
                  className="max-w-full max-h-full object-contain opacity-80 hover:opacity-100 transition-opacity duration-200"
                  data-testid={`img-brand-${i}`}
                />
              </motion.div>
            ))}
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
