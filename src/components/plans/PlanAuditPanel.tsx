import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface MacroResult {
    label: string; unit: string; target: number; actual: number;
    diff_pct: number; tolerance: number; passed: boolean; rule: string;
}
interface ValidationError { rule: string; message: string; weight: number; }
interface RestrictionViolation { restriction: string; keyword_found: string; }
interface BlockedFoodFound { food: string; found_in: string; day: number; meal_type: string; }
interface AuditResult {
    success: boolean; status: "aprovado" | "reprovado"; score: number;
    macros: MacroResult[] | null; restrictions_violated: RestrictionViolation[];
    blocked_foods_found: BlockedFoodFound[];
    errors: ValidationError[]; audit: Record<string, any>;
}
interface Props { mealPlanId: string; onApproved?: () => void; }

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

function ScoreGauge({ score }: { score: number }) {
    const color = score >= 90 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-red-400";
    const ringColor = score >= 90 ? "stroke-emerald-500" : score >= 70 ? "stroke-amber-500" : "stroke-red-500";
    const circumference = 2 * Math.PI * 36;
    const offset = circumference - (score / 100) * circumference;
    return (
        <div className="flex flex-col items-center gap-1">
            <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-border opacity-40" />
                <circle cx="45" cy="45" r="36" fill="none" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    className={`transition-all duration-1000 ${ringColor}`}
                    style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
                />
                <text x="45" y="49" textAnchor="middle" className={`font-bold fill-current ${color}`} style={{ fontSize: 22 }}>{score}</text>
            </svg>
            <span className="text-xs text-muted-foreground">Score Clínico</span>
        </div>
    );
}

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
                toast.success("Motor Clínico: Plano APROVADO! ✅ Plano pode ser ativado.");
                onApproved?.();
            } else {
                toast.error(`Motor Clínico: Plano REPROVADO. Score: ${data?.score ?? 0}/100`);
            }
        } catch (e: any) {
            toast.error(e.message || "Erro ao contactar o Motor Clínico");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <Button onClick={runAudit} disabled={loading} variant="outline" className="w-full gap-2 border-primary/40 hover:border-primary hover:bg-primary/5">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Auditando com o Motor Clínico...</> : <><ShieldCheck className="w-4 h-4 text-primary" /> Auditar / Validar Plano</>}
            </Button>

            <AnimatePresence>
                {result && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`glass rounded-xl border ${result.success ? "border-emerald-500/30" : "border-red-500/30"} p-5 space-y-5`}
                    >
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                {result.success ? <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" /> : <XCircle className="w-7 h-7 text-red-400 shrink-0" />}
                                <div>
                                    <h3 className={`font-display font-bold text-lg ${result.success ? "text-emerald-400" : "text-red-400"}`}>
                                        Plano {result.success ? "APROVADO" : "REPROVADO"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Motor Clínico Determinístico • {new Date(result.audit?.run_at).toLocaleString("pt-BR")}
                                    </p>
                                </div>
                            </div>
                            <ScoreGauge score={result.score} />
                        </div>

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

                        {result.restrictions_violated.length > 0 && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-1.5">
                                <h4 className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4" /> Restrições Violadas
                                </h4>
                                {result.restrictions_violated.map((rv, i) => (
                                    <div key={i} className="text-xs text-red-300">
                                        <span className="font-medium">{rv.restriction}:</span>{" "}
                                        ingrediente <code className="bg-red-900/30 px-1 rounded">{rv.keyword_found}</code> encontrado no plano
                                    </div>
                                ))}
                            </div>
                        )}

                        {!result.success && result.errors.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-red-400">Divergências Encontradas</h4>
                                {result.errors.map((e, i) => (
                                    <div key={i} className="text-xs text-muted-foreground flex gap-2">
                                        <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
                                        <span><code className="text-[10px] bg-muted px-1 rounded mr-1">{e.rule}</code>{e.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}

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
