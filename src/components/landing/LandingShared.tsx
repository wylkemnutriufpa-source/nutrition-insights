import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import { ReactNode } from "react";

/* ─── Animation presets ─── */
export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};
export const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ─── Floating orb (reusable BG effect) ─── */
export function FloatingOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none blur-[120px] ${className}`}
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

/* ─── Unified Nav ─── */
interface LandingNavProps {
  ctaLabel: string;
  ctaClassName: string;
  variant?: "light" | "dark";
}
export function LandingNav({ ctaLabel, ctaClassName }: LandingNavProps) {
  return (
    <nav className="relative z-50 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/[0.05]">
      <FitJourneyLogo size="sm" />
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white text-sm">
            Voltar
          </Button>
        </Link>
        <Link to="/auth">
          <Button size="sm" className={ctaClassName}>
            {ctaLabel}
          </Button>
        </Link>
      </div>
    </nav>
  );
}

/* ─── Unified hero badge ─── */
export function HeroBadge({ icon: Icon, label, colorClass }: { icon: any; label: string; colorClass: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border ${colorClass} text-sm font-medium backdrop-blur-sm`}
    >
      <Icon className="w-4 h-4" />
      {label}
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
    </motion.div>
  );
}

/* ─── Unified testimonial card ─── */
export function TestimonialCard({
  text, name, avatar, gradientClass, delay = 0,
}: {
  text: string; name: string; avatar: string; gradientClass: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="card-3d"
    >
      <div className="card-3d-inner rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-7 hover:bg-white/[0.05] transition-colors duration-300">
        <div className="flex gap-0.5 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
          ))}
        </div>
        <p className="text-white/60 text-sm leading-relaxed mb-5 italic">"{text}"</p>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
            {avatar}
          </div>
          <span className="font-semibold text-sm text-white/90">{name}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Unified feature card ─── */
export function FeatureCard({
  icon: Icon, title, desc, colorClass, bgClass, delay = 0,
}: {
  icon: any; title: string; desc: string; colorClass: string; bgClass: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group card-3d"
    >
      <div className="card-3d-inner rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-500">
        <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
        <h3 className="font-semibold text-white mb-1.5 text-base">{title}</h3>
        <p className="text-white/35 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ─── Unified step card (how it works) ─── */
export function StepCard({
  step, title, desc, gradientClass, delay = 0,
}: {
  step: string; title: string; desc: string; gradientClass: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="text-center"
    >
      <div className={`text-5xl font-black bg-gradient-to-b ${gradientClass} bg-clip-text text-transparent mb-4`}>
        {step}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-white/40 text-sm">{desc}</p>
    </motion.div>
  );
}

/* ─── Unified footer ─── */
export function LandingFooter({ label }: { label: string }) {
  return (
    <footer className="relative z-10 border-t border-white/[0.05] px-6 md:px-12 py-8 text-center">
      <p className="text-white/15 text-xs">
        © {new Date().getFullYear()} FitJourney — {label}
      </p>
    </footer>
  );
}

/* ─── Animated stat counter ─── */
export function AnimatedStat({ value, label, gradientClass }: { value: string; label: string; gradientClass: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur glow-pulse-border"
    >
      <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent mb-1`}>
        {value}
      </div>
      <div className="text-white/35 text-xs">{label}</div>
    </motion.div>
  );
}
