import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Button } from "@v1/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, ClipboardList, Activity,
  Utensils, CheckCircle2, User, Loader2
} from "lucide-react";
import InOfficeStepPatient from "@v1/components/in-office/InOfficeStepPatient";
import InOfficeStepAnamnesis from "@v1/components/in-office/InOfficeStepAnamnesis";
import InOfficeStepAssessment from "@v1/components/in-office/InOfficeStepAssessment";
import InOfficeStepMealPlan from "@v1/components/in-office/InOfficeStepMealPlan";
import InOfficeStepFinalize from "@v1/components/in-office/InOfficeStepFinalize";
import { resolvePatientIdentity } from "@v1/lib/onboardingPlanResolver";

const STEPS = [
  { id: 1, label: "Cadastro", icon: User },
  { id: 2, label: "Anamnese", icon: ClipboardList },
  { id: 3, label: "Avaliação", icon: Activity },
  { id: 4, label: "Plano", icon: Utensils },
  { id: 5, label: "Finalizar", icon: CheckCircle2 },
];

export default function InOfficeWizard() {
  const { patientId: rawPatientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState("");
  const [sessionData, setSessionData] = useState<any>(null);
  const [resolvedPatientId, setResolvedPatientId] = useState<string | null>(null);

  // Load or create session
  useEffect(() => {
    if (!rawPatientId || !user?.id) return;
    (async () => {
      setLoading(true);
      
      // Resolve IDs (id vs user_id)
      const identity = await resolvePatientIdentity(rawPatientId);
      const patientId = identity.canonicalId;
      setResolvedPatientId(patientId);

      // Load patient name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", patientId)
        .maybeSingle();
      if (profile) setPatientName(profile.full_name || "Paciente");

      // Find existing active session
      const { data: existing } = await supabase
        .from("in_office_sessions" as any)
        .select("*")
        .eq("patient_id", patientId)
        .eq("nutritionist_id", user.id)
        .is("completed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setSessionId((existing as any).id);
        setStep((existing as any).current_step || 1);
        setSessionData(existing);
      } else {
        // Get tenant
        const { data: np } = await supabase
          .from("nutritionist_patients")
          .select("tenant_id")
          .eq("patient_id", patientId)
          .eq("nutritionist_id", user.id)
          .maybeSingle();

        const tenantId = np?.tenant_id;
        if (!tenantId) {
          toast.error("Paciente não vinculado");
          navigate("/patients");
          return;
        }

        const { data: newSession, error } = await supabase
          .from("in_office_sessions" as any)
          .insert({
            patient_id: patientId,
            nutritionist_id: user.id,
            tenant_id: tenantId,
            current_step: 1,
          })
          .select()
          .single();

        if (error) {
          toast.error("Erro ao criar sessão");
          console.error(error);
        } else {
          setSessionId((newSession as any).id);
          setSessionData(newSession);
        }
      }
      setLoading(false);
    })();
  }, [rawPatientId, user?.id]);

  // Save step progress
  const saveStep = useCallback(async (newStep: number, extras?: Record<string, any>) => {
    if (!sessionId) return;
    await supabase
      .from("in_office_sessions" as any)
      .update({ current_step: newStep, ...extras } as any)
      .eq("id", sessionId);
  }, [sessionId]);

  const goNext = useCallback(async () => {
    const current = step;
    const next = Math.min(step + 1, 5);
    
    // Set step immediately for UI responsiveness
    setStep(next);
    
    // Side effects per step
    try {
      if (current === 4) {
        // Mark meal plan as completed when leaving step 4
        await supabase.from("in_office_sessions" as any)
          .update({ meal_plan_completed: true, current_step: next } as any)
          .eq("id", sessionId);
      } else {
        await saveStep(next);
      }
    } catch (e) {
      console.error("Erro ao salvar progresso:", e);
      toast.error("Erro ao salvar progresso. Verifique sua conexão.");
    }
  }, [step, saveStep, sessionId]);

  const goPrev = useCallback(async () => {
    const prev = Math.max(step - 1, 1);
    setStep(prev);
    await saveStep(prev);
  }, [step, saveStep]);

  const completeSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    await supabase
      .from("in_office_sessions" as any)
      .update({ 
        completed_at: new Date().toISOString(), 
        current_step: 5,
        meal_plan_completed: true 
      } as any)
      .eq("id", sessionId);
    toast.success("Sessão presencial finalizada!");
    navigate(`/patients/${resolvedPatientId || rawPatientId}`);
  }, [sessionId, resolvedPatientId, rawPatientId, navigate]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/patients/${resolvedPatientId || rawPatientId}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-display font-bold">Modo Consultório</h1>
              <p className="text-xs text-muted-foreground">{patientName} — Atendimento presencial</p>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            Presencial
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  onClick={() => { setStep(s.id); saveStep(s.id); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all w-full
                    ${isActive ? "bg-primary text-primary-foreground shadow-md" : ""}
                    ${isDone ? "bg-primary/10 text-primary" : ""}
                    ${!isActive && !isDone ? "bg-muted text-muted-foreground" : ""}
                  `}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`h-px w-4 mx-1 ${isDone ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && <InOfficeStepPatient patientId={resolvedPatientId!} onNext={goNext} />}
            {step === 2 && <InOfficeStepAnamnesis patientId={resolvedPatientId!} onNext={goNext} onPrev={goPrev} sessionId={sessionId!} />}
            {step === 3 && <InOfficeStepAssessment patientId={resolvedPatientId!} onNext={goNext} onPrev={goPrev} sessionId={sessionId!} />}
            {step === 4 && <InOfficeStepMealPlan patientId={resolvedPatientId!} onNext={goNext} onPrev={goPrev} sessionId={sessionId!} />}
            {step === 5 && <InOfficeStepFinalize patientId={resolvedPatientId!} onPrev={goPrev} onComplete={completeSession} sessionId={sessionId!} />}
          </motion.div>
        </AnimatePresence>

        {/* Nav - Fixed at bottom for accessibility */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 -mx-4 sm:mx-0 sm:rounded-b-2xl shadow-lg flex justify-between items-center z-10">
          <Button variant="outline" onClick={goPrev} disabled={step === 1} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Anterior</span>
          </Button>
          
          <div className="flex gap-2">
            {step < 5 ? (
              <Button onClick={goNext} className="gap-2 px-8">
                Próximo <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={completeSession} className="gap-2 bg-emerald-600 hover:bg-emerald-700 px-8 shadow-emerald-500/20 shadow-lg">
                <CheckCircle2 className="w-4 h-4" /> Finalizar Sessão
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
