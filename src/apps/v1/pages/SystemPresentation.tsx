import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { NeuroEntryExperience } from "@v1/components/system-entry";
import GuidedPresentation from "@v1/components/common/GuidedPresentation";
import GuidedTour, { PROFESSIONAL_TOUR_STEPS, PATIENT_TOUR_STEPS } from "@v1/components/common/GuidedTour";
import FullscreenPresentationViewer, { type PresentationSlide } from "@v1/components/common/FullscreenPresentationViewer";
import { Button } from "@v1/components/ui/button";
import { Card, CardContent } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { useAuth } from "@v1/lib/auth";
import { PROFESSIONAL_SLIDES, PATIENT_SLIDES } from "@v1/lib/presentationSlides";
import { useFeatureGuide } from "@v1/hooks/useFeatureGuide";
import { GraduationCap, Stethoscope, User, Play, CheckCircle2, RotateCcw, Clapperboard, Map, Rocket, Users, LayoutDashboard, Sparkles, Brain } from "lucide-react";
import { MagicSlideButton } from "@v1/components/common/MagicSlideGenerator";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import slide1 from "@v1/assets/onboarding/slide-1.png";
import slide2 from "@v1/assets/onboarding/slide-2.png";
import slide3 from "@v1/assets/onboarding/slide-3.png";
import slide4 from "@v1/assets/onboarding/slide-4.png";
import slide5 from "@v1/assets/onboarding/slide-5.png";
import slide6 from "@v1/assets/onboarding/slide-6.png";
import slide7 from "@v1/assets/onboarding/slide-7.png";
import slide8 from "@v1/assets/onboarding/slide-8.png";
import slide9 from "@v1/assets/onboarding/slide-9.png";
import slide10 from "@v1/assets/onboarding/slide-10.png";

import pSlide1 from "@v1/assets/onboarding-paciente/slide-1.png";
import pSlide2 from "@v1/assets/onboarding-paciente/slide-2.png";
import pSlide3 from "@v1/assets/onboarding-paciente/slide-3.png";
import pSlide4 from "@v1/assets/onboarding-paciente/slide-4.png";
import pSlide5 from "@v1/assets/onboarding-paciente/slide-5.png";
import pSlide6 from "@v1/assets/onboarding-paciente/slide-6.png";
import pSlide7 from "@v1/assets/onboarding-paciente/slide-7.png";
import pSlide8 from "@v1/assets/onboarding-paciente/slide-8.png";
import pSlide9 from "@v1/assets/onboarding-paciente/slide-9.png";
import pSlide10 from "@v1/assets/onboarding-paciente/slide-10.png";

const PRO_CINEMATIC_SLIDES: PresentationSlide[] = [
  { image_url: slide1, title: "A evolução da Nutrição Clínica Inteligente", subtitle: "Tecnologia que transforma consultórios", description: "O FitJourney une dados, metabolismo e estratégia em uma plataforma única — para que você tome decisões clínicas com confiança absoluta." },
  { image_url: slide2, title: "Dashboard Clínico & Cockpit de Decisões", subtitle: "Sua carteira sob controle total", description: "Visualize riscos de abandono, scores de adesão e alertas clínicos em tempo real — tudo num único painel." },
  { image_url: slide3, title: "Editor de Planos Alimentares Premium", subtitle: "Monte planos em minutos, não em horas", description: "Grade semanal visual, biblioteca de refeições, geração automática e controle de macros em tempo real." },
  { image_url: slide4, title: "Inteligência Preditiva & Motor Clínico", subtitle: "Antecipe problemas antes que aconteçam", description: "Análise de padrões metabólicos e comportamentais para prever estagnação — com recomendações proativas." },
  { image_url: slide5, title: "Automação, Gamificação & Crescimento", subtitle: "Escale seu consultório com tecnologia", description: "Sistema de pontos, ranking global, protocolos especiais e ferramentas de crescimento integradas." },
  { image_url: slide6, title: "Protocolos Clínicos Estruturados", subtitle: "Metodologia científica no dia a dia", description: "Fases, tarefas diárias e transições automáticas baseadas na evolução do paciente." },
  { image_url: slide7, title: "Relatórios & Analytics Avançados", subtitle: "Dados que impressionam e convencem", description: "Relatórios automáticos com gráficos de evolução, comparativos e exportação em PDF profissional." },
  { image_url: slide8, title: "Engajamento Inteligente do Paciente", subtitle: "Comunicação que gera resultados", description: "Check-ins automáticos, acompanhamento contínuo e motivação baseada em dados reais de adesão." },
  { image_url: slide9, title: "Inteligência Artificial Clínica", subtitle: "IA sob sua supervisão total", description: "Análise de refeições, geração de receitas, insights de anamnese e suporte à decisão clínica." },
  { image_url: slide10, title: "Escale Seu Consultório", subtitle: "De consultório local a marca digital", description: "Landing pages, afiliados, agendamento online, pagamentos via Stripe e ferramentas de crescimento." },
];

