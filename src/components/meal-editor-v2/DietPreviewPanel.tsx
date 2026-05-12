import { useMealPlanEditorV2Store } from "@v1/stores/mealPlanEditorV2Store";
import { Coffee, Apple, Utensils, Cookie, Moon, Sun, Flame, Beef, Wheat, Droplets } from "lucide-react";
import { useState } from "react";

const MEAL_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  breakfast: { label: "Café da Manhã", icon: <Coffee className="w-4 h-4 text-amber-500" /> },
  morning_snack: { label: "Lanche Manhã", icon: <Apple className="w-4 h-4 text-green-500" /> },
  lunch: { label: "Almoço", icon: <Utensils className="w-4 h-4 text-orange-500" /> },
  afternoon_snack: { label: "Lanche Tarde", icon: <Cookie className="w-4 h-4 text-pink-500" /> },
  dinner: { label: "Jantar", icon: <Moon className="w-4 h-4 text-indigo-500" /> },
  evening_snack: { label: "Ceia", icon: <Sun className="w-4 h-4 text-purple-500" /> },
};

const DAYS = [
  { key: 1, label: "Segunda", short: "Seg" },
  { key: 2, label: "Terça", short: "Ter" },
  { key: 3, label: "Quarta", short: "Qua" },
  { key: 4, label: "Quinta", short: "Qui" },
  { key: 5, label: "Sexta", short: "Sex" },
  { key: 6, label: "Sábado", short: "Sáb" },
  { key: 0, label: "Domingo", short: "Dom" },
];

export default function DietPreviewPanel() {
  const { items, plan } = useMealPlanEditorV2Store();
  
  // Modelo Single-Day (Dia 0) por padrão no editor Premium
  const defaultDay = items.some(i => i.day_of_week === 0) ? 0 : 1;
  const [previewDay, setPreviewDay] = useState(defaultDay);

  const dayItems = items.filter((i) => i.day_of_week === previewDay);
  const mealTypes = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];

  const totalKcal = dayItems.reduce((s, i) => s + (i.calories_target || 0), 0);
  const totalProt = dayItems.reduce((s, i) => s + (i.protein_target || 0), 0);
  const totalCarbs = dayItems.reduce((s, i) => s + (i.carbs_target || 0), 0);
  const totalFat = dayItems.reduce((s, i) => s + (i.fat_target || 0), 0);

  // Weekly totals
  const weekKcal = items.reduce((s, i) => s + (i.calories_target || 0), 0);
  const daysWithItems = new Set(items.map((i) => i.day_of_week)).size;
  const avgKcal = daysWithItems > 0 ? Math.round(weekKcal / daysWithItems) : 0;
  
  const clinicalScore = (plan as any)?.clinical_score || 0;
  const qualityAlerts = (plan as any)?.quality_alerts || [];

  return (
    <div className="space-y-4">
      {/* Weekly summary */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-bold mb-2">📊 Resumo Semanal</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-primary">{avgKcal}</p>
            <p className="text-[10px] text-muted-foreground">Kcal/dia (média)</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{items.length}</p>
            <p className="text-[10px] text-muted-foreground">Itens totais</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{daysWithItems}/7</p>
            <p className="text-[10px] text-muted-foreground">Dias preenchidos</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${
              clinicalScore >= 90 ? "text-green-500" : clinicalScore >= 70 ? "text-amber-500" : "text-red-500"
            }`}>
              {clinicalScore}
            </p>
            <p className="text-[10px] text-muted-foreground">Score Clínico</p>
          </div>
        </div>
      </div>

      {/* Day selector */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {DAYS.map((d) => {
          const count = items.filter((i) => i.day_of_week === d.key).length;
          const isActive = previewDay === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setPreviewDay(d.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : count > 0
                  ? "bg-muted text-foreground hover:bg-muted/80"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {d.short}
              {count > 0 && (
                <span className={`ml-1 text-[9px] ${isActive ? "text-primary-foreground/70" : ""}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day macros */}
      <div className="flex items-center gap-4 text-xs bg-card border border-border rounded-lg p-2">
        <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> {Math.round(totalKcal)} kcal</span>
        <span className="flex items-center gap-1"><Beef className="w-3 h-3 text-red-500" /> {Math.round(totalProt)}g P</span>
        <span className="flex items-center gap-1"><Wheat className="w-3 h-3 text-amber-500" /> {Math.round(totalCarbs)}g C</span>
        <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-500" /> {Math.round(totalFat)}g G</span>
      </div>

      {/* Meals preview — patient view */}
      <div className="space-y-2">
        {mealTypes.map((mt) => {
          const mealItems = dayItems.filter((i) => i.meal_type === mt);
          const meal = MEAL_LABELS[mt];
          if (!meal) return null;

          return (
            <div key={mt} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                {meal.icon}
                <span className="text-xs font-bold">{meal.label}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {mealItems.reduce((s, i) => s + (i.calories_target || 0), 0)} kcal
                </span>
              </div>
              {mealItems.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-muted-foreground italic">
                  Nenhum item adicionado
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {mealItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 px-3 py-1.5">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-8 h-8 rounded-md object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{item.title}</p>
                        {item.description && item.description !== item.title && (
                          <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {Math.round(item.calories_target || 0)} kcal
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
