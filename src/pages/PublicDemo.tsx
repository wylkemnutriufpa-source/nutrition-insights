import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Rocket, Stethoscope, User, Brain, Trophy, BarChart3, MessageSquare, Calendar, Shield, Zap, Target, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnergyGlow, MockupParticles, PremiumMockupFrame, EnergyBeam } from "@/components/landing/LandingEffects";

import slide1 from "@/assets/onboarding/slide-1.png";
import slide2 from "@/assets/onboarding/slide-2.png";
import slide3 from "@/assets/onboarding/slide-3.png";
import slide4 from "@/assets/onboarding/slide-4.png";
import slide5 from "@/assets/onboarding/slide-5.png";
import slide6 from "@/assets/onboarding/slide-6.png";
import slide7 from "@/assets/onboarding/slide-7.png";
import slide8 from "@/assets/onboarding/slide-8.png";
import slide9 from "@/assets/onboarding/slide-9.png";
import slide10 from "@/assets/onboarding/slide-10.png";

import pSlide1 from "@/assets/onboarding-paciente/slide-1.png";
import pSlide2 from "@/assets/onboarding-paciente/slide-2.png";
import pSlide3 from "@/assets/onboarding-paciente/slide-3.png";
import pSlide4 from "@/assets/onboarding-paciente/slide-4.png";
import pSlide5 from "@/assets/onboarding-paciente/slide-5.png";
import pSlide6 from "@/assets/onboarding-paciente/slide-6.png";
import pSlide7 from "@/assets/onboarding-paciente/slide-7.png";
import pSlide8 from "@/assets/onboarding-paciente/slide-8.png";
import pSlide9 from "@/assets/onboarding-paciente/slide-9.png";
import pSlide10 from "@/assets/onboarding-paciente/slide-10.png";

import screenshotDashboard from "@/assets/screenshot-dashboard.jpg";
import screenshotMealPlan from "@/assets/screenshot-mealplan.jpg";

interface ShowcaseSection {
  image: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  reverse?: boolean;
  glowColor1?: string;
  glowColor2?: string;
}

const PRO_SECTIONS: ShowcaseSection[] = [
  { image: screenshotDashboard, title: "Dashboard Clínico Inteligente", subtitle: "Cockpit de Decisões", description: "Visualize riscos de abandono, scores de adesão e alertas clínicos em tempo real — tudo num único painel profissional.", icon: <BarChart3 className="w-5 h-5" /> },
  { image: slide2, title: "Cockpit de Pacientes", subtitle: "Carteira sob controle total", description: "Gerencie toda sua base de pacientes com indicadores de prioridade, status de adesão e alertas automáticos.", icon: <Target className="w-5 h-5" />, reverse: true, glowColor1: "hsl(210,92%,55%)", glowColor2: "hsl(152,58%,45%)" },
  { image: screenshotMealPlan, title: "Editor de Planos Alimentares", subtitle: "Monte planos em minutos", description: "Grade semanal visual, biblioteca de refeições, geração automática e controle de macros em tempo real.", icon: <Calendar className="w-5 h-5" />, glowColor1: "hsl(152,58%,45%)", glowColor2: "hsl(45,93%,47%)" },
  { image: slide4, title: "Motor de Inteligência Preditiva", subtitle: "Antecipe problemas antes que aconteçam", description: "Análise de padrões metabólicos e comportamentais para prever estagnação — com recomendações proativas.", icon: <Brain className="w-5 h-5" />, reverse: true, glowColor1: "hsl(280,70%,50%)", glowColor2: "hsl(210,92%,55%)" },
  { image: slide5, title: "Gamificação & Engajamento", subtitle: "Escale seu consultório com tecnologia", description: "Sistema de pontos, ranking global, protocolos especiais e ferramentas de crescimento integradas.", icon: <Trophy className="w-5 h-5" />, glowColor1: "hsl(45,93%,47%)", glowColor2: "hsl(152,58%,45%)" },
  { image: slide6, title: "Protocolos Clínicos Estruturados", subtitle: "Metodologia científica no dia a dia", description: "Fases, tarefas diárias e transições automáticas baseadas na evolução do paciente.", icon: <Shield className="w-5 h-5" />, reverse: true, glowColor1: "hsl(210,92%,55%)", glowColor2: "hsl(280,70%,50%)" },
  { image: slide7, title: "Relatórios & Analytics Avançados", subtitle: "Dados que impressionam e convencem", description: "Relatórios automáticos com gráficos de evolução, comparativos e exportação em PDF profissional.", icon: <BarChart3 className="w-5 h-5" />, glowColor1: "hsl(152,58%,45%)", glowColor2: "hsl(210,92%,55%)" },
  { image: slide8, title: "Engajamento Inteligente", subtitle: "Comunicação que gera resultados", description: "Check-ins automáticos, acompanhamento contínuo e motivação baseada em dados reais de adesão.", icon: <MessageSquare className="w-5 h-5" />, reverse: true },
  { image: slide9, title: "Inteligência Artificial Clínica", subtitle: "IA sob sua supervisão total", description: "Análise de refeições, geração de receitas, insights de anamnese e suporte à decisão clínica.", icon: <Sparkles className="w-5 h-5" />, glowColor1: "hsl(280,70%,50%)", glowColor2: "hsl(152,58%,45%)" },
  { image: slide10, title: "Escale Seu Consultório", subtitle: "De consultório local a marca digital", description: "Landing pages, afiliados, agendamento online, pagamentos via Stripe e ferramentas de crescimento.", icon: <Zap className="w-5 h-5" />, reverse: true, glowColor1: "hsl(45,93%,47%)", glowColor2: "hsl(210,92%,55%)" },
];

