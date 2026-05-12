import { useState } from "react";
import { Copy, CalendarRange, Save, Scale } from "lucide-react";
import { normalizePortionsAcrossDays } from "@/lib/smartFoodSubstitution";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMealPlanEditorV2Store, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { toast } from "sonner";

const ALL_DAYS = [
  { key: 0, label: "Domingo" },
  { key: 1, label: "Segunda" },
  { key: 2, label: "Terça" },
  { key: 3, label: "Quarta" },
  { key: 4, label: "Quinta" },
  { key: 5, label: "Sexta" },
  { key: 6, label: "Sábado" },
];

interface Props {
  activeDay: number;
}

export default function DayActions({ activeDay }: Props) {
  const store = useMealPlanEditorV2Store();
  const [showApplyWeek, setShowApplyWeek] = useState(false);
  const [showCopyDays, setShowCopyDays] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const dayItems = store.items.filter((i) => i.day_of_week === activeDay);
  const hasItems = dayItems.length > 0;

  const handleDuplicateDay = () => {
    if (!hasItems) return;
    const planId = store.plan?.id;
    if (!planId) return;

    // Find next empty day
    const occupiedDays = new Set(store.items.map((i) => i.day_of_week));
    const nextEmpty = ALL_DAYS.find((d) => d.key !== activeDay && !occupiedDays.has(d.key));

    if (!nextEmpty) {
      // If all days occupied, open copy-to-days dialog instead
      setShowCopyDays(true);
      return;
    }

    copyDayTo(dayItems, nextEmpty.key, planId);
    toast.success(`Dia duplicado para ${nextEmpty.label}`);
  };

  const handleApplyToWeek = () => {
    if (!hasItems) return;
    const planId = store.plan?.id;
    if (!planId) return;

    ALL_DAYS.forEach((d) => {
      if (d.key === activeDay) return;
      store.deleteItemsInCell(d.key, undefined as any); // clear all meals of that day
      copyDayTo(dayItems, d.key, planId);
    });

    setShowApplyWeek(false);
    toast.success("Dia aplicado para toda a semana!");
  };

  const handleCopyToSelected = () => {
    if (!hasItems || selectedDays.length === 0) return;
    const planId = store.plan?.id;
    if (!planId) return;

    selectedDays.forEach((targetDay) => {
      // Clear all meal types for target day
      const targetItems = store.items.filter((i) => i.day_of_week === targetDay);
      targetItems.forEach((item) => store.deleteItem(item.id));
      copyDayTo(dayItems, targetDay, planId);
    });

    setShowCopyDays(false);
    setSelectedDays([]);
    toast.success(`Dia copiado para ${selectedDays.length} dia(s)`);
  };

  const copyDayTo = (items: MealPlanItem[], targetDay: number, planId: string) => {
    items.forEach((item) => {
      store.addItem({
        meal_plan_id: planId,
        title: item.title,
        description: item.description,
        day_of_week: targetDay,
        meal_type: item.meal_type,
        calories_target: item.calories_target,
        protein_target: item.protein_target,
        carbs_target: item.carbs_target,
        fat_target: item.fat_target,
        image_url: item.image_url,
        item_origin: (item as any).item_origin || "manual",
      });
    });
  };

  const toggleDay = (dayKey: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  if (!hasItems) return null;

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] gap-1"
          onClick={handleDuplicateDay}
        >
          <Copy className="w-3 h-3" /> Duplicar dia
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] gap-1"
          onClick={() => setShowApplyWeek(true)}
        >
          <CalendarRange className="w-3 h-3" /> Aplicar na semana
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] gap-1"
          onClick={() => { setSelectedDays([]); setShowCopyDays(true); }}
        >
          <Copy className="w-3 h-3" /> Copiar para dias...
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] gap-1"
          onClick={() => {
            const patches = normalizePortionsAcrossDays(store.items as any);
            if (patches.size === 0) {
              toast.info("Porções já estão padronizadas na semana");
              return;
            }
            patches.forEach((patch, itemId) => store.updateItem(itemId, patch as any));
            toast.success(`✅ Porções padronizadas em ${patches.size} item(ns) da semana`);
          }}
          title="Iguala as gramagens dos mesmos alimentos em todos os dias"
        >
          <Scale className="w-3 h-3" /> Padronizar porções
        </Button>
      </div>

      {/* Apply to week confirmation */}
      <AlertDialog open={showApplyWeek} onOpenChange={setShowApplyWeek}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar para semana toda?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os outros dias serão substituídos pelo conteúdo deste dia. 
              Cada dia ficará independente após a cópia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyToWeek}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy to selected days */}
      <Dialog open={showCopyDays} onOpenChange={setShowCopyDays}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Copiar dia para:</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {ALL_DAYS.filter((d) => d.key !== activeDay).map((d) => (
              <label key={d.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50">
                <Checkbox
                  checked={selectedDays.includes(d.key)}
                  onCheckedChange={() => toggleDay(d.key)}
                />
                <span className="text-sm">{d.label}</span>
                {store.items.filter((i) => i.day_of_week === d.key).length > 0 && (
                  <span className="text-[10px] text-muted-foreground">(será substituído)</span>
                )}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCopyDays(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCopyToSelected} disabled={selectedDays.length === 0}>
              Copiar para {selectedDays.length} dia(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
