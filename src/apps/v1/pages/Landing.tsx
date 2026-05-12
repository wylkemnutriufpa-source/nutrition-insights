import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useSiteSettings, getSetting } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, Users, Brain, Shield, BarChart3, Utensils, CheckCircle2,
  ArrowRight, Star, Zap, Heart, ChevronRight, Bot, Pill, Camera,
  Target, MessageSquare, FileText, Rocket, ClipboardCheck, ChefHat,
  Palette, DollarSign, Play, ArrowDown, Menu, X, BookOpen, TrendingUp,
  Award, Globe, Lock, Cpu, Trophy, Crown, Flame, Dumbbell
} from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import BrainIntelligence from "@/components/common/BrainIntelligence";
import CoachBodybuilderLandingSection from "@/components/coach-bodybuilder/CoachBodybuilderLandingSection";

/* ─── animation variants ─── */
const fadeUp = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } } };

/* ─── Animated Counter ─── */
function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const num = parseInt(value.replace(/[^0-9]/g, ""));
  const prefix = value.replace(/[0-9]/g, "").replace(suffix, "");
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated || !ref.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasAnimated(true);
        const dur = 2000;
        const start = performance.now();
        const step = (now: number) => {
          const prog = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - prog, 4);
          setCount(Math.floor(ease * num));
          if (prog < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [num, hasAnimated]);

  return <span ref={ref} className="counter-animate">{prefix}{count}{suffix}</span>;
}

/* ─── data ─── */
const features = [
  { icon: Brain, title: "IA Integrada", desc: "Análise de refeições por foto, geração automática de planos alimentares e receitas personalizadas com inteligência artificial.", tag: "Core" },
  { icon: Shield, title: "Protocolo FitJourney™", desc: "Motor clínico 100% determinístico: onboarding guiado, cálculos automáticos (TMB/TDEE), geração de pré-planos com scoring inteligente e auditabilidade total.", tag: "Exclusivo" },
  { icon: Users, title: "Gestão de Pacientes", desc: "Cadastro completo, anamnese inteligente, timeline de eventos, scoring de engajamento e prontuário digital.", tag: "Gestão" },
  { icon: Dumbbell, title: "Módulo Personal Trainer", desc: "Gestão completa de treinos, anamnese fitness, biblioteca de exercícios e acompanhamento de carga e esforço.", tag: "Novo" },
  { icon: BarChart3, title: "Avaliação Física Completa", desc: "Dobras cutâneas (Jackson-Pollock 7), circunferências, composição corporal, IMC, TMB e TDEE automático.", tag: "Clínico" },
  { icon: Utensils, title: "Planos Alimentares", desc: "Crie planos detalhados por dia/refeição com metas de macros, templates reutilizáveis e agendamento inteligente.", tag: "Nutrição" },
  { icon: Zap, title: "Gamificação Avançada", desc: "XP, streaks, conquistas, desafios semanais e ranking. Aumente a adesão do paciente em até 3x.", tag: "Engajamento" },
  { icon: MessageSquare, title: "Chat em Tempo Real", desc: "Acompanhamento direto com seu nutricionista, com indicador de presença, respostas rápidas e histórico completo.", tag: "Comunicação" },
  { icon: FileText, title: "Protocolos & Programas", desc: "Crie protocolos reutilizáveis e programas como 'Projeto Biquíni' com inscrição em massa de pacientes.", tag: "Automação" },
  { icon: Camera, title: "Análise Corporal por Foto", desc: "Upload de fotos (frente, lado, costas) com análise de IA: tipo corporal, % gordura e evolução visual.", tag: "IA" },
  { icon: Pill, title: "Prescrição de Suplementos", desc: "Prescreva suplementos com dosagem, frequência, horário, marca e motivo. Paciente visualiza tudo.", tag: "Clínico" },
  { icon: Target, title: "Metas Semanais", desc: "Defina metas de hidratação, passos, sono, treino. Acompanhe progresso visual por paciente.", tag: "Engajamento" },
  { icon: DollarSign, title: "Financeiro Integrado", desc: "Controle pagamentos, assinaturas e planos. Multi-gateway: Stripe, Mercado Pago, PIX e manual.", tag: "Negócio" },
];

