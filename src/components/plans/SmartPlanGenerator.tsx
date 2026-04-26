import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Brain, Stethoscope, Loader2, Save, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithRetry } from "@/lib/api/edgeFunctions";
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

const OVERRIDE_BLOCKING_CODES = new Set([
  "ANAMNESIS_MISSING",
  "BODY_DATA_MISSING",
  "GOAL_MISSING",
]);

interface ProfessionalOverride {
  weight: string;
  height: string;
  age: string;
  sex: "male" | "female";
  goal: string;
  activityLevel: string;
}

const DEFAULT_OVERRIDE: ProfessionalOverride = {
  weight: "",
  height: "",
  age: "30",
  sex: "female",
  goal: "weight_loss",
  activityLevel: "moderate",
};

export default function SmartPlanGenerator({ patientId, patientName, onGenerated, onClose }: Props) {
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState<GenerationMode>("quick");
  const [generating, setGenerating] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [activePlan, setActivePlan] = useState<{ id: string; title: string; template_id: string | null } | null>(null);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);

  // Professional override (used when patient anamnesis is missing/incomplete)
  const [showOverride, setShowOverride] = useState(false);
  const [override, setOverride] = useState<ProfessionalOverride>(DEFAULT_OVERRIDE);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);

  // Check if patient already has an active plan
  useEffect(() => {
    if (!patientId) return;
    supabase
      .from("meal_plans")
      .select("id, title, template_id")
      .eq("patient_id", patientId)
      .eq("is_active", true)
      .in("plan_status", ["approved", "published_to_patient"])
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setActivePlan(data || null);
      });
  }, [patientId]);

  const handleGenerate = async () => {
    if (!user) return;

    // Warn if patient already has active plan
    if (activePlan) {
      setShowReplaceDialog(true);
      return;
    }

    await doGenerate();
  };

  const buildOverridePayload = () => {
    const w = parseFloat(override.weight);
    const h = parseFloat(override.height);
    const a = parseInt(override.age);
    if (!w || w < 20 || !h || h < 80) {
      toast.error("Informe peso (kg) e altura (cm) válidos.");
      return null;
    }
    return {
      weight: w,
      height: h,
      age: Number.isFinite(a) && a > 0 ? a : 30,
      sex: override.sex,
      goal: override.goal,
      activityLevel: override.activityLevel,
    };
  };

  const doGenerate = async (withOverride = false) => {
    if (!user) return;
    setGenerating(true);
    setShowReplaceDialog(false);

    let professionalOverride: ReturnType<typeof buildOverridePayload> = null;
    if (withOverride) {
      professionalOverride = buildOverridePayload();
      if (!professionalOverride) {
        setGenerating(false);
        return;
      }
    }

    try {
      // Ensure session is fresh before calling edge function
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast.error("Sessão expirada. Faça login novamente.");
        setGenerating(false);
        return;
      }

      toast.info(
        withOverride
          ? "⚙️ Gerando com dados informados pelo profissional..."
          : `⚡ Gerando ${MODES.find(m => m.key === selectedMode)?.label}...`
      );

      const { data, error } = await invokeWithRetry("generate-meal-plan", {
        body: {
          patientId,
          nutritionistId: user.id,
          isPipeline: false,
          generationMode: selectedMode,
          saveAsTemplate,
          ...(activePlan?.template_id ? { template_id: activePlan.template_id } : {}),
          ...(professionalOverride ? { professionalOverride } : {}),
        },
      });


      if (error || !data?.success) {
        // Edge function returned a structured error code we can recover from
        const errCode: string | undefined = data?.code;
        const overrideSupported = !!data?.professional_override_supported;

        if (errCode && OVERRIDE_BLOCKING_CODES.has(errCode) && overrideSupported && !withOverride) {
          setLastErrorCode(errCode);
          setShowOverride(true);
          toast.warning(
            "Dados do paciente incompletos. Preencha os campos abaixo para gerar o plano agora mesmo."
          );
          return;
        }

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

      {/* Active plan warning banner */}
      {activePlan && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-amber-700 dark:text-amber-400">
            Este paciente já possui um plano ativo: <strong>{activePlan.title || "Plano Ativo"}</strong>. 
            Ao gerar um novo, o anterior será substituído.
          </span>
        </div>
      )}

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

      {/* Professional override panel — appears when patient data is missing */}
      {showOverride && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Modo Profissional — Gerar Mesmo Assim</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {lastErrorCode === "ANAMNESIS_MISSING"
              ? "O paciente ainda não preencheu a anamnese. Informe os dados clínicos básicos para liberar o plano."
              : lastErrorCode === "BODY_DATA_MISSING"
              ? "Peso e altura do paciente não estão registrados. Informe abaixo."
              : "Defina o objetivo clínico para liberar o plano."}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={override.weight}
                onChange={(e) => setOverride({ ...override, weight: e.target.value })}
                placeholder="Ex: 72"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Altura (cm)</Label>
              <Input
                type="number"
                value={override.height}
                onChange={(e) => setOverride({ ...override, height: e.target.value })}
                placeholder="Ex: 165"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Idade</Label>
              <Input
                type="number"
                value={override.age}
                onChange={(e) => setOverride({ ...override, age: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sexo</Label>
              <Select value={override.sex} onValueChange={(v) => setOverride({ ...override, sex: v as "male" | "female" })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="male">Masculino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Objetivo</Label>
              <Select value={override.goal} onValueChange={(v) => setOverride({ ...override, goal: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight_loss">Emagrecimento</SelectItem>
                  <SelectItem value="hypertrophy">Hipertrofia</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="health">Saúde geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Nível de atividade</Label>
              <Select value={override.activityLevel} onValueChange={(v) => setOverride({ ...override, activityLevel: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentário</SelectItem>
                  <SelectItem value="light">Leve</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="very_active">Muito ativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => doGenerate(true)}
            disabled={generating}
            className="w-full gap-2"
            variant="default"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
            ) : (
              <><ShieldCheck className="w-4 h-4" /> Gerar com dados informados</>
            )}
          </Button>
        </div>
      )}

      {/* Generate button */}
      {!showOverride && (
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
      )}

      {onClose && (
        <Button variant="ghost" onClick={onClose} className="w-full text-sm">
          Cancelar
        </Button>
      )}

      {/* Replace active plan confirmation */}
      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Paciente já possui plano ativo
            </AlertDialogTitle>
            <AlertDialogDescription>
              O paciente <strong>{patientName}</strong> já possui o plano <strong>"{activePlan?.title || "Plano Ativo"}"</strong> ativo. 
              Ao gerar um novo plano e publicá-lo, o plano anterior será automaticamente arquivado.
              <br /><br />
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => doGenerate(false)} className="gradient-primary">
              Substituir e Gerar Novo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
