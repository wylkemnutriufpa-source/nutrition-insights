import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { analyzeAthleteData, generateDecisions, generateAlerts, PHASE_LABELS, type CheckinData } from "@/lib/coachAnalysisEngine";
import { calculatePriority } from "@/lib/coachPriorityEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Activity, Brain, Zap, Camera, Clock, AlertTriangle, Settings, Shield } from "lucide-react";
import AthleteCheckinForm from "./AthleteCheckinForm";
import AthleteAnalysisPanel from "./AthleteAnalysisPanel";
import AthleteDecisionPanel from "./AthleteDecisionPanel";
import CoachCompositeScore from "./CoachCompositeScore";
import CoachAlertCenter from "./CoachAlertCenter";
import CoachTimeline from "./CoachTimeline";
import CoachPhotoEvolution from "./CoachPhotoEvolution";
import CoachQuickActions from "./CoachQuickActions";
import CoachManualDecision from "./CoachManualDecision";
import CoachNoteForm from "./CoachNoteForm";
import CoachAthleteStrategicSummary from "./CoachAthleteStrategicSummary";
import CoachRetentionBadge from "./CoachRetentionBadge";
import { toast } from "sonner";

interface Props {
  athleteId: string;
  onBack: () => void;
}

type TabKey = "overview" | "checkin" | "analysis" | "decisions" | "photos" | "timeline" | "alerts";