const PATIENT_CINEMATIC_SLIDES: PresentationSlide[] = [
  { image_url: pSlide1, title: "Bem-vindo à sua nova jornada", subtitle: "Você não está sozinho", description: "O FitJourney acompanha sua evolução todos os dias com inteligência e cuidado." },
  { image_url: pSlide2, title: "Seu plano alimentar inteligente", subtitle: "Tudo pensado para seu objetivo", description: "Toque em qualquer refeição para ver ingredientes, modo de preparo e macros." },
  { image_url: pSlide3, title: "Acompanhe sua evolução", subtitle: "Visualize sua transformação", description: "Registre peso, medidas e fotos. Veja sua evolução semana após semana." },
  { image_url: pSlide4, title: "Missões e motivação diária", subtitle: "Pequenas vitórias, grandes resultados", description: "Complete tarefas, ganhe XP, mantenha sua sequência." },
  { image_url: pSlide5, title: "Suporte sempre disponível", subtitle: "Fale com seu nutricionista", description: "Chat em tempo real. Peça ajuda sempre que precisar." },
  { image_url: pSlide6, title: "Resultados reais", subtitle: "Evolução guiada por dados", description: "O sistema ajusta sua estratégia conforme sua resposta metabólica." },
  { image_url: pSlide7, title: "Checklist diário personalizado", subtitle: "Seu dia organizado", description: "Tarefas de nutrição, hidratação e hábitos saudáveis num só lugar." },
  { image_url: pSlide8, title: "Gamificação que transforma", subtitle: "Conquiste e evolua", description: "Medalhas, níveis e fases da sua jornada. Evolução nunca foi tão motivante." },
  { image_url: pSlide9, title: "Relatórios de progresso", subtitle: "Cada escolha conta", description: "Relatórios semanais mostram como cada decisão contribui para seu resultado." },
  { image_url: pSlide10, title: "Sua jornada começa agora", subtitle: "Tudo está pronto", description: "Siga o plano, confie no processo e veja a transformação acontecer." },
];

const STORAGE_KEY_PRO = "fj_presentation_pro_done";
const STORAGE_KEY_PAT = "fj_presentation_pat_done";
const CINEMATIC_PRO_KEY = "fj_cinematic_pro_done";
const CINEMATIC_PAT_KEY = "fj_cinematic_pat_done";

