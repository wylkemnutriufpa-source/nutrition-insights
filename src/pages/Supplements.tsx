import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pill, Plus, Search, Users, ChevronDown, ChevronUp, Trash2, ToggleLeft, ToggleRight, Check, BarChart3, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Supplement {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  reason: string | null;
  brand: string | null;
  notes: string | null;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  icon: string;
  created_at: string;
  patientName?: string;
}

interface SupplementLog {
  id: string;
  supplement_id: string;
  patient_id: string;
  date: string;
  taken_at: string;
}

interface Patient {
  id: string;
  patient_id: string;
  profile?: { full_name: string } | null;
}

const SUPPLEMENT_ICONS = ["💊", "🧴", "🫗", "🌿", "💉", "🧪", "🫧", "⚗️"];
const TIMINGS = [
  { value: "morning", label: "Manhã (em jejum)" },
  { value: "Café da Manhã", label: "Café da manhã" },
  { value: "Almoço", label: "Almoço" },
  { value: "pre_workout", label: "Pré-treino" },
  { value: "post_workout", label: "Pós-treino" },
  { value: "Jantar", label: "Jantar" },
  { value: "night", label: "À noite / antes de dormir" },
];
const FREQUENCIES = [
  { value: "daily", label: "Diário" },
  { value: "twice_daily", label: "2x ao dia" },
  { value: "three_times_daily", label: "3x ao dia" },
  { value: "weekly", label: "Semanal" },
  { value: "as_needed", label: "Quando necessário" },
];

