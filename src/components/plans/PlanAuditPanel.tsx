import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { toast } from "sonner";
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldCheck,
  Gauge, TrendingUp, ArrowRight, Ban, Brain, RefreshCw, Hammer, Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import AutoFixButton from "./AutoFixButton";
import { validateMealPlan } from "@/lib/mealPlanValidationFlow";

// ── Types ──────────────────────────────────────────────────────

interface MacroResult {
  label: string; unit: string; target: number; actual: number;
  diff_pct: number; tolerance: number; passed: boolean; rule: string;
}
interface ValidationError { rule: string; message: string; weight: number; }
interface RestrictionViolation { restriction: string; keyword_found: string; }
interface BlockedFoodFound { food: string; found_in: string; day: number; tipo_refeicao: string; replacement: string | null; }
interface SimplicityIssue { category: string; severity: string; tipo_refeicao: string; day: number; message: string; suggested_fix: string; penalty: number; }
interface AdherenceFactor { factor: string; impact: number; detail: string; }
interface Suggestion { before: string; after: string; tipo_refeicao: string; day: number; }

interface PrioritizedIssue {
  severity: string;
  priority_order: number;
  correction_bucket: string;
  category: string;
  tipo_refeicao: string;
  day: number;
  message: string;
  suggested_fix: string;
  penalty: number;
}

interface AuditResult {
  success: boolean;
  status: string;
  overall_status: string;
  score: number;
  clinical_status: string;
  simplicity_status: string;
  practical_status: string;
  clinical_score: number;
  simplicity_score: number;
  adherence_score_prediction: number;
  // Decision layer v5
  executive_summary?: string;
  approval_recommendation?: string;
  correction_strategy?: string[];
  final_decision?: string;
  final_decision_reason?: string;
  confidence_level?: string;
  prioritized_issues?: PrioritizedIssue[];
  buckets?: {
    bloquear_publicacao: PrioritizedIssue[];
    corrigir_agora: PrioritizedIssue[];
    corrigir_depois: PrioritizedIssue[];
    opcional: PrioritizedIssue[];
  };
  macros: MacroResult[] | null;
  restrictions_violated: RestrictionViolation[];
  blocked_foods_found: BlockedFoodFound[];
  errors: ValidationError[];
  simplicity_issues: SimplicityIssue[];
  adherence_factors: AdherenceFactor[];
  suggestions: Suggestion[];
  audit: Record<string, any>;
}

interface Props { mealPlanId: string; patientId?: string; onApproved?: () => void; onFixed?: (newPlanId: string, inPlace?: boolean) => void; }

// ── Sub-components ─────────────────────────────────────────────

function MacroBar({ m }: { m: MacroResult }) {
  const barValue = m.target > 0 ? Math.min(100, Math.max(0, (m.actual / m.target) * 100)) : 0;
  const overShoot = m.actual > m.target;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{m.label}</span>
        <div className="flex items-center gap-2">
          {m.target > 0 && <span className="text-xs text-muted-foreground">Meta: {m.target}{m.unit}</span>}
          <span className={`font-semibold ${m.passed ? "text-emerald-400" : "text-red-400"}`}>{m.actual}{m.unit}</span>
          {m.target > 0 && (
            <Badge className={`text-[10px] px-1.5 py-0 ${m.passed ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : overShoot ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`} variant="outline">
              {m.diff_pct > 0 ? "+" : ""}{m.diff_pct}%
            </Badge>
          )}
          {m.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
        </div>
      </div>
      {m.target > 0 && (
        <Progress value={barValue} className={`h-2 ${m.passed ? "[&>div]:bg-emerald-500" : overShoot ? "[&>div]:bg-orange-500" : "[&>div]:bg-red-500"}`} />
      )}
      <p className="text-[10px] text-muted-foreground">{m.rule}</p>
    </div>
  );
}

