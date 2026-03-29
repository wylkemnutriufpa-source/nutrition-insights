import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { q: "Preciso pagar para testar?", a: "Não. O FitJourney possui teste gratuito de 14 dias com acesso completo a todas as funcionalidades." },
  { q: "Preciso instalar algo?", a: "Não. A plataforma funciona direto no navegador, em qualquer dispositivo. Seus pacientes também podem instalar como app no celular." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Sem fidelidade, sem multa. Cancele a qualquer momento pela sua conta." },
  { q: "Meus dados ficam seguros?", a: "Sim. Utilizamos infraestrutura cloud com criptografia ponta-a-ponta e conformidade com a LGPD." },
  { q: "A IA substitui o nutricionista?", a: "Jamais. A IA é uma ferramenta de apoio clínico que auxilia em análises, sugestões e automações — a decisão é sempre do profissional." },
  { q: "Quantos pacientes posso cadastrar?", a: "Depende do seu plano. O plano gratuito permite pacientes ilimitados durante o período de teste." },
];

export default function LandingFAQ() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-white mb-14"
        >
          Perguntas <span className="text-shimmer">frequentes</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm px-6 data-[state=open]:border-white/10"
              >
                <AccordionTrigger className="text-white/80 text-sm md:text-base font-medium hover:text-white hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-white/40 text-sm leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
