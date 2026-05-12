import { useState, useMemo } from "react";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { analyzeAthleteData, generateAlerts, PHASE_LABELS, PHASE_LIST, type CheckinData } from "@v1/lib/coachAnalysisEngine";
import { calculatePriority, PRIORITY_CONFIG, type PriorityLevel } from "@v1/lib/coachPriorityEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@v1/components/ui/dialog";
import { Label } from "@v1/components/ui/label";
import {
  Flame, Plus, Search, Users, TrendingUp, AlertTriangle, Trophy,
  ShieldAlert, Filter, Target, Zap, Clock, BarChart3, Camera, Crown
} from "lucide-react";
import CoachHeroBanner from "./CoachHeroBanner";
import CoachDailyHQ from "./CoachDailyHQ";
import CoachScoreboard from "./CoachScoreboard";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  evolving: { label: "Evoluindo", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: TrendingUp },
  stagnant: { label: "Estagnado", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: AlertTriangle },
  alert: { label: "Alerta", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: ShieldAlert },
};

interface Props {
  onSelectAthlete: (id: string) => void;
}

export default function CoachDashboard({ onSelectAthlete }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newPhase, setNewPhase] = useState("bulking");
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAlert, setFilterAlert] = useState("all");
  const [filterPhotos, setFilterPhotos] = useState("all");
  const [showScoreboard, setShowScoreboard] = useState(true);

  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ["coach-athletes", user?.id, tenantId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_athletes" as any)
        .select("*")
        .eq("coach_id", user!.id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const ids = (data || []).map((a: any) => a.patient_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });
      return (data || []).map((a: any) => ({ ...a, athlete_name: nameMap[a.patient_id] || "Atleta" }));
    },
  });

  const athleteIds = athletes.map((a: any) => a.id);
  const { data: allCheckins = [] } = useQuery({
    queryKey: ["coach-all-checkins", athleteIds.join(",")],
    enabled: athleteIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_athlete_checkins" as any)
        .select("*")
        .in("athlete_id", athleteIds)
        .order("checkin_date", { ascending: false })
        .limit(500);
      return (data || []) as any[];
    },
  });

  // Pre-compute alerts and priorities for each athlete
  const athleteExtras = useMemo(() => {
    const now = Date.now();
    const map: Record<string, {
      alerts: ReturnType<typeof generateAlerts>;
      priority: ReturnType<typeof calculatePriority>;
      daysSinceCheckin: number;
      hasRecentPhotos: boolean;
    }> = {};

    athletes.forEach((a: any) => {
      const checkins = allCheckins.filter((c: any) => c.athlete_id === a.id);
      const analysis = analyzeAthleteData(checkins as CheckinData[], a.current_phase);
      const alerts = generateAlerts(analysis, checkins as CheckinData[], a.current_phase);
      const lastCheckin = checkins[0];
      const daysSince = lastCheckin
        ? Math.floor((now - new Date(lastCheckin.checkin_date).getTime()) / 86400000)
        : 99;
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

      map[a.id] = { alerts, priority, daysSinceCheckin: daysSince, hasRecentPhotos };
    });

    return map;
  }, [athletes, allCheckins]);

  const { data: availablePatients = [] } = useQuery({
    queryKey: ["coach-available-patients", user?.id],
    enabled: !!user && addOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user!.id)
        .eq("status", "active");
      const ids = (data || []).map((p: any) => p.patient_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      return (profiles || []).map((p: any) => ({ id: p.user_id, name: p.full_name }));
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coach_athletes" as any).insert({
        patient_id: newPatientId,
        coach_id: user!.id,
        tenant_id: tenantId,
        current_phase: newPhase,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-athletes"] });
      setAddOpen(false);
      setNewPatientId("");
      toast.success("Atleta adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar atleta."),
  });

  // Advanced filtering
  const filtered = athletes.filter((a: any) => {
    if (search && !a.athlete_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPhase !== "all" && a.current_phase !== filterPhase) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;

    const extras = athleteExtras[a.id];
    if (extras) {
      if (filterPriority !== "all" && extras.priority.level !== filterPriority) return false;
      if (filterAlert === "with" && extras.alerts.length === 0) return false;
      if (filterAlert === "without" && extras.alerts.length > 0) return false;
      if (filterPhotos === "with" && !extras.hasRecentPhotos) return false;
      if (filterPhotos === "without" && extras.hasRecentPhotos) return false;
    }
    return true;
  });

  // Sort by priority score desc
  const sortedFiltered = [...filtered].sort((a: any, b: any) => {
    const pa = athleteExtras[a.id]?.priority.score || 0;
    const pb = athleteExtras[b.id]?.priority.score || 0;
    return pb - pa;
  });

  const stats = {
    total: athletes.length,
    evolving: athletes.filter((a: any) => a.status === "evolving").length,
    stagnant: athletes.filter((a: any) => a.status === "stagnant").length,
    alert: athletes.filter((a: any) => a.status === "alert").length,
  };

  const avgScore = athletes.length > 0
    ? Math.round(athletes.reduce((s: number, a: any) => s + (a.prep_score || 0), 0) / athletes.length)
    : 0;

  const phaseGroups = PHASE_LIST.reduce<Record<string, number>>((acc, p) => {
    acc[p] = athletes.filter((a: any) => a.current_phase === p).length;
    return acc;
  }, {});

  const activeFilters = [filterPhase, filterStatus, filterPriority, filterAlert, filterPhotos].filter(f => f !== "all").length;

  return (
    <div className="space-y-6">
      {/* Premium Hero Banner */}
      <CoachHeroBanner totalAthletes={stats.total} avgScore={avgScore} alertCount={stats.alert} />

      {/* Daily HQ */}
      {athletes.length > 0 && (
        <CoachDailyHQ
          athletes={athletes.map((a: any) => ({
            id: a.id,
            athlete_name: a.athlete_name,
            current_phase: a.current_phase,
            status: a.status,
            prep_score: a.prep_score || 0,
          }))}
          allCheckins={allCheckins}
          onSelectAthlete={onSelectAthlete}
        />
      )}

      {/* Add Athlete button row */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={showScoreboard ? "default" : "outline"}
            size="sm"
            onClick={() => setShowScoreboard(!showScoreboard)}
            className={showScoreboard ? "bg-gradient-to-r from-orange-500 to-red-600 text-white border-0" : ""}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Scoreboard
          </Button>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/20">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Atleta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Atleta</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Paciente</Label>
                <Select value={newPatientId} onValueChange={setNewPatientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {availablePatients.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fase Atual</Label>
                <Select value={newPhase} onValueChange={setNewPhase}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PHASE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => addMutation.mutate()} disabled={!newPatientId || addMutation.isPending} className="w-full">
                {addMutation.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Executive Scoreboard */}
      {showScoreboard && athletes.length > 0 && (
        <CoachScoreboard
          athletes={athletes.map((a: any) => ({
            id: a.id,
            athlete_name: a.athlete_name,
            current_phase: a.current_phase,
            status: a.status,
            prep_score: a.prep_score || 0,
          }))}
          allCheckins={allCheckins}
        />
      )}

      {/* Premium Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <PremiumStatCard icon={Users} label="Atletas" value={stats.total} color="from-blue-500/20 to-cyan-500/20" iconColor="text-blue-400" />
        <PremiumStatCard icon={TrendingUp} label="Evoluindo" value={stats.evolving} color="from-emerald-500/20 to-green-500/20" iconColor="text-emerald-400" />
        <PremiumStatCard icon={AlertTriangle} label="Estagnados" value={stats.stagnant} color="from-amber-500/20 to-yellow-500/20" iconColor="text-amber-400" />
        <PremiumStatCard icon={ShieldAlert} label="Em Alerta" value={stats.alert} color="from-red-500/20 to-orange-500/20" iconColor="text-red-400" />
        <PremiumStatCard icon={Trophy} label="Score Médio" value={avgScore} color="from-primary/20 to-primary/10" iconColor="text-primary" />
      </div>

      {/* Phase badges */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(phaseGroups).filter(([, c]) => c > 0).map(([phase, count]) => (
          <Badge
            key={phase}
            variant={filterPhase === phase ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${filterPhase === phase ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}
            onClick={() => setFilterPhase(filterPhase === phase ? "all" : phase)}
          >
            {PHASE_LABELS[phase]}: {count}
          </Badge>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar atleta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterPhase} onValueChange={setFilterPhase}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Fases</SelectItem>
            {Object.entries(PHASE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]">
            <BarChart3 className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="evolving">Evoluindo</SelectItem>
            <SelectItem value="stagnant">Estagnado</SelectItem>
            <SelectItem value="alert">Alerta</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]">
            <Crown className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Prioridades</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAlert} onValueChange={setFilterAlert}>
          <SelectTrigger className="w-[130px]">
            <AlertTriangle className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Alertas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="with">Com alertas</SelectItem>
            <SelectItem value="without">Sem alertas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPhotos} onValueChange={setFilterPhotos}>
          <SelectTrigger className="w-[140px]">
            <Camera className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Fotos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="with">Com fotos recentes</SelectItem>
            <SelectItem value="without">Sem fotos recentes</SelectItem>
          </SelectContent>
        </Select>
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={() => {
            setFilterPhase("all"); setFilterStatus("all"); setFilterPriority("all");
            setFilterAlert("all"); setFilterPhotos("all"); setSearch("");
          }}>
            Limpar ({activeFilters})
          </Button>
        )}
      </div>

      {/* Athletes Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Carregando atletas...</p>
          </div>
        </div>
      ) : sortedFiltered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {athletes.length === 0 ? "Nenhum atleta cadastrado. Adicione seu primeiro atleta!" : "Nenhum resultado encontrado."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedFiltered.map((athlete: any) => {
            const sc = STATUS_CONFIG[athlete.status] || STATUS_CONFIG.evolving;
            const ScIcon = sc.icon;
            const extras = athleteExtras[athlete.id];
            const alerts = extras?.alerts || [];
            const priority = extras?.priority;
            const score = athlete.prep_score || 0;
            const pc = priority ? PRIORITY_CONFIG[priority.level] : null;

            return (
              <Card
                key={athlete.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all group overflow-hidden"
                onClick={() => onSelectAthlete(athlete.id)}
              >
                <CardContent className="p-0">
                  {/* Score gradient bar + priority dot */}
                  <div className="h-1 w-full relative" style={{
                    background: `linear-gradient(to right, ${score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444"}, ${score >= 70 ? "#34d399" : score >= 40 ? "#fbbf24" : "#f87171"})`,
                  }}>
                    {pc && (
                      <div className={`absolute right-2 -bottom-1.5 w-3 h-3 rounded-full ${pc.dotColor} border-2 border-card`} />
                    )}
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors truncate">
                        {athlete.athlete_name}
                      </h3>
                      <Badge className={sc.color}>
                        <ScIcon className="h-3 w-3 mr-1" />
                        {sc.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{PHASE_LABELS[athlete.current_phase] || athlete.current_phase}</Badge>
                      {pc && (
                        <Badge className={`${pc.bgColor} ${pc.color} ${pc.borderColor} text-[10px]`}>
                          {pc.label}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        <span className={`text-lg font-black ${score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400"}`}>
                          {score}
                        </span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                      {alerts.length > 0 && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          {alerts.length}
                        </Badge>
                      )}
                    </div>
                    {/* Priority reason */}
                    {priority && priority.reasons.length > 0 && priority.level !== "low" && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        → {priority.reasons[0]}
                      </p>
                    )}
                    {/* Score bar */}
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, score)}%`,
                          background: score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PremiumStatCard({ icon: Icon, label, value, color, iconColor }: { icon: any; label: string; value: number; color: string; iconColor: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`p-4 bg-gradient-to-br ${color}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/50">
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
