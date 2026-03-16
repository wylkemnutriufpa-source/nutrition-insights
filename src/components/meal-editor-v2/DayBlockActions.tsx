import { useState, useCallback } from "react";
import { useMealPlanEditorV2Store, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Copy, CopyPlus, Trash2, MoreHorizontal, CalendarRange } from "lucide-react";
import { toast } from "sonner";

interface DayBlockActionsProps {
  dayKey: number;
  dayLabel: string;
}

const DAYS = [
  { key: 0, label: "Domingo", short: "Dom" },
  { key: 1, label: "Segunda", short: "Seg" },
  { key: 2, label: "Terça", short: "Ter" },
  { key: 3, label: "Quarta", short: "Qua" },
  { key: 4, label: "Quinta", short: "Qui" },
  { key: 5, label: "Sexta", short: "Sex" },
  { key: 6, label: "Sábado", short: "Sáb" },
];

export function DayBlockActions({ dayKey, dayLabel }: DayBlockActionsProps) {
  const { items, planId, addItem, deleteItem } = useMealPlanEditorV2Store();

  const dayItems = items.filter((i) => i.day_of_week === dayKey);

  const duplicateToDay = useCallback((targetDay: number) => {
    if (!planId || dayItems.length === 0) return;
    // First clear target day
    const targetItems = items.filter((i) => i.day_of_week === targetDay);
    targetItems.forEach((item) => deleteItem(item.id));

    // Then copy items
    dayItems.forEach((item) => {
      addItem({
        meal_plan_id: planId,
        title: item.title,
        description: item.description,
        meal_type: item.meal_type,
        day_of_week: targetDay,
        calories_target: item.calories_target,
        protein_target: item.protein_target,
        carbs_target: item.carbs_target,
        fat_target: item.fat_target,
      });
    });

    toast.success(`${dayLabel} copiado para ${DAYS.find((d) => d.key === targetDay)?.label}`);
  }, [planId, dayItems, items, addItem, deleteItem, dayLabel]);

  const applyToWeek = useCallback(() => {
    if (!planId || dayItems.length === 0) return;
    DAYS.forEach((d) => {
      if (d.key === dayKey) return;
      const existing = items.filter((i) => i.day_of_week === d.key);
      existing.forEach((item) => deleteItem(item.id));
      dayItems.forEach((item) => {
        addItem({
          meal_plan_id: planId,
          title: item.title,
          description: item.description,
          meal_type: item.meal_type,
          day_of_week: d.key,
          calories_target: item.calories_target,
          protein_target: item.protein_target,
          carbs_target: item.carbs_target,
          fat_target: item.fat_target,
        });
      });
    });
    toast.success(`${dayLabel} aplicado a toda semana`);
  }, [planId, dayKey, dayItems, items, addItem, deleteItem, dayLabel]);

  const clearDay = useCallback(() => {
    dayItems.forEach((item) => deleteItem(item.id));
    toast.success(`${dayLabel} limpo`);
  }, [dayItems, deleteItem, dayLabel]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-5 w-5">
          <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs">
            <Copy className="w-3 h-3 mr-2" /> Copiar para…
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {DAYS.filter((d) => d.key !== dayKey).map((d) => (
              <DropdownMenuItem
                key={d.key}
                className="text-xs"
                onClick={() => duplicateToDay(d.key)}
                disabled={dayItems.length === 0}
              >
                {d.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem
          className="text-xs"
          onClick={applyToWeek}
          disabled={dayItems.length === 0}
        >
          <CalendarRange className="w-3 h-3 mr-2" /> Aplicar à semana
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-xs text-destructive"
          onClick={clearDay}
          disabled={dayItems.length === 0}
        >
          <Trash2 className="w-3 h-3 mr-2" /> Limpar dia
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
