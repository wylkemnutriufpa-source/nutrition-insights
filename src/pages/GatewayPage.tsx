import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, Stethoscope, DollarSign, ArrowRight, Sparkles, Brain,
  Zap, BarChart3, Dumbbell,
} from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import { Button } from "@/components/ui/button";
import { useSiteSettings, getSetting } from "@/hooks/useSiteSettings";

/* ─── Subtle floating particles (enhanced) ─── */
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

/* ─── Card data ─── */
const cardMeta = [
  { icon: Stethoscope, gradient: "from-violet-500 to-purple-600", to: "/landing", settingPrefix: "gateway_card_profissional" },
  { icon: Users, gradient: "from-emerald-500 to-teal-600", to: "/landing-paciente", settingPrefix: "gateway_card_paciente" },
  { icon: Dumbbell, gradient: "from-orange-500 to-red-600", to: "/landing-personal", settingPrefix: "gateway_card_personal" },
  { icon: DollarSign, gradient: "from-amber-500 to-orange-600", to: "/landing-afiliado", settingPrefix: "gateway_card_afiliado" },
];

const defaultCards: Record<string, { title: string; desc: string; cta: string }> = {
  gateway_card_profissional: { title: "Nutricionista", desc: "Gerencie pacientes, protocolos e inteligência clínica.", cta: "Entrar como nutricionista" },
  gateway_card_paciente: { title: "Paciente", desc: "Acompanhe sua evolução e siga seu plano.", cta: "Começar minha jornada" },
  gateway_card_personal: { title: "Personal Trainer", desc: "Monte treinos e acompanhe evolução de performance.", cta: "Entrar como personal" },
  gateway_card_afiliado: { title: "Afiliado", desc: "Indique o FitJourney e ganhe comissões.", cta: "Quero indicar e ganhar" },
};

const pillars = [
  { icon: Brain, title: "Inteligência clínica real", desc: "Motor de análise que identifica padrões de adesão, alerta sobre riscos e sugere intervenções em tempo real." },
  { icon: Zap, title: "Ações instantâneas", desc: "Sem travamentos. Navegação fluida, resposta imediata e decisões clínicas a um clique de distância." },
  { icon: BarChart3, title: "Evolução visual e motivacional", desc: "Dashboards, gamificação e métricas que engajam pacientes e trazem clareza para profissionais." },
];

/* ─── Role card with 3D tilt ─── */
function RoleCard({
  card, title, desc, cta, hovered, onHover, onLeave,
}: {
  card: typeof cardMeta[0]; title: string; desc: string; cta: string;
  hovered: boolean; onHover: () => void; onLeave: () => void;
}) {
  return (
    <Link
      to={card.to}
      className="group relative block card-3d"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
    >
      <motion.div
        className="card-3d-inner relative rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5 hover:bg-white/[0.06] transition-all duration-300 h-full overflow-hidden"
        whileHover={{ scale: 1.04, y: -3 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
      >
        {/* Shimmer sweep on hover */}
        {hovered && (
          <>
            <motion.div
              className="absolute -inset-px rounded-2xl pointer-events-none"
              style={{ boxShadow: `0 0 25px -4px hsl(var(--primary) / 0.35)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(110deg, transparent 30%, hsl(var(--primary) / 0.06) 45%, hsl(var(--primary) / 0.1) 50%, hsl(var(--primary) / 0.06) 55%, transparent 70%)",
                backgroundSize: "200% 100%",
              }}
              animate={{ backgroundPosition: ["200% center", "-200% center"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </>
        )}

        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform duration-300 shadow-lg group-hover:shadow-xl`}>
          <card.icon className="w-5.5 h-5.5 text-white" />
        </div>
        <h2 className="text-base font-bold text-white mb-1.5">{title}</h2>
        <p className="text-white/35 text-xs leading-relaxed mb-3.5 line-clamp-2">{desc}</p>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary/80 group-hover:text-primary transition-colors">
          {cta}
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-300" />
        </div>
      </motion.div>
    </Link>
  );
}

/* ─── Main page ─── */
export default function GatewayPage() {
  const { data } = useSiteSettings();
  const map = data?.map;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const headline = getSetting(map, "gateway_headline", "A nova geração do acompanhamento nutricional inteligente");
  const subheadline = getSetting(map, "gateway_subheadline", "Uma plataforma clínica completa para profissionais e pacientes evoluírem juntos.");

  return (
    <div className="min-h-screen relative overflow-hidden mesh-gradient-bg">
      {/* Enhanced background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[hsl(var(--primary)/0.06)] blur-[160px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-[hsl(var(--accent)/0.04)] blur-[120px]" />
        <div className="particle-field" />
      </div>
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      <div className="relative z-10 flex flex-col items-center px-4">

        {/* ── Hero ── */}
        <section className="w-full max-w-5xl pt-16 md:pt-24 pb-10 md:pb-16 flex flex-col items-center gap-8">
          {/* Logo with enhanced glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex justify-center"
          >
            <div className="absolute -inset-12 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.1)_0%,transparent_65%)] blur-xl pointer-events-none" />
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <FitJourneyLogo collapsed={false} size="lg" />
            </motion.div>
          </motion.div>

          {/* Headline with shimmer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-2xl"
          >
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 text-shimmer">
              {headline}
            </h1>
            <p className="text-white/40 text-sm md:text-base leading-relaxed">{subheadline}</p>
          </motion.div>

          {/* Cards — horizontal grid with stagger */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {cardMeta.map((card, i) => {
              const defaults = defaultCards[card.settingPrefix as keyof typeof defaultCards];
              const title = getSetting(map, `${card.settingPrefix}_title`, defaults.title);
              const desc = getSetting(map, `${card.settingPrefix}_desc`, defaults.desc);
              const cta = getSetting(map, `${card.settingPrefix}_cta`, defaults.cta);

              return (
                <motion.div
                  key={card.settingPrefix}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  <RoleCard
                    card={card}
                    title={title}
                    desc={desc}
                    cta={cta}
                    hovered={hoveredIdx === i}
                    onHover={() => setHoveredIdx(i)}
                    onLeave={() => setHoveredIdx(null)}
                  />
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── "Por que é diferente?" ── */}
        <section className="w-full max-w-4xl py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-12"
          >
            <h2 className="text-xl md:text-3xl font-bold text-white mb-3">
              Por que o FitJourney é{" "}
              <span className="text-shimmer">diferente?</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {pillars.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="group card-3d"
              >
                <div className="card-3d-inner rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--primary)/0.16)] group-hover:scale-110 transition-all duration-300">
                    <pillar.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2">{pillar.title}</h3>
                  <p className="text-white/30 text-xs leading-relaxed">{pillar.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center pb-16"
        >
          <Link to="/auth">
            <Button
              size="lg"
              className="h-14 px-12 text-sm font-bold rounded-xl bg-gradient-to-r from-[hsl(152,58%,45%)] to-[hsl(170,55%,42%)] hover:opacity-90 text-white shadow-lg shadow-[hsl(152_58%_45%/0.2)] transition-all duration-300 hover:scale-[1.04] glow-pulse-border"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Entrar no FitJourney
            </Button>
          </Link>
        </motion.div>

        <p className="text-white/10 text-xs pb-8 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Powered by FitJourney
        </p>
      </div>
    </div>
  );
}
