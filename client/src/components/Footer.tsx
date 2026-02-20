import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-12 bg-brand-dark border-t border-white/5" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Digitalmente HUB" className="h-8 w-auto" />
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/5541987907321"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:text-brand-orange hover:bg-white/10 transition-all"
              aria-label="WhatsApp"
            >
              <FaWhatsapp className="w-4 h-4" />
            </a>
            <a
              href="https://instagram.com/digital.mentte"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:text-brand-orange hover:bg-white/10 transition-all"
              aria-label="Instagram"
            >
              <FaInstagram className="w-4 h-4" />
            </a>
            <a
              href="mailto:digitalmente.oficial.mkt@gmail.com"
              className="w-9 h-9 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:text-brand-orange hover:bg-white/10 transition-all"
              aria-label="E-mail"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>

          <p className="text-white/30 text-xs">
            Digitalmente HUB - Curitiba, PR
          </p>
        </div>
      </div>
    </footer>
  );
}
