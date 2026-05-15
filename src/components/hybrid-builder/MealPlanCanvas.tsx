import { useMealPlanEditorV2Store, type MealType } from "@/stores/mealPlanEditorV2Store";
import MealSlotCard from "./MealSlotCard";
import DayActions from "./DayActions";
import { Coffee, Apple, Utensils, Cookie, Moon, Sun, Zap, Pencil, Sparkles } from "lucide-react";
import { useState } from "react";
import type { PatientContext, ComposerMode, MacroTarget } from "@/lib/mealComposer";


const MEAL_SLOTS: { key: MealType; label: string; icon: React.ReactNode; calShare: number }[] = [
  { key: "Café da Manhã", label: "Café da Manhã", icon: <Coffee className="w-4 h-4 text-amber-500" />, calShare: 0.20 },
  { key: "Lanche da Manhã", label: "Lanche Manhã", icon: <Apple className="w-4 h-4 text-green-500" />, calShare: 0.10 },
  { key: "Almoço", label: "Almoço", icon: <Utensils className="w-4 h-4 text-orange-500" />, calShare: 0.30 },
  { key: "Lanche da Tarde", label: "Lanche Tarde", icon: <Cookie className="w-4 h-4 text-pink-500" />, calShare: 0.10 },
  { key: "Jantar", label: "Jantar", icon: <Moon className="w-4 h-4 text-indigo-500" />, calShare: 0.25 },
  { key: "Ceia", label: "Ceia", icon: <Sun className="w-4 h-4 text-purple-500" />, calShare: 0.05 },
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

interface Props {
  patientContext?: PatientContext | null;
  composerMode?: ComposerMode;
  onRequestGenerate?: () => void;
  showDropTargets?: boolean;
}

export default function MealPlanCanvas({ patientContext, composerMode = "quick", onRequestGenerate, showDropTargets = false }: Props) {
  const { items, plan, updatePlan } = useMealPlanEditorV2Store();
  const [activeDay, setActiveDay] = useState(0);
  const [manualMode, setManualMode] = useState(false);

  const isSingleDay = plan?.plan_mode !== "weekly";
  const effectiveDay = isSingleDay ? 0 : activeDay;

  const dayItems = items.filter((i) => i.day_of_week === effectiveDay);

  // Derive per-meal macro targets from plan targets
  const planCalories = (plan as any)?.calories_target || plan?.overall_score || 2000;
  const planProtein = (plan as any)?.protein_target || 120;
  const planCarbs = (plan as any)?.carbs_target || 250;
  const planFat = (plan as any)?.fat_target || 65;

  function getMealTarget(calShare: number): MacroTarget {
    return {
      calories: Math.round(planCalories * calShare),
      protein: Math.round(planProtein * calShare),
      carbs: Math.round(planCarbs * calShare),
      fat: Math.round(planFat * calShare),
    };
  }

  const isEmpty = items.length === 0 && !manualMode && !showDropTargets;

  if (isEmpty) {
    return (
      <div className="flex-1 min-w-0 flex items-center justify-center">
        <div className="max-w-md w-full space-y-6 text-center p-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold">Como deseja montar o plano?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha gerar automaticamente pelo motor ou montar manualmente arrastando alimentos.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onRequestGenerate?.()}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">🤖 Gerar pelo Motor</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  O motor clínico gera o plano completo automaticamente com base no paciente.
                </p>
              </div>
            </button>
            <button
              onClick={() => setManualMode(true)}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-muted-foreground/40 hover:bg-muted/30 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Pencil className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">✍️ Montar Manualmente</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Arraste alimentos da biblioteca para criar o plano do zero.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 flex-1 min-w-0">
      {items.length === 0 && showDropTargets && !manualMode && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-center">
          <p className="text-xs font-medium text-primary">Solte o alimento em uma refeição para começar a montagem manual.</p>
        </div>
      )}

      {/* Plan Mode Toggle */}
      <div className="flex items-center justify-between bg-muted/30 p-1.5 rounded-xl border border-border/50">
        <div className="flex gap-1">
          <button
            onClick={() => updatePlan({ plan_mode: "weekly" })}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              !isSingleDay ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🗓️ Plano Semanal
          </button>
          <button
            onClick={() => {
              updatePlan({ plan_mode: "single_day" });
              setActiveDay(0);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              isSingleDay ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ⚡ Dia Padrão
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
            {isSingleDay ? "Modo Simples (1 Dia + Substituições)" : "Modo Avançado (Variação Diária)"}
          </span>
        </div>
      </div>

      {/* Day tabs */}
      {!isSingleDay && (
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
      )}

      {/* Day-level actions */}
      {!isSingleDay && <DayActions activeDay={activeDay} />}

      {/* Meal slots grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {MEAL_SLOTS.map((slot) => (
          <MealSlotCard
            key={slot.key}
            day={effectiveDay}
            mealType={slot.key}
            label={slot.label}
            icon={slot.icon}
            items={dayItems.filter((i) => i.meal_type === slot.key)}
            patientContext={patientContext}
            mealMacroTarget={getMealTarget(slot.calShare)}
            composerMode={composerMode}
          />
        ))}
      </div>
    </div>
  );
}
