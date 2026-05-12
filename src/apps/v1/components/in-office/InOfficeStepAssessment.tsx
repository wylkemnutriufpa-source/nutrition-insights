import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Activity, Save, ArrowRight, ArrowLeft, Loader2, Check, Scale, Ruler, Camera } from "lucide-react";
import SmartNumericInput from "@/components/ui/SmartNumericInput";
import InOfficePhotoUpload from "./InOfficePhotoUpload";
import {
  normalizeWeightInput, normalizeHeightInput, normalizeBodyFatInput,
  normalizeMeasurementInput, type NormalizationResult, type FieldNormalizer,
} from "@/lib/normalizeInputs";

interface Props {
  patientId: string;
  onNext: () => void;
  onPrev: () => void;
  sessionId: string;
}

const FIELD_NORMALIZERS: Record<string, FieldNormalizer> = {
  weight: normalizeWeightInput,
  height: normalizeHeightInput,
  body_fat_percentage: normalizeBodyFatInput,
  lean_mass: normalizeWeightInput,
};

const MEASURE_FIELDS = [
  { section: "Dados Gerais", icon: Scale, fields: [
    { key: "weight", label: "Peso (kg)", placeholder: "72 ou 72,5" },
    { key: "height", label: "Altura (cm)", placeholder: "158 ou 1,58" },
    { key: "body_fat_percentage", label: "% Gordura", placeholder: "22 ou 22,5" },
    { key: "lean_mass", label: "Massa magra (kg)", placeholder: "58,5" },
  ]},
  { section: "Circunferências (cm)", icon: Ruler, fields: [
    { key: "neck", label: "Pescoço", placeholder: "38" },
    { key: "chest", label: "Peitoral", placeholder: "95" },
    { key: "waist", label: "Cintura", placeholder: "80" },
    { key: "abdomen", label: "Abdômen", placeholder: "85" },
    { key: "hip", label: "Quadril", placeholder: "98" },
    { key: "right_arm", label: "Braço D", placeholder: "32" },
    { key: "left_arm", label: "Braço E", placeholder: "32" },
    { key: "right_thigh", label: "Coxa D", placeholder: "55" },
    { key: "left_thigh", label: "Coxa E", placeholder: "55" },
    { key: "right_calf", label: "Panturrilha D", placeholder: "36" },
    { key: "left_calf", label: "Panturrilha E", placeholder: "36" },
  ]},
];

function getNormalizerForField(key: string): FieldNormalizer {
  return FIELD_NORMALIZERS[key] || normalizeMeasurementInput;
}

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
          const v = (data as any)[f.key];
          if (v != null) vals[f.key] = String(v);
        }));
        setValues(vals);
        setNotes(data.notes || "");
      }
      setLoading(false);
    })();
  }, [patientId]);

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
      const numericPayload: Record<string, number | null> = {};
      MEASURE_FIELDS.forEach(s => s.fields.forEach(f => {
        const normalizer = getNormalizerForField(f.key);
        const result = normalizer(values[f.key] || "");
        numericPayload[f.key] = result.isValid ? result.value : null;
      }));

      const { error } = await supabase
        .from("physical_assessments")
        .insert({
          patient_id: patientId,
          assessor_id: user.id,
          notes,
          ...numericPayload,
        });
      if (error) throw error;

      // Update Central Source of Truth (profiles)
      await supabase
        .from("profiles")
        .update({
          current_weight_kg: numericPayload.weight,
          current_height_cm: numericPayload.height,
        })
        .eq("user_id", patientId);

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
                  <SmartNumericInput
                    key={f.key}
                    label={f.label}
                    compact
                    normalizer={getNormalizerForField(f.key)}
                    value={values[f.key] || ""}
                    onChange={(raw) => { setValues(prev => ({ ...prev, [f.key]: raw })); setSaved(false); }}
                    placeholder={f.placeholder}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InOfficePhotoUpload patientId={patientId} sessionId={sessionId} />
          
          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea value={notes} onChange={e => { setNotes(e.target.value); setSaved(false); }} placeholder="Observações do profissional..." className="h-full min-h-[120px]" />
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-primary" /> : <Save className="w-4 h-4" />}
            {saved ? "Salvo" : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
