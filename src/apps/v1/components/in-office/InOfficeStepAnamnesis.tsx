import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ClipboardList, ArrowRight, ArrowLeft, Loader2, Check, CloudOff, Cloud } from "lucide-react";

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

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function InOfficeStepAnamnesis({ patientId, onNext, onPrev, sessionId }: Props) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  const lastSavedRef = useRef<string>("");

  // Keep ref in sync
  useEffect(() => { answersRef.current = answers; }, [answers]);

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
        const loaded = data.answers as Record<string, string>;
        setAnswers(loaded);
        lastSavedRef.current = JSON.stringify(loaded);
      }
      setLoading(false);
    })();
  }, [patientId]);

  const persistSave = useCallback(async () => {
    if (!user?.id) return;
    const current = answersRef.current;
    const serialized = JSON.stringify(current);
    // Skip if nothing changed
    if (serialized === lastSavedRef.current) return;

    setSaveStatus("saving");
    try {
      const { data: np, error: npErr } = await supabase
        .from("nutritionist_patients")
        .select("tenant_id")
        .eq("patient_id", patientId)
        .eq("nutritionist_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (npErr) throw npErr;
      if (!np?.tenant_id) {
        toast.error("Vínculo com paciente não encontrado. Verifique se o paciente está ativo.");
        setSaveStatus("error");
        return;
      }

      const { data: existing, error: existingErr } = await supabase
        .from("patient_anamnesis")
        .select("id")
        .eq("user_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingErr) throw existingErr;

      if (existing) {
        const { error: updErr } = await supabase
          .from("patient_anamnesis")
          .update({ answers: current as any, status: "completed" })
          .eq("id", existing.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from("patient_anamnesis")
          .insert({
            user_id: patientId,
            answers: current as any,
            tenant_id: np.tenant_id,
            status: "completed",
          });
        if (insErr) throw insErr;
      }

      // Update Central Source of Truth (profiles)
      await supabase
        .from("profiles")
        .update({
          goal: current.objective,
          activity_level: current.activity_level,
          restrictions: current.allergies ? [current.allergies, current.intolerances].filter(Boolean) : [],
          preferences: current.food_preferences ? [current.food_preferences] : [],
        })
        .eq("user_id", patientId);

      await supabase
        .from("in_office_sessions" as any)
        .update({ anamnesis_completed: true } as any)
        .eq("id", sessionId);

      lastSavedRef.current = serialized;
      setSaveStatus("saved");
    } catch (err: any) {
      console.error("[InOfficeStepAnamnesis] save error:", err);
      toast.error(`Erro ao salvar anamnese: ${err?.message || "tente novamente"}`);
      setSaveStatus("error");
    }
  }, [user?.id, patientId, sessionId]);

  // Autosave with 2s debounce
  const triggerAutosave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistSave();
    }, 2000);
  }, [persistSave]);

  // Save on unmount / step change
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Fire immediate save on unmount
      persistSave();
    };
  }, [persistSave]);

  const updateField = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
    triggerAutosave();
  };

  const handleNext = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await persistSave();
    onNext();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Anamnese Rápida — Modo Consultório
          </span>
          <span className="flex items-center gap-1.5 text-xs font-normal">
            {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /> <span className="text-muted-foreground">Salvando...</span></>}
            {saveStatus === "saved" && <><Check className="w-3 h-3 text-emerald-500" /> <span className="text-emerald-600">Salvo</span></>}
            {saveStatus === "error" && <><CloudOff className="w-3 h-3 text-destructive" /> <span className="text-destructive">Erro</span></>}
            {saveStatus === "idle" && <><Cloud className="w-3 h-3 text-muted-foreground/50" /> <span className="text-muted-foreground/50">Autosave</span></>}
          </span>
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

        {/* Navigation is handled by the parent wizard */}
      </CardContent>
    </Card>
  );
}
