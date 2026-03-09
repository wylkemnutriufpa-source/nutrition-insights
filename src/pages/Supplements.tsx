import { useEffect, useState } from "react";
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
import { Pill, Plus, Search, Users, ChevronDown, ChevronUp, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

interface Patient {
  id: string;
  patient_id: string;
  profile?: { full_name: string } | null;
}

const SUPPLEMENT_ICONS = ["💊", "🧴", "🫗", "🌿", "💉", "🧪", "🫧", "⚗️"];
const TIMINGS = [
  { value: "morning", label: "Manhã (em jejum)" },
  { value: "breakfast", label: "Café da manhã" },
  { value: "lunch", label: "Almoço" },
  { value: "pre_workout", label: "Pré-treino" },
  { value: "post_workout", label: "Pós-treino" },
  { value: "dinner", label: "Jantar" },
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

// Patient view: show own supplements
function PatientSupplementsView() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("patient_supplements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setSupplements((data as Supplement[]) || []);
      setLoading(false);
    })();
  }, []);

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
        <p className="text-muted-foreground text-sm">{supplements.length} suplemento(s) ativo(s)</p>
      </div>

      {supplements.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Pill className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold text-lg mb-1">Nenhum suplemento</h3>
          <p className="text-muted-foreground">Seu nutricionista ainda não prescreveu suplementos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supplements.map(s => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-5 shadow-card border border-primary/10">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{s.icon}</div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-lg">{s.name}</h3>
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
                  {s.notes && (
                    <p className="text-sm text-muted-foreground mt-1 italic">{s.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Início: {new Date(s.start_date).toLocaleDateString("pt-BR")}
                    {s.end_date && ` • Fim: ${new Date(s.end_date).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Nutritionist view: manage supplements per patient
function NutritionistSupplementsView() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
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
      supabase.from("nutritionist_patients").select("id, patient_id, profiles!nutritionist_patients_patient_id_fkey(full_name)").eq("nutritionist_id", user.id).eq("status", "active"),
      supabase.from("patient_supplements").select("*").eq("nutritionist_id", user.id).order("created_at", { ascending: false }),
    ]);

    // Flatten profiles
    const pats = (patientsRes.data || []).map((p: any) => ({
      id: p.id,
      patient_id: p.patient_id,
      profile: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
    }));
    setPatients(pats);

    const supps = (supplRes.data || []) as Supplement[];
    // Enrich with patient name
    const enriched = supps.map(s => ({
      ...s,
      patientName: pats.find(p => p.patient_id === s.patient_id)?.profile?.full_name || "Paciente",
    }));
    setSupplements(enriched);
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
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-3">
                    {patSupps.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum suplemento prescrito.</p>
                    ) : (
                      patSupps.map(s => (
                        <div key={s.id} className={`flex items-start gap-3 p-3 rounded-lg border ${s.is_active ? "border-primary/20 bg-primary/5" : "border-border opacity-60"}`}>
                          <span className="text-2xl">{s.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{s.name}</p>
                              {!s.is_active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{s.dosage} · {freqLabel(s.frequency)} · {timingLabel(s.timing)}</p>
                            {s.brand && <p className="text-xs text-muted-foreground">{s.brand}</p>}
                            {s.reason && <p className="text-xs mt-1">{s.reason}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => toggleActive(s.id, s.is_active)} className="text-muted-foreground hover:text-primary transition-colors p-1" title={s.is_active ? "Desativar" : "Ativar"}>
                              {s.is_active ? <ToggleRight className="w-5 h-5 text-success" /> : <ToggleLeft className="w-5 h-5" />}
                            </button>
                            <button onClick={() => deleteSupplement(s.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Remover">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
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
