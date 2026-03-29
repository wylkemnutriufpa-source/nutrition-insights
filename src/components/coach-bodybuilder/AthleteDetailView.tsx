import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { analyzeAthleteData, generateDecisions, type CheckinData } from "@/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Activity, Brain, Dumbbell, TrendingUp, Camera, Zap } from "lucide-react";
import AthleteCheckinForm from "./AthleteCheckinForm";
import AthleteAnalysisPanel from "./AthleteAnalysisPanel";
import AthleteDecisionPanel from "./AthleteDecisionPanel";

const PHASE_LABELS: Record<string, string> = {
  cutting: "Cutting", bulking: "Bulking", peak_week: "Peak Week",
  reverse: "Reverse Diet", maintenance: "Manutenção",
};

interface Props {
  athleteId: string;
  onBack: () => void;
}

export default function AthleteDetailView({ athleteId, onBack }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: athlete } = useQuery({
    queryKey: ["coach-athlete", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_athletes" as any)
        .select("*")
        .eq("id", athleteId)
        .single();
      if (error) throw error;
      // Get name
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

  const lastCheckin = checkins[0] || null;
  const phase = athlete?.current_phase || "bulking";

  // Run analysis
  const analysisResult = analyzeAthleteData(checkins as CheckinData[], phase);
  const decisions = generateDecisions(analysisResult, phase, checkins as CheckinData[]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{athlete?.athlete_name || "Carregando..."}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{PHASE_LABELS[phase]}</Badge>
            <Badge className={
              analysisResult.overall_score >= 70 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
              analysisResult.overall_score >= 40 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
              "bg-red-500/20 text-red-400 border-red-500/30"
            }>
              Score: {analysisResult.overall_score}
            </Badge>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusCard label="Peso Atual" value={lastCheckin?.weight ? `${lastCheckin.weight} kg` : "—"} icon={Activity} />
        <StatusCard label="Média 7d" value={lastCheckin?.weight_avg_7d ? `${lastCheckin.weight_avg_7d} kg` : "—"} icon={TrendingUp} />
        <StatusCard label="Variação" value={lastCheckin?.weight_variation != null ? `${lastCheckin.weight_variation > 0 ? "+" : ""}${lastCheckin.weight_variation} kg` : "—"} icon={Zap} />
        <StatusCard label="Aderência" value={lastCheckin?.adherence_pct != null ? `${lastCheckin.adherence_pct}%` : "—"} icon={Dumbbell} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="checkin" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="checkin"><Activity className="h-4 w-4 mr-1.5" />Check-in</TabsTrigger>
          <TabsTrigger value="analysis"><Brain className="h-4 w-4 mr-1.5" />Análise</TabsTrigger>
          <TabsTrigger value="decisions"><Zap className="h-4 w-4 mr-1.5" />Decisões</TabsTrigger>
          <TabsTrigger value="photos"><Camera className="h-4 w-4 mr-1.5" />Fotos</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin">
          <AthleteCheckinForm athleteId={athleteId} coachId={user?.id || ""} />
        </TabsContent>

        <TabsContent value="analysis">
          <AthleteAnalysisPanel analysis={analysisResult} checkins={checkins} phase={phase} />
        </TabsContent>

        <TabsContent value="decisions">
          <AthleteDecisionPanel
            decisions={decisions}
            athleteId={athleteId}
            analysis={analysisResult}
          />
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />Evolução Visual</CardTitle></CardHeader>
            <CardContent>
              {checkins.filter((c: any) => c.front_photo_url || c.side_photo_url || c.back_photo_url).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma foto registrada. Adicione fotos nos check-ins.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {checkins.filter((c: any) => c.front_photo_url || c.side_photo_url || c.back_photo_url).slice(0, 6).map((c: any) => (
                    <div key={c.id} className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{new Date(c.checkin_date).toLocaleDateString("pt-BR")}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {c.front_photo_url && <img src={c.front_photo_url} alt="Frente" className="rounded-lg aspect-[3/4] object-cover" />}
                        {c.side_photo_url && <img src={c.side_photo_url} alt="Lado" className="rounded-lg aspect-[3/4] object-cover" />}
                        {c.back_photo_url && <img src={c.back_photo_url} alt="Costas" className="rounded-lg aspect-[3/4] object-cover" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <p className="text-lg font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
