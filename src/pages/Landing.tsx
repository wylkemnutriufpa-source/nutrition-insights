import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Users, Brain, Shield, BarChart3, Utensils,
  CheckCircle2, ArrowRight, Star, Zap, Heart, ChevronRight
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const features = [
  { icon: Brain, title: "IA Integrada", desc: "Análise de refeições, geração de planos e receitas com inteligência artificial." },
  { icon: Users, title: "Gestão de Pacientes", desc: "Cadastro, anamnese, protocolos, timeline e acompanhamento completo." },
  { icon: BarChart3, title: "Avaliações Físicas", desc: "Dobras cutâneas, circunferências, composição corporal e evolução." },
  { icon: Utensils, title: "Planos Alimentares", desc: "Crie planos detalhados por refeição com macros e templates prontos." },
  { icon: Zap, title: "Gamificação", desc: "Engaje pacientes com XP, streaks, conquistas e desafios semanais." },
  { icon: Shield, title: "Segurança Total", desc: "Dados criptografados, RLS por paciente e compliance com LGPD." },
];

const plans = [
  { name: "Starter", price: "Grátis", period: "para sempre", features: ["Até 5 pacientes", "Planos alimentares", "Checklist de hábitos", "Chat básico"], cta: "Começar Grátis", popular: false },
  { name: "Pro", price: "R$ 97", period: "/mês", features: ["Pacientes ilimitados", "IA completa", "Relatórios PDF", "Branding personalizado", "Metas semanais", "Suporte prioritário"], cta: "Assinar Pro", popular: true },
  { name: "Clínica", price: "R$ 197", period: "/mês", features: ["Tudo do Pro", "Multi-nutricionistas", "API personalizada", "Onboarding dedicado", "SLA garantido"], cta: "Falar com Vendas", popular: false },
];

const testimonials = [
  { name: "Dra. Ana Costa", role: "Nutricionista Esportiva", text: "O NutriFlow revolucionou meu atendimento. A IA me economiza 3h por dia!", rating: 5 },
  { name: "Dr. Carlos Silva", role: "Nutricionista Clínico", text: "Meus pacientes adoram a gamificação. A adesão ao tratamento subiu 60%.", rating: 5 },
  { name: "Dra. Mariana Luz", role: "Nutricionista Funcional", text: "Relatórios profissionais com 1 clique. Nunca mais perdi tempo formatando.", rating: 5 },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">NutriFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Preços</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Depoimentos</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/auth"><Button size="sm" className="gradient-primary shadow-glow">Criar Conta</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto text-center">
          <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Plataforma #1 para Nutricionistas
          </motion.div>
          <motion.h1 variants={item} className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6">
            Nutrição Inteligente com{" "}
            <span className="text-gradient">IA e Gamificação</span>
          </motion.h1>
          <motion.p variants={item} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Gerencie pacientes, crie planos alimentares personalizados e engaje seus clientes com
            uma plataforma completa e moderna.
          </motion.p>
          <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="gradient-primary shadow-glow gap-2 text-base px-8">
                Começar Gratuitamente <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                Ver Recursos
              </Button>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div variants={item} className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16">
            {[["500+", "Nutricionistas"], ["10k+", "Pacientes"], ["99.9%", "Uptime"]].map(([v, l]) => (
              <div key={l}>
                <p className="font-display text-2xl md:text-3xl font-bold text-gradient">{v}</p>
                <p className="text-sm text-muted-foreground">{l}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Tudo que você precisa</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Uma plataforma completa para transformar seu consultório de nutrição.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-xl p-6 hover:border-primary/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Planos simples e transparentes</h2>
            <p className="text-muted-foreground">Comece grátis e escale quando precisar.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.name} className={`glass rounded-xl p-6 relative ${plan.popular ? "border-primary ring-1 ring-primary/20" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full gradient-primary text-primary-foreground text-xs font-medium">
                    Mais Popular
                  </div>
                )}
                <h3 className="font-display font-semibold text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="font-display text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button className={`w-full ${plan.popular ? "gradient-primary shadow-glow" : ""}`} variant={plan.popular ? "default" : "outline"}>
                    {plan.cta} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">O que dizem os profissionais</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="glass rounded-xl p-6">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-accent text-accent" />)}
                </div>
                <p className="text-sm mb-4 italic">"{t.text}"</p>
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center glass rounded-2xl p-10">
          <Heart className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
            Pronto para transformar seu consultório?
          </h2>
          <p className="text-muted-foreground mb-6">Junte-se a centenas de nutricionistas que já usam NutriFlow.</p>
          <Link to="/auth">
            <Button size="lg" className="gradient-primary shadow-glow gap-2 text-base px-10">
              <Sparkles className="w-4 h-4" /> Criar Conta Grátis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gradient-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-foreground">NutriFlow</span>
          </div>
          <p>© {new Date().getFullYear()} NutriFlow. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
