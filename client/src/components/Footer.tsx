import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { SiThreads } from "react-icons/si";
import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="py-16 bg-brand-dark border-t border-white/5" data-testid="footer">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,2fr)_1fr_1fr_minmax(0,1.5fr)_1fr] gap-8 lg:gap-6">

          <div>
            <img src="/logo.png" alt="Digitalmente HUB" className="h-16 w-auto mb-2" />
            <p className="text-white/50 text-sm">HUB digital</p>
          </div>

          <div className="min-w-0">
            <h4 className="text-white font-medium mb-4">Contato</h4>
            <div className="space-y-3">
              <a
                href="https://wa.me/5541987907321"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/50 text-sm"
                data-testid="footer-whatsapp-1"
              >
                <FaWhatsapp className="w-4 h-4 flex-shrink-0" />
                (41) 98790-7321
              </a>
              <a
                href="https://wa.me/5541920059509"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/50 text-sm"
                data-testid="footer-whatsapp-2"
              >
                <Phone className="w-4 h-4 flex-shrink-0" />
                (41) 92005-9509
              </a>
              <a
                href="mailto:digitalmente.oficial.mkt@gmail.com"
                className="flex items-center gap-2 text-white/50 text-sm whitespace-nowrap overflow-hidden"
                data-testid="footer-email"
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                digitalmente.oficial.mkt@gmail.com
              </a>
              <div className="flex items-start gap-2 text-white/50 text-sm">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Av. Dr. Dário Lopes dos Santos, 2197 - Jardim Botânico, Curitiba - PR</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Navegação</h4>
            <div className="space-y-3">
              <a href="/#inicio" className="block text-white/50 text-sm" data-testid="footer-nav-home">Home</a>
              <a href="/#sobre" className="block text-white/50 text-sm" data-testid="footer-nav-about">Quem somos</a>
              <a href="/#servicos" className="block text-white/50 text-sm" data-testid="footer-nav-services">Serviços</a>
              <a href="/#contato" className="block text-white/50 text-sm" data-testid="footer-nav-contact">Contato</a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Redes Sociais</h4>
            <div className="space-y-3">
              <a
                href="https://instagram.com/digital.mentte"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/50 text-sm"
                data-testid="footer-instagram"
              >
                <FaInstagram className="w-4 h-4" />
                Instagram
              </a>
              <a
                href="https://www.threads.net/@digital.mentte"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/50 text-sm"
                data-testid="footer-threads"
              >
                <SiThreads className="w-4 h-4" />
                Threads
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Produtos</h4>
            <div className="space-y-3">
              <Link href="/produtos/packs" className="block text-white/50 text-sm" data-testid="footer-packs">
                Pack's de conteúdos
              </Link>
              <Link href="/produtos/consultoria" className="block text-white/50 text-sm" data-testid="footer-consultoria">
                Consultoria Estratégica Intensiva
              </Link>
              <Link href="/produtos/diagnostico-estrategico" className="block text-white/50 text-sm" data-testid="footer-analise">
                Análise Estratégica de Instagram
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Parcerias</h4>
            <div className="space-y-3">
              <a
                href="https://www.instagram.com/unicornio.designer/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-white/50 text-sm"
                data-testid="footer-unidesign"
              >
                Unidesign
              </a>
              <a
                href="https://createstudiocr.com.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-white/50 text-sm"
                data-testid="footer-create-studio"
              >
                Create Studio
              </a>
              <a
                href="https://xsolidy.com.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-white/50 text-sm"
                data-testid="footer-xsolid"
              >
                XSolidy
              </a>
              <a
                href="https://www.figma.com/proto/Bd52kse9I8MlmtURocp4bd/Hub-360%C2%B0?page-id=0%3A1&node-id=1-3&viewport=530%2C50%2C0.12&t=V7oHi6DZJBQnPR4z-8&scaling=scale-down-width&content-scaling=fixed&hide-ui=1&starting-point-node-id=1%3A3&fbclid=PARlRTSAQFyBtleHRuA2FlbQIxMABzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAaf-o7ieqvFRHMjmT3JwsSA2cnfUKxA8-vPVMb5VC5Kwye0_UPux9WUsz-EHxQ_aem_P5AWbrjKOZ-F-a7czxOlJA"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-white/50 text-sm"
                data-testid="footer-alimentec"
              >
                Alimentec
              </a>
            </div>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-left">
          <span className="sr-only">Atendemos Curitiba e todo o Brasil.</span>
          <p className="text-white/30 text-xs">Copyright © 2025 | Todos os direitos reservados.</p>
          <p className="text-white/30 text-xs">Digitalmente Hub LTDA</p>
          <p className="text-white/30 text-xs">CNPJ: 61.499.882/0001-76</p>
        </div>
      </div>
    </footer>
  );
}
