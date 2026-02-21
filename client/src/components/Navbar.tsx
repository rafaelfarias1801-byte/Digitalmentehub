import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { Menu, X } from "lucide-react";
import { useLocation } from "wouter";

const navLinks = [
  { label: "Início", href: "#inicio", isPage: false },
  { label: "Quem Somos", href: "#sobre", isPage: false },
  { label: "Serviços", href: "#servicos", isPage: false },
  { label: "Case de Sucesso", href: "#case", isPage: false },
  { label: "Parceiros", href: "#parceiros", isPage: false },
  { label: "Contato", href: "#contato", isPage: false },
  { label: "Produtos", href: "/produtos", isPage: true },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = (link: typeof navLinks[number]) => {
    setMobileOpen(false);
    if (link.isPage) {
      setLocation(link.href);
      return;
    }
    if (window.location.pathname !== "/") {
      setLocation("/");
      setTimeout(() => {
        const el = document.querySelector(link.href);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      const el = document.querySelector(link.href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-brand-navy/95 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a
            href="#inicio"
            onClick={(e) => { e.preventDefault(); handleClick(navLinks[0]); }}
            className="flex-shrink-0"
            data-testid="link-logo"
          >
            <img
              src="/logo.png"
              alt="Digitalmente HUB"
              className="h-20 md:h-25 w-auto"
            />
          </a>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); handleClick(link); }}
                className="px-3 py-2 text-sm text-white/80 hover:text-brand-orange transition-colors font-semibold"
                data-testid={`link-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://wa.me/5541987907321?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20quero%20saber%20mais."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand-orange text-white px-5 py-2.5 rounded-md text-sm transition-all duration-200 hover:brightness-110 hover:scale-[1.02] font-medium"
              data-testid="button-whatsapp-nav"
            >
              <FaWhatsapp className="text-lg" />
              Falar no WhatsApp
            </a>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <a
              href="/produtos"
              onClick={(e) => { e.preventDefault(); setMobileOpen(false); setLocation("/produtos"); }}
              className="inline-flex items-center gap-1.5 bg-brand-pink text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:brightness-110"
              data-testid="button-produtos-mobile"
            >
              Produtos
            </a>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-white p-2"
              data-testid="button-mobile-menu"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-brand-navy/98 backdrop-blur-lg border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); handleClick(link); }}
                  className="block px-4 py-3 text-white/80 hover:text-brand-orange hover:bg-white/5 rounded-md transition-colors"
                  data-testid={`link-mobile-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="https://wa.me/5541987907321?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20quero%20saber%20mais."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-brand-orange text-white px-5 py-3 rounded-md text-sm mt-3"
                data-testid="button-whatsapp-mobile"
              >
                <FaWhatsapp className="text-lg" />
                Falar no WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