function timingLabel(v: string) {
  return TIMINGS.find(t => t.value === v)?.label ?? v;
}
function freqLabel(v: string) {
  return FREQUENCIES.find(f => f.value === v)?.label ?? v;
}

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// ─── Adherence Chart Component ───
function AdherenceChart({ supplements, logs }: { supplements: Supplement[]; logs: SupplementLog[] }) {
  const days = getLast30Days();
  const activeSupps = supplements.filter(s => s.is_active);
  const totalPerDay = activeSupps.length;

  const chartData = days.map(day => {
    const dayLogs = logs.filter(l => l.date === day);
    const taken = dayLogs.length;
    const pct = totalPerDay > 0 ? Math.round((taken / totalPerDay) * 100) : 0;
    return { date: formatDateShort(day), taken, total: totalPerDay, pct, fullDate: day };
  });

  const avg = chartData.length > 0
    ? Math.round(chartData.reduce((s, d) => s + d.pct, 0) / chartData.length)
    : 0;

  const today = new Date().toISOString().split("T")[0];
  const todayTaken = logs.filter(l => l.date === today).length;

  return (
    <div className="glass rounded-xl p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Aderência à Suplementação
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{avg}%</p>
            <p className="text-xs text-muted-foreground">Média 30d</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{todayTaken}/{totalPerDay}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
        </div>
      </div>
      {totalPerDay > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${v}%`} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [`${value}%`, "Aderência"]}
            />
            <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.pct >= 80 ? "hsl(var(--primary))" : entry.pct >= 50 ? "hsl(45 93% 47%)" : "hsl(0 84% 60%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-6">Nenhum suplemento ativo para calcular aderência.</p>
      )}
    </div>
  );
}

// ─── Patient View ───
function PatientSupplementsView() {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [logs, setLogs] = useState<SupplementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];

  const fetchData = async () => {
    const [suppRes, logRes] = await Promise.all([
      supabase.from("patient_supplements").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      (supabase as any).from("supplement_logs").select("*").gte("date", getLast30Days()[0]),
    ]);
    setSupplements((suppRes.data as Supplement[]) || []);
    setLogs((logRes.data as SupplementLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const isTakenToday = (supplementId: string) => {
    return logs.some(l => l.supplement_id === supplementId && l.date === today);
  };

  const toggleTaken = async (supplement: Supplement) => {
    if (!user) return;
    const taken = isTakenToday(supplement.id);

    if (taken) {
      // Remove log
      const log = logs.find(l => l.supplement_id === supplement.id && l.date === today);
      if (log) {
        await (supabase as any).from("supplement_logs").delete().eq("id", log.id);
        toast.success("Registro removido");
      }
    } else {
      // Add log
      const { error } = await (supabase as any).from("supplement_logs").insert({
        supplement_id: supplement.id,
        patient_id: user.id,
        date: today,
      });
      if (error) {
        toast.error("Erro ao registrar: " + error.message);
        return;
      }
      toast.success(`${supplement.icon} ${supplement.name} registrado! ✅`);
    }
    fetchData();
  };

  // Last 7 days mini calendar for each supplement
  const getLast7 = () => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Pill className="w-7 h-7 text-primary" /> Meus Suplementos
        </h1>
        <p className="text-muted-foreground text-sm">{supplements.length} suplemento(s) ativo(s) · Marque os que já tomou hoje</p>
      </div>

      {/* Adherence Chart */}
      <AdherenceChart supplements={supplements} logs={logs} />

      {supplements.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Pill className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold text-lg mb-1">Nenhum suplemento</h3>
          <p className="text-muted-foreground">Seu nutricionista ainda não prescreveu suplementos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supplements.map(s => {
            const taken = isTakenToday(s.id);
            const last7 = getLast7();
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`glass rounded-xl p-5 shadow-card border transition-all duration-300 ${taken ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTaken(s)}
                    className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      taken
                        ? "bg-primary text-primary-foreground shadow-md scale-110"
                        : "border-2 border-border hover:border-primary/50 hover:bg-primary/10"
                    }`}
                  >
                    {taken ? <Check className="w-5 h-5" /> : <span className="text-lg">{s.icon}</span>}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-display font-semibold text-lg ${taken ? "line-through text-muted-foreground" : ""}`}>{s.name}</h3>
                      {taken && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Tomado ✅</Badge>}
                    </div>
                    {s.brand && <p className="text-xs text-muted-foreground mb-1">{s.brand}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">{s.dosage}</Badge>
                      <Badge variant="outline" className="text-xs">{freqLabel(s.frequency)}</Badge>
                      <Badge variant="outline" className="text-xs">{timingLabel(s.timing)}</Badge>
                    </div>
                    {s.reason && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <span className="font-medium text-foreground">Motivo:</span> {s.reason}
                      </p>
                    )}

                    {/* Mini 7-day calendar */}
                    <div className="flex items-center gap-1 mt-3">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                      {last7.map(day => {
                        const wasTaken = logs.some(l => l.supplement_id === s.id && l.date === day);
                        const isToday = day === today;
                        return (
                          <div
                            key={day}
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-medium transition-colors ${
                              wasTaken
                                ? "bg-primary text-primary-foreground"
                                : isToday
                                ? "border-2 border-primary/50 text-foreground"
                                : "bg-muted/50 text-muted-foreground"
                            }`}
                            title={`${formatDateShort(day)} — ${wasTaken ? "Tomado" : "Não tomado"}`}
                          >
                            {new Date(day + "T12:00:00").getDate()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Nutritionist View ───
function NutritionistSupplementsView() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [logs, setLogs] = useState<SupplementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [form, setForm] = useState({
    patient_id: "",
    name: "",
    dosage: "",
    frequency: "daily",
    timing: "morning",
    reason: "",
    brand: "",
    notes: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    icon: "💊",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [patientsRes, supplRes] = await Promise.all([
      supabase.from("nutritionist_patients").select("id, patient_id").eq("nutritionist_id", user.id).eq("status", "active"),
      supabase.from("patient_supplements").select("*").eq("nutritionist_id", user.id).order("created_at", { ascending: false }),
    ]);

    const patientIds = (patientsRes.data || []).map((p: any) => p.patient_id);
    const profilesRes = await Promise.all(
      patientIds.map(id => supabase.from("profiles").select("full_name").eq("user_id", id).maybeSingle())
    );

    const pats = (patientsRes.data || []).map((p: any, i: number) => ({
      id: p.id,
      patient_id: p.patient_id,
      profile: profilesRes[i]?.data || null,
    }));
    setPatients(pats);

    const supps = (supplRes.data || []) as Supplement[];
    const enriched = supps.map(s => ({
      ...s,
      patientName: pats.find(p => p.patient_id === s.patient_id)?.profile?.full_name || "Paciente",
    }));
    setSupplements(enriched);

    // Fetch all logs for these patients (last 30 days)
    if (patientIds.length > 0) {
      const thirtyDaysAgo = getLast30Days()[0];
      const { data: logsData } = await (supabase as any)
        .from("supplement_logs")
        .select("*")
        .in("patient_id", patientIds)
        .gte("date", thirtyDaysAgo);
      setLogs((logsData as SupplementLog[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.patient_id || !form.name.trim() || !form.dosage.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("patient_supplements").insert({
      nutritionist_id: user.id,
      patient_id: form.patient_id,
      name: form.name.trim(),
      dosage: form.dosage.trim(),
      frequency: form.frequency,
      timing: form.timing,
      reason: form.reason.trim() || null,
      brand: form.brand.trim() || null,
      notes: form.notes.trim() || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      icon: form.icon,
    });
    if (error) {
      toast.error("Erro ao prescrever suplemento");
    } else {
      toast.success("Suplemento prescrito! 💊");
      setOpen(false);
      setForm({ patient_id: "", name: "", dosage: "", frequency: "daily", timing: "morning", reason: "", brand: "", notes: "", start_date: new Date().toISOString().split("T")[0], end_date: "", icon: "💊" });
      fetchData();
    }
    setSubmitting(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("patient_supplements").update({ is_active: !current }).eq("id", id);
    fetchData();
  };

  const deleteSupplement = async (id: string) => {
    await supabase.from("patient_supplements").delete().eq("id", id);
    toast.success("Suplemento removido");
    fetchData();
  };

  // Group by patient
  const grouped: Record<string, Supplement[]> = {};
  supplements.forEach(s => {
    if (!grouped[s.patient_id]) grouped[s.patient_id] = [];
    grouped[s.patient_id].push(s);
  });

  const filteredPatients = patients.filter(p =>
    !search || p.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Compute adherence per patient
  const getPatientAdherence = (patientId: string) => {
    const patSupps = (grouped[patientId] || []).filter(s => s.is_active);
    if (patSupps.length === 0) return null;
    const days = getLast30Days();
    const patLogs = logs.filter(l => l.patient_id === patientId);
    let totalPossible = 0;
    let totalTaken = 0;
    days.forEach(day => {
      totalPossible += patSupps.length;
      totalTaken += patLogs.filter(l => l.date === day).length;
    });
    return totalPossible > 0 ? Math.round((totalTaken / totalPossible) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Pill className="w-7 h-7 text-primary" /> Suplementação
          </h1>
          <p className="text-muted-foreground text-sm">{supplements.length} suplemento(s) prescrito(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary gap-2 shadow-glow">
              <Plus className="w-4 h-4" /> Prescrever Suplemento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Prescrever Suplemento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Paciente *</Label>
                <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar paciente" /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.patient_id} value={p.patient_id}>
                        {p.profile?.full_name || "Paciente"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ícone</Label>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {SUPPLEMENT_ICONS.map(ic => (
                      <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
                        className={`text-xl p-1 rounded-lg transition-all ${form.icon === ic ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Nome do suplemento *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Vitamina D3" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Dosagem *</Label>
                  <Input value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} placeholder="Ex: 2000 UI" required />
                </div>
                <div>
                  <Label>Marca</Label>
                  <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Opcional" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Frequência</Label>
                  <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map(fr => <SelectItem key={fr.value} value={fr.value}>{fr.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Horário</Label>
                  <Select value={form.timing} onValueChange={v => setForm(f => ({ ...f, timing: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMINGS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data início</Label>
                  <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Data fim (opcional)</Label>
                  <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>Motivo / objetivo</Label>
                <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ex: Deficiência de vitamina D" />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Orientações adicionais..." rows={2} />
              </div>

              <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                {submitting ? "Prescrevendo..." : "Prescrever Suplemento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold text-lg mb-1">Nenhum paciente</h3>
          <p className="text-muted-foreground">Adicione pacientes para prescrever suplementos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPatients.map(p => {
            const patSupps = grouped[p.patient_id] || [];
            const isExpanded = expandedPatient === p.patient_id;
            const adherence = getPatientAdherence(p.patient_id);
            const patLogs = logs.filter(l => l.patient_id === p.patient_id);

            return (
              <div key={p.patient_id} className="glass rounded-xl overflow-hidden shadow-card">
                <button
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedPatient(isExpanded ? null : p.patient_id)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-primary">
                      {(p.profile?.full_name || "P")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">{p.profile?.full_name || "Paciente"}</p>
                    <p className="text-xs text-muted-foreground">
                      {patSupps.filter(s => s.is_active).length} ativo(s) · {patSupps.length} total
                    </p>
                  </div>
                  {adherence !== null && (
                    <div className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                      adherence >= 80 ? "bg-primary/10 text-primary" :
                      adherence >= 50 ? "bg-yellow-500/10 text-yellow-600" :
                      "bg-red-500/10 text-red-500"
                    }`}>
                      {adherence}%
                    </div>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Patient adherence chart */}
                    {patSupps.filter(s => s.is_active).length > 0 && (
                      <AdherenceChart supplements={patSupps} logs={patLogs} />
                    )}

                    {patSupps.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum suplemento prescrito.</p>
                    ) : (
                      patSupps.map(s => {
                        const today = new Date().toISOString().split("T")[0];
                        const takenToday = patLogs.some(l => l.supplement_id === s.id && l.date === today);
                        return (
                          <div key={s.id} className={`flex items-start gap-3 p-3 rounded-lg border ${s.is_active ? "border-primary/20 bg-primary/5" : "border-border opacity-60"}`}>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-2xl">{s.icon}</span>
                              {s.is_active && (
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                  takenToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                }`}>
                                  {takenToday ? "✓" : "·"}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{s.name}</p>
                                {!s.is_active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                                {takenToday && s.is_active && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Tomado hoje</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">{s.dosage} · {freqLabel(s.frequency)} · {timingLabel(s.timing)}</p>
                              {s.brand && <p className="text-xs text-muted-foreground">{s.brand}</p>}
                              {s.reason && <p className="text-xs mt-1">{s.reason}</p>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => toggleActive(s.id, s.is_active)} className="text-muted-foreground hover:text-primary transition-colors p-1" title={s.is_active ? "Desativar" : "Ativar"}>
                                {s.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                              </button>
                              <button onClick={() => deleteSupplement(s.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Remover">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Supplements() {
  const { isNutritionist } = useAuth();
  return (
    <DashboardLayout>
      {isNutritionist ? <NutritionistSupplementsView /> : <PatientSupplementsView />}
    </DashboardLayout>
  );
}
