import { useEffect, useState } from "react";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { Button } from "@v1/components/ui/button";
import { Heart, Activity, Moon, Zap, AlertTriangle, Watch, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { toast } from "sonner";

interface PhysioSnapshot {
  patient_id: string;
  snapshot_date: string;
  rpi: number;
  psi: number;
  training_load_balance: string;
  physiological_risk_level: string;
  has_physiological_data: boolean;
  resting_hr_trend: string | null;
  hrv_trend: string | null;
  sleep_trend: string | null;
  metadata: any;
  engine_version: string;
}

interface PhysioSignal {
  signal_date: string;
  resting_heart_rate: number | null;
  heart_rate_variability: number | null;
  sleep_duration_minutes: number | null;
  sleep_quality_score: number | null;
  steps: number | null;
  training_load_score: number | null;
  readiness_score: number | null;
  stress_index: number | null;
}

const riskColors: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  moderate: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const riskLabels: Record<string, string> = {
  low: "Baixo", moderate: "Moderado", high: "Alto", critical: "Crítico",
};

const tlbLabels: Record<string, string> = {
  undertrained: "Sub-treinado", optimal: "Ótimo", overloaded: "Sobrecarregado",
};

const tlbColors: Record<string, string> = {
  undertrained: "bg-blue-500/20 text-blue-400",
  optimal: "bg-emerald-500/20 text-emerald-400",
  overloaded: "bg-red-500/20 text-red-400",
};

function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function ScoreGauge({ value, label, icon: Icon, color }: { value: number; label: string; icon: any; color: string }) {
  return (
    <div className="text-center space-y-2">
      <Icon className={`h-6 w-6 mx-auto ${color}`} />
      <div className="text-2xl font-bold text-foreground">{value.toFixed(0)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${value > 70 ? "bg-emerald-500" : value > 40 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function PhysiologicalIntelligence() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<PhysioSnapshot[]>([]);
  const [signals, setSignals] = useState<PhysioSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Get my patient IDs for data isolation
      const { data: myPats } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user!.id)
        .eq("status", "active");

      const ids = myPats?.map((p) => p.patient_id) ?? [];
      if (ids.length === 0) { setSnapshots([]); setSignals([]); setLoading(false); return; }

      const [snapRes, sigRes] = await Promise.all([
        supabase.from("patient_physiology_snapshots").select("*").in("patient_id", ids).order("snapshot_date", { ascending: false }).limit(50),
        supabase.from("patient_physiological_signals").select("*").in("patient_id", ids).order("signal_date", { ascending: false }).limit(100),
      ]);
      if (snapRes.data) setSnapshots(snapRes.data as unknown as PhysioSnapshot[]);
      if (sigRes.data) setSignals(sigRes.data as unknown as PhysioSignal[]);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function runEngine() {
    toast.info("Processando sinais fisiológicos...");
    try {
      const { error } = await supabase.functions.invoke("compute-physiological-signal-engine");
      if (error) throw error;
      toast.success("Motor fisiológico executado!");
      loadData();
    } catch (e: any) { toast.error(e.message); }
  }

  // Group snapshots by patient for overview
  const latestByPatient = new Map<string, PhysioSnapshot>();
  for (const s of snapshots) {
    if (!latestByPatient.has(s.patient_id)) latestByPatient.set(s.patient_id, s);
  }
  const patientSnapshots = Array.from(latestByPatient.values());

  const criticalCount = patientSnapshots.filter(s => s.physiological_risk_level === "critical").length;
  const highCount = patientSnapshots.filter(s => s.physiological_risk_level === "high").length;
  const avgRPI = patientSnapshots.length > 0
    ? patientSnapshots.reduce((s, p) => s + p.rpi, 0) / patientSnapshots.length : 0;
  const avgPSI = patientSnapshots.length > 0
    ? patientSnapshots.reduce((s, p) => s + p.psi, 0) / patientSnapshots.length : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="h-7 w-7 text-primary" />
              Inteligência Fisiológica
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Wearables • Sinais Contínuos • Performance Corporal
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">PHYSIO_ENGINE v1.0.0</Badge>
            <Button size="sm" onClick={runEngine} variant="outline">
              <Activity className="h-4 w-4 mr-1" /> Processar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando dados fisiológicos...</div>
        ) : patientSnapshots.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Watch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum dado fisiológico</h3>
              <p className="text-muted-foreground text-sm">
                Conecte wearables ou insira dados manualmente para ativar o motor fisiológico.
              </p>
              <div className="flex gap-2 justify-center mt-4 text-xs text-muted-foreground">
                <span>Apple Watch</span> • <span>Garmin</span> • <span>Fitbit</span> • <span>Whoop</span> • <span>Oura</span> • <span>Polar</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="patients">Pacientes</TabsTrigger>
              <TabsTrigger value="alerts">Alertas</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Pacientes Monitorados</div>
                    <div className="text-2xl font-bold text-foreground">{patientSnapshots.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">RPI Médio</div>
                    <div className="text-2xl font-bold text-foreground">{avgRPI.toFixed(1)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">PSI Médio</div>
                    <div className="text-2xl font-bold text-foreground">{avgPSI.toFixed(1)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Risco Alto/Crítico</div>
                    <div className="text-2xl font-bold text-red-400">{criticalCount + highCount}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Score Gauges */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Indicadores Fisiológicos Agregados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <ScoreGauge value={avgRPI} label="Recuperação (RPI)" icon={Heart} color="text-emerald-400" />
                    <ScoreGauge value={100 - avgPSI} label="Bem-estar (inv. PSI)" icon={Zap} color="text-amber-400" />
                    <ScoreGauge
                      value={signals.length > 0
                        ? signals.filter(s => s.sleep_duration_minutes != null).reduce((a, s) => a + (s.sleep_duration_minutes || 0), 0) / Math.max(signals.filter(s => s.sleep_duration_minutes != null).length, 1) / 480 * 100
                        : 0}
                      label="Sono (%8h)" icon={Moon} color="text-blue-400"
                    />
                    <ScoreGauge
                      value={signals.length > 0
                        ? signals.filter(s => s.training_load_score != null).reduce((a, s) => a + (s.training_load_score || 0), 0) / Math.max(signals.filter(s => s.training_load_score != null).length, 1)
                        : 0}
                      label="Carga Treino" icon={Activity} color="text-primary"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patients" className="space-y-3">
              {patientSnapshots.map(snap => (
                <Card key={snap.patient_id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-sm font-medium text-foreground">{snap.patient_id.slice(0, 8)}...</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={riskColors[snap.physiological_risk_level]} variant="outline">
                              {riskLabels[snap.physiological_risk_level]}
                            </Badge>
                            <Badge className={tlbColors[snap.training_load_balance]} variant="outline">
                              {tlbLabels[snap.training_load_balance]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-foreground">{snap.rpi.toFixed(0)}</div>
                          <div className="text-xs text-muted-foreground">RPI</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-foreground">{snap.psi.toFixed(0)}</div>
                          <div className="text-xs text-muted-foreground">PSI</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendIcon trend={snap.hrv_trend} />
                          <span className="text-xs text-muted-foreground">HRV</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendIcon trend={snap.sleep_trend} />
                          <span className="text-xs text-muted-foreground">Sono</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="alerts" className="space-y-3">
              {criticalCount + highCount === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nenhum alerta fisiológico ativo.</p>
                  </CardContent>
                </Card>
              ) : (
                patientSnapshots
                  .filter(s => s.physiological_risk_level === "critical" || s.physiological_risk_level === "high")
                  .map(snap => (
                    <Card key={`alert-${snap.patient_id}`} className="border-red-500/20">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              Paciente {snap.patient_id.slice(0, 8)}... — Risco {riskLabels[snap.physiological_risk_level]}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              RPI: {snap.rpi.toFixed(0)} | PSI: {snap.psi.toFixed(0)} | TLB: {tlbLabels[snap.training_load_balance]}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
