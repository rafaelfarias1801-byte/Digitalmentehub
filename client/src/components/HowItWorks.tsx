import { motion } from "framer-motion";

const steps = [
  { number: "01", title: "Diagnóstico", description: "Entendemos o momento da marca, mercado e metas." },
  { number: "02", title: "Plano", description: "Traçamos a estratégia com entregas claras e prazos." },
  { number: "03", title: "Execução", description: "O Hub entra em ação: parceiros + equipe coordenados." },
  { number: "04", title: "Otimização", description: "Métricas, ajustes e evolução contínua da presença." },
];

export default function HowItWorks() {
  return (
    <section className="py-24 md:py-32 bg-brand-navy relative" data-testid="section-howitworks">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-white mb-4">
            Como funciona
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative text-center group"
            >
              <span className="text-6xl md:text-7xl font-display text-brand-orange/15 group-hover:text-brand-orange/25 transition-colors">
                {step.number}
              </span>
              <h3 className="text-xl text-white mt-2 mb-2">{step.title}</h3>
              <p className="text-white/50 text-sm">{step.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 -right-4 w-8 border-t border-dashed border-white/10" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
