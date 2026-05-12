import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { calculateChurnRisk } from "./ChurnRiskPanel";
import {
  Brain, AlertTriangle, TrendingDown, Clock, Users, Calendar,
  ArrowRight, MessageSquare, UserCheck, FileText, Shield, Zap,
  Activity, Eye, ChevronDown, ChevronUp, Target, Flame, Moon,
  Droplets, Coffee, BarChart3, Send, RefreshCw
} from "lucide-react";
import { Button } from "@v1/components/ui/button";
import { Progress } from "@v1/components/ui/progress";
import { supabase } from "@v1/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ──
interface CopilotPatient {
  id: string;
  name: string;
  score: number;
  risks: string[];
  lastActivity?: string;
  checklistCompletion?: number;
  mealsCount?: number;
  streak?: number;
}

interface CopilotProps {
  patients: CopilotPatient[];
  attentionPatients: any[];
  aiInsights: any[];
  aiSummary: any;
  aiLoading: boolean;
  appointmentsToday: number;
  pendingCheckins: number;
  patientCount: number;
  evolutionData: { avgAdherence: number; avgScore: number };
}

// ── Priority Queue Item ──
function PriorityPatientCard({ patient, rank }: { patient: CopilotPatient; rank: number }) {
  const navigate = useNavigate();
  const riskLevel = patient.score < 30 ? "high" : patient.score < 60 ? "medium" : "low";
  const riskConfig = {
    high: { label: "Alto Risco", bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", dot: "bg-destructive" },
    medium: { label: "Moderado", bg: "bg-warning/10 border-warning/20", text: "text-warning", dot: "bg-warning" },
    low: { label: "Estável", bg: "bg-success/10 border-success/20", text: "text-success", dot: "bg-success" },
  };
  const cfg = riskConfig[riskLevel];
  const daysAgo = patient.lastActivity
    ? Math.floor((Date.now() - new Date(patient.lastActivity).getTime()) / 86400000)
    : null;

  const suggestedAction = patient.score < 30
    ? "Enviar mensagem e agendar consulta"
    : patient.score < 50
    ? "Revisar protocolo e reforçar metas"
    : patient.score < 70
    ? "Ajustar estratégia de fim de semana"
    : "Manter acompanhamento";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.06 }}
      className={`rounded-xl border p-4 ${cfg.bg} cursor-pointer hover:shadow-card transition-all`}
      onClick={() => navigate(`/patients/${patient.id}`)}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center flex-shrink-0 font-display font-bold text-sm text-muted-foreground">
          #{rank + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{patient.name}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cfg.text} ${cfg.bg}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            <span>Adesão: <b className={patient.score < 50 ? "text-destructive" : "text-foreground"}>{patient.checklistCompletion ?? patient.score}%</b></span>
            {daysAgo !== null && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{daysAgo === 0 ? "Hoje" : `${daysAgo}d atrás`}</span>}
            {patient.streak !== undefined && <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{patient.streak}d</span>}
          </div>
          <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
            <Zap className="w-3 h-3" /> {suggestedAction}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); navigate(`/patients/${patient.id}`); }}
            title="Ver perfil"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); navigate("/v1/chat"); }}
            title="Enviar mensagem"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Behavior Patterns ──
