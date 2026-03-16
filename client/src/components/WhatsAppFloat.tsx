import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/5541987907321?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20quero%20saber%20mais."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg animate-pulse-glow transition-transform hover:scale-110"
      aria-label="WhatsApp"
      data-testid="button-whatsapp-float"
    >
      <FaWhatsapp className="text-white text-2xl" />
    </a>
  );
}
