import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function ObrigadoBriefingDiagnostico() {
  useEffect(() => {
    document.title = "Briefing Recebido | Análise Estratégica de Instagram | Digitalmente Hub";
  }, []);

  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />
      <div className="pt-28 md:pt-36 pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-display text-[28px] md:text-[42px] text-white mb-8 leading-tight tracking-tight" data-testid="text-obrigado-briefing-diag-title">
              Briefing recebido com sucesso ✅
            </h1>

            <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-8 md:p-10 text-left space-y-4">
              <p className="text-white font-bold text-[15px] leading-[1.8]" data-testid="text-obrigado-briefing-diag-p1">
                Suas informações foram enviadas corretamente.
              </p>
              <p className="text-white/65 text-[15px] leading-[1.8]" data-testid="text-obrigado-briefing-diag-p2">
                Nossa equipe agora vai analisar seu perfil com base nas respostas enviadas e nas informações públicas do seu Instagram.
              </p>
              <p className="text-white/65 text-[15px] leading-[1.8]" data-testid="text-obrigado-briefing-diag-p3">
                • <span className="text-white font-bold">Entrega do Diagnóstico</span>: Você receberá seu Diagnóstico Estratégico completo em PDF em até 5 dias úteis no e-mail informado.
              </p>
              <p className="text-white/65 text-[15px] leading-[1.8]" data-testid="text-obrigado-briefing-diag-p4">
                • <span className="text-white font-bold">Vídeo Mestre de Implementação</span>: Junto com seu PDF, você receberá o acesso ao nosso Vídeo Mestre, onde explico detalhadamente a metodologia aplicada ao seu perfil e o direcionamento para execução.
              </p>
              <p className="text-white/65 text-[15px] leading-[1.8]" data-testid="text-obrigado-briefing-diag-p5">
                Fique atento ao seu <span className="text-white font-bold">WhatsApp</span> e <span className="text-white font-bold">E-mail</span>. Se precisarmos de algo adicional, entraremos em contato.
              </p>
            </div>

            <p className="text-white/35 text-sm mt-6 max-w-md mx-auto">
              Agora é com a gente. Em breve você terá clareza estratégica para crescer com direção.
            </p>

            <div className="mt-8">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-10 py-4 rounded-full text-[15px] font-bold transition-all duration-200 hover:brightness-110 hover:scale-[1.03] shadow-lg shadow-brand-orange/20"
                data-testid="button-voltar-site-briefing-diag"
              >
                Voltar para o site
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
