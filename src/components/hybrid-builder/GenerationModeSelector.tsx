import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap, Brain, Stethoscope, Loader2, Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";

type GenerationMode = "quick" | "smart" | "clinical";

interface Props {
  patientId: string;
  onGenerated: () => void;
}

const MODES: { key: GenerationMode; icon: typeof Zap; label: string; subtitle: string; time: string }[] = [
  { key: "quick", icon: Zap, label: "⚡ Plano Rápido", subtitle: "Gera em ~10s", time: "~10s" },
  { key: "smart", icon: Brain, label: "🧠 Plano Inteligente", subtitle: "IFJ + histórico", time: "~15s" },
  { key: "clinical", icon: Stethoscope, label: "👨‍⚕️ Plano Clínico", subtitle: "Protocolos clínicos", time: "~15s" },
];

export default function GenerationModeSelector({ patientId, onGenerated }: Props) {
  const { user } = useAuth();
  const store = useMealPlanEditorV2Store();
  const [generating, setGenerating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GenerationMode>("quick");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const handleGenerate = async () => {
    if (!user || !store.planId) return;
    setGenerating(true);

    try {
      toast.info(`Gerando ${MODES.find(m => m.key === selectedMode)?.label}...`);

      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          patientId,
          nutritionistId: user.id,
          existingPlanId: store.planId,
          isPipeline: false,
          generationMode: selectedMode,
          saveAsTemplate,
        },
      });

      if (error || !data?.success) {
        const msg = error
          ? await friendlyEdgeFunctionError(error, "Erro ao gerar")
          : (data?.error || "Erro desconhecido");
        toast.error(msg);
        return;
      }

      // Reload the plan in the store
      await store.hydrate(data.mealPlanId || store.planId, user.id);
      toast.success(`✅ Plano gerado com ${data.items_count || 0} refeições!`);
      onGenerated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-wider">Geração Automática</h3>
      </div>

      <div className="space-y-2">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.key;
          return (
            <button
              key={mode.key}
              onClick={() => setSelectedMode(mode.key)}
              className={`flex items-center gap-2 p-2.5 rounded-lg border w-full text-left text-xs transition-all ${
                isSelected
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{mode.label}</p>
                <p className="text-[10px] text-muted-foreground">{mode.subtitle}</p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{mode.time}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
        <div className="flex items-center gap-1.5">
          <Save className="w-3 h-3 text-muted-foreground" />
          <Label htmlFor="save-tpl" className="text-xs cursor-pointer">Salvar como template</Label>
        </div>
        <Switch id="save-tpl" checked={saveAsTemplate} onCheckedChange={setSaveAsTemplate} />
      </div>

      <Button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full h-9 text-xs gap-2 gradient-primary shadow-glow"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Gerar no Canvas
          </>
        )}
      </Button>
    </div>
  );
}