function ScoreGauge({ score, label, size = 90 }: { score: number; label: string; size?: number }) {
  const color = score >= 80 ? "text-emerald-400" : score >= 65 ? "text-amber-400" : "text-red-400";
  const ringColor = score >= 80 ? "stroke-emerald-500" : score >= 65 ? "stroke-amber-500" : "stroke-red-500";
  const r = size * 0.4;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-border opacity-40" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className={`transition-all duration-1000 ${ringColor}`}
          style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
        />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" className={`font-bold fill-current ${color}`} style={{ fontSize: size * 0.24 }}>{score}</text>
      </svg>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const isOk = status === "approved" || status === "aprovado";
  return (
    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${isOk ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
      {isOk ? "✅" : "❌"} {label}
    </Badge>
  );
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "☀️ Café", cafe_da_manha: "☀️ Café",
  morning_snack: "🍎 Lanche M.", lanche_manha: "🍎 Lanche M.",
  lunch: "🍽️ Almoço", almoco: "🍽️ Almoço",
  afternoon_snack: "🍌 Lanche T.", lanche_tarde: "🍌 Lanche T.",
  dinner: "🌙 Jantar", jantar: "🌙 Jantar",
  evening_snack: "🥛 Ceia", ceia: "🥛 Ceia",
};

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴", high: "🟠", medium: "🟡", low: "🔵",
};

function IssueRow({ issue }: { issue: PrioritizedIssue }) {
  return (
    <div className="text-xs flex items-start gap-1.5">
      <span className="mt-0.5 shrink-0">{SEVERITY_EMOJI[issue.severity] || "⚪"}</span>
      <div className="flex-1 min-w-0">
        <span className="font-medium">{issue.message}</span>
        {issue.tipo_refeicao && (
          <span className="text-muted-foreground ml-2 text-[10px]">
            {MEAL_TYPE_LABELS[issue.tipo_refeicao] || issue.tipo_refeicao}{issue.day != null ? ` · Dia ${issue.day + 1}` : ""}
          </span>
        )}
        <p className="text-[10px] text-primary mt-0.5">💡 {issue.suggested_fix}</p>
      </div>
    </div>
  );
}

// ── Decision CTA ───────────────────────────────────────────────

function DecisionCTA({ decision, onFix }: { decision: string; onFix?: () => void }) {
  if (decision === "publish_now") {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <Rocket className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-400">Plano pronto para publicar</p>
          <p className="text-[10px] text-muted-foreground">Todas as validações foram aprovadas.</p>
        </div>
      </div>
    );
  }
  // suggest_corrections (replaces rebuild_plan and fix_and_revalidate)
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <RefreshCw className="w-5 h-5 text-amber-400 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-400">Sugestões de melhoria</p>
        <p className="text-[10px] text-muted-foreground">O sistema identificou oportunidades de melhoria. Aplique as sugestões ou publique como está.</p>
      </div>
      {onFix && (
        <Button size="sm" variant="outline" className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={onFix}>
          Aplicar Sugestões
        </Button>
      )}
    </div>
  );
}

// ── Bucket Section ─────────────────────────────────────────────

