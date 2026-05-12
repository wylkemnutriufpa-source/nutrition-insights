import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PHASE_LABELS, type CheckinData, generateAlerts, analyzeAthleteData } from "@/lib/coachAnalysisEngine";
import {
  AlertTriangle, Clock, Crown, TrendingDown, Activity,
  ChevronRight, Flame, BarChart3
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

export default function CoachOperationalCenter({ athletes, allCheckins, onSelectAthlete }: Props) {
  const insights = useMemo(() => {
    const now = Date.now();

    // Stale check-ins (>3 days)
    const stale = athletes.filter(a => {
      const last = allCheckins.find((c: any) => c.athlete_id === a.id);
      if (!last) return true;
      return (now - new Date(last.checkin_date).getTime()) / 86400000 > 3;
    });

    // Low score (<50)
    const lowScore = athletes.filter(a => (a.prep_score || 0) < 50);

    // Critical alerts
    const withCriticalAlerts = athletes.filter(a => {
      const checkins = allCheckins.filter((c: any) => c.athlete_id === a.id);
      const analysis = analyzeAthleteData(checkins as CheckinData[], a.current_phase);
      const alerts = generateAlerts(analysis, checkins as CheckinData[], a.current_phase);
      return alerts.some(al => al.severity === "high");
    });

    // Peak week / pre contest
    const priorityPhase = athletes.filter(a =>
      a.current_phase === "peak_week" || a.current_phase === "pre_contest"
    );

    return { stale, lowScore, withCriticalAlerts, priorityPhase };
  }, [athletes, allCheckins]);

  const sections = [
    {
      key: "critical",
      title: "Alertas Críticos",
      icon: AlertTriangle,
      items: insights.withCriticalAlerts,
      color: "text-red-400",
      borderColor: "border-red-500/20",
      bgColor: "from-red-500/5",
      badge: (a: Athlete) => <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Crítico</Badge>,
    },
    {
      key: "stale",
      title: "Check-in Atrasado",
      icon: Clock,
      items: insights.stale,
      color: "text-amber-400",
      borderColor: "border-amber-500/20",
      bgColor: "from-amber-500/5",
      badge: (a: Athlete) => {
        const last = allCheckins.find((c: any) => c.athlete_id === a.id);
        const days = last ? Math.floor((Date.now() - new Date(last.checkin_date).getTime()) / 86400000) : 99;
        return <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">{days}d</Badge>;
      },
    },
    {
      key: "priority",
      title: "Fase Prioritária",
      icon: Crown,
      items: insights.priorityPhase,
      color: "text-orange-400",
      borderColor: "border-orange-500/20",
      bgColor: "from-orange-500/5",
      badge: (a: Athlete) => <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">{PHASE_LABELS[a.current_phase]}</Badge>,
    },
    {
      key: "low",
      title: "Score Baixo (<50)",
      icon: TrendingDown,
      items: insights.lowScore,
      color: "text-red-400",
      borderColor: "border-red-500/15",
      bgColor: "from-red-500/3",
      badge: (a: Athlete) => <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Score {a.prep_score || 0}</Badge>,
    },
  ];

  const activeSections = sections.filter(s => s.items.length > 0);

  if (activeSections.length === 0) {
    return (
      <Card className="border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <CardContent className="p-6 text-center">
          <Activity className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">Tudo sob controle</p>
          <p className="text-xs text-muted-foreground">Nenhum atleta requer atenção imediata.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          Central Operacional
          <Badge variant="outline" className="ml-auto text-[10px]">
            {activeSections.reduce((s, sec) => s + sec.items.length, 0)} pendências
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/30">
          {activeSections.map(section => {
            const Icon = section.icon;
            return (
              <div key={section.key} className={`bg-gradient-to-r ${section.bgColor} to-transparent`}>
                <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${section.color}`} />
                  <span className="text-xs font-semibold text-foreground">{section.title}</span>
                  <Badge variant="outline" className="ml-auto text-[9px] h-4">{section.items.length}</Badge>
                </div>
                <div className="px-2 pb-2">
                  {section.items.slice(0, 4).map(a => (
                    <button
                      key={a.id}
                      onClick={() => onSelectAthlete(a.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors text-left group"
                    >
                      <span className="text-sm text-foreground truncate">{a.athlete_name}</span>
                      <div className="flex items-center gap-2">
                        {section.badge(a)}
                        <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                  {section.items.length > 4 && (
                    <p className="text-[10px] text-muted-foreground text-center py-1">+{section.items.length - 4} mais</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