function detectBehaviorPatterns(patients: CopilotPatient[]) {
  const patterns: { patientName: string; patientId: string; pattern: string; icon: any; severity: string }[] = [];

  for (const p of patients) {
    if (p.risks.includes("Baixa adesão")) {
      patterns.push({ patientName: p.name, patientId: p.id, pattern: "Apresenta baixa adesão consistente ao checklist", icon: TrendingDown, severity: "warning" });
    }
    if (p.risks.includes("Sedentário")) {
      patterns.push({ patientName: p.name, patientId: p.id, pattern: "Perfil sedentário - considerar incentivos de movimento", icon: Activity, severity: "info" });
    }
    if (p.risks.includes("Sono ruim")) {
      patterns.push({ patientName: p.name, patientId: p.id, pattern: "Qualidade de sono comprometida afetando resultados", icon: Moon, severity: "warning" });
    }
    if (p.risks.includes("Sem registros")) {
      patterns.push({ patientName: p.name, patientId: p.id, pattern: "Sem registros alimentares - possível abandono", icon: AlertTriangle, severity: "critical" });
    }
    if (p.risks.includes("Perdeu streak")) {
      patterns.push({ patientName: p.name, patientId: p.id, pattern: "Perdeu sequência de consistência - precisa de motivação", icon: Flame, severity: "warning" });
    }
    if (p.risks.includes("Insatisfeito")) {
      patterns.push({ patientName: p.name, patientId: p.id, pattern: "Paciente reportou insatisfação na anamnese", icon: AlertTriangle, severity: "critical" });
    }
  }

  return patterns.slice(0, 8);
}

