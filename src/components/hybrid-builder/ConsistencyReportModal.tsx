
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Calculator } from "lucide-react";

interface RecipeSummary {
  name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_fixed: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: RecipeSummary[];
  targetKcal?: number;
}

export default function ConsistencyReportModal({ open, onOpenChange, recipes, targetKcal }: Props) {
  const lunchCount = recipes.filter(r => r.meal_type === "lunch" || r.meal_type === "almoço").length;
  const dinnerCount = recipes.filter(r => r.meal_type === "dinner" || r.meal_type === "jantar").length;
  const fixedLunchCount = recipes.filter(r => (r.meal_type === "lunch" || r.meal_type === "almoço") && r.is_fixed).length;
  const fixedDinnerCount = recipes.filter(r => (r.meal_type === "dinner" || r.meal_type === "jantar") && r.is_fixed).length;

  const hasIssues = recipes.some(r => r.calories === 0 || r.protein === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Relatório de Consistência - Marmitas
          </DialogTitle>
          <DialogDescription>
            Auditoria rápida de receitas e nutrientes para geração de planos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-xs font-bold mb-2">Contagem de Receitas</p>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>Almoço Total:</span>
                <span className="font-mono">{lunchCount}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Jantar Total:</span>
                <span className="font-mono">{dinnerCount}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1 border-t">
                <span>Almoço Fixo:</span>
                <span className={fixedLunchCount >= 19 ? "text-success font-bold" : "text-warning font-bold"}>
                  {fixedLunchCount}/19
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Jantar Fixo:</span>
                <span className={fixedDinnerCount >= 19 ? "text-success font-bold" : "text-warning font-bold"}>
                  {fixedDinnerCount}/19
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs font-bold mb-2">Resumo Nutricional</p>
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="text-xs">Alvo do Paciente: <strong>{targetKcal || "---"} kcal</strong></span>
            </div>
            {hasIssues ? (
              <div className="flex items-center gap-1.5 text-destructive animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">RECEITAS COM MACROS ZERADOS!</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">Todos os macros preenchidos.</span>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 border rounded-md">
          <div className="p-4 space-y-3">
            {recipes.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Nenhuma receita encontrada.</p>
            ) : (
              recipes.map((recipe, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-md border-b last:border-0 transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{recipe.name}</span>
                      {recipe.is_fixed && <Badge variant="secondary" className="h-4 text-[8px] uppercase">FIXA</Badge>}
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase">{recipe.meal_type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-bold ${recipe.calories === 0 ? "text-destructive" : ""}`}>
                        {recipe.calories} kcal
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        P:{recipe.protein}g C:{recipe.carbs}g F:{recipe.fat}g
                      </span>
                    </div>
                    { (recipe.calories === 0 || recipe.protein === 0) && (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
