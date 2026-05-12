import { useState, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle,
  Zap, Heart, Activity, Target
} from "lucide-react";

const TREND_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  rising: { icon: TrendingUp, label: "Em alta", color: "text-emerald-500" },
  stable: { icon: Activity, label: "Estável", color: "text-primary" },
  declining: { icon: TrendingDown, label: "Em queda", color: "text-destructive" },
};

const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Baixo", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  moderate: { label: "Moderado", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  high: { label: "Alto", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

interface Props {
  students: { student_id: string; full_name: string }[];
}

export default function WorkoutIFJInsights({ students }: Props) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || students.length === 0) return;
    const load = async () => {
      const ids = students.map(s => s.student_id);
      const { data } = await (supabase as any)
        .from("workout_student_learning_profile")
        .select("*")
        .in("student_id", ids);
      setProfiles(data || []);
      setLoading(false);
    };
    load();
  }, [user, students]);

  if (loading || profiles.length === 0) return null;

  const atRisk = profiles.filter(p => p.risk_level === "high" || p.motivation_trend === "declining");
  const withPain = profiles.filter(p => (p.pain_history || []).length > 0);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          IFJ — Inteligência de Treino
          <Badge variant="secondary" className="text-xs">{profiles.length} alunos monitorados</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{profiles.length}</p>
            <p className="text-[10px] text-muted-foreground">Alunos Ativos</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <Zap className="w-5 h-5 mx-auto mb-1 text-warning" />
            <p className="text-lg font-bold">
              {profiles.length > 0 ? (profiles.reduce((a, p) => a + (p.avg_effort || 0), 0) / profiles.length).toFixed(1) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">Esforço Médio</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-destructive" />
            <p className="text-lg font-bold">{atRisk.length}</p>
            <p className="text-[10px] text-muted-foreground">Em Risco</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <Heart className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{withPain.length}</p>
            <p className="text-[10px] text-muted-foreground">Com Dor</p>
          </div>
        </div>

        {/* Student insights */}
        <div className="space-y-2">
          {profiles.map(profile => {
            const student = students.find(s => s.student_id === profile.student_id);
            if (!student) return null;
            const trend = TREND_CONFIG[profile.motivation_trend] || TREND_CONFIG.stable;
            const risk = RISK_CONFIG[profile.risk_level] || RISK_CONFIG.low;
            const TrendIcon = trend.icon;
            const painHistory = Array.isArray(profile.pain_history) ? profile.pain_history : [];
            const recentNotes = Array.isArray(profile.ifj_notes) ? profile.ifj_notes.slice(-2) : [];

            return (
              <div key={profile.id} className="p-3 rounded-lg bg-muted/20 border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {student.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{student.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {profile.total_sessions} sessões • Adesão: {(profile.avg_completion_rate || 0).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[9px] ${risk.color}`}>{risk.label}</Badge>
                    <TrendIcon className={`w-4 h-4 ${trend.color}`} />
                  </div>
                </div>

                {profile.is_also_patient && (
                  <Badge className="text-[9px] bg-primary/10 text-primary border-primary/30">
                    🔗 Também é paciente nutricional — IFJ intensificada
                  </Badge>
                )}

                {painHistory.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {painHistory.slice(-3).map((p: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-[9px]">
                        {p.area} ({p.count || 1}x)
                      </Badge>
                    ))}
                  </div>
                )}

                {recentNotes.length > 0 && (
                  <div className="space-y-1">
                    {recentNotes.map((note: any, i: number) => (
                      <p key={i} className="text-[10px] text-muted-foreground italic">
                        🧠 {typeof note === "string" ? note : note.text}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
