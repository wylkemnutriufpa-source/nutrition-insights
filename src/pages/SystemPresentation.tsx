import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GuidedPresentation from "@/components/common/GuidedPresentation";
import GuidedTour, { PROFESSIONAL_TOUR_STEPS, PATIENT_TOUR_STEPS } from "@/components/common/GuidedTour";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { PROFESSIONAL_SLIDES, PATIENT_SLIDES } from "@/lib/presentationSlides";
import { GraduationCap, Stethoscope, User, Play, CheckCircle2, RotateCcw, Clapperboard, Map } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY_PRO = "fj_presentation_pro_done";
const STORAGE_KEY_PAT = "fj_presentation_pat_done";

export default function SystemPresentation() {
  const { isNutritionist, isAdmin, isPatient } = useAuth();
  const navigate = useNavigate();
  const [activePresentation, setActivePresentation] = useState<"professional" | "patient" | null>(null);
  const [proDone, setProDone] = useState(() => localStorage.getItem(STORAGE_KEY_PRO) === "true");
  const [patDone, setPatDone] = useState(() => localStorage.getItem(STORAGE_KEY_PAT) === "true");

  const handleComplete = (type: "professional" | "patient") => {
    const key = type === "professional" ? STORAGE_KEY_PRO : STORAGE_KEY_PAT;
    localStorage.setItem(key, "true");
    if (type === "professional") setProDone(true);
    else setPatDone(true);
    setActivePresentation(null);
    toast.success("Apresentação concluída! 🎉");
  };

  // Active presentation overlay
  if (activePresentation === "professional") {
    return (
      <GuidedPresentation
        slides={PROFESSIONAL_SLIDES}
        title="Guia do Profissional"
        onComplete={() => handleComplete("professional")}
        onSkip={() => setActivePresentation(null)}
      />
    );
  }
  if (activePresentation === "patient") {
    return (
      <GuidedPresentation
        slides={PATIENT_SLIDES}
        title="Guia do Paciente"
        onComplete={() => handleComplete("patient")}
        onSkip={() => setActivePresentation(null)}
      />
    );
  }

  const isPro = isNutritionist || isAdmin;

  const cards = [
    ...(isPro
      ? [
          {
            key: "professional" as const,
            title: "Apresentação do Profissional",
            description: "Conheça o cockpit clínico, editor de planos, dashboard de resultados e o Motor FitJourney™.",
            icon: Stethoscope,
            gradient: "from-primary to-accent",
            done: proDone,
            slides: PROFESSIONAL_SLIDES.length,
          },
        ]
      : []),
    {
      key: "patient" as const,
      title: "Apresentação do Paciente",
      description: "Aprenda a seguir o plano alimentar, registrar progresso e interpretar seus resultados.",
      icon: User,
      gradient: "from-success to-info",
      done: patDone,
      slides: PATIENT_SLIDES.length,
    },
  ];

  const cinematicCards = [
    ...(isPro
      ? [
          {
            title: "Onboarding Profissional Cinemático",
            description: "Experiência imersiva premium com 10 slides — cockpit clínico, IA, automação e crescimento.",
            route: "/onboarding-profissional",
            gradient: "from-emerald-600 to-emerald-900",
          },
        ]
      : []),
    {
      title: "Onboarding do Paciente Cinemático",
      description: "Jornada guiada imersiva com 10 slides — plano alimentar, gamificação, evolução e suporte.",
      route: "/onboarding-paciente",
      gradient: "from-emerald-500 to-teal-700",
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Aprender a Usar o FitJourney
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Apresentações interativas para dominar todas as funcionalidades
          </p>
        </motion.div>

        {/* Standard presentation cards */}
        <div className="grid gap-4">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <Icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{c.title}</h3>
                        {c.done && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Concluído
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {c.slides} slides interativos
                      </span>
                    </div>
                    <Button
                      onClick={() => setActivePresentation(c.key)}
                      variant={c.done ? "outline" : "default"}
                      className="flex-shrink-0"
                    >
                      {c.done ? (
                        <>
                          <RotateCcw className="w-4 h-4 mr-1" /> Rever
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" /> Iniciar
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Cinematic onboarding cards */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-emerald-400" />
            Experiências Cinemáticas
          </h2>
          <div className="grid gap-4">
            {cinematicCards.map((c, i) => (
              <motion.div
                key={c.route}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <Card className="group hover:shadow-md transition-shadow border-emerald-500/20">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <Clapperboard className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg">{c.title}</h3>
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                      <span className="text-xs text-muted-foreground mt-1 block">10 slides imersivos</span>
                    </div>
                    <Button
                      onClick={() => navigate(c.route)}
                      variant="outline"
                      className="flex-shrink-0 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Play className="w-4 h-4 mr-1" /> Assistir
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tour Guiado section */}
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
                    <p className="text-sm text-muted-foreground">Tour contextual pelo dashboard com spotlight e tooltips — aprenda usando.</p>
                    <span className="text-xs text-muted-foreground mt-1 block">{PROFESSIONAL_TOUR_STEPS.length} passos interativos</span>
                  </div>
                  <Button
                    onClick={() => {
                      localStorage.removeItem("tour_professional_completed");
                      navigate("/");
                      toast.info("Tour será iniciado no dashboard!");
                    }}
                    variant="outline"
                    className="flex-shrink-0"
                  >
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
                  <p className="text-sm text-muted-foreground">Tour contextual pelo app do paciente — checklist, plano, gamificação e chat.</p>
                  <span className="text-xs text-muted-foreground mt-1 block">{PATIENT_TOUR_STEPS.length} passos interativos</span>
                </div>
                <Button
                  onClick={() => {
                    localStorage.removeItem("tour_patient_completed");
                    navigate("/");
                    toast.info("Tour será iniciado no dashboard!");
                  }}
                  variant="outline"
                  className="flex-shrink-0"
                >
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
