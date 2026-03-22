import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dna, Brain, TrendingDown, TrendingUp, Shield, AlertTriangle, Activity, Zap, Target, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

const classificationLabels: Record<string, { label: string; color: string; icon: any }> = {
  fast_responder: { label: "Respondedor Rápido", color: "bg-emerald-500/20 text-emerald-400", icon: Zap },
  adaptive_responder: { label: "Respondedor Adaptativo", color: "bg-blue-500/20 text-blue-400", icon: Activity },
  plateau_prone: { label: "Propenso a Platô", color: "bg-amber-500/20 text-amber-400", icon: TrendingDown },
  resistant_metabolism: { label: "Metabolismo Resistente", color: "bg-red-500/20 text-red-400", icon: Shield },
  recomposition_pattern: { label: "Padrão de Recomposição", color: "bg-purple-500/20 text-purple-400", icon: Target },
};

const interventionOptions = [
  { value: "moderate_deficit", label: "Déficit Moderado (-500kcal)" },
  { value: "aggressive_deficit", label: "Déficit Agressivo (-1000kcal)" },
  { value: "diet_break", label: "Diet Break (manutenção)" },
  { value: "reverse_diet", label: "Reverse Diet (+200kcal)" },
  { value: "maintenance_phase", label: "Fase de Manutenção" },
  { value: "hypertrophy_phase", label: "Fase Hipertrófica (+300kcal)" },
];

function MetricBar({ label, value, color = "bg-primary", icon: Icon }: { label: string; value: number; color?: string; icon?: any }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </span>
        <span className="font-mono font-semibold">{value.toFixed(1)}</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

export default function MetabolicTwin() {
  const { user } = useAuth();
  const [selectedIntervention, setSelectedIntervention] = useState("moderate_deficit");
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Load twin for current patient context (nutritionist picks patient elsewhere)
  // Get patient IDs owned by this nutritionist for data isolation
  const { data: myPatientIds } = useQuery({
    queryKey: ["my-patient-ids", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user!.id)
        .eq("status", "active");
      return data?.map((d) => d.patient_id) ?? [];
    },
    enabled: !!user,
  });

  const { data: twinData, isLoading } = useQuery({
    queryKey: ["metabolic-twin", user?.id, myPatientIds],
    queryFn: async () => {
      if (!myPatientIds || myPatientIds.length === 0) return [];
      const { data } = await supabase
        .from("patient_metabolic_twin")
        .select("*")
        .in("patient_id", myPatientIds)
        .limit(10);
      return data ?? [];
    },
    enabled: !!user && !!myPatientIds,
  });

  const { data: plateauData } = useQuery({
    queryKey: ["plateau-predictions", user?.id, myPatientIds],
    queryFn: async () => {
      if (!myPatientIds || myPatientIds.length === 0) return [];
      const { data } = await supabase
        .from("patient_plateau_predictions")
        .select("*")
        .in("patient_id", myPatientIds)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user && !!myPatientIds,
  });

  const computeMutation = useMutation({
    mutationFn: async (patientId: string) => {
      const { data, error } = await supabase.functions.invoke("compute-metabolic-twin-engine", {
        body: { patient_id: patientId, simulate_intervention: selectedIntervention },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSimulationResult(data);
      toast.success("Digital Twin atualizado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const firstTwin = twinData?.[0];
  const cls = firstTwin ? classificationLabels[firstTwin.response_classification] ?? classificationLabels.adaptive_responder : null;

  return (
    <>
      <Helmet>
        <title>Digital Twin Metabólico | FitJourney</title>
        <meta name="description" content="Modelo metabólico digital individual para simulação de intervenções nutricionais" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Dna className="h-6 w-6 text-primary" />
              Digital Twin Metabólico
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Modelo metabólico individual — simulação determinística de intervenções
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">ENGINE v1.0.0</Badge>
        </div>

        {/* Twin Profile */}
        {firstTwin && cls && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Perfil Metabólico
                </span>
                <Badge className={cls.color}>
                  <cls.icon className="h-3.5 w-3.5 mr-1" />
                  {cls.label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricBar label="Eficiência Metabólica" value={firstTwin.metabolic_efficiency_score} icon={Zap} />
                <MetricBar label="Resistência Adaptativa" value={firstTwin.adaptive_resistance_score} icon={Shield} />
                <MetricBar label="Resposta à Perda de Gordura" value={firstTwin.fat_loss_response_index} icon={TrendingDown} />
                <MetricBar label="Preservação de Massa Magra" value={firstTwin.lean_mass_preservation_index} icon={Target} />
                <MetricBar label="Flexibilidade Metabólica" value={firstTwin.metabolic_flexibility_index} icon={Activity} />
                <MetricBar label="Risco de Reganho" value={firstTwin.regain_risk_score} icon={AlertTriangle} color="bg-destructive" />
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platô previsto em</span>
                <span className="font-semibold">{firstTwin.predicted_plateau_weeks} semanas</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confiança do modelo</span>
                <span className="font-semibold">{firstTwin.model_confidence}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Simulation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FlaskConical className="h-5 w-5 text-primary" />
              Simular Cenário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedIntervention} onValueChange={setSelectedIntervention}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interventionOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => firstTwin && computeMutation.mutate(firstTwin.patient_id)}
                disabled={computeMutation.isPending || !firstTwin}
              >
                {computeMutation.isPending ? "Simulando…" : "Simular Intervenção"}
              </Button>
            </div>

            {simulationResult?.simulation && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm">{simulationResult.simulation.label}</h4>
                {simulationResult.simulation.blocked ? (
                  <Badge variant="destructive">{simulationResult.simulation.block_reason}</Badge>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground block">Peso (4 sem)</span>
                      <span className="font-semibold text-lg">
                        {simulationResult.simulation.expected_weight_delta_4w > 0 ? "+" : ""}
                        {simulationResult.simulation.expected_weight_delta_4w} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">% Gordura</span>
                      <span className="font-semibold text-lg">
                        {simulationResult.simulation.expected_body_fat_delta > 0 ? "+" : ""}
                        {simulationResult.simulation.expected_body_fat_delta}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Prob. Platô</span>
                      <span className="font-semibold text-lg">{simulationResult.simulation.plateau_probability}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Risco Adesão</span>
                      <span className="font-semibold text-lg">{simulationResult.simulation.adherence_risk}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Stress Metabólico</span>
                      <span className="font-semibold text-lg">{simulationResult.simulation.metabolic_stress_score}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {simulationResult?.strategies?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  <Brain className="h-4 w-4" /> Recomendações Estratégicas
                </h4>
                {simulationResult.strategies.map((s: any, i: number) => (
                  <div key={i} className="bg-muted/30 rounded-md p-3 flex items-start gap-3">
                    <Badge variant={s.urgency === "alta" ? "destructive" : s.urgency === "media" ? "default" : "secondary"} className="text-xs shrink-0 mt-0.5">
                      {s.urgency}
                    </Badge>
                    <div className="text-sm">
                      <span className="font-medium">{s.strategy.replace(/_/g, " ")}</span>
                      <p className="text-muted-foreground text-xs mt-0.5">{s.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plateau History */}
        {plateauData && plateauData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-amber-500" />
                Previsões de Platô
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {plateauData.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-muted/30 p-3 rounded-md text-sm">
                    <div>
                      <span className="font-medium">Semana {p.predicted_plateau_start_week}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{p.predicted_plateau_intensity}</Badge>
                    </div>
                    <span className="text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && (!twinData || twinData.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Dna className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">Nenhum Digital Twin gerado</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-md">
                O modelo metabólico será construído automaticamente após pesagens e avaliações suficientes.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
