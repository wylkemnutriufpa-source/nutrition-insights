import { motion } from "framer-motion";
import { Brain, TrendingUp, Zap, BarChart3 } from "lucide-react";
import mockupAiBrain from "@/assets/mockup-ai-brain.jpg";

const features = [
  { icon: Brain, text: "Análise automática de adesão" },
  { icon: TrendingUp, text: "Sugestão de ajustes alimentares" },
  { icon: BarChart3, text: "Monitoramento de evolução clínica" },
  { icon: Zap, text: "Aprendizado contínuo e alertas preditivos" },
];

export default function LandingAIEngine() {
  return (
    <section className="py-28 md:py-36 px-6 bg-[hsl(240,15%,6%)]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            O cérebro do{" "}
            <span className="text-shimmer">FitJourney</span>
          </h2>
          <p className="text-white/40 text-base md:text-lg leading-relaxed mb-8">
            Nossa inteligência clínica analisa dados de pacientes e sugere decisões
            nutricionais baseadas em evolução real.
          </p>

          <ul className="space-y-4">
            {features.map((f, i) => (
              <motion.li
                key={f.text}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 text-white/60 hover:text-white/80 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm md:text-base">{f.text}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative"
        >
          <div className="absolute -inset-6 rounded-full bg-[radial-gradient(circle,hsl(152,58%,42%,0.08),transparent_60%)] blur-2xl pointer-events-none" />
          <img
            src={mockupAiBrain}
            alt="Motor de Inteligência FitJourney"
            className="rounded-2xl w-full relative z-10"
            loading="lazy"
            width={1024}
            height={768}
          />
        </motion.div>
      </div>
    </section>
  );
}
