import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, UtensilsCrossed, Sparkles, CheckCircle2, ArrowRight,
  Building2, Palette, Rocket, GraduationCap, Dumbbell, Apple,
  Heart, TrendingUp, ClipboardCheck
} from "lucide-react";
import { toast } from "sonner";

const professionalSteps = [
  {
    id: "welcome",
    title: "Bem-vindo ao FitJourney! 🎉",
    subtitle: "Vamos configurar seu consultório em 3 passos rápidos.",
    icon: Sparkles,
  },
  {
    id: "clinic",
    title: "Seu Consultório",
    subtitle: "Como seus pacientes vão conhecer você?",
    icon: Building2,
  },
  {
    id: "first-steps",
    title: "Próximos Passos",
    subtitle: "Aqui está o que você pode fazer agora:",
    icon: Rocket,
  },
];

const patientSteps = [
  {
    id: "welcome",
    title: "Bem-vindo ao FitJourney! 🎉",
    subtitle: "Sua jornada de saúde começa aqui.",
    icon: Sparkles,
  },
  {
    id: "features",
    title: "O que você pode fazer",
    subtitle: "Conheça as ferramentas disponíveis:",
    icon: GraduationCap,
  },
  {
    id: "start",
    title: "Comece Agora!",
    subtitle: "Dê o primeiro passo na sua jornada:",
    icon: Rocket,
  },
];

// Key in localStorage to track onboarding dismissal (not completion)
const ONBOARDING_DISMISSED_KEY = "fitjourney_onboarding_dismissed";

export function useOnboardingNotification() {
  const { user, isNutritionist, isPersonal, isPatient } = useAuth();
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (!user || (!isNutritionist && !isPersonal && !isPatient)) return;

    const checkOnboarding = async () => {
      const dismissedRaw = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
      if (dismissedRaw) {
        const dismissed = JSON.parse(dismissedRaw);
        if (dismissed[user.id]) {
          // Check if actually completed
          if (isNutritionist || isPersonal) {
            const { data } = await supabase
              .from("professional_profiles")
              .select("onboarding_completed")
              .eq("user_id", user.id)
              .single();
            setShowBadge(data ? !data.onboarding_completed : true);
          } else {
            const completed = dismissed[user.id] === "completed";
            setShowBadge(!completed);
          }
          return;
        }
      }
      setShowBadge(true);
    };
    checkOnboarding();
  }, [user, isNutritionist, isPersonal, isPatient]);

  return { showBadge, clearBadge: () => setShowBadge(false) };
}

export let openOnboardingManually: () => void = () => {};

