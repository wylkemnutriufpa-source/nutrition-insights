import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Activity, Brain, Dumbbell, Moon, Apple, TrendingUp, Zap, AlertTriangle,
  RefreshCw, ChevronUp, ChevronDown, Minus, Target, Heart
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const ENGINE_VERSION = "1.0.0";

const LEVEL_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  peak_condition: { label: "Condição Máxima", color: "text-emerald-400", emoji: "🔥" },
  high_performance: { label: "Alta Performance", color: "text-green-400", emoji: "⚡" },
  stable: { label: "Estável", color: "text-blue-400", emoji: "✅" },
  unstable: { label: "Instável", color: "text-yellow-400", emoji: "⚠️" },
  compromised: { label: "Comprometido", color: "text-red-400", emoji: "🚨" },
};

const PROFILE_LABELS: Record<string, string> = {
  nutrition_driven: "Movido pela Nutrição",
  behavior_driven: "Movido pelo Comportamento",
  recovery_limited: "Limitado pela Recuperação",
  training_limited: "Limitado pelo Treino",
  stress_limited: "Limitado pelo Estresse",
  metabolically_efficient: "Metabolicamente Eficiente",
  inconsistent_responder: "Respondedor Inconsistente",
};

const FOCUS_LABELS: Record<string, { label: string; icon: any }> = {
  improve_sleep_consistency: { label: "Melhorar consistência do sono", icon: Moon },
  reduce_protocol_complexity: { label: "Reduzir complexidade do protocolo", icon: Brain },
  increase_training_consistency: { label: "Aumentar consistência de treino", icon: Dumbbell },
  stabilize_nutrition_adherence: { label: "Estabilizar adesão nutricional", icon: Apple },
  reduce_stress_load: { label: "Reduzir carga de estresse", icon: AlertTriangle },
  hold_strategy_and_monitor: { label: "Manter estratégia e monitorar", icon: Target },
};

interface PerformanceState {
  patient_id: string;
  nutrition_score: number;
  recovery_score: number;
  training_score: number;
  consistency_score: number;
  metabolic_score: number;
  stress_load_score: number;
  overall_performance_score: number;
  performance_level: string;
  performance_profile: string;
  recommended_focus: string;
  updated_at: string;
}

interface PatientOption {
  patient_id: string;
  name: string;
}

