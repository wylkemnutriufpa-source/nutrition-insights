import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Textarea } from "@v1/components/ui/textarea";
import { Calendar } from "@v1/components/ui/calendar";
import { Badge } from "@v1/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@v1/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Switch } from "@v1/components/ui/switch";
import { Label } from "@v1/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@v1/components/ui/popover";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { toast } from "sonner";
import { format, isSameDay, startOfMonth, endOfMonth, parseISO, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@v1/lib/utils";
import {
  CalendarDays, Plus, Clock, CheckCircle2, Trash2, Edit2,
  Bell, DollarSign, MessageSquare, Stethoscope, Target,
  CalendarIcon, ChevronLeft, ChevronRight, Filter
} from "lucide-react";
import { useTranslation } from "react-i18next";

const EVENT_TYPES = [
  { value: "reminder", label: "Lembrete", icon: Bell, color: "hsl(var(--primary))" },
  { value: "appointment", label: "Consulta", icon: Stethoscope, color: "hsl(var(--accent))" },
  { value: "feedback", label: "Feedback", icon: MessageSquare, color: "hsl(var(--warning))" },
  { value: "payment", label: "Pagamento", icon: DollarSign, color: "hsl(var(--success))" },
  { value: "goal", label: "Meta", icon: Target, color: "hsl(var(--info))" },
  { value: "other", label: "Outro", icon: CalendarDays, color: "hsl(var(--muted-foreground))" },
];

interface PlannerEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  end_date: string | null;
  all_day: boolean;
  color: string | null;
  created_by: string;
  target_user_id: string | null;
  patient_id: string | null;
  nutritionist_id: string | null;
  is_completed: boolean;
  metadata: any;
  created_at: string;
}

interface PatientOption {
  id: string;
  name: string;
}

