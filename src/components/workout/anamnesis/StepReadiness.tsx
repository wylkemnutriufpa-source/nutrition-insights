import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import type { TrainerAnamnesisData, ReadinessScreening } from "./types";

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
  const criticalCount = QUESTIONS.filter(q => q.critical && screening[q.key]).length;
  const hasCritical = criticalCount > 0;

  const toggle = (key: keyof ReadinessScreening) => {
    const updated = { ...screening, [key]: !screening[key] };
    const requiresReview = QUESTIONS.some(q => q.critical && updated[q.key]);
    onChange({
      readiness_screening: updated,
      requires_medical_review: requiresReview,
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Triagem de prontidão para atividade física. Respostas críticas gerarão alertas automáticos.
      </p>

      <div className="space-y-2">
        {QUESTIONS.map(q => (
          <button
            key={q.key}
            onClick={() => toggle(q.key)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all text-sm ${
              screening[q.key]
                ? q.critical
                  ? "bg-destructive/10 border border-destructive/30 text-destructive"
                  : "bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400"
                : "bg-muted/50 border border-transparent hover:border-border"
            }`}
          >
            <Checkbox checked={screening[q.key]} className="pointer-events-none" />
            <span className="flex-1">{q.label}</span>
            {q.critical && screening[q.key] && (
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            )}
          </button>
        ))}
      </div>

      {hasCritical && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-3 flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-destructive">
                ⚠️ {criticalCount} resposta(s) crítica(s) detectada(s)
              </div>
              <p className="text-xs text-destructive/80 mt-1">
                Paciente marcado como "Requer revisão médica". Recomendamos liberação médica antes de iniciar o programa de treino.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasCritical && (
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              Nenhuma contraindicação identificada ✓
            </span>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Checkbox
            checked={data.medical_clearance}
            onCheckedChange={(c) => onChange({ medical_clearance: !!c })}
          />
          <label className="text-sm font-medium">Possui liberação médica para atividade física</label>
        </div>
        {data.medical_clearance && (
          <Textarea
            value={data.medical_clearance_notes}
            onChange={(e) => onChange({ medical_clearance_notes: e.target.value })}
            placeholder="Observações sobre a liberação médica..."
            rows={2}
            className="mt-1"
          />
        )}
      </div>
    </div>
  );
}
