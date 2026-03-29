import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { analyzeAthleteData, generateAlerts, PHASE_LABELS, PHASE_LIST, type CheckinData } from "@/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Flame, Plus, Search, Users, TrendingUp, AlertTriangle, Trophy,
  ShieldAlert, Droplets, Zap, Filter, Clock
} from "lucide-react";
import { toast } from "sonner";
import CoachAlertsList from "./CoachAlertsList";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  evolving: { label: "Evoluindo", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: TrendingUp },
  stagnant: { label: "Estagnado", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: AlertTriangle },
  alert: { label: "Alerta", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
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

  // Fetch recent checkins for all athletes to compute alerts
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

  // Compute alerts per athlete
  const athleteAlerts = useMemo(() => {
    const map: Record<string, ReturnType<typeof generateAlerts>> = {};
    athletes.forEach((a: any) => {
      const checkins = allCheckins.filter((c: any) => c.athlete_id === a.id);
      const analysis = analyzeAthleteData(checkins as CheckinData[], a.current_phase);
      map[a.id] = generateAlerts(analysis, checkins as CheckinData[], a.current_phase);
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

  const filtered = athletes.filter((a: any) => {
    if (search && !a.athlete_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPhase !== "all" && a.current_phase !== filterPhase) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: athletes.length,
    evolving: athletes.filter((a: any) => a.status === "evolving").length,
    stagnant: athletes.filter((a: any) => a.status === "stagnant").length,
    alert: athletes.filter((a: any) => a.status === "alert").length,
  };

  const totalAlerts = Object.values(athleteAlerts).reduce((s, a) => s + a.length, 0);
  const avgScore = athletes.length > 0
    ? Math.round(athletes.reduce((s: number, a: any) => s + (a.prep_score || 0), 0) / athletes.length)
    : 0;

  // Widgets data
  const athletesWithAlerts = athletes.filter((a: any) => (athleteAlerts[a.id]?.length || 0) > 0);
  const phaseGroups = PHASE_LIST.reduce<Record<string, number>>((acc, p) => {
    acc[p] = athletes.filter((a: any) => a.current_phase === p).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
            <Flame className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Coach Bodybuilder</h1>
            <p className="text-sm text-muted-foreground">Sistema premium de preparação física</p>
          </div>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
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

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Total" value={stats.total} color="text-blue-400" />
        <StatCard icon={TrendingUp} label="Evoluindo" value={stats.evolving} color="text-emerald-400" />
        <StatCard icon={AlertTriangle} label="Estagnados" value={stats.stagnant} color="text-amber-400" />
        <StatCard icon={ShieldAlert} label="Em Alerta" value={stats.alert} color="text-red-400" />
        <StatCard icon={Trophy} label="Score Médio" value={avgScore} color="text-primary" />
      </div>

      {/* Alerts widget */}
      {athletesWithAlerts.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Atletas com Alertas ({athletesWithAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {athletesWithAlerts.slice(0, 5).map((a: any) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSelectAthlete(a.id)}
              >
                <span className="text-sm font-medium text-foreground">{a.athlete_name}</span>
                <CoachAlertsList alerts={athleteAlerts[a.id] || []} compact />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Phases widget */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(phaseGroups).filter(([, c]) => c > 0).map(([phase, count]) => (
          <Badge
            key={phase}
            variant="outline"
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => setFilterPhase(filterPhase === phase ? "all" : phase)}
          >
            {PHASE_LABELS[phase]}: {count}
          </Badge>
        ))}
      </div>

      {/* Filters */}
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
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="evolving">Evoluindo</SelectItem>
            <SelectItem value="stagnant">Estagnado</SelectItem>
            <SelectItem value="alert">Alerta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Athletes Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando atletas...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {athletes.length === 0 ? "Nenhum atleta cadastrado. Adicione seu primeiro atleta!" : "Nenhum resultado encontrado."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((athlete: any) => {
            const sc = STATUS_CONFIG[athlete.status] || STATUS_CONFIG.evolving;
            const ScIcon = sc.icon;
            const alerts = athleteAlerts[athlete.id] || [];
            return (
              <Card
                key={athlete.id}
                className="cursor-pointer hover:border-primary/50 transition-all group"
                onClick={() => onSelectAthlete(athlete.id)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors truncate">
                      {athlete.athlete_name}
                    </h3>
                    <Badge className={sc.color}>
                      <ScIcon className="h-3 w-3 mr-1" />
                      {sc.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                    <Badge variant="outline">{PHASE_LABELS[athlete.current_phase] || athlete.current_phase}</Badge>
                    <span>Score: <strong className="text-foreground">{athlete.prep_score ?? 0}</strong></span>
                    {alerts.length > 0 && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                        {alerts.length} alerta{alerts.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  {/* Score bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, athlete.prep_score || 0)}%`,
                        background: (athlete.prep_score || 0) >= 70 ? "#10b981" : (athlete.prep_score || 0) >= 40 ? "#f59e0b" : "#ef4444",
                      }}
                    />
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

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
