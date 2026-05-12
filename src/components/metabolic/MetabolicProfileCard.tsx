import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import { Separator } from "@v1/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@v1/components/ui/tooltip";
import {
  Zap, Activity, TrendingDown, Shield, AlertTriangle, Target,
  Brain, RefreshCw, History, BarChart3, Dna
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const PROFILE_CONFIG: Record<string, {
  label: string;
  description: string;
  color: string;
  icon: any;
  strategy: string;
}> = {
  rapid_responder: {
    label: "Respondedor Rápido",
    description: "Perde peso rapidamente nas primeiras fases",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: Zap,
    strategy: "Aproveitar resposta inicial e planejar transição para manutenção"
  },
  slow_responder: {
    label: "Respondedor Lento",
    description: "Perda lenta porém constante",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: Activity,
    strategy: "Manter consistência a longo prazo com ajustes pequenos"
  },
  plateau_prone: {
    label: "Propenso a Platô",
    description: "Tendência forte a estagnação",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: TrendingDown,
    strategy: "Variações calóricas periódicas e refeeds estratégicos"
  },
  weight_cycler: {
    label: "Ciclador de Peso",
    description: "Histórico de efeito sanfona",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: RefreshCw,
    strategy: "Fase de consolidação longa e transições graduais"
  },
  resistant_metabolism: {
    label: "Metabolismo Resistente",
    description: "Resposta fraca mesmo com adesão",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: Shield,
    strategy: "Considerar ajustes intensivos ou investigação complementar"
  },
  behavioral_inconsistent: {
    label: "Inconsistência Comportamental",
    description: "Variação grande por baixa consistência",
    color: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    icon: AlertTriangle,
    strategy: "Estabilizar hábitos antes de ajustes calóricos"
  },
  stable_transformer: {
    label: "Transformador Estável",
    description: "Perda progressiva estável e sustentável",
    color: "bg-primary/20 text-primary border-primary/30",
    icon: Target,
    strategy: "Manter protocolo atual e priorizar qualidade nutricional"
  },
  unknown: {
    label: "Em Análise",
    description: "Dados insuficientes para classificação",
    color: "bg-muted text-muted-foreground border-border",
    icon: Brain,
    strategy: "Continue registrando para obter seu perfil metabólico"
  },
};

interface MetabolicProfileCardProps {
  patientId?: string;
  compact?: boolean;
}

export default function MetabolicProfileCard({ patientId, compact = false }: MetabolicProfileCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetId = patientId || user?.id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["metabolic-profile", targetId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("metabolic_response_type, metabolic_confidence_score, metabolic_last_evaluated_at, historical_loss_rate, regain_probability, plateau_probability, behavioral_consistency_score")
        .eq("user_id", targetId!)
        .single();
      return data;
    },
    enabled: !!targetId,
  });

  const { data: history } = useQuery({
    queryKey: ["metabolic-classification-history", targetId],
    queryFn: async () => {
      const { data } = await supabase
        .from("metabolic_classification_history")
        .select("*")
        .eq("patient_id", targetId!)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!targetId && !compact,
  });

  const classifyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("classify-metabolic-profile", {
        body: { patient_id: targetId, trigger_source: "manual" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["metabolic-profile", targetId] });
      queryClient.invalidateQueries({ queryKey: ["metabolic-classification-history", targetId] });
      if (data?.changed) {
        toast.success(`Perfil atualizado: ${PROFILE_CONFIG[data.metabolic_response_type]?.label || data.metabolic_response_type}`);
      } else {
        toast.success("Classificação mantida — sem alteração no perfil.");
      }
    },
    onError: (err: any) => toast.error(err.message || "Erro ao classificar perfil"),
  });

  const type = profile?.metabolic_response_type || "unknown";
  const config = PROFILE_CONFIG[type] || PROFILE_CONFIG.unknown;
  const Icon = config.icon;
  const confidence = profile?.metabolic_confidence_score ?? 0;
  const lastEvaluated = profile?.metabolic_last_evaluated_at;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8">
          <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
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
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {Math.round(confidence * 100)}%
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
            <Dna className="h-5 w-5 text-primary" />
            Perfil Metabólico Identificado
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => classifyMutation.mutate()}
                  disabled={classifyMutation.isPending}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${classifyMutation.isPending ? "animate-spin" : ""}`} />
                  {classifyMutation.isPending ? "Analisando…" : "Reclassificar"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reclassificar perfil metabólico com dados atuais</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Profile Badge */}
        <div className={`flex items-center gap-4 p-4 rounded-lg border ${config.color}`}>
          <div className="p-3 rounded-xl bg-background/50">
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base">{config.label}</h3>
            <p className="text-sm opacity-80">{config.description}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mono">{Math.round(confidence * 100)}%</span>
            <p className="text-xs opacity-70">confiança</p>
          </div>
        </div>

        {/* Strategy Impact */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <BarChart3 className="h-3 w-3" /> Impacto na estratégia
          </p>
          <p className="text-sm">{config.strategy}</p>
        </div>

        {/* Metric Bars */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Prob. Platô</span>
              <span className="font-mono">{Math.round((profile?.plateau_probability ?? 0) * 100)}%</span>
            </div>
            <Progress value={(profile?.plateau_probability ?? 0) * 100} className="h-1.5" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Prob. Reganho</span>
              <span className="font-mono">{Math.round((profile?.regain_probability ?? 0) * 100)}%</span>
            </div>
            <Progress value={(profile?.regain_probability ?? 0) * 100} className="h-1.5" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Consistência</span>
              <span className="font-mono">{Math.round((profile?.behavioral_consistency_score ?? 0) * 100)}%</span>
            </div>
            <Progress value={(profile?.behavioral_consistency_score ?? 0) * 100} className="h-1.5" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Taxa Semanal</span>
              <span className="font-mono">{profile?.historical_loss_rate ?? 0} kg/sem</span>
            </div>
          </div>
        </div>

        {lastEvaluated && (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Última avaliação: {formatDistanceToNow(new Date(lastEvaluated), { addSuffix: true, locale: ptBR })}
            </p>
          </>
        )}

        {/* Classification History */}
        {history && history.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <History className="h-3 w-3" /> Histórico de Classificações
              </p>
              {history.map((h: any) => {
                const hConfig = PROFILE_CONFIG[h.metabolic_response_type] || PROFILE_CONFIG.unknown;
                return (
                  <div key={h.id} className="flex items-center justify-between text-xs bg-muted/30 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${hConfig.color}`}>
                        {hConfig.label}
                      </Badge>
                      {h.previous_type && h.previous_type !== h.metabolic_response_type && (
                        <span className="text-muted-foreground">
                          ← {PROFILE_CONFIG[h.previous_type]?.label || h.previous_type}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {format(new Date(h.created_at), "dd/MM/yy", { locale: ptBR })}
                    </span>
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
