import { motion } from "framer-motion";
import { services } from "../data/services";

export default function Services() {
  return (
    <section id="servicos" className="py-24 md:py-32 bg-brand-navy relative" data-testid="section-services">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-navy via-brand-dark/20 to-brand-navy pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-white mb-4 font-bold">
            Serviços
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 hover:border-brand-orange/25 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-md bg-brand-purple/15 flex items-center justify-center mb-4 group-hover:bg-brand-orange/15 transition-colors">
                <service.icon className="w-5 h-5 text-brand-blue group-hover:text-brand-orange transition-colors" />
              </div>
              <h3 className="text-base text-white mb-2 font-semibold">{service.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