const PATIENT_SECTIONS: ShowcaseSection[] = [
  { image: pSlide1, title: "Bem-vindo à sua nova jornada", subtitle: "Você não está sozinho", description: "O FitJourney acompanha sua evolução todos os dias com inteligência e cuidado.", icon: <Sparkles className="w-5 h-5" /> },
  { image: pSlide2, title: "Seu plano alimentar inteligente", subtitle: "Tudo pensado para seu objetivo", description: "Toque em qualquer refeição para ver ingredientes, modo de preparo e macros.", icon: <Calendar className="w-5 h-5" />, reverse: true, glowColor1: "hsl(210,92%,55%)", glowColor2: "hsl(152,58%,45%)" },
  { image: pSlide3, title: "Acompanhe sua evolução", subtitle: "Visualize sua transformação", description: "Registre peso, medidas e fotos. Veja sua evolução semana após semana.", icon: <BarChart3 className="w-5 h-5" />, glowColor1: "hsl(152,58%,45%)", glowColor2: "hsl(45,93%,47%)" },
  { image: pSlide4, title: "Missões e motivação diária", subtitle: "Pequenas vitórias, grandes resultados", description: "Complete tarefas, ganhe XP, mantenha sua sequência.", icon: <Trophy className="w-5 h-5" />, reverse: true, glowColor1: "hsl(45,93%,47%)", glowColor2: "hsl(152,58%,45%)" },
  { image: pSlide5, title: "Suporte sempre disponível", subtitle: "Fale com seu nutricionista", description: "Chat em tempo real. Peça ajuda sempre que precisar.", icon: <MessageSquare className="w-5 h-5" />, glowColor1: "hsl(210,92%,55%)", glowColor2: "hsl(280,70%,50%)" },
  { image: pSlide6, title: "Resultados reais", subtitle: "Evolução guiada por dados", description: "O sistema ajusta sua estratégia conforme sua resposta metabólica.", icon: <Target className="w-5 h-5" />, reverse: true },
  { image: pSlide7, title: "Checklist diário personalizado", subtitle: "Seu dia organizado", description: "Tarefas de nutrição, hidratação e hábitos saudáveis num só lugar.", icon: <Shield className="w-5 h-5" />, glowColor1: "hsl(152,58%,45%)", glowColor2: "hsl(210,92%,55%)" },
  { image: pSlide8, title: "Gamificação que transforma", subtitle: "Conquiste e evolua", description: "Medalhas, níveis e fases da sua jornada. Evolução nunca foi tão motivante.", icon: <Trophy className="w-5 h-5" />, reverse: true, glowColor1: "hsl(45,93%,47%)", glowColor2: "hsl(152,58%,45%)" },
  { image: pSlide9, title: "Relatórios de progresso", subtitle: "Cada escolha conta", description: "Relatórios semanais mostram como cada decisão contribui para seu resultado.", icon: <BarChart3 className="w-5 h-5" />, glowColor1: "hsl(280,70%,50%)", glowColor2: "hsl(210,92%,55%)" },
  { image: pSlide10, title: "Sua jornada começa agora", subtitle: "Tudo está pronto", description: "Siga o plano, confie no processo e veja a transformação acontecer.", icon: <Rocket className="w-5 h-5" />, reverse: true, glowColor1: "hsl(152,58%,45%)", glowColor2: "hsl(45,93%,47%)" },
];

