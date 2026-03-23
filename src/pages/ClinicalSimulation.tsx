import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FlaskConical, TrendingUp, TrendingDown, Shield, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface SimulationRow {
  id: string;
  patient_id: string;
  simulation_type: string;
  simulated_intervention: any;
  baseline_state: any;
  projected_outcomes: any;
  projected_risks: any;
  recommended_decision: string;
  simulation_confidence_score: number;
  confidence_classification: string;
  engine_version: string;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  caloric_adjustment_down: "Redução Calórica",
  caloric_adjustment_up: "Aumento Calórico",
  diet_break: "Diet Break",
  template_switch: "Troca de Template",
  protocol_switch: "Troca de Protocolo",
  behavioral_simplification: "Simplificação Comportamental",
  no_change_monitoring: "Manter e Monitorar",
};

const decisionLabels: Record<string, string> = {
  apply_caloric_reduction: "Reduzir Calorias",
  apply_caloric_increase: "Aumentar Calorias",
  start_diet_break: "Iniciar Diet Break",
  switch_template: "Trocar Template",
  switch_protocol: "Trocar Protocolo",
  simplify_plan: "Simplificar Plano",
  keep_and_monitor: "Manter e Monitorar",
  require_manual_review: "Revisão Manual Necessária",
};

const confColors: Record<string, string> = {
  alta_confianca: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  media_confianca: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  baixa_confianca: "bg-red-500/20 text-red-400 border-red-500/30",
};

const confLabels: Record<string, string> = {
  alta_confianca: "Alta Confiança",
  media_confianca: "Média Confiança",
  baixa_confianca: "Baixa Confiança",
};

function DeltaIndicator({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const positive = inverted ? value < 0 : value > 0;
  const color = positive ? "text-emerald-400" : value === 0 ? "text-muted-foreground" : "text-red-400";
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}{value}
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: "bg-emerald-500/20 text-emerald-400",
    moderate: "bg-yellow-500/20 text-yellow-400",
    high: "bg-red-500/20 text-red-400",
  };
  const labels: Record<string, string> = { low: "Baixo", moderate: "Moderado", high: "Alto" };
  return <Badge variant="outline" className={colors[level] || ""}>{labels[level] || level}</Badge>;
}

