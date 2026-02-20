import { motion } from "framer-motion";
import diamondBg from "@/assets/images/diamond-bg.png";

export default function About() {
  return (
    <section id="sobre" className="relative overflow-hidden" data-testid="section-about">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${diamondBg})` }}
      />
      <div className="absolute inset-0 bg-brand-pink/85" />

      <div className="relative py-24 md:py-32 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white mb-8">
            Quem somos
          </h2>

          <p className="text-white text-lg md:text-xl leading-relaxed">
            Nós nascemos da vontade sincera de transformar o digital em algo que fizesse sentido de verdade.
            {" "}Não só para marcas, mas para pessoas.
          </p>

          <p className="text-white text-lg md:text-xl leading-relaxed">
            Nós trabalhamos com marcas e pessoas que querem crescer com consciência. Que sabem que presença digital exige estratégia, mas também exige verdade.
          </p>

          <p className="text-white text-lg md:text-xl leading-relaxed">
            A DIG funciona como um hub estratégico. Conectamos especialistas e parceiros de marketing e comunicação que compartilham da mesma visão: criar soluções inteligentes, humanas e sob medida. Cada projeto é único porque cada história é única.
          </p>

          <p className="text-white text-lg md:text-xl leading-relaxed">
            Exploramos possibilidades, testamos caminhos e ajustamos rotas sempre que necessário. A gente pensa antes de postar, sente antes de decidir e constrói antes de escalar. Com leveza, clareza e responsabilidade.
          </p>

          <p className="text-white text-lg md:text-xl leading-relaxed">
            Nós não existimos para ocupar espaço no digital.
            <br />
            Existimos para ajudar marcas e pessoas a ocuparem o seu lugar.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
