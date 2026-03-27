import { motion, useReducedMotion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ShieldCheck, ShieldAlert, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrbitalHeader } from "@/components/onboarding/OrbitalAnamnesisInputs";
import type { TrainerAnamnesisData, ReadinessScreening } from "./types";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

interface Props {
  data: TrainerAnamnesisData;
  onChange: (partial: Partial<TrainerAnamnesisData>) => void;
}

const QUESTIONS: { key: keyof ReadinessScreening; label: string; critical: boolean }[] = [
  { key: "medical_advice_avoid", label: "Já recebeu orientação médica para evitar exercício físico?", critical: true },
  { key: "chest_pain", label: "Sente dor no peito durante esforço ou em repouso?", critical: true },
  { key: "dizziness", label: "Tem tontura, desmaios ou falta de ar anormal?", critical: true },
  { key: "heart_condition", label: "Possui condição cardíaca conhecida?", critical: true },
  { key: "high_bp_diabetes", label: "Pressão alta, diabetes ou problemas metabólicos?", critical: false },
  { key: "pregnancy", label: "Gravidez ou pós-parto recente?", critical: false },
  { key: "adaptation_needed", label: "Alguma condição que exija adaptação no treino?", critical: false },
  { key: "needs_medical_clearance", label: "Necessita de liberação médica para treinar?", critical: true },
];

export default function StepReadiness({ data, onChange }: Props) {
  const screening = data.readiness_screening;
  const reduced = useReducedMotion();
  const criticalCount = QUESTIONS.filter(q => q.critical && screening[q.key]).length;
  const hasCritical = criticalCount > 0;

  const toggle = (key: keyof ReadinessScreening) => {
    const updated = { ...screening, [key]: !screening[key] };
    const requiresReview = QUESTIONS.some(q => q.critical && updated[q.key]);
    onChange({ readiness_screening: updated, requires_medical_review: requiresReview });
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      <OrbitalHeader title="Prontidão para Exercício" subtitle="Triagem PAR-Q — respostas críticas geram alertas automáticos" />

      <div className="space-y-2">
        {QUESTIONS.map((q, i) => {
          const active = screening[q.key];
          return (
            <motion.button
              key={q.key}
              onClick={() => toggle(q.key)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: EASE_PREMIUM }}
              className={cn(
                "w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all text-sm border-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active
                  ? q.critical
                    ? "bg-destructive/10 border-destructive/40 text-destructive"
                    : "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400"
                  : "bg-card/60 border-border hover:border-primary/30"
              )}
              style={active ? {
                boxShadow: q.critical
                  ? "0 0 16px hsl(var(--destructive) / 0.15)"
                  : "0 0 16px hsl(45 100% 50% / 0.1)",
              } : { boxShadow: "0 2px 6px hsl(0 0% 0% / 0.06)" }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Orbital check */}
              <div className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all",
                active
                  ? q.critical
                    ? "bg-destructive border-destructive"
                    : "bg-amber-500 border-amber-500"
                  : "border-border bg-card"
              )}>
                {active && <Check className="w-3.5 h-3.5 text-white" />}
              </div>

              <span className="flex-1">{q.label}</span>

              {q.critical && active && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Status card with orbital glow */}
      {hasCritical ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl border-2 border-destructive/30 bg-destructive/5 flex items-start gap-3"
          style={{ boxShadow: "0 0 24px hsl(var(--destructive) / 0.1)" }}
        >
          <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-destructive">⚠️ {criticalCount} resposta(s) crítica(s)</div>
            <p className="text-xs text-destructive/80 mt-1">
              Paciente marcado como "Requer revisão médica". Recomendamos liberação médica antes de iniciar.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3"
          style={{ boxShadow: "0 0 20px hsl(142 70% 45% / 0.08)" }}
        >
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            Nenhuma contraindicação identificada ✓
          </span>
        </motion.div>
      )}

      {/* Medical clearance */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="p-4 rounded-2xl border-2 border-border bg-card/60 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Checkbox checked={data.medical_clearance} onCheckedChange={(c) => onChange({ medical_clearance: !!c })} />
          <label className="text-sm font-medium">Possui liberação médica para atividade física</label>
        </div>
        {data.medical_clearance && (
          <Textarea
            value={data.medical_clearance_notes}
            onChange={(e) => onChange({ medical_clearance_notes: e.target.value })}
            placeholder="Observações sobre a liberação médica..."
            rows={2}
            className="rounded-xl border-border/50"
          />
        )}
      </motion.div>
    </div>
  );
}
