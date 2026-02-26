import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function ObrigadoCompra() {
  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />
      <div className="pt-32 md:pt-40 pb-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-display text-[28px] md:text-[42px] text-white mb-10 leading-tight tracking-tight" data-testid="text-obrigado-compra-title">
              Pagamento confirmado 🎉
            </h1>

            <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-8 md:p-12 text-left space-y-5">
              <p className="text-white/65 text-[15px] leading-[1.8]" data-testid="text-obrigado-compra-p1">
                Recebemos a confirmação do seu pagamento com sucesso.
              </p>
              <p className="text-white/65 text-[15px] leading-[1.8]" data-testid="text-obrigado-compra-p2">
                Agora precisamos de algumas informações para iniciar a criação do seu conteúdo.
              </p>
              <p className="text-white/65 text-[15px] leading-[1.8]" data-testid="text-obrigado-compra-p3">
                O briefing é obrigatório e leva menos de 5 minutos.
              </p>
            </div>

            <div className="mt-10">
              <a
                href="https://tally.so/r/jaBQgJ"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-10 py-4 rounded-full text-[15px] font-bold transition-all duration-200 hover:brightness-110 hover:scale-[1.03] shadow-lg shadow-brand-orange/20"
                data-testid="button-preencher-briefing"
              >
                Preencher briefing
              </a>
            </div>

            <p className="text-white/30 text-xs leading-relaxed mt-6 max-w-md mx-auto" data-testid="text-obrigado-compra-auxiliar">
              Se você não puder preencher agora, salve este link para concluir depois:{" "}
              <a
                href="https://tally.so/r/jaBQgJ"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 underline break-all"
              >
                https://tally.so/r/jaBQgJ
              </a>
            </p>

            <div className="mt-8">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 border border-brand-orange/30 text-brand-orange px-8 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:bg-brand-orange/10"
                data-testid="button-voltar-site-compra"
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