const howItWorks = [
  { step: "01", title: "Crie sua conta profissional", desc: "Cadastro exclusivo para nutricionistas. 3 dias grátis, sem cartão.", icon: Sparkles },
  { step: "02", title: "Convide seus pacientes", desc: "Pacientes recebem acesso por convite — via link mágico ou senha temporária.", icon: Users },
  { step: "03", title: "Configure protocolos", desc: "Crie planos alimentares, protocolos e metas personalizadas.", icon: ClipboardCheck },
  { step: "04", title: "Acompanhe com IA", desc: "A IA analisa evolução, gera relatórios e sugere ajustes automaticamente.", icon: Brain },
];

const howItWorksPatient = [
  { step: "01", title: "Receba o convite", desc: "Seu nutricionista cria sua conta e envia o acesso por e-mail.", icon: Lock },
  { step: "02", title: "Complete seu onboarding", desc: "Preencha a anamnese e aceite os termos clínicos (LGPD).", icon: ClipboardCheck },
  { step: "03", title: "Siga seu plano", desc: "Acesse dietas, checklists, receitas e acompanhe sua evolução.", icon: Target },
  { step: "04", title: "Evolua com dados", desc: "Sua jornada é acompanhada por inteligência clínica em tempo real.", icon: Brain },
];

const defaultTestimonials = [
  { name: "Dra. Ana Costa", role: "Nutricionista Esportiva", text: "O FitJourney revolucionou meu atendimento. A IA me economiza 3h por dia e meus pacientes adoram a gamificação!", rating: 5, avatar: "AC" },
  { name: "Dr. Carlos Silva", role: "Nutricionista Clínico", text: "Meus pacientes nunca foram tão engajados. A adesão ao tratamento subiu 60% com os streaks e desafios.", rating: 5, avatar: "CS" },
  { name: "Dra. Mariana Luz", role: "Nutricionista Funcional", text: "Relatórios profissionais com 1 clique, análise corporal por IA, chat integrado. Tudo que eu precisava em um só lugar.", rating: 5, avatar: "ML" },
  { name: "Dr. Rafael Mendes", role: "Nutricionista Comportamental", text: "O chat em tempo real com meus pacientes mudou tudo. Consigo acompanhar de perto e resolver dúvidas na hora.", rating: 5, avatar: "RM" },
];

