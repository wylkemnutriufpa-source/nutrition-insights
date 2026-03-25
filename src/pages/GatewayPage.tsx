import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, Stethoscope, DollarSign, ArrowRight, Sparkles, Brain,
  Zap, BarChart3, Dumbbell,
} from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import { Button } from "@/components/ui/button";
import { useSiteSettings, getSetting } from "@/hooks/useSiteSettings";
import { useIsMobile } from "@/hooks/use-mobile";

/* ─── Subtle floating particles ─── */
function Particle({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x, top: y, width: size, height: size,
        background: "radial-gradient(circle, hsl(152 58% 50% / 0.25), transparent 70%)",
      }}
      animate={{ y: [0, -20, 0], opacity: [0.15, 0.4, 0.15] }}
      transition={{ duration: 6 + delay * 0.5, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

const particles = [
  { delay: 0, x: "12%", y: "25%", size: 4 },
  { delay: 1.5, x: "82%", y: "18%", size: 3 },
  { delay: 0.8, x: "55%", y: "65%", size: 5 },
  { delay: 2.2, x: "28%", y: "78%", size: 3 },
  { delay: 1, x: "72%", y: "42%", size: 4 },
  { delay: 2.8, x: "88%", y: "72%", size: 3 },
  { delay: 0.4, x: "18%", y: "52%", size: 4 },
];

/* ─── Card data ─── */
const cardMeta = [
  {
    icon: Stethoscope,
    gradient: "from-violet-500 to-purple-600",
    glowColor: "152, 58%, 50%",
    to: "/landing",
    settingPrefix: "gateway_card_profissional",
    angle: -60, // top-left
  },
  {
    icon: Dumbbell,
    gradient: "from-orange-500 to-red-600",
    glowColor: "20, 90%, 55%",
    to: "/landing-personal",
    settingPrefix: "gateway_card_personal",
    angle: 30, // top-right
  },
  {
    icon: Users,
    gradient: "from-emerald-500 to-teal-600",
    glowColor: "152, 58%, 50%",
    to: "/landing-paciente",
    settingPrefix: "gateway_card_paciente",
    angle: 150, // bottom-right
  },
  {
    icon: DollarSign,
    gradient: "from-amber-500 to-orange-600",
    glowColor: "38, 92%, 55%",
    to: "/landing-afiliado",
    settingPrefix: "gateway_card_afiliado",
    angle: 240, // bottom-left
  },
];

const defaultCards: Record<string, { title: string; desc: string; cta: string }> = {
  gateway_card_profissional: { title: "Nutricionista", desc: "Gerencie pacientes, protocolos e inteligência clínica.", cta: "Entrar como nutricionista" },
  gateway_card_personal: { title: "Personal Trainer", desc: "Monte treinos e acompanhe evolução de performance.", cta: "Entrar como personal" },
  gateway_card_paciente: { title: "Paciente", desc: "Acompanhe sua evolução e siga seu plano.", cta: "Começar minha jornada" },
  gateway_card_afiliado: { title: "Afiliado", desc: "Indique o FitJourney e ganhe comissões.", cta: "Quero indicar e ganhar" },
};

const pillars = [
  {
    icon: Brain,
    title: "Inteligência clínica real",
    desc: "Motor de análise que identifica padrões de adesão, alerta sobre riscos e sugere intervenções em tempo real.",
  },
  {
    icon: Zap,
    title: "Ações instantâneas",
    desc: "Sem travamentos. Navegação fluida, resposta imediata e decisões clínicas a um clique de distância.",
  },
  {
    icon: BarChart3,
    title: "Evolução visual e motivacional",
    desc: "Dashboards, gamificação e métricas que engajam pacientes e trazem clareza para profissionais.",
  },
];

/* ─── Role card component ─── */
function RoleCard({
  card, title, desc, cta, hovered, onHover, onLeave,
}: {
  card: typeof cardMeta[0]; title: string; desc: string; cta: string;
  hovered: boolean; onHover: () => void; onLeave: () => void;
}) {
  return (
    <Link
      to={card.to}
      className="group relative block"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
    >
      <motion.div
        className="relative rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5 hover:bg-white/[0.06] transition-colors duration-300"
        whileHover={{ scale: 1.06, y: -3 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
      >
        {/* Hover glow */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute -inset-px rounded-2xl pointer-events-none"
              style={{ boxShadow: `0 0 24px -4px hsl(${card.glowColor} / 0.3)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
          <card.icon className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-base font-bold text-white mb-1">{title}</h2>
        <p className="text-white/35 text-xs leading-relaxed mb-3 line-clamp-2">{desc}</p>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary/80 group-hover:text-primary transition-colors">
          {cta}
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
        </div>
      </motion.div>
    </Link>
  );
}

/* ─── Desktop orbital layout ─── */
function OrbitalLayout({
  map, hoveredIdx, setHoveredIdx,
}: {
  map: any; hoveredIdx: number | null; setHoveredIdx: (i: number | null) => void;
}) {
  const radius = 300;
  const [rotation, setRotation] = useState(0);
  const [paused, setPaused] = useState(false);

  // Very slow auto-rotation — almost imperceptible
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setRotation(prev => prev + 0.012);
    }, 50);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div className="relative w-[720px] h-[720px] mx-auto">
      {/* Orbital rings */}
      {[280, 350].map((r, i) => (
        <div
          key={r}
          className="absolute rounded-full border pointer-events-none"
          style={{
            width: r * 2, height: r * 2,
            left: `calc(50% - ${r}px)`, top: `calc(50% - ${r}px)`,
            borderColor: `hsl(152 58% 50% / ${0.05 - i * 0.015})`,
          }}
        />
      ))}

      {/* Central glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-[radial-gradient(circle,hsl(152_58%_50%/0.06)_0%,transparent_70%)] blur-2xl pointer-events-none" />

      {/* Cards positioned around center */}
      {cardMeta.map((card, i) => {
        const defaults = defaultCards[card.settingPrefix as keyof typeof defaultCards];
        const title = getSetting(map, `${card.settingPrefix}_title`, defaults.title);
        const desc = getSetting(map, `${card.settingPrefix}_desc`, defaults.desc);
        const cta = getSetting(map, `${card.settingPrefix}_cta`, defaults.cta);

        const baseAngle = card.angle + rotation;
        const angleRad = (baseAngle * Math.PI) / 180;
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        return (
          <motion.div
            key={card.settingPrefix}
            className="absolute w-[180px]"
            style={{
              left: `calc(50% + ${x}px - 90px)`,
              top: `calc(50% + ${y}px - 65px)`,
              opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.5 : 0.85,
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.5 : 0.85, scale: 1 }}
            transition={{ duration: 0.6, delay: i * 0.12 }}
            onMouseEnter={() => { setHoveredIdx(i); setPaused(true); }}
            onMouseLeave={() => { setHoveredIdx(null); setPaused(false); }}
          >
            <RoleCard
              card={card}
              title={title}
              desc={desc}
              cta={cta}
              hovered={hoveredIdx === i}
              onHover={() => { setHoveredIdx(i); setPaused(true); }}
              onLeave={() => { setHoveredIdx(null); setPaused(false); }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Mobile card stack ─── */
function MobileCardStack({
  map, hoveredIdx, setHoveredIdx,
}: {
  map: any; hoveredIdx: number | null; setHoveredIdx: (i: number | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 w-full max-w-sm mx-auto">
      {cardMeta.map((card, i) => {
        const defaults = defaultCards[card.settingPrefix as keyof typeof defaultCards];
        const title = getSetting(map, `${card.settingPrefix}_title`, defaults.title);
        const desc = getSetting(map, `${card.settingPrefix}_desc`, defaults.desc);
        const cta = getSetting(map, `${card.settingPrefix}_cta`, defaults.cta);

        return (
          <motion.div
            key={card.settingPrefix}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
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
  );
}

/* ─── Main page ─── */
export default function GatewayPage() {
  const { data } = useSiteSettings();
  const map = data?.map;
  const isMobile = useIsMobile();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const headline = getSetting(map, "gateway_headline", "A nova geração do acompanhamento nutricional inteligente");
  const subheadline = getSetting(map, "gateway_subheadline", "Uma plataforma clínica completa para profissionais e pacientes evoluírem juntos.");

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#060a10]">
      {/* ── Background ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#061a12] via-[#060a10] to-[#0a0f1e]" />
        {/* Central glow — very subtle */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[hsl(152_58%_40%/0.05)] blur-[140px]" />
      </div>
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      <div className="relative z-10 flex flex-col items-center px-4">

        {/* ── Hero Section ── */}
        <section className="w-full max-w-6xl pt-12 md:pt-20 pb-8 md:pb-12">
          {isMobile ? (
            /* ── Mobile: stacked ── */
            <div className="flex flex-col items-center gap-8">
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7 }}
                className="relative"
              >
                <FitJourneyLogo collapsed={false} size="md" />
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="text-center"
              >
                <h1 className="text-2xl font-bold leading-tight mb-3 bg-gradient-to-r from-[hsl(152,58%,50%)] via-[hsl(170,55%,48%)] to-[hsl(40,65%,58%)] bg-clip-text text-transparent">
                  {headline}
                </h1>
                <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">{subheadline}</p>
              </motion.div>

              {/* Cards */}
              <MobileCardStack map={map} hoveredIdx={hoveredIdx} setHoveredIdx={setHoveredIdx} />
            </div>
          ) : (
            /* ── Desktop: orbital ── */
            <div className="relative flex flex-col items-center">
              {/* Center content — absolute positioned inside orbital area */}
              <div className="relative w-[720px] h-[720px] mx-auto">
                {/* Central hub */}
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <motion.div
                    className="pointer-events-auto text-center max-w-[320px]"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* Subtle glow behind logo */}
                    <div className="absolute -inset-12 rounded-full bg-[radial-gradient(circle,hsl(152_58%_45%/0.08)_0%,transparent_65%)] blur-xl pointer-events-none" />

                    <div className="relative mb-4 flex justify-center">
                      <FitJourneyLogo collapsed={false} size="lg" />
                    </div>

                    <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-3 bg-gradient-to-r from-[hsl(152,58%,50%)] via-[hsl(170,55%,48%)] to-[hsl(40,65%,58%)] bg-clip-text text-transparent">
                      {headline}
                    </h1>
                    <p className="text-white/40 text-sm leading-relaxed">{subheadline}</p>
                  </motion.div>
                </div>

                {/* Orbital cards */}
                <OrbitalLayout map={map} hoveredIdx={hoveredIdx} setHoveredIdx={setHoveredIdx} />
              </div>
            </div>
          )}
        </section>

        {/* ── "Por que é diferente?" section ── */}
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
              <span className="bg-gradient-to-r from-[hsl(152,58%,50%)] to-[hsl(170,55%,48%)] bg-clip-text text-transparent">
                diferente?
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {pillars.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-[hsl(152_58%_50%/0.08)] flex items-center justify-center mb-4 group-hover:bg-[hsl(152_58%_50%/0.14)] transition-colors duration-300">
                  <pillar.icon className="w-5 h-5 text-[hsl(152,58%,50%)]" />
                </div>
                <h3 className="text-white font-semibold text-sm mb-2">{pillar.title}</h3>
                <p className="text-white/30 text-xs leading-relaxed">{pillar.desc}</p>
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
              className="h-13 px-10 text-sm font-bold rounded-xl bg-gradient-to-r from-[hsl(152,58%,45%)] to-[hsl(170,55%,42%)] hover:opacity-90 text-white shadow-lg shadow-[hsl(152_58%_45%/0.15)] transition-all duration-300 hover:scale-[1.03]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Entrar no FitJourney
            </Button>
          </Link>
        </motion.div>

        {/* ── Footer ── */}
        <p className="text-white/10 text-xs pb-8 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Powered by FitJourney
        </p>
      </div>
    </div>
  );
}
