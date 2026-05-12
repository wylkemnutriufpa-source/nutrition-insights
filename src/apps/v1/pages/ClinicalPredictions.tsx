import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import { Button } from "@v1/components/ui/button";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Target, TrendingDown, UserX, AlertTriangle, Clock, Brain, Shield, ArrowLeft } from "lucide-react";

interface PredictionRow {
  patient_id: string;
  predicted_goal_achievement_probability: number;
  predicted_stagnation_probability: number;
  predicted_dropout_probability: number;
  predicted_regression_probability: number;
  predicted_time_to_next_intervention_days: number;
  prediction_confidence_score: number;
  main_prediction_driver: string;
  goal_classification: string;
  stagnation_classification: string;
  dropout_classification: string;
  regression_classification: string;
  confidence_classification: string;
  engine_version: string;
  updated_at: string;
}

const driverLabels: Record<string, string> = {
  low_adherence: "Baixa Adesão",
  metabolic_resistance: "Resistência Metabólica",
  behavioral_instability: "Instabilidade Comportamental",
  low_recovery: "Recuperação Baixa",
  high_stress: "Estresse Elevado",
  therapeutic_failure: "Falha Terapêutica",
  protocol_mismatch: "Protocolo Inadequado",
  disengagement_risk: "Risco de Desengajamento",
  positive_momentum: "Momentum Positivo",
};

const classificationColors: Record<string, string> = {
  very_high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  high: "bg-green-500/20 text-green-400 border-green-500/30",
  moderate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  very_low: "bg-red-500/20 text-red-400 border-red-500/30",
  baixo_risco: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  risco_moderado: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  alto_risco: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  risco_iminente: "bg-red-500/20 text-red-400 border-red-500/30",
  alta_confianca: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  media_confianca: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  baixa_confianca: "bg-red-500/20 text-red-400 border-red-500/30",
};

const classificationLabels: Record<string, string> = {
  very_high: "Muito Alta", high: "Alta", moderate: "Moderada", low: "Baixa", very_low: "Muito Baixa",
  baixo_risco: "Baixo Risco", risco_moderado: "Risco Moderado", alto_risco: "Alto Risco", risco_iminente: "Risco Iminente",
  alta_confianca: "Alta Confiança", media_confianca: "Média Confiança", baixa_confianca: "Baixa Confiança",
};

function PredictionGauge({ value, label, icon: Icon, classification }: { value: number; label: string; icon: any; classification: string }) {
  const color = value >= 65 ? "text-red-400" : value >= 40 ? "text-yellow-400" : "text-emerald-400";
  return (
    <div className="text-center space-y-2">
      <Icon className={`h-6 w-6 mx-auto ${color}`} />
      <div className={`text-2xl font-bold ${color}`}>{value}%</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Badge variant="outline" className={classificationColors[classification] || ""}>
        {classificationLabels[classification] || classification}
      </Badge>
    </div>
  );
}

export default function ClinicalPredictions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Get patient ids
      const { data: links } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user.id)
        .eq("status", "active");

      if (!links?.length) { setLoading(false); return; }
      const ids = links.map((l: any) => l.patient_id);

      const [{ data: preds }, { data: profs }] = await Promise.all([
        supabase.from("patient_predicted_outcomes").select("*").in("patient_id", ids),
        supabase.from("profiles").select("user_id, full_name").in("user_id", ids),
      ]);

      setPredictions((preds as any[]) || []);
      const nameMap: Record<string, string> = {};
      for (const p of profs || []) nameMap[p.user_id] = p.full_name || "Paciente";
      setProfiles(nameMap);
      setLoading(false);
    })();
  }, [user]);

  const highRiskPatients = predictions.filter(p => p.predicted_dropout_probability >= 50 || p.predicted_regression_probability >= 50);
  const avgGoal = predictions.length ? Math.round(predictions.reduce((s, p) => s + p.predicted_goal_achievement_probability, 0) / predictions.length) : 0;
  const avgDropout = predictions.length ? Math.round(predictions.reduce((s, p) => s + p.predicted_dropout_probability, 0) / predictions.length) : 0;

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" /> Previsão Clínica
        </h1>
        <p className="text-muted-foreground text-sm">Motor Preditivo de Desfechos — v1.0.0</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/80">
          <CardContent className="pt-4 text-center">
            <Target className="h-6 w-6 mx-auto text-emerald-400 mb-1" />
            <div className="text-2xl font-bold text-foreground">{avgGoal}%</div>
            <p className="text-xs text-muted-foreground">Meta Média</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="pt-4 text-center">
            <UserX className="h-6 w-6 mx-auto text-orange-400 mb-1" />
            <div className="text-2xl font-bold text-foreground">{avgDropout}%</div>
            <p className="text-xs text-muted-foreground">Abandono Médio</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="pt-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto text-red-400 mb-1" />
            <div className="text-2xl font-bold text-foreground">{highRiskPatients.length}</div>
            <p className="text-xs text-muted-foreground">Alto Risco</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="pt-4 text-center">
            <Shield className="h-6 w-6 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold text-foreground">{predictions.length}</div>
            <p className="text-xs text-muted-foreground">Pacientes Analisados</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando previsões...</div>
      ) : predictions.length === 0 ? (
        <Card className="border-border/40"><CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma previsão disponível ainda. O motor preditivo roda diariamente.
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {predictions
            .sort((a, b) => b.predicted_dropout_probability - a.predicted_dropout_probability)
            .map((pred) => (
              <Card key={pred.patient_id} className="border-border/40 bg-card/80">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-foreground">
                      {profiles[pred.patient_id] || "Paciente"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={classificationColors[pred.confidence_classification]}>
                        {classificationLabels[pred.confidence_classification]}
                      </Badge>
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        <Clock className="h-3 w-3 mr-1" />
                        Intervir em {pred.predicted_time_to_next_intervention_days}d
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
                    <PredictionGauge value={pred.predicted_goal_achievement_probability} label="Chance de Meta" icon={Target} classification={pred.goal_classification} />
                    <PredictionGauge value={pred.predicted_stagnation_probability} label="Risco Estagnação" icon={TrendingDown} classification={pred.stagnation_classification} />
                    <PredictionGauge value={pred.predicted_dropout_probability} label="Risco Abandono" icon={UserX} classification={pred.dropout_classification} />
                    <PredictionGauge value={pred.predicted_regression_probability} label="Risco Regressão" icon={AlertTriangle} classification={pred.regression_classification} />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Driver principal:</span>
                    <Badge variant="secondary">{driverLabels[pred.main_prediction_driver] || pred.main_prediction_driver}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
    </div>
    </DashboardLayout>
  );
}
