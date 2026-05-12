import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Beef, Wheat, Droplets, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useMealPlanEditorV2Store, type MealPlanItem, type MealType } from "@/stores/mealPlanEditorV2Store";
import { toast } from "sonner";

interface MacroEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MealPlanItem;
}

export function MacroEditDialog({ open, onOpenChange, item }: MacroEditDialogProps) {
  const { items, updateItem } = useMealPlanEditorV2Store();
  const [calories, setCalories] = useState(String(item.calories_target ?? ""));
  const [protein, setProtein] = useState(String(Number(item.protein_target) || ""));
  const [carbs, setCarbs] = useState(String(Number(item.carbs_target) || ""));
  const [fat, setFat] = useState(String(Number(item.fat_target) || ""));
  const [applyAll, setApplyAll] = useState(false);

  const mealTypeLabels: Record<string, string> = {
    breakfast: "Café da Manhã",
    morning_snack: "Lanche da Manhã",
    lunch: "Almoço",
    afternoon_snack: "Lanche da Tarde",
    dinner: "Jantar",
    evening_snack: "Ceia",
  };

  const handleSave = () => {
    const patch: Partial<MealPlanItem> = {
      calories_target: calories ? Number(calories) : null,
      protein_target: protein ? Number(protein) : null,
      carbs_target: carbs ? Number(carbs) : null,
      fat_target: fat ? Number(fat) : null,
    };

    updateItem(item.id, patch);

    if (applyAll) {
      // Find same meal_type + same title items on other days
      const siblings = items.filter(
        (i) =>
          i.id !== item.id &&
          i.meal_type === item.meal_type &&
          i.title.toLowerCase().trim() === item.title.toLowerCase().trim()
      );
      siblings.forEach((s) => updateItem(s.id, patch));
      toast.success(
        `Macros atualizados em ${siblings.length + 1} itens "${item.title}" no ${mealTypeLabels[item.meal_type] || item.meal_type}`
      );
    } else {
      toast.success("Macros atualizados");
    }

    onOpenChange(false);
  };

  // Count siblings for the label
  const siblingCount = items.filter(
    (i) =>
      i.id !== item.id &&
      i.meal_type === item.meal_type &&
      i.title.toLowerCase().trim() === item.title.toLowerCase().trim()
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Editar Macros — {item.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" /> Calorias
            </Label>
            <Input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="kcal"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1">
              <Beef className="w-3 h-3 text-red-400" /> Proteína (g)
            </Label>
            <Input
              type="number"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="g"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1">
              <Wheat className="w-3 h-3 text-amber-500" /> Carboidratos (g)
            </Label>
            <Input
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              placeholder="g"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-400" /> Gordura (g)
            </Label>
            <Input
              type="number"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              placeholder="g"
              className="h-8 text-xs"
            />
          </div>
        </div>

        {siblingCount > 0 && (
          <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
            <Checkbox
              id="apply-all"
              checked={applyAll}
              onCheckedChange={(v) => setApplyAll(!!v)}
              className="mt-0.5"
            />
            <label htmlFor="apply-all" className="text-[11px] leading-tight cursor-pointer">
              <span className="font-medium flex items-center gap-1">
                <Copy className="w-3 h-3" /> Aplicar em todos os dias
              </span>
              <span className="text-muted-foreground block mt-0.5">
                Atualizar "{item.title}" nos outros {siblingCount} dia(s) da semana também
              </span>
            </label>
          </div>
        )}

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