export default function OnboardingWizard() {
  const { user, profile, isNutritionist, isPersonal, isPatient, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [clinicName, setClinicName] = useState("");
  const [saving, setSaving] = useState(false);

  const isProfessional = isNutritionist || isPersonal;
  const steps = isProfessional ? professionalSteps : patientSteps;

  // Expose manual open function
  useEffect(() => {
    openOnboardingManually = () => {
      setStep(0);
      setOpen(true);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isProfessional && !isPatient) return;

    const checkOnboarding = async () => {
      if (isProfessional) {
        const { data } = await supabase
          .from("professional_profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .single();

        if (data && !data.onboarding_completed) {
          setOpen(true);
        } else if (!data) {
          await supabase.from("professional_profiles").insert({
            user_id: user.id,
            onboarding_completed: false,
          });
          setOpen(true);
        }
      } else if (isPatient) {
        // For patients: use localStorage tracking
        const dismissedRaw = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
        const dismissed = dismissedRaw ? JSON.parse(dismissedRaw) : {};
        if (!dismissed[user.id] || dismissed[user.id] !== "completed") {
          setOpen(true);
        }
      }
    };
    checkOnboarding();
  }, [user, isProfessional, isPatient]);

  const handleDismiss = () => {
    // Just close, don't mark complete - badge will persist
    setOpen(false);
  };

  const handleNext = async () => {
    if (isProfessional && step === 1 && clinicName.trim()) {
      setSaving(true);
      await supabase
        .from("professional_profiles")
        .update({ clinic_name: clinicName.trim() })
        .eq("user_id", user!.id);
      setSaving(false);
    }
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleFinish = async () => {
    if (isProfessional) {
      await supabase
        .from("professional_profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", user!.id);
    }
    // Mark completed in localStorage
    const dismissedRaw = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    const dismissed = dismissedRaw ? JSON.parse(dismissedRaw) : {};
    dismissed[user!.id] = "completed";
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, JSON.stringify(dismissed));

    setOpen(false);
    toast.success("Onboarding concluído! Explore o sistema 🚀");
    if (isProfessional) await refreshProfile();
  };

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleDismiss(); else setOpen(true); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Onboarding</DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <StepIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">{currentStep.title}</h3>
              <p className="text-muted-foreground text-sm">{currentStep.subtitle}</p>
            </div>

            {/* Professional Steps */}
            {isProfessional && step === 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Users, label: "Cadastre pacientes", desc: "Com 1 clique" },
                    { icon: UtensilsCrossed, label: "Crie planos", desc: "Com IA integrada" },
                    { icon: Palette, label: "Personalize", desc: "Sua marca" },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-3 rounded-xl bg-muted/50 space-y-1.5">
                      <item.icon className="w-5 h-5 mx-auto text-primary" />
                      <p className="text-xs font-semibold">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isProfessional && step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clinic-name">Nome do Consultório / Clínica</Label>
                  <Input
                    id="clinic-name"
                    placeholder="Ex: Nutri Vida Clínica"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Aparecerá no perfil público e para seus pacientes.
                  </p>
                </div>
              </div>
            )}

            {isProfessional && step === 2 && (
              <div className="space-y-3">
                {[
                  { icon: Users, label: "Cadastrar primeiro paciente", path: "/patients" },
                  { icon: UtensilsCrossed, label: "Criar um plano alimentar", path: "/meal-plans" },
                  { icon: Sparkles, label: "Explorar funcionalidades com IA", path: "/professional-guide" },
                ].map((action) => (
                  <div
                    key={action.label}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <action.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.label}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                ))}
              </div>
            )}

            {/* Patient Steps */}
            {isPatient && step === 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Apple, label: "Refeições", desc: "Registre suas meals" },
                    { icon: TrendingUp, label: "Progresso", desc: "Acompanhe evolução" },
                    { icon: Heart, label: "Check-ins", desc: "Feedback semanal" },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-3 rounded-xl bg-muted/50 space-y-1.5">
                      <item.icon className="w-5 h-5 mx-auto text-primary" />
                      <p className="text-xs font-semibold">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isPatient && step === 1 && (
              <div className="space-y-3">
                {[
                  { icon: ClipboardCheck, label: "Checklist Diário", desc: "Acompanhe suas tarefas do dia" },
                  { icon: UtensilsCrossed, label: "Plano Alimentar", desc: "Veja seu plano e marque refeições" },
                  { icon: Dumbbell, label: "Treinos", desc: "Registre seus exercícios" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isPatient && step === 2 && (
              <div className="space-y-3">
                {[
                  { icon: Heart, label: "Preencha sua anamnese", desc: "Ajude seu nutricionista a te conhecer" },
                  { icon: Apple, label: "Registre sua primeira refeição", desc: "Comece a acompanhar sua dieta" },
                  { icon: ClipboardCheck, label: "Complete seu checklist", desc: "Ganhe pontos e suba no ranking" },
                ].map((action) => (
                  <div
                    key={action.label}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <action.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
                  Voltar
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button onClick={handleNext} disabled={saving} className="flex-1 gap-2">
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleFinish} className="flex-1 gap-2 gradient-primary">
                  Começar a Usar! <Rocket className="w-4 h-4" />
                </Button>
              )}
            </div>

            {step === 0 && (
              <button
                onClick={handleDismiss}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver depois
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