export default function HumanPerformance() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [perfState, setPerfState] = useState<PerformanceState | null>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [allStates, setAllStates] = useState<PerformanceState[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadPatients();
    loadAllStates();
  }, [user?.id]);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientPerformance(selectedPatient);
    }
  }, [selectedPatient]);

  async function loadPatients() {
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("patient_id, profiles!nutritionist_patients_patient_id_fkey(full_name)")
      .eq("nutritionist_id", user!.id)
      .eq("status", "active");

    if (data) {
      const opts = data.map((d: any) => ({
        patient_id: d.patient_id,
        name: d.profiles?.full_name || "Paciente",
      }));
      setPatients(opts);
      if (opts.length > 0 && !selectedPatient) setSelectedPatient(opts[0].patient_id);
    }
    setLoading(false);
  }

  async function loadAllStates() {
    // First get my patient IDs for data isolation
    const { data: myPats } = await supabase
      .from("nutritionist_patients")
      .select("patient_id")
      .eq("nutritionist_id", user!.id)
      .eq("status", "active");

    const ids = myPats?.map((p) => p.patient_id) ?? [];
    if (ids.length === 0) { setAllStates([]); return; }

    const { data } = await supabase
      .from("patient_human_performance_state")
      .select("*")
      .in("patient_id", ids)
      .order("overall_performance_score", { ascending: false });

    if (data) setAllStates(data as PerformanceState[]);
  }

  async function loadPatientPerformance(pid: string) {
    const [stateRes, snapRes] = await Promise.all([
      supabase.from("patient_human_performance_state").select("*").eq("patient_id", pid).maybeSingle(),
      supabase.from("patient_performance_snapshots").select("*").eq("patient_id", pid)
        .order("snapshot_date", { ascending: true }).limit(30),
    ]);

    if (stateRes.data) setPerfState(stateRes.data as PerformanceState);
    else setPerfState(null);

    if (snapRes.data) setSnapshots(snapRes.data);
    else setSnapshots([]);
  }

  async function runEngine() {
    setComputing(true);
    try {
      const { error } = await supabase.functions.invoke("compute-human-performance-engine");
      if (error) throw error;
      toast.success("Motor de Performance recalculado!");
      await Promise.all([loadAllStates(), selectedPatient && loadPatientPerformance(selectedPatient)]);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setComputing(false);
    }
  }

  const radarData = perfState ? [
    { dimension: "Nutrição", value: perfState.nutrition_score },
    { dimension: "Recuperação", value: perfState.recovery_score },
    { dimension: "Treino", value: perfState.training_score },
    { dimension: "Consistência", value: perfState.consistency_score },
    { dimension: "Metabolismo", value: perfState.metabolic_score },
    { dimension: "Baixo Estresse", value: Math.max(0, 100 - perfState.stress_load_score) },
  ] : [];

  const levelConfig = LEVEL_CONFIG[perfState?.performance_level || "unstable"];
  const focusConfig = FOCUS_LABELS[perfState?.recommended_focus || "hold_strategy_and_monitor"];
  const FocusIcon = focusConfig?.icon || Target;

  // Distribution counts
  const levelCounts = allStates.reduce((acc, s) => {
    acc[s.performance_level] = (acc[s.performance_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Performance Humana Integrada
          </h1>
          <p className="text-sm text-muted-foreground">Motor v{ENGINE_VERSION} • Análise multidimensional de evolução</p>
        </div>
        <Button onClick={runEngine} disabled={computing} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${computing ? "animate-spin" : ""}`} />
          Recalcular
        </Button>
      </div>

      {/* Global Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
          <Card key={key} className="glass">
            <CardContent className="p-3 text-center">
              <p className="text-2xl">{cfg.emoji}</p>
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
              <p className="text-lg font-bold">{levelCounts[key] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="individual">
        <TabsList>
          <TabsTrigger value="individual">Paciente Individual</TabsTrigger>
          <TabsTrigger value="portfolio">Visão da Carteira</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          {/* Patient selector */}
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecionar paciente" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.patient_id} value={p.patient_id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!perfState ? (
            <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">
              Nenhum dado de performance disponível. Execute o motor para calcular.
            </CardContent></Card>
          ) : (
            <>
              {/* Score Global + Level */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass col-span-1">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Score Global</p>
                    <p className={`text-5xl font-bold ${levelConfig.color}`}>
                      {perfState.overall_performance_score}
                    </p>
                    <p className="text-lg mt-1">{levelConfig.emoji} {levelConfig.label}</p>
                    <Badge variant="outline" className="mt-2">
                      {PROFILE_LABELS[perfState.performance_profile] || perfState.performance_profile}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Radar Chart */}
                <Card className="glass col-span-1 md:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Radar de Performance</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Sub-scores Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Nutrição", score: perfState.nutrition_score, icon: Apple, color: "text-emerald-400" },
                  { label: "Recuperação", score: perfState.recovery_score, icon: Moon, color: "text-indigo-400" },
                  { label: "Treino", score: perfState.training_score, icon: Dumbbell, color: "text-orange-400" },
                  { label: "Consistência", score: perfState.consistency_score, icon: TrendingUp, color: "text-blue-400" },
                  { label: "Metabolismo", score: perfState.metabolic_score, icon: Zap, color: "text-yellow-400" },
                  { label: "Carga de Estresse", score: perfState.stress_load_score, icon: AlertTriangle, color: "text-red-400" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.label} className="glass">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-4 h-4 ${item.color}`} />
                          <span className="text-xs text-muted-foreground">{item.label}</span>
                        </div>
                        <p className="text-2xl font-bold">{item.score}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
                        <div className="w-full h-1.5 bg-muted/30 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.label === "Carga de Estresse" ? "bg-red-500" : "bg-primary"}`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Recommended Focus */}
              <Card className="glass border-primary/30">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FocusIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Foco Recomendado da Semana</p>
                    <p className="font-semibold">{focusConfig?.label || perfState.recommended_focus}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Trend Chart */}
              {snapshots.length > 1 && (
                <Card className="glass">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Tendência de Performance</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={snapshots}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="snapshot_date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="overall_performance_score" name="Global" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="nutrition_score" name="Nutrição" stroke="#34d399" strokeWidth={1} dot={false} />
                        <Line type="monotone" dataKey="metabolic_score" name="Metabolismo" stroke="#fbbf24" strokeWidth={1} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">Ranking de Performance da Carteira</CardTitle></CardHeader>
            <CardContent>
              {allStates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Execute o motor para gerar dados.</p>
              ) : (
                <div className="space-y-2">
                  {allStates.map((s, idx) => {
                    const lvl = LEVEL_CONFIG[s.performance_level] || LEVEL_CONFIG.unstable;
                    const patientName = patients.find((p) => p.patient_id === s.patient_id)?.name || "Paciente";
                    return (
                      <div key={s.patient_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition cursor-pointer"
                        onClick={() => { setSelectedPatient(s.patient_id); }}>
                        <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}</span>
                        <span className="text-lg">{lvl.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{patientName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {PROFILE_LABELS[s.performance_profile] || s.performance_profile}
                          </p>
                        </div>
                        <span className={`text-lg font-bold ${lvl.color}`}>{s.overall_performance_score}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
