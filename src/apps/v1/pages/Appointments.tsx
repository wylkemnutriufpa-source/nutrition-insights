import { useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter, getTenantIdForInsert } from "@v1/lib/tenantQueryHelpers";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Textarea } from "@v1/components/ui/textarea";
import { Badge } from "@v1/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@v1/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@v1/components/ui/popover";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@v1/lib/utils";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, isPast, isFuture, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalIcon, Plus, Clock, User, ChevronLeft, ChevronRight,
  Video, MapPin, Phone, Bell, CheckCircle2, XCircle, CalendarDays,
  MessageSquare, ArrowRight, Sparkles, AlertCircle
} from "lucide-react";
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
  nutritionist_name?: string;
}

const typeMap: Record<string, { label: string; icon: any; color: string }> = {
  consultation: { label: "Consulta", icon: User, color: "hsl(var(--primary))" },
  follow_up: { label: "Retorno", icon: Phone, color: "hsl(160 84% 39%)" },
  online: { label: "Online", icon: Video, color: "hsl(250 60% 60%)" },
  in_person: { label: "Presencial", icon: MapPin, color: "hsl(40 96% 53%)" },
};

const statusConfig: Record<string, { label: string; cls: string; icon: any }> = {
  scheduled: { label: "Agendada", cls: "bg-primary/10 text-primary border-primary/20", icon: Clock },
  confirmed: { label: "Confirmada", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  completed: { label: "Concluída", cls: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
  cancelled: { label: "Cancelada", cls: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

export default function Appointments() {
  const { user, isNutritionist } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestDialog, setRequestDialog] = useState(false);
  const [notesDialog, setNotesDialog] = useState<{ id: string; notes: string } | null>(null);
  const [requestForm, setRequestForm] = useState({ preferred_date: "", preferred_time: "09:00", type: "consultation", message: "" });
  const [form, setForm] = useState({
    title: "", description: "", patient_id: "", appointment_type: "consultation",
    date: "", time: "09:00", duration_minutes: "60", color: "",
  });

  // Fetch patients for nutritionist
  const { data: patients = [] } = useQuery({
    queryKey: ["apt-patients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: links } = await withTenantFilter(supabase.from("nutritionist_patients")
        .select("patient_id").eq("nutritionist_id", user.id).eq("status", "active"), tenantId);
      if (!links?.length) return [];
      const { data: profiles } = await withTenantFilter(supabase.from("profiles")
        .select("user_id, full_name").in("user_id", links.map(l => l.patient_id)), tenantId);
      return profiles || [];
    },
    enabled: !!user && isNutritionist,
  });

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", user?.id, currentMonth.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();
      const col = isNutritionist ? "nutritionist_id" : "patient_id";
      const { data } = await withTenantFilter(supabase.from("patient_appointments")
        .select("*").eq(col, user.id), tenantId)
        .gte("appointment_date", start).lte("appointment_date", end)
        .order("appointment_date");
      if (!data) return [];

      const ids = [...new Set(data.map(a => isNutritionist ? a.patient_id : a.nutritionist_id))];
      const { data: profiles } = await withTenantFilter(supabase.from("profiles").select("user_id, full_name").in("user_id", ids), tenantId);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));

      return data.map(a => ({
        ...a,
        patient_name: nameMap[a.patient_id] || "Paciente",
        nutritionist_name: nameMap[a.nutritionist_id] || "Profissional",
      }));
    },
    enabled: !!user,
  });

  // Create appointment (nutritionist)
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const dateTime = new Date(`${form.date}T${form.time}`).toISOString();
      const { data: apt, error } = await supabase.from("patient_appointments").insert({
        nutritionist_id: user.id,
        patient_id: form.patient_id,
        title: form.title || `Consulta - ${patients.find(p => p.user_id === form.patient_id)?.full_name || ""}`,
        description: form.description || null,
        appointment_date: dateTime,
        duration_minutes: Number(form.duration_minutes) || 60,
        appointment_type: form.appointment_type,
        color: form.color || null,
        ...getTenantIdForInsert(tenantId),
      }).select("id").single();
      if (error) throw error;

      if (apt?.id) {
        await supabase.from("appointment_reminders").insert([
          { appointment_id: apt.id, reminder_type: "before_24h" },
          { appointment_id: apt.id, reminder_type: "before_1h" },
        ]);
      }

      await supabase.from("notifications").insert({
        user_id: form.patient_id,
        title: "Nova consulta agendada",
        message: `Consulta agendada para ${new Date(dateTime).toLocaleDateString("pt-BR")} às ${form.time}`,
        type: "appointment",
        entity_type: "appointment",
        entity_id: apt?.id,
        target_route: "/appointments",
      } as any);
    },
    onSuccess: () => {
      toast.success("Consulta agendada!");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Patient request appointment
  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      // Get linked nutritionist
      const { data: link } = await supabase.from("nutritionist_patients")
        .select("nutritionist_id").eq("patient_id", user.id).eq("status", "active").limit(1).single();
      if (!link) throw new Error("Nenhum profissional vinculado");

      await supabase.from("notifications").insert({
        user_id: link.nutritionist_id,
        title: "Solicitação de consulta",
        message: `Paciente solicitou consulta para ${new Date(requestForm.preferred_date).toLocaleDateString("pt-BR")} às ${requestForm.preferred_time}. ${requestForm.message ? `Obs: ${requestForm.message}` : ""}`,
        type: "appointment_request",
        entity_type: "appointment",
        target_route: "/appointments",
      } as any);
    },
    onSuccess: () => {
      toast.success("Solicitação enviada ao seu profissional!");
      setRequestDialog(false);
      setRequestForm({ preferred_date: "", preferred_time: "09:00", type: "consultation", message: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("patient_appointments").update({ status }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    toast.success("Status atualizado!");
    if (status === "completed") {
      setNotesDialog({ id, notes: "" });
    }
  };

  const saveNotes = async () => {
    if (!notesDialog) return;
    await supabase.from("patient_appointments").update({ description: notesDialog.notes }).eq("id", notesDialog.id);
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    setNotesDialog(null);
    toast.success("Notas salvas!");
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const dayAppointments = (date: Date) => appointments.filter(a => isSameDay(new Date(a.appointment_date), date));
  const selectedDayApps = selectedDate ? dayAppointments(selectedDate) : [];

  const upcomingApps = appointments
    .filter(a => a.status !== "cancelled" && a.status !== "completed" && isFuture(new Date(a.appointment_date)))
    .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

  const nextApp = upcomingApps[0];
  const daysUntilNext = nextApp ? differenceInDays(new Date(nextApp.appointment_date), new Date()) : null;

  const openNewOnDate = (date: Date) => {
    setForm({ ...form, date: format(date, "yyyy-MM-dd"), patient_id: patients[0]?.user_id || "" });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-1 md:px-0 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
              <CalIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Agenda
            </h1>
            <p className="text-sm text-muted-foreground">
              {upcomingApps.length} consulta{upcomingApps.length !== 1 ? "s" : ""} pendente{upcomingApps.length !== 1 ? "s" : ""}
            </p>
          </div>
          {isNutritionist ? (
            <Button onClick={() => { setForm({ ...form, date: format(new Date(), "yyyy-MM-dd") }); setDialogOpen(true); }} className="gradient-primary gap-2">
              <Plus className="w-4 h-4" /> Nova Consulta
            </Button>
          ) : (
            <Button onClick={() => { setRequestForm({ ...requestForm, preferred_date: format(addDays(new Date(), 1), "yyyy-MM-dd") }); setRequestDialog(true); }} className="gradient-primary gap-2">
              <MessageSquare className="w-4 h-4" /> Solicitar Consulta
            </Button>
          )}
        </div>

        {/* Next appointment hero card */}
        {nextApp && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-premium border-primary/20 overflow-hidden">
              <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-medium text-primary uppercase tracking-wide">Próxima Consulta</p>
                    <h3 className="font-display font-bold text-base sm:text-lg truncate">{nextApp.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(nextApp.appointment_date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      {daysUntilNext !== null && daysUntilNext <= 7 && (
                        <span className="ml-2 text-primary font-medium">
                          {daysUntilNext === 0 ? "Hoje!" : daysUntilNext === 1 ? "Amanhã" : `em ${daysUntilNext} dias`}
                        </span>
                      )}
                    </p>
                  </div>
                  {nextApp.status === "scheduled" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(nextApp.id, "confirmed")}
                      className="gradient-primary gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isNutritionist ? "Confirmar" : "Confirmar Presença"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Calendar Grid */}
          <Card className="glass border-border lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="font-display font-bold capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                  <div key={i} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {Array.from({ length: days[0].getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map(day => {
                  const apps = dayAppointments(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const past = isPast(day) && !isToday(day);
                  return (
                    <motion.div
                      key={day.toISOString()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all text-sm",
                        isToday(day) && "ring-2 ring-primary bg-primary/5",
                        isSelected && !isToday(day) && "bg-accent",
                        past && "opacity-50",
                        !isSelected && !isToday(day) && "hover:bg-muted"
                      )}
                    >
                        <span className={cn("text-[11px] sm:text-xs font-medium", isToday(day) && "text-primary font-bold")}>
                        {format(day, "d")}
                      </span>
                      {apps.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {apps.slice(0, 3).map((a, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                          ))}
                          {apps.length > 3 && <span className="text-[8px] text-muted-foreground">+{apps.length - 3}</span>}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Day Detail Panel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">
                {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
              </h3>
              {selectedDate && isNutritionist && (
                <Button size="sm" variant="ghost" onClick={() => openNewOnDate(selectedDate)} className="gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Agendar
                </Button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {selectedDate && selectedDayApps.length === 0 && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Card className="glass border-dashed border-border">
                    <CardContent className="py-8 text-center">
                      <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground mb-3">Nenhuma consulta neste dia</p>
                      {isNutritionist ? (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openNewOnDate(selectedDate)}>
                          <Plus className="w-3 h-3" /> Agendar Consulta
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                          setRequestForm({ ...requestForm, preferred_date: format(selectedDate, "yyyy-MM-dd") });
                          setRequestDialog(true);
                        }}>
                          <MessageSquare className="w-3 h-3" /> Solicitar neste dia
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {selectedDayApps.map((a, idx) => {
                const type = typeMap[a.appointment_type] || typeMap.consultation;
                const status = statusConfig[a.status] || statusConfig.scheduled;
                const TypeIcon = type.icon;
                const StatusIcon = status.icon;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="glass border-border hover:border-primary/20 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
                            <TypeIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{a.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {isNutritionist ? a.patient_name : a.nutritionist_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(a.appointment_date), "HH:mm")} • {a.duration_minutes}min
                              </span>
                              <Badge variant="outline" className={cn("text-[10px] gap-1", status.cls)}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </Badge>
                            </div>
                            {a.description && (
                              <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded-lg p-2">{a.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {a.status !== "completed" && a.status !== "cancelled" && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                            {a.status === "scheduled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 gap-1 flex-1"
                                onClick={() => updateStatus(a.id, "confirmed")}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                {isNutritionist ? "Confirmar" : "Confirmar Presença"}
                              </Button>
                            )}
                            {isNutritionist && (
                              <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => updateStatus(a.id, "completed")}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-8 gap-1 text-destructive hover:text-destructive"
                              onClick={() => updateStatus(a.id, "cancelled")}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Cancelar
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Upcoming list for patients */}
            {!isNutritionist && upcomingApps.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Próximas Consultas</h4>
                {upcomingApps.slice(0, 5).map(a => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded-lg px-2 transition-colors"
                    onClick={() => {
                      setCurrentMonth(new Date(a.appointment_date));
                      setSelectedDate(new Date(a.appointment_date));
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.appointment_date), "dd/MM 'às' HH:mm")}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* === NUTRITIONIST: New Appointment Dialog === */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Nova Consulta</DialogTitle>
              <DialogDescription>Preencha os dados para agendar uma nova consulta.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Paciente</Label>
                <Select value={form.patient_id || "none"} onValueChange={v => setForm({ ...form, patient_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um paciente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Selecione...</SelectItem>
                    {patients.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Consulta de retorno" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Horário</Label><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.appointment_type} onValueChange={v => setForm({ ...form, appointment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} /></div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Observações..." />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                className="w-full gradient-primary"
                disabled={!form.patient_id || !form.date || createMutation.isPending}
              >
                {createMutation.isPending ? "Agendando..." : "Agendar Consulta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* === PATIENT: Request Appointment Dialog === */}
        <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Solicitar Consulta
              </DialogTitle>
              <DialogDescription>Seu profissional receberá sua solicitação e agendará a consulta.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-primary/5 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Indique sua data e horário preferidos. Seu profissional confirmará a disponibilidade.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data preferida</Label><Input type="date" value={requestForm.preferred_date} onChange={e => setRequestForm({ ...requestForm, preferred_date: e.target.value })} /></div>
                <div><Label>Horário preferido</Label><Input type="time" value={requestForm.preferred_time} onChange={e => setRequestForm({ ...requestForm, preferred_time: e.target.value })} /></div>
              </div>
              <div>
                <Label>Tipo de consulta</Label>
                <Select value={requestForm.type} onValueChange={v => setRequestForm({ ...requestForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observação (opcional)</Label>
                <Textarea
                  value={requestForm.message}
                  onChange={e => setRequestForm({ ...requestForm, message: e.target.value })}
                  rows={2}
                  placeholder="Ex: Preciso discutir mudanças no plano..."
                />
              </div>
              <Button
                onClick={() => requestMutation.mutate()}
                className="w-full gradient-primary gap-2"
                disabled={!requestForm.preferred_date || requestMutation.isPending}
              >
                {requestMutation.isPending ? "Enviando..." : (
                  <><MessageSquare className="w-4 h-4" /> Enviar Solicitação</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Post-consultation notes dialog */}
        <Dialog open={!!notesDialog} onOpenChange={(o) => !o && setNotesDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Notas Pós-Consulta</DialogTitle>
              <DialogDescription>Registre suas observações sobre a consulta concluída.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                value={notesDialog?.notes || ""}
                onChange={(e) => setNotesDialog(prev => prev ? { ...prev, notes: e.target.value } : null)}
                rows={4}
                placeholder="Ex: Paciente relatou melhora na disposição..."
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setNotesDialog(null)}>Pular</Button>
                <Button className="flex-1 gradient-primary" onClick={saveNotes}>Salvar Notas</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
