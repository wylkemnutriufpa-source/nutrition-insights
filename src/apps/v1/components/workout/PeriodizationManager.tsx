import { useState, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Badge } from "@v1/components/ui/badge";
import { Switch } from "@v1/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Slider } from "@v1/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { toast } from "sonner";
import {
  TrendingUp, Settings2, RotateCcw, Zap, Calendar, ChevronRight
} from "lucide-react";

interface Props {
  plans: any[];
  students: { student_id: string; full_name: string }[];
  onRefresh: () => void;
}

const PROGRESSION_TYPES = [
  { value: "linear", label: "Linear", desc: "Aumento constante a cada semana" },
  { value: "undulating", label: "Ondulatória", desc: "Alterna intensidades alta/média/baixa" },
  { value: "block", label: "Bloco", desc: "Fases distintas (força → hipertrofia → potência)" },
];

export default function PeriodizationManager({ plans, students, onRefresh }: Props) {
  const { user } = useAuth();
  const [periodizations, setPeriodizations] = useState<any[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [form, setForm] = useState({
    mesocycle_name: "Mesociclo 1",
    mesocycle_weeks: 4,
    current_week: 1,
    progression_type: "linear",
    progression_percent: 5,
    deload_week: 4,
    deload_reduction_percent: 40,
    auto_progress_enabled: true,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("workout_periodization")
      .select("*, workout_plans(title, student_id, status)")
      .eq("personal_id", user.id)
      .order("created_at", { ascending: false });
    setPeriodizations(data || []);
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = async () => {
    if (!user || !selectedPlan) { toast.error("Selecione um plano"); return; }
    setSaving(true);
    const existing = periodizations.find(p => p.plan_id === selectedPlan);
    
    if (existing) {
      await (supabase as any).from("workout_periodization")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await (supabase as any).from("workout_periodization").insert({
        ...form,
        plan_id: selectedPlan,
        personal_id: user.id,
      });
    }
    toast.success("Periodização salva!");
    setSaving(false);
    setShowConfig(false);
    load();
  };

  const advanceWeek = async (periodId: string, currentWeek: number, totalWeeks: number) => {
    const nextWeek = currentWeek >= totalWeeks ? 1 : currentWeek + 1;
    await (supabase as any).from("workout_periodization")
      .update({ current_week: nextWeek, updated_at: new Date().toISOString() })
      .eq("id", periodId);
    toast.success(nextWeek === 1 ? "Novo mesociclo iniciado!" : `Semana ${nextWeek} ativada`);
    load();
  };

  const activePlans = plans.filter(p => p.status === "active");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Periodização</h2>
        </div>
        <Button onClick={() => setShowConfig(true)} size="sm" className="gap-1.5">
          <Settings2 className="w-4 h-4" /> Configurar
        </Button>
      </div>

      {periodizations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhuma periodização configurada</p>
            <p className="text-xs mt-1">Configure ciclos de treino para progressão automática</p>
          </CardContent>
        </Card>
      ) : (
        periodizations.map(p => {
          const plan = p.workout_plans;
          const studentName = students.find(s => s.student_id === plan?.student_id)?.full_name || "Aluno";
          const isDeload = p.deload_week && p.current_week === p.deload_week;
          const progressionLabel = PROGRESSION_TYPES.find(t => t.value === p.progression_type)?.label || p.progression_type;
          const weekProgress = Math.round((p.current_week / p.mesocycle_weeks) * 100);

          return (
            <Card key={p.id} className={`${isDeload ? "border-amber-500/30" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{plan?.title || "Plano"}</p>
                    <p className="text-xs text-muted-foreground">{studentName} • {p.mesocycle_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isDeload ? "secondary" : "default"}>
                      {isDeload ? "🔄 Deload" : `Semana ${p.current_week}/${p.mesocycle_weeks}`}
                    </Badge>
                    {p.auto_progress_enabled && <Zap className="w-3.5 h-3.5 text-yellow-500" />}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  {Array.from({ length: p.mesocycle_weeks }).map((_, i) => (
                    <div key={i} className={`flex-1 h-2 rounded-full ${
                      i + 1 < p.current_week ? "bg-primary" :
                      i + 1 === p.current_week ? "bg-primary animate-pulse" :
                      i + 1 === p.deload_week ? "bg-amber-500/30" : "bg-muted"
                    }`} />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex gap-3">
                    <span>{progressionLabel}</span>
                    <span>+{p.progression_percent}%/sem</span>
                    {p.deload_week && <span>Deload: sem {p.deload_week}</span>}
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                    onClick={() => advanceWeek(p.id, p.current_week, p.mesocycle_weeks)}>
                    Avançar <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Config Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Periodização</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plano</Label>
              <Select value={selectedPlan} onValueChange={v => {
                setSelectedPlan(v);
                const existing = periodizations.find(p => p.plan_id === v);
                if (existing) setForm({
                  mesocycle_name: existing.mesocycle_name,
                  mesocycle_weeks: existing.mesocycle_weeks,
                  current_week: existing.current_week,
                  progression_type: existing.progression_type,
                  progression_percent: existing.progression_percent,
                  deload_week: existing.deload_week || 4,
                  deload_reduction_percent: existing.deload_reduction_percent || 40,
                  auto_progress_enabled: existing.auto_progress_enabled,
                  notes: existing.notes || "",
                });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
                <SelectContent>
                  {activePlans.map(p => {
                    const sn = students.find(s => s.student_id === p.student_id)?.full_name || "";
                    return <SelectItem key={p.id} value={p.id}>{p.title} - {sn}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do Mesociclo</Label>
                <Input value={form.mesocycle_name} onChange={e => setForm({ ...form, mesocycle_name: e.target.value })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Semanas</Label>
                <Input type="number" min={2} max={12} value={form.mesocycle_weeks} onChange={e => setForm({ ...form, mesocycle_weeks: parseInt(e.target.value) || 4 })} className="h-8" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Tipo de Progressão</Label>
              <Select value={form.progression_type} onValueChange={v => setForm({ ...form, progression_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRESSION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{t.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Progressão por semana: {form.progression_percent}%</Label>
              <Slider value={[form.progression_percent]} onValueChange={v => setForm({ ...form, progression_percent: v[0] })} min={2} max={15} step={0.5} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Semana de Deload</Label>
                <Input type="number" min={0} max={form.mesocycle_weeks} value={form.deload_week} onChange={e => setForm({ ...form, deload_week: parseInt(e.target.value) || 0 })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Redução Deload: {form.deload_reduction_percent}%</Label>
                <Slider value={[form.deload_reduction_percent]} onValueChange={v => setForm({ ...form, deload_reduction_percent: v[0] })} min={20} max={60} step={5} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Progressão automática</Label>
              <Switch checked={form.auto_progress_enabled} onCheckedChange={v => setForm({ ...form, auto_progress_enabled: v })} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Salvar Periodização"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
