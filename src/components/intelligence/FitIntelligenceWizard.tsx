import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Brain, Droplets, Dumbbell, Heart, Sparkles, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

interface WizardData {
  water_cups_per_day: number;
  forgets_water: boolean;
  wake_up_time: string;
  workout_time: string;
  workout_blocker: string;
  trains_alone: boolean;
  weekend_diet_breaks: boolean;
  craving_hours: string[];
  motivation_style: 'gentle' | 'firm';
  message_tone: 'funny' | 'direct';
}

const STEPS = [
  { id: 'intro', icon: Brain, title: 'Ensinar a Inteligência FitJourney', color: 'text-primary' },
  { id: 'hydration', icon: Droplets, title: 'Hidratação', color: 'text-blue-400' },
  { id: 'workout', icon: Dumbbell, title: 'Treino', color: 'text-orange-400' },
  { id: 'emotional', icon: Heart, title: 'Comportamento Alimentar', color: 'text-rose-400' },
  { id: 'motivation', icon: Sparkles, title: 'Estilo de Motivação', color: 'text-amber-400' },
];

const EASE = [0.22, 1, 0.36, 1] as const;

// FIX: Extract OptionButton outside component to prevent re-creation on every render
function OptionButton({ selected, onClick, children, className = '' }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left ${
        selected
          ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10'
          : 'border-border bg-card hover:border-primary/30 text-foreground/70'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function FitIntelligenceWizard({ open, onClose, patientId, patientName }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<WizardData>({
    water_cups_per_day: 6,
    forgets_water: true,
    wake_up_time: '07:00',
    workout_time: 'morning',
    workout_blocker: '',
    trains_alone: true,
    weekend_diet_breaks: false,
    craving_hours: [],
    motivation_style: 'gentle',
    message_tone: 'funny',
  });

  const firstName = patientName?.split(' ')[0] || 'você';

  const update = useCallback((key: keyof WizardData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleCraving = useCallback((hour: string) => {
    setData(prev => ({
      ...prev,
      craving_hours: prev.craving_hours.includes(hour)
        ? prev.craving_hours.filter(h => h !== hour)
        : [...prev.craving_hours, hour],
    }));
  }, []);

  // FIX: Reset step on close so re-open starts fresh
  const handleClose = useCallback(() => {
    onClose();
    // Reset after animation completes
    setTimeout(() => setStep(0), 300);
  }, [onClose]);

  const handleSave = async () => {
    if (saving) return; // FIX: Prevent double-submit
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("behavioral_profile" as any)
        .upsert({
          patient_id: patientId,
          water_cups_per_day: data.water_cups_per_day,
          forgets_water: data.forgets_water,
          wake_up_time: data.wake_up_time,
          workout_time: data.workout_time,
          workout_blocker: data.workout_blocker || null,
          trains_alone: data.trains_alone,
          weekend_diet_breaks: data.weekend_diet_breaks,
          craving_hours: data.craving_hours,
          motivation_style: data.motivation_style,
          message_tone: data.message_tone,
          preferred_reminder_windows: [9, 12, 15, 18],
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "patient_id" });

      if (profileError) throw profileError;

      // Mark onboarded
      await supabase
        .from("profiles")
        .update({ fit_intelligence_onboarded: true } as any)
        .eq("user_id", patientId);

      // Create initial hydration record for today
      const targetCups = data.water_cups_per_day > 0 ? Math.ceil(data.water_cups_per_day * 1.5) : 8;
      await supabase.from("fit_intelligence_hydration" as any).upsert({
        patient_id: patientId,
        date: new Date().toISOString().split('T')[0],
        target_cups: targetCups,
        consumed_cups: 0,
      } as any, { onConflict: "patient_id,date" });

      // Create frequency config
      await supabase.from("fit_intelligence_frequency" as any).upsert({
        patient_id: patientId,
        optimal_hours: [9, 12, 15, 18],
        cooldown_minutes: 120,
        ignored_count: 0,
        engaged_count: 0,
      } as any, { onConflict: "patient_id" });

      // Log wizard completion
      await supabase.from("fit_intelligence_interactions" as any).insert({
        patient_id: patientId,
        interaction_type: "wizard_completed",
        prompt_title: "Wizard Comportamental",
        prompt_text: "Onboarding comportamental concluído",
        was_dismissed: false,
      } as any);

      toast.success("Inteligência FitJourney configurada! 🧠✨");
      handleClose();
    } catch (e: any) {
      console.warn("[FitIntelligence] Wizard save failed:", e?.message);
      toast.error("Não foi possível salvar suas preferências. Tente novamente.");
    }
    setSaving(false);
  };

  const canPrev = step > 0;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) handleClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-primary/20">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: EASE }}
          />
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pt-4 px-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  i === step ? 'bg-primary/15 scale-110' : i < step ? 'bg-primary/5' : 'bg-muted/50'
                }`}
              >
                {i < step ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 ${i === step ? s.color : 'text-muted-foreground/40'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="space-y-5"
            >
              {/* Step 0: Intro */}
              {step === 0 && (
                <>
                  <div className="text-center space-y-3 pt-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Brain className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold">Ensinar a Inteligência FitJourney</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Olá {firstName}! 👋<br /><br />
                      Deseja permitir que a <span className="text-primary font-medium">Inteligência FitJourney</span> aprenda sobre sua rotina para ajudar no seu acompanhamento?
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Button onClick={() => setStep(1)} className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Sim, ensinar agora
                    </Button>
                    <Button variant="ghost" onClick={handleClose} className="text-muted-foreground">
                      Agora não
                    </Button>
                  </div>
                </>
              )}

              {/* Step 1: Hydration */}
              {step === 1 && (
                <>
                  <div className="space-y-1 pt-2">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      Hidratação
                    </h3>
                    <p className="text-xs text-muted-foreground">Nos ajude a entender seus hábitos com água</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Quantos copos de água você costuma beber por dia?</label>
                      <div className="flex gap-2 flex-wrap">
                        {[2, 4, 6, 8, 10, 12].map(n => (
                          <OptionButton key={n} selected={data.water_cups_per_day === n} onClick={() => update('water_cups_per_day', n)}>
                            {n} copos
                          </OptionButton>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Você esquece de beber água?</label>
                      <div className="flex gap-2">
                        <OptionButton selected={data.forgets_water} onClick={() => update('forgets_water', true)}>Sim, sempre esqueço</OptionButton>
                        <OptionButton selected={!data.forgets_water} onClick={() => update('forgets_water', false)}>Não, sou disciplinado</OptionButton>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Qual horário você acorda?</label>
                      <div className="flex gap-2 flex-wrap">
                        {['05:00', '06:00', '07:00', '08:00', '09:00', '10:00'].map(t => (
                          <OptionButton key={t} selected={data.wake_up_time === t} onClick={() => update('wake_up_time', t)}>
                            {t}
                          </OptionButton>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Workout */}
              {step === 2 && (
                <>
                  <div className="space-y-1 pt-2">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-orange-400" />
                      Treino
                    </h3>
                    <p className="text-xs text-muted-foreground">Entenda como ajudar na sua rotina de exercícios</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Qual horário costuma treinar?</label>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { value: 'morning', label: '🌅 Manhã' },
                          { value: 'afternoon', label: '☀️ Tarde' },
                          { value: 'evening', label: '🌆 Fim da Tarde' },
                          { value: 'night', label: '🌙 Noite' },
                        ].map(o => (
                          <OptionButton key={o.value} selected={data.workout_time === o.value} onClick={() => update('workout_time', o.value)}>
                            {o.label}
                          </OptionButton>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Qual seu maior bloqueio para treinar?</label>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { value: 'tempo', label: '⏰ Falta de tempo' },
                          { value: 'motivacao', label: '😴 Motivação' },
                          { value: 'cansaco', label: '💤 Cansaço' },
                          { value: 'nenhum', label: '✅ Nenhum' },
                        ].map(o => (
                          <OptionButton key={o.value} selected={data.workout_blocker === o.value} onClick={() => update('workout_blocker', o.value)}>
                            {o.label}
                          </OptionButton>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Treina sozinho ou acompanhado?</label>
                      <div className="flex gap-2">
                        <OptionButton selected={data.trains_alone} onClick={() => update('trains_alone', true)}>🧍 Sozinho</OptionButton>
                        <OptionButton selected={!data.trains_alone} onClick={() => update('trains_alone', false)}>👥 Acompanhado</OptionButton>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Emotional Nutrition */}
              {step === 3 && (
                <>
                  <div className="space-y-1 pt-2">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-400" />
                      Comportamento Alimentar
                    </h3>
                    <p className="text-xs text-muted-foreground">Entender seus padrões emocionais com alimentação</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Você costuma sair da dieta aos finais de semana?</label>
                      <div className="flex gap-2">
                        <OptionButton selected={data.weekend_diet_breaks} onClick={() => update('weekend_diet_breaks', true)}>Sim, frequentemente</OptionButton>
                        <OptionButton selected={!data.weekend_diet_breaks} onClick={() => update('weekend_diet_breaks', false)}>Não, mantenho firme</OptionButton>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Em quais horários sente mais vontade de comer fora do plano?</label>
                      <div className="flex gap-2 flex-wrap">
                        {['Manhã', 'Almoço', 'Tarde', 'Noite', 'Madrugada'].map(h => (
                          <OptionButton
                            key={h}
                            selected={data.craving_hours.includes(h)}
                            onClick={() => toggleCraving(h)}
                          >
                            {h}
                          </OptionButton>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Selecione todos que se aplicam</p>
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Motivation Style */}
              {step === 4 && (
                <>
                  <div className="space-y-1 pt-2">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Estilo de Motivação
                    </h3>
                    <p className="text-xs text-muted-foreground">Como você prefere ser motivado?</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Prefere incentivo leve ou cobrança firme?</label>
                      <div className="grid grid-cols-2 gap-2">
                        <OptionButton selected={data.motivation_style === 'gentle'} onClick={() => update('motivation_style', 'gentle')} className="text-center">
                          🌸 Incentivo Leve
                          <p className="text-[10px] text-muted-foreground mt-1">Carinhoso e motivacional</p>
                        </OptionButton>
                        <OptionButton selected={data.motivation_style === 'firm'} onClick={() => update('motivation_style', 'firm')} className="text-center">
                          💪 Cobrança Firme
                          <p className="text-[10px] text-muted-foreground mt-1">Direto e exigente</p>
                        </OptionButton>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Prefere mensagens engraçadas ou diretas?</label>
                      <div className="grid grid-cols-2 gap-2">
                        <OptionButton selected={data.message_tone === 'funny'} onClick={() => update('message_tone', 'funny')} className="text-center">
                          😄 Engraçadas
                          <p className="text-[10px] text-muted-foreground mt-1">Com humor e leveza</p>
                        </OptionButton>
                        <OptionButton selected={data.message_tone === 'direct'} onClick={() => update('message_tone', 'direct')} className="text-center">
                          📋 Diretas
                          <p className="text-[10px] text-muted-foreground mt-1">Objetivas e claras</p>
                        </OptionButton>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {step > 0 && (
          <div className="flex items-center justify-between px-6 pb-5 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={!canPrev || saving}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>

            {isLast ? (
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Finalizar
              </Button>
            ) : (
              <Button onClick={() => setStep(s => s + 1)} className="gap-1">
                Próximo <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