// ── Clinical Alerts ──
function ClinicalAlerts({ patients }: { patients: CopilotPatient[] }) {
  const alerts = useMemo(() => {
    const list: { text: string; priority: "high" | "moderate" | "stable"; patientId?: string }[] = [];

    for (const p of patients) {
      const daysInactive = p.lastActivity
        ? Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 86400000)
        : 999;

      if (daysInactive >= 4) list.push({ text: `${p.name}: Sem atividade há ${daysInactive} dias`, priority: "high", patientId: p.id });
      else if (p.score < 30) list.push({ text: `${p.name}: Health Score crítico (${p.score})`, priority: "high", patientId: p.id });
      else if (p.risks.includes("Baixa adesão")) list.push({ text: `${p.name}: Adesão abaixo de 30%`, priority: "moderate", patientId: p.id });
      else if (p.risks.length >= 2) list.push({ text: `${p.name}: Múltiplos fatores de risco (${p.risks.length})`, priority: "moderate", patientId: p.id });
    }

    return list.sort((a, b) => (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1)).slice(0, 6);
  }, [patients]);

  const navigate = useNavigate();
  const priorityConfig = {
    high: { emoji: "🔴", bg: "bg-destructive/5 border-destructive/20 hover:bg-destructive/10" },
    moderate: { emoji: "🟡", bg: "bg-warning/5 border-warning/20 hover:bg-warning/10" },
    stable: { emoji: "🟢", bg: "bg-success/5 border-success/20 hover:bg-success/10" },
  };

  if (alerts.length === 0) return (
    <div className="text-center py-4">
      <p className="text-sm text-muted-foreground">🟢 Todos os pacientes estáveis</p>
    </div>
  );

  return (
    <div className="space-y-1.5">
      {alerts.map((a, i) => {
        const cfg = priorityConfig[a.priority];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => a.patientId && navigate(`/patients/${a.patientId}`)}
            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${cfg.bg}`}
          >
            <span className="text-sm">{cfg.emoji}</span>
            <p className="text-xs flex-1">{a.text}</p>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </motion.div>
        );
      })}
    </div>
  );
}

// ── AI Recommendations ──
function AIRecommendations({ patients, insights }: { patients: CopilotPatient[]; insights: any[] }) {
  const recommendations = useMemo(() => {
    const recs: { text: string; icon: any; action: string; route: string }[] = [];

    // Churn-aware recommendations
    const churnResults = calculateChurnRisk(patients);
    const highChurn = churnResults.filter(r => r.level === "high");
    const modChurn = churnResults.filter(r => r.level === "moderate");

    if (highChurn.length > 0) recs.push({ text: `${highChurn.length} paciente(s) em alto risco de abandono — enviar mensagem motivacional e agendar consulta urgente`, icon: AlertTriangle, action: "Ver risco", route: "/patients" });
    if (modChurn.length > 0) recs.push({ text: `${modChurn.length} paciente(s) com risco moderado de abandono — revisar plano e reforçar engajamento`, icon: TrendingDown, action: "Ver pacientes", route: "/patients" });

    const lowAdherence = patients.filter(p => (p.checklistCompletion ?? p.score) < 40);
    const inactive = patients.filter(p => {
      if (!p.lastActivity) return true;
      return Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 86400000) >= 3;
    });
    const noMeals = patients.filter(p => (p.mealsCount ?? 0) === 0);

    if (inactive.length > 0) recs.push({ text: `Revisar ${inactive.length} paciente(s) inativos há 3+ dias`, icon: Clock, action: "Ver pacientes", route: "/patients" });
    if (lowAdherence.length > 0) recs.push({ text: `Ajustar estratégia de fim de semana para ${lowAdherence.length} paciente(s) com baixa adesão recorrente`, icon: TrendingDown, action: "Ver análise", route: "/checkin-panel" });
    if (noMeals.length > 0) recs.push({ text: `Reforçar hábito de registro alimentar para ${noMeals.length} paciente(s)`, icon: Coffee, action: "Ver planos", route: "/meal-plans" });

    const badSleep = patients.filter(p => p.risks.includes("Sono ruim"));
    if (badSleep.length > 0) recs.push({ text: `Considerar protocolo de sono para ${badSleep.length} paciente(s) com sono comprometido`, icon: Moon, action: "Protocolos", route: "/protocols" });

    const sedentary = patients.filter(p => p.risks.includes("Sedentário"));
    if (sedentary.length > 0) recs.push({ text: `Criar desafio de movimento para ${sedentary.length} paciente(s) sedentários`, icon: Activity, action: "Desafios", route: "/challenges" });

    if (recs.length === 0) recs.push({ text: "Todos os pacientes estão com boa evolução. Continue o acompanhamento!", icon: Target, action: "Dashboard", route: "/" });

    return recs.slice(0, 6);
  }, [patients, insights]);

  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      {recommendations.map((rec, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50 hover:border-primary/20 transition-all"
        >
          <rec.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs flex-1 leading-relaxed">{rec.text}</p>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 flex-shrink-0" onClick={() => navigate(rec.route)}>
            {rec.action}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

// ── Smart Summary Metrics ──
function SmartMetrics({ patients, avgAdherence, appointmentsToday, pendingCheckins }: {
  patients: CopilotPatient[]; avgAdherence: number; appointmentsToday: number; pendingCheckins: number;
}) {
  const highRisk = patients.filter(p => p.score < 30).length;
  const churnResults = useMemo(() => calculateChurnRisk(patients), [patients]);
  const churnHigh = churnResults.filter(r => r.level === "high").length;
  const inactive = patients.filter(p => {
    if (!p.lastActivity) return true;
    return Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 86400000) >= 3;
  }).length;

  const metrics = [
    { label: "Alto Risco", value: highRisk, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Risco Abandono", value: churnHigh, color: churnHigh > 0 ? "text-destructive" : "text-success", bg: churnHigh > 0 ? "bg-destructive/10" : "bg-success/10" },
    { label: "Inativos", value: inactive, color: "text-warning", bg: "bg-warning/10" },
    { label: "Adesão Média", value: `${avgAdherence}%`, color: avgAdherence >= 60 ? "text-success" : "text-warning", bg: avgAdherence >= 60 ? "bg-success/10" : "bg-warning/10" },
    { label: "Consultas Hoje", value: appointmentsToday, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {metrics.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04 }}
          className={`rounded-lg ${m.bg} p-3 text-center`}
        >
          <p className={`font-display font-bold text-lg ${m.color}`}>{m.value}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{m.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main Copilot Component ──
export default function NutritionCopilot({
  patients, attentionPatients, aiInsights, aiSummary, aiLoading,
  appointmentsToday, pendingCheckins, patientCount, evolutionData,
}: CopilotProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("priority");
  const navigate = useNavigate();

  const sortedPatients = useMemo(
    () => [...patients].sort((a, b) => a.score - b.score),
    [patients]
  );

  const behaviorPatterns = useMemo(() => detectBehaviorPatterns(patients), [patients]);

  const toggle = (section: string) =>
    setExpandedSection(prev => prev === section ? null : section);

  const highRisk = patients.filter(p => p.score < 30).length;
  const inactive = patients.filter(p => {
    if (!p.lastActivity) return true;
    return Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 86400000) >= 3;
  }).length;

  if (patients.length === 0 && !aiLoading) {
    return (
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 text-center">
        <Brain className="w-10 h-10 text-primary mx-auto mb-3 opacity-60" />
        <h3 className="font-display font-bold text-lg mb-1">Nutrition Copilot</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Cadastre pacientes com anamnese para ativar o assistente clínico inteligente.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border transition-all cursor-pointer ${expanded ? "border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5" : "border-primary/20 bg-gradient-to-r from-primary/5 via-card to-accent/5"}`}
      onClick={() => setExpanded(prev => !prev)}
    >
      {/* Collapsed header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display font-bold text-base">Nutrition Copilot</h2>
              {aiLoading && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary animate-pulse">Analisando...</span>}
              {highRisk > 0 && !aiLoading && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold animate-pulse">{highRisk} urgente</span>}
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 border border-success/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[9px] font-bold text-success uppercase tracking-wider">Sistema Estável</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{expanded ? "▲ Recolher" : "▼ Expandir"}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">{patientCount} pacientes</span>
              {" · "}Adesão média: <span className={`font-medium ${evolutionData.avgAdherence >= 60 ? "text-success" : "text-warning"}`}>{evolutionData.avgAdherence}%</span>
              {highRisk > 0 && <> · <span className="text-destructive font-medium">{highRisk} alto risco</span></>}
              {inactive > 0 && <> · <span className="text-warning font-medium">{inactive} inativo(s)</span></>}
            </p>
          </div>
          {evolutionData.avgScore > 0 && (
            <div className="text-center px-3 flex-shrink-0 hidden sm:block">
              <p className="font-display text-2xl font-bold text-primary">{evolutionData.avgScore}</p>
              <p className="text-[10px] text-muted-foreground">Score médio</p>
            </div>
          )}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-border/30 pt-4" onClick={(e) => e.stopPropagation()}>
              {/* Smart metrics */}
              <SmartMetrics
                patients={sortedPatients}
                avgAdherence={evolutionData.avgAdherence}
                appointmentsToday={appointmentsToday}
                pendingCheckins={pendingCheckins}
              />

              {/* Priority Queue */}
              <CopilotSection
                title="Fila de Prioridade"
                subtitle={`${sortedPatients.filter(p => p.score < 60).length} pacientes precisam de ação`}
                icon={<AlertTriangle className="w-4 h-4 text-warning" />}
                isOpen={expandedSection === "priority"}
                onToggle={() => toggle("priority")}
                badge={sortedPatients.filter(p => p.score < 30).length > 0 ? `${sortedPatients.filter(p => p.score < 30).length} urgente` : undefined}
                badgeColor="destructive"
              >
                <div className="space-y-2">
                  {sortedPatients.filter(p => p.score < 70).slice(0, 6).map((p, i) => (
                    <PriorityPatientCard key={p.id} patient={p} rank={i} />
                  ))}
                  {sortedPatients.filter(p => p.score < 70).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">Todos os pacientes estão com bom score! 🎉</p>
                  )}
                </div>
              </CopilotSection>

              {/* AI Recommendations */}
              <CopilotSection
                title="Recomendações da IA"
                subtitle="Ações sugeridas com base nos dados"
                icon={<Zap className="w-4 h-4 text-primary" />}
                isOpen={expandedSection === "recommendations"}
                onToggle={() => toggle("recommendations")}
              >
                <AIRecommendations patients={sortedPatients} insights={aiInsights} />
              </CopilotSection>

              {/* Behavior Patterns */}
              {behaviorPatterns.length > 0 && (
                <CopilotSection
                  title="Padrões Comportamentais"
                  subtitle={`${behaviorPatterns.length} padrões detectados`}
                  icon={<Activity className="w-4 h-4 text-accent" />}
                  isOpen={expandedSection === "behavior"}
                  onToggle={() => toggle("behavior")}
                >
                  <div className="space-y-1.5">
                    {behaviorPatterns.map((bp, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => navigate(`/patients/${bp.patientId}`)}
                        className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/50 cursor-pointer hover:border-accent/30 transition-all"
                      >
                        <bp.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${bp.severity === "critical" ? "text-destructive" : bp.severity === "warning" ? "text-warning" : "text-info"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{bp.patientName}</p>
                          <p className="text-[11px] text-muted-foreground">{bp.pattern}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CopilotSection>
              )}

              {/* Clinical Alerts */}
              <CopilotSection
                title="Alertas Clínicos"
                subtitle="Prioridades de atendimento"
                icon={<Shield className="w-4 h-4 text-destructive" />}
                isOpen={expandedSection === "alerts"}
                onToggle={() => toggle("alerts")}
                badge={sortedPatients.filter(p => p.score < 30).length > 0 ? `${sortedPatients.filter(p => p.score < 30).length}` : undefined}
                badgeColor="destructive"
              >
                <ClinicalAlerts patients={sortedPatients} />
              </CopilotSection>

              {/* AI Feed */}
              <CopilotSection
                title="Feed de Inteligência"
                subtitle="Eventos detectados pela IA"
                icon={<BarChart3 className="w-4 h-4 text-info" />}
                isOpen={expandedSection === "feed"}
                onToggle={() => toggle("feed")}
              >
                <AIFeed patients={sortedPatients} insights={aiInsights} />
              </CopilotSection>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Collapsible Section ──
function CopilotSection({
  title, subtitle, icon, children, isOpen, onToggle, badge, badgeColor,
}: {
  title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode;
  isOpen: boolean; onToggle: () => void; badge?: string; badgeColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display font-semibold text-sm">{title}</p>
            {badge && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-${badgeColor}/20 text-${badgeColor} animate-pulse`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AI Activity Feed ──
function AIFeed({ patients, insights }: { patients: CopilotPatient[]; insights: any[] }) {
  const feedItems = useMemo(() => {
    const items: { text: string; icon: any; time: string; color: string }[] = [];

    const inactive = patients.filter(p => {
      if (!p.lastActivity) return false;
      const days = Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 86400000);
      return days >= 2 && days <= 5;
    });
    if (inactive.length > 0) items.push({ text: `${inactive.length} paciente(s) detectados com inatividade recente`, icon: AlertTriangle, time: "Agora", color: "text-warning" });

    const highRisk = patients.filter(p => p.score < 30);
    if (highRisk.length > 0) items.push({ text: `${highRisk.length} paciente(s) em alto risco clínico`, icon: Shield, time: "Hoje", color: "text-destructive" });

    const lostStreak = patients.filter(p => p.risks.includes("Perdeu streak"));
    if (lostStreak.length > 0) items.push({ text: `${lostStreak.length} paciente(s) perderam streak de consistência`, icon: Flame, time: "Recente", color: "text-warning" });

    // Churn feed events
    const churnResults = calculateChurnRisk(patients);
    const churnHigh = churnResults.filter(r => r.level === "high");
    if (churnHigh.length > 0) items.push({ text: `${churnHigh.length} paciente(s) em alto risco de abandono detectado`, icon: AlertTriangle, time: "Agora", color: "text-destructive" });

    insights.forEach(ins => {
      items.push({ text: ins.title + (ins.affected_count ? ` (${ins.affected_count} pacientes)` : ""), icon: Brain, time: "IA", color: "text-primary" });
    });

    if (items.length === 0) items.push({ text: "Nenhum evento relevante detectado. Sistema estável.", icon: Target, time: "Agora", color: "text-success" });

    return items.slice(0, 8);
  }, [patients, insights]);

  return (
    <div className="space-y-1.5">
      {feedItems.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/20 transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <item.icon className={`w-3 h-3 ${item.color}`} />
          </div>
          <p className="text-xs flex-1 leading-relaxed">{item.text}</p>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{item.time}</span>
        </motion.div>
      ))}
    </div>
  );
}
