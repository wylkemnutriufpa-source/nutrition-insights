import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@v1/components/ui/button";
import {
  Award, DollarSign, TrendingUp, Users, Share2, ArrowRight,
  Sparkles, BarChart3, Crown, Shield
} from "lucide-react";
import { useSiteSettings, getSetting } from "@v1/hooks/useSiteSettings";
import {
  FloatingOrb, LandingNav, HeroBadge, FeatureCard,
  StepCard, LandingFooter, AnimatedStat, fadeUp, stagger,
} from "@v1/components/landing/LandingShared";

const benefits = [
  { icon: DollarSign, title: "20% na 1ª Venda", desc: "Comece ganhando 20% de comissão no primeiro pagamento de cada indicação.", color: "text-amber-400", bg: "bg-amber-500/10" },
  { icon: TrendingUp, title: "5% Recorrente", desc: "Receba 5% de comissão todo mês enquanto seu indicado for ativo.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: Share2, title: "Link Personalizado", desc: "Seu código único para compartilhar e rastrear todas as indicações.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { icon: BarChart3, title: "Dashboard Completo", desc: "Acompanhe indicações, conversões e comissões em tempo real.", color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: Crown, title: "Plano de Carreira", desc: "Quanto mais você indica, mais sobe de nível e maiores são suas comissões.", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { icon: Shield, title: "Pagamento no Mês Seguinte", desc: "Comissões verificadas e pagas no mês seguinte para máxima segurança.", color: "text-blue-400", bg: "bg-blue-500/10" },
];

const steps = [
  { step: "01", title: "Cadastre-se", desc: "Crie sua conta de embaixador e receba seu link único de indicação." },
  { step: "02", title: "Compartilhe", desc: "Envie seu link para amigos, seguidores e parceiros interessados em nutrição." },
  { step: "03", title: "Ganhe & Evolua", desc: "Receba comissões e suba de nível automaticamente conforme suas indicações crescem." },
];

const careerTiers = [
  { name: "Bronze", range: "0-19", first: "20%", recurring: "5%", badge: "🥉", color: "border-orange-600/30", level: 1 },
  { name: "Prata", range: "20-39", first: "22%", recurring: "5%", badge: "🥈", color: "border-gray-400/30", level: 2 },
  { name: "Ouro", range: "40-59", first: "24%", recurring: "5%", badge: "🥇", color: "border-yellow-500/30", level: 3 },
  { name: "Platina", range: "60-79", first: "26%", recurring: "6%", badge: "💎", color: "border-cyan-400/30", level: 4 },
  { name: "Diamante", range: "80-99", first: "28%", recurring: "6%", badge: "💠", color: "border-blue-400/30", level: 5 },
  { name: "Premium", range: "100+", first: "40%", recurring: "10%", badge: "🏆", color: "border-amber-500/50", level: 6 },
];

export default function AffiliateLanding() {
  const { data } = useSiteSettings();
  const map = data?.map;

  const heroTitle = getSetting(map, "affiliate_hero_title", "Ganhe dinheiro indicando saúde e resultados");
  const heroSubtitle = getSetting(map, "affiliate_hero_subtitle", "Indique profissionais e pacientes para o FitJourney e receba comissões recorrentes. Quanto mais você indica, mais você ganha — com plano de carreira gamificado.");
  const ctaTitle = getSetting(map, "affiliate_cta_final_title", "Pronto para ganhar?");
  const ctaSubtitle = getSetting(map, "affiliate_cta_final_subtitle", "Junte-se ao programa de embaixadores e comece a ganhar comissões hoje.");

  return (
    <div className="min-h-screen text-white overflow-hidden mesh-gradient-bg">
      {/* BG effects */}
      <div className="fixed inset-0 pointer-events-none">
        <FloatingOrb className="w-[700px] h-[700px] bg-amber-600/[0.06] top-[-200px] right-[-100px]" />
        <FloatingOrb className="w-[500px] h-[500px] bg-orange-600/[0.05] bottom-[10%] left-[-100px]" delay={2} />
        <FloatingOrb className="w-[400px] h-[400px] bg-yellow-500/[0.04] top-[50%] right-[30%]" delay={4} />
        <div className="particle-field" />
      </div>

      <LandingNav ctaLabel="Quero Ser Embaixador" ctaClassName="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20" />

      {/* Hero */}
      <section className="relative z-10 px-6 pt-20 pb-24 max-w-6xl mx-auto text-center">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} className="mb-8">
            <HeroBadge icon={Award} label="Programa de Embaixadores FitJourney" colorClass="bg-amber-500/10 border-amber-500/20 text-amber-400" />
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">{heroTitle}</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-white/45 text-lg md:text-xl max-w-2xl mx-auto mb-8">{heroSubtitle}</motion.p>

          {/* Animated stats */}
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-6 max-w-lg mx-auto mb-10">
            <AnimatedStat value="20%" label="1ª Venda (início)" gradientClass="from-amber-400 to-amber-600" />
            <AnimatedStat value="até 40%" label="1ª Venda (Premium)" gradientClass="from-emerald-400 to-emerald-600" />
            <AnimatedStat value="até 10%" label="Recorrente (Premium)" gradientClass="from-violet-400 to-violet-600" />
          </motion.div>

          <motion.div variants={fadeUp}>
            <Link to="/v1/auth">
              <Button size="lg" className="h-14 px-10 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold text-lg rounded-xl shadow-xl shadow-amber-500/25 hover:scale-105 transition-transform">
                Começar Agora <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Benefits */}
      <section className="relative z-10 px-6 py-24 max-w-7xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold mb-4">Por que ser um <span className="text-amber-400">Embaixador</span>?</motion.h2>
          <motion.p variants={fadeUp} className="text-white/40 max-w-xl mx-auto">Comissões progressivas, plano de carreira e pagamento garantido.</motion.p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b, i) => (
            <FeatureCard key={b.title} icon={b.icon} title={b.title} desc={b.desc} colorClass={b.color} bgClass={b.bg} delay={i * 0.05} />
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="relative z-10 px-6 py-24 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16 text-white">Como funciona?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <StepCard key={s.step} step={s.step} title={s.title} desc={s.desc} gradientClass="from-amber-400 to-amber-600" delay={i * 0.15} />
          ))}
        </div>
      </section>

      {/* Career Tiers */}
      <section className="relative z-10 px-6 py-24 max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
          <motion.h2 variants={fadeUp} className="text-3xl font-bold mb-4">Plano de <span className="text-amber-400">Carreira</span></motion.h2>
          <motion.p variants={fadeUp} className="text-white/40 max-w-lg mx-auto mb-2">Quanto mais você indica, mais sobe de nível. Comissões maiores automaticamente!</motion.p>
          <motion.p variants={fadeUp} className="text-white/30 text-sm max-w-md mx-auto">Indicou 100 pessoas? Vira <span className="text-amber-400 font-bold">Premium</span> para sempre: 40% na 1ª venda + 10% recorrente.</motion.p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {careerTiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="card-3d"
            >
              <div className={`card-3d-inner rounded-2xl border ${t.color} bg-white/[0.02] backdrop-blur-sm p-6 text-center hover:bg-white/[0.04] transition-all duration-300 ${t.level === 6 ? "ring-1 ring-amber-500/30 bg-amber-500/[0.03] glow-pulse-border" : ""}`}>
                <span className="text-3xl mb-2 block">{t.badge}</span>
                <h3 className="font-bold text-lg mb-1 text-white">{t.name}</h3>
                <p className="text-white/30 text-xs mb-4">{t.range} indicações convertidas</p>
                <div className="space-y-2 text-sm">
                  <p className="text-white/60">1ª Venda: <span className="text-amber-400 font-bold">{t.first}</span></p>
                  <p className="text-white/60">Recorrente: <span className="text-emerald-400 font-bold">{t.recurring}</span></p>
                </div>
                {t.level === 6 && (
                  <div className="mt-4 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold inline-block">
                    🔥 Nível Máximo
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Payment Info */}
      <section className="relative z-10 px-6 py-16 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card-3d"
        >
          <div className="card-3d-inner rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 text-center">
            <Shield className="w-10 h-10 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-3 text-white">Pagamento Seguro no Mês Seguinte</h3>
            <p className="text-white/40 text-sm leading-relaxed max-w-lg mx-auto">
              Todas as comissões são verificadas e pagas no mês seguinte à compra. Isso garante que 
              somente vendas reais (não canceladas ou reembolsadas) gerem comissão, protegendo você e o sistema contra fraudes.
            </p>
          </div>
        </motion.div>
      </section>

      {/* CTA Final */}
      <section className="relative z-10 px-6 py-28 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="max-w-2xl mx-auto">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">{ctaTitle}</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/40 mb-8">{ctaSubtitle}</motion.p>
          <motion.div variants={fadeUp}>
            <Link to="/v1/auth">
              <Button size="lg" className="h-14 px-10 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold text-lg rounded-xl shadow-xl shadow-amber-500/20 hover:scale-105 transition-transform">
                Quero Ser Embaixador <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <LandingFooter label="Programa de Embaixadores" />
    </div>
  );
}
