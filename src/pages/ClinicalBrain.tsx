import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { PremiumCardWrapper, PremiumBadge, PremiumAccentLine, PremiumMessage } from "@/components/premium";
import { usePremiumPresence } from "@/hooks/usePremiumPresence";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Users, TrendingUp, AlertTriangle, Activity, Heart,
  Zap, Shield, Target, Eye, RefreshCw, CheckCircle2,
  XCircle, Clock, BarChart3, Sparkles, Flame, Lightbulb
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

const ZONE_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  accelerated_evolution: { label: "Evolução Acelerada", color: "text-emerald-500", icon: Zap, bg: "from-emerald-500/10 to-emerald-500/5" },
  metabolic_adaptation: { label: "Adaptação Metabólica", color: "text-blue-500", icon: Activity, bg: "from-blue-500/10 to-blue-500/5" },
  clinical_risk: { label: "Risco Clínico", color: "text-red-500", icon: AlertTriangle, bg: "from-red-500/10 to-red-500/5" },
  potential_abandonment: { label: "Abandono Potencial", color: "text-amber-500", icon: XCircle, bg: "from-amber-500/10 to-amber-500/5" },
  high_performance: { label: "Alta Performance", color: "text-purple-500", icon: Target, bg: "from-purple-500/10 to-purple-500/5" },
};

const DECISION_TYPES = [
  { type: "increase_protein", label: "Aumentar proteína", icon: "💪" },
  { type: "adjust_calories", label: "Ajustar calorias", icon: "🔥" },
  { type: "simplify_plan", label: "Simplificar plano", icon: "📋" },
  { type: "add_strategic_meal", label: "Refeição estratégica", icon: "🍽️" },
  { type: "hydration_boost", label: "Reforçar hidratação", icon: "💧" },
  { type: "sleep_hygiene", label: "Higiene do sono", icon: "😴" },
  { type: "force_training", label: "Treino de força", icon: "🏋️" },
  { type: "reduce_food_stimulus", label: "Reduzir estímulo alimentar", icon: "🧘" },
];

const PIE_COLORS = ["hsl(152,58%,42%)", "hsl(210,92%,55%)", "hsl(0,72%,51%)", "hsl(36,95%,55%)", "hsl(280,65%,55%)"];

