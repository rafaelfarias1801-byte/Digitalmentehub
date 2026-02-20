import { FaWhatsapp } from "react-icons/fa";

import brand1 from "@assets/1_1771613135862.png";
import brand2 from "@assets/2_1771613135864.png";
import brand4 from "@assets/4_1771613135855.png";
import brand5 from "@assets/5_1771613135856.png";
import brand6 from "@assets/6_1771613135857.png";
import brand7 from "@assets/7_1771613135857.png";
import brand8 from "@assets/8_1771613135858.png";
import brand9 from "@assets/Marcas_1771613208774.png";
import brandExpe from "@assets/Marcas_(1)_1771613389727.png";
import brandTecas from "@assets/Marcas_(2)_1771613463514.png";
import brandThaline from "@assets/Marcas_(3)_1771613465836.png";
import brandAbarduzido from "@assets/Marcas_(4)_1771613521728.png";

const brands = [
  { src: brand4, alt: "Comuniquei" },
  { src: brand5, alt: "Achados da Nina" },
  { src: brand6, alt: "Carlos Cavalheiro" },
  { src: brand7, alt: "Rhaissa Ament" },
  { src: brand8, alt: "Alimentec" },
  { src: brand1, alt: "Cite Nacibe" },
  { src: brand2, alt: "Inate" },
  { src: brandExpe, alt: "Expe." },
  { src: brand9, alt: "Atâmara Empório Saudável" },
  { src: brandTecas, alt: "Tecas" },
  { src: brandThaline, alt: "Thaline Leticia" },
  { src: brandAbarduzido, alt: "Abarduzido" },
];

export default function BrandsServed() {
  return (
    <section className="py-16 md:py-20 bg-brand-navy relative overflow-hidden" data-testid="section-brands">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="md:text-3xl text-white mb-10 text-center font-extrabold text-[28px]">
          Marcas atendidas
        </h2>
      </div>
      <div className="relative w-full overflow-hidden mb-10">
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-brand-navy to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-brand-navy to-transparent pointer-events-none" />

        <div className="flex animate-marquee items-center gap-16 md:gap-20 w-max">
          {[...brands, ...brands].map((brand, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[190px] h-[136px] md:w-[245px] md:h-[163px] flex items-center justify-center"
            >
              <img
                src={brand.src}
                alt={brand.alt}
                className="max-w-full max-h-full object-contain opacity-70"
                data-testid={`img-brand-${i}`}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="text-center">
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
      </div>
    </section>
  );
}