function ShowcaseBlock({ section, index }: { section: ShowcaseSection; index: number }) {
  const isReverse = section.reverse;
  const delay = Math.min(index * 0.05, 0.2);

  return (
    <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
      <motion.div
        initial={{ opacity: 0, x: isReverse ? 40 : -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, delay }}
        className={isReverse ? "md:order-2" : ""}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            {section.icon}
          </div>
          <span className="text-primary/80 text-sm font-semibold uppercase tracking-wider">
            {section.subtitle}
          </span>
        </div>
        <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
          {section.title}
        </h3>
        <p className="text-white/50 text-base md:text-lg leading-relaxed">
          {section.description}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: isReverse ? -40 : 40, scale: 0.95 }}
        whileInView={{ opacity: 1, x: 0, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, delay: delay + 0.1 }}
        className={`relative ${isReverse ? "md:order-1" : ""}`}
      >
        <EnergyGlow
          color1={section.glowColor1 || "hsl(152,58%,45%)"}
          color2={section.glowColor2 || "hsl(210,92%,55%)"}
        />
        <MockupParticles
          color={section.glowColor1 ? section.glowColor1.replace(")", ",0.5)").replace("hsl(", "hsla(") : "hsla(152,58%,45%,0.5)"}
          count={4}
        />
        <EnergyBeam
          className={isReverse ? "top-2 right-6" : "top-2 left-6"}
          angle={isReverse ? 160 : 20}
          color={section.glowColor1 || "hsl(152,58%,45%)"}
        />
        <PremiumMockupFrame
          gradientFrom={(section.glowColor1 || "hsl(152,58%,45%)").replace(")", ",0.08)")}
          gradientTo={(section.glowColor2 || "hsl(210,92%,55%)").replace(")", ",0.06)")}
          floatDelay={index * 0.5}
        >
          <img
            src={section.image}
            alt={section.title}
            className="rounded-xl w-full relative z-10"
            loading="lazy"
          />
        </PremiumMockupFrame>
      </motion.div>
    </div>
  );
}

