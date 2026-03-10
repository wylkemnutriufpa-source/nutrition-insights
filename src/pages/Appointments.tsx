import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalIcon, Plus, Clock, User, ChevronLeft, ChevronRight, Video, MapPin, Phone, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  appointment_date: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  color: string | null;
  patient_id: string;
  nutritionist_id: string;
  patient_name?: string;
}

const typeMap: Record<string, { label: string; icon: any; color: string }> = {
  consultation: { label: "Consulta", icon: User, color: "#10b981" },
  follow_up: { label: "Retorno", icon: Phone, color: "#3b82f6" },
  online: { label: "Online", icon: Video, color: "#8b5cf6" },
  in_person: { label: "Presencial", icon: MapPin, color: "#f59e0b" },
};

const statusMap: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Agendada", cls: "bg-blue-500/10 text-blue-500" },
  confirmed: { label: "Confirmada", cls: "bg-emerald-500/10 text-emerald-500" },
  completed: { label: "Concluída", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelada", cls: "bg-destructive/10 text-destructive" },
};

export default function Appointments() {
  const { user, isNutritionist } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", patient_id: "", appointment_type: "consultation",
    date: "", time: "09:00", duration_minutes: "60", color: "#10b981",
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["apt-patients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: links } = await supabase.from("nutritionist_patients")
        .select("patient_id").eq("nutritionist_id", user.id).eq("status", "active");
      if (!links?.length) return [];
      const { data: profiles } = await supabase.from("profiles")
        .select("user_id, full_name").in("user_id", links.map(l => l.patient_id));
      return profiles || [];
    },
    enabled: !!user && isNutritionist,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", user?.id, currentMonth.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      const col = isNutritionist ? "nutritionist_id" : "patient_id";
      const { data } = await supabase.from("patient_appointments")
        .select("*").eq(col, user.id)
        .gte("appointment_date", start).lte("appointment_date", end)
        .order("appointment_date");

      if (!data) return [];

      // Enrich with patient names
      const patientIds = [...new Set(data.map(a => a.patient_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));

      return data.map(a => ({ ...a, patient_name: nameMap[a.patient_id] || "Paciente" }));
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const dateTime = new Date(`${form.date}T${form.time}`).toISOString();
      const { error } = await supabase.from("patient_appointments").insert({
        nutritionist_id: user.id,
        patient_id: form.patient_id,
        title: form.title || `Consulta - ${patients.find(p => p.user_id === form.patient_id)?.full_name || ""}`,
        description: form.description || null,
        appointment_date: dateTime,
        duration_minutes: Number(form.duration_minutes) || 60,
        appointment_type: form.appointment_type,
        color: form.color,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Consulta agendada!");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("patient_appointments").update({ status }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    toast.success("Status atualizado!");
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!user || !editingId) throw new Error("No user/id");
      const dateTime = new Date(`${form.date}T${form.time}`).toISOString();
      const { error } = await supabase.from("patient_appointments").update({
        title: form.title,
        description: form.description || null,
        appointment_date: dateTime,
        duration_minutes: Number(form.duration_minutes) || 60,
        appointment_type: form.appointment_type,
        color: form.color,
      }).eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Consulta atualizada!");
      setDialogOpen(false);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm("Excluir esta consulta?")) throw new Error("cancelled");
      const { error } = await supabase.from("patient_appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Consulta excluída!"); queryClient.invalidateQueries({ queryKey: ["appointments"] }); },
    onError: (e: any) => { if (e.message !== "cancelled") toast.error(e.message); },
  });

  const openEdit = (a: Appointment) => {
    setEditingId(a.id);
    const d = new Date(a.appointment_date);
    setForm({
      title: a.title,
      description: a.description || "",
      patient_id: a.patient_id,
      appointment_type: a.appointment_type,
      date: format(d, "yyyy-MM-dd"),
      time: format(d, "HH:mm"),
      duration_minutes: String(a.duration_minutes),
      color: a.color || "#10b981",
    });
    setDialogOpen(true);
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const dayAppointments = (date: Date) => appointments.filter(a => isSameDay(new Date(a.appointment_date), date));
  const selectedDayApps = selectedDate ? dayAppointments(selectedDate) : [];

  const openNewOnDate = (date: Date) => {
    setForm({ ...form, date: format(date, "yyyy-MM-dd"), patient_id: patients[0]?.user_id || "" });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <CalIcon className="w-6 h-6 text-primary" /> Agenda
            </h1>
            <p className="text-sm text-muted-foreground">
              {appointments.filter(a => a.status !== "cancelled" && a.status !== "completed").length} consultas pendentes este mês
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs">Hoje</Button>
            {isNutritionist && (
              <Button onClick={() => { setEditingId(null); setForm({ ...form, date: format(new Date(), "yyyy-MM-dd") }); setDialogOpen(true); }} className="gradient-primary gap-2">
                <Plus className="w-4 h-4" /> Nova Consulta
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="glass border-border lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-5 h-5" /></Button>
                <span className="font-display font-bold capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</span>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-5 h-5" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              {/* Padding for first day */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: days[0].getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map(day => {
                  const apps = dayAppointments(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative aspect-square rounded-lg flex flex-col items-center justify-start pt-1 cursor-pointer transition-all text-sm",
                        isToday(day) && "ring-2 ring-primary",
                        isSelected && "bg-primary/10",
                        "hover:bg-muted"
                      )}
                    >
                      <span className={cn("text-xs", isToday(day) && "font-bold text-primary")}>{format(day, "d")}</span>
                      {apps.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {apps.slice(0, 3).map(a => (
                            <div key={a.id} className="w-1.5 h-1.5 rounded-full" style={{ background: a.color || "#10b981" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Day detail */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-sm">
              {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
            </h3>

            {selectedDate && selectedDayApps.length === 0 && (
              <Card className="glass">
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma consulta neste dia.
                  {isNutritionist && (
                    <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={() => openNewOnDate(selectedDate)}>
                      <Plus className="w-3 h-3" /> Agendar
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedDayApps.map(a => {
              const type = typeMap[a.appointment_type] || typeMap.consultation;
              const status = statusMap[a.status] || statusMap.scheduled;
              const TypeIcon = type.icon;
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="glass border-border hover:border-primary/20 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${a.color || type.color}20` }}>
                          <TypeIcon className="w-5 h-5" style={{ color: a.color || type.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{a.title}</h4>
                          <p className="text-xs text-muted-foreground">{a.patient_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(a.appointment_date), "HH:mm")} • {a.duration_minutes}min
                            </span>
                            <Badge className={cn("text-[10px]", status.cls)}>{status.label}</Badge>
                          </div>
                          {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{a.description}</p>}
                        </div>
                        {isNutritionist && (
                          <div className="flex flex-col gap-1">
                            <button onClick={() => openEdit(a)} className="p-1 text-gray-400 hover:text-primary transition-colors rounded"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                            <button onClick={() => deleteMutation.mutate(a.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg></button>
                          </div>
                        )}
                      </div>
                      {isNutritionist && a.status !== "completed" && a.status !== "cancelled" && (
                        <div className="flex gap-1 mt-2">
                          {a.status === "scheduled" && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(a.id, "confirmed")}>Confirmar</Button>}
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(a.id, "completed")}>Concluir</Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 text-destructive" onClick={() => updateStatus(a.id, "cancelled")}>Cancelar</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* New/Edit appointment dialog */}
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingId(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">{editingId ? "Editar Consulta" : "Nova Consulta"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {!editingId && (
                <div>
                  <Label>Paciente</Label>
                  <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {patients.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Consulta de retorno" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Horário</Label><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label>
                  <Select value={form.appointment_type} onValueChange={v => setForm({ ...form, appointment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} /></div>
              </div>
              <div><Label>Descrição / Notas</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Observações sobre a consulta..." /></div>
              <div>
                <Label>Cor</Label>
                <div className="flex gap-2 mt-1">
                  {["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"].map(c => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })}
                      className={cn("w-7 h-7 rounded-full transition-all", form.color === c && "ring-2 ring-offset-2 ring-primary")}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <Button
                onClick={() => editingId ? editMutation.mutate() : createMutation.mutate()}
                className="w-full gradient-primary"
                disabled={(!editingId && !form.patient_id) || !form.date || createMutation.isPending || editMutation.isPending}
              >
                {(createMutation.isPending || editMutation.isPending) ? "Salvando..." : editingId ? "Salvar Alterações" : "Agendar Consulta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