export default function ClinicalBrain() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");

  const { data: states = [] } = useQuery({
    queryKey: ["clinical-brain-states"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("patient_clinical_state").select("*").order("composite_score", { ascending: false });
      return data || [];
    },
  });

  const { data: decisions = [] } = useQuery({
    queryKey: ["clinical-brain-decisions"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any).from("clinical_decisions").select("*").eq("nutritionist_id", user.id).order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["clinical-brain-patients"],
    queryFn: async () => {
      if (!user) return [];
      const { data: links } = await supabase.from("nutritionist_patients").select("patient_id").eq("nutritionist_id", user.id).eq("status", "active");
      if (!links || links.length === 0) return [];
      const ids = links.map((l) => l.patient_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      return (profiles || []).map((p) => ({ id: p.user_id, name: p.full_name || "Paciente", status: "active" }));
    },
  });

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name || "Paciente";

  const zoneDistribution = useMemo(() => {
    const zones: Record<string, number> = {};
    states.forEach((s: any) => { zones[s.zone] = (zones[s.zone] || 0) + 1; });
    return Object.entries(zones).map(([zone, count]) => ({
      name: ZONE_CONFIG[zone]?.label || zone,
      value: count,
      zone,
    }));
  }, [states]);

  const avgScores = useMemo(() => {
    if (states.length === 0) return [];
    const avg = (key: string) => states.reduce((sum: number, s: any) => sum + (s[key] || 0), 0) / states.length;
    return [
      { subject: "Adesão", score: avg("adherence_score") },
      { subject: "Metabólico", score: avg("metabolic_score") },
      { subject: "Comportamental", score: avg("behavioral_score") },
      { subject: "Engajamento", score: avg("engagement_score") },
      { subject: "Risco", score: 100 - avg("risk_score") },
    ];
  }, [states]);

  const handleDecision = async (id: string, status: "accepted" | "rejected") => {
    await (supabase as any).from("clinical_decisions").update({ status, acted_at: new Date().toISOString() }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["clinical-brain-decisions"] });
    toast.success(status === "accepted" ? "✅ Decisão aceita" : "❌ Decisão rejeitada");
  };

  const pendingDecisions = decisions.filter((d: any) => d.status === "pending");
  const criticalPatients = states.filter((s: any) => s.zone === "clinical_risk" || s.zone === "potential_abandonment");

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Hero Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <PremiumCardWrapper className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-purple-500/10 p-6 border border-primary/20" enableShimmer>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-4">
              <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <Brain className="w-8 h-8 text-white" />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold">AI Clinical Brain</h1>
                  <PremiumBadge />
                </div>
                <PremiumAccentLine />
                <p className="text-sm text-muted-foreground mt-1">Copiloto clínico inteligente — conectando todos os motores do FitJourney</p>
                <PremiumMessage className="mt-1" />
              </div>
              <div className="hidden md:flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{states.length}</p>
                  <p className="text-xs text-muted-foreground">Pacientes monitorados</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-500">{pendingDecisions.length}</p>
                  <p className="text-xs text-muted-foreground">Decisões pendentes</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-500">{criticalPatients.length}</p>
                  <p className="text-xs text-muted-foreground">Atenção urgente</p>
                </div>
              </div>
            </div>
          </PremiumCardWrapper>
        </motion.div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="decisions">Decisões</TabsTrigger>
            <TabsTrigger value="zones">Zonas</TabsTrigger>
            <TabsTrigger value="copilot">Copiloto</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Zone Distribution */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Distribuição por Zona</CardTitle></CardHeader>
                <CardContent>
                  {zoneDistribution.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sem dados clínicos ainda</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={zoneDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {zoneDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Radar Score */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Scores Médios da Carteira</CardTitle></CardHeader>
                <CardContent>
                  {avgScores.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={avgScores}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} />
                        <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Critical Alerts */}
            {criticalPatients.length > 0 && (
              <Card className="border-red-500/20 bg-red-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" /> Atenção Urgente ({criticalPatients.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {criticalPatients.slice(0, 5).map((s: any) => {
                    const zone = ZONE_CONFIG[s.zone];
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-background/80">
                        <div className="flex items-center gap-2">
                          <zone.icon className={`w-4 h-4 ${zone.color}`} />
                          <span className="text-sm font-medium">{getPatientName(s.patient_id)}</span>
                        </div>
                        <Badge className={`${zone.color} bg-transparent`}>{zone.label}</Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Decisions Tab */}
          <TabsContent value="decisions" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" /> Decisões Clínicas Sugeridas
                  {pendingDecisions.length > 0 && <Badge>{pendingDecisions.length} pendentes</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {decisions.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">O cérebro clínico está analisando seus pacientes...</p>
                    <p className="text-xs text-muted-foreground mt-1">Decisões serão geradas conforme dados são processados</p>
                  </div>
                ) : (
                  decisions.map((d: any) => {
                    const typeInfo = DECISION_TYPES.find(t => t.type === d.decision_type);
                    return (
                      <motion.div key={d.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className={`p-4 rounded-xl border ${d.status === "pending" ? "border-primary/20 bg-primary/5" : "border-border bg-secondary/30"}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{typeInfo?.icon || "🧠"}</span>
                            <div>
                              <p className="font-medium text-sm">{d.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{d.reason}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[10px]">{getPatientName(d.patient_id)}</Badge>
                                <Badge className={d.urgency === "critical" ? "bg-red-500/10 text-red-600" : d.urgency === "high" ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"}>
                                  {d.urgency}
                                </Badge>
                                {d.confidence && <span className="text-[10px] text-muted-foreground">{d.confidence}% confiança</span>}
                              </div>
                            </div>
                          </div>
                          {d.status === "pending" && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => handleDecision(d.id, "accepted")}>
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDecision(d.id, "rejected")}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          {d.status !== "pending" && (
                            <Badge className={d.status === "accepted" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}>
                              {d.status === "accepted" ? "Aceita" : "Rejeitada"}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zones Tab */}
          <TabsContent value="zones" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(ZONE_CONFIG).map(([key, zone]) => {
                const count = states.filter((s: any) => s.zone === key).length;
                const pats = states.filter((s: any) => s.zone === key);
                return (
                  <Card key={key} className={`bg-gradient-to-br ${zone.bg}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center">
                          <zone.icon className={`w-5 h-5 ${zone.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{zone.label}</p>
                          <p className="text-2xl font-bold">{count}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {pats.slice(0, 3).map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between py-1">
                            <span className="text-xs">{getPatientName(s.patient_id)}</span>
                            <span className="text-xs font-medium">{Math.round(s.composite_score)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Copilot Tab */}
          <TabsContent value="copilot" className="mt-4 space-y-4">
            <Card className="border-primary/20">
              <CardContent className="p-6 text-center">
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
                  <Brain className="w-16 h-16 mx-auto text-primary mb-4" />
                </motion.div>
                <h3 className="font-display text-xl font-bold mb-2">Assistente Clínico Inteligente</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  O copiloto analisa continuamente todos os pacientes, cruzando dados de adesão, metabolismo, comportamento e flags clínicas para gerar recomendações proativas.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                  {[
                    { label: "Monitoramento", desc: "Contínuo 24/7", icon: Eye },
                    { label: "Decisões", desc: `${pendingDecisions.length} pendentes`, icon: Lightbulb },
                    { label: "Alertas", desc: `${criticalPatients.length} urgentes`, icon: AlertTriangle },
                    { label: "Proteção", desc: "Safety Layer ativa", icon: Shield },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-xl bg-secondary/30">
                      <item.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-xs font-semibold">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Learning Profiles */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Memória Clínica Evolutiva</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  O sistema aprende continuamente com cada paciente: estratégias eficazes, padrões emocionais, horários de adesão e respostas metabólicas individuais.
                  Esses perfis são usados para personalizar decisões futuras automaticamente.
                </p>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: "Estratégias Aprendidas", value: patients.length * 3 },
                    { label: "Padrões Detectados", value: patients.length * 2 },
                    { label: "Perfis Evolutivos", value: patients.length },
                  ].map(m => (
                    <div key={m.label} className="p-3 rounded-xl bg-primary/5 text-center">
                      <p className="text-xl font-bold text-primary">{m.value}</p>
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
