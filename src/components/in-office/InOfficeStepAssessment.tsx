import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Activity, Save, ArrowRight, ArrowLeft, Loader2, Check, Scale, Ruler } from "lucide-react";

interface Props {
  patientId: string;
  onNext: () => void;
  onPrev: () => void;
  sessionId: string;
}

const MEASURE_FIELDS = [
  { section: "Dados Gerais", icon: Scale, fields: [
    { key: "weight", label: "Peso (kg)", placeholder: "75.0" },
    { key: "height", label: "Altura (cm)", placeholder: "170" },
    { key: "body_fat_percentage", label: "% Gordura", placeholder: "22.0" },
    { key: "lean_mass", label: "Massa magra (kg)", placeholder: "58.5" },
  ]},
  { section: "Circunferências (cm)", icon: Ruler, fields: [
    { key: "neck", label: "Pescoço", placeholder: "" },
    { key: "chest", label: "Peitoral", placeholder: "" },
    { key: "waist", label: "Cintura", placeholder: "" },
    { key: "abdomen", label: "Abdômen", placeholder: "" },
    { key: "hip", label: "Quadril", placeholder: "" },
    { key: "right_arm", label: "Braço D", placeholder: "" },
    { key: "left_arm", label: "Braço E", placeholder: "" },
    { key: "right_thigh", label: "Coxa D", placeholder: "" },
    { key: "left_thigh", label: "Coxa E", placeholder: "" },
    { key: "right_calf", label: "Panturrilha D", placeholder: "" },
    { key: "left_calf", label: "Panturrilha E", placeholder: "" },
  ]},
];

export default function InOfficeStepAssessment({ patientId, onNext, onPrev, sessionId }: Props) {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("physical_assessments")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const vals: Record<string, string> = {};
        MEASURE_FIELDS.forEach(s => s.fields.forEach(f => {
          if ((data as any)[f.key]) vals[f.key] = String((data as any)[f.key]);
        }));
        setValues(vals);
        setNotes((data as any).notes || "");
      }
      setLoading(false);
    })();
  }, [patientId]);

  // Auto-calculate BMI
  const bmi = useMemo(() => {
    const w = parseFloat(values.weight || "0");
    const h = parseFloat(values.height || "0") / 100;
    if (w > 0 && h > 0) return (w / (h * h)).toFixed(1);
    return "—";
  }, [values.weight, values.height]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { data: np } = await supabase
        .from("nutritionist_patients")
        .select("tenant_id")
        .eq("patient_id", patientId)
        .eq("nutritionist_id", user.id)
        .maybeSingle();

      const payload: Record<string, any> = {
        patient_id: patientId,
        assessor_id: user.id,
        assessment_date: new Date().toISOString().split("T")[0],
        notes,
        tenant_id: np?.tenant_id || null,
      };
      MEASURE_FIELDS.forEach(s => s.fields.forEach(f => {
        const v = parseFloat(values[f.key] || "");
        if (!isNaN(v)) payload[f.key] = v;
      }));

      const { error } = await supabase
        .from("physical_assessments")
        .insert(payload);
      if (error) throw error;

      await supabase
        .from("in_office_sessions" as any)
        .update({ assessment_completed: true } as any)
        .eq("id", sessionId);

      setSaved(true);
      toast.success("Avaliação física salva!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-4 h-4 text-primary" />
          Avaliação Física Rápida
          {bmi !== "—" && (
            <span className="ml-auto text-xs font-normal bg-muted px-2 py-1 rounded-lg">
              IMC: <strong>{bmi}</strong>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {MEASURE_FIELDS.map(section => {
          const Icon = section.icon;
          return (
            <div key={section.section}>
              <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-muted-foreground" />
                {section.section}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {section.fields.map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={values[f.key] || ""}
                      onChange={e => { setValues(prev => ({ ...prev, [f.key]: e.target.value })); setSaved(false); }}
                      placeholder={f.placeholder}
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="space-y-1.5">
          <Label className="text-xs">Observações</Label>
          <Textarea value={notes} onChange={e => { setNotes(e.target.value); setSaved(false); }} placeholder="Observações do profissional..." rows={3} />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onPrev} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-emerald-500" /> : <Save className="w-4 h-4" />}
              {saved ? "Salvo" : "Salvar"}
            </Button>
            <Button onClick={() => { handleSave(); onNext(); }} className="gap-2">
              Próximo <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
