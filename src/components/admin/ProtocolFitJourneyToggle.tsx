import { useState, useEffect } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Switch } from "@v1/components/ui/switch";
import { Label } from "@v1/components/ui/label";
import { Input } from "@v1/components/ui/input";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { toast } from "sonner";
import { Zap, Shield, Clock, Users, FolderOpen, Loader2, CheckCircle2 } from "lucide-react";

interface Settings {
  is_enabled: boolean;
  apply_to_existing_patients: boolean;
  apply_to_new_patients: boolean;
  apply_to_programs: boolean;
  auto_generate_plan: boolean;
  require_approval: boolean;
  plan_validity_days: number;
}

const DEFAULT: Settings = {
  is_enabled: true,
  apply_to_existing_patients: false,
  apply_to_new_patients: true,
  apply_to_programs: true,
  auto_generate_plan: true,
  require_approval: true,
  plan_validity_days: 30,
};

export default function ProtocolFitJourneyToggle() {
  const { user, roles } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasRecord, setHasRecord] = useState(false);

  // Only show for nutritionists/admins
  const isNutritionist = roles?.includes("nutritionist") || roles?.includes("admin");
  
  useEffect(() => {
    if (user && isNutritionist) fetchSettings();
    else setLoading(false);
  }, [user, isNutritionist]);

  if (!isNutritionist) return null;

  async function fetchSettings() {
    const { data } = await supabase
      .from("protocol_master_settings")
      .select("*")
      .eq("nutritionist_id", user!.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setSettings({
        is_enabled: d.is_enabled,
        apply_to_existing_patients: d.apply_to_existing_patients,
        apply_to_new_patients: d.apply_to_new_patients,
        apply_to_programs: d.apply_to_programs,
        auto_generate_plan: d.auto_generate_plan,
        require_approval: d.require_approval,
        plan_validity_days: d.plan_validity_days,
      });
      setHasRecord(true);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const payload = { ...settings, nutritionist_id: user.id, updated_at: new Date().toISOString() };

    if (hasRecord) {
      await supabase.from("protocol_master_settings").update(payload).eq("nutritionist_id", user.id);
    } else {
      await supabase.from("protocol_master_settings").insert(payload);
      setHasRecord(true);
    }
    toast.success("Protocolo FitJourney salvo!");
    setSaving(false);
  }

  if (loading) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Protocolo FitJourney
          </span>
          <Badge variant={settings.is_enabled ? "default" : "secondary"}>
            {settings.is_enabled ? "Ativo" : "Inativo"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Motor clínico determinístico que gera pré-planos alimentares automaticamente com base na anamnese, sem IA generativa.
        </p>

        {/* Master toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-primary" />
            <div>
              <Label className="font-semibold">Ativar Protocolo FitJourney</Label>
              <p className="text-xs text-muted-foreground">Habilita geração automática de planos</p>
            </div>
          </div>
          <Switch checked={settings.is_enabled} onCheckedChange={(v) => setSettings({ ...settings, is_enabled: v })} />
        </div>

        {settings.is_enabled && (
          <div className="space-y-3">
            {/* Scope settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label>Aplicar a novos pacientes</Label>
              </div>
              <Switch checked={settings.apply_to_new_patients} onCheckedChange={(v) => setSettings({ ...settings, apply_to_new_patients: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label>Aplicar a pacientes existentes</Label>
              </div>
              <Switch checked={settings.apply_to_existing_patients} onCheckedChange={(v) => setSettings({ ...settings, apply_to_existing_patients: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <Label>Aplicar a projetos/programas</Label>
              </div>
              <Switch checked={settings.apply_to_programs} onCheckedChange={(v) => setSettings({ ...settings, apply_to_programs: v })} />
            </div>

            {/* Plan settings */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <Label>Gerar pré-plano automaticamente</Label>
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
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label>Validade do plano (dias)</Label>
                </div>
                <Input
                  type="number"
                  className="w-20"
                  value={settings.plan_validity_days}
                  onChange={(e) => setSettings({ ...settings, plan_validity_days: Number(e.target.value) })}
                  min={7}
                  max={180}
                />
              </div>
            </div>
          </div>
        )}

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}
