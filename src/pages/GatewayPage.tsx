import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, Stethoscope, DollarSign, ArrowRight, Sparkles, Brain,
  Trophy, BotMessageSquare, Crown, Zap, ShieldCheck, HeartPulse, TrendingUp, Dumbbell,
} from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import { Button } from "@/components/ui/button";
import { useSiteSettings, getSetting } from "@/hooks/useSiteSettings";
import { useIsMobile } from "@/hooks/use-mobile";

/* ─── Floating particle ─── */
function Particle({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x, top: y, width: size, height: size,
        background: "radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 70%)",
      }}
      animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
      transition={{ duration: 5 + delay, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

const particles = [
  { delay: 0, x: "10%", y: "20%", size: 6 }, { delay: 1.2, x: "85%", y: "15%", size: 4 },
  { delay: 0.5, x: "50%", y: "70%", size: 5 }, { delay: 2, x: "25%", y: "80%", size: 3 },
  { delay: 0.8, x: "70%", y: "45%", size: 7 }, { delay: 1.5, x: "90%", y: "75%", size: 4 },
  { delay: 0.3, x: "15%", y: "55%", size: 5 }, { delay: 2.5, x: "60%", y: "25%", size: 3 },
  { delay: 1, x: "40%", y: "90%", size: 6 }, { delay: 1.8, x: "78%", y: "88%", size: 4 },
];

const defaultStats = [
  { label: "Pacientes ativos", value: "2.500+" },
  { label: "Planos gerados por IA", value: "12.000+" },
  { label: "Profissionais", value: "350+" },
  { label: "Taxa de adesão", value: "87%" },
];

const statIcons = [HeartPulse, Zap, ShieldCheck, TrendingUp];

const pillars = [
  { icon: Brain, title: "Inteligência clínica determinística", description: "Motor de regras que analisa adesão, check-ins e evolução para gerar alertas e insights em tempo real — sem depender de LLMs." },
  { icon: Trophy, title: "Gamificação real de adesão", description: "XP, streaks, medalhas, rankings e conquistas que transformam a rotina nutricional e de treinos em uma experiência viciante." },
  { icon: BotMessageSquare, title: "Automação completa de acompanhamento", description: "Regras inteligentes que disparam lembretes, alertas de risco e ações automáticas para cada paciente e aluno." },
  { icon: Crown, title: "Experiência premium para pacientes", description: "Interface de app moderno com checklist diário, análise de refeições por IA, treinos interativos e plano alimentar." },
];

const cardMeta = [
  { icon: Stethoscope, gradient: "from-violet-500 to-purple-600", glowHsl: "263 70% 55%", borderHover: "hover:border-violet-500/40", to: "/landing", delay: 0.15, settingPrefix: "gateway_card_profissional", angle: -45 },
  { icon: Dumbbell, gradient: "from-orange-500 to-red-600", glowHsl: "20 90% 55%", borderHover: "hover:border-orange-500/40", to: "/landing-personal", delay: 0.3, settingPrefix: "gateway_card_personal", angle: 45 },
  { icon: Users, gradient: "from-emerald-500 to-teal-600", glowHsl: "152 58% 50%", borderHover: "hover:border-emerald-500/40", to: "/landing-paciente", delay: 0.45, settingPrefix: "gateway_card_paciente", angle: 135 },
  { icon: DollarSign, gradient: "from-amber-500 to-orange-600", glowHsl: "38 92% 55%", borderHover: "hover:border-amber-500/40", to: "/landing-afiliado", delay: 0.6, settingPrefix: "gateway_card_afiliado", angle: 225 },
];

const defaultCards: Record<string, { title: string; desc: string; cta: string }> = {
  gateway_card_profissional: { title: "Sou Nutricionista", desc: "Gerencie pacientes, protocolos, planos alimentares e inteligência clínica.", cta: "Entrar como nutricionista" },
  gateway_card_personal: { title: "Sou Personal Trainer", desc: "Monte treinos, acompanhe alunos e monitore evolução de performance.", cta: "Entrar como personal" },
  gateway_card_paciente: { title: "Sou Paciente", desc: "Acompanhe sua evolução, siga seu plano alimentar e de treinos.", cta: "Começar minha jornada" },
  gateway_card_afiliado: { title: "Sou Afiliado", desc: "Indique o FitJourney e ganhe comissões recorrentes.", cta: "Quero indicar e ganhar" },
};

/* ─── Orbital ring decorations ─── */
function OrbitalRings() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[280, 340].map((r, i) => (
        <motion.div
          key={r}
          className="absolute rounded-full border"
          style={{
            width: r * 2, height: r * 2,
            left: `calc(50% - ${r}px)`, top: `calc(50% - ${r}px)`,
            borderColor: `hsl(var(--primary) / ${0.06 - i * 0.02})`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 90 + i * 30, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

/* ─── Central hub ─── */
function CentralHub({ headline, subheadline }: { headline: string; subheadline: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.1 }}
      className="relative z-10 flex flex-col items-center text-center"
    >
      {/* Premium glow behind logo */}
      <div className="absolute -inset-8 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.12)_0%,transparent_70%)] blur-2xl" />

      <div className="relative mb-5">
        <FitJourneyLogo collapsed={false} size="lg" />
        <motion.div
          className="absolute -inset-4 rounded-full"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.08), transparent 70%)" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-3 max-w-lg">
        <span className="bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(170,60%,45%)] to-[hsl(190,70%,50%)] bg-clip-text text-transparent">
          {headline}
        </span>
      </h1>
      <p className="text-white/50 text-sm md:text-base max-w-md">{subheadline}</p>
    </motion.div>
  );
}

/* ─── Role card ─── */
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
        className={`relative rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl p-5 lg:p-6 ${card.borderHover} hover:bg-white/[0.05] transition-colors duration-300`}
        whileHover={{ scale: 1.04, y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Hover glow */}
        {hovered && (
          <motion.div
            className="absolute -inset-px rounded-2xl pointer-events-none"
            style={{ boxShadow: `0 0 30px -5px hsl(${card.glowHsl} / 0.35), inset 0 0 20px -10px hsl(${card.glowHsl} / 0.1)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}

        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
          <card.icon className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1.5">{title}</h2>
        <p className="text-white/40 text-xs leading-relaxed mb-4 line-clamp-2">{desc}</p>
        <div className={`flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
          {cta}
          <ArrowRight className="w-3.5 h-3.5 text-white/50 group-hover:translate-x-1.5 transition-transform duration-300" />
        </div>
      </motion.div>
    </Link>
  );
}

/* ─── Desktop orbital layout ─── */
function OrbitalHero({
  cardMetas, map, hoveredIdx, setHoveredIdx,
}: {
  cardMetas: typeof cardMeta; map: any; hoveredIdx: number | null; setHoveredIdx: (i: number | null) => void;
}) {
  const radius = 260;

  return (
    <div className="relative w-[620px] h-[620px] mx-auto">
      <OrbitalRings />

      {/* Cards positioned around center */}
      {cardMetas.map((card, i) => {
        const defaults = defaultCards[card.settingPrefix as keyof typeof defaultCards];
        const title = getSetting(map, `${card.settingPrefix}_title`, defaults.title);
        const desc = getSetting(map, `${card.settingPrefix}_desc`, defaults.desc);
        const cta = getSetting(map, `${card.settingPrefix}_cta`, defaults.cta);

        const angleRad = (card.angle * Math.PI) / 180;
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        return (
          <motion.div
            key={card.settingPrefix}
            className="absolute w-[200px]"
            style={{ left: `calc(50% + ${x}px - 100px)`, top: `calc(50% + ${y}px - 70px)` }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: card.delay }}
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

/* ─── Mobile layout ─── */
function MobileHero({
  cardMetas, map, hoveredIdx, setHoveredIdx,
}: {
  cardMetas: typeof cardMeta; map: any; hoveredIdx: number | null; setHoveredIdx: (i: number | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 w-full max-w-sm mx-auto">
      {cardMetas.map((card, i) => {
        const defaults = defaultCards[card.settingPrefix as keyof typeof defaultCards];
        const title = getSetting(map, `${card.settingPrefix}_title`, defaults.title);
        const desc = getSetting(map, `${card.settingPrefix}_desc`, defaults.desc);
        const cta = getSetting(map, `${card.settingPrefix}_cta`, defaults.cta);

        return (
          <motion.div
            key={card.settingPrefix}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
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

  const headline = getSetting(map, "gateway_headline", "A plataforma completa de performance: nutrição + treino + inteligência.");
  const subheadline = getSetting(map, "gateway_subheadline", "Escolha como deseja entrar no ecossistema FitJourney.");
  const stats: { label: string; value: string }[] = getSetting(map, "gateway_stats", defaultStats);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#060a10]">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#071a12] via-[#060a10] to-[#0a1128]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-[hsl(var(--primary)/0.07)] blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[500px] rounded-full bg-[hsl(210,80%,30%/0.06)] blur-[120px]" />
      </div>
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      <div className="relative z-10 flex flex-col items-center px-4 py-12 md:py-16">

        {/* ─── Orbital Hero Section ─── */}
        <section className="w-full max-w-6xl mb-16 md:mb-24">
          {isMobile ? (
            /* Mobile: hub on top, cards stacked below */
            <div className="flex flex-col items-center gap-10">
              <CentralHub headline={headline} subheadline={subheadline} />
              <MobileHero cardMetas={cardMeta} map={map} hoveredIdx={hoveredIdx} setHoveredIdx={setHoveredIdx} />
            </div>
          ) : (
            /* Desktop: orbital composition */
            <div className="relative flex flex-col items-center">
              {/* Hub is absolutely centered inside orbital container */}
              <div className="relative w-[620px] h-[620px] mx-auto">
                {/* Central hub positioned at center */}
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="pointer-events-auto max-w-[280px]">
                    <CentralHub headline={headline} subheadline={subheadline} />
                  </div>
                </div>
                {/* Orbital cards */}
                <OrbitalHero cardMetas={cardMeta} map={map} hoveredIdx={hoveredIdx} setHoveredIdx={setHoveredIdx} />
              </div>
            </div>
          )}
        </section>

        {/* Pillars */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="w-full max-w-6xl mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Por que o FitJourney é <span className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(170,60%,45%)] bg-clip-text text-transparent">diferente?</span>
            </h2>
            <p className="text-white/40 text-sm md:text-base max-w-xl mx-auto">Tecnologia de ponta unida à ciência da nutrição para resultados reais.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((pillar, i) => (
              <motion.div key={pillar.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.12 }}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur p-6 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--primary)/0.2)] transition-colors">
                  <pillar.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{pillar.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{pillar.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="w-full max-w-4xl mb-20 grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Array.isArray(stats) ? stats : defaultStats).map((stat, i) => {
            const Icon = statIcons[i] || Zap;
            return (
              <div key={stat.label} className="flex flex-col items-center text-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <Icon className="w-5 h-5 text-primary mb-2" />
                <span className="text-2xl font-bold text-white">{stat.value}</span>
                <span className="text-white/35 text-xs mt-1">{stat.label}</span>
              </div>
            );
          })}
        </motion.div>

        {/* Final CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <Link to="/auth">
            <Button size="lg" className="h-14 px-10 text-base font-bold rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(170,60%,45%)] hover:opacity-90 text-white shadow-xl shadow-[hsl(var(--primary)/0.2)] transition-all duration-300 hover:scale-105">
              <Sparkles className="w-5 h-5 mr-2" />
              Entrar no ecossistema FitJourney agora
            </Button>
          </Link>
        </motion.div>

        <p className="text-white/15 text-xs flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Powered by FitJourney — Nutrição + Treino + Performance
        </p>
      </div>
    </div>
  );
}
