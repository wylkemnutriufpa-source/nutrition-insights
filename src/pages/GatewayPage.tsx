import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, Stethoscope, Award, ArrowRight, Sparkles } from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";

const roles = [
  {
    title: "Sou Paciente",
    subtitle: "Quero transformar minha saúde com acompanhamento inteligente",
    icon: Users,
    to: "/para-pacientes",
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/30",
    delay: 0.2,
  },
  {
    title: "Sou Profissional",
    subtitle: "Quero escalar minha clínica com inteligência artificial",
    icon: Stethoscope,
    to: "/landing",
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/30",
    delay: 0.4,
  },
  {
    title: "Quero ser Embaixador",
    subtitle: "Quero ganhar comissões indicando o FitJourney",
    icon: Award,
    to: "/para-embaixadores",
    gradient: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/30",
    delay: 0.6,
  },
];

export default function GatewayPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] relative overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Animated orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full bg-amber-500/5 blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-8"
      >
        <FitJourneyLogo collapsed={false} size="lg" />
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="text-center mb-12 max-w-2xl"
      >
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
          A plataforma que transforma{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            nutrição em resultados
          </span>
        </h1>
        <p className="text-white/50 text-base md:text-lg">
          Escolha seu perfil para descobrir como o FitJourney pode transformar sua jornada.
        </p>
      </motion.div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {roles.map((role) => (
          <motion.div
            key={role.title}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: role.delay }}
          >
            <Link
              to={role.to}
              className={`group relative block rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 
                hover:border-white/20 hover:bg-white/[0.06] transition-all duration-500 
                hover:shadow-2xl hover:${role.glow} hover:-translate-y-2`}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-6 
                group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <role.icon className="w-7 h-7 text-white" />
              </div>

              {/* Text */}
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-white/90">
                {role.title}
              </h2>
              <p className="text-white/40 text-sm leading-relaxed mb-6">
                {role.subtitle}
              </p>

              {/* CTA */}
              <div className={`flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${role.gradient} bg-clip-text text-transparent`}>
                Explorar
                <ArrowRight className="w-4 h-4 text-white/60 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Shimmer effect */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 shimmer-sweep" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-white/20 text-xs mt-16 flex items-center gap-1"
      >
        <Sparkles className="w-3 h-3" /> Powered by FitJourney — Nutrição Inteligente
      </motion.p>
    </div>
  );
}
