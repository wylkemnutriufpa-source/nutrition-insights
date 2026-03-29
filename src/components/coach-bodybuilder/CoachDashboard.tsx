import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Flame, Plus, Search, Users, TrendingUp, AlertTriangle, Trophy } from "lucide-react";
import { toast } from "sonner";

const PHASE_LABELS: Record<string, string> = {
  cutting: "Cutting",
  bulking: "Bulking",
  peak_week: "Peak Week",
  reverse: "Reverse Diet",
  maintenance: "Manutenção",
};

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
      // Fetch names
      const ids = (data || []).map((a: any) => a.patient_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });
      return (data || []).map((a: any) => ({ ...a, athlete_name: nameMap[a.patient_id] || "Atleta" }));
    },
  });

  // Available patients to add
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
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
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
      toast.success("Atleta adicionado com sucesso!");
    },
    onError: () => toast.error("Erro ao adicionar atleta."),
  });

  const filtered = athletes.filter((a: any) =>
    a.athlete_name?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: athletes.length,
    evolving: athletes.filter((a: any) => a.status === "evolving").length,
    stagnant: athletes.filter((a: any) => a.status === "stagnant").length,
    alert: athletes.filter((a: any) => a.status === "alert").length,
  };

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
            <p className="text-sm text-muted-foreground">Sistema de acompanhamento de atletas</p>
          </div>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Atleta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Atleta</DialogTitle>
            </DialogHeader>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total" value={stats.total} color="text-blue-400" />
        <StatCard icon={TrendingUp} label="Evoluindo" value={stats.evolving} color="text-emerald-400" />
        <StatCard icon={AlertTriangle} label="Estagnados" value={stats.stagnant} color="text-amber-400" />
        <StatCard icon={Trophy} label="Alerta" value={stats.alert} color="text-red-400" />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar atleta..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
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
            return (
              <Card
                key={athlete.id}
                className="cursor-pointer hover:border-primary/50 transition-all group"
                onClick={() => onSelectAthlete(athlete.id)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
                      {athlete.athlete_name}
                    </h3>
                    <Badge className={sc.color}>
                      <ScIcon className="h-3 w-3 mr-1" />
                      {sc.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="outline">{PHASE_LABELS[athlete.current_phase]}</Badge>
                    <span>Score: <strong className="text-foreground">{athlete.prep_score ?? 0}</strong>/100</span>
                  </div>
                  {/* Score bar */}
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, athlete.prep_score || 0)}%`,
                        background: (athlete.prep_score || 0) >= 70 ? "var(--color-emerald-500, #10b981)" : (athlete.prep_score || 0) >= 40 ? "var(--color-amber-500, #f59e0b)" : "var(--color-red-500, #ef4444)",
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
