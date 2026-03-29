import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { analyzeAthleteData, generateDecisions, generateAlerts, PHASE_LABELS, type CheckinData } from "@/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Activity, Brain, Zap, Camera, Clock, AlertTriangle, Settings } from "lucide-react";
import AthleteCheckinForm from "./AthleteCheckinForm";
import AthleteAnalysisPanel from "./AthleteAnalysisPanel";
import AthleteDecisionPanel from "./AthleteDecisionPanel";
import CoachCompositeScore from "./CoachCompositeScore";
import CoachAlertsList from "./CoachAlertsList";
import CoachTimeline from "./CoachTimeline";
import CoachPhotoEvolution from "./CoachPhotoEvolution";
import { toast } from "sonner";

interface Props {
  athleteId: string;
  onBack: () => void;
}

type TabKey = "overview" | "checkin" | "analysis" | "decisions" | "photos" | "timeline";

export default function AthleteDetailView({ athleteId, onBack }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const { data: athlete } = useQuery({
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

  const { data: checkins = [] } = useQuery({
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

  const phaseMutation = useMutation({
    mutationFn: async (newPhase: string) => {
      await supabase.from("coach_athletes" as any)
        .update({ current_phase: newPhase, updated_at: new Date().toISOString() })
        .eq("id", athleteId);
      // Timeline event
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

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "overview", label: "Visão Geral", icon: Activity },
    { key: "checkin", label: "Check-in", icon: Activity },
    { key: "analysis", label: "Análise", icon: Brain },
    { key: "decisions", label: "Decisões", icon: Zap },
    { key: "photos", label: "Fotos", icon: Camera },
    { key: "timeline", label: "Timeline", icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{athlete?.athlete_name || "Carregando..."}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Select value={phase} onValueChange={v => phaseMutation.mutate(v)}>
              <SelectTrigger className="w-auto h-7 text-xs gap-1">
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
              Score: {analysisResult.overall_score}
            </Badge>
            {alerts.length > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {alerts.length} alerta{alerts.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className="shrink-0 text-xs"
            >
              <Icon className="h-3.5 w-3.5 mr-1" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Status + Score */}
          <div className="space-y-4">
            {/* Quick stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Status Atual</CardTitle>
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

          {/* Center: Alerts + Analysis summary */}
          <div className="space-y-4">
            <CoachAlertsList alerts={alerts} />
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
            {/* Top decision */}
            {decisions[0] && (
              <Card className="border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    Decisão Prioritária
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{decisions[0].reason}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">{decisions[0].data_basis}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Timeline preview */}
          <div>
            <CoachTimeline athleteId={athleteId} />
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
        <AthleteDecisionPanel decisions={decisions} athleteId={athleteId} analysis={analysisResult} />
      )}

      {activeTab === "photos" && (
        <CoachPhotoEvolution checkins={checkins as CheckinData[]} />
      )}

      {activeTab === "timeline" && (
        <CoachTimeline athleteId={athleteId} />
      )}
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
