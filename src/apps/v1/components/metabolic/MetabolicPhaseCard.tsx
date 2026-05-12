import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import { Separator } from "@v1/components/ui/separator";
import {
  Flame, TrendingDown, TrendingUp, Pause, AlertTriangle, Shield,
  RotateCcw, Target, Dumbbell, History, RefreshCw, Sparkles, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const PHASE_CONFIG: Record<string, {
  label: string;
  patientLabel: string;
  description: string;
  color: string;
  icon: any;
}> = {
  initial_response: {
    label: "Resposta Inicial",
    patientLabel: "Fase de Adaptação",
    description: "Fase inicial com boa resposta ao protocolo",
    color: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    icon: Sparkles,
  },
  active_loss: {
    label: "Perda Ativa",
    patientLabel: "Fase de Progresso Ativo",
    description: "Perda ativa e consistente em curso",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: TrendingDown,
  },
  slowing_response: {
    label: "Resposta Desacelerando",
    patientLabel: "Fase de Ajuste",
    description: "Velocidade de perda reduzindo — ajuste necessário",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Pause,
  },
  plateau_risk: {
    label: "Risco de Platô",
    patientLabel: "Fase de Atenção",
    description: "Sinais de estagnação iminente detectados",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: AlertTriangle,
  },
  plateau_active: {
    label: "Platô Ativo",
    patientLabel: "Fase de Reset",
    description: "Estagnação instalada — intervenção ativa",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: Flame,
  },
  consolidation: {
    label: "Consolidação",
    patientLabel: "Fase de Consolidação",
    description: "Protegendo o resultado conquistado",
    color: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    icon: Shield,
  },
  recovery: {
    label: "Recuperação Metabólica",
    patientLabel: "Fase de Recuperação",
    description: "Restauração do metabolismo antes do próximo ciclo",
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    icon: RotateCcw,
  },
  maintenance: {
    label: "Manutenção",
    patientLabel: "Fase de Manutenção",
    description: "Calorias estabilizadas — foco em constância",
    color: "bg-primary/20 text-primary border-primary/30",
    icon: Target,
  },
  recomposition: {
    label: "Recomposição Corporal",
    patientLabel: "Fase de Transformação",
    description: "Alta proteína e ajustes finos para transformar composição",
    color: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
    icon: Dumbbell,
  },
};

interface MetabolicPhaseCardProps {
  patientId: string;
  isProfessional?: boolean;
  compact?: boolean;
}

export default function MetabolicPhaseCard({ patientId, isProfessional = false, compact = false }: MetabolicPhaseCardProps) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["metabolic-phase", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("metabolic_phase, metabolic_phase_last_updated_at")
        .eq("user_id", patientId)
        .single();
      return data;
    },
    enabled: !!patientId,
  });

  const { data: latestStrategy } = useQuery({
    queryKey: ["metabolic-phase-strategy", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("metabolic_phase_history")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!patientId,
  });

  const { data: history } = useQuery({
    queryKey: ["metabolic-phase-history", patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("metabolic_phase_history")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    enabled: !!patientId && isProfessional && !compact,
  });

  const computeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("compute-metabolic-phase-strategy", {
        body: { patient_id: patientId, trigger_source: "manual" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["metabolic-phase", patientId] });
      queryClient.invalidateQueries({ queryKey: ["metabolic-phase-strategy", patientId] });
      queryClient.invalidateQueries({ queryKey: ["metabolic-phase-history", patientId] });
      if (data?.phase_changed) {
        toast.success(`Fase atualizada: ${PHASE_CONFIG[data.phase.metabolic_phase]?.label || data.phase.metabolic_phase}`);
      } else {
        toast.success("Fase metabólica reavaliada — sem alteração.");
      }
    },
    onError: (err: any) => toast.error(err.message || "Erro ao computar fase"),
  });

  const phase = profile?.metabolic_phase || "initial_response";
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.initial_response;
  const Icon = config.icon;
  const lastUpdated = profile?.metabolic_phase_last_updated_at;

  if (isLoading) {
    return <Card className="animate-pulse"><CardContent className="py-8"><div className="h-4 bg-muted rounded w-1/3 mx-auto" /></CardContent></Card>;
  }

  // Patient simplified view
  if (!isProfessional) {
    return (
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border ${config.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Sua fase atual</p>
              <h3 className="text-base font-semibold mt-0.5">{config.patientLabel}</h3>
              {latestStrategy?.clinical_reason && (
                <p className="text-sm text-muted-foreground mt-1">{latestStrategy.clinical_reason}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color}`}><Icon className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {Math.round((latestStrategy?.confidence_score ?? 0) * 100)}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Fase Metabólica Atual
          </span>
          <Button
            size="sm" variant="outline"
            onClick={() => computeMutation.mutate()}
            disabled={computeMutation.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${computeMutation.isPending ? "animate-spin" : ""}`} />
            {computeMutation.isPending ? "Calculando…" : "Recalcular"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase Badge */}
        <div className={`flex items-center gap-4 p-4 rounded-lg border ${config.color}`}>
          <div className="p-3 rounded-xl bg-background/50"><Icon className="h-6 w-6" /></div>
          <div className="flex-1">
            <h3 className="font-semibold text-base">{config.label}</h3>
            <p className="text-sm opacity-80">{config.description}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mono">{Math.round((latestStrategy?.confidence_score ?? 0) * 100)}%</span>
            <p className="text-xs opacity-70">confiança</p>
          </div>
        </div>

        {/* Strategy Suggestion */}
        {latestStrategy && (
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Estratégia Sugerida</p>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="text-xs">
                {latestStrategy.strategy_type?.replace(/_/g, " ")}
              </Badge>
              {latestStrategy.calories_before && latestStrategy.calories_after && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {Math.round(latestStrategy.calories_before)} kcal
                  <ArrowRight className="h-3 w-3" />
                  {Math.round(latestStrategy.calories_after)} kcal
                </span>
              )}
            </div>
            {latestStrategy.clinical_reason && (
              <p className="text-sm text-muted-foreground">{latestStrategy.clinical_reason}</p>
            )}
          </div>
        )}

        {/* Confidence Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Confiança do Motor</span>
            <span className="font-mono">{Math.round((latestStrategy?.confidence_score ?? 0) * 100)}%</span>
          </div>
          <Progress value={(latestStrategy?.confidence_score ?? 0) * 100} className="h-1.5" />
        </div>

        {lastUpdated && (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Última avaliação: {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true, locale: ptBR })}
            </p>
          </>
        )}

        {/* Phase History */}
        {history && history.length > 1 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <History className="h-3 w-3" /> Histórico de Fases
              </p>
              {history.map((h: any) => {
                const hConfig = PHASE_CONFIG[h.phase_type] || PHASE_CONFIG.initial_response;
                return (
                  <div key={h.id} className="flex items-center justify-between text-xs bg-muted/30 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${hConfig.color}`}>{hConfig.label}</Badge>
                      {h.previous_phase && h.previous_phase !== h.phase_type && (
                        <span className="text-muted-foreground">← {PHASE_CONFIG[h.previous_phase]?.label || h.previous_phase}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {h.calories_before && h.calories_after && h.calories_before !== h.calories_after && (
                        <span className="text-muted-foreground font-mono">
                          {Math.round(h.calories_before)}→{Math.round(h.calories_after)}
                        </span>
                      )}
                      <span className="text-muted-foreground">{format(new Date(h.created_at), "dd/MM/yy", { locale: ptBR })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
