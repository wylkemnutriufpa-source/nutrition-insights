import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSiteSettings, getSetting } from "@/hooks/useSiteSettings";
import {
  Sparkles, Users, Brain, Shield, BarChart3, Utensils, CheckCircle2,
  ArrowRight, Star, Zap, Heart, ChevronRight, Bot, Pill, Camera,
  Target, MessageSquare, FileText, Rocket, ClipboardCheck, ChefHat,
  Palette, DollarSign, Play, ArrowDown, Menu, X, BookOpen, TrendingUp
} from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";

/* ─── animation variants ─── */
const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5 } } };

/* ─── data ─── */
const features = [
  { icon: Brain, title: "IA Integrada", desc: "Análise de refeições por foto, geração automática de planos alimentares e receitas personalizadas com inteligência artificial.", tag: "Core" },
  { icon: Users, title: "Gestão de Pacientes", desc: "Cadastro completo, anamnese inteligente, timeline de eventos, scoring de engajamento e prontuário digital.", tag: "Gestão" },
  { icon: BarChart3, title: "Avaliação Física Completa", desc: "Dobras cutâneas (Jackson-Pollock 7), circunferências, composição corporal, IMC, TMB e TDEE automático.", tag: "Clínico" },
  { icon: Utensils, title: "Planos Alimentares", desc: "Crie planos detalhados por dia/refeição com metas de macros, templates reutilizáveis e agendamento inteligente.", tag: "Nutrição" },
  { icon: Zap, title: "Gamificação Avançada", desc: "XP, streaks, conquistas, desafios semanais e ranking. Aumente a adesão do paciente em até 3x.", tag: "Engajamento" },
  { icon: Bot, title: "AutoBot IA", desc: "Chatbot inteligente que tira dúvidas do paciente 24/7 sobre nutrição, receitas e seu plano alimentar.", tag: "IA" },
  { icon: FileText, title: "Protocolos & Programas", desc: "Crie protocolos reutilizáveis e programas como 'Projeto Biquíni' com inscrição em massa de pacientes.", tag: "Automação" },
  { icon: Camera, title: "Análise Corporal por Foto", desc: "Upload de fotos (frente, lado, costas) com análise de IA: tipo corporal, % gordura e evolução visual.", tag: "IA" },
  { icon: Pill, title: "Prescrição de Suplementos", desc: "Prescreva suplementos com dosagem, frequência, horário, marca e motivo. Paciente visualiza tudo.", tag: "Clínico" },
  { icon: MessageSquare, title: "Chat em Tempo Real", desc: "Comunicação direta e segura com pacientes. Indicador de lidas, histórico completo e notificações push.", tag: "Comunicação" },
  { icon: Target, title: "Metas Semanais", desc: "Defina metas de hidratação, passos, sono, treino. Acompanhe progresso visual por paciente.", tag: "Engajamento" },
  { icon: DollarSign, title: "Financeiro Integrado", desc: "Controle pagamentos, assinaturas e planos. Multi-gateway: Stripe, Mercado Pago, PIX e manual.", tag: "Negócio" },
];

const howItWorks = [
  { step: "01", title: "Crie sua conta", desc: "Teste grátis por 7 dias. Sem cartão de crédito.", icon: Sparkles },
  { step: "02", title: "Cadastre pacientes", desc: "Adicione pacientes com 1 clique. Eles recebem acesso automaticamente.", icon: Users },
  { step: "03", title: "Configure protocolos", desc: "Crie planos alimentares, protocolos e metas personalizadas.", icon: ClipboardCheck },
  { step: "04", title: "Acompanhe com IA", desc: "A IA analisa evolução, gera relatórios e sugere ajustes automaticamente.", icon: Brain },
];

