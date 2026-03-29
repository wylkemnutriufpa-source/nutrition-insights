import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldCheck, Gauge, TrendingUp, ArrowRight, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface MacroResult {
    label: string; unit: string; target: number; actual: number;
    diff_pct: number; tolerance: number; passed: boolean; rule: string;
}
interface ValidationError { rule: string; message: string; weight: number; }
interface RestrictionViolation { restriction: string; keyword_found: string; }
interface BlockedFoodFound { food: string; found_in: string; day: number; meal_type: string; replacement: string | null; }
interface SimplicityIssue { category: string; severity: string; meal_type: string; day: number; message: string; suggested_fix: string; penalty: number; }
interface AdherenceFactor { factor: string; impact: number; detail: string; }
interface Suggestion { before: string; after: string; meal_type: string; day: number; }

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
    macros: MacroResult[] | null;
    restrictions_violated: RestrictionViolation[];
    blocked_foods_found: BlockedFoodFound[];
    errors: ValidationError[];
    simplicity_issues: SimplicityIssue[];
    adherence_factors: AdherenceFactor[];
    suggestions: Suggestion[];
    audit: Record<string, any>;
}
interface Props { mealPlanId: string; patientId?: string; onApproved?: () => void; onFixed?: (newPlanId: string) => void; }

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

export default function PlanAuditPanel({ mealPlanId, onApproved }: Props) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AuditResult | null>(null);

    const runAudit = async () => {
        setLoading(true);
        setResult(null);
        try {
            const { data, error } = await supabase.functions.invoke("validate-meal-plan", {
                body: { meal_plan_id: mealPlanId },
            });
            if (error) throw error;
            setResult(data as AuditResult);
            if (data?.success) {
                toast.success("Motor Clínico Unificado: Plano APROVADO! ✅");
                onApproved?.();
            } else {
                toast.error(`Motor Clínico Unificado: Plano REPROVADO. Score: ${data?.score ?? 0}/100`);
            }
        } catch (e: any) {
            toast.error(e.message || "Erro ao contactar o Motor Clínico");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <Button onClick={runAudit} disabled={loading} variant="outline" className="w-full gap-2 border-primary/40 hover:border-primary hover:bg-primary/5">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Auditando (Clínico + Simplicidade + Adesão)...</> : <><ShieldCheck className="w-4 h-4 text-primary" /> Auditar / Validar Plano</>}
            </Button>

            <AnimatePresence>
                {result && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`glass rounded-xl border ${result.success ? "border-emerald-500/30" : "border-red-500/30"} p-5 space-y-5`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                {result.success ? <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" /> : <XCircle className="w-7 h-7 text-red-400 shrink-0" />}
                                <div>
                                    <h3 className={`font-display font-bold text-lg ${result.success ? "text-emerald-400" : "text-red-400"}`}>
                                        Plano {result.success ? "APROVADO" : "REPROVADO"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Motor Clínico Unificado v4 • {new Date(result.audit?.run_at).toLocaleString("pt-BR")}
                                    </p>
                                </div>
                            </div>
                        </div>

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

                        {/* 🔴 Critical: Blocked Foods */}
                        {result.blocked_foods_found && result.blocked_foods_found.length > 0 && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-2">
                                <h4 className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
                                    <Ban className="w-4 h-4" /> 🔴 Problemas Críticos — Alimentos Bloqueados ({result.blocked_foods_found.length})
                                </h4>
                                <p className="text-[10px] text-muted-foreground">Estes alimentos reprovam o plano automaticamente.</p>
                                {result.blocked_foods_found.map((bf, i) => (
                                    <div key={i} className="text-xs flex items-center gap-1.5 text-red-300">
                                        <span className="font-medium capitalize">{bf.food}</span>
                                        {bf.replacement && (
                                            <>
                                                <ArrowRight className="w-3 h-3 text-emerald-400" />
                                                <span className="text-emerald-400 font-medium">{bf.replacement}</span>
                                            </>
                                        )}
                                        <span className="text-muted-foreground ml-auto text-[10px]">
                                            {MEAL_TYPE_LABELS[bf.meal_type] || bf.meal_type} · Dia {bf.day + 1}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 🟠 Adherence Issues */}
                        {result.simplicity_issues && result.simplicity_issues.filter(i => i.category === "adherence").length > 0 && (
                            <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 space-y-2">
                                <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4" /> 🟠 Problemas de Aderência ({result.simplicity_issues.filter(i => i.category === "adherence").length})
                                </h4>
                                {result.simplicity_issues.filter(i => i.category === "adherence").map((issue, i) => (
                                    <div key={i} className="text-xs text-orange-300 space-y-0.5">
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-orange-400 mt-0.5 shrink-0">⚠</span>
                                            <div>
                                                <span className="font-medium">{issue.message}</span>
                                                <span className="text-muted-foreground ml-2 text-[10px]">
                                                    {MEAL_TYPE_LABELS[issue.meal_type] || issue.meal_type} · Dia {issue.day + 1}
                                                </span>
                                                <p className="text-[10px] text-primary mt-0.5">💡 {issue.suggested_fix}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 🟡 Suggestions */}
                        {result.suggestions && result.suggestions.length > 0 && (
                            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-2">
                                <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                                    <TrendingUp className="w-4 h-4" /> 🟡 Substituições Sugeridas ({result.suggestions.length})
                                </h4>
                                {result.suggestions.map((s, i) => (
                                    <div key={i} className="text-xs flex items-center gap-2">
                                        <span className="text-red-300 capitalize line-through">{s.before}</span>
                                        <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                                        <span className="text-emerald-400 font-medium">{s.after}</span>
                                        <span className="text-muted-foreground ml-auto text-[10px]">
                                            {MEAL_TYPE_LABELS[s.meal_type] || s.meal_type}
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

                        {/* Clinical errors */}
                        {!result.success && result.errors.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-red-400">Divergências Clínicas</h4>
                                {result.errors.map((e, i) => (
                                    <div key={i} className="text-xs text-muted-foreground flex gap-2">
                                        <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
                                        <span><code className="text-[10px] bg-muted px-1 rounded mr-1">{e.rule}</code>{e.message}</span>
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
