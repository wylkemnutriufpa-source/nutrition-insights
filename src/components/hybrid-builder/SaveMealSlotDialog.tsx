import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { useMealPlanEditorV2Store, type MealType, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { toast } from "sonner";
import { Save, Loader2, Trash2, FolderOpen } from "lucide-react";

interface MealTemplate {
  id: string;
  name: string;
  meal_type: string | null;
  items: any[];
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "save" | "load";
  day: number;
  mealType: MealType;
  items: MealPlanItem[];
}

export default function SaveMealSlotDialog({ open, onOpenChange, mode, day, mealType, items }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const store = useMealPlanEditorV2Store();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && mode === "load") loadTemplates();
  }, [open, mode]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("saved_meal_templates" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setTemplates((data as unknown as MealTemplate[]) || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    try {
      const templateItems = items.map((item) => ({
        title: item.title,
        description: item.description,
        calories_target: item.calories_target,
        protein_target: item.protein_target,
        carbs_target: item.carbs_target,
        fat_target: item.fat_target,
        image_url: item.image_url,
        item_origin: (item as any).item_origin,
      }));

      const { error } = await supabase.from("saved_meal_templates" as any).insert({
        user_id: user.id,
        tenant_id: tenantId || null,
        name: name.trim(),
        meal_type: mealType,
        items: templateItems,
      });

      if (error) throw error;
      toast.success(`💾 Refeição "${name}" salva como template!`);
      onOpenChange(false);
      setName("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = (template: MealTemplate) => {
    const planId = store.plan?.id;
    if (!planId) return;

    // Clear existing items in this slot
    store.deleteItemsInCell(day, mealType);

    // Add template items
    (template.items || []).forEach((item: any) => {
      store.addItem({
        meal_plan_id: planId,
        title: item.title,
        description: item.description,
        day_of_week: day,
        meal_type: mealType,
        calories_target: item.calories_target || 0,
        protein_target: item.protein_target || 0,
        carbs_target: item.carbs_target || 0,
        fat_target: item.fat_target || 0,
        image_url: item.image_url || null,
        item_origin: "template",
      });
    });

    toast.success(`Refeição "${template.name}" carregada!`);
    onOpenChange(false);
  };

  const handleDelete = async (templateId: string) => {
    await supabase.from("saved_meal_templates" as any).delete().eq("id", templateId);
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    toast.success("Template removido");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            {mode === "save" ? <><Save className="w-4 h-4" /> Salvar refeição como template</> : <><FolderOpen className="w-4 h-4" /> Usar refeição salva</>}
          </DialogTitle>
        </DialogHeader>

        {mode === "save" ? (
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do template (ex: Café proteico)"
              className="text-sm"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <p className="text-xs text-muted-foreground">
              {items.length} item(ns) serão salvos neste template.
            </p>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Salvar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum template salvo ainda.
              </p>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors group"
                  onClick={() => handleLoad(t)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t.items?.length || 0} itens • {t.meal_type || "geral"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
