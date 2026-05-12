import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import { toast } from "sonner";
import {
  ClipboardList, ChevronLeft, ChevronRight, Save, ShieldAlert,
  Database, HeartPulse, Stethoscope, Dumbbell, Clock, Target, MessageCircle,
} from "lucide-react";

import StepSyncedData from "./anamnesis/StepSyncedData";
import StepReadiness from "./anamnesis/StepReadiness";
import StepPainInjury from "./anamnesis/StepPainInjury";
import StepTrainingHistory from "./anamnesis/StepTrainingHistory";
import StepAvailability from "./anamnesis/StepAvailability";
import StepGoals from "./anamnesis/StepGoals";
import StepCoachingStyle from "./anamnesis/StepCoachingStyle";
import { INITIAL_DATA, STEP_TITLES, type TrainerAnamnesisData } from "./anamnesis/types";

interface TrainerAnamnesisProps {
  studentId: string;
  studentName: string;
  open: boolean;
  onClose: () => void;
}

const STEP_ICONS = [Database, HeartPulse, Stethoscope, Dumbbell, Clock, Target, MessageCircle];
const TOTAL_STEPS = 7;

export default function TrainerAnamnesis({ studentId, studentName, open, onClose }: TrainerAnamnesisProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<TrainerAnamnesisData>({ ...INITIAL_DATA });
  const [professionals, setProfessionals] = useState<{ role: string; name: string }[]>([]);

  useEffect(() => {
    if (!open || !studentId) return;
    loadData();
  }, [open, studentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, anamnesisRes, assessmentRes, linksRes] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, avatar_url, goal").eq("user_id", studentId).maybeSingle(),
        supabase.from("patient_anamnesis").select("answers").eq("user_id", studentId).eq("status", "completed").order("created_at", { ascending: false }).limit(1),
        (supabase as any).from("trainer_assessments").select("*").eq("patient_id", studentId).eq("trainer_id", user?.id).order("created_at", { ascending: false }).limit(1),
        (supabase as any).from("patient_professional_links").select("professional_role, profiles!patient_professional_links_professional_id_fkey(full_name)").eq("patient_id", studentId).eq("status", "active"),
      ]);

      // Build synced data
      const profile = profileRes.data;
      const answers = (anamnesisRes.data as any)?.[0]?.answers as Record<string, any> | null;
      const birthDate = answers?.birth_date || answers?.birthdate;
      const age = birthDate
        ? Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000)
        : null;

      const syncedData = {
        name: profile?.full_name || studentName,
        age: age ?? undefined,
        height: answers?.height ?? undefined,
        weight: answers?.weight ?? undefined,
        sex: answers?.biological_sex ?? answers?.sex ?? undefined,
        goal: answers?.primary_goal ?? answers?.goal ?? undefined,
        flags: [] as string[],
        restrictions: (answers?.food_intolerances || answers?.allergies || []) as string[],
      };

      // Professionals
      const profs = (linksRes.data || []).map((l: any) => ({
        role: l.professional_role === "nutritionist" ? "Nutricionista" : l.professional_role === "trainer" ? "Personal" : l.professional_role,
        name: l.profiles?.full_name || "—",
      }));
      setProfessionals(profs);

      // Load existing assessment
      const existing = assessmentRes.data?.[0];
      if (existing) {
        setExistingId(existing.id);
        setData({
          synced_patient_data: existing.synced_patient_data || syncedData,
          readiness_screening: existing.readiness_screening || INITIAL_DATA.readiness_screening,
          requires_medical_review: existing.requires_medical_review || false,
          medical_clearance: existing.medical_clearance || false,
          medical_clearance_notes: existing.medical_clearance_notes || "",
          current_pain: existing.current_pain || false,
          pain_locations: existing.pain_locations || [],
          injuries: typeof existing.injuries === "string" ? existing.injuries : JSON.stringify(existing.injuries || ""),
          surgeries: typeof existing.surgeries === "string" ? existing.surgeries : JSON.stringify(existing.surgeries || ""),
          specific_conditions: existing.specific_conditions || [],
          movements_to_avoid: existing.movements_to_avoid || [],
          movements_that_worsen: existing.movements_that_worsen || [],
          does_physiotherapy: existing.does_physiotherapy || false,
          has_medical_report: existing.has_medical_report || false,
          has_trained_before: existing.has_trained_before || false,
          training_years: existing.training_years,
          last_training_period: existing.last_training_period || "",
          perceived_level: existing.perceived_level || "beginner",
          modalities_practiced: existing.modalities_practiced || [],
          previous_frequency: existing.previous_frequency,
          liked_exercises: existing.liked_exercises || "",
          disliked_exercises: existing.disliked_exercises || "",
          training_difficulties: existing.training_difficulties || "",
          weekly_availability: existing.weekly_availability || 3,
          available_hours: existing.available_hours || [],
          session_duration: existing.session_duration || 60,
          training_location: existing.training_location || "gym",
          training_modality: existing.training_modality || "presencial",
          available_equipment: existing.available_equipment || [],
          work_routine: existing.work_routine || "",
          sleep_quality: existing.sleep_quality || "",
          energy_level: existing.energy_level || "",
          primary_goal: existing.primary_goal || "",
          secondary_goals: existing.secondary_goals || [],
          coaching_intensity: existing.coaching_intensity || "moderate",
          wants_reminders: existing.wants_reminders ?? true,
          wants_video_tutorials: existing.wants_video_tutorials ?? true,
          wants_post_workout_feedback: existing.wants_post_workout_feedback ?? true,
          plan_flexibility: existing.plan_flexibility || "flexible",
          notes: existing.notes || "",
          wizard_step: existing.wizard_step || 0,
          is_complete: existing.is_complete || false,
        });
        setStep(existing.wizard_step || 0);
      } else {
        setData({ ...INITIAL_DATA, synced_patient_data: syncedData });
        setStep(0);
      }
    } catch (err) {
      console.error("Error loading anamnesis:", err);
    }
    setLoading(false);
  };

  const updateData = (partial: Partial<TrainerAnamnesisData>) => {
    setData(prev => ({ ...prev, ...partial }));
  };

  const autoSave = async (nextStep: number) => {
    if (!user) return;
    const payload = buildPayload(nextStep, false);
    try {
      if (existingId) {
        await (supabase as any).from("trainer_assessments").update(payload).eq("id", existingId);
      } else {
        const { data: inserted } = await (supabase as any).from("trainer_assessments").insert(payload).select("id").single();
        if (inserted) setExistingId(inserted.id);
      }
    } catch {}
  };

  const buildPayload = (wizardStep: number, complete: boolean) => ({
    patient_id: studentId,
    trainer_id: user!.id,
    synced_patient_data: data.synced_patient_data,
    readiness_screening: data.readiness_screening,
    requires_medical_review: data.requires_medical_review,
    medical_clearance: data.medical_clearance,
    medical_clearance_notes: data.medical_clearance_notes || null,
    current_pain: data.current_pain,
    pain_locations: data.pain_locations,
    injuries: data.injuries || null,
    surgeries: data.surgeries || null,
    specific_conditions: data.specific_conditions,
    movements_to_avoid: data.movements_to_avoid,
    movements_that_worsen: data.movements_that_worsen,
    does_physiotherapy: data.does_physiotherapy,
    has_medical_report: data.has_medical_report,
    has_trained_before: data.has_trained_before,
    training_years: data.training_years,
    last_training_period: data.last_training_period || null,
    perceived_level: data.perceived_level,
    modalities_practiced: data.modalities_practiced,
    previous_frequency: data.previous_frequency,
    liked_exercises: data.liked_exercises || null,
    disliked_exercises: data.disliked_exercises || null,
    training_difficulties: data.training_difficulties || null,
    weekly_availability: data.weekly_availability,
    available_hours: data.available_hours,
    session_duration: data.session_duration,
    training_location: data.training_location,
    training_modality: data.training_modality,
    available_equipment: data.available_equipment,
    work_routine: data.work_routine || null,
    sleep_quality: data.sleep_quality || null,
    energy_level: data.energy_level || null,
    primary_goal: data.primary_goal || null,
    secondary_goals: data.secondary_goals,
    goals: data.primary_goal || null,
    coaching_intensity: data.coaching_intensity,
    wants_reminders: data.wants_reminders,
    wants_video_tutorials: data.wants_video_tutorials,
    wants_post_workout_feedback: data.wants_post_workout_feedback,
    plan_flexibility: data.plan_flexibility,
    notes: data.notes || null,
    joint_pain: data.pain_locations,
    movement_restrictions: data.movements_to_avoid.join(", ") || null,
    training_experience: data.perceived_level,
    training_preference: data.modalities_practiced.join(", ") || null,
    wizard_step: wizardStep,
    is_complete: complete,
  });

  const nextStep = () => {
    if (step < TOTAL_STEPS - 1) {
      const next = step + 1;
      setStep(next);
      autoSave(next);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const finalize = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = buildPayload(TOTAL_STEPS - 1, true);
      if (existingId) {
        await (supabase as any).from("trainer_assessments").update(payload).eq("id", existingId);
      } else {
        await (supabase as any).from("trainer_assessments").insert(payload);
      }
      toast.success("Avaliação concluída com sucesso! ✅");
      onClose();
    } catch {
      toast.error("Erro ao salvar avaliação");
    }
    setSaving(false);
  };

  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const StepIcon = STEP_ICONS[step];
  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="p-4 pb-2 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="w-5 h-5 text-primary" />
              Avaliação do Personal
              {data.requires_medical_review && (
                <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Requer revisão
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <StepIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{STEP_TITLES[step]}</span>
              </div>
              <span className="text-xs text-muted-foreground">{step + 1}/{TOTAL_STEPS}</span>
            </div>
            <Progress value={progress} className="h-1.5" />

            {/* Step dots */}
            <div className="flex justify-center gap-1.5 mt-2">
              {STEP_TITLES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { autoSave(i); setStep(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === step ? "bg-primary w-5" : i < step ? "bg-primary/50" : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">Carregando dados...</div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && <StepSyncedData data={data} professionals={professionals} />}
                {step === 1 && <StepReadiness data={data} onChange={updateData} />}
                {step === 2 && <StepPainInjury data={data} onChange={updateData} />}
                {step === 3 && <StepTrainingHistory data={data} onChange={updateData} />}
                {step === 4 && <StepAvailability data={data} onChange={updateData} />}
                {step === 5 && <StepGoals data={data} onChange={updateData} />}
                {step === 6 && <StepCoachingStyle data={data} onChange={updateData} />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="p-4 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={prevStep} disabled={step === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>

            {isLastStep ? (
              <Button onClick={finalize} disabled={saving} size="sm" className="min-w-[140px]">
                <Save className="w-4 h-4 mr-1" />
                {saving ? "Salvando..." : existingId ? "Atualizar" : "Concluir Avaliação"}
              </Button>
            ) : (
              <Button onClick={nextStep} size="sm">
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
