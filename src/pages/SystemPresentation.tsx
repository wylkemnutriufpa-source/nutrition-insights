import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GuidedPresentation from "@/components/common/GuidedPresentation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { PROFESSIONAL_SLIDES, PATIENT_SLIDES } from "@/lib/presentationSlides";
import { GraduationCap, Stethoscope, User, Play, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

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

        {/* Cards */}
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
      </div>
    </DashboardLayout>
  );
}
