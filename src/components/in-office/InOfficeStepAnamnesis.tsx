import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ClipboardList, Save, ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";

interface Props {
  patientId: string;
  onNext: () => void;
  onPrev: () => void;
  sessionId: string;
}

const QUICK_FIELDS = [
  { key: "objective", label: "Objetivo principal", type: "select", options: ["Emagrecimento", "Ganho de massa", "Manutenção", "Performance", "Saúde geral", "Recomposição corporal"] },
  { key: "allergies", label: "Alergias alimentares", type: "text", placeholder: "Ex: lactose, glúten, camarão..." },
  { key: "intolerances", label: "Intolerâncias", type: "text", placeholder: "Ex: lactose, frutose..." },
  { key: "medications", label: "Medicamentos em uso", type: "text", placeholder: "Ex: metformina, levotiroxina..." },
  { key: "diseases", label: "Doenças / condições", type: "text", placeholder: "Ex: diabetes tipo 2, hipotireoidismo..." },
  { key: "activity_level", label: "Nível de atividade", type: "select", options: ["Sedentário", "Levemente ativo", "Moderadamente ativo", "Muito ativo", "Extremamente ativo"] },
  { key: "meals_per_day", label: "Refeições por dia", type: "select", options: ["3", "4", "5", "6", "7"] },
  { key: "water_intake", label: "Ingestão de água (L/dia)", type: "text", placeholder: "Ex: 1.5" },
  { key: "sleep_hours", label: "Horas de sono", type: "text", placeholder: "Ex: 7" },
  { key: "supplements", label: "Suplementos em uso", type: "text", placeholder: "Ex: whey, creatina, vitamina D..." },
  { key: "food_preferences", label: "Preferências alimentares", type: "textarea", placeholder: "Alimentos preferidos, restrições culturais, etc." },
  { key: "clinical_notes", label: "Observações clínicas", type: "textarea", placeholder: "Notas do profissional..." },
];

export default function InOfficeStepAnamnesis({ patientId, onNext, onPrev, sessionId }: Props) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("patient_anamnesis")
        .select("answers")
        .eq("user_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.answers && typeof data.answers === "object") {
        setAnswers(data.answers as Record<string, string>);
      }
      setLoading(false);
    })();
  }, [patientId]);

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

      // Check if exists
      const { data: existing } = await supabase
        .from("patient_anamnesis")
        .select("id")
        .eq("user_id", patientId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("patient_anamnesis")
          .update({ answers: answers as any, status: "completed" })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("patient_anamnesis")
          .insert({
            user_id: patientId,
            answers: answers as any,
            tenant_id: np?.tenant_id || "",
            status: "completed",
          });
      }

      await supabase
        .from("in_office_sessions" as any)
        .update({ anamnesis_completed: true } as any)
        .eq("id", sessionId);

      setSaved(true);
      toast.success("Anamnese salva!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="w-4 h-4 text-primary" />
          Anamnese Rápida — Modo Consultório
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUICK_FIELDS.map(field => (
            <div key={field.key} className={`space-y-1.5 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
              <Label className="text-xs font-medium">{field.label}</Label>
              {field.type === "select" ? (
                <Select value={answers[field.key] || ""} onValueChange={v => updateField(field.key, v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {field.options?.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  value={answers[field.key] || ""}
                  onChange={e => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                />
              ) : (
                <Input
                  value={answers[field.key] || ""}
                  onChange={e => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onPrev} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-primary" /> : <Save className="w-4 h-4" />}
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
