import { useState } from "react";
import { Button } from "@v1/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@v1/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { Wand2, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { MealPlanItem } from "@v1/stores/mealPlanEditorV2Store";
import {
  calculatePlanSimplicityScore,
  type MealItemForAudit,
} from "@v1/lib/planSimplicityEngine";
import {
  generateSimplificationPreview,
  generateSimplifiedMealPlanVersion,
  type SimplificationPreview,
} from "@v1/lib/planSimplificationGenerator";
import PlanSimplicityScoreCard from "./PlanSimplicityScoreCard";
import SimplificationAuditPanel from "./SimplificationAuditPanel";
import PlanComparisonView from "./PlanComparisonView";
import BlockedFoodsBadgeList from "./BlockedFoodsBadgeList";

interface SimplifyPlanButtonProps {
  planId: string;
  patientId: string;
  nutritionistId: string;
  tenantId: string;
  items: MealPlanItem[];
  onSimplified?: (newPlanId: string) => void;
}

export default function SimplifyPlanButton({
  planId,
  patientId,
  nutritionistId,
  tenantId,
  items,
  onSimplified,
}: SimplifyPlanButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SimplificationPreview | null>(null);
  const [saved, setSaved] = useState(false);
  const [newPlanId, setNewPlanId] = useState<string | null>(null);

  // Quick score for badge
  const auditItems: MealItemForAudit[] = items.map(i => ({
    id: i.id,
    title: i.title,
    description: i.description,
    meal_type: i.meal_type,
    day_of_week: i.day_of_week,
    calories_target: i.calories_target,
    protein_target: i.protein_target,
    carbs_target: i.carbs_target,
    fat_target: i.fat_target,
  }));
  const quickScore = calculatePlanSimplicityScore(auditItems);

  const handleOpen = () => {
    const p = generateSimplificationPreview(items);
    setPreview(p);
    setSaved(false);
    setNewPlanId(null);
    setOpen(true);
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const result = await generateSimplifiedMealPlanVersion(
        planId, patientId, nutritionistId, tenantId
      );
      if (result.success && result.newPlanId) {
        setSaved(true);
        setNewPlanId(result.newPlanId);
        toast.success("Versão simplificada salva como draft!", {
          description: `Score: ${result.originalScore.total} → ${result.simplifiedScore.total}`,
        });
        onSimplified?.(result.newPlanId);
      } else {
        toast.error("Falha ao gerar versão simplificada", {
          description: result.warnings.join(", "),
        });
      }
    } catch (err) {
      console.error("[SimplifyPlan] Error:", err);
      toast.error("Erro inesperado ao simplificar plano");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={quickScore.total < 75 ? "destructive" : "outline"}
        size="sm"
        onClick={handleOpen}
        className="gap-1.5"
      >
        <Wand2 className="w-4 h-4" />
        Simplificar Plano
        {quickScore.total < 90 && (
          <span className="ml-1 text-[10px] opacity-80">({quickScore.total}/100)</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Motor de Simplificação Inteligente
            </DialogTitle>
            <DialogDescription>
              Análise e simplificação automática do plano alimentar para maior adesão
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <Tabs defaultValue="score" className="mt-2">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="score">Score</TabsTrigger>
                <TabsTrigger value="audit">Auditoria</TabsTrigger>
                <TabsTrigger value="comparison">Comparação</TabsTrigger>
              </TabsList>

              <TabsContent value="score" className="space-y-3 mt-3">
                <PlanSimplicityScoreCard score={preview.originalScore} />
                <BlockedFoodsBadgeList blockedFoods={preview.originalScore.blockedFoodsFound} />

                {preview.projectedScore.total > preview.originalScore.total && (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center space-y-1">
                    <p className="text-sm font-semibold text-green-700">
                      Score projetado após simplificação: {preview.projectedScore.total}/100
                    </p>
                    <p className="text-xs text-green-600">
                      +{preview.projectedScore.total - preview.originalScore.total} pontos · {preview.replacementsApplied} substituições · {preview.issuesResolved} problemas resolvidos
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="audit" className="mt-3">
                <SimplificationAuditPanel issues={preview.originalScore.issues} />
              </TabsContent>

              <TabsContent value="comparison" className="mt-3">
                <PlanComparisonView
                  originalItems={preview.originalItems}
                  simplifiedItems={preview.simplifiedItems}
                  originalScore={preview.originalScore}
                  projectedScore={preview.projectedScore}
                />
              </TabsContent>
            </Tabs>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2">
            {saved ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Draft salvo com sucesso!</span>
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Fechar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={loading || (preview?.originalScore.total ?? 100) >= 90}
                  className="gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  Gerar Versão Simplificada
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
