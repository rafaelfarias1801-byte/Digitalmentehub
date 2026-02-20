import { motion } from "framer-motion";
import { faqs } from "../data/faqs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  return (
    <section className="py-24 md:py-32 bg-brand-navy relative" data-testid="section-faq">
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-white font-navycula mb-4">
            Perguntas Frequentes
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-5 data-[state=open]:border-brand-orange/20"
              >
                <AccordionTrigger className="text-white font-navycula text-left text-sm md:text-base py-4 hover:no-underline hover:text-brand-orange transition-colors [&[data-state=open]]:text-brand-orange">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-white/55 font-navycula text-sm leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
