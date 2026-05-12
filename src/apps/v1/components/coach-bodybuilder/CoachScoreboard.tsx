/**
 * Coach Executive Scoreboard — Portfolio command panel
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { PHASE_LABELS, type CheckinData, generateAlerts, analyzeAthleteData } from "@v1/lib/coachAnalysisEngine";
import {
  Trophy, TrendingUp, TrendingDown, AlertTriangle, Target,
  BarChart3, Users, Shield, Flame, Crown
} from "lucide-react";

interface Athlete {
  id: string;
  athlete_name: string;
  current_phase: string;
  status: string;
  prep_score: number;
}

interface Props {
  athletes: Athlete[];
  allCheckins: any[];
}

export default function CoachScoreboard({ athletes, allCheckins }: Props) {
  const metrics = useMemo(() => {
    if (athletes.length === 0) return null;

    const scores = athletes.map(a => a.prep_score || 0);
    const avgScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);

    // Avg adherence from last checkins
    const adherences = athletes.map(a => {
      const checkins = allCheckins.filter((c: any) => c.athlete_id === a.id);
      const last = checkins[0];
      return last?.adherence_pct ?? null;
    }).filter((v): v is number => v !== null);
    const avgAdherence = adherences.length > 0
      ? Math.round(adherences.reduce((s, v) => s + v, 0) / adherences.length)
      : 0;

    // Total alerts
    let totalAlerts = 0;
    athletes.forEach(a => {
      const checkins = allCheckins.filter((c: any) => c.athlete_id === a.id);
      const analysis = analyzeAthleteData(checkins as CheckinData[], a.current_phase);
      const alerts = generateAlerts(analysis, checkins as CheckinData[], a.current_phase);
      totalAlerts += alerts.length;
    });

    // Top 3 athletes
    const sorted = [...athletes].sort((a, b) => (b.prep_score || 0) - (a.prep_score || 0));
    const top3 = sorted.slice(0, 3);
    const bottom3 = [...sorted].reverse().slice(0, 3);

    // Risk trend
    const alertRate = athletes.length > 0 ? (athletes.filter(a => a.status === "alert").length / athletes.length) * 100 : 0;

    // Phase distribution
    const phases: Record<string, number> = {};
    athletes.forEach(a => { phases[a.current_phase] = (phases[a.current_phase] || 0) + 1; });

    return { avgScore, avgAdherence, totalAlerts, top3, bottom3, alertRate, phases };
  }, [athletes, allCheckins]);

  if (!metrics) return null;

  return (
    <Card className="overflow-hidden border-orange-500/15">
      <CardHeader className="pb-3 border-b border-border/30 bg-gradient-to-r from-orange-500/5 to-transparent">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          Scoreboard Executivo
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {/* Primary metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricBox
            icon={Target}
            label="Score Médio"
            value={metrics.avgScore}
            suffix="/100"
            color={metrics.avgScore >= 70 ? "text-emerald-400" : metrics.avgScore >= 40 ? "text-amber-400" : "text-red-400"}
          />
          <MetricBox
            icon={Shield}
            label="Aderência Média"
            value={metrics.avgAdherence}
            suffix="%"
            color={metrics.avgAdherence >= 80 ? "text-emerald-400" : metrics.avgAdherence >= 60 ? "text-amber-400" : "text-red-400"}
          />
          <MetricBox
            icon={AlertTriangle}
            label="Alertas Ativos"
            value={metrics.totalAlerts}
            color={metrics.totalAlerts === 0 ? "text-emerald-400" : metrics.totalAlerts > 5 ? "text-red-400" : "text-amber-400"}
          />
          <MetricBox
            icon={Flame}
            label="Taxa de Risco"
            value={Math.round(metrics.alertRate)}
            suffix="%"
            color={metrics.alertRate < 10 ? "text-emerald-400" : metrics.alertRate < 30 ? "text-amber-400" : "text-red-400"}
          />
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top athletes */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">Melhores da Semana</span>
            </div>
            <div className="space-y-2">
              {metrics.top3.map((a, i) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className={`text-xs font-black w-5 text-center ${i === 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </span>
                  <span className="text-sm text-foreground truncate flex-1">{a.athlete_name}</span>
                  <span className="text-sm font-bold text-emerald-400">{a.prep_score || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom athletes */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">Precisam de Atenção</span>
            </div>
            <div className="space-y-2">
              {metrics.bottom3.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${(a.prep_score || 0) < 30 ? "bg-red-500" : (a.prep_score || 0) < 50 ? "bg-amber-500" : "bg-muted-foreground"}`} />
                  <span className="text-sm text-foreground truncate flex-1">{a.athlete_name}</span>
                  <span className={`text-sm font-bold ${(a.prep_score || 0) < 30 ? "text-red-400" : (a.prep_score || 0) < 50 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {a.prep_score || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBox({ icon: Icon, label, value, suffix, color }: {
  icon: any; label: string; value: number; suffix?: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-muted/20 p-3 text-center">
      <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
      <p className={`text-2xl font-black ${color}`}>
        {value}<span className="text-sm text-muted-foreground font-normal">{suffix}</span>
      </p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}