const defaultTestimonials = [
  { name: "Dra. Ana Costa", role: "Nutricionista Esportiva", text: "O FitJourney revolucionou meu atendimento. A IA me economiza 3h por dia e meus pacientes adoram a gamificação!", rating: 5, avatar: "AC" },
  { name: "Dr. Carlos Silva", role: "Nutricionista Clínico", text: "Meus pacientes nunca foram tão engajados. A adesão ao tratamento subiu 60% com os streaks e desafios.", rating: 5, avatar: "CS" },
  { name: "Dra. Mariana Luz", role: "Nutricionista Funcional", text: "Relatórios profissionais com 1 clique, análise corporal por IA, chat integrado. Tudo que eu precisava em um só lugar.", rating: 5, avatar: "ML" },
  { name: "Dr. Rafael Mendes", role: "Nutricionista Comportamental", text: "O AutoBot responde meus pacientes 24/7 sobre dúvidas de nutrição. É como ter um assistente que nunca dorme.", rating: 5, avatar: "RM" },
];

const defaultPlans = [
  {
    name: "Starter", price: "Grátis", period: "7 dias", popular: false,
    features: ["Até 5 pacientes", "Planos alimentares", "Checklist de hábitos", "Chat básico", "Banco de alimentos TACO"],
    cta: "Testar 7 Dias Grátis",
  },
  {
    name: "Pro", price: "R$ 97", period: "/mês", popular: true,
    features: ["Pacientes ilimitados", "IA completa (análise, receitas, planos)", "Avaliação física + corporal", "Gamificação avançada", "Relatórios semanais", "Suplementação", "Branding personalizado", "Suporte prioritário"],
    cta: "Assinar Pro",
  },
  {
    name: "Clínica", price: "R$ 197", period: "/mês", popular: false,
    features: ["Tudo do Pro", "Multi-nutricionistas", "Programas em grupo", "Central de automação", "Financeiro integrado", "API personalizada", "Onboarding dedicado"],
    cta: "Falar com Vendas",
  },
];

const defaultFaqs = [
  { q: "Preciso instalar alguma coisa?", a: "Não! FitJourney é 100% web e PWA. Funciona no navegador e pode ser instalado como app no celular." },
  { q: "Meus pacientes precisam pagar?", a: "Não. Apenas o profissional paga pelo plano. Pacientes acessam gratuitamente com login próprio." },
  { q: "A IA substitui o nutricionista?", a: "Jamais! A IA é sua assistente — analisa dados, gera sugestões e economiza tempo. Todas as decisões clínicas são suas." },
  { q: "Meus dados estão seguros?", a: "Sim. Usamos criptografia de ponta, autenticação robusta e Row-Level Security. Cada paciente só acessa seus próprios dados." },
  { q: "Posso personalizar com minha marca?", a: "Sim! No plano Pro você personaliza cores, logo e nome da marca. Seus pacientes veem sua identidade visual." },
  { q: "Tem suporte?", a: "Sim! Chat in-app e email para todos. Suporte prioritário para planos Pro e Clínica." },
];

const defaultStats = [
  { value: "500+", label: "Nutricionistas" },
  { value: "10k+", label: "Pacientes ativos" },
  { value: "60%", label: "Mais adesão" },
  { value: "99.9%", label: "Uptime" },
];

