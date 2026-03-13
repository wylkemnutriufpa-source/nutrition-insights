import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Target, Zap, Clock, CheckCircle2, X } from "lucide-react";

const MISSION_TYPES = [
  { value: "hydration", label: "💧 Hidratação", icon: "💧" },
  { value: "consistency", label: "✅ Constância", icon: "✅" },
  { value: "quality", label: "🥗 Qualidade Alimentar", icon: "🥗" },
  { value: "tracking", label: "📝 Registro Completo", icon: "📝" },
  { value: "streak", label: "🔥 Streak Semanal", icon: "🔥" },
];

interface MissionCreatorProps {
  patientId: string;
  patientName?: string;
}

export function MissionCreator({ patientId, patientName }: MissionCreatorProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    mission_type: "consistency",
    target_value: 1,
    xp_reward: 50,
    duration_hours: 24,
  });

  // Fetch active missions for this patient
  const { data: missions = [] } = useQuery({
    queryKey: ["patient-missions", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_missions")
        .select("*")
        .eq("patient_id", patientId)
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const createMission = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + form.duration_hours);
      const missionType = MISSION_TYPES.find((t) => t.value === form.mission_type);

      const { error } = await supabase.from("patient_missions").insert({
        patient_id: patientId,
        nutritionist_id: user!.id,
        title: form.title,
        description: form.description,
        mission_type: form.mission_type,
        icon: missionType?.icon || "🎯",
        target_value: form.target_value,
        current_value: 0,
        xp_reward: form.xp_reward,
        duration_hours: form.duration_hours,
        status: "active",
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Missão criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["patient-missions", patientId] });
      setOpen(false);
      setForm({ title: "", description: "", mission_type: "consistency", target_value: 1, xp_reward: 50, duration_hours: 24 });
    },
    onError: () => toast.error("Erro ao criar missão"),
  });

  const cancelMission = useMutation({
    mutationFn: async (missionId: string) => {
      const { error } = await supabase
        .from("patient_missions")
        .update({ status: "cancelled" })
        .eq("id", missionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Missão cancelada");
      queryClient.invalidateQueries({ queryKey: ["patient-missions", patientId] });
    },
  });

  const activeMissions = missions.filter((m) => m.status === "active");
  const completedMissions = missions.filter((m) => m.status === "completed");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Missões {patientName ? `de ${patientName}` : ""}
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-3 w-3" /> Nova Missão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Missão</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.mission_type} onValueChange={(v) => setForm((p) => ({ ...p, mission_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MISSION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Beba 8 copos de água" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Detalhes da missão..." />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Meta</Label>
                    <Input type="number" min={1} value={form.target_value} onChange={(e) => setForm((p) => ({ ...p, target_value: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>XP</Label>
                    <Input type="number" min={5} value={form.xp_reward} onChange={(e) => setForm((p) => ({ ...p, xp_reward: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>Duração (h)</Label>
                    <Input type="number" min={1} value={form.duration_hours} onChange={(e) => setForm((p) => ({ ...p, duration_hours: Number(e.target.value) }))} />
                  </div>
                </div>
                <Button className="w-full" onClick={() => createMission.mutate()} disabled={!form.title || createMission.isPending}>
                  {createMission.isPending ? "Criando..." : "Criar Missão"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {activeMissions.length === 0 && completedMissions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma missão criada</p>
        )}
        {activeMissions.map((m) => {
          const progress = m.target_value > 0 ? Math.min(100, ((m.current_value ?? 0) / m.target_value) * 100) : 0;
          return (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
              <span className="text-xl">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.title}</p>
                <Progress value={progress} className="h-1 mt-1" />
              </div>
              <Badge variant="secondary" className="text-xs gap-0.5 flex-shrink-0">
                <Zap className="h-3 w-3" />{m.xp_reward}
              </Badge>
              <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={() => cancelMission.mutate(m.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
        {completedMissions.slice(0, 3).map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30 opacity-60">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <p className="text-sm truncate">{m.title}</p>
            <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">Concluída</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
