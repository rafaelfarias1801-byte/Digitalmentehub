import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Mail, Phone } from "lucide-react";

export default function ObrigadoCompra() {
  const notified = useRef(false);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (notified.current) return;
    notified.current = true;

    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id") || params.get("collection_id") || undefined;
    const status = params.get("status") || params.get("collection_status") || undefined;
    const merchantOrderId = params.get("merchant_order_id") || undefined;

    fetch("/api/payment-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, status, merchantOrderId }),
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!email && !whatsapp) return;
    setSending(true);

    try {
      await fetch("/api/payment-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, whatsapp }),
      });
      setSent(true);
      window.open("https://tally.so/r/jaBQgJ", "_blank");
    } catch {
      window.open("https://tally.so/r/jaBQgJ", "_blank");
    } finally {
      setSending(false);
    }
  };

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

            {!sent ? (
              <div className="mt-10 max-w-md mx-auto">
                <p className="text-white/50 text-sm mb-5">
                  Informe seus dados para receber o link do briefing e acompanhar sua produção:
                </p>
                <div className="space-y-3 mb-6">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="email"
                      placeholder="Seu melhor e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg pl-11 pr-4 py-3.5 text-white text-sm placeholder:text-white/25 outline-none focus:border-brand-orange/40 transition-colors"
                      data-testid="input-email-compra"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="tel"
                      placeholder="Seu WhatsApp (com DDD)"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg pl-11 pr-4 py-3.5 text-white text-sm placeholder:text-white/25 outline-none focus:border-brand-orange/40 transition-colors"
                      data-testid="input-whatsapp-compra"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={sending || (!email && !whatsapp)}
                  className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-10 py-4 rounded-full text-[15px] font-bold transition-all duration-200 hover:brightness-110 hover:scale-[1.03] shadow-lg shadow-brand-orange/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  data-testid="button-preencher-briefing"
                >
                  {sending ? "Enviando..." : "Preencher briefing"}
                </button>

                <p className="text-white/20 text-xs mt-4">
                  Ao clicar, você será redirecionado para o briefing e receberá o link por e-mail.
                </p>
              </div>
            ) : (
              <div className="mt-10">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 max-w-md mx-auto mb-6">
                  <p className="text-white/60 text-sm">
                    Enviamos o link do briefing para o seu e-mail. Nossa equipe entrará em contato pelo WhatsApp informado.
                  </p>
                </div>

                <a
                  href="https://tally.so/r/jaBQgJ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-10 py-4 rounded-full text-[15px] font-bold transition-all duration-200 hover:brightness-110 hover:scale-[1.03] shadow-lg shadow-brand-orange/20"
                  data-testid="button-preencher-briefing-again"
                >
                  Abrir briefing novamente
                </a>
              </div>
            )}

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
