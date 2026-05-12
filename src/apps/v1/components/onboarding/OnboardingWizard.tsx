import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, UtensilsCrossed, Sparkles, CheckCircle2, ArrowRight,
  Building2, Palette, Rocket, GraduationCap, Dumbbell, Apple,
  Heart, TrendingUp, ClipboardCheck, MessageSquare, CreditCard,
  Globe, BookOpen, Scale, Trophy, Camera, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// ─── Step definitions per role ───
const professionalSteps = [
  { id: "welcome", title: "Bem-vindo ao FitJourney! 🎉", subtitle: "Vamos configurar seu consultório passo a passo.", icon: Sparkles },
  { id: "profile", title: "Complete seu Perfil", subtitle: "Informações básicas para seus pacientes.", icon: Building2 },
  { id: "branding", title: "Identidade Visual", subtitle: "Personalize a experiência dos seus pacientes.", icon: Palette },
  { id: "first-patient", title: "Primeiro Paciente", subtitle: "Cadastre ou importe seu primeiro paciente.", icon: Users },
  { id: "first-protocol", title: "Protocolos e Programas", subtitle: "Configure seu primeiro protocolo ou programa.", icon: FileText },
  { id: "public-profile", title: "Perfil Público e Agendamento", subtitle: "Configure sua página pública e link de agendamento.", icon: Globe },
  { id: "ready", title: "Tudo Pronto! 🚀", subtitle: "Você está pronto para usar o FitJourney.", icon: Rocket },
];

const patientSteps = [
  { id: "welcome", title: "Bem-vindo ao FitJourney! 🎉", subtitle: "Sua jornada de saúde começa aqui.", icon: Sparkles },
  { id: "profile", title: "Complete seu Perfil", subtitle: "Ajude seu nutricionista a te conhecer.", icon: Heart },
  { id: "anamnesis", title: "Anamnese Nutricional", subtitle: "Responda o questionário para um plano personalizado.", icon: ClipboardCheck },
  { id: "body-data", title: "Dados Corporais", subtitle: "Informe peso e altura para acompanhamento.", icon: Scale },
  { id: "features", title: "Suas Ferramentas", subtitle: "Conheça o que está disponível para você.", icon: GraduationCap },
  { id: "ready", title: "Comece Agora! 🎯", subtitle: "Dê o primeiro passo na sua jornada.", icon: Rocket },
];

const personalSteps = [
  { id: "welcome", title: "Bem-vindo ao FitJourney! 💪", subtitle: "Plataforma completa para personal trainers.", icon: Sparkles },
  { id: "profile", title: "Complete seu Perfil", subtitle: "Informações sobre você como profissional.", icon: Building2 },
  { id: "first-student", title: "Primeiro Aluno", subtitle: "Cadastre seu primeiro aluno.", icon: Users },
  { id: "workouts", title: "Monte um Treino", subtitle: "Crie sua primeira rotina de exercícios.", icon: Dumbbell },
  { id: "ready", title: "Tudo Pronto! 🚀", subtitle: "Comece a treinar!", icon: Rocket },
];

// Onboarding progress persistence
const ONBOARDING_KEY = "fitjourney_onboarding_progress";
const ONBOARDING_DISMISSED_KEY = "fitjourney_onboarding_dismissed";

interface OnboardingProgress {
  completedSteps: string[];
  lastStep: number;
}