function BucketSection({ title, icon, issues, colorClass }: { title: string; icon: React.ReactNode; issues: PrioritizedIssue[]; colorClass: string }) {
  if (issues.length === 0) return null;
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${colorClass}`}>
      <h4 className="text-sm font-semibold flex items-center gap-1.5">
        {icon} {title} ({issues.length})
      </h4>
      {issues.map((issue, i) => <IssueRow key={i} issue={issue} />)}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function PlanAuditPanel({ mealPlanId, patientId, onApproved, onFixed }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [autoRunSignal, setAutoRunSignal] = useState(0);

  const runAudit = async () => {
    setLoading(true);
    setResult(null);
    try {


      const data = await validateMealPlan(mealPlanId);
      setResult(data as unknown as AuditResult);
      if (data?.success) {
        toast.success("Motor Clínico Unificado: Plano APROVADO! ✅");
        onApproved?.();
      } else {
        toast.info(`Motor Clínico: ${data?.score ?? 0}/100 — Sugestões de melhoria disponíveis`);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao contactar o Motor Clínico");
    }
    setLoading(false);
  };

  const runValidateAndFix = async () => {
    setLoading(true);
    setResult(null);
    try {
      console.info("[PlanAuditPanel] runValidateAndFix starting", { mealPlanId, patientId });


      const data = await validateMealPlan(mealPlanId);
      console.info("[PlanAuditPanel] Validation result", { mealPlanId, success: data?.success, score: data?.score, finalDecision: (data as any)?.final_decision });
      setResult(data as unknown as AuditResult);

      if (data?.success) {
        toast.success("Motor Clínico Unificado: Plano já está APROVADO! ✅");
        onApproved?.();
      } else {
        toast.info("Divergências encontradas. Iniciando correção automática...", { duration: 2000 });
        setAutoRunSignal((current) => current + 1);
        setLoading(false);
        return;
      }
    } catch (e: any) {
      console.error("[PlanAuditPanel] Error in runValidateAndFix", e);
      toast.error(e.message || "Erro ao contactar o Motor Clínico");
    }
    setLoading(false);
  };

  const hasBuckets = result?.buckets && (
    result.buckets.bloquear_publicacao.length > 0 ||
    result.buckets.corrigir_agora.length > 0 ||
    result.buckets.corrigir_depois.length > 0 ||
    result.buckets.opcional.length > 0
  );

  return (
    <div className="space-y-4">
      {/* Validação manual removida a pedido do usuário para maior simplicidade */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Auditando plano...
        </div>
      )}


      {/* Auto-fix button — shows only when plan has been audited and failed */}
      {patientId && result && !result.success && (
        <AutoFixButton
          mealPlanId={mealPlanId}
          patientId={patientId}
          onFixed={onFixed}
          autoRunSignal={autoRunSignal}
        />
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`glass rounded-xl border ${result.success ? "border-emerald-500/30" : "border-amber-500/30"} p-5 space-y-5`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {result.success ? <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-7 h-7 text-amber-400 shrink-0" />}
                <div>
                  <h3 className={`font-display font-bold text-lg ${result.success ? "text-emerald-400" : "text-amber-400"}`}>
                    {result.success ? "Plano APROVADO" : "Sugestões de Melhoria"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Motor Clínico Unificado v5 • {new Date(result.audit?.run_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              {result.confidence_level && (
                <Badge variant="outline" className="text-[10px]">
                  Confiança: {result.confidence_level === "high" ? "Alta" : result.confidence_level === "medium" ? "Média" : "Baixa"}
                </Badge>
              )}
            </div>

            {/* Executive Summary */}
            {result.executive_summary && (
              <div className="rounded-lg bg-secondary/50 border border-border p-3 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-primary" /> Resumo Executivo
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.executive_summary}</p>
                {result.correction_strategy && result.correction_strategy.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground">Estratégia de correção:</p>
                    {result.correction_strategy.map((s, i) => (
                      <p key={i} className="text-[10px] text-primary">→ {s}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Decision CTA */}
            {result.final_decision && (
              <DecisionCTA decision={result.final_decision} onFix={patientId ? () => setAutoRunSignal((current) => current + 1) : undefined} />
            )}

            {/* 3 Scores */}
            <div className="grid grid-cols-3 gap-3">
              <ScoreGauge score={result.clinical_score} label="Clínico" size={80} />
              <ScoreGauge score={result.simplicity_score} label="Simplicidade" size={80} />
              <ScoreGauge score={result.adherence_score_prediction} label="Adesão Prevista" size={80} />
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2 justify-center">
              <StatusBadge status={result.clinical_status} label="Clínico" />
              <StatusBadge status={result.simplicity_status} label="Simplicidade" />
              <StatusBadge status={result.practical_status} label="Adesão" />
            </div>

            {/* Overall Score bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Score Geral</span>
                <span className={`font-bold ${result.score >= 80 ? "text-emerald-400" : result.score >= 65 ? "text-amber-400" : "text-red-400"}`}>{result.score}/100</span>
              </div>
              <Progress value={result.score} className={`h-2.5 ${result.score >= 80 ? "[&>div]:bg-emerald-500" : result.score >= 65 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"}`} />
            </div>

            {/* Prioritized Buckets */}
            {hasBuckets && result.buckets && (
              <div className="space-y-3">
                <BucketSection
                  title="🚫 Bloquear Publicação"
                  icon={<Ban className="w-4 h-4 text-red-400" />}
                  issues={result.buckets.bloquear_publicacao}
                  colorClass="bg-red-500/10 border-red-500/20"
                />
                <BucketSection
                  title="⚡ Corrigir Agora"
                  icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
                  issues={result.buckets.corrigir_agora}
                  colorClass="bg-orange-500/10 border-orange-500/20"
                />
                <BucketSection
                  title="📋 Corrigir Depois"
                  icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
                  issues={result.buckets.corrigir_depois}
                  colorClass="bg-amber-500/10 border-amber-500/20"
                />
                <BucketSection
                  title="💡 Melhorias Opcionais"
                  icon={<Gauge className="w-4 h-4 text-blue-400" />}
                  issues={result.buckets.opcional}
                  colorClass="bg-blue-500/10 border-blue-500/20"
                />
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-2">
                <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" /> Substituições Sugeridas ({result.suggestions.length})
                </h4>
                {result.suggestions.map((s, i) => (
                  <div key={i} className="text-xs flex items-center gap-2">
                    <span className="text-red-300 capitalize line-through">{s.before}</span>
                    <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-medium">{s.after}</span>
                    <span className="text-muted-foreground ml-auto text-[10px]">
                      {MEAL_TYPE_LABELS[s.tipo_refeicao] || s.tipo_refeicao}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Adherence Factors */}
            {result.adherence_factors && result.adherence_factors.length > 0 && (
              <div className="rounded-lg bg-secondary/50 border border-border p-3 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-muted-foreground" /> Fatores de Adesão Prevista
                </h4>
                {result.adherence_factors.map((f, i) => (
                  <div key={i} className="text-xs flex items-center justify-between">
                    <span className="text-muted-foreground">{f.factor}</span>
                    <Badge variant="outline" className={`text-[10px] ${f.impact >= 0 ? "text-emerald-400 border-emerald-500/20" : "text-red-400 border-red-500/20"}`}>
                      {f.impact > 0 ? "+" : ""}{f.impact} pts
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Macros */}
            {result.macros && result.macros.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span>Comparativo de Macros</span>
                  <Badge variant="outline" className="text-[10px]">Diário (média)</Badge>
                </h4>
                <div className="space-y-4">
                  {result.macros.map((m) => <MacroBar key={m.label} m={m} />)}
                </div>
              </div>
            )}

            {/* Restriction violations */}
            {result.restrictions_violated.length > 0 && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-1.5">
                <h4 className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Restrições Violadas
                </h4>
                {result.restrictions_violated.map((rv, i) => (
                  <div key={i} className="text-xs text-red-300">
                    <span className="font-medium">{rv.restriction}:</span>{" "}
                    ingrediente <code className="bg-red-900/30 px-1 rounded">{rv.keyword_found}</code> encontrado
                  </div>
                ))}
              </div>
            )}

            {/* Technical audit */}
            {result.audit && (
              <details className="text-[11px] text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground transition-colors">🔍 Dados de auditoria técnica</summary>
                <pre className="mt-2 bg-muted/50 rounded p-3 text-[10px] overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(result.audit, null, 2)}
                </pre>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
