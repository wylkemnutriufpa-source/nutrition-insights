import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import {
  Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Flame, Heart, Scale,
  Target, Trophy, Zap, Star, ChevronDown, Users, Calendar
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

const phases = [
  { number: 1, title: "Reset Metabólico", icon: "🔄", weeks: "Semanas 1–2", desc: "Regulação de fome, energia e hábitos alimentares. Base sólida para tudo que vem depois.", color: "from-sky-500 to-cyan-400" },
  { number: 2, title: "Déficit Estratégico", icon: "📉", weeks: "Semanas 3–5", desc: "Redução de gordura com déficit inteligente, priorizando proteínas e volume alimentar.", color: "from-orange-500 to-amber-400" },
  { number: 3, title: "Definição Corporal", icon: "✨", weeks: "Semanas 6–9", desc: "Periodização de carboidratos, treinos intensos e acompanhamento semanal de medidas.", color: "from-purple-500 to-pink-400" },
  { number: 4, title: "Manutenção Inteligente", icon: "🏆", weeks: "Semanas 10–12", desc: "Reverse diet gradual, consolidação de resultados e prevenção do efeito rebote.", color: "from-emerald-500 to-green-400" },
];

const benefits = [
  { icon: Scale, title: "Plano Alimentar Personalizado", desc: "Criado pela sua nutricionista, ajustado a cada fase do programa." },
  { icon: Target, title: "Metas Semanais Claras", desc: "Hidratação, passos, sono e treino — tudo monitorado visualmente." },
  { icon: Zap, title: "Gamificação & Motivação", desc: "XP, streaks, conquistas e ranking para manter você engajada todos os dias." },
  { icon: Flame, title: "Checklist Diário", desc: "Tarefas personalizadas por fase para você nunca se perder no processo." },
  { icon: Heart, title: "Suporte Direto 24/7", desc: "Converse em tempo real com sua nutricionista e tire dúvidas a qualquer hora." },
  { icon: Trophy, title: "Resultados Reais", desc: "Acompanhe sua evolução com fotos, medidas e gráficos de progresso." },
];

const testimonials = [
  { name: "Camila R.", text: "Perdi 8kg em 12 semanas sem passar fome. O app me manteve motivada todos os dias!", avatar: "CR" },
  { name: "Juliana M.", text: "A gamificação mudou tudo! Não queria quebrar meu streak e acabei criando hábitos de verdade.", avatar: "JM" },
  { name: "Fernanda S.", text: "Minha nutri acompanhou cada passo. Me senti segura e apoiada durante todo o projeto.", avatar: "FS" },
];

export default function BiquiniBrancoLanding() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Projeto Biquíni Branco — Transformação em 12 Semanas</title>
        <meta name="description" content="Programa de emagrecimento e definição corporal em 12 semanas com acompanhamento nutricional, IA e gamificação." />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        {/* Nav */}
        <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <span className="text-2xl">👙</span>
              <span className="font-bold text-lg tracking-tight">Biquíni Branco</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="gap-1.5">
                  Começar Agora <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative pt-32 pb-20 px-4">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
          </div>

          <motion.div
            className="max-w-4xl mx-auto text-center relative z-10"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Programa de 12 Semanas
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
              Projeto{" "}
              <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 bg-clip-text text-transparent">
                Biquíni Branco
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Transforme seu corpo e sua relação com a alimentação em 12 semanas. 
              Plano alimentar personalizado, acompanhamento com IA e gamificação para 
              você chegar ao verão com confiança.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="text-base px-8 gap-2 shadow-lg">
                  Quero Participar <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <a href="#como-funciona">
                <Button variant="outline" size="lg" className="text-base px-8 gap-2">
                  Como Funciona <ChevronDown className="w-5 h-5" />
                </Button>
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
              {[
                { value: "12", label: "Semanas" },
                { value: "4", label: "Fases" },
                { value: "100%", label: "Personalizado" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Phases */}
        <section id="como-funciona" className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div className="text-center mb-16" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">As 4 Fases do Programa</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Cada fase foi cientificamente planejada para maximizar seus resultados de forma saudável e sustentável.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 gap-6"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {phases.map((phase) => (
                <motion.div
                  key={phase.number}
                  variants={fadeUp}
                  className="relative group"
                >
                  <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 h-full">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center text-2xl shrink-0 shadow-md`}>
                        {phase.icon}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{phase.weeks}</div>
                        <h3 className="text-xl font-bold mb-2">{phase.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{phase.desc}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div className="text-center mb-16" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">O Que Você Recebe</h2>
              <p className="text-muted-foreground text-lg">Tudo para sua transformação, na palma da sua mão.</p>
            </motion.div>

            <motion.div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {benefits.map((b) => (
                <motion.div key={b.title} variants={fadeUp} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
                  <b.icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="font-bold text-lg mb-2">{b.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{b.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <motion.div className="text-center mb-16" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Quem Já Participou</h2>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-6"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {testimonials.map((t) => (
                <motion.div key={t.name} variants={fadeUp} className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">{t.avatar}</div>
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-accent text-accent" />)}</div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">"{t.text}"</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4">
          <motion.div
            className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border rounded-3xl p-10 sm:p-16"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <span className="text-5xl mb-6 block">👙</span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Pronta para a Transformação?</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Cadastre-se agora e sua nutricionista irá te inscrever no Projeto Biquíni Branco. 
              Vagas limitadas por turma!
            </p>
            <Link to="/auth">
              <Button size="lg" className="text-base px-10 gap-2 shadow-lg">
                Criar Minha Conta <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-8 px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} FitJourney — Projeto Biquíni Branco. Todos os direitos reservados.</p>
        </footer>
      </div>
    </>
  );
}
