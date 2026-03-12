import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import {
  Dumbbell, Users, BarChart3, Trophy, Zap, ArrowRight, Sparkles,
  CheckCircle2, Shield, TrendingUp, Calendar, ClipboardCheck,
  Target, Flame, Crown, Star, ChevronRight, Brain, MessageSquare,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const features = [
  { icon: Dumbbell, title: "Montagem de Treinos", desc: "Crie rotinas A/B/C/D com séries, reps, carga, descanso e notas. Organize treinos completos em minutos.", color: "from-orange-500 to-red-500" },
  { icon: Users, title: "Gestão de Alunos", desc: "Vincule alunos, acompanhe adesão individual, visualize histórico de treinos e evolução de performance.", color: "from-blue-500 to-cyan-500" },
  { icon: BarChart3, title: "Analytics de Adesão", desc: "Dashboards em tempo real com taxa de conclusão, frequência semanal, streaks e tendências de evolução.", color: "from-emerald-500 to-teal-500" },
  { icon: Trophy, title: "Gamificação Integrada", desc: "Treinos concluídos geram XP, streaks e medalhas. Rankings que motivam seus alunos a performar mais.", color: "from-amber-500 to-yellow-500" },
  { icon: MessageSquare, title: "Chat com Alunos", desc: "Comunicação direta e rápida com cada aluno. Envie feedbacks, ajustes e motivação em tempo real.", color: "from-violet-500 to-purple-500" },
  { icon: Brain, title: "Inteligência de Performance", desc: "Alertas automáticos de alunos inativos, queda de adesão e oportunidades de intervenção estratégica.", color: "from-rose-500 to-pink-500" },
];

const benefits = [
  "Treinos organizados por rotina (A/B/C/D)",
  "Aluno registra carga, esforço e dor",
  "Histórico completo de execução",
  "Ranking e gamificação automáticos",
  "Dashboard de adesão por aluno",
  "Alertas de alunos inativos",
  "Chat integrado com alunos",
  "Compartilhamento com nutricionista",
];

const stats = [
  { value: "350+", label: "Personal Trainers" },
  { value: "2.500+", label: "Alunos ativos" },
  { value: "92%", label: "Taxa de adesão" },
  { value: "40%", label: "Mais retenção" },
];

const testimonials = [
  { name: "Carlos M.", role: "Personal Trainer — SP", text: "Finalmente um sistema que entende a rotina de quem prescreve treino. Meus alunos adoram o ranking!", avatar: "CM" },
  { name: "Fernanda L.", role: "Personal Trainer — RJ", text: "A gamificação mudou tudo. Meus alunos competem entre si e a adesão disparou. Nunca vi nada igual.", avatar: "FL" },
  { name: "Rafael S.", role: "Personal & Nutricionista — MG", text: "Uso o FitJourney como personal e minha esposa como nutricionista. O paciente compartilhado é genial.", avatar: "RS" },
];

function FloatingOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none blur-[120px] ${className}`}
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

export default function PersonalLanding() {
  return (
    <div className="min-h-screen bg-[#060a10] text-white overflow-hidden">
      <Helmet>
        <title>FitJourney para Personal Trainers — Plataforma de Treinos e Performance</title>
        <meta name="description" content="Gerencie treinos, alunos, adesão e performance em uma plataforma premium com gamificação e inteligência integrada." />
      </Helmet>

      {/* BG effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1117] via-[#060a10] to-[#1a0a00]" />
        <FloatingOrb className="w-[700px] h-[700px] bg-orange-600/[0.07] top-[-200px] left-[-100px]" />
        <FloatingOrb className="w-[500px] h-[500px] bg-red-600/[0.05] bottom-[10%] right-[-100px]" delay={2} />
        <FloatingOrb className="w-[400px] h-[400px] bg-amber-500/[0.04] top-[50%] left-[30%]" delay={4} />
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/[0.05]">
        <Link to="/">
          <FitJourneyLogo size="sm" />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" className="text-white/60 hover:text-white text-sm">Login</Button>
          </Link>
          <Link to="/auth">
            <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-semibold text-sm px-5 rounded-xl shadow-lg shadow-orange-600/20">
              Começar grátis
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-20 pb-28 max-w-6xl mx-auto">
        <motion.div initial="hidden" animate="show" variants={stagger} className="text-center">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/[0.08] text-orange-400 text-xs font-medium mb-8">
            <Dumbbell className="w-3.5 h-3.5" />
            Plataforma #1 para Personal Trainers
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
            <span className="text-white">Monte treinos.</span>
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-red-400 to-amber-400 bg-clip-text text-transparent">
              Acompanhe alunos.
            </span>
            <br />
            <span className="text-white/80">Escale resultados.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-white/45 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            O FitJourney é a plataforma completa para personal trainers que querem organizar treinos, monitorar adesão e gamificar a jornada dos seus alunos — tudo em um só lugar.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="h-14 px-10 text-base font-bold rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-xl shadow-orange-600/25 hover:shadow-orange-500/35 transition-all duration-300 hover:scale-105">
                <Flame className="w-5 h-5 mr-2" />
                Criar minha conta grátis
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="lg" className="h-14 px-8 text-base text-white/50 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-xl">
                Ver todas as soluções
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 px-6 md:px-12 pb-20 max-w-5xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={fadeUp} className="text-center p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-1">{stat.value}</div>
              <div className="text-white/35 text-xs">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 md:px-12 py-24 max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Tudo que você precisa para <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">prescrever treinos</span>
            </h2>
            <p className="text-white/40 text-base md:text-lg max-w-xl mx-auto">Ferramentas profissionais para quem leva a sério o resultado dos seus alunos.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur p-8 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <f.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Benefits checklist */}
      <section className="relative z-10 px-6 md:px-12 py-24 max-w-5xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div variants={fadeUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Projetado para <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Personal Trainers</span>
            </h2>
            <p className="text-white/40 text-sm leading-relaxed mb-8">
              Cada funcionalidade foi pensada para a rotina real de quem prescreve treinos e acompanha a evolução de alunos diariamente.
            </p>
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-semibold rounded-xl px-6 shadow-lg shadow-orange-600/20">
                <Sparkles className="w-4 h-4 mr-2" />
                Experimentar agora
              </Button>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-3">
            {benefits.map((b, i) => (
              <motion.div key={i} variants={fadeUp} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-white/70 text-sm">{b}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Shared patient model */}
      <section className="relative z-10 px-6 md:px-12 py-24 max-w-5xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-400 text-xs font-medium mb-6">
            <Shield className="w-3.5 h-3.5" />
            Modelo Compartilhado
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
            Nutricionista + Personal = <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Resultado máximo</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/40 text-base max-w-2xl mx-auto mb-10">
            O mesmo aluno pode ser acompanhado por um nutricionista e um personal trainer simultaneamente, cada um com acesso aos dados relevantes da sua especialidade.
          </motion.p>
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Dumbbell, label: "Personal vê treinos", color: "text-orange-400 bg-orange-500/10" },
              { icon: Target, label: "Nutri vê alimentação", color: "text-violet-400 bg-violet-500/10" },
              { icon: Crown, label: "Aluno vê tudo junto", color: "text-amber-400 bg-amber-500/10" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-white/70 text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 px-6 md:px-12 py-24 max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Quem usa, <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">recomenda</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeUp} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur p-7">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-white/50 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-sm font-bold">{t.avatar}</div>
                  <div>
                    <div className="text-white text-sm font-semibold">{t.name}</div>
                    <div className="text-white/30 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 md:px-12 py-28 max-w-4xl mx-auto text-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold mb-5">
            Pronto para transformar sua <span className="bg-gradient-to-r from-orange-400 via-red-400 to-amber-400 bg-clip-text text-transparent">forma de treinar alunos?</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/40 text-base md:text-lg max-w-xl mx-auto mb-10">
            Comece agora mesmo, sem cartão de crédito. Organize seus treinos, acompanhe seus alunos e escale seus resultados.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="h-16 px-12 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-2xl shadow-orange-600/30 hover:shadow-orange-500/40 transition-all duration-300 hover:scale-105">
                <Flame className="w-6 h-6 mr-2" />
                Começar grátis agora
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] px-6 md:px-12 py-8 text-center">
        <p className="text-white/15 text-xs flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" /> Powered by FitJourney — Nutrição + Treino + Performance
        </p>
      </footer>
    </div>
  );
}
