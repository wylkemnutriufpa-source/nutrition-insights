import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2, Play, Pause, Calendar } from "lucide-react";

interface Schedule {
  id: string;
  meal_plan_id: string;
  activate_at: string;
  deactivate_at: string | null;
  criteria: Record<string, any>;
  status: string;
  created_at: string;
}

interface PlanSchedulerProps {
  mealPlanId: string;
  planTitle: string;
}

export default function PlanScheduler({ mealPlanId, planTitle }: PlanSchedulerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    activate_at: "",
    deactivate_at: "",
    auto_deactivate_previous: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from("plan_schedules")
      .select("*")
      .eq("meal_plan_id", mealPlanId)
      .order("activate_at", { ascending: true });
    if (data) setSchedules(data as Schedule[]);
  };

  useEffect(() => {
    fetchSchedules();
  }, [mealPlanId]);

  const handleCreate = async () => {
    if (!form.activate_at) return;
    setSubmitting(true);

    const { error } = await supabase.from("plan_schedules").insert({
      meal_plan_id: mealPlanId,
      activate_at: form.activate_at,
      deactivate_at: form.deactivate_at || null,
      criteria: { auto_deactivate_previous: form.auto_deactivate_previous },
      status: "scheduled",
    });

    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Agendamento criado!");
      setOpen(false);
      setForm({ activate_at: "", deactivate_at: "", auto_deactivate_previous: true });
      fetchSchedules();
    }
    setSubmitting(false);
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from("plan_schedules").delete().eq("id", id);
    fetchSchedules();
    toast.success("Agendamento removido");
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "scheduled" ? "paused" : "scheduled";
    await supabase.from("plan_schedules").update({ status: newStatus }).eq("id", id);
    fetchSchedules();
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-primary/10 text-primary",
    paused: "bg-muted text-muted-foreground",
    activated: "bg-accent/10 text-accent",
    expired: "bg-destructive/10 text-destructive",
  };

  const statusLabels: Record<string, string> = {
    scheduled: "Agendado",
    paused: "Pausado",
    activated: "Ativado",
    expired: "Expirado",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">Programador de Planos</h3>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> Agendar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Agendar Ativação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Plano: <strong>{planTitle}</strong>
              </p>
              <div>
                <Label>Data de ativação</Label>
                <Input
                  type="date"
                  value={form.activate_at}
                  onChange={(e) => setForm({ ...form, activate_at: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Data de desativação (opcional)</Label>
                <Input
                  type="date"
                  value={form.deactivate_at}
                  onChange={(e) => setForm({ ...form, deactivate_at: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.auto_deactivate_previous}
                  onChange={(e) => setForm({ ...form, auto_deactivate_previous: e.target.checked })}
                  className="rounded border-border"
                />
                <span className="text-sm">Desativar plano anterior automaticamente</span>
              </label>
              <Button
                onClick={handleCreate}
                disabled={submitting || !form.activate_at}
                className="w-full gradient-primary"
              >
                {submitting ? "Criando..." : "Criar Agendamento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {schedules.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center">
          <CalendarClock className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum agendamento. Programe ativações automáticas.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4 flex items-center gap-3"
            >
              <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {new Date(s.activate_at + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                  {s.deactivate_at && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(s.deactivate_at + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    </>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${statusColors[s.status] || ""}`}>
                  {statusLabels[s.status] || s.status}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleStatus(s.id, s.status)}
                >
                  {s.status === "scheduled" ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteSchedule(s.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
