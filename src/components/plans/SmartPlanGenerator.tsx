import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Brain, Stethoscope, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";

type GenerationMode = "quick" | "smart" | "clinical";

interface Props {
  patientId: string;
  patientName?: string;
  onGenerated: (planId: string) => void;
  onClose?: () => void;
}

const MODES: { key: GenerationMode; icon: typeof Zap; label: string; subtitle: string; time: string; colorClass: string }[] = [
  {
    key: "quick",
    icon: Zap,
    label: "Plano Rápido",
    subtitle: "Gera em ~10s com base na anamnese",
    time: "~10s",
    colorClass: "border-amber-500/40 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10",
  },
  {
    key: "smart",
    icon: Brain,
    label: "Plano Inteligente",
    subtitle: "IFJ + histórico + preferências do paciente",
    time: "~15s",
    colorClass: "border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10",
  },
  {
    key: "clinical",
    icon: Stethoscope,
    label: "Plano Clínico",
    subtitle: "Baseado em protocolos nutricionais",
    time: "~15s",
    colorClass: "border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10",
  },
];

export default function SmartPlanGenerator({ patientId, patientName, onGenerated, onClose }: Props) {
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState<GenerationMode>("quick");
  const [generating, setGenerating] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);

    try {
      toast.info(`⚡ Gerando ${MODES.find(m => m.key === selectedMode)?.label}...`);

      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          patientId,
          nutritionistId: user.id,
          isPipeline: false,
          generationMode: selectedMode,
          saveAsTemplate,
        },
      });

      if (error || !data?.success) {
        const msg = error
          ? await friendlyEdgeFunctionError(error, "Erro ao gerar plano")
          : (data?.error || "Erro desconhecido ao gerar plano");
        toast.error(msg);
        return;
      }

      toast.success(`✅ Plano gerado com ${data.items_count || 0} refeições!`);
      if (saveAsTemplate) {
        toast.info("📋 Plano salvo como template reutilizável");
      }
      onGenerated(data.mealPlanId);
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Tente novamente"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="font-display text-lg font-bold">⚡ Gerador Inteligente</h3>
        {patientName && (
          <p className="text-sm text-muted-foreground mt-1">Paciente: {patientName}</p>
        )}
      </div>

      {/* Mode selection */}
      <div className="grid gap-3">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.key;
          return (
            <motion.button
              key={mode.key}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedMode(mode.key)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left w-full ${
                isSelected
                  ? mode.colorClass + " ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30 bg-transparent"
              }`}
            >
              <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{mode.label}</p>
                <p className="text-xs text-muted-foreground">{mode.subtitle}</p>
              </div>
              <span className="text-xs text-muted-foreground font-mono">{mode.time}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Save as template toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <Save className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="save-template" className="text-sm cursor-pointer">
            Salvar como template reutilizável
          </Label>
        </div>
        <Switch
          id="save-template"
          checked={saveAsTemplate}
          onCheckedChange={setSaveAsTemplate}
        />
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={generating || !patientId}
        className="w-full gradient-primary shadow-glow gap-2 h-12 text-base"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Gerando plano...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Gerar Plano em 10s
          </>
        )}
      </Button>

      {onClose && (
        <Button variant="ghost" onClick={onClose} className="w-full text-sm">
          Cancelar
        </Button>
      )}
    </div>
  );
}
