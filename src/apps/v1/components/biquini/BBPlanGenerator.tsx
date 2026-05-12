import { useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Label } from "@v1/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, Zap, Target, TrendingDown, Shield, Heart } from "lucide-react";

const PHASE_INFO = [
  { phase: 1, name: "Reset Metabólico", icon: Heart, color: "text-green-500", deficit: "0 kcal", description: "Adaptação sem déficit. Reeducação alimentar." },
  { phase: 2, name: "Déficit Estratégico", icon: TrendingDown, color: "text-amber-500", deficit: "400 kcal", description: "Déficit moderado com proteína elevada." },
  { phase: 3, name: "Definição Corporal", icon: Target, color: "text-red-500", deficit: "500 kcal", description: "Déficit agressivo. Proteína máxima." },
  { phase: 4, name: "Manutenção Inteligente", icon: Shield, color: "text-blue-500", deficit: "0 kcal", description: "Consolidação dos resultados." },
];

interface GenerationResult {
  success: boolean;
  mealPlanId: string;
  plan_status: string;
  items_count: number;
  explainability: {
    bb_phase: number;
    bb_phase_name: string;
    calculation: { tmb: number; tdee: number; bb_deficit: number; final_kcal: number };
    macros: { protein: number; carbs: number; fat: number };
    selected_template: { name: string; score: number; reasons: string[] };
  };
}

export default function BBPlanGenerator() {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedPhase, setSelectedPhase] = useState<string>("1");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const { data: patients } = useQuery({
    queryKey: ["bb-patients", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("nutritionist_patients")
        .select("patient_id, profiles!nutritionist_patients_patient_id_fkey(full_name, user_id)")
        .eq("nutritionist_id", user!.id)
        .eq("status", "active");
      return (data || []).map((r: any) => ({
        id: r.patient_id,
        name: r.profiles?.full_name || "Paciente",
      }));
    },
    enabled: !!user,
  });

  async function handleGenerate() {
    if (!user || !selectedPatient) {
      toast.error("Selecione um paciente");
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          patient_id: selectedPatient,
          bb_phase: parseInt(selectedPhase),
          strategy: "bikini_protocol",
          generationMode: "clinical",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success(`👙 Plano BB Fase ${selectedPhase} gerado com sucesso!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar plano BB");
    } finally {
      setGenerating(false);
    }
  }

  const phaseInfo = PHASE_INFO[parseInt(selectedPhase) - 1];

  return (
    <div className="space-y-4">
      <Card className="border-pink-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-pink-500" />
            Geração de Plano por Fase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gere um plano alimentar personalizado baseado na fase atual do Protocolo Biquíni Branco. 
            O motor aplica déficit progressivo, ajuste de macros e seleção de template específica para cada fase.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Paciente</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  {(patients || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Fase do BB</Label>
              <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHASE_INFO.map((p) => (
                    <SelectItem key={p.phase} value={String(p.phase)}>
                      Fase {p.phase} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {phaseInfo && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-pink-500/5 border border-pink-500/10">
              <phaseInfo.icon className={`w-5 h-5 mt-0.5 ${phaseInfo.color}`} />
              <div>
                <p className="font-medium text-sm">{phaseInfo.name}</p>
                <p className="text-xs text-muted-foreground">{phaseInfo.description}</p>
                <Badge variant="outline" className="mt-1 text-xs">
                  Déficit: {phaseInfo.deficit}
                </Badge>
              </div>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedPatient}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generating ? "Gerando plano..." : "Gerar Plano BB"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2 text-base">
              ✅ Plano Gerado com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground">Fase</p>
                <p className="font-bold">{result.explainability.bb_phase}</p>
                <p className="text-xs">{result.explainability.bb_phase_name}</p>
              </div>
              <div className="text-center p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground">Meta calórica</p>
                <p className="font-bold">{result.explainability.calculation.final_kcal}</p>
                <p className="text-xs">kcal/dia</p>
              </div>
              <div className="text-center p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground">Déficit</p>
                <p className="font-bold">{result.explainability.calculation.bb_deficit}</p>
                <p className="text-xs">kcal</p>
              </div>
              <div className="text-center p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground">Itens</p>
                <p className="font-bold">{result.items_count}</p>
                <p className="text-xs">refeições</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-blue-500/10">
                <p className="text-xs text-muted-foreground">Proteína</p>
                <p className="font-bold text-blue-600">{result.explainability.macros.protein}g</p>
              </div>
              <div className="p-2 rounded bg-amber-500/10">
                <p className="text-xs text-muted-foreground">Carboidratos</p>
                <p className="font-bold text-amber-600">{result.explainability.macros.carbs}g</p>
              </div>
              <div className="p-2 rounded bg-red-500/10">
                <p className="text-xs text-muted-foreground">Gorduras</p>
                <p className="font-bold text-red-600">{result.explainability.macros.fat}g</p>
              </div>
            </div>

            <div className="p-2 rounded bg-muted/30 text-xs">
              <p className="font-medium">Template: {result.explainability.selected_template.name}</p>
              <p className="text-muted-foreground">Score: {result.explainability.selected_template.score} | Status: {result.plan_status}</p>
              {result.explainability.selected_template.reasons?.length > 0 && (
                <p className="text-muted-foreground mt-1">
                  {result.explainability.selected_template.reasons.slice(0, 3).join(" • ")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
