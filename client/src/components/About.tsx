import { motion } from "framer-motion";
import instagramScreen from "@assets/image_1771619575169.png";

export default function About() {
  return (
    <section id="sobre" className="relative overflow-hidden bg-brand-pink" data-testid="section-about">
      <div className="relative py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-[1fr_auto] gap-10 md:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="font-display md:text-5xl lg:text-6xl text-white mb-4 text-[40px]">
              Quem somos
            </h2>

            <p className="text-white/90 text-base md:text-lg leading-relaxed">
              Nós nascemos da vontade sincera de transformar o digital em algo que fizesse sentido de verdade.
              {" "}Não só para marcas, mas para pessoas.
            </p>

            <p className="text-white/90 text-base md:text-lg leading-relaxed">
              Nós trabalhamos com marcas e pessoas que querem crescer com consciência. Que sabem que presença digital exige estratégia, mas também exige verdade.
            </p>

            <p className="text-white/90 text-base md:text-lg leading-relaxed">
              A DIG funciona como um hub estratégico. Conectamos especialistas e parceiros de marketing e comunicação que compartilham da mesma visão: criar soluções inteligentes, humanas e sob medida. Cada projeto é único porque cada história é única.
            </p>

            <p className="text-white/90 text-base md:text-lg leading-relaxed">
              Exploramos possibilidades, testamos caminhos e ajustamos rotas sempre que necessário. A gente pensa antes de postar, sente antes de decidir e constrói antes de escalar. Com leveza, clareza e responsabilidade.
            </p>

            <p className="text-white/90 text-base md:text-lg leading-relaxed">
              Nós não existimos para ocupar espaço no digital.
              <br />
              Existimos para ajudar marcas e pessoas a ocuparem o seu lugar.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:flex justify-end"
          >
            <div className="relative w-[200px] lg:w-[220px] transform rotate-[5deg]">
              <div className="rounded-[2rem] overflow-hidden border-[5px] border-black/80 shadow-2xl shadow-black/40">
                <img
                  src={instagramScreen}
                  alt="Perfil Instagram Digitalmente"
                  className="w-full h-auto"
                  data-testid="img-about-phone"
                />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70px] h-[22px] bg-black/80 rounded-b-xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
