import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@v1/components/ui/table";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { FlaskRound, Play, Pause, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  draft: "Rascunho", running: "Em Execução", paused: "Pausado", completed: "Concluído",
};
const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  running: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-primary/20 text-primary",
};
const interpretLabels: Record<string, string> = {
  strong_positive_effect: "Efeito Positivo Forte",
  moderate_positive_effect: "Efeito Positivo Moderado",
  neutral_effect: "Efeito Neutro",
  negative_effect: "Efeito Negativo",
  high_risk_effect: "Alto Risco",
};
const interpretColors: Record<string, string> = {
  strong_positive_effect: "bg-emerald-500/20 text-emerald-400",
  moderate_positive_effect: "bg-green-500/20 text-green-400",
  neutral_effect: "bg-muted text-muted-foreground",
  negative_effect: "bg-orange-500/20 text-orange-400",
  high_risk_effect: "bg-red-500/20 text-red-400",
};

function Delta({ value }: { value: number }) {
  const color = value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-muted-foreground";
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return <span className={`inline-flex items-center gap-1 text-sm ${color}`}><Icon className="h-3 w-3" />{value > 0 ? "+" : ""}{value}</span>;
}

export default function ClinicalLab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<any[]>([]);
  const [selectedExp, setSelectedExp] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("clinical_experiments")
        .select("*")
        .order("created_at", { ascending: false });
      setExperiments((data as any[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const loadDetails = async (expId: string) => {
    setSelectedExp(expId);
    const [{ data: g }, { data: r }, { data: ins }] = await Promise.all([
      supabase.from("clinical_experiment_groups").select("*").eq("experiment_id", expId),
      supabase.from("clinical_experiment_results").select("*").eq("experiment_id", expId),
      supabase.from("clinical_experiment_insights").select("*").eq("experiment_id", expId),
    ]);
    setGroups((g as any[]) || []);
    setResults((r as any[]) || []);
    setInsights((ins as any[]) || []);
  };

  const runAnalysis = async () => {
    try {
      await supabase.functions.invoke("compute-clinical-experiment-analysis");
      toast.success("Análise executada!");
      if (selectedExp) loadDetails(selectedExp);
    } catch { toast.error("Erro na análise"); }
  };

  const selectedExperiment = experiments.find((e) => e.id === selectedExp);

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FlaskRound className="h-7 w-7 text-primary" /> Laboratório Clínico
        </h1>
        <p className="text-muted-foreground text-sm">Experimentação Clínica Controlada — v1.0.0</p>
      </div>

      <div className="flex gap-3">
        <Button onClick={runAnalysis} variant="default" size="sm">
          <Play className="h-4 w-4 mr-1" /> Executar Análise
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando experimentos...</div>
      ) : experiments.length === 0 ? (
        <Card className="border-border/40"><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum experimento criado ainda. Crie um experimento para começar a validar intervenções.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Experiment list */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase">Experimentos</h2>
            {experiments.map((exp) => (
              <Card
                key={exp.id}
                className={`border-border/40 cursor-pointer transition-colors hover:bg-accent/50 ${selectedExp === exp.id ? "border-primary/50 bg-primary/5" : "bg-card/80"}`}
                onClick={() => loadDetails(exp.id)}
              >
                <CardContent className="pt-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{exp.experiment_name}</span>
                    <Badge variant="outline" className={statusColors[exp.status]}>{statusLabels[exp.status]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{exp.hypothesis_description}</p>
                  <div className="text-xs text-muted-foreground">{exp.expected_duration_days}d · {exp.experiment_type}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2 space-y-4">
            {selectedExperiment ? (
              <>
                <Card className="border-border/40 bg-card/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{selectedExperiment.experiment_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="text-muted-foreground">{selectedExperiment.hypothesis_description}</p>
                    <div className="flex gap-4 pt-2">
                      <Badge variant="outline">{selectedExperiment.experiment_type}</Badge>
                      <Badge variant="outline" className={statusColors[selectedExperiment.status]}>
                        {statusLabels[selectedExperiment.status]}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Results table */}
                {results.length > 0 && (
                  <Card className="border-border/40 bg-card/80">
                    <CardHeader><CardTitle className="text-base">Resultados por Grupo</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Grupo</TableHead>
                            <TableHead className="text-center">N</TableHead>
                            <TableHead className="text-center">Peso Δ</TableHead>
                            <TableHead className="text-center">Adesão Δ</TableHead>
                            <TableHead className="text-center">Abandono</TableHead>
                            <TableHead className="text-center">Sinal</TableHead>
                            <TableHead>Interpretação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.map((r) => {
                            const group = groups.find((g) => g.id === r.group_id);
                            return (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium">{group?.group_name || "—"}</TableCell>
                                <TableCell className="text-center">{r.patients_count}</TableCell>
                                <TableCell className="text-center"><Delta value={r.avg_weight_change} /></TableCell>
                                <TableCell className="text-center"><Delta value={r.avg_adherence_change} /></TableCell>
                                <TableCell className="text-center">{r.dropout_rate}%</TableCell>
                                <TableCell className="text-center">{r.statistical_signal_strength}%</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={interpretColors[r.result_interpretation]}>
                                    {interpretLabels[r.result_interpretation]}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Insights */}
                {insights.length > 0 && (
                  <Card className="border-border/40 bg-card/80">
                    <CardHeader><CardTitle className="text-base">Insights Clínicos</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {insights.map((ins) => (
                        <div key={ins.id} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-foreground">{ins.insight_description}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              Confiança: {ins.confidence_level === "high" ? "Alta" : ins.confidence_level === "medium" ? "Média" : "Baixa"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {results.length === 0 && (
                  <Card className="border-border/40"><CardContent className="py-8 text-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    Nenhum resultado ainda. Execute a análise após os pacientes acumularem dados.
                  </CardContent></Card>
                )}
              </>
            ) : (
              <Card className="border-border/40"><CardContent className="py-12 text-center text-muted-foreground">
                Selecione um experimento para ver os detalhes.
              </CardContent></Card>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
    </DashboardLayout>
  );
}
