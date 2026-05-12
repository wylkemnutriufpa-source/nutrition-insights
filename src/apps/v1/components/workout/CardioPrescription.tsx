import { useState, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter, getTenantIdForInsert } from "@v1/lib/tenantQueryHelpers";
import { Card, CardContent } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Badge } from "@v1/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Slider } from "@v1/components/ui/slider";
import { Textarea } from "@v1/components/ui/textarea";
import { Switch } from "@v1/components/ui/switch";
import { toast } from "sonner";
import { Heart, Plus, Flame, Timer, Zap } from "lucide-react";

interface Props {
  students: { student_id: string; full_name: string }[];
  plans: any[];
}

const CARDIO_TYPES = [
  { value: "corrida", label: "Corrida", icon: "🏃" },
  { value: "caminhada", label: "Caminhada", icon: "🚶" },
  { value: "bike", label: "Bicicleta", icon: "🚴" },
  { value: "natacao", label: "Natação", icon: "🏊" },
  { value: "eliptico", label: "Elíptico", icon: "⚙️" },
  { value: "hiit", label: "HIIT", icon: "⚡" },
  { value: "pular_corda", label: "Pular Corda", icon: "🪢" },
  { value: "outro", label: "Outro", icon: "🏋️" },
];

const HR_ZONES = [
  { value: "z1", label: "Z1 - Recuperação", range: "50-60% FCmax", color: "text-blue-400" },
  { value: "z2", label: "Z2 - Base Aeróbia", range: "60-70% FCmax", color: "text-green-400" },
  { value: "z3", label: "Z3 - Tempo", range: "70-80% FCmax", color: "text-yellow-400" },
  { value: "z4", label: "Z4 - Limiar", range: "80-90% FCmax", color: "text-orange-400" },
  { value: "z5", label: "Z5 - VO2max", range: "90-100% FCmax", color: "text-red-400" },
];

export default function CardioPrescription({ students, plans }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({
    student_id: "", plan_id: "", cardio_type: "corrida",
    duration_minutes: 30, target_hr_zone: "z2",
    frequency_per_week: 3, intensity: "moderate",
    notes: "", is_active: true, distance_km: null,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const q = (supabase as any).from("cardio_prescriptions")
      .select("*").eq("personal_id", user.id).order("created_at", { ascending: false });
    const { data } = await withTenantFilter(q, tenantId);
    setPrescriptions(data || []);
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.student_id) { toast.error("Selecione um aluno"); return; }
    setSaving(true);
    const payload = { ...form, personal_id: user.id, ...getTenantIdForInsert(tenantId) };
    if (!payload.plan_id) delete payload.plan_id;
    if (!payload.distance_km) delete payload.distance_km;
    
    const { error } = await (supabase as any).from("cardio_prescriptions").insert(payload);
    if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
    toast.success("Cardio prescrito!");
    setSaving(false);
    setShowForm(false);
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase as any).from("cardio_prescriptions").update({ is_active: !current }).eq("id", id);
    toast.success(!current ? "Cardio ativado" : "Cardio pausado");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-bold">Prescrição de Cardio</h2>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Novo Cardio
        </Button>
      </div>

      {prescriptions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Heart className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma prescrição de cardio</p>
          </CardContent>
        </Card>
      ) : (
        prescriptions.map(p => {
          const type = CARDIO_TYPES.find(t => t.value === p.cardio_type);
          const zone = HR_ZONES.find(z => z.value === p.target_hr_zone);
          const studentName = students.find(s => s.student_id === p.student_id)?.full_name || "Aluno";

          return (
            <Card key={p.id} className={`${!p.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type?.icon || "🏃"}</span>
                    <div>
                      <p className="font-semibold text-sm">{type?.label || p.cardio_type} • {studentName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-0.5"><Timer className="w-3 h-3" />{p.duration_minutes}min</span>
                        <span>{p.frequency_per_week}x/sem</span>
                        {zone && <span className={zone.color}>{zone.label}</span>}
                        {p.distance_km && <span>{p.distance_km}km</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.is_active ? "default" : "secondary"}>
                      {p.is_active ? "Ativo" : "Pausado"}
                    </Badge>
                    <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
                  </div>
                </div>
                {p.notes && <p className="text-xs text-muted-foreground mt-2 italic">{p.notes}</p>}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Prescrição de Cardio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Aluno</Label>
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.student_id} value={s.student_id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Cardio</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {CARDIO_TYPES.map(t => (
                  <button key={t.value} onClick={() => setForm({ ...form, cardio_type: t.value })}
                    className={`p-2 rounded-lg text-center text-xs border transition-all ${form.cardio_type === t.value ? "border-primary bg-primary/10" : "border-border"}`}>
                    <span className="text-lg block">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Duração (min)</Label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Frequência/semana</Label>
                <Input type="number" min={1} max={7} value={form.frequency_per_week} onChange={e => setForm({ ...form, frequency_per_week: parseInt(e.target.value) || 3 })} className="h-8" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Zona de FC Alvo</Label>
              <div className="space-y-1 mt-1">
                {HR_ZONES.map(z => (
                  <button key={z.value} onClick={() => setForm({ ...form, target_hr_zone: z.value })}
                    className={`w-full flex items-center justify-between p-2 rounded text-xs border transition-all ${form.target_hr_zone === z.value ? "border-primary bg-primary/5" : "border-transparent"}`}>
                    <span className={`font-medium ${z.color}`}>{z.label}</span>
                    <span className="text-muted-foreground">{z.range}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Distância (km) - opcional</Label>
              <Input type="number" step="0.1" value={form.distance_km || ""} onChange={e => setForm({ ...form, distance_km: e.target.value ? parseFloat(e.target.value) : null })} className="h-8" />
            </div>

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Prescrever Cardio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