const defaultPlans = [
  {
    name: "Basic", price: "R$ 30", period: "/mês", popular: false,
    features: ["Até 20 pacientes", "Planos alimentares básicos", "Chat com pacientes"],
    cta: "Testar Grátis por 3 dias →",
  },
  {
    name: "Profissional", price: "R$ 75", period: "/mês", popular: true,
    features: ["Até 100 pacientes", "Planos alimentares ilimitados", "Análise de IA", "Relatórios automáticos", "Suporte prioritário"],
    cta: "Testar Grátis por 3 dias →",
  },
  {
    name: "Premium", price: "R$ 147", period: "/mês", popular: true,
    features: ["Pacientes ilimitados", "Todas as funcionalidades Pro", "Branding personalizado", "API de integração", "Suporte dedicado", "Todas as IAs do sistema", "Todo sistema de gamificação"],
    cta: "Testar Grátis por 3 dias →",
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
  "Chat em tempo real", "Receitas com IA", "Banco TACO 600+ alimentos",
  "Lista de compras", "Suplementação", "Relatórios semanais", "Agenda de consultas",
  "Push notifications", "Branding personalizado", "Financeiro multi-gateway", "Feedbacks",
  "Dicas globais", "Biblioteca do paciente", "Calculadoras (peso/água)", "Health Check Quiz",
];

const trustBadges = [
  { icon: Lock, label: "LGPD Compliant" },
  { icon: Shield, label: "Dados Criptografados" },
  { icon: Globe, label: "99.9% Uptime" },
  { icon: Cpu, label: "IA de Última Geração" },
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
  const navScrolled = useNavScroll();

  // Fetch real approved testimonials from DB
  const [dbTestimonials, setDbTestimonials] = useState<any[]>([]);
  const [topRanking, setTopRanking] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("testimonials_public").select("*").order("created_at", { ascending: false }).limit(6)
      .then(({ data }) => { if (data?.length) setDbTestimonials(data); });
    // Fetch top 5 from ranking cache for the landing page
    supabase.from("patient_ranking_cache").select("display_name, total_points, avatar_url, plan_slug, plan_color, badge_icon, crown_enabled, rank_position")
      .order("rank_position").limit(5)
      .then(({ data }) => { if (data) setTopRanking(data); });
  }, []);

  const brandName = getSetting(s, "brand_name", "FitJourney");
  const heroTitle = getSetting(s, "hero_title", "Transforme seu consultório com IA e Gamificação");
  const heroSubtitle = getSetting(s, "hero_subtitle", "Gerencie pacientes, crie planos alimentares personalizados com IA, e engaje seus clientes com gamificação — tudo em uma plataforma completa e intuitiva.");
  const heroCta = getSetting(s, "hero_cta_text", "Começar Gratuitamente");
  const heroBadge = getSetting(s, "hero_badge_text", "Plataforma #1 para Nutricionistas Modernos");
  const stats = getSetting(s, "stats", defaultStats);
  const [dbPlans, setDbPlans] = useState<typeof defaultPlans | null>(null);
  
  useEffect(() => {
    supabase.from("pricing_plans").select("name, price_monthly, features, is_featured, max_patients, description")
      .eq("is_active", true).order("sort_order").then(({ data }) => {
        if (data?.length) {
          setDbPlans(data.map(p => ({
            name: p.name,
            price: `R$ ${Math.round(p.price_monthly)}`,
            period: "/mês",
            popular: p.is_featured || false,
            features: Array.isArray(p.features) ? p.features as string[] : [],
            cta: "Testar Grátis por 3 dias →",
          })));
        }
      });
  }, []);
  
  const plans = dbPlans || getSetting(s, "pricing_plans", defaultPlans);
  const testimonials = dbTestimonials.length > 0
    ? dbTestimonials.map(t => ({ name: t.is_anonymous ? "Paciente Anônimo" : (t.display_name || "Paciente"), role: "Paciente FitJourney", text: t.content, rating: t.rating || 5, avatar: (t.display_name || "P")[0].toUpperCase() }))
    : getSetting(s, "testimonials_landing", defaultTestimonials);
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
            "description": "Trial gratuito de 3 dias"
          }
        })}</script>
      </Helmet>

      {/* ══════════ NAV ══════════ */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${navScrolled ? "glass border-b border-border/30 shadow-card" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FitJourneyLogo size="sm" />
            <BrainIntelligence />
          </div>

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
      <section ref={heroRef} className="relative pt-28 pb-24 md:pt-44 md:pb-36 px-4 overflow-hidden noise-overlay">
        {/* Animated dot grid */}
        <div className="absolute inset-0 -z-10 dot-grid opacity-40" />

        {/* Morphing orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-10 -left-32 w-[600px] h-[600px] bg-primary/6 blur-[120px] morph-orb" />
          <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] bg-accent/6 blur-[100px] morph-orb" style={{ animationDelay: "-4s" }} />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-info/4 blur-[150px] morph-orb" style={{ animationDelay: "-8s" }} />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10">
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-5xl mx-auto text-center">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-premium text-primary text-sm font-semibold mb-8 gradient-border">
              <Sparkles className="w-4 h-4" />
              {heroBadge}
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-display text-4xl sm:text-6xl md:text-7xl font-bold leading-[1.08] mb-6 tracking-tight">
              {heroTitle.split("IA e Gamificação")[0]}
              <span className="text-gradient-animated">IA e Gamificação</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {heroSubtitle}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link to="/auth">
                <Button size="lg" className="gradient-primary shadow-glow gap-2 text-base px-10 h-14 font-semibold hover:scale-105 active:scale-[0.98] transition-transform">
                  {heroCta} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="gap-2 text-base px-8 h-14 font-medium glass hover:bg-muted transition-colors">
                  <Play className="w-4 h-4" /> Ver Recursos
                </Button>
              </a>
            </motion.div>

            <motion.p variants={fadeUp} className="text-xs text-muted-foreground mb-16">
              ✅ 3 dias grátis · Sem cartão de crédito · Setup em 30 segundos
            </motion.p>

            {/* Stats with animated counters */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {stats.map((stat: { value: string; label: string }, i: number) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center glass-premium rounded-2xl p-4 gradient-border"
                >
                  <p className="font-display text-3xl md:text-4xl font-bold text-gradient-animated">
                    <AnimatedCounter value={stat.value.replace(/[^0-9]/g, "")} suffix={stat.value.replace(/[0-9.]/g, "")} />
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
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
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs font-medium tracking-wider uppercase">Scroll</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
            <ArrowDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════ TRUST BADGES ══════════ */}
      <section className="py-6 border-y border-border/30 bg-muted/10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12">
            {trustBadges.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-muted-foreground/70">
                <b.icon className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ SOCIAL PROOF BAR ══════════ */}
      <section className="py-10 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-center text-xs text-muted-foreground mb-5 font-semibold uppercase tracking-widest">Usado por profissionais de todo o Brasil</p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-muted-foreground/40 font-display font-bold text-xl">
            {["CRN-3", "ASBRAN", "Clínicas Premium", "Consultórios Solo", "Universidades"].map(t => (
              <span key={t} className="hover:text-muted-foreground/70 transition-colors duration-300 cursor-default">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="py-28 px-4 relative noise-overlay">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full glass-premium text-primary text-xs font-bold mb-5 gradient-border uppercase tracking-widest">Recursos</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-5">Tudo que você precisa.<br className="hidden md:block" /> <span className="text-gradient-animated">Nada que você não precisa.</span></h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">12 módulos integrados para transformar seu consultório de nutrição em uma experiência premium.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="group relative glass-premium rounded-2xl p-6 card-hover-glow shimmer-sweep cursor-default gradient-border"
              >
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary">{f.tag}</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/15 group-hover:shadow-glow transition-all duration-500">
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
            <p className="text-muted-foreground">Acesso completo a todas as funcionalidades no plano <span className="text-primary font-semibold">Premium</span>.</p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allFeaturesList.map((f) => (
              <motion.div key={f} variants={fadeUp} className="flex items-center gap-2 text-sm py-2.5 px-3 rounded-xl glass-premium border border-border/30 hover:border-primary/20 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-medium">{f}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS — PROFESSIONALS ══════════ */}
      <section id="how" className="py-28 px-4 relative noise-overlay">
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full glass-premium text-accent text-xs font-bold mb-5 gradient-border uppercase tracking-widest">Para Nutricionistas</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Comece em minutos.<br /><span className="text-gradient-animated">Escale com inteligência.</span></h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {howItWorks.map((step, i) => (
              <motion.div key={step.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }} className="relative text-center group">
                {i < 3 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px]">
                    <div className="w-full h-full bg-gradient-to-r from-primary/30 to-transparent" />
                  </div>
                )}
                <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary shadow-glow flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
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

      {/* ══════════ HOW IT WORKS — PATIENTS ══════════ */}
      <section className="py-28 px-4 bg-muted/20 border-y border-border/30">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full glass-premium text-primary text-xs font-bold mb-5 gradient-border uppercase tracking-widest">Para Pacientes</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Acesso seguro por <span className="text-gradient-animated">convite do profissional</span></h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Pacientes não criam contas sozinhos. Seu nutricionista convida você, garantindo um ambiente clínico seguro e controlado.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {howItWorksPatient.map((step, i) => (
              <motion.div key={step.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                  <step.icon className="w-7 h-7 text-accent" />
                </div>
                <span className="font-display text-xs font-bold text-accent tracking-widest">{step.step}</span>
                <h3 className="font-display font-semibold mt-1 mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl glass-premium gradient-border">
              <Shield className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Conformidade LGPD</p>
                <p className="text-xs text-muted-foreground">Consentimento clínico explícito, versionado e auditável. Seus dados estão protegidos.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════ HIGHLIGHT SECTION (Split) ══════════ */}
      <section className="py-28 px-4 bg-muted/20 border-y border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.span variants={fadeUp} className="inline-block px-4 py-1.5 rounded-full glass-premium text-primary text-xs font-bold mb-5 gradient-border uppercase tracking-widest">Diferenciais</motion.span>
              <motion.h2 variants={fadeUp} className="font-display text-3xl md:text-4xl font-bold mb-8 leading-tight">
                Por que nutricionistas escolhem o <span className="text-gradient-animated">FitJourney</span>?
              </motion.h2>
              <div className="space-y-6">
                {[
                  { icon: Brain, title: "IA que economiza tempo", desc: "Gere planos, receitas e relatórios com 1 clique. Economia de 3h/dia." },
                  { icon: Zap, title: "Pacientes engajados", desc: "Gamificação aumenta adesão em 60%. Seus pacientes voltam todo dia." },
                  { icon: Shield, title: "Segurança LGPD", desc: "Dados criptografados, acesso por role, compliance total." },
                  { icon: Palette, title: "Sua marca, seu app", desc: "Cores, logo e identidade visual personalizada para seus pacientes." },
                ].map((item, i) => (
                  <motion.div key={item.title} variants={fadeUp} className="flex gap-4 items-start group">
                    <div className="w-11 h-11 rounded-xl gradient-primary/10 bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 group-hover:shadow-glow transition-all duration-500">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={scaleIn} className="relative">
              {/* Mock dashboard preview */}
              <div className="glass-premium rounded-2xl p-6 shadow-card gradient-border shimmer-sweep">
                <div className="flex items-center gap-2 mb-5">
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
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full gradient-primary"
                        initial={{ width: "0%" }}
                        whileInView={{ width: "78%" }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium">João Costa — XP Level</p>
                      <span className="text-xs text-accent font-bold">Nível 12</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full gradient-accent"
                        initial={{ width: "0%" }}
                        whileInView={{ width: "62%" }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.7, duration: 1.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { emoji: "🎯", label: "23 metas", bg: "bg-success/10" },
                      { emoji: "💬", label: "5 msgs", bg: "bg-info/10" },
                      { emoji: "📊", label: "3 avaliações", bg: "bg-warning/10" },
                      { emoji: "🏆", label: "8 conquistas", bg: "bg-primary/10" },
                    ].map((m) => (
                      <div key={m.label} className={`flex-1 rounded-lg ${m.bg} p-3 text-center`}>
                        <p className="text-lg">{m.emoji}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                className="absolute -top-4 -right-4 glass-premium rounded-xl px-4 py-2.5 shadow-card gradient-border"
              >
                <p className="text-xs font-bold text-primary flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> +150 XP</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1 }}
                className="absolute -bottom-4 -left-4 glass-premium rounded-xl px-4 py-2.5 shadow-card gradient-border"
              >
                <p className="text-xs font-bold text-accent flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-accent" /> 4.9/5 rating</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════ RANKING PREVIEW ══════════ */}
      {topRanking.length > 0 && (
        <section className="py-28 px-4 bg-muted/20 border-y border-border/30">
          <div className="max-w-4xl mx-auto">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full glass-premium text-accent text-xs font-bold mb-5 gradient-border uppercase tracking-widest">
                <Trophy className="w-3.5 h-3.5 inline mr-1" /> Ranking ao Vivo
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
                Pacientes <span className="text-gradient-animated">engajados</span> de verdade
              </h2>
              <p className="text-muted-foreground text-lg">Veja o ranking em tempo real. Gamificação que gera resultados.</p>
            </motion.div>

            <div className="space-y-3 max-w-lg mx-auto">
              {topRanking.map((entry, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <motion.div
                    key={entry.rank_position}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className={`glass-premium rounded-xl p-4 flex items-center gap-4 gradient-border ${i < 3 ? "ring-1 ring-accent/20" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-lg shrink-0"
                      style={{ backgroundColor: i < 3 ? (entry.plan_color || "hsl(var(--accent))") + "15" : undefined }}
                    >
                      {i < 3 ? medals[i] : <span className="text-muted-foreground text-sm">#{entry.rank_position}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-semibold text-sm truncate"
                          style={entry.crown_enabled ? { color: entry.plan_color } : undefined}
                        >
                          {entry.display_name}
                        </span>
                        {entry.crown_enabled && <Crown className="w-3.5 h-3.5" style={{ color: entry.plan_color }} />}
                        {entry.badge_icon && <span className="text-xs">{entry.badge_icon}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-primary">{entry.total_points.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">pontos</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mt-10">
              <Link to="/auth">
                <Button variant="outline" className="gap-2 h-12 px-8 font-semibold">
                  <Flame className="w-4 h-4 text-accent" /> Quero participar do ranking
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      <section id="testimonials" className="py-28 px-4 relative noise-overlay">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full glass-premium text-accent text-xs font-bold mb-5 gradient-border uppercase tracking-widest">Depoimentos</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Amado por <span className="text-gradient-animated">nutricionistas</span></h2>
            <p className="text-muted-foreground text-lg">Veja o que profissionais reais dizem sobre o FitJourney</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t: typeof defaultTestimonials[0], i: number) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="glass-premium rounded-2xl p-7 card-hover-glow gradient-border"
              >
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm mb-6 leading-relaxed italic text-foreground/90">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-glow">
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

      {/* ══════════ COACH BODYBUILDER ══════════ */}
      <CoachBodybuilderLandingSection />

      {/* ══════════ PRICING ══════════ */}
      <section id="pricing" className="py-28 px-4 bg-muted/20 border-y border-border/30">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full glass-premium text-primary text-xs font-bold mb-5 gradient-border uppercase tracking-widest">Preços</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Simples e <span className="text-gradient-animated">transparente</span></h2>
            <p className="text-muted-foreground text-lg">As regras do nosso plano: sempre fáceis ...Práticos.. e fáceis</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan: typeof defaultPlans[0], i: number) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className={`relative glass-premium rounded-2xl p-8 gradient-border ${plan.popular ? "ring-2 ring-primary/30 shadow-glow md:scale-105" : "card-hover-glow"} transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full gradient-primary text-primary-foreground text-xs font-bold shadow-glow">
                    ⭐ Mais Popular
                  </div>
                )}
                <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="font-display text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3.5 mb-8">
                  {plan.features.map((f: string) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button className={`w-full h-12 font-semibold ${plan.popular ? "gradient-primary shadow-glow" : ""}`} variant={plan.popular ? "default" : "outline"}>
                    {plan.cta} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section id="faq" className="py-28 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full glass-premium text-accent text-xs font-bold mb-5 gradient-border uppercase tracking-widest">FAQ</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Perguntas frequentes</h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq: { q: string; a: string }, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full glass-premium rounded-xl p-5 text-left card-hover-glow gradient-border"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-sm pr-4">{faq.q}</h3>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-90" : ""}`} />
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
      <section className="py-28 px-4 relative noise-overlay">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={scaleIn}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <div className="absolute inset-0 rounded-3xl gradient-primary opacity-[0.03] blur-2xl" />
          <div className="relative glass-premium rounded-3xl p-10 md:p-20 gradient-border shimmer-sweep">
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary shadow-glow flex items-center justify-center mb-8">
              <Rocket className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-5">
              Pronto para <span className="text-gradient-animated">decolar</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
              Junte-se a centenas de nutricionistas que já transformaram seu atendimento com FitJourney.
              Comece grátis agora mesmo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gradient-primary shadow-glow gap-2 text-base px-12 h-14 font-semibold hover:scale-105 active:scale-[0.98] transition-transform">
                  <Sparkles className="w-4 h-4" /> Criar Conta Profissional
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-5">Sem cartão de crédito · 3 dias grátis · Pacientes acessam por convite</p>
          </div>
        </motion.div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-border/30 py-14 px-4 bg-muted/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-lg">{brandName}</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-4">
                {footerText}
              </p>
              <div className="flex gap-2">
                {trustBadges.slice(0, 3).map((b) => (
                  <span key={b.label} className="text-[10px] font-semibold text-muted-foreground/60 bg-muted/50 px-2 py-1 rounded-md">{b.label}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-4 text-sm">Produto</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Recursos</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Preços</a></li>
                <li><a href="#testimonials" className="hover:text-foreground transition-colors">Depoimentos</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/terms" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link></li>
                <li><Link to="/settings/account-deletion" className="hover:text-primary transition-colors">LGPD</Link></li>
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

/* ─── Hook: nav scroll state ─── */
function useNavScroll() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return scrolled;
}
