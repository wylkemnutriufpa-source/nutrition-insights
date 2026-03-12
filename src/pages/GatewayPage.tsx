import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, Stethoscope, DollarSign, ArrowRight, Sparkles, Brain,
  Trophy, BotMessageSquare, Crown, Zap, ShieldCheck, HeartPulse, TrendingUp,
} from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import { Button } from "@/components/ui/button";
import { useSiteSettings, getSetting } from "@/hooks/useSiteSettings";

/* ─── Floating particle ─── */
function Particle({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x, top: y, width: size, height: size,
        background: "radial-gradient(circle, hsl(152 58% 50% / 0.35), transparent 70%)",
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
  { icon: Trophy, title: "Gamificação real de adesão", description: "XP, streaks, medalhas, rankings e conquistas que transformam a rotina nutricional em uma experiência viciante." },
  { icon: BotMessageSquare, title: "Automação completa de acompanhamento", description: "Regras inteligentes que disparam lembretes, alertas de risco e ações automáticas para cada paciente." },
  { icon: Crown, title: "Experiência premium para pacientes", description: "Interface de app moderno com checklist diário, análise de refeições por IA, receitas e plano alimentar interativo." },
];

const cardMeta = [
  { icon: Stethoscope, gradient: "from-violet-500 to-purple-600", glowColor: "hsl(263 70% 55% / 0.25)", borderHover: "hover:border-violet-500/40", to: "/landing", delay: 0.2, settingPrefix: "gateway_card_profissional" },
  { icon: Users, gradient: "from-emerald-500 to-teal-600", glowColor: "hsl(152 58% 50% / 0.25)", borderHover: "hover:border-emerald-500/40", to: "/landing-paciente", delay: 0.4, settingPrefix: "gateway_card_paciente" },
  { icon: DollarSign, gradient: "from-amber-500 to-orange-600", glowColor: "hsl(38 92% 55% / 0.25)", borderHover: "hover:border-amber-500/40", to: "/landing-afiliado", delay: 0.6, settingPrefix: "gateway_card_afiliado" },
];

const defaultCards = {
  gateway_card_profissional: { title: "Sou Profissional", desc: "Gerencie pacientes, protocolos, planos alimentares e inteligência clínica em um único painel.", cta: "Entrar como profissional" },
  gateway_card_paciente: { title: "Sou Paciente", desc: "Acompanhe sua evolução, ganhe pontos, siga seu plano alimentar e transforme seus resultados com tecnologia.", cta: "Começar minha jornada" },
  gateway_card_afiliado: { title: "Sou Afiliado / Indicação", desc: "Indique o FitJourney e ganhe comissões recorrentes ajudando pessoas a transformarem suas vidas.", cta: "Quero indicar e ganhar" },
};

export default function GatewayPage() {
  const { data } = useSiteSettings();
  const map = data?.map;

  const headline = getSetting(map, "gateway_headline", "A nova geração do acompanhamento nutricional inteligente.");
  const subheadline = getSetting(map, "gateway_subheadline", "Escolha como deseja entrar no ecossistema FitJourney.");
  const stats: { label: string; value: string }[] = getSetting(map, "gateway_stats", defaultStats);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#060a10]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#071a12] via-[#060a10] to-[#0a1128]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-emerald-600/[0.07] blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[500px] rounded-full bg-blue-700/[0.06] blur-[120px]" />
      </div>
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      <div className="relative z-10 flex flex-col items-center px-4 py-12 md:py-20">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mb-10">
          <FitJourneyLogo collapsed={false} size="lg" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-center max-w-3xl mb-14">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              {headline}
            </span>
          </h1>
          <p className="text-white/50 text-base md:text-lg lg:text-xl max-w-2xl mx-auto">{subheadline}</p>
        </motion.div>

        {/* 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl w-full mb-24">
          {cardMeta.map((card) => {
            const defaults = defaultCards[card.settingPrefix as keyof typeof defaultCards];
            const title = getSetting(map, `${card.settingPrefix}_title`, defaults.title);
            const desc = getSetting(map, `${card.settingPrefix}_desc`, defaults.desc);
            const cta = getSetting(map, `${card.settingPrefix}_cta`, defaults.cta);

            return (
              <motion.div key={card.settingPrefix} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: card.delay }}>
                <Link
                  to={card.to}
                  className={`group relative flex flex-col h-full rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl p-8 lg:p-10 ${card.borderHover} hover:bg-white/[0.05] transition-all duration-500 hover:shadow-2xl hover:-translate-y-2`}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px -15px ${card.glowColor}`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 transparent`; }}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <card.icon className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
                  <p className="text-white/40 text-sm leading-relaxed mb-8 flex-1">{desc}</p>
                  <div className={`flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                    {cta}
                    <ArrowRight className="w-4 h-4 text-white/50 group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 shimmer-sweep" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Pillars */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="w-full max-w-6xl mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Por que o FitJourney é <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">diferente?</span>
            </h2>
            <p className="text-white/40 text-sm md:text-base max-w-xl mx-auto">Tecnologia de ponta unida à ciência da nutrição para resultados reais.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((pillar, i) => (
              <motion.div key={pillar.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.12 }}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur p-6 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <pillar.icon className="w-6 h-6 text-emerald-400" />
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
                <Icon className="w-5 h-5 text-emerald-400 mb-2" />
                <span className="text-2xl font-bold text-white">{stat.value}</span>
                <span className="text-white/35 text-xs mt-1">{stat.label}</span>
              </div>
            );
          })}
        </motion.div>

        {/* Final CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <Link to="/auth">
            <Button size="lg" className="h-14 px-10 text-base font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-xl shadow-emerald-600/20 hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-105">
              <Sparkles className="w-5 h-5 mr-2" />
              Entrar no ecossistema FitJourney agora
            </Button>
          </Link>
        </motion.div>

        <p className="text-white/15 text-xs flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Powered by FitJourney — Nutrição Inteligente
        </p>
      </div>
    </div>
  );
}
