import { useState, useCallback } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useMealPlanEditorV2Store, type MealType, type MealPlanItem } from "@v1/stores/mealPlanEditorV2Store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Bookmark, Loader2, Flame, Beef } from "lucide-react";
import { toast } from "sonner";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MealPlanItem[];
  mealType: MealType;
}

const GOAL_OPTIONS = [
  "emagrecimento", "hipertrofia", "manutenção", "saúde",
  "low carb", "cetogênica", "anti-inflamatório", "resistência à insulina"
];

export function SaveTemplateDialog({ open, onOpenChange, items, mealType }: SaveTemplateDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const totalKcal = items.reduce((s, i) => s + (i.calories_target || 0), 0);
  const totalProtein = items.reduce((s, i) => s + (Number(i.protein_target) || 0), 0);
  const totalCarbs = items.reduce((s, i) => s + (Number(i.carbs_target) || 0), 0);
  const totalFat = items.reduce((s, i) => s + (Number(i.fat_target) || 0), 0);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = useCallback(async () => {
    if (!user?.id || !name.trim()) return;
    setSaving(true);

    const foodsStructure = items.map((i) => ({
      name: i.title,
      portion: i.description || "",
      kcal: i.calories_target || 0,
      protein: Number(i.protein_target) || 0,
      carbs: Number(i.carbs_target) || 0,
      fat: Number(i.fat_target) || 0,
    }));

    const { error } = await supabase.from("nutritionist_meal_templates").insert({
      nutritionist_id: user.id,
      name: name.trim(),
      meal_type: mealType,
      kcal_base: totalKcal,
      protein_base: totalProtein,
      carbs_base: totalCarbs,
      fat_base: totalFat,
      foods_structure: foodsStructure,
      goal_tags: selectedTags,
      complexity_level: "medium",
    });

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar modelo");
    } else {
      toast.success("Modelo salvo na biblioteca!");
      onOpenChange(false);
      setName("");
      setSelectedTags([]);
    }
  }, [user?.id, name, items, mealType, totalKcal, totalProtein, totalCarbs, totalFat, selectedTags, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary" />
            Salvar como Modelo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Nome do modelo</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Café proteico low carb"
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" />{totalKcal} kcal</span>
            <span className="flex items-center gap-1"><Beef className="w-3 h-3 text-red-400" />{totalProtein.toFixed(0)}g prot</span>
            <span>{items.length} itens</span>
          </div>

          <div>
            <Label className="text-xs">Tags de objetivo</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {GOAL_OPTIONS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer text-[10px] h-6"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bookmark className="w-4 h-4 mr-2" />}
            Salvar Modelo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
