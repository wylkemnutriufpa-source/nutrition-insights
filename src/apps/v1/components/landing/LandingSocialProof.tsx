import { motion } from "framer-motion";
import { Star } from "lucide-react";

const stats = [
  { value: "+27", label: "ferramentas clínicas" },
  { value: "600+", label: "banco nutricional integrado" },
  { value: "IA", label: "para decisões nutricionais" },
  { value: "Gamificação", label: "para adesão do paciente" },
];

const testimonials = [
  { name: "Dra. Camila R.", text: "Reduzi meu tempo criando planos em 80%. Impressionante.", avatar: "CR" },
  { name: "Dr. Rafael M.", text: "Finalmente um sistema que integra paciente e nutricionista de verdade.", avatar: "RM" },
  { name: "Dra. Juliana S.", text: "A IA realmente ajuda nas decisões clínicas. Mudou minha rotina.", avatar: "JS" },
];

export default function LandingSocialProof() {
  return (
    <section className="py-20 md:py-28 px-6">
      <div className="max-w-6xl mx-auto space-y-20">
        {/* Stats */}
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-white mb-14"
          >
            Plataforma construída para{" "}
            <span className="text-shimmer">nutricionistas modernos</span>
          </motion.h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center group"
              >
                <p className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[hsl(152,58%,45%)] to-[hsl(210,92%,55%)] bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.value}
                </p>
                <p className="text-white/40 text-sm md:text-base">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div>
          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xl md:text-2xl font-bold text-center text-white mb-10"
          >
            Confiado por profissionais de nutrição
          </motion.h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 hover:border-white/10 transition-colors duration-300"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star key={si} className="w-4 h-4 fill-[hsl(45,93%,58%)] text-[hsl(45,93%,58%)]" />
                  ))}
                </div>
                <p className="text-white/60 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(152,58%,45%)] to-[hsl(210,92%,55%)] flex items-center justify-center text-white text-xs font-bold">
                    {t.avatar}
                  </div>
                  <span className="text-white/50 text-sm font-medium">{t.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
