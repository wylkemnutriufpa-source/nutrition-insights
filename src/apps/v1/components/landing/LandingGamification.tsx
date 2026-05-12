import { motion } from "framer-motion";
import mockupGamification from "@v1/assets/mockup-gamification.jpg";
import { EnergyGlow, MockupParticles, PremiumMockupFrame, EnergyBeam } from "./LandingEffects";

export default function LandingGamification() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pacientes mais{" "}
            <span className="text-shimmer">engajados</span>
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-2xl mx-auto mb-12">
            XP, streaks e desafios tornam o acompanhamento nutricional muito mais motivador.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative max-w-3xl mx-auto"
        >
          <EnergyGlow color1="hsl(36,95%,55%)" color2="hsl(152,58%,45%)" intensity={0.08} />
          <MockupParticles color="hsla(36,95%,55%,0.4)" count={5} />
          <MockupParticles color="hsla(152,58%,45%,0.3)" count={3} />
          <EnergyBeam className="top-2 left-1/4" angle={170} color="hsl(36,95%,55%)" />
          <EnergyBeam className="bottom-4 right-1/4" angle={10} color="hsl(152,58%,45%)" />

          <PremiumMockupFrame
            gradientFrom="hsl(36,95%,55%,0.06)"
            gradientTo="hsl(152,58%,45%,0.06)"
            floatDelay={0.8}
          >
            <img
              src={mockupGamification}
              alt="Sistema de gamificação FitJourney"
              className="rounded-xl w-full relative z-10"
              loading="lazy"
              width={1280}
              height={720}
            />
          </PremiumMockupFrame>
        </motion.div>
      </div>
    </section>
  );
}