export default function AthleteDetailView({ athleteId, onBack }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const { data: athlete, isLoading: athleteLoading } = useQuery({
    queryKey: ["coach-athlete", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_athletes" as any)
        .select("*")
        .eq("id", athleteId)
        .single();
      if (error) throw error;
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", (data as any).patient_id).maybeSingle();
      return { ...(data as any), athlete_name: prof?.full_name || "Atleta" };
    },
  });

  const { data: checkins = [], isLoading: checkinsLoading } = useQuery({
    queryKey: ["coach-checkins", athleteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_athlete_checkins" as any)
        .select("*")
        .eq("athlete_id", athleteId)
        .order("checkin_date", { ascending: false })
        .limit(30);
      return (data || []) as any[];
    },
  });

  // Get last manual decision
  const { data: lastDecision } = useQuery({
    queryKey: ["coach-last-decision", athleteId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("coach_decisions")
        .select("decision_type, notes")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
  });

  const phaseMutation = useMutation({
    mutationFn: async (newPhase: string) => {
      await supabase.from("coach_athletes" as any)
        .update({ current_phase: newPhase, updated_at: new Date().toISOString() })
        .eq("id", athleteId);
      await supabase.from("coach_timeline" as any).insert({
        athlete_id: athleteId,
        coach_id: user!.id,
        tenant_id: tenantId,
        event_type: "phase_change",
        title: `Fase alterada para ${PHASE_LABELS[newPhase] || newPhase}`,
        description: `Fase anterior: ${PHASE_LABELS[athlete?.current_phase] || athlete?.current_phase}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-athlete", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["coach-timeline", athleteId] });
      toast.success("Fase atualizada!");
    },
  });

  const lastCheckin = checkins[0] || null;
  const phase = athlete?.current_phase || "bulking";
  const analysisResult = analyzeAthleteData(checkins as CheckinData[], phase);
  const decisions = generateDecisions(analysisResult, phase, checkins as CheckinData[]);
  const alerts = generateAlerts(analysisResult, checkins as CheckinData[], phase);

  // Priority calculation
  const priority = useMemo(() => {
    const now = Date.now();
    const daysSince = lastCheckin
      ? Math.floor((now - new Date(lastCheckin.checkin_date).getTime()) / 86400000)
      : 99;
    const hasRecentPhotos = checkins.some((c: any) =>
      (c.front_photo_url || c.side_photo_url || c.back_photo_url) &&
      (now - new Date(c.checkin_date).getTime()) / 86400000 < 7
    );
    return calculatePriority({
      id: athleteId,
      current_phase: phase,
      prep_score: athlete?.prep_score || 0,
      status: athlete?.status || "evolving",
      alertCount: alerts.length,
      hasCriticalAlert: alerts.some(al => al.severity === "critical"),
      daysSinceCheckin: daysSince,
      hasRecentPhotos,
    });
  }, [athleteId, phase, athlete, alerts, lastCheckin, checkins]);

  // Retention metrics
  const retentionMetrics = useMemo(() => {
    const totalCheckins = checkins.length;
    // Calculate week streak
    const sorted = [...checkins].sort((a: any, b: any) => b.checkin_date.localeCompare(a.checkin_date));
    let weekStreak = 0;
    const now = new Date();
    for (let w = 0; w < 52; w++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const hasCheckin = sorted.some((c: any) => {
        const d = new Date(c.checkin_date);
        return d >= weekStart && d < weekEnd;
      });
      if (hasCheckin) weekStreak++;
      else break;
    }
    const adherences = checkins.map((c: any) => c.adherence_pct).filter((v: any): v is number => v != null);
    const avgAdherence = adherences.length > 0 ? Math.round(adherences.reduce((s: number, v: number) => s + v, 0) / adherences.length) : 0;
    return { totalCheckins, weekStreak, avgAdherence };
  }, [checkins]);

  // Last visual observation
  const lastVisualObs = checkins.find((c: any) => c.visual_observation)?.visual_observation || null;

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "checkin": setActiveTab("checkin"); break;
      case "photos": setActiveTab("photos"); break;
      case "phase": break;
      case "manual_decision": setActiveTab("decisions"); break;
      case "alerts": setActiveTab("alerts"); break;
      case "note": setActiveTab("timeline"); break;
    }
  };

  const tabs: { key: TabKey; label: string; icon: any; badge?: number }[] = [
    { key: "overview", label: "Visão Geral", icon: Activity },
    { key: "checkin", label: "Check-in", icon: Activity },
    { key: "analysis", label: "Análise", icon: Brain },
    { key: "decisions", label: "Decisões", icon: Zap },
    { key: "alerts", label: "Alertas", icon: Shield, badge: alerts.length },
    { key: "photos", label: "Fotos", icon: Camera },
    { key: "timeline", label: "Timeline", icon: Clock },
  ];

  const isLoading = athleteLoading || checkinsLoading;

  if (isLoading && !athlete) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando atleta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-card via-card to-card p-5">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-600/5" />
        <div className="relative flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 mt-0.5">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{athlete?.athlete_name || "Atleta"}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Select value={phase} onValueChange={v => phaseMutation.mutate(v)}>
                <SelectTrigger className="w-auto h-7 text-xs gap-1 bg-background/50">
                  <Settings className="h-3 w-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PHASE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge className={
                analysisResult.overall_score >= 70 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                analysisResult.overall_score >= 40 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                "bg-red-500/20 text-red-400 border-red-500/30"
              }>
                Score: {analysisResult.overall_score}/100
              </Badge>
              <CoachRetentionBadge {...retentionMetrics} compact />
              {alerts.length > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 cursor-pointer" onClick={() => setActiveTab("alerts")}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {alerts.length} alerta{alerts.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
          {/* Score circle */}
          <div className="shrink-0 hidden md:flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${
              analysisResult.overall_score >= 70 ? "border-emerald-500/50" :
              analysisResult.overall_score >= 40 ? "border-amber-500/50" :
              "border-red-500/50"
            }`}>
              <span className={`text-xl font-black ${
                analysisResult.overall_score >= 70 ? "text-emerald-400" :
                analysisResult.overall_score >= 40 ? "text-amber-400" :
                "text-red-400"
              }`}>{analysisResult.overall_score}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1">Score Geral</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <CoachQuickActions onAction={handleQuickAction} alertCount={alerts.length} />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 text-xs relative ${activeTab === tab.key ? "bg-gradient-to-r from-orange-500 to-red-600 text-white border-0" : ""}`}
            >
              <Icon className="h-3.5 w-3.5 mr-1" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Strategic Summary */}
          <CoachAthleteStrategicSummary
            athleteName={athlete?.athlete_name || "Atleta"}
            phase={phase}
            analysis={analysisResult}
            alerts={alerts}
            decisions={decisions}
            priorityLevel={priority.level}
            lastVisualObservation={lastVisualObs}
            lastManualDecision={lastDecision?.notes || null}
          />

          {/* Retention Badge */}
          <CoachRetentionBadge {...retentionMetrics} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-4">
              <Card className="border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Status Atual
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <QuickStat label="Peso" value={lastCheckin?.weight ? `${lastCheckin.weight} kg` : "—"} />
                  <QuickStat label="Média 7d" value={lastCheckin?.weight_avg_7d ? `${lastCheckin.weight_avg_7d} kg` : "—"} />
                  <QuickStat label="Variação" value={lastCheckin?.weight_variation != null ? `${lastCheckin.weight_variation > 0 ? "+" : ""}${lastCheckin.weight_variation} kg` : "—"} />
                  <QuickStat label="Aderência" value={lastCheckin?.adherence_pct != null ? `${lastCheckin.adherence_pct}%` : "—"} />
                </CardContent>
              </Card>
              <CoachCompositeScore score={analysisResult.composite_score} />
            </div>

            <div className="space-y-4">
              {alerts.length > 0 && (
                <Card className="border-red-500/20 bg-red-500/5 cursor-pointer" onClick={() => setActiveTab("alerts")}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-semibold text-foreground">{alerts.length} Alerta{alerts.length > 1 ? "s" : ""} Ativo{alerts.length > 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{alerts[0]?.title}{alerts.length > 1 ? ` e mais ${alerts.length - 1}...` : ""}</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Resumo da Análise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed">{analysisResult.analysis_summary}</p>
                </CardContent>
              </Card>
              {decisions[0] && (
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-400" />
                      Decisão Prioritária
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">{decisions[0].reason}</p>
                    {decisions[0].expected_impact && (
                      <p className="text-xs text-primary mt-1">→ {decisions[0].expected_impact}</p>
                    )}
                  </CardContent>
                </Card>
              )}
              <CoachManualDecision athleteId={athleteId} />
              <CoachNoteForm athleteId={athleteId} />
            </div>

            <div>
              <CoachTimeline athleteId={athleteId} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "checkin" && (
        <AthleteCheckinForm athleteId={athleteId} coachId={user?.id || ""} />
      )}

      {activeTab === "analysis" && (
        <AthleteAnalysisPanel analysis={analysisResult} checkins={checkins} phase={phase} />
      )}

      {activeTab === "decisions" && (
        <div className="space-y-4">
          <CoachManualDecision athleteId={athleteId} />
          <AthleteDecisionPanel decisions={decisions} athleteId={athleteId} analysis={analysisResult} />
        </div>
      )}

      {activeTab === "alerts" && (
        <CoachAlertCenter athleteId={athleteId} generatedAlerts={alerts} />
      )}

      {activeTab === "photos" && (
        <CoachPhotoEvolution checkins={checkins as CheckinData[]} />
      )}

      {activeTab === "timeline" && (
        <div className="space-y-4">
          <CoachNoteForm athleteId={athleteId} />
          <CoachTimeline athleteId={athleteId} />
        </div>
      )}
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/30">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
