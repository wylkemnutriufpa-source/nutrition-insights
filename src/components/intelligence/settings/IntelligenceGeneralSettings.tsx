import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Settings2, Save, Droplets, Dumbbell, AlertTriangle, Moon, Sparkles, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface SettingsData {
  default_tone: string;
  default_motivation_style: string;
  hydration_enabled: boolean;
  workout_enabled: boolean;
  weekend_risk_enabled: boolean;
  clinical_warnings_enabled: boolean;
  motivation_enabled: boolean;
  non_adherence_enabled: boolean;
  custom_prompts_enabled: boolean;
  cooldown_minutes: number;
  max_prompts_per_day: number;
}

const DEFAULT_SETTINGS: SettingsData = {
  default_tone: "gentle",
  default_motivation_style: "gentle",
  hydration_enabled: true,
  workout_enabled: true,
  weekend_risk_enabled: true,
  clinical_warnings_enabled: true,
  motivation_enabled: true,
  non_adherence_enabled: true,
  custom_prompts_enabled: true,
  cooldown_minutes: 60,
  max_prompts_per_day: 6,
};

export default function IntelligenceGeneralSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("intelligence_settings")
        .select("*")
        .eq("nutritionist_id", user.id)
        .maybeSingle();
      if (data) {
        setSettings({
          default_tone: data.default_tone,
          default_motivation_style: data.default_motivation_style,
          hydration_enabled: data.hydration_enabled,
          workout_enabled: data.workout_enabled,
          weekend_risk_enabled: data.weekend_risk_enabled,
          clinical_warnings_enabled: data.clinical_warnings_enabled,
          motivation_enabled: data.motivation_enabled,
          non_adherence_enabled: data.non_adherence_enabled,
          custom_prompts_enabled: data.custom_prompts_enabled,
          cooldown_minutes: data.cooldown_minutes,
          max_prompts_per_day: data.max_prompts_per_day,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("intelligence_settings")
      .upsert({
        nutritionist_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: "nutritionist_id" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar configurações");
      console.error("[IntelligenceSettings]", error);
    } else {
      toast.success("Configurações salvas com sucesso!");
    }
  };

  const toggles = [
    { key: "hydration_enabled" as const, label: "Lembretes de Hidratação", icon: Droplets, desc: "Prompts automáticos de ingestão de água" },
    { key: "workout_enabled" as const, label: "Lembretes de Treino", icon: Dumbbell, desc: "Avisos próximos ao horário de treino" },
    { key: "weekend_risk_enabled" as const, label: "Alertas de Fim de Semana", icon: Moon, desc: "Prevenção de riscos em finais de semana" },
    { key: "clinical_warnings_enabled" as const, label: "Alertas Clínicos", icon: AlertTriangle, desc: "Avisos baseados em flags clínicas (intolerâncias, alergias)" },
    { key: "motivation_enabled" as const, label: "Nudges de Motivação", icon: Sparkles, desc: "Mensagens motivacionais contextuais" },
    { key: "non_adherence_enabled" as const, label: "Puxão de Orelha", icon: MessageSquare, desc: "Respostas emocionais escalonadas por baixa adesão" },
    { key: "custom_prompts_enabled" as const, label: "Mensagens Personalizadas", icon: MessageSquare, desc: "Suas mensagens customizadas na aba Mensagens" },
  ];

  if (loading) {
    return (
      <Card className="border-amber-500/20 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Module Toggles */}
      <Card className="border-amber-500/20 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-amber-500" /> Módulos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <t.icon className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{t.label}</Label>
                  <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                </div>
              </div>
              <Switch
                checked={settings[t.key]}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, [t.key]: v }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tone & Frequency */}
      <Card className="border-amber-500/20 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> Tom e Frequência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Tom Padrão</Label>
              <Select value={settings.default_tone} onValueChange={(v) => setSettings((s) => ({ ...s, default_tone: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="funny">😄 Divertido</SelectItem>
                  <SelectItem value="direct">📋 Direto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Estilo de Motivação</Label>
              <Select value={settings.default_motivation_style} onValueChange={(v) => setSettings((s) => ({ ...s, default_motivation_style: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gentle">🌸 Leve e acolhedor</SelectItem>
                  <SelectItem value="firm">💪 Firme e direto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Cooldown entre prompts: <span className="font-bold text-amber-500">{settings.cooldown_minutes} min</span></Label>
            <Slider
              value={[settings.cooldown_minutes]}
              onValueChange={([v]) => setSettings((s) => ({ ...s, cooldown_minutes: v }))}
              min={15}
              max={240}
              step={15}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>15 min</span><span>4 horas</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Máximo de prompts/dia: <span className="font-bold text-amber-500">{settings.max_prompts_per_day}</span></Label>
            <Slider
              value={[settings.max_prompts_per_day]}
              onValueChange={([v]) => setSettings((s) => ({ ...s, max_prompts_per_day: v }))}
              min={1}
              max={12}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>1</span><span>12</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full gap-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-amber-950 font-semibold shadow-lg shadow-amber-500/20">
        <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
