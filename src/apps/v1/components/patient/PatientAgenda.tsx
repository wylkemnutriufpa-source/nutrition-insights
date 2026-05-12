import { useEffect, useState, useCallback } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Calendar } from "@v1/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Textarea } from "@v1/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@v1/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@v1/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Calendar as CalendarIcon, Clock, Trash2, Pencil,
  Stethoscope, Bell, ClipboardCheck, MessageSquare
} from "lucide-react";

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  appointment_type: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  color: string;
}

interface Props {
  patientId: string;
  readOnly?: boolean;
}

const typeOptions = [
  { value: "consultation", label: "Consulta", icon: Stethoscope, color: "#10b981" },
  { value: "evaluation", label: "Avaliação", icon: ClipboardCheck, color: "#6366f1" },
  { value: "reminder", label: "Lembrete", icon: Bell, color: "#f59e0b" },
  { value: "follow_up", label: "Retorno", icon: MessageSquare, color: "#3b82f6" },
];

const statusOptions = [
  { value: "scheduled", label: "Agendado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Realizado" },
  { value: "cancelled", label: "Cancelado" },
];

const emptyForm = {
  title: "",
  description: "",
  appointment_type: "consultation",
  appointment_date: "",
  appointment_time: "09:00",
  duration_minutes: "60",
  status: "scheduled",
  color: "#10b981",
};

export default function PatientAgenda({ patientId, readOnly = false }: Props) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    if (!patientId) return;
    const { data } = await supabase
      .from("patient_appointments")
      .select("*")
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: true });
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const openNew = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      appointment_date: format(selectedDate, "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  };

  const openEdit = (apt: Appointment) => {
    const d = new Date(apt.appointment_date);
    setEditing(apt);
    setForm({
      title: apt.title,
      description: apt.description || "",
      appointment_type: apt.appointment_type,
      appointment_date: format(d, "yyyy-MM-dd"),
      appointment_time: format(d, "HH:mm"),
      duration_minutes: String(apt.duration_minutes),
      status: apt.status,
      color: apt.color,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const dateTime = `${form.appointment_date}T${form.appointment_time}:00`;
    const payload = {
      patient_id: patientId,
      nutritionist_id: user.id,
      title: form.title,
      description: form.description || null,
      appointment_type: form.appointment_type,
      appointment_date: dateTime,
      duration_minutes: Number(form.duration_minutes),
      status: form.status,
      color: typeOptions.find(t => t.value === form.appointment_type)?.color || form.color,
    };

    if (editing) {
      const { error } = await supabase
        .from("patient_appointments")
        .update(payload)
        .eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Evento atualizado!");
    } else {
      const { error } = await supabase
        .from("patient_appointments")
        .insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Evento criado!");
    }

    setDialogOpen(false);
    fetchAppointments();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este evento?")) return;
    const { error } = await supabase.from("patient_appointments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Evento removido!");
      fetchAppointments();
    }
  };

  // Days with appointments for calendar dots
  const daysWithEvents = appointments.map(a => {
    const d = new Date(a.appointment_date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });

  // Filter appointments for selected date
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayAppointments = appointments.filter(a =>
    a.appointment_date.startsWith(selectedDateStr)
  );

  // Upcoming (next 7 days)
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);
  const upcoming = appointments.filter(a => {
    const d = new Date(a.appointment_date);
    return d >= now && d <= weekFromNow && a.status !== "cancelled";
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar */}
      <Card className="glass border-border lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" /> Calendário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            className="p-3 pointer-events-auto"
            locale={ptBR}
            modifiers={{ hasEvent: daysWithEvents }}
            modifiersClassNames={{ hasEvent: "bg-primary/20 font-bold text-primary" }}
          />
          {!readOnly && (
            <Button onClick={openNew} className="w-full mt-3 gradient-primary gap-2">
              <Plus className="w-4 h-4" /> Novo Evento
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Day detail + upcoming */}
      <div className="lg:col-span-2 space-y-4">
        {/* Selected day */}
        <Card className="glass border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento neste dia.</p>
            ) : (
              <div className="space-y-2">
                {dayAppointments.map(apt => {
                  const typeConf = typeOptions.find(t => t.value === apt.appointment_type);
                  const Icon = typeConf?.icon || CalendarIcon;
                  return (
                    <div
                      key={apt.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${apt.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: apt.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{apt.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {format(new Date(apt.appointment_date), "HH:mm")} • {apt.duration_minutes}min •
                          <span className={cn(
                            "ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                            apt.status === "scheduled" && "bg-warning/10 text-warning",
                            apt.status === "confirmed" && "bg-info/10 text-info",
                            apt.status === "completed" && "bg-success/10 text-success",
                            apt.status === "cancelled" && "bg-destructive/10 text-destructive",
                          )}>
                            {statusOptions.find(s => s.value === apt.status)?.label}
                          </span>
                        </p>
                        {apt.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{apt.description}</p>
                        )}
                      </div>
                      {!readOnly && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(apt)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(apt.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card className="glass border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display text-muted-foreground">Próximos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">Sem eventos próximos.</p>
            ) : (
              <div className="space-y-1.5">
                {upcoming.map(apt => (
                  <div key={apt.id} className="flex items-center gap-2 text-sm p-2 rounded bg-card border border-border">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: apt.color }} />
                    <span className="font-medium truncate flex-1">{apt.title}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(apt.appointment_date), "dd/MM HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Editar Evento" : "Novo Evento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Ex: Consulta de retorno" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.appointment_type} onValueChange={v => setForm({ ...form, appointment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.appointment_date} onChange={e => setForm({ ...form, appointment_date: e.target.value })} required />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={form.appointment_time} onChange={e => setForm({ ...form, appointment_time: e.target.value })} required />
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} min="15" step="15" />
              </div>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Observações..." />
            </div>
            <Button type="submit" className="w-full gradient-primary">
              {editing ? "Atualizar" : "Criar Evento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