function GalleryGrid({ images }: { images: string[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {images.map((img, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          whileHover={{ scale: 1.04, y: -8 }}
          className="relative group cursor-pointer"
        >
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
          <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-black/40 shadow-2xl">
            <img src={img} alt={`Screenshot ${i + 1}`} className="w-full transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function PublicDemo() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();

  const isPro = mode === "profissional";
  const sections = isPro ? PRO_SECTIONS : PATIENT_SECTIONS;
  const accent = isPro ? "hsl(152,58%,45%)" : "hsl(210,92%,55%)";

  const galleryImages = isPro
    ? [slide1, slide3, slide6, slide7, slide9, slide10]
    : [pSlide2, pSlide4, pSlide6, pSlide7, pSlide9, pSlide10];

  const features = isPro
    ? [
        { icon: <BarChart3 className="w-4 h-4" />, label: "Dashboard Clínico" },
        { icon: <Brain className="w-4 h-4" />, label: "Motor Preditivo" },
        { icon: <Calendar className="w-4 h-4" />, label: "Planos Alimentares" },
        { icon: <Trophy className="w-4 h-4" />, label: "Gamificação" },
        { icon: <MessageSquare className="w-4 h-4" />, label: "Chat em Tempo Real" },
        { icon: <Sparkles className="w-4 h-4" />, label: "IA Clínica" },
      ]
    : [
        { icon: <Calendar className="w-4 h-4" />, label: "Plano Alimentar" },
        { icon: <Trophy className="w-4 h-4" />, label: "Missões & XP" },
        { icon: <BarChart3 className="w-4 h-4" />, label: "Evolução Visual" },
        { icon: <MessageSquare className="w-4 h-4" />, label: "Chat com Nutri" },
        { icon: <Target className="w-4 h-4" />, label: "Checklist Diário" },
        { icon: <Shield className="w-4 h-4" />, label: "Relatórios" },
      ];

  return (
    <div className="min-h-screen mesh-gradient-bg">
      {/* Sticky top bar */}
      <div className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 h-14">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
            <span className="text-white/70 text-sm font-medium">
              {isPro ? "Visão Profissional" : "Visão Paciente"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/demo")} className="text-xs h-8 border-white/10 text-white/60 hover:text-white">
              {isPro ? "Ver visão Paciente" : "Ver visão Profissional"}
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8">
              Começar Agora
            </Button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 px-6 text-center relative overflow-hidden">
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(ellipse, ${accent.replace(")", ",0.12)")} 0%, transparent 70%)`, filter: "blur(80px)" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/60 text-sm">
            {isPro ? <Stethoscope className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-accent" />}
            {isPro ? "Visão do Profissional" : "Visão do Paciente"}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            {isPro
              ? <>Conheça o <span className="text-shimmer">poder clínico</span> do FitJourney</>
              : <>Sua jornada de <span className="text-shimmer">transformação</span> começa aqui</>
            }
          </h1>
          <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto">
            {isPro
              ? "Explore cada funcionalidade que vai transformar seu consultório em uma máquina de resultados."
              : "Veja como o app acompanha cada passo da sua evolução com inteligência e motivação."
            }
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {features.map((f, i) => (
              <motion.div key={i} whileHover={{ scale: 1.05, y: -4 }} className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">{f.icon}</div>
                <span className="text-white/70 text-sm font-medium">{f.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Showcase sections */}
      <section className="px-6 pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto space-y-24 md:space-y-32">
          {sections.map((section, i) => (
            <ShowcaseBlock key={i} section={section} index={i} />
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section className="px-6 pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Mais telas do <span className="text-shimmer">sistema</span>
            </h2>
            <p className="text-white/40 max-w-lg mx-auto">
              Explore ainda mais funcionalidades do FitJourney
            </p>
          </motion.div>
          <GalleryGrid images={galleryImages} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-24 md:pb-32">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white">
            Pronto para <span className="text-shimmer">começar</span>?
          </h2>
          <p className="text-white/50 text-lg">
            {isPro
              ? "Junte-se a centenas de profissionais que já transformaram seus consultórios."
              : "Comece sua jornada de transformação hoje mesmo."
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-base">
              <Rocket className="w-5 h-5 mr-2" /> Criar Conta Grátis
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate(isPro ? "/demo/paciente" : "/demo/profissional")} className="h-14 px-10 border-white/10 text-white/70 hover:text-white rounded-xl text-base">
              {isPro ? "Ver visão Paciente" : "Ver visão Profissional"} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <p className="text-white/30 text-sm">✅ 3 dias grátis · Sem cartão de crédito</p>
        </motion.div>
      </section>
    </div>
  );
}