export default function Planner() {
  const { user, isNutritionist, isAdmin } = useAuth();
  const { t } = useTranslation();
  const isProfessional = isNutritionist || isAdmin;

  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [patients, setPatients] = useState<PatientOption[]>([]);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "reminder",
    event_date: "",
    event_time: "09:00",
    all_day: false,
    patient_id: "",
  });

  useEffect(() => {
    if (user) {
      fetchEvents();
      if (isProfessional) fetchPatients();
    }
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("planner-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "planner_events" }, () => {
        fetchEvents();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function fetchEvents() {
    const { data, error } = await supabase
      .from("planner_events" as any)
      .select("*")
      .order("event_date", { ascending: true });
    if (!error && data) setEvents(data as any);
    setLoading(false);
  }

  async function fetchPatients() {
    if (!user) return;
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("patient_id")
      .eq("nutritionist_id", user.id)
      .eq("status", "active");
    if (data && data.length > 0) {
      const ids = data.map((d) => d.patient_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      if (profiles) {
        setPatients(profiles.map((p) => ({ id: p.user_id, name: p.full_name || "Paciente" })));
      }
    }
  }

  function openNewEvent(date?: Date) {
    const d = date || selectedDate;
    setEditingEvent(null);
    setForm({
      title: "",
      description: "",
      event_type: "reminder",
      event_date: format(d, "yyyy-MM-dd"),
      event_time: "09:00",
      all_day: false,
      patient_id: "",
    });
    setDialogOpen(true);
  }

  function openEditEvent(ev: PlannerEvent) {
    setEditingEvent(ev);
    const d = parseISO(ev.event_date);
    setForm({
      title: ev.title,
      description: ev.description || "",
      event_type: ev.event_type,
      event_date: format(d, "yyyy-MM-dd"),
      event_time: ev.all_day ? "09:00" : format(d, "HH:mm"),
      all_day: ev.all_day,
      patient_id: ev.patient_id || "",
    });
    setDialogOpen(true);
  }

  async function saveEvent() {
    if (!form.title.trim() || !form.event_date) {
      toast.error("Preencha o título e a data");
      return;
    }
    if (!user) return;

    const eventDate = form.all_day
      ? new Date(`${form.event_date}T00:00:00`)
      : new Date(`${form.event_date}T${form.event_time}:00`);

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_type: form.event_type,
      event_date: eventDate.toISOString(),
      all_day: form.all_day,
      color: EVENT_TYPES.find((t) => t.value === form.event_type)?.color || null,
      created_by: user.id,
      target_user_id: form.patient_id || null,
      patient_id: form.patient_id || null,
      nutritionist_id: isProfessional ? user.id : null,
    };

    if (editingEvent) {
      const { error } = await supabase
        .from("planner_events" as any)
        .update(payload)
        .eq("id", editingEvent.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Evento atualizado!");
    } else {
      const { error } = await supabase
        .from("planner_events" as any)
        .insert(payload);
      if (error) { toast.error("Erro ao criar evento"); return; }
      toast.success("Evento criado!");

      // If professional created event for a patient, send notification
      if (isProfessional && form.patient_id) {
        await supabase.from("notifications").insert({
          user_id: form.patient_id,
          title: `📅 Novo evento: ${form.title}`,
          message: `Seu nutricionista adicionou "${form.title}" ao seu planejador para ${format(eventDate, "dd/MM/yyyy")}`,
          type: "planner",
        } as any);
      }
    }

    setDialogOpen(false);
    fetchEvents();
  }

  async function deleteEvent(id: string) {
    const { error } = await supabase.from("planner_events" as any).delete().eq("id", id);
    if (!error) { toast.success("Evento removido"); fetchEvents(); }
  }

  async function toggleComplete(ev: PlannerEvent) {
    const { error } = await supabase
      .from("planner_events" as any)
      .update({ is_completed: !ev.is_completed })
      .eq("id", ev.id);
    if (!error) fetchEvents();
  }

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (filterType !== "all") filtered = filtered.filter((e) => e.event_type === filterType);
    return filtered;
  }, [events, filterType]);

  const eventsForSelectedDate = useMemo(() => {
    return filteredEvents.filter((e) => isSameDay(parseISO(e.event_date), selectedDate));
  }, [filteredEvents, selectedDate]);

  const eventDates = useMemo(() => {
    return events.map((e) => parseISO(e.event_date));
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return filteredEvents
      .filter((e) => parseISO(e.event_date) >= now && !e.is_completed)
      .slice(0, 5);
  }, [filteredEvents]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = events.filter((e) => {
      const d = parseISO(e.event_date);
      return d >= startOfMonth(now) && d <= endOfMonth(now);
    });
    return {
      total: thisMonth.length,
      completed: thisMonth.filter((e) => e.is_completed).length,
      pending: thisMonth.filter((e) => !e.is_completed && parseISO(e.event_date) >= now).length,
      overdue: thisMonth.filter((e) => !e.is_completed && parseISO(e.event_date) < now).length,
    };
  }, [events]);

  function getEventIcon(type: string) {
    const et = EVENT_TYPES.find((t) => t.value === type);
    return et ? et.icon : CalendarDays;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              📅 Meu Planejador
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize compromissos, lembretes e metas em um só lugar
            </p>
          </div>
          <Button onClick={() => openNewEvent()} className="gradient-primary text-primary-foreground shadow-glow">
            <Plus className="w-4 h-4 mr-2" /> Novo Evento
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Este mês", value: stats.total, icon: CalendarDays, color: "text-primary" },
            { label: "Concluídos", value: stats.completed, icon: CheckCircle2, color: "text-success" },
            { label: "Pendentes", value: stats.pending, icon: Clock, color: "text-warning" },
            { label: "Atrasados", value: stats.overdue, icon: Bell, color: "text-destructive" },
          ].map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-muted/50 ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" /> Calendário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                locale={ptBR}
                className="p-3 pointer-events-auto"
                modifiers={{ hasEvent: eventDates }}
                modifiersStyles={{
                  hasEvent: {
                    fontWeight: "bold",
                    textDecoration: "underline",
                    textDecorationColor: "hsl(var(--primary))",
                    textUnderlineOffset: "4px",
                  },
                }}
              />
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => openNewEvent(selectedDate)}
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar em {format(selectedDate, "dd/MM")}
              </Button>
            </CardContent>
          </Card>

          {/* Events for selected date */}
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <Filter className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {eventsForSelectedDate.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum evento neste dia</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => openNewEvent(selectedDate)}>
                    <Plus className="w-3 h-3 mr-1" /> Criar evento
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    <AnimatePresence>
                      {eventsForSelectedDate.map((ev) => {
                        const Icon = getEventIcon(ev.event_type);
                        const typeInfo = EVENT_TYPES.find((t) => t.value === ev.event_type);
                        return (
                          <motion.div
                            key={ev.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-xl border transition-all group",
                              ev.is_completed
                                ? "bg-muted/30 border-border/30 opacity-60"
                                : "bg-card border-border/50 hover:border-primary/30 hover:shadow-sm"
                            )}
                          >
                            <button
                              onClick={() => toggleComplete(ev)}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                ev.is_completed ? "bg-success/20 text-success" : "bg-muted/50 hover:bg-primary/20"
                              )}
                            >
                              {ev.is_completed ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Icon className="w-4 h-4" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-medium", ev.is_completed && "line-through")}>
                                {ev.title}
                              </p>
                              {ev.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ev.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {typeInfo?.label}
                                </Badge>
                                {!ev.all_day && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(parseISO(ev.event_date), "HH:mm")}
                                  </span>
                                )}
                                {ev.created_by !== user?.id && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    Do nutricionista
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {ev.created_by === user?.id && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditEvent(ev)}>
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteEvent(ev.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" /> Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {upcomingEvents.map((ev) => {
                  const Icon = getEventIcon(ev.event_type);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => { setSelectedDate(parseISO(ev.event_date)); }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 bg-card hover:shadow-sm transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(ev.event_date), "dd/MM · HH:mm")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Consulta retorno, Lembrete pagamento..."
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes do evento..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <t.icon className="w-3 h-3" /> {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.all_day}
                  onCheckedChange={(v) => setForm({ ...form, all_day: v })}
                />
                <Label className="text-sm">Dia inteiro</Label>
              </div>
              {!form.all_day && (
                <div className="flex-1">
                  <Input
                    type="time"
                    value={form.event_time}
                    onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                  />
                </div>
              )}
            </div>
            {isProfessional && patients.length > 0 && (
              <div>
                <Label>Paciente (opcional)</Label>
                <Select value={form.patient_id || "none"} onValueChange={(v) => setForm({ ...form, patient_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um paciente..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (pessoal)</SelectItem>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  O paciente receberá uma notificação e verá o evento no planejador dele
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveEvent} className="gradient-primary text-primary-foreground">
              {editingEvent ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
