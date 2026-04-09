import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, User, Mail, Phone, Calendar, ArrowRight, Save, Check, Pencil } from "lucide-react";

interface Props {
  patientId: string;
  onNext: () => void;
}

const OBJECTIVES = ["Emagrecimento", "Ganho de massa", "Manutenção", "Performance", "Saúde geral", "Recomposição corporal"];
const ACTIVITY_LEVELS = ["Sedentário", "Levemente ativo", "Moderadamente ativo", "Muito ativo", "Extremamente ativo"];
const GENDERS = [
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Outro" },
];

export default function InOfficeStepPatient({ patientId, onNext }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    objective: "",
    activity_level: "",
    dietary_restrictions: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone, date_of_birth, gender, avatar_url")
        .eq("user_id", patientId)
        .maybeSingle();

      // Also fetch onboarding data for objective/activity/restrictions
      const { data: onb } = await supabase
        .from("patient_onboarding")
        .select("objective, activity_level, dietary_restrictions")
        .eq("user_id", patientId)
        .maybeSingle();

      setProfile(data);
      setForm({
        full_name: data?.full_name || "",
        phone: data?.phone || "",
        gender: data?.gender || "",
        date_of_birth: data?.date_of_birth || "",
        objective: onb?.objective || "",
        activity_level: onb?.activity_level || "",
        dietary_restrictions: onb?.dietary_restrictions || "",
      });
      setLoading(false);
    })();
  }, [patientId]);

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update profile fields
      await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone: form.phone,
          gender: form.gender,
          date_of_birth: form.date_of_birth || null,
        })
        .eq("user_id", patientId);

      // Upsert onboarding data
      const { data: existing } = await supabase
        .from("patient_onboarding")
        .select("id")
        .eq("user_id", patientId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("patient_onboarding")
          .update({
            objective: form.objective,
            activity_level: form.activity_level,
            dietary_restrictions: form.dietary_restrictions,
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("patient_onboarding")
          .insert({
            user_id: patientId,
            objective: form.objective,
            activity_level: form.activity_level,
            dietary_restrictions: form.dietary_restrictions,
          });
      }

      setSaved(true);
      setEditing(false);
      toast.success("Dados atualizados!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Dados do Paciente
          </span>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1 text-xs">
              <Pencil className="w-3 h-3" /> Editar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Nome</Label>
            <Input
              value={form.full_name}
              onChange={e => updateField("full_name", e.target.value)}
              readOnly={!editing}
              className={!editing ? "bg-muted/50" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
            <Input value={profile?.email || ""} readOnly className="bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</Label>
            <Input
              value={form.phone}
              onChange={e => updateField("phone", e.target.value)}
              readOnly={!editing}
              className={!editing ? "bg-muted/50" : ""}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Data de Nascimento</Label>
            <Input
              type={editing ? "date" : "text"}
              value={form.date_of_birth}
              onChange={e => updateField("date_of_birth", e.target.value)}
              readOnly={!editing}
              className={!editing ? "bg-muted/50" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Sexo</Label>
            {editing ? (
              <Select value={form.gender} onValueChange={v => updateField("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={GENDERS.find(g => g.value === form.gender)?.label || form.gender || "—"} readOnly className="bg-muted/50" />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Objetivo</Label>
            {editing ? (
              <Select value={form.objective} onValueChange={v => updateField("objective", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.objective || "—"} readOnly className="bg-muted/50" />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nível de Atividade</Label>
            {editing ? (
              <Select value={form.activity_level} onValueChange={v => updateField("activity_level", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.activity_level || "—"} readOnly className="bg-muted/50" />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Restrições Alimentares</Label>
            <Input
              value={form.dietary_restrictions}
              onChange={e => updateField("dietary_restrictions", e.target.value)}
              readOnly={!editing}
              className={!editing ? "bg-muted/50" : ""}
              placeholder="Ex: lactose, glúten..."
            />
          </div>
        </div>

        {editing && (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
              {saved ? "Salvo" : "Salvar"}
            </Button>
          </div>
        )}

        {!editing && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
            ✅ Paciente já cadastrado no sistema. Prossiga para a anamnese.
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onNext} className="gap-2">
            Iniciar Anamnese <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
