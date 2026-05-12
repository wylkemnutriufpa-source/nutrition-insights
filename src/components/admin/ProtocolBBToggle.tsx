import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Shield, Loader2, CheckCircle2, Flame } from "lucide-react";

interface BBSettings {
  is_enabled: boolean;
  auto_generate_plan: boolean;
  require_approval: boolean;
  enforce_phase_blocks: boolean;
  weight_check_day: number;
  photo_check_day: number;
  phase_duration_days: number;
  min_adherence_transition: number;
  deficit_phase1: number;
  deficit_phase2: number;
  deficit_phase3: number;
  maintenance_phase4: boolean;
}

const DEFAULT: BBSettings = {
  is_enabled: true,
  auto_generate_plan: true,
  require_approval: true,
  enforce_phase_blocks: true,
  weight_check_day: 16,
  photo_check_day: 31,
  phase_duration_days: 30,
  min_adherence_transition: 70,
  deficit_phase1: 0,
  deficit_phase2: 400,
  deficit_phase3: 500,
  maintenance_phase4: true,
};

export default function ProtocolBBToggle() {
  const { user, roles } = useAuth();
  const [settings, setSettings] = useState<BBSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isNutritionist = roles?.includes("nutritionist") || roles?.includes("admin");

  useEffect(() => {
    if (user && isNutritionist) fetchSettings();
    else setLoading(false);
  }, [user, isNutritionist]);

  if (!isNutritionist) return null;

  async function fetchSettings() {
    const { data } = await (supabase as any)
      .from("site_settings")
      .select("*")
      .eq("setting_key", "protocol_bb_settings")
      .maybeSingle();
    if (data?.setting_value) {
      setSettings({ ...DEFAULT, ...data.setting_value });
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any).from("site_settings").upsert({
      setting_key: "protocol_bb_settings",
      setting_value: settings,
      setting_type: "json",
      category: "protocol",
      label: "Protocolo Biquíni Branco - Configurações",
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Protocolo Biquíni Branco salvo! 👙");
    }
  }

  if (loading) return null;

  return (
    <Card className="border-pink-500/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500" />
            Protocolo Biquíni Branco
          </span>
          <Badge variant={settings.is_enabled ? "default" : "secondary"} className={settings.is_enabled ? "bg-pink-500" : ""}>
            {settings.is_enabled ? "Ativo" : "Inativo"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Protocolo clínico de 4 fases para transformação corporal com controle de déficit progressivo, bloqueios mandatórios e transições por adesão.
        </p>

        {/* Master toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-pink-500/5 border border-pink-500/10">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-pink-500" />
            <div>
              <Label className="font-semibold">Ativar Protocolo Biquíni Branco</Label>
              <p className="text-xs text-muted-foreground">Habilita motor de geração com fases do BB</p>
            </div>
          </div>
          <Switch checked={settings.is_enabled} onCheckedChange={(v) => setSettings({ ...settings, is_enabled: v })} />
        </div>

        {settings.is_enabled && (
          <div className="space-y-3">
            {/* Generation settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-muted-foreground" />
                <Label>Gerar plano automático por fase</Label>
              </div>
              <Switch checked={settings.auto_generate_plan} onCheckedChange={(v) => setSettings({ ...settings, auto_generate_plan: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                <Label>Exigir aprovação do profissional</Label>
              </div>
              <Switch checked={settings.require_approval} onCheckedChange={(v) => setSettings({ ...settings, require_approval: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <Label>Bloqueios mandatórios (peso/fotos)</Label>
              </div>
              <Switch checked={settings.enforce_phase_blocks} onCheckedChange={(v) => setSettings({ ...settings, enforce_phase_blocks: v })} />
            </div>

            {/* Phase parameters */}
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parâmetros de Fase</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Duração por fase (dias)</Label>
                  <Input
                    type="number" className="mt-1" value={settings.phase_duration_days}
                    onChange={(e) => setSettings({ ...settings, phase_duration_days: Number(e.target.value) })}
                    min={14} max={60}
                  />
                </div>
                <div>
                  <Label className="text-xs">Adesão mín. p/ transição (%)</Label>
                  <Input
                    type="number" className="mt-1" value={settings.min_adherence_transition}
                    onChange={(e) => setSettings({ ...settings, min_adherence_transition: Number(e.target.value) })}
                    min={50} max={100}
                  />
                </div>
                <div>
                  <Label className="text-xs">Check peso (dia)</Label>
                  <Input
                    type="number" className="mt-1" value={settings.weight_check_day}
                    onChange={(e) => setSettings({ ...settings, weight_check_day: Number(e.target.value) })}
                    min={7} max={30}
                  />
                </div>
                <div>
                  <Label className="text-xs">Check fotos (dia)</Label>
                  <Input
                    type="number" className="mt-1" value={settings.photo_check_day}
                    onChange={(e) => setSettings({ ...settings, photo_check_day: Number(e.target.value) })}
                    min={14} max={45}
                  />
                </div>
              </div>
            </div>

            {/* Deficit by phase */}
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Déficit Calórico por Fase</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Fase 1 (Reset)</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number" value={settings.deficit_phase1}
                      onChange={(e) => setSettings({ ...settings, deficit_phase1: Number(e.target.value) })}
                      min={0} max={300}
                    />
                    <span className="text-xs text-muted-foreground">kcal</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Fase 2 (Déficit)</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number" value={settings.deficit_phase2}
                      onChange={(e) => setSettings({ ...settings, deficit_phase2: Number(e.target.value) })}
                      min={200} max={600}
                    />
                    <span className="text-xs text-muted-foreground">kcal</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Fase 3 (Definição)</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number" value={settings.deficit_phase3}
                      onChange={(e) => setSettings({ ...settings, deficit_phase3: Number(e.target.value) })}
                      min={300} max={700}
                    />
                    <span className="text-xs text-muted-foreground">kcal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Button onClick={handleSave} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}
