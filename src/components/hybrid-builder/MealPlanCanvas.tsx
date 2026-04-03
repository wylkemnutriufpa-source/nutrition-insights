import { useMealPlanEditorV2Store, type MealType } from "@/stores/mealPlanEditorV2Store";
import MealSlotCard from "./MealSlotCard";
import { Coffee, Apple, Utensils, Cookie, Moon, Sun } from "lucide-react";
import { useState } from "react";

const MEAL_SLOTS: { key: MealType; label: string; icon: React.ReactNode }[] = [
  { key: "breakfast", label: "Café da Manhã", icon: <Coffee className="w-4 h-4 text-amber-500" /> },
  { key: "morning_snack", label: "Lanche Manhã", icon: <Apple className="w-4 h-4 text-green-500" /> },
  { key: "lunch", label: "Almoço", icon: <Utensils className="w-4 h-4 text-orange-500" /> },
  { key: "afternoon_snack", label: "Lanche Tarde", icon: <Cookie className="w-4 h-4 text-pink-500" /> },
  { key: "dinner", label: "Jantar", icon: <Moon className="w-4 h-4 text-indigo-500" /> },
  { key: "evening_snack", label: "Ceia", icon: <Sun className="w-4 h-4 text-purple-500" /> },
];

const DAYS = [
  { key: 1, label: "Segunda", short: "Seg" },
  { key: 2, label: "Terça", short: "Ter" },
  { key: 3, label: "Quarta", short: "Qua" },
  { key: 4, label: "Quinta", short: "Qui" },
  { key: 5, label: "Sexta", short: "Sex" },
  { key: 6, label: "Sábado", short: "Sáb" },
  { key: 0, label: "Domingo", short: "Dom" },
];

export default function MealPlanCanvas() {
  const { items } = useMealPlanEditorV2Store();
  const [activeDay, setActiveDay] = useState(1);

  const dayItems = items.filter((i) => i.day_of_week === activeDay);

  return (
    <div className="space-y-3 flex-1 min-w-0">
      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {DAYS.map((d) => {
          const dayCount = items.filter((i) => i.day_of_week === d.key).length;
          const isActive = activeDay === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setActiveDay(d.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {d.short}
              {dayCount > 0 && (
                <span className={`ml-1 text-[9px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  ({dayCount})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Meal slots grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {MEAL_SLOTS.map((slot) => (
          <MealSlotCard
            key={slot.key}
            day={activeDay}
            mealType={slot.key}
            label={slot.label}
            icon={slot.icon}
            items={dayItems.filter((i) => i.meal_type === slot.key)}
          />
        ))}
      </div>
    </div>
  );
}
