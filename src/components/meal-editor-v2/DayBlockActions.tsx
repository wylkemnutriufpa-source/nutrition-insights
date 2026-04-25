import { useCallback } from "react";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

interface DayBlockActionsProps {
  dayKey: number;
  dayLabel: string;
}

export function DayBlockActions({ dayKey, dayLabel }: DayBlockActionsProps) {
  const { items, deleteItem } = useMealPlanEditorV2Store();

  const dayItems = items.filter((i) => i.day_of_week === dayKey);

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
      <DropdownMenuContent align="center" className="w-40">
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
