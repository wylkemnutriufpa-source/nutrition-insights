import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import { useSiteSettings, getSetting } from "@/hooks/useSiteSettings";

function Particle({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x, top: y, width: size, height: size,
        background: "radial-gradient(circle, hsl(var(--primary) / 0.3), transparent 70%)",
      }}
      animate={{
        y: [0, -30, 0],
        x: [0, 10, -10, 0],
        opacity: [0.1, 0.5, 0.1],
        scale: [1, 1.3, 1],
      }}
      transition={{ duration: 8 + delay * 0.5, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

const particles = [
  { delay: 0, x: "12%", y: "25%", size: 5 },
  { delay: 1.5, x: "82%", y: "18%", size: 4 },
  { delay: 0.8, x: "55%", y: "65%", size: 6 },
  { delay: 2.2, x: "28%", y: "78%", size: 4 },
  { delay: 1, x: "72%", y: "42%", size: 5 },
  { delay: 3, x: "90%", y: "60%", size: 3 },
  { delay: 0.5, x: "8%", y: "55%", size: 3 },
  { delay: 2.8, x: "45%", y: "15%", size: 4 },
];

const trustBadges = [
  "7 dias grátis",
  "Sem cartão de crédito",
  "Configuração em 2 minutos",
];

export default function LandingHero() {
  const { data: siteData } = useSiteSettings();
  const s = siteData?.map;

  const heroTitle = getSetting(s, "hero_title", "A plataforma de nutrição inteligente para profissionais modernos");
  const heroSubtitle = getSetting(s, "hero_subtitle", "Gerencie pacientes, crie planos alimentares com IA e acompanhe resultados em tempo real.");

  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-6 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[hsl(var(--primary)/0.06)] blur-[160px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-[hsl(210,92%,55%,0.04)] blur-[120px]" />
        <div className="particle-field" />
      </div>
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Animated Video Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="absolute -inset-16 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.12)_0%,transparent_65%)] blur-xl pointer-events-none" />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <FitJourneyLogo size="lg" />
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-shimmer">
            {heroTitle}
          </h1>
          <p className="text-white/40 text-base md:text-xl leading-relaxed max-w-2xl mx-auto">
            {heroSubtitle}
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col items-center gap-6 mt-4"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/auth">
              <Button
                size="lg"
                className="h-14 px-10 text-sm font-bold rounded-xl bg-gradient-to-r from-[hsl(152,58%,45%)] to-[hsl(170,55%,42%)] hover:opacity-90 text-white shadow-lg shadow-[hsl(152_58%_45%/0.2)] transition-all duration-300 hover:scale-[1.04] glow-pulse-border"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Criar conta gratuita
              </Button>
            </Link>
            <Link to="/demo">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-10 text-sm font-bold rounded-xl border-white/10 text-white/70 hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300"
              >
                <Play className="w-4 h-4 mr-2" />
                Explorar o sistema
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            {trustBadges.map((badge) => (
              <span key={badge} className="flex items-center gap-1.5 text-white/35 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(152,58%,45%)]" />
                {badge}
              </span>
            ))}
          </motion.div>

          {/* Login link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <Link
              to="/auth?tab=login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 hover:border-primary/50 bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white text-sm font-medium transition-all duration-300 backdrop-blur-sm shadow-sm hover:shadow-primary/10"
            >
              Já tenho conta → Entrar
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
