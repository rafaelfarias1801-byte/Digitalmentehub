import { useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "wouter";
import { FaWhatsapp } from "react-icons/fa";
import { packs } from "../data/packs";

const preferenceIds: Record<string, string> = {
  basico: "3035532652-2c14a7e7-188a-45bf-983a-4d9b7e34b3bd",
  intermediario: "3035532652-7925d708-1102-4fe4-9e13-3220d9148e6b",
  premium: "3035532652-ee68e755-9433-4ae6-bd27-8c3b8158040c",
  diamante: "3035532652-fa82901e-8c1e-46dd-ab68-044cf8948c7a",
};

const pageTitles: Record<string, string> = {
  basico: "Checkout Pack Básico | Digitalmente Hub",
  intermediario: "Checkout Pack Intermediário | Digitalmente Hub",
  premium: "Checkout Pack Premium | Digitalmente Hub",
  diamante: "Checkout Pack Diamante | Digitalmente Hub",
};

const displayNames: Record<string, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  premium: "Premium",
  diamante: "Diamante",
};

export default function Checkout({ packId }: { packId: string }) {
  const mpRef = useRef<HTMLDivElement>(null);
  const pack = packs.find((p) => p.id === packId);

  useEffect(() => {
    document.title = pageTitles[packId] || "Checkout | Digitalmente Hub";
  }, [packId]);

  useEffect(() => {
    if (!mpRef.current || !preferenceIds[packId]) return;

    mpRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://www.mercadopago.com.br/integrations/v1/web-payment-checkout.js";
    script.setAttribute("data-preference-id", preferenceIds[packId]);
    script.setAttribute("data-source", "button");
    mpRef.current.appendChild(script);

    return () => {
      if (mpRef.current) {
        mpRef.current.innerHTML = "";
      }
    };
  }, [packId]);

  if (!pack) return null;

  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />
      <div className="pt-32 md:pt-40 pb-28">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-10">
              <h1 className="font-display text-[28px] md:text-[42px] text-white mb-3 leading-tight tracking-tight" data-testid={`text-checkout-title-${packId}`}>
                Checkout do Pack {displayNames[packId]}
              </h1>
              <p className="text-white/45 text-[15px] max-w-md mx-auto">
                Pagamento seguro via Mercado Pago. Após o pagamento, você será direcionado para preencher o briefing.
              </p>
            </div>

            <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-8 md:p-10 mb-8">
              <h3 className="text-lg text-white font-medium mb-1" data-testid={`text-checkout-pack-name-${packId}`}>{pack.name}</h3>
              <p className="text-white/40 text-sm mb-5">{pack.subtitle}</p>

              <ul className="space-y-3 mb-6">
                {pack.features.map((feat, fi) => (
                  <li key={fi} className={`flex items-start gap-2.5 ${feat.muted ? "mt-1" : ""}`}>
                    {feat.muted ? (
                      <span className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Check className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${feat.muted ? "text-white/35 italic text-xs" : feat.bold ? "text-white font-semibold" : "text-white/60"}`}>{feat.text}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-white/[0.06] pt-5">
                <p className="text-2xl md:text-3xl text-brand-orange font-bold" data-testid={`text-checkout-price-${packId}`}>{pack.price}</p>
              </div>
            </div>

            <div className="text-center mb-6" data-testid={`container-mp-button-${packId}`}>
              <div ref={mpRef} className="inline-block" />
            </div>

            <p className="text-white/30 text-xs text-center leading-relaxed mb-8">
              Se você tiver qualquer problema no pagamento, fale com a gente pelo{" "}
              <a
                href="https://wa.me/5541987907321"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 underline"
              >
                WhatsApp
              </a>
              .
            </p>

            <div className="text-center">
              <Link
                href="/produtos/packs"
                className="inline-flex items-center justify-center gap-2 border border-brand-orange/30 text-brand-orange px-8 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:bg-brand-orange/10"
                data-testid={`button-voltar-packs-${packId}`}
              >
                Voltar para os packs
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
