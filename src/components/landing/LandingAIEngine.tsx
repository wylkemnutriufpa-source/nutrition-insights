import { motion } from "framer-motion";
import { Brain, TrendingUp, Zap, BarChart3 } from "lucide-react";
import mockupAiBrain from "@/assets/mockup-ai-brain.jpg";
import { MockupParticles, EnergyBeam } from "./LandingEffects";

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
          {/* Multi-layered AI aura */}
          <motion.div
            className="absolute -inset-10 md:-inset-16 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsla(152,58%,45%,0.12) 0%, hsla(36,95%,55%,0.06) 40%, transparent 70%)",
              filter: "blur(50px)",
            }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Secondary golden ring */}
          <motion.div
            className="absolute -inset-4 md:-inset-6 rounded-2xl pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 30% 30%, hsla(36,95%,55%,0.08), transparent 60%)",
              filter: "blur(20px)",
            }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1, ease: "easeInOut" }}
          />

          <MockupParticles color="hsla(152,58%,45%,0.6)" count={8} />
          <MockupParticles color="hsla(36,95%,55%,0.4)" count={4} />

          <EnergyBeam className="top-0 left-1/2" angle={180} color="hsl(152,58%,45%)" />
          <EnergyBeam className="bottom-0 right-8" angle={0} color="hsl(36,95%,55%)" />
          <EnergyBeam className="top-1/3 right-0" angle={90} color="hsl(152,58%,45%)" />

          {/* Floating mockup with glass frame */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Glass border */}
            <div
              className="absolute -inset-px rounded-2xl pointer-events-none z-20"
              style={{
                background: "linear-gradient(135deg, hsla(152,58%,45%,0.25), transparent 40%, hsla(36,95%,55%,0.2))",
                filter: "blur(0.5px)",
              }}
            />
            <div
              className="relative rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{
                boxShadow: "0 0 60px -15px hsla(152,58%,45%,0.2), 0 0 30px -10px hsla(36,95%,55%,0.1), 0 8px 32px -8px hsla(0,0%,0%,0.4)",
              }}
            >
              {/* Pulse overlay */}
              <motion.div
                className="absolute inset-0 pointer-events-none z-20 rounded-2xl"
                style={{
                  background: "radial-gradient(circle at 50% 50%, hsla(152,58%,45%,0.06), transparent 60%)",
                }}
                animate={{ opacity: [0, 0.8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <img
                src={mockupAiBrain}
                alt="Motor de Inteligência FitJourney"
                className="rounded-2xl w-full relative z-10"
                loading="lazy"
                width={1024}
                height={768}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
