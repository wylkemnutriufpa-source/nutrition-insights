import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Trophy, Target, Brain, UtensilsCrossed, TrendingUp,
  MessageSquare, Camera, Star, Sparkles, ArrowRight, Shield, Zap,
  BarChart3, Heart, Flame, Crown, Download, Smartphone
} from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useSiteSettings, getSetting } from "@/hooks/useSiteSettings";
import {
  FloatingOrb, LandingNav, HeroBadge, TestimonialCard,
  FeatureCard, StepCard, LandingFooter, fadeUp, stagger,
} from "@/components/landing/LandingShared";

const features = [
  { icon: CheckCircle2, title: "Checklist Diário Inteligente", desc: "Tarefas personalizadas pelo seu nutricionista, com gamificação e pontos.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: Shield, title: "Protocolo FitJourney™", desc: "Motor clínico exclusivo que gera seu plano alimentar de forma inteligente e personalizada.", color: "text-teal-400", bg: "bg-teal-500/10" },
  { icon: UtensilsCrossed, title: "Plano Alimentar Digital", desc: "Seu plano completo no celular, com acompanhamento de adesão em tempo real.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { icon: Brain, title: "IA para Análise de Refeições", desc: "Tire foto da sua refeição e receba análise nutricional instantânea.", color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: Trophy, title: "Ranking & Gamificação", desc: "Ganhe pontos, suba no ranking, conquiste medalhas e badges exclusivos.", color: "text-amber-400", bg: "bg-amber-500/10" },
  { icon: TrendingUp, title: "Evolução Corporal", desc: "Acompanhe peso, medidas e composição corporal com gráficos detalhados.", color: "text-blue-400", bg: "bg-blue-500/10" },
  { icon: MessageSquare, title: "Chat Direto com Nutricionista", desc: "Comunicação em tempo real com seu profissional, sem sair do app.", color: "text-sky-400", bg: "bg-sky-500/10" },
  { icon: Target, title: "Metas Semanais", desc: "Objetivos claros e mensuráveis definidos pelo seu nutricionista.", color: "text-rose-400", bg: "bg-rose-500/10" },
  { icon: Camera, title: "Fotos de Progresso", desc: "Registro visual da sua transformação com comparativo antes/depois.", color: "text-pink-400", bg: "bg-pink-500/10" },
  { icon: Flame, title: "Streak & Disciplina", desc: "Mantenha sua sequência diária e veja seu score de disciplina subir.", color: "text-orange-400", bg: "bg-orange-500/10" },
  { icon: Heart, title: "Check-in de Saúde", desc: "Registre como está se sentindo e receba dicas personalizadas.", color: "text-red-400", bg: "bg-red-500/10" },
  { icon: Crown, title: "Programa Prestige", desc: "Acesse benefícios exclusivos com planos premium de acompanhamento.", color: "text-yellow-400", bg: "bg-yellow-500/10" },
];

const defaultTestimonials = [
  { name: "Ana C.", text: "Perdi 12kg em 4 meses! O checklist diário e a gamificação me mantiveram focada.", avatar: "🌟" },
  { name: "Pedro S.", text: "Nunca imaginei que acompanhamento nutricional pudesse ser tão divertido e motivador.", avatar: "💪" },
  { name: "Mariana L.", text: "O ranking me fez competir comigo mesma. Resultado: mais disciplina que nunca.", avatar: "🏆" },
];

export default function PatientLanding() {
  const { data } = useSiteSettings();
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const map = data?.map;

  const heroBadge = getSetting(map, "patient_hero_badge", "Programa de Acompanhamento Online Inteligente");
  const heroTitle = getSetting(map, "patient_hero_title", "Sua transformação começa aqui");
  const heroSubtitle = getSetting(map, "patient_hero_subtitle", "Acompanhamento nutricional inteligente com gamificação, IA e comunicação direta com seu nutricionista. Tudo no seu celular.");
  const sectionTitle = getSetting(map, "patient_section_title", "Tudo que você precisa para resultados reais");
  const ctaTitle = getSetting(map, "patient_cta_final_title", "Pronto para começar sua transformação?");
  const ctaSubtitle = getSetting(map, "patient_cta_final_subtitle", "Converse com seu nutricionista sobre o FitJourney e comece sua jornada hoje.");
  const testimonials = getSetting(map, "patient_testimonials", defaultTestimonials);

  return (
    <div className="min-h-screen text-white overflow-hidden mesh-gradient-bg">
      {/* BG effects */}
      <div className="fixed inset-0 pointer-events-none">
        <FloatingOrb className="w-[700px] h-[700px] bg-emerald-600/[0.07] top-[-200px] left-[-100px]" />
        <FloatingOrb className="w-[500px] h-[500px] bg-teal-600/[0.05] bottom-[10%] right-[-100px]" delay={2} />
        <FloatingOrb className="w-[400px] h-[400px] bg-cyan-500/[0.04] top-[50%] left-[30%]" delay={4} />
        <div className="particle-field" />
      </div>

      <LandingNav ctaLabel="Entrar" ctaClassName="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20" />

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-28 max-w-6xl mx-auto text-center">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} className="mb-8">
            <HeroBadge icon={Sparkles} label={heroBadge} colorClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-400" />
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">{heroTitle}</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-white/45 text-lg md:text-xl max-w-2xl mx-auto mb-10">{heroSubtitle}</motion.p>
          <motion.div variants={fadeUp}>
            <Link to="/auth">
              <Button size="lg" className="h-14 px-10 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg hover:opacity-90 shadow-xl shadow-emerald-500/25 rounded-xl font-semibold hover:scale-105 transition-transform">
                Acessar Minha Conta <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 py-24 max-w-7xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-emerald-400">{sectionTitle}</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/40 max-w-xl mx-auto">Ferramentas poderosas pensadas para maximizar sua adesão e evolução.</motion.p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} colorClass={f.color} bgClass={f.bg} delay={i * 0.05} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 py-24 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16 text-white">Como funciona?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Receba o Convite", desc: "Seu nutricionista cadastra você e envia seu acesso por e-mail." },
            { step: "02", title: "Complete o Onboarding", desc: "Aceite os termos clínicos, preencha a anamnese e defina seus objetivos." },
            { step: "03", title: "Evolua com Acompanhamento", desc: "Receba seu plano, acompanhe sua evolução e conquiste resultados." },
          ].map((s, i) => (
            <StepCard key={s.step} step={s.step} title={s.title} desc={s.desc} gradientClass="from-emerald-400 to-emerald-600" delay={i * 0.15} />
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 px-6 py-24 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">Quem usa, <span className="text-emerald-400">transforma</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Array.isArray(testimonials) ? testimonials : defaultTestimonials).map((t: any, i: number) => (
            <TestimonialCard
              key={t.name}
              text={t.text}
              name={t.name}
              avatar={t.avatar}
              gradientClass="from-emerald-500 to-teal-600"
              delay={i * 0.1}
            />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 py-28 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="max-w-2xl mx-auto">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-emerald-400">{ctaTitle}</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/40 mb-8">{ctaSubtitle}</motion.p>
          <motion.div variants={fadeUp}>
            <Link to="/auth">
              <Button size="lg" className="h-14 px-10 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg rounded-xl font-semibold shadow-xl shadow-emerald-500/20 hover:scale-105 transition-transform">
                Acessar Minha Conta <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <LandingFooter label="Nutrição Inteligente" />
    </div>
  );
}