export default function SystemPresentation() {
  const { isNutritionist, isAdmin, isPatient } = useAuth();
  const navigate = useNavigate();
  const [activePresentation, setActivePresentation] = useState<"professional" | "patient" | null>(null);
  const [activeCinematic, setActiveCinematic] = useState<"professional" | "patient" | null>(null);
  const [showNeuralEntry, setShowNeuralEntry] = useState(false);
  const [proDone, setProDone] = useState(() => localStorage.getItem(STORAGE_KEY_PRO) === "true");
  const [patDone, setPatDone] = useState(() => localStorage.getItem(STORAGE_KEY_PAT) === "true");
  const [cinematicProDone, setCinematicProDone] = useState(() => localStorage.getItem(CINEMATIC_PRO_KEY) === "true");
  const [cinematicPatDone, setCinematicPatDone] = useState(() => localStorage.getItem(CINEMATIC_PAT_KEY) === "true");

  // 🧠 Guide Engine — dynamic enriched slides from feature_registry
  const { enrichedSlides: proLiveSlides, newFeatures: proNew } = useFeatureGuide("professional");
  const { enrichedSlides: patLiveSlides, newFeatures: patNew } = useFeatureGuide("patient");

  // Use live enriched slides if available, fallback to static
  const proSlides = proLiveSlides.length > 0 ? proLiveSlides : PROFESSIONAL_SLIDES;
  const patSlides = patLiveSlides.length > 0 ? patLiveSlides : PATIENT_SLIDES;

  const handleComplete = (type: "professional" | "patient") => {
    const key = type === "professional" ? STORAGE_KEY_PRO : STORAGE_KEY_PAT;
    localStorage.setItem(key, "true");
    if (type === "professional") setProDone(true);
    else setPatDone(true);
    setActivePresentation(null);
    toast.success("Apresentação concluída! 🎉");
  };

  const handleCinematicFinish = (type: "professional" | "patient") => {
    const key = type === "professional" ? CINEMATIC_PRO_KEY : CINEMATIC_PAT_KEY;
    localStorage.setItem(key, "true");
    if (type === "professional") setCinematicProDone(true);
    else setCinematicPatDone(true);
    setActiveCinematic(null);
    navigate("/");
    toast.success("Apresentação concluída! 🎉");
  };

  // Neural Entry demo overlay
  if (showNeuralEntry) {
    const userRole = isPatient ? "patient" : "professional";
    return (
      <NeuroEntryExperience
        dataReady={true}
        userRole={userRole as "patient" | "professional" | "admin"}
        onComplete={() => setShowNeuralEntry(false)}
        demoMode={true}
      />
    );
  }

  // Active standard presentation overlay
  if (activePresentation === "professional") {
    return <GuidedPresentation slides={proSlides} title="Guia do Profissional" onComplete={() => handleComplete("professional")} onSkip={() => setActivePresentation(null)} />;
  }
  if (activePresentation === "patient") {
    return <GuidedPresentation slides={patSlides} title="Guia do Paciente" onComplete={() => handleComplete("patient")} onSkip={() => setActivePresentation(null)} />;
  }

  // Cinematic fullscreen presentation
  if (activeCinematic === "professional") {
    return (
      <FullscreenPresentationViewer
        slides={PRO_CINEMATIC_SLIDES}
        mode="professional"
        onFinish={() => handleCinematicFinish("professional")}
        onSkip={() => setActiveCinematic(null)}
        finalCTAs={[
          { label: "Ir para Dashboard", icon: <LayoutDashboard className="w-4 h-4 mr-2" />, onClick: () => { handleCinematicFinish("professional"); } },
          { label: "Criar primeiro paciente", icon: <Users className="w-4 h-4 mr-2" />, onClick: () => { handleCinematicFinish("professional"); navigate("/patients"); } },
          { label: "Explorar editor de planos", icon: <Rocket className="w-4 h-4 mr-2" />, onClick: () => { handleCinematicFinish("professional"); navigate("/editor-v2"); } },
        ]}
      />
    );
  }
  if (activeCinematic === "patient") {
    return (
      <FullscreenPresentationViewer
        slides={PATIENT_CINEMATIC_SLIDES}
        mode="patient"
        onFinish={() => handleCinematicFinish("patient")}
        onSkip={() => setActiveCinematic(null)}
      />
    );
  }

  const isPro = isNutritionist || isAdmin;

  const cards = [
    ...(isPro ? [{
      key: "professional" as const,
      title: "Apresentação do Profissional",
      description: "Conheça o cockpit clínico, editor de planos, dashboard de resultados e o Motor FitJourney™.",
      icon: Stethoscope, gradient: "from-primary to-accent", done: proDone, slides: proSlides.length,
      newCount: proNew.length,
    }] : []),
    {
      key: "patient" as const,
      title: "Apresentação do Paciente",
      description: "Aprenda a seguir o plano alimentar, registrar progresso e interpretar seus resultados.",
      icon: User, gradient: "from-success to-info", done: patDone, slides: patSlides.length,
      newCount: patNew.length,
    },
  ];

  const cinematicCards = [
    ...(isPro ? [{
      key: "professional" as const,
      title: "Demo Profissional Cinemático",
      description: "Experiência imersiva premium estilo keynote — cockpit clínico, IA, automação e crescimento.",
      gradient: "from-emerald-600 to-emerald-900",
      done: cinematicProDone,
    }] : []),
    {
      key: "patient" as const,
      title: "Demo Paciente Cinemático",
      description: "Jornada guiada imersiva — plano alimentar, gamificação, evolução e suporte.",
      gradient: "from-emerald-500 to-teal-700",
      done: cinematicPatDone,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Aprender a Usar o FitJourney</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">Apresentações interativas e demos cinemáticas para dominar todas as funcionalidades</p>
          <div className="mt-4">
            <MagicSlideButton />
          </div>
        </motion.div>

        {/* Neural Entry Demo */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Neural Entry — Ativação do Sistema
          </h2>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="group hover:shadow-md transition-shadow border-primary/20">
              <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/30">
                  <Brain className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">Neural Boot Experience</h3>
                  <p className="text-sm text-muted-foreground">Tela de entrada premium que aparece após o login — cérebro neural, ondas de ativação e transição inteligente.</p>
                  <span className="text-xs text-muted-foreground mt-1 block">~3 segundos • Animação neural imersiva • Skip disponível</span>
                </div>
                <Button
                  onClick={() => setShowNeuralEntry(true)}
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30"
                >
                  <Play className="w-4 h-4 mr-1" /> Visualizar
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Cinematic demos — primary section */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-emerald-400" />
            Demo Visual Fullscreen
          </h2>
          <div className="grid gap-4">
            {cinematicCards.map((c, i) => (
              <motion.div key={c.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="group hover:shadow-md transition-shadow border-emerald-500/20">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <Clapperboard className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{c.title}</h3>
                        {c.done && <Badge variant="secondary" className="text-xs gap-1"><CheckCircle2 className="w-3 h-3" /> Concluído</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                      <span className="text-xs text-muted-foreground mt-1 block">10 slides imersivos • Estilo Keynote</span>
                    </div>
                    <Button
                      onClick={() => setActiveCinematic(c.key)}
                      variant={c.done ? "outline" : "default"}
                      className={!c.done ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}
                    >
                      {c.done ? <><RotateCcw className="w-4 h-4 mr-1" /> Rever</> : <><Play className="w-4 h-4 mr-1" /> Assistir</>}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Standard presentations */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Apresentações Interativas
          </h2>
          <div className="grid gap-4">
            {cards.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div key={c.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
                  <Card className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                        <Icon className="w-7 h-7 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{c.title}</h3>
                          {c.done && <Badge variant="secondary" className="text-xs gap-1"><CheckCircle2 className="w-3 h-3" /> Concluído</Badge>}
                          {c.newCount > 0 && <Badge className="text-xs gap-1 bg-accent text-accent-foreground"><Sparkles className="w-3 h-3" /> {c.newCount} novo{c.newCount > 1 ? "s" : ""}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{c.description}</p>
                        <span className="text-xs text-muted-foreground mt-1 block">{c.slides} slides interativos • Guia Vivo auto-atualizado</span>
                      </div>
                      <Button onClick={() => setActivePresentation(c.key)} variant={c.done ? "outline" : "default"} className="flex-shrink-0">
                        {c.done ? <><RotateCcw className="w-4 h-4 mr-1" /> Rever</> : <><Play className="w-4 h-4 mr-1" /> Iniciar</>}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Tour section */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            Tour Guiado Interativo
          </h2>
          <div className="grid gap-4">
            {isPro && (
              <Card className="group hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-md">
                    <Stethoscope className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">Tour do Profissional</h3>
                    <p className="text-sm text-muted-foreground">Tour contextual pelo dashboard com spotlight e tooltips.</p>
                    <span className="text-xs text-muted-foreground mt-1 block">{PROFESSIONAL_TOUR_STEPS.length} passos interativos</span>
                  </div>
                  <Button onClick={() => { localStorage.removeItem("tour_professional_completed"); navigate("/"); toast.info("Tour será iniciado no dashboard!"); }} variant="outline" className="flex-shrink-0">
                    <Play className="w-4 h-4 mr-1" /> Iniciar Tour
                  </Button>
                </CardContent>
              </Card>
            )}
            <Card className="group hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success to-info flex items-center justify-center flex-shrink-0 shadow-md">
                  <User className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">Tour do Paciente</h3>
                  <p className="text-sm text-muted-foreground">Tour contextual pelo app do paciente.</p>
                  <span className="text-xs text-muted-foreground mt-1 block">{PATIENT_TOUR_STEPS.length} passos interativos</span>
                </div>
                <Button onClick={() => { localStorage.removeItem("tour_patient_completed"); navigate("/"); toast.info("Tour será iniciado no dashboard!"); }} variant="outline" className="flex-shrink-0">
                  <Play className="w-4 h-4 mr-1" /> Iniciar Tour
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
