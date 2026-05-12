/**
 * Coach Daily HQ — "Hoje no Coach Bodybuilder"
 * Daily command center for the coach
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { PHASE_LABELS, type CheckinData, generateAlerts, analyzeAthleteData } from "@v1/lib/coachAnalysisEngine";
import { calculatePriority, PRIORITY_CONFIG, type AthletePriority } from "@v1/lib/coachPriorityEngine";
import {
  Sunrise, AlertTriangle, Crown, Clock, Zap, ChevronRight,
  CheckCircle2, Activity, Shield
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
  onSelectAthlete: (id: string) => void;
}

export default function CoachDailyHQ({ athletes, allCheckins, onSelectAthlete }: Props) {
  const dailyData = useMemo(() => {
    const now = Date.now();

    // Calculate priorities
    const priorities: (AthletePriority & { athlete: Athlete })[] = athletes.map(a => {
      const checkins = allCheckins.filter((c: any) => c.athlete_id === a.id);
      const lastCheckin = checkins[0];
      const daysSince = lastCheckin
        ? Math.floor((now - new Date(lastCheckin.checkin_date).getTime()) / 86400000)
        : 99;
      const analysis = analyzeAthleteData(checkins as CheckinData[], a.current_phase);
      const alerts = generateAlerts(analysis, checkins as CheckinData[], a.current_phase);
      const hasRecentPhotos = checkins.some((c: any) =>
        (c.front_photo_url || c.side_photo_url || c.back_photo_url) &&
        (now - new Date(c.checkin_date).getTime()) / 86400000 < 7
      );

      const priority = calculatePriority({
        id: a.id,
        current_phase: a.current_phase,
        prep_score: a.prep_score || 0,
        status: a.status,
        alertCount: alerts.length,
        hasCriticalAlert: alerts.some(al => al.severity === "critical"),
        daysSinceCheckin: daysSince,
        hasRecentPhotos,
      });

      return { ...priority, athlete: a };
    }).sort((a, b) => b.score - a.score);

    // Pending check-ins today (>1 day)
    const pendingCheckin = priorities.filter(p => {
      const checkins = allCheckins.filter((c: any) => c.athlete_id === p.athlete.id);
      const last = checkins[0];
      if (!last) return true;
      return (now - new Date(last.checkin_date).getTime()) / 86400000 > 1;
    });

    // Peak week / pre contest
    const criticalPhase = priorities.filter(p =>
      p.athlete.current_phase === "peak_week" || p.athlete.current_phase === "pre_contest"
    );

    // Critical/high priority needing decision
    const needDecision = priorities.filter(p => p.level === "critical" || p.level === "high");

    return { priorities, pendingCheckin, criticalPhase, needDecision };
  }, [athletes, allCheckins]);

  const sections = [
    {
      key: "pending",
      icon: Clock,
      title: "Check-in Pendente",
      items: dailyData.pendingCheckin.slice(0, 5),
      color: "text-amber-400",
      emptyText: "Todos em dia",
    },
    {
      key: "critical",
      icon: AlertTriangle,
      title: "Atenção Imediata",
      items: dailyData.needDecision.slice(0, 5),
      color: "text-red-400",
      emptyText: "Sem urgências",
    },
    {
      key: "phase",
      icon: Crown,
      title: "Fase Prioritária",
      items: dailyData.criticalPhase.slice(0, 5),
      color: "text-orange-400",
      emptyText: "Nenhum em fase crítica",
    },
  ];

  const activeCount = sections.reduce((s, sec) => s + sec.items.length, 0);

  return (
    <Card className="overflow-hidden border-orange-500/20">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-500/8 to-red-600/5 border-b border-orange-500/10">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Sunrise className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-foreground">Hoje no Coach</span>
            <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          {activeCount > 0 ? (
            <Badge className="ml-auto bg-orange-500/20 text-orange-400 border-orange-500/30">
              {activeCount} pendências
            </Badge>
          ) : (
            <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Tudo em dia
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/30">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <div key={section.key} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 ${section.color}`} />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">{section.title}</span>
                  <Badge variant="outline" className="ml-auto text-[9px] h-4">
                    {section.items.length}
                  </Badge>
                </div>
                {section.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">{section.emptyText}</p>
                ) : (
                  <div className="space-y-1">
                    {section.items.map(item => {
                      const pc = PRIORITY_CONFIG[item.level];
                      return (
                        <button
                          key={item.athleteId}
                          onClick={() => onSelectAthlete(item.athleteId)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/40 transition-colors text-left group"
                        >
                          <div className={`w-2 h-2 rounded-full ${pc.dotColor} shrink-0`} />
                          <span className="text-sm text-foreground truncate flex-1">{item.athlete.athlete_name}</span>
                          <Badge variant="outline" className={`text-[9px] ${pc.color} ${pc.borderColor}`}>
                            {pc.label}
                          </Badge>
                          <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
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
