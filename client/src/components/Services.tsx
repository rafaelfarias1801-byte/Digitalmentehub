import { motion } from "framer-motion";
import { services } from "../data/services";

export default function Services() {
  return (
    <section id="servicos" className="pt-8 md:pt-10 pb-16 md:pb-20 bg-brand-pink relative scroll-mt-16" data-testid="section-services">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-5"
        >
          <h2 className="text-[38px] text-white mb-2 font-display">Nossos Serviços</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group border border-white/[0.06] rounded-lg p-5 hover:border-brand-orange/25 transition-all duration-300 bg-[#1e2059]"
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