function getProgress(userId: string): OnboardingProgress {
  try {
    const raw = localStorage.getItem(`${ONBOARDING_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : { completedSteps: [], lastStep: 0 };
  } catch { return { completedSteps: [], lastStep: 0 }; }
}

function saveProgress(userId: string, progress: OnboardingProgress) {
  localStorage.setItem(`${ONBOARDING_KEY}_${userId}`, JSON.stringify(progress));
}

// ─── Notification hook ───
export function useOnboardingNotification() {
  const { user, isNutritionist, isPersonal, isPatient } = useAuth();
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (!user || (!isNutritionist && !isPersonal && !isPatient)) return;
    const checkOnboarding = async () => {
      const dismissedRaw = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
      if (dismissedRaw) {
        const dismissed = JSON.parse(dismissedRaw);
        if (dismissed[user.id] === "completed") { setShowBadge(false); return; }
      }
      // Check if professional has completed onboarding
      if (isNutritionist || isPersonal) {
        const { data } = await supabase
          .from("professional_profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();
        setShowBadge(data ? !data.onboarding_completed : true);
      } else {
        setShowBadge(true);
      }
    };
    checkOnboarding();
  }, [user, isNutritionist, isPersonal, isPatient]);

  return { showBadge, clearBadge: () => setShowBadge(false) };
}

export let openOnboardingManually: () => void = () => {};

// ─── Checklist item ───
function ChecklistItem({ label, desc, icon: Icon, completed, onClick, path }: {
  label: string; desc: string; icon: any; completed: boolean; onClick?: () => void; path?: string;
}) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => { onClick?.(); if (path) navigate(path); }}
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer touch-manipulation ${
        completed ? "bg-success/5 border border-success/20" : "bg-muted/50 hover:bg-muted border border-transparent"
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        completed ? "bg-success/10" : "bg-primary/10"
      }`}>
        <Icon className={`w-5 h-5 ${completed ? "text-success" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${completed ? "line-through text-muted-foreground" : ""}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {completed ? (
        <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
      ) : (
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
    </div>
  );
}

export default function OnboardingWizard() {
  const { user, profile, isNutritionist, isPersonal, isPatient, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [clinicName, setClinicName] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgressState] = useState<OnboardingProgress>({ completedSteps: [], lastStep: 0 });

  const isProfessional = isNutritionist || isPersonal;
  const steps = isPersonal ? personalSteps : isProfessional ? professionalSteps : patientSteps;
  const completionPercent = steps.length > 0 ? Math.round((progress.completedSteps.length / steps.length) * 100) : 0;

  useEffect(() => {
    openOnboardingManually = () => { setStep(0); setOpen(true); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const saved = getProgress(user.id);
    setProgressState(saved);
    setStep(saved.lastStep);

    if (!isProfessional && !isPatient) return;

    const checkOnboarding = async () => {
      if (isProfessional) {
        const { data } = await supabase
          .from("professional_profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data && !data.onboarding_completed) setOpen(true);
        else if (!data) {
          await supabase.from("professional_profiles").insert({ user_id: user.id, onboarding_completed: false });
          setOpen(true);
        }
      } else if (isPatient) {
        const dismissedRaw = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
        const dismissed = dismissedRaw ? JSON.parse(dismissedRaw) : {};
        if (!dismissed[user.id] || dismissed[user.id] !== "completed") setOpen(true);
      }
    };
    checkOnboarding();
  }, [user, isProfessional, isPatient]);

  const markStepComplete = (stepId: string) => {
    if (!user) return;
    const updated = {
      ...progress,
      completedSteps: [...new Set([...progress.completedSteps, stepId])],
      lastStep: step,
    };
    setProgressState(updated);
    saveProgress(user.id, updated);
  };

  const handleDismiss = () => {
    if (user) {
      const updated = { ...progress, lastStep: step };
      saveProgress(user.id, updated);
    }
    setOpen(false);
  };

  const handleNext = async () => {
    markStepComplete(steps[step].id);
    if (isProfessional && steps[step].id === "profile" && clinicName.trim()) {
      setSaving(true);
      await supabase.from("professional_profiles").update({ clinic_name: clinicName.trim() }).eq("user_id", user!.id);
      setSaving(false);
    }
    if (step < steps.length - 1) setStep(s => s + 1);
  };

  const handleFinish = async () => {
    markStepComplete(steps[step].id);
    if (isProfessional) {
      await supabase.from("professional_profiles").update({ onboarding_completed: true }).eq("user_id", user!.id);
    }
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
  const isStepCompleted = progress.completedSteps.includes(currentStep.id);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleDismiss(); else setOpen(true); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Onboarding</DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso do setup</span>
            <span className="font-semibold text-primary">{completionPercent}%</span>
          </div>
          <Progress value={completionPercent} className="h-2" />
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  progress.completedSteps.includes(s.id) ? "bg-success" : i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <StepIcon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold">{currentStep.title}</h3>
              <p className="text-muted-foreground text-sm">{currentStep.subtitle}</p>
            </div>

            {/* ─── Professional: Welcome ─── */}
            {isProfessional && currentStep.id === "welcome" && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Users, label: "Pacientes", desc: "Gestão completa" },
                  { icon: UtensilsCrossed, label: "Planos", desc: "IA integrada" },
                  { icon: TrendingUp, label: "Analytics", desc: "Dados clínicos" },
                ].map(item => (
                  <div key={item.label} className="text-center p-3 rounded-xl bg-muted/50 space-y-1.5">
                    <item.icon className="w-5 h-5 mx-auto text-primary" />
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Professional: Profile */}
            {isProfessional && currentStep.id === "profile" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clinic-name">Nome do Consultório / Clínica</Label>
                  <Input id="clinic-name" placeholder="Ex: Nutri Vida Clínica" value={clinicName} onChange={e => setClinicName(e.target.value)} className="mt-1.5" />
                  <p className="text-xs text-muted-foreground mt-1">Aparecerá no perfil público.</p>
                </div>
              </div>
            )}

            {/* Professional: Branding */}
            {isProfessional && currentStep.id === "branding" && (
              <div className="space-y-3">
                <ChecklistItem icon={Palette} label="Personalizar cores e logo" desc="Configure sua identidade visual" path="/branding" completed={false} />
                <ChecklistItem icon={Globe} label="Criar perfil público" desc="Compartilhe com pacientes" path="/my-public-profile" completed={false} />
              </div>
            )}

            {/* Professional: First Patient */}
            {isProfessional && currentStep.id === "first-patient" && (
              <div className="space-y-3">
                <ChecklistItem icon={Users} label="Cadastrar paciente manualmente" desc="Com email e nome" path="/patients" completed={false} />
                <ChecklistItem icon={FileText} label="Importar pacientes via CSV" desc="Migre de outros sistemas" path="/import-patients" completed={false} />
              </div>
            )}

            {/* Professional: Protocol */}
            {isProfessional && currentStep.id === "first-protocol" && (
              <div className="space-y-3">
                <ChecklistItem icon={FileText} label="Criar protocolo" desc="Defina tarefas e acompanhamento" path="/protocols" completed={false} />
                <ChecklistItem icon={Rocket} label="Criar programa nutricional" desc="Programas completos com fases" path="/programs" completed={false} />
              </div>
            )}

            {/* Professional: Public */}
            {isProfessional && currentStep.id === "public-profile" && (
              <div className="space-y-3">
                <ChecklistItem icon={Globe} label="Configurar página pública" desc="Link compartilhável para pacientes" path="/my-public-profile" completed={false} />
                <ChecklistItem icon={CreditCard} label="Conhecer planos e assinatura" desc="Veja os recursos disponíveis" path="/pricing" completed={false} />
              </div>
            )}

            {/* Professional: Ready */}
            {isProfessional && currentStep.id === "ready" && (
              <div className="space-y-3">
                {[
                  { icon: Users, label: "Ver seus pacientes", path: "/patients" },
                  { icon: MessageSquare, label: "Acessar chat", path: "/chat" },
                  { icon: BookOpen, label: "Guia do profissional", path: "/professional-guide" },
                ].map(action => (
                  <ChecklistItem key={action.label} icon={action.icon} label={action.label} desc="" path={action.path} completed={false} onClick={() => setOpen(false)} />
                ))}
              </div>
            )}

            {/* ─── Patient: Welcome ─── */}
            {isPatient && currentStep.id === "welcome" && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Apple, label: "Refeições", desc: "Registre suas meals" },
                  { icon: TrendingUp, label: "Progresso", desc: "Evolução diária" },
                  { icon: Heart, label: "Check-ins", desc: "Feedback semanal" },
                ].map(item => (
                  <div key={item.label} className="text-center p-3 rounded-xl bg-muted/50 space-y-1.5">
                    <item.icon className="w-5 h-5 mx-auto text-primary" />
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Patient: Profile */}
            {isPatient && currentStep.id === "profile" && (
              <div className="space-y-3">
                <ChecklistItem icon={Heart} label="Atualizar nome e foto" desc="Personalize seu perfil" path="/settings" completed={false} />
              </div>
            )}

            {/* Patient: Anamnesis */}
            {isPatient && currentStep.id === "anamnesis" && (
              <div className="space-y-3">
                <ChecklistItem icon={ClipboardCheck} label="Preencher anamnese" desc="IA gera insights personalizados" path="/anamnesis" completed={false} />
                <p className="text-xs text-muted-foreground text-center">A anamnese permite que seu nutricionista crie um plano sob medida.</p>
              </div>
            )}

            {/* Patient: Body data */}
            {isPatient && currentStep.id === "body-data" && (
              <div className="space-y-3">
                <ChecklistItem icon={Scale} label="Registrar peso e altura" desc="Base para metas e evolução" path="/settings" completed={false} />
                <ChecklistItem icon={Camera} label="Fotos de evolução" desc="Opcional — acompanhe visualmente" path="/checkin" completed={false} />
              </div>
            )}

            {/* Patient: Features */}
            {isPatient && currentStep.id === "features" && (
              <div className="space-y-3">
                {[
                  { icon: ClipboardCheck, label: "Checklist Diário", desc: "Tarefas comportamentais" },
                  { icon: UtensilsCrossed, label: "Plano Alimentar", desc: "Acompanhe suas refeições" },
                  { icon: Trophy, label: "Ranking & Gamificação", desc: "Ganhe pontos e suba posições" },
                  { icon: MessageSquare, label: "Chat com nutricionista", desc: "Comunicação direta" },
                ].map(item => (
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

            {/* Patient: Ready */}
            {isPatient && currentStep.id === "ready" && (
              <div className="space-y-3">
                <ChecklistItem icon={ClipboardCheck} label="Completar checklist de hoje" desc="Ganhe XP e suba no ranking" path="/checklist" completed={false} onClick={() => setOpen(false)} />
                <ChecklistItem icon={Apple} label="Registrar primeira refeição" desc="Comece a acompanhar sua dieta" path="/meals" completed={false} onClick={() => setOpen(false)} />
                <ChecklistItem icon={Heart} label="Preencher anamnese" desc="Ajude seu nutricionista" path="/anamnesis" completed={false} onClick={() => setOpen(false)} />
              </div>
            )}

            {/* ─── Personal Trainer steps ─── */}
            {isPersonal && currentStep.id === "welcome" && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Dumbbell, label: "Treinos", desc: "Crie rotinas" },
                  { icon: Users, label: "Alunos", desc: "Gestão completa" },
                  { icon: TrendingUp, label: "Progresso", desc: "Acompanhe evolução" },
                ].map(item => (
                  <div key={item.label} className="text-center p-3 rounded-xl bg-muted/50 space-y-1.5">
                    <item.icon className="w-5 h-5 mx-auto text-primary" />
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {isPersonal && currentStep.id === "profile" && (
              <div className="space-y-3">
                <ChecklistItem icon={Building2} label="Completar perfil" desc="Nome, especialidade, foto" path="/settings" completed={false} />
              </div>
            )}

            {isPersonal && currentStep.id === "first-student" && (
              <div className="space-y-3">
                <ChecklistItem icon={Users} label="Cadastrar primeiro aluno" desc="Comece pelo nome e email" path="/personal/students" completed={false} />
              </div>
            )}

            {isPersonal && currentStep.id === "workouts" && (
              <div className="space-y-3">
                <ChecklistItem icon={Dumbbell} label="Criar rotina de treino" desc="Monte exercícios e séries" path="/personal/workouts" completed={false} />
              </div>
            )}

            {isPersonal && currentStep.id === "ready" && (
              <div className="space-y-3">
                <ChecklistItem icon={Users} label="Ver seus alunos" path="/personal/students" desc="" completed={false} onClick={() => setOpen(false)} />
                <ChecklistItem icon={Dumbbell} label="Criar treino" path="/personal/workouts" desc="" completed={false} onClick={() => setOpen(false)} />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
                  Voltar
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button onClick={handleNext} disabled={saving} className="flex-1 gap-2">
                  {saving ? "Salvando..." : "Continuar"} <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleFinish} className="flex-1 gap-2 gradient-primary">
                  Começar a Usar! <Rocket className="w-4 h-4" />
                </Button>
              )}
            </div>

            {step === 0 && (
              <button onClick={handleDismiss} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                Ver depois
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