const allFeaturesList = [
  "Dashboard inteligente", "Gestão de pacientes", "Anamnese com IA", "Planos alimentares",
  "Avaliação física completa", "Análise corporal por foto", "Protocolos reutilizáveis",
  "Programas em grupo", "Gamificação (XP/streaks)", "Desafios semanais", "Metas semanais",
  "Chat em tempo real", "AutoBot IA 24/7", "Receitas com IA", "Banco TACO 600+ alimentos",
  "Lista de compras", "Suplementação", "Relatórios semanais", "Agenda de consultas",
  "Push notifications", "Branding personalizado", "Financeiro multi-gateway", "Feedbacks",
  "Dicas globais", "Biblioteca do paciente", "Calculadoras (peso/água)", "Health Check Quiz",
];

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { data: siteData } = useSiteSettings();
  const s = siteData?.map;

  const brandName = getSetting(s, "brand_name", "FitJourney");
  const heroTitle = getSetting(s, "hero_title", "Transforme seu consultório com IA e Gamificação");
  const heroSubtitle = getSetting(s, "hero_subtitle", "Gerencie pacientes, crie planos alimentares personalizados com IA, e engaje seus clientes com gamificação — tudo em uma plataforma completa e intuitiva.");
  const heroCta = getSetting(s, "hero_cta_text", "Começar Gratuitamente");
  const heroBadge = getSetting(s, "hero_badge_text", "Plataforma #1 para Nutricionistas Modernos");
  const stats = getSetting(s, "stats", defaultStats);
  const plans = getSetting(s, "pricing_plans", defaultPlans);
  const testimonials = getSetting(s, "testimonials_landing", defaultTestimonials);
  const faqs = getSetting(s, "faqs", defaultFaqs);
  const metaTitle = getSetting(s, "meta_title", "FitJourney — Plataforma de Nutrição com IA e Gamificação");
  const metaDescription = getSetting(s, "meta_description", "Gerencie pacientes, crie planos alimentares com IA, engaje com gamificação. A plataforma #1 para nutricionistas modernos.");
  const footerText = getSetting(s, "footer_text", "Plataforma completa para nutricionistas modernos.");

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fijourney.lovable.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <link rel="canonical" href="https://fijourney.lovable.app" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "FitJourney",
          "applicationCategory": "HealthApplication",
          "operatingSystem": "Web",
          "description": metaDescription,
          "url": "https://fijourney.lovable.app",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "BRL",
            "description": "Trial gratuito de 7 dias"
          }
        })}</script>
      </Helmet>

      {/* ══════════ NAV ══════════ */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            <FitJourneyLogo size="sm" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            {[["#features", "Recursos"], ["#how", "Como Funciona"], ["#pricing", "Preços"], ["#testimonials", "Depoimentos"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full">{label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" size="sm" className="font-medium">Entrar</Button></Link>
            <Link to="/auth"><Button size="sm" className="gradient-primary shadow-glow font-semibold gap-1.5">Começar Grátis <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden glass border-t border-border/30 p-4 space-y-3">
            {[["#features", "Recursos"], ["#how", "Como Funciona"], ["#pricing", "Preços"], ["#testimonials", "Depoimentos"]].map(([href, label]) => (
              <a key={href} href={href} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileMenu(false)}>{label}</a>
            ))}
            <div className="flex gap-2 pt-2">
              <Link to="/auth" className="flex-1"><Button variant="outline" className="w-full" size="sm">Entrar</Button></Link>
              <Link to="/auth" className="flex-1"><Button className="w-full gradient-primary shadow-glow" size="sm">Criar Conta</Button></Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section ref={heroRef} className="relative pt-28 pb-24 md:pt-40 md:pb-32 px-4 overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 -left-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px] animate-pulse-glow" />
          <div className="absolute bottom-10 -right-40 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/3 blur-[150px]" />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10">
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-5xl mx-auto text-center">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-semibold mb-8 shadow-glow">
              <Sparkles className="w-4 h-4" />
              {heroBadge}
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-display text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
              {heroTitle.split("IA e Gamificação")[0]}
              <span className="relative">
                <span className="text-gradient">IA e Gamificação</span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 300 12" fill="none"><path d="M2 10C50 4 100 2 150 4C200 6 250 2 298 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {heroSubtitle}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link to="/auth">
                <Button size="lg" className="gradient-primary shadow-glow gap-2 text-base px-10 h-13 font-semibold hover:scale-105 transition-transform">
                  {heroCta} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="gap-2 text-base px-8 h-13 font-medium hover:bg-muted transition-colors">
                  <Play className="w-4 h-4" /> Ver Recursos
                </Button>
              </a>
            </motion.div>

            <motion.p variants={fadeUp} className="text-xs text-muted-foreground mb-16">
              ✅ 7 dias grátis · Sem cartão de crédito · Setup em 30 segundos
            </motion.p>

            {/* Stats */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="text-center"
                >
                  <p className="font-display text-3xl md:text-4xl font-bold text-gradient">{s.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs font-medium">Scroll</span>
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </motion.div>
      </section>

      {/* ══════════ SOCIAL PROOF BAR ══════════ */}
      <section className="py-8 border-y border-border/30 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-4 font-medium">Usado por profissionais de todo o Brasil</p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-muted-foreground/50 font-display font-semibold text-lg">
            {["CRN-3", "ASBRAN", "Clínicas Premium", "Consultórios Solo", "Universidades"].map(t => (
              <span key={t} className="hover:text-muted-foreground/80 transition-colors">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">RECURSOS</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Tudo que você precisa.<br className="hidden md:block" /> <span className="text-gradient">Nada que você não precisa.</span></h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">12 módulos integrados para transformar seu consultório de nutrição em uma experiência premium.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className="group relative glass rounded-2xl p-6 hover:border-primary/30 hover:shadow-glow transition-all duration-300 cursor-default"
              >
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">{f.tag}</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FULL FEATURE LIST ══════════ */}
      <section className="py-16 px-4 bg-muted/20 border-y border-border/30">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center mb-10">
            <h3 className="font-display text-2xl md:text-3xl font-bold mb-2">+27 funcionalidades integradas</h3>
            <p className="text-muted-foreground">Tudo incluso. Sem módulos extras para comprar.</p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allFeaturesList.map((f) => (
              <motion.div key={f} variants={fadeUp} className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg bg-card/50 border border-border/30">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{f}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section id="how" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">COMO FUNCIONA</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Simples de começar.<br /><span className="text-gradient">Poderoso de usar.</span></h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative text-center group"
              >
                {i < 3 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/30 to-transparent" />
                )}
                <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary shadow-glow flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <step.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <span className="font-display text-xs font-bold text-primary tracking-widest">{step.step}</span>
                <h3 className="font-display font-semibold text-lg mt-1 mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HIGHLIGHT SECTION (Split) ══════════ */}
      <section className="py-24 px-4 bg-muted/20 border-y border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.span variants={fadeUp} className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">DIFERENCIAIS</motion.span>
              <motion.h2 variants={fadeUp} className="font-display text-3xl md:text-4xl font-bold mb-6 leading-tight">
                Por que nutricionistas escolhem o <span className="text-gradient">FitJourney</span>?
              </motion.h2>
              <div className="space-y-5">
                {[
                  { icon: Brain, title: "IA que economiza tempo", desc: "Gere planos, receitas e relatórios com 1 clique. Economia de 3h/dia." },
                  { icon: Zap, title: "Pacientes engajados", desc: "Gamificação aumenta adesão em 60%. Seus pacientes voltam todo dia." },
                  { icon: Shield, title: "Segurança LGPD", desc: "Dados criptografados, acesso por role, compliance total." },
                  { icon: Palette, title: "Sua marca, seu app", desc: "Cores, logo e identidade visual personalizada para seus pacientes." },
                ].map((item, i) => (
                  <motion.div key={item.title} variants={fadeUp} className="flex gap-4 items-start group">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={scaleIn} className="relative">
              {/* Mock dashboard preview */}
              <div className="glass rounded-2xl p-6 shadow-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">fitjourney.app/dashboard</span>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-xl bg-primary/10 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Pacientes Ativos</p>
                      <p className="font-display text-2xl font-bold text-primary">47</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-accent/10 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Adesão Média</p>
                      <p className="font-display text-2xl font-bold text-accent">87%</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium">Maria Silva — Streak 🔥</p>
                      <span className="text-xs text-primary font-bold">14 dias</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted">
                      <div className="h-full rounded-full gradient-primary" style={{ width: "78%" }} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium">João Costa — XP Level</p>
                      <span className="text-xs text-accent font-bold">Nível 12</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted">
                      <div className="h-full rounded-full gradient-accent" style={{ width: "62%" }} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg bg-success/10 p-3 text-center">
                      <p className="text-lg">🎯</p>
                      <p className="text-[10px] text-muted-foreground">23 metas</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-info/10 p-3 text-center">
                      <p className="text-lg">💬</p>
                      <p className="text-[10px] text-muted-foreground">5 msgs</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-warning/10 p-3 text-center">
                      <p className="text-lg">📊</p>
                      <p className="text-[10px] text-muted-foreground">3 avaliações</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-primary/10 p-3 text-center">
                      <p className="text-lg">🏆</p>
                      <p className="text-[10px] text-muted-foreground">8 conquistas</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 glass rounded-xl px-4 py-2 shadow-card border border-primary/20 animate-pulse-glow">
                <p className="text-xs font-bold text-primary flex items-center gap-1"><Zap className="w-3 h-3" /> +150 XP</p>
              </div>
              <div className="absolute -bottom-4 -left-4 glass rounded-xl px-4 py-2 shadow-card border border-accent/20">
                <p className="text-xs font-bold text-accent flex items-center gap-1"><Star className="w-3 h-3 fill-accent" /> 4.9/5 rating</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section id="testimonials" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">DEPOIMENTOS</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Amado por <span className="text-gradient">nutricionistas</span></h2>
            <p className="text-muted-foreground text-lg">Veja o que profissionais reais dizem sobre o NutriFlow</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6 hover:border-primary/20 transition-all"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm mb-5 leading-relaxed italic text-foreground/90">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PRICING ══════════ */}
      <section id="pricing" className="py-24 px-4 bg-muted/20 border-y border-border/30">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">PREÇOS</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Simples e <span className="text-gradient">transparente</span></h2>
            <p className="text-muted-foreground text-lg">Comece grátis. Escale quando precisar. Cancele quando quiser.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className={`relative glass rounded-2xl p-7 ${plan.popular ? "border-primary ring-2 ring-primary/20 shadow-glow md:scale-105" : "hover:border-border"} transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-bold shadow-glow">
                    ⭐ Mais Popular
                  </div>
                )}
                <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1.5 mb-5">
                  <span className="font-display text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button className={`w-full h-11 font-semibold ${plan.popular ? "gradient-primary shadow-glow" : ""}`} variant={plan.popular ? "default" : "outline"}>
                    {plan.cta} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">FAQ</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Perguntas frequentes</h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full glass rounded-xl p-5 text-left hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-sm pr-4">{faq.q}</h3>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-90" : ""}`} />
                  </div>
                  {openFaq === i && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-sm text-muted-foreground mt-3 leading-relaxed"
                    >
                      {faq.a}
                    </motion.p>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="py-24 px-4">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={scaleIn}
          className="max-w-4xl mx-auto text-center relative"
        >
          <div className="absolute inset-0 rounded-3xl gradient-primary opacity-5 blur-xl" />
          <div className="relative glass rounded-3xl p-10 md:p-16 border border-primary/20">
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary shadow-glow flex items-center justify-center mb-6">
              <Rocket className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Pronto para <span className="text-gradient">decolar</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Junte-se a centenas de nutricionistas que já transformaram seu atendimento com NutriFlow.
              Comece grátis agora mesmo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gradient-primary shadow-glow gap-2 text-base px-10 h-13 font-semibold hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" /> Criar Conta Grátis
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Sem cartão de crédito · Setup em 30s · Cancele quando quiser</p>
          </div>
        </motion.div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-border/30 py-12 px-4 bg-muted/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-lg">{brandName}</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                {footerText}
              </p>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3 text-sm">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Recursos</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Preços</a></li>
                <li><a href="#testimonials" className="hover:text-foreground transition-colors">Depoimentos</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="cursor-default">Termos de Uso</span></li>
                <li><span className="cursor-default">Privacidade</span></li>
                <li><span className="cursor-default">LGPD</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/30 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} {brandName}. Todos os direitos reservados.</p>
            <p className="flex items-center gap-1.5">Feito com <Heart className="w-3.5 h-3.5 text-destructive fill-destructive" /> no Brasil</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
