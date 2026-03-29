import { motion } from "framer-motion";
import mockupGamification from "@/assets/mockup-gamification.jpg";

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
          className="rounded-2xl bg-gradient-to-br from-[hsl(36,95%,55%,0.06)] to-[hsl(152,58%,45%,0.06)] p-2 md:p-3 border border-white/[0.06] max-w-3xl mx-auto"
        >
          <img
            src={mockupGamification}
            alt="Sistema de gamificação FitJourney"
            className="rounded-xl w-full"
            loading="lazy"
            width={1280}
            height={720}
          />
        </motion.div>
      </div>
    </section>
  );
}
