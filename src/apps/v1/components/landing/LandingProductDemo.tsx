import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Play, Stethoscope, User } from "lucide-react";
import screenshotDashboard from "@/assets/screenshot-dashboard.jpg";
import screenshotMealPlan from "@/assets/screenshot-mealplan.jpg";
import { EnergyGlow, MockupParticles, PremiumMockupFrame, EnergyBeam } from "./LandingEffects";

export default function LandingProductDemo() {
  return (
    <section className="py-24 md:py-32 px-6">
      <div className="max-w-6xl mx-auto space-y-24 md:space-y-32">

        {/* ── Demo Showcase CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center space-y-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Conheça o sistema{" "}
            <span className="text-shimmer">por dentro</span>
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-2xl mx-auto">
            Explore nossa apresentação interativa e veja como o FitJourney funciona
            para profissionais e pacientes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/demo">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-white font-semibold text-lg transition-all hover:border-primary/60 hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm text-primary/80 font-medium">Para Profissionais</div>
                  <div className="flex items-center gap-2">
                    Ver Demo <Play className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </motion.button>
            </Link>
            <Link to="/demo">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-accent/20 to-success/20 border border-accent/30 text-white font-semibold text-lg transition-all hover:border-accent/60 hover:shadow-[0_0_30px_hsl(var(--accent)/0.3)]"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <div className="text-sm text-accent/80 font-medium">Para Pacientes</div>
                  <div className="flex items-center gap-2">
                    Ver Demo <Play className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </motion.button>
            </Link>
          </div>
        </motion.div>

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
            className="relative"
          >
            <EnergyGlow />
            <MockupParticles />
            <EnergyBeam className="top-0 right-8" angle={160} />
            <EnergyBeam className="bottom-4 left-12" angle={20} color="hsl(210,92%,55%)" />
            <PremiumMockupFrame>
              <img
                src={screenshotDashboard}
                alt="Dashboard FitJourney"
                className="rounded-xl w-full relative z-10"
                loading="lazy"
                width={1280}
                height={800}
              />
            </PremiumMockupFrame>
          </motion.div>
        </div>

        {/* Block 2 — Meal Plan Editor */}
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative md:order-first"
          >
            <EnergyGlow color1="hsl(210,92%,55%)" color2="hsl(152,58%,45%)" />
            <MockupParticles color="hsla(210,92%,55%,0.5)" />
            <EnergyBeam className="top-4 left-8" angle={140} color="hsl(210,92%,55%)" />
            <PremiumMockupFrame
              gradientFrom="hsl(210,92%,55%,0.08)"
              gradientTo="hsl(152,58%,45%,0.06)"
              floatDelay={1.5}
            >
              <img
                src={screenshotMealPlan}
                alt="Editor de Planos Alimentares"
                className="rounded-xl w-full relative z-10"
                loading="lazy"
                width={1280}
                height={800}
              />
            </PremiumMockupFrame>
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
