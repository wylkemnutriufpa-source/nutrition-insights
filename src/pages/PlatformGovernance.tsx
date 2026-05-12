import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  WEIGHT_LOSS_LIMITS,
  CALORIC_DEFICIT_LIMITS,
  DETECTION_WINDOWS,
  ADJUSTMENT_INTERVALS,
  CONFIDENCE_THRESHOLDS,
  ADHERENCE_THRESHOLDS,
  RISK_THRESHOLDS,
  DAILY_PROCESSING_PIPELINE,
  ENGINE_VERSIONS,
  VOICE_GUIDELINES,
  PRODUCT_NARRATIVE,
} from "@/lib/clinicalConstitution";
import {
  Shield, Zap, Clock, Brain, Heart, Activity, ArrowRight,
  CheckCircle2, AlertTriangle, TrendingUp, Scale, Target,
} from "lucide-react";

function RuleCard({ title, icon: Icon, rules }: { title: string; icon: any; rules: { label: string; value: string | number; unit?: string; note?: string }[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rules.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{r.label}</span>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px] font-mono">
                {r.value}{r.unit || ""}
              </Badge>
              {r.note && <span className="text-[10px] text-muted-foreground">({r.note})</span>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PipelineStep({ step, isLast }: { step: typeof DAILY_PROCESSING_PIPELINE[number]; isLast: boolean }) {
  const isWeekly = step.schedule.includes("* 0") || step.schedule.includes("semanal");
  const isOnDemand = step.schedule === "on-demand";
  const isContinuous = step.schedule.includes("*/");

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
          isOnDemand ? "border-muted-foreground/30 bg-muted text-muted-foreground"
          : isWeekly ? "border-accent bg-accent/10 text-accent-foreground"
          : isContinuous ? "border-primary/50 bg-primary/10 text-primary"
          : "border-primary bg-primary/20 text-primary"
        }`}>
          {step.order}
        </div>
        {!isLast && <div className="w-px h-8 bg-border" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{step.name}</span>
          <Badge variant={isOnDemand ? "outline" : isWeekly ? "secondary" : "default"} className="text-[10px]">
            {step.schedule}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
        {step.dependencies.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">depende de:</span>
            {step.dependencies.map(d => (
              <Badge key={d} variant="outline" className="text-[9px]">{d}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlatformGovernance() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Governança da Plataforma
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Constituição clínica, pipeline de processamento e parâmetros do sistema
          </p>
        </div>

        <Tabs defaultValue="clinical" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clinical">🏥 Constituição Clínica</TabsTrigger>
            <TabsTrigger value="pipeline">⚙️ Pipeline de Processamento</TabsTrigger>
            <TabsTrigger value="engines">🧠 Motores & Narrativa</TabsTrigger>
          </TabsList>

          {/* ── CONSTITUIÇÃO CLÍNICA ──────────────────────── */}
          <TabsContent value="clinical" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <RuleCard
                title="Limites de Perda de Peso"
                icon={Scale}
                rules={[
                  { label: "Perda máx/semana", value: WEIGHT_LOSS_LIMITS.MAX_WEEKLY_LOSS_KG, unit: " kg" },
                  { label: "Alerta perda/semana", value: WEIGHT_LOSS_LIMITS.ALERT_WEEKLY_LOSS_KG, unit: " kg", note: "alerta" },
                  { label: "Perda máx/mês", value: WEIGHT_LOSS_LIMITS.MAX_MONTHLY_LOSS_KG, unit: " kg" },
                  { label: "Ganho máx/semana (bulk)", value: WEIGHT_LOSS_LIMITS.MAX_WEEKLY_GAIN_KG, unit: " kg" },
                ]}
              />

              <RuleCard
                title="Déficit Calórico"
                icon={Target}
                rules={[
                  { label: "Déficit máximo seguro", value: CALORIC_DEFICIT_LIMITS.MAX_DEFICIT_PERCENT, unit: "%" },
                  { label: "Déficit recomendado", value: CALORIC_DEFICIT_LIMITS.RECOMMENDED_DEFICIT_PERCENT, unit: "%" },
                  { label: "Déficit mínimo efetivo", value: CALORIC_DEFICIT_LIMITS.MIN_EFFECTIVE_DEFICIT_PERCENT, unit: "%" },
                  { label: "Calorias mín (♀)", value: CALORIC_DEFICIT_LIMITS.MIN_CALORIES_FEMALE, unit: " kcal" },
                  { label: "Calorias mín (♂)", value: CALORIC_DEFICIT_LIMITS.MIN_CALORIES_MALE, unit: " kcal" },
                  { label: "Déficit agressivo", value: CALORIC_DEFICIT_LIMITS.AGGRESSIVE_DEFICIT_THRESHOLD, unit: "%", note: "alerta" },
                ]}
              />

              <RuleCard
                title="Janelas de Detecção"
                icon={Clock}
                rules={[
                  { label: "Inatividade (aviso)", value: DETECTION_WINDOWS.INACTIVITY_WARNING_DAYS, unit: " dias" },
                  { label: "Inatividade (crítico)", value: DETECTION_WINDOWS.INACTIVITY_CRITICAL_DAYS, unit: " dias" },
                  { label: "Platô mínimo", value: DETECTION_WINDOWS.PLATEAU_MIN_WEEKS, unit: " semanas" },
                  { label: "Tolerância platô", value: DETECTION_WINDOWS.PLATEAU_TOLERANCE_KG, unit: " kg" },
                  { label: "Sem refeição (aviso)", value: DETECTION_WINDOWS.NO_MEAL_WARNING_DAYS, unit: " dias" },
                  { label: "Dados mín. projeção", value: DETECTION_WINDOWS.MIN_DATA_DAYS_FOR_PROJECTIONS, unit: " dias" },
                ]}
              />

              <RuleCard
                title="Intervalos de Ajuste"
                icon={Zap}
                rules={[
                  { label: "Entre ajustes automáticos", value: ADJUSTMENT_INTERVALS.MIN_HOURS_BETWEEN_AUTO_ADJUSTMENTS / 24, unit: " dias" },
                  { label: "Observação antes de ajuste", value: ADJUSTMENT_INTERVALS.MIN_OBSERVATION_DAYS_BEFORE_CALORIC_CHANGE, unit: " dias" },
                  { label: "Ajuste calórico máx/ciclo", value: ADJUSTMENT_INTERVALS.MAX_CALORIC_ADJUSTMENT_PERCENT, unit: "%" },
                  { label: "Cooldown de alertas", value: ADJUSTMENT_INTERVALS.ALERT_COOLDOWN_HOURS, unit: "h" },
                  { label: "Entre transições protocolo", value: ADJUSTMENT_INTERVALS.MIN_DAYS_BETWEEN_PROTOCOL_TRANSITIONS, unit: " dias" },
                ]}
              />

              <RuleCard
                title="Limiares de Confiança"
                icon={Brain}
                rules={[
                  { label: "Automação segura", value: CONFIDENCE_THRESHOLDS.MIN_AUTOMATION_CONFIDENCE, unit: "%" },
                  { label: "Projeções confiáveis", value: CONFIDENCE_THRESHOLDS.MIN_PROJECTION_CONFIDENCE, unit: "%" },
                  { label: "Simulações acionáveis", value: CONFIDENCE_THRESHOLDS.MIN_SIMULATION_CONFIDENCE, unit: "%" },
                  { label: "Cohort mínimo", value: CONFIDENCE_THRESHOLDS.MIN_COHORT_SIZE, unit: " pac." },
                  { label: "Recalibração máx/ciclo", value: CONFIDENCE_THRESHOLDS.MAX_RECALIBRATION_PERCENT, unit: "%" },
                ]}
              />

              <RuleCard
                title="Faixas de Adesão"
                icon={Activity}
                rules={[
                  { label: "Crítica", value: `< ${ADHERENCE_THRESHOLDS.CRITICAL_ADHERENCE}`, unit: "%", note: "🔴" },
                  { label: "Baixa", value: `< ${ADHERENCE_THRESHOLDS.LOW_ADHERENCE}`, unit: "%", note: "🟠" },
                  { label: "Moderada", value: `< ${ADHERENCE_THRESHOLDS.MODERATE_ADHERENCE}`, unit: "%", note: "🟡" },
                  { label: "Boa", value: `≥ ${ADHERENCE_THRESHOLDS.GOOD_ADHERENCE}`, unit: "%", note: "🟢" },
                  { label: "Excelente", value: `≥ ${ADHERENCE_THRESHOLDS.EXCELLENT_ADHERENCE}`, unit: "%", note: "⭐" },
                ]}
              />
            </div>
          </TabsContent>

          {/* ── PIPELINE DE PROCESSAMENTO ─────────────────── */}
          <TabsContent value="pipeline" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Fluxo Diário de Processamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-2">
                    {DAILY_PROCESSING_PIPELINE.map((step, i) => (
                      <PipelineStep
                        key={step.order}
                        step={step}
                        isLast={i === DAILY_PROCESSING_PIPELINE.length - 1}
                      />
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Regras de Processamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <span>Cada motor deve respeitar dependências antes de executar</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <span>Processamento em lotes de máximo {50} pacientes</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <span>Edge functions com timeout de 25s — falhas não bloqueiam pipeline</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <span>Motores populacionais e de calibração rodam semanalmente</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <span>Ranking cache atualiza a cada 30 min (independente)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                      <span>Limite de 1000 rows/query — paginação obrigatória acima disso</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-500" />
                      Diretrizes de Tom de Voz
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <span className="font-medium">Tom:</span>{" "}
                      <span className="text-muted-foreground">Inteligência empática — o sistema cuida, não assusta</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <span>Sempre sugerir ação positiva junto com alertas</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <span>Usar "tendência" e não "previsão"</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <span>Máximo de {VOICE_GUIDELINES.MAX_VISIBLE_ALERTS} alertas visíveis por vez</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <span>Máximo de {VOICE_GUIDELINES.MAX_DASHBOARD_METRICS} métricas no dashboard principal</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── MOTORES & NARRATIVA ──────────────────────── */}
          <TabsContent value="engines" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Versões dos Motores Clínicos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(ENGINE_VERSIONS).map(([key, version]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-mono">
                          {key.replace(/_/g, " ").toLowerCase()}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          v{version}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Narrativa do Produto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tagline</p>
                    <p className="text-sm font-medium">{PRODUCT_NARRATIVE.TAGLINE}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pitch</p>
                    <p className="text-xs text-muted-foreground">{PRODUCT_NARRATIVE.PITCH}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Diferenciais</p>
                    <div className="space-y-1.5">
                      {PRODUCT_NARRATIVE.DIFFERENTIALS.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Faixas de Risco Clínico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 w-full h-8 rounded-lg overflow-hidden text-[10px] font-medium">
                    <div className="h-full flex items-center justify-center bg-green-500/20 text-green-700 dark:text-green-400" style={{ width: "30%" }}>
                      Baixo (0-{RISK_THRESHOLDS.LOW_RISK_MAX})
                    </div>
                    <div className="h-full flex items-center justify-center bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" style={{ width: "30%" }}>
                      Moderado ({RISK_THRESHOLDS.LOW_RISK_MAX}-{RISK_THRESHOLDS.MODERATE_RISK_MAX})
                    </div>
                    <div className="h-full flex items-center justify-center bg-orange-500/20 text-orange-700 dark:text-orange-400" style={{ width: "20%" }}>
                      Alto ({RISK_THRESHOLDS.MODERATE_RISK_MAX}-{RISK_THRESHOLDS.HIGH_RISK_MAX})
                    </div>
                    <div className="h-full flex items-center justify-center bg-red-500/20 text-red-700 dark:text-red-400" style={{ width: "20%" }}>
                      Crítico ({RISK_THRESHOLDS.CRITICAL_RISK_MIN}+)
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
