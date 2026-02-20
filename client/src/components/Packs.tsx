import { motion } from "framer-motion";
import { Package, Compass, Search } from "lucide-react";
import { Link } from "wouter";

export default function Packs() {
  const products = [
    {
      id: "packs",
      title: "Pack's de Conteúdos",
      description: "Packs prontos para manter sua presença digital com qualidade e consistência.",
      icon: Package,
      image: "/products/packs-content.png",
      href: "/produtos/packs",
    },
    {
      id: "consultoria",
      title: "Consultoria Estratégica para Empreendedores",
      description: "Clareza, direção e segurança para seu marketing digital.",
      icon: Compass,
      image: "/products/consultoria.png",
      href: "/produtos/consultoria",
    },
    {
      id: "analise",
      title: "Análise Estratégica de Instagram",
      description: "Leitura estratégica do seu perfil para destravar crescimento.",
      icon: Search,
      image: "/products/analise-instagram.png",
      href: "/produtos/analise-instagram",
    },
  ];

  return (
    <section id="packs" className="py-24 md:py-32 relative" data-testid="section-packs">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-navy via-brand-purple/10 to-brand-navy pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <span className="font-display text-brand-pink text-lg">PRODUTOS</span>
          <h2 className="font-display text-[28px] md:text-[38px] text-white mt-2 mb-4">
            Nossos Produtos
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Soluções pensadas para cada momento do seu negócio no digital.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 mt-12">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link
                href={product.href}
                className="group block relative rounded-xl overflow-hidden border border-white/[0.06] transition-all duration-300 text-left cursor-pointer bg-white/[0.03]"
                data-testid={`button-product-${product.id}`}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg text-white font-medium mb-2">{product.title}</h3>
                  <p className="text-white/50 text-sm">{product.description}</p>
                  <span className="inline-block mt-3 text-brand-orange text-sm font-medium group-hover:translate-x-1 transition-transform">
                    Saiba mais →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
