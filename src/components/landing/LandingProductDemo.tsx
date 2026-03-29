import { motion } from "framer-motion";
import mockupDashboard from "@/assets/mockup-dashboard.jpg";
import mockupMealPlan from "@/assets/mockup-meal-plan.jpg";

export default function LandingProductDemo() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-6xl mx-auto space-y-24 md:space-y-32">
        {/* Block 1 — Dashboard */}
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Uma plataforma.{" "}
              <span className="text-shimmer">Infinitas possibilidades.</span>
            </h2>
            <p className="text-white/40 text-base md:text-lg leading-relaxed">
              Controle pacientes, planos alimentares, evolução clínica e engajamento
              em um único sistema inteligente.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="rounded-2xl bg-gradient-to-br from-[hsl(152,58%,45%,0.08)] to-[hsl(210,92%,55%,0.06)] p-2 md:p-3 border border-white/[0.06]"
          >
            <img
              src={mockupDashboard}
              alt="Dashboard FitJourney"
              className="rounded-xl w-full"
              loading="lazy"
              width={1280}
              height={800}
            />
          </motion.div>
        </div>

        {/* Block 2 — Meal Plan Editor (reversed) */}
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="rounded-2xl bg-gradient-to-br from-[hsl(210,92%,55%,0.08)] to-[hsl(152,58%,45%,0.06)] p-2 md:p-3 border border-white/[0.06] md:order-first"
          >
            <img
              src={mockupMealPlan}
              alt="Editor de Planos Alimentares"
              className="rounded-xl w-full"
              loading="lazy"
              width={1280}
              height={800}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Editor de planos{" "}
              <span className="text-shimmer">premium</span>
            </h2>
            <p className="text-white/40 text-base md:text-lg leading-relaxed">
              Monte planos alimentares em minutos com grade semanal visual, controle de macros
              em tempo real e geração automática via Motor FitJourney™.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
