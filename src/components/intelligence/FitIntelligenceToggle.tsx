/**
 * Admin toggle to enable FitJourney Intelligence for a patient.
 * Used inside PatientDetail page by nutritionists/admins.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, Loader2 } from "lucide-react";

interface Props {
  patientId: string;
  enabled: boolean;
  onboarded: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function FitIntelligenceToggle({ patientId, enabled, onboarded, onToggle }: Props) {
  const [saving, setSaving] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ fit_intelligence_enabled: checked } as any)
      .eq("user_id", patientId);

    if (error) {
      console.warn("[FitIntelligence] Toggle error:", error.message);
      toast.error("Não foi possível atualizar. Tente novamente.");
    } else {
      toast.success(checked ? "Inteligência FitJourney ativada! 🧠" : "Inteligência FitJourney desativada");
      onToggle(checked);
    }
    setSaving(false);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-primary/15 bg-primary/5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Label className="font-semibold text-sm">Inteligência FitJourney</Label>
            {onboarded && <Badge variant="outline" className="text-[10px] py-0 text-primary border-primary/30">Configurada</Badge>}
          </div>
          <p className="text-[10px] text-muted-foreground">Assistente comportamental adaptativo para o paciente</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
      </div>
    </div>
  );
}
