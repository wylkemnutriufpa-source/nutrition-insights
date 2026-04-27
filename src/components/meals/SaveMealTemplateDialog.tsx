import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bookmark, Loader2, Sparkles, Tag } from "lucide-react";

interface MealItemForTemplate {
  title: string;
  description?: string | null;
  calories_target?: number | null;
  protein_target?: number | null;
  carbs_target?: number | null;
  fat_target?: number | null;
}

interface SaveMealTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MealItemForTemplate[];
  mealType: string;
  defaultName?: string;
  onSaved?: () => void;
}

const GOAL_OPTIONS = [
  "emagrecimento", "hipertrofia", "manutenção", "saúde",
  "low carb", "cetogênica", "anti-inflamatório", "resistência à insulina"
];

export default function SaveMealTemplateDialog({
  open, onOpenChange, items, mealType, defaultName, onSaved
}: SaveMealTemplateDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState(defaultName || "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [complexity, setComplexity] = useState("medium");
  const [saving, setSaving] = useState(false);

  const totalKcal = (items || []).reduce((s, i) => s + (i.calories_target || 0), 0);
  const totalProtein = (items || []).reduce((s, i) => s + (Number(i.protein_target) || 0), 0);
  const totalCarbs = (items || []).reduce((s, i) => s + (Number(i.carbs_target) || 0), 0);
  const totalFat = (items || []).reduce((s, i) => s + (Number(i.fat_target) || 0), 0);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);

    const foodsStructure = items.map(item => ({
      name: item.title,
      portion_grams: parseInt(item.description?.replace(/[^\d]/g, '') || '100') || 100,
      calories: item.calories_target || 0,
      protein: Number(item.protein_target) || 0,
      carbs: Number(item.carbs_target) || 0,
      fat: Number(item.fat_target) || 0,
      substitutions: [],
    }));

    const { error } = await supabase.from("nutritionist_meal_templates").insert({
      nutritionist_id: user.id,
      name: name.trim(),
      meal_type: mealType,
      goal_tags: selectedTags,
      kcal_base: totalKcal,
      protein_base: totalProtein,
      carbs_base: totalCarbs,
      fat_base: totalFat,
      foods_structure: foodsStructure,
      complexity_level: complexity,
      satiety_score: 5,
    });

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar template: " + error.message);
    } else {
      toast.success("Template salvo na sua biblioteca! ⭐");
      onOpenChange(false);
      setName("");
      setSelectedTags([]);
      onSaved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Salvar como Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label className="text-xs">Nome do Template</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Café da manhã proteico"
              className="mt-1"
            />
          </div>

          {/* Macro preview */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">Kcal</p>
              <p className="text-sm font-bold">{totalKcal}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">Prot</p>
              <p className="text-sm font-bold">{Math.round(totalProtein)}g</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">Carb</p>
              <p className="text-sm font-bold">{Math.round(totalCarbs)}g</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">Gord</p>
              <p className="text-sm font-bold">{Math.round(totalFat)}g</p>
            </div>
          </div>

          {/* Foods list */}
          <div className="text-xs space-y-1 bg-muted/30 rounded-lg p-2.5">
            <p className="font-medium text-[10px] text-muted-foreground uppercase">Alimentos ({items.length})</p>
            {items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span>{item.title}</span>
                <span className="text-muted-foreground">{item.calories_target || 0} kcal</span>
              </div>
            ))}
          </div>

          {/* Goal tags */}
          <div>
            <Label className="text-xs flex items-center gap-1 mb-2">
              <Tag className="w-3 h-3" /> Objetivo / Tags
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {GOAL_OPTIONS.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer text-[10px] capitalize"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Complexity */}
          <div>
            <Label className="text-xs">Complexidade</Label>
            <Select value={complexity} onValueChange={setComplexity}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simples (3-4 alimentos)</SelectItem>
                <SelectItem value="medium">Médio (5-7 alimentos)</SelectItem>
                <SelectItem value="complex">Complexo (8+ alimentos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Salvar na Biblioteca
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
