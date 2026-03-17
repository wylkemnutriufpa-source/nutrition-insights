/**
 * BodyProjectionProCard — Professional view of patient's body projection
 * Shows metabolic profile, phase, projected summary, and suggested strategy
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  TrendingDown, TrendingUp, Activity, AlertTriangle,
  Calendar, Sparkles, RefreshCw, Clock, Target, Brain,
  ArrowDown, ArrowUp, Minus, Shield,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Props {
  patientId: string;
  isAdmin?: boolean;
}

interface Snapshot {
  id: string;
  timeframe: string;
  current_metrics_json: any;
  projected_metrics_json: any;
  narrative: string | null;
  confidence_score: number | null;
  created_at: string;
  valid_until: string | null;
  locked_until: string | null;
  projected_body_fat: number | null;
  metabolic_adaptation_index: number | null;
  plateau_risk: number | null;
  visual_state_seed: any;
}

const TIMEFRAME_LABELS: Record<string, string> = {
  "30d": "30 dias",
  "90d": "90 dias",
  "180d": "6 meses",
  "365d": "1 ano",
};

const phaseLabels: Record<string, { label: string; color: string; icon: any }> = {
  acute_loss: { label: "Perda Aguda", color: "text-emerald-500", icon: TrendingDown },
  progressive_loss: { label: "Perda Progressiva", color: "text-teal-500", icon: TrendingDown },
  plateau_risk: { label: "Risco de Platô", color: "text-amber-500", icon: Minus },
  plateau: { label: "Platô", color: "text-amber-600", icon: Minus },
  maintenance: { label: "Manutenção", color: "text-blue-500", icon: Target },
  recomposition: { label: "Recomposição", color: "text-purple-500", icon: Activity },
  regain_risk: { label: "Risco de Regain", color: "text-red-500", icon: AlertTriangle },
};

export default function BodyProjectionProCard({ patientId, isAdmin }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("90d");
  const [weightHistory, setWeightHistory] = useState<{ date: string; weight: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, [patientId]);

  async function fetchData() {
    setLoading(true);
    const [snapRes, historyRes, checkinRes] = await Promise.all([
      supabase
        .from("body_projection_snapshots")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("patient_weight_history")
        .select("measurement_date, weight_kg")
        .eq("patient_id", patientId)
        .order("measurement_date", { ascending: true }),
      supabase
        .from("patient_checkins")
        .select("weight, created_at")
        .eq("patient_id", patientId)
        .not("weight", "is", null)
        .order("created_at", { ascending: true })
        .limit(30),
    ]);

    setSnapshots((snapRes.data || []) as unknown as Snapshot[]);

    // Build weight timeline
    const history: { date: string; weight: number }[] = [];
    (historyRes.data || []).forEach((r: any) => {
      history.push({ date: r.measurement_date, weight: r.weight_kg });
    });
    (checkinRes.data || []).forEach((r: any) => {
      if (r.weight) history.push({ date: r.created_at.split("T")[0], weight: r.weight });
    });
    history.sort((a, b) => a.date.localeCompare(b.date));
    setWeightHistory(history);
    setLoading(false);
  }

  async function handleGenerateProjection() {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-body-projection", {
        body: {
          patient_id: patientId,
          generate_all_timeframes: true,
          generation_source: "professional_override",
          override: true,
        },
      });
      if (error) throw error;
      toast.success("Projeção gerada com sucesso!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar projeção");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Get latest snapshots grouped by timeframe
  const latestByTimeframe: Record<string, Snapshot> = {};
  snapshots.forEach((s) => {
    if (!latestByTimeframe[s.timeframe]) latestByTimeframe[s.timeframe] = s;
  });

  const selected = latestByTimeframe[selectedTimeframe];
  const currentMetrics = selected?.current_metrics_json || {};
  const projectedMetrics = selected?.projected_metrics_json || {};
  const lastGenerated = snapshots[0]?.created_at;
  const lockedUntil = snapshots[0]?.locked_until;
  const canGenerate = !lockedUntil || new Date(lockedUntil) <= new Date() || isAdmin;

  // Build chart data
  const chartData: { label: string; peso: number; tipo: string }[] = [];
  // Past weights (last 6)
  const recentHistory = weightHistory.slice(-6);
  recentHistory.forEach((w) => {
    chartData.push({ label: format(new Date(w.date), "dd/MM", { locale: ptBR }), peso: w.weight, tipo: "real" });
  });
  // Current
  if (currentMetrics.weight) {
    chartData.push({ label: "Atual", peso: currentMetrics.weight, tipo: "atual" });
  }
  // Projections
  ["30d", "90d", "180d", "365d"].forEach((tf) => {
    const snap = latestByTimeframe[tf];
    if (snap?.projected_metrics_json?.projected_weight) {
      chartData.push({
        label: TIMEFRAME_LABELS[tf],
        peso: snap.projected_metrics_json.projected_weight,
        tipo: "projecao",
      });
    }
  });

  const metabolicType = currentMetrics.metabolic_type || selected?.visual_state_seed?.metabolicType || "unknown";
  const currentPhase = currentMetrics.clinical_phase || "unknown";
  const projectedPhase = projectedMetrics.projected_phase || currentPhase;
  const strategy = projectedMetrics.recommended_strategy || projectedMetrics.strategy || "Manter protocolo atual";

  const metabolicTypeLabels: Record<string, string> = {
    rapid_responder: "Resposta Rápida",
    stable_transformer: "Transformador Estável",
    slow_responder: "Resposta Lenta",
    plateau_prone: "Propenso a Platô",
    weight_cycler: "Ciclo de Peso",
    behavioral_inconsistent: "Inconsistente",
    resistant_metabolism: "Metabolismo Resistente",
    unknown: "Em Análise",
  };

  const phaseInfo = phaseLabels[projectedPhase] || phaseLabels.maintenance || { label: projectedPhase, color: "text-muted-foreground", icon: Activity };
  const PhaseIcon = phaseInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header with generation controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Projeção Corporal
          </h3>
          {lastGenerated && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Última geração: {formatDistanceToNow(new Date(lastGenerated), { addSuffix: true, locale: ptBR })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!canGenerate && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Clock className="w-3 h-3" />
              Próxima em {lockedUntil ? formatDistanceToNow(new Date(lockedUntil), { locale: ptBR }) : "—"}
            </Badge>
          )}
          <Button
            size="sm"
            onClick={handleGenerateProjection}
            disabled={generating || (!canGenerate && !isAdmin)}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Gerando..." : isAdmin ? "Gerar (Override)" : "Gerar Projeção"}
          </Button>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Brain className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground mb-2">Nenhuma projeção gerada ainda</p>
          <p className="text-xs text-muted-foreground">Clique em "Gerar Projeção" para criar a primeira análise.</p>
        </div>
      ) : (
        <>
          {/* Metabolic Profile Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Perfil Metabólico"
              value={metabolicTypeLabels[metabolicType] || metabolicType}
              icon={Brain}
              color="text-purple-500"
            />
            <MetricCard
              label="Fase Projetada"
              value={phaseInfo.label}
              icon={PhaseIcon}
              color={phaseInfo.color}
            />
            <MetricCard
              label="Risco de Platô"
              value={selected?.plateau_risk != null ? `${Math.round(selected.plateau_risk * 100)}%` : "—"}
              icon={AlertTriangle}
              color={selected?.plateau_risk && selected.plateau_risk > 0.5 ? "text-amber-500" : "text-emerald-500"}
            />
            <MetricCard
              label="Confiança"
              value={selected?.confidence_score != null ? `${Math.round(selected.confidence_score * 100)}%` : "—"}
              icon={Shield}
              color="text-blue-500"
            />
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
            {Object.entries(TIMEFRAME_LABELS).map(([tf, label]) => (
              <Button
                key={tf}
                variant={selectedTimeframe === tf ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setSelectedTimeframe(tf)}
                disabled={!latestByTimeframe[tf]}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="proGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v.toFixed(1)} kg`, "Peso"]}
                  />
                  {currentMetrics.weight && (
                    <ReferenceLine y={currentMetrics.weight} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  )}
                  <Area
                    type="monotone"
                    dataKey="peso"
                    stroke="hsl(var(--primary))"
                    fill="url(#proGradient)"
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.tipo === "atual") {
                        return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={5} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />;
                      }
                      if (payload.tipo === "projecao") {
                        return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill="hsl(var(--primary))" stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="2 2" />;
                      }
                      return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={3} fill="hsl(var(--muted-foreground))" />;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Selected projection details */}
          {selected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Projection Numbers */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Projeção {TIMEFRAME_LABELS[selectedTimeframe]}
                </h4>
                <div className="space-y-2">
                  {projectedMetrics.projected_weight && (
                    <ProjectionRow
                      label="Peso Projetado"
                      value={`${projectedMetrics.projected_weight.toFixed(1)} kg`}
                      delta={projectedMetrics.weight_delta || (projectedMetrics.projected_weight - (currentMetrics.weight || 0))}
                    />
                  )}
                  {selected.projected_body_fat != null && (
                    <ProjectionRow
                      label="% Gordura Projetado"
                      value={`${selected.projected_body_fat.toFixed(1)}%`}
                    />
                  )}
                  {projectedMetrics.projected_bmi && (
                    <ProjectionRow
                      label="IMC Projetado"
                      value={projectedMetrics.projected_bmi.toFixed(1)}
                    />
                  )}
                  {selected.metabolic_adaptation_index != null && (
                    <ProjectionRow
                      label="Adaptação Metabólica"
                      value={`${Math.round(selected.metabolic_adaptation_index * 100)}%`}
                    />
                  )}
                </div>
              </div>

              {/* Strategy */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-accent" /> Estratégia Sugerida
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{strategy}</p>
                {selected.narrative && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-4">
                      {selected.narrative}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Estimativa educativa baseada no motor clínico FitJourney. Não constitui diagnóstico ou promessa de resultado.
              Projeções são recalculadas automaticamente a cada nova avaliação.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ProjectionRow({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{value}</span>
        {delta != null && (
          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${delta < 0 ? "text-emerald-500" : delta > 0 ? "text-red-500" : "text-muted-foreground"}`}>
            {delta < 0 ? <ArrowDown className="w-3 h-3" /> : delta > 0 ? <ArrowUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(delta).toFixed(1)} kg
          </span>
        )}
      </div>
    </div>
  );
}
