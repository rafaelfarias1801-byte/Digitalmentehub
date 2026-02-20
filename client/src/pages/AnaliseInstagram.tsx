import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { Check, FileText, Clock } from "lucide-react";

export default function AnaliseInstagram() {
  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />
      <div className="pt-24 pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <span className="font-display text-brand-pink text-lg">PRODUTOS</span>
              <h2 className="font-display text-[38px] text-white mt-2 mb-4">
                Análise Estratégica de Instagram
              </h2>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 md:p-10">
              <p className="text-white/70 leading-relaxed mb-8">
                Uma leitura estratégica do seu perfil para identificar o que está travando seu crescimento e o que precisa ser ajustado para gerar mais clareza, posicionamento e resultado.
              </p>

              <h4 className="text-brand-orange text-lg font-medium mb-4">O que analisamos</h4>
              <div className="space-y-4 mb-8">
                {[
                  { title: "Bio e nome do perfil", desc: "Clareza de proposta, posicionamento e leitura rápida para novos visitantes." },
                  { title: "Foto de perfil e identidade visual", desc: "Coerência com a marca e percepção profissional." },
                  { title: "Conteúdo publicado", desc: "Tipos de post, consistência, narrativa e alinhamento com o objetivo do perfil." },
                  { title: "Engajamento e comportamento do público", desc: "O que gera resposta real e o que passa despercebido." },
                  { title: "Pontos de melhoria imediatos", desc: "Ajustes simples que destravam percepção e crescimento." },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-white text-sm font-medium">{item.title}</p>
                    <p className="text-white/50 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>

              <h4 className="text-brand-orange text-lg font-medium mb-4">Entregáveis</h4>
              <ul className="space-y-2 mb-4">
                {[
                  "Análise estratégica do perfil",
                  "Relatório com diagnóstico claro e direto",
                  "Lista de ajustes prioritários (o que mudar agora)",
                  "Recomendações práticas de conteúdo e posicionamento",
                  "Direcionamento de próximos passos (sem promessa vazia)",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
                    <span className="text-white/60 text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="text-white/50 text-sm space-y-1 mb-8">
                <p className="flex items-center gap-2"><FileText className="w-4 h-4" /> Entrega em PDF ou documento digital</p>
                <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> Prazo médio: 3 a 5 dias úteis</p>
              </div>

              <div className="bg-brand-orange/[0.08] border border-brand-orange/20 rounded-lg p-5 mb-8">
                <p className="text-brand-orange text-xl font-medium">Investimento: R$397,00</p>
              </div>

              <p className="text-white/50 text-sm mb-2">
                Ideal para quem quer entender onde está errando antes de investir mais em conteúdo ou tráfego.
              </p>
              <p className="text-white/50 text-sm italic mb-8">
                Antes de postar mais, é preciso entender melhor.
              </p>

              <a
                href={`https://wa.me/5541987907321?text=${encodeURIComponent(
                  "Olá! Tenho interesse na Análise Estratégica de Instagram. Pode me contar mais?"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-8 py-3 rounded-full text-sm font-medium transition-all"
                data-testid="button-analise-whatsapp"
              >
                <FaWhatsapp className="text-lg" />
                Quero a análise estratégica
              </a>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
