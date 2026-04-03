import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Beef, Wheat, Droplets, AlertTriangle, CheckCircle2, Target } from "lucide-react";

interface Props {
  targetKcal?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

export default function ClinicalMacroPanel({ targetKcal, targetProtein, targetCarbs, targetFat }: Props) {
  const { items } = useMealPlanEditorV2Store();

  // Per-day averages
  const dayMap = new Map<number, typeof items>();
  items.forEach((item) => {
    const arr = dayMap.get(item.day_of_week) || [];
    arr.push(item);
    dayMap.set(item.day_of_week, arr);
  });

  const daysWithItems = dayMap.size || 1;

  const totalKcal = items.reduce((s, i) => s + (i.calories || 0), 0);
  const totalProt = items.reduce((s, i) => s + (i.protein || 0), 0);
  const totalCarbs = items.reduce((s, i) => s + (i.carbs || 0), 0);
  const totalFat = items.reduce((s, i) => s + (i.fat || 0), 0);

  const avgKcal = totalKcal / daysWithItems;
  const avgProt = totalProt / daysWithItems;
  const avgCarbs = totalCarbs / daysWithItems;
  const avgFat = totalFat / daysWithItems;

  const macros = [
    { label: "Calorias", icon: <Flame className="w-3.5 h-3.5 text-orange-500" />, current: avgKcal, target: targetKcal, unit: "kcal", color: "bg-orange-500" },
    { label: "Proteína", icon: <Beef className="w-3.5 h-3.5 text-red-500" />, current: avgProt, target: targetProtein, unit: "g", color: "bg-red-500" },
    { label: "Carboidrato", icon: <Wheat className="w-3.5 h-3.5 text-amber-500" />, current: avgCarbs, target: targetCarbs, unit: "g", color: "bg-amber-500" },
    { label: "Gordura", icon: <Droplets className="w-3.5 h-3.5 text-blue-500" />, current: avgFat, target: targetFat, unit: "g", color: "bg-blue-500" },
  ];

  const alerts: string[] = [];
  if (targetProtein && avgProt < targetProtein * 0.8) alerts.push("Proteína abaixo de 80% da meta");
  if (targetKcal && avgKcal > targetKcal * 1.15) alerts.push("Calorias acima de 115% da meta");
  if (targetKcal && avgKcal < targetKcal * 0.7) alerts.push("Calorias abaixo de 70% da meta");
  if (items.length === 0) alerts.push("Nenhuma refeição adicionada");

  const allOk = alerts.length === 0 && items.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-wider">Painel Clínico</h3>
      </div>

      {/* Macro bars */}
      <div className="space-y-3">
        {macros.map((m) => {
          const pct = m.target ? Math.min((m.current / m.target) * 100, 150) : 0;
          const delta = m.target ? m.current - m.target : 0;
          const isOk = m.target ? Math.abs(delta) / m.target < 0.1 : true;

          return (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {m.icon}
                  <span className="text-muted-foreground">{m.label}</span>
                </div>
                <span className={`font-mono font-semibold ${isOk ? "text-emerald-500" : "text-amber-500"}`}>
                  {Math.round(m.current)}{m.unit}
                  {m.target && <span className="text-muted-foreground font-normal"> / {Math.round(m.target)}{m.unit}</span>}
                </span>
              </div>
              {m.target && (
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${m.color}`}
                    style={{ width: `${Math.min(pct, 100)}%`, opacity: pct > 100 ? 0.7 : 1 }}
                  />
                  {/* Target line */}
                  <div className="absolute top-0 bottom-0 w-px bg-foreground/30" style={{ left: "100%" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      <div className="space-y-1.5">
        {allOk && (
          <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 rounded-lg p-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Macros dentro da meta</span>
          </div>
        )}
        {alerts.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 rounded-lg p-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{a}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="border-t border-border pt-3 space-y-1 text-[10px] text-muted-foreground">
        <p>{items.length} refeições • {daysWithItems} dias preenchidos</p>
        <p>Média diária: {Math.round(avgKcal)} kcal</p>
      </div>
    </div>
  );
}