export default function ClinicalSimulation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [simulations, setSimulations] = useState<SimulationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: links } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user.id)
        .eq("status", "active");
      if (!links?.length) return;
      const ids = links.map((l: any) => l.patient_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      setPatients((profiles || []).map((p: any) => ({ id: p.user_id, name: p.full_name || "Paciente" })));
    })();
  }, [user]);

  const loadSimulations = async (pid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("clinical_intervention_simulations")
      .select("*")
      .eq("patient_id", pid)
      .order("created_at", { ascending: false })
      .limit(7);
    setSimulations((data as any[]) || []);
    setLoading(false);
  };

  const runSimulation = async () => {
    if (!selectedPatient) return;
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("compute-clinical-simulation-engine", {
        body: { patient_id: selectedPatient },
      });
      if (error) throw error;
      await loadSimulations(selectedPatient);
      toast.success("Simulação executada com sucesso!");
    } catch {
      toast.error("Erro ao executar simulação");
    }
    setRunning(false);
  };

  const handlePatientChange = (pid: string) => {
    setSelectedPatient(pid);
    loadSimulations(pid);
  };

  const bestSim = simulations.reduce((best, s) => {
    if (!best) return s;
    const score = (o: any) =>
      (o.projected_goal_achievement_delta || 0) * 2 +
      (o.projected_adherence_delta || 0) * 1.5 -
      (o.projected_stagnation_risk_delta || 0) -
      (o.projected_dropout_risk_delta || 0) * 1.5;
    return score(s.projected_outcomes) > score(best.projected_outcomes) ? s : best;
  }, null as SimulationRow | null);

  const baseline = simulations[0]?.baseline_state;

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FlaskConical className="h-7 w-7 text-primary" /> Simulador Clínico
        </h1>
        <p className="text-muted-foreground text-sm">Motor de Simulação de Cenários Terapêuticos — v1.0.0</p>
      </div>

      {/* Patient selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedPatient} onValueChange={handlePatientChange}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Selecionar paciente..." /></SelectTrigger>
          <SelectContent>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={runSimulation} disabled={!selectedPatient || running} variant="default">
          {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FlaskConical className="h-4 w-4 mr-2" />}
          Simular Cenários
        </Button>
      </div>

      {loading && <div className="text-center py-12 text-muted-foreground">Carregando simulações...</div>}

      {!loading && selectedPatient && simulations.length === 0 && (
        <Card className="border-border/40"><CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma simulação disponível. Clique em "Simular Cenários" para gerar.
        </CardContent></Card>
      )}

      {!loading && simulations.length > 0 && (
        <>
          {/* Baseline + best recommendation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {baseline && (
              <Card className="border-border/40 bg-card/80">
                <CardHeader className="pb-2"><CardTitle className="text-base">Estado Atual</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Cluster</span><Badge variant="secondary">{baseline.cluster_type}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tendência</span><span className="text-foreground">{baseline.weight_trend}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Adesão 7d</span><span className="text-foreground">{baseline.adherence_7d}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Eficácia Plano</span><span className="text-foreground">{baseline.plan_efficacy}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Risco</span><Badge variant="outline">{baseline.risk_level}</Badge></div>
                </CardContent>
              </Card>
            )}

            {bestSim && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" /> Melhor Decisão Sugerida
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-lg font-bold text-foreground flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    {decisionLabels[bestSim.recommended_decision] || bestSim.recommended_decision}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cenário: {typeLabels[bestSim.simulation_type]}
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>Meta: <DeltaIndicator value={bestSim.projected_outcomes.projected_goal_achievement_delta} /></span>
                    <span>Adesão: <DeltaIndicator value={bestSim.projected_outcomes.projected_adherence_delta} /></span>
                  </div>
                  <Badge variant="outline" className={confColors[bestSim.confidence_classification]}>
                    {confLabels[bestSim.confidence_classification]}
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Comparison table */}
          <Card className="border-border/40 bg-card/80">
            <CardHeader><CardTitle className="text-base">Comparação de Cenários</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cenário</TableHead>
                    <TableHead className="text-center">Meta Δ</TableHead>
                    <TableHead className="text-center">Adesão Δ</TableHead>
                    <TableHead className="text-center">Estagnação Δ</TableHead>
                    <TableHead className="text-center">Abandono Δ</TableHead>
                    <TableHead className="text-center">Regressão Δ</TableHead>
                    <TableHead className="text-center">Tempo Resp.</TableHead>
                    <TableHead className="text-center">Confiança</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulations.map((sim) => {
                    const o = sim.projected_outcomes;
                    const isBest = bestSim?.id === sim.id;
                    return (
                      <TableRow key={sim.id} className={isBest ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium">
                          {typeLabels[sim.simulation_type] || sim.simulation_type}
                          {isBest && <Badge variant="default" className="ml-2 text-xs">Recomendado</Badge>}
                        </TableCell>
                        <TableCell className="text-center"><DeltaIndicator value={o.projected_goal_achievement_delta} /></TableCell>
                        <TableCell className="text-center"><DeltaIndicator value={o.projected_adherence_delta} /></TableCell>
                        <TableCell className="text-center"><DeltaIndicator value={o.projected_stagnation_risk_delta} inverted /></TableCell>
                        <TableCell className="text-center"><DeltaIndicator value={o.projected_dropout_risk_delta} inverted /></TableCell>
                        <TableCell className="text-center"><DeltaIndicator value={o.projected_regression_risk_delta} inverted /></TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">{o.projected_time_to_response_days}d</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={confColors[sim.confidence_classification]}>
                            {sim.simulation_confidence_score}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Individual scenario cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {simulations.map((sim) => (
              <Card key={sim.id} className="border-border/40 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{typeLabels[sim.simulation_type]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-muted-foreground">Meta:</span>
                    <DeltaIndicator value={sim.projected_outcomes.projected_goal_achievement_delta} />
                    <span className="text-muted-foreground">Adesão:</span>
                    <DeltaIndicator value={sim.projected_outcomes.projected_adherence_delta} />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(sim.projected_risks as Record<string, string>).map(([key, val]) => (
                      <RiskBadge key={key} level={val} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
    </div>
    </DashboardLayout>
  );
}
