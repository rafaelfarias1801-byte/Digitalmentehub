import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function ObrigadoBriefing() {
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
            <h1 className="font-display text-[28px] md:text-[42px] text-white mb-10 leading-tight tracking-tight" data-testid="text-obrigado-title">
              Briefing recebido com sucesso ✅
            </h1>

            <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-8 md:p-12 text-left space-y-5">
              <p className="text-white/65 text-[15px] leading-[1.8]" data-testid="text-obrigado-p1">
                Suas informações foram enviadas corretamente.
              </p>
              <p className="text-white/65 text-[15px] leading-[1.8]" data-testid="text-obrigado-p2">
                Nossa equipe irá organizar os dados e iniciar a produção do seu conteúdo conforme o pack contratado.
              </p>
              <p className="text-white/65 text-[15px] leading-[1.8]" data-testid="text-obrigado-p3">
                Caso seja necessário, entraremos em contato pelo e-mail ou WhatsApp informado.
              </p>
              <p className="text-white/65 text-[15px] leading-[1.8]" data-testid="text-obrigado-p4">
                Obrigado pela confiança.
              </p>
            </div>

            <div className="mt-10">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-10 py-4 rounded-full text-[15px] font-bold transition-all duration-200 hover:brightness-110 hover:scale-[1.03] shadow-lg shadow-brand-orange/20"
                data-testid="button-voltar-site"
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
