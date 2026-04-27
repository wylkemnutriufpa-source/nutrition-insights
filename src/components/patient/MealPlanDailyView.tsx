import React, { memo, useMemo } from "react";
import MealFeedbackButton from "@/components/patient/MealFeedbackButton";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, Calendar, ChevronLeft, ChevronRight,
  Utensils, Coffee, Apple, Cookie, Moon, Sun, Flame,
  Trophy, Beef, Wheat, Droplets, AlertCircle, MinusCircle,
  Shield, Zap, Award, TrendingUp, UtensilsCrossed, ArrowRightLeft,
  Info, Clock,
} from "lucide-react";
import { useMealVisualItem } from "@/hooks/useMealVisualItem";
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl";
import { safeNum, fmtMacro, isCalorieClamped, isMacroInconsistent, getCalorieClampValue } from "@/lib/formatMacros";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import type { Database } from "@/integrations/supabase/types";

type MealType = Database["public"]["Enums"]["meal_type"];
type AdherenceStatus = "followed" | "partial" | "not_followed";

interface MealPlanItem {
  id: string;
  title: string;
  description: string | null;
  meal_type: MealType;
  day_of_week: number | null;
  calories_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
  metadata?: Record<string, any> | null;
  image_url?: string | null;
  visual_library_item_id?: string | null;
  is_primary?: boolean;
}

interface MealCompletion {
  id: string;
  meal_plan_item_id: string;
  completed: boolean;
  completed_at: string | null;
  adherence_status: AdherenceStatus;
  date?: string;
}

interface MealDetailData {
  id: string;
  title: string;
  description: string | null;
  meal_type: MealType;
  calories_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
  metadata?: Record<string, any> | null;
}

const MEAL_TYPES: { key: MealType; label: string; icon: React.ReactNode; time: string }[] = [
  { key: "breakfast", label: "Café da Manhã", icon: <Coffee className="w-5 h-5" />, time: "06:00 - 09:00" },
  { key: "morning_snack", label: "Lanche da Manhã", icon: <Apple className="w-5 h-5" />, time: "10:00 - 11:00" },
  { key: "lunch", label: "Almoço", icon: <Utensils className="w-5 h-5" />, time: "12:00 - 14:00" },
  { key: "afternoon_snack", label: "Lanche da Tarde", icon: <Cookie className="w-5 h-5" />, time: "15:00 - 17:00" },
  { key: "dinner", label: "Jantar", icon: <Moon className="w-5 h-5" />, time: "18:00 - 20:00" },
  { key: "evening_snack", label: "Ceia", icon: <Sun className="w-5 h-5" />, time: "21:00 - 22:00" },
];

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const ADHERENCE_OPTIONS: { status: AdherenceStatus; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  { status: "followed", label: "Seguido", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20" },
  { status: "partial", label: "Parcial", icon: <MinusCircle className="w-4 h-4" />, color: "text-amber-500", bgColor: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20" },
  { status: "not_followed", label: "Não seguido", icon: <AlertCircle className="w-4 h-4" />, color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20" },
];

const IMPACT_TAGS: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  satiety: { icon: <Shield className="w-3 h-3" />, label: "Saciedade", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  energy: { icon: <Zap className="w-3 h-3" />, label: "Energia", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  recovery: { icon: <Award className="w-3 h-3" />, label: "Recuperação", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  glycemic: { icon: <TrendingUp className="w-3 h-3" />, label: "Controle Glicêmico", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
};

function getImpactTags(meal: MealPlanItem) {
  const tags: string[] = [];
  const meta = meal.metadata || {};
  const p = Number(meal.protein_target ?? meta.protein_target ?? meta.protein) || 0;
  const c = Number(meal.carbs_target ?? meta.carbs_target ?? meta.carbs) || 0;
  const f = Number(meal.fat_target ?? meta.fat_target ?? meta.fat) || 0;
  const cal = Number(meal.calories_target ?? meta.calories_target ?? meta.calories) || 0;
  if (p > 20) tags.push("recovery");
  if (p > 15 && f > 8) tags.push("satiety");
  if (c > 30 && cal > 200) tags.push("energy");
  if (p > c && c < 40) tags.push("glycemic");
  return tags;
}

function getMotivationalMessage(pct: number): { emoji: string; message: string; color: string } {
  if (pct >= 100) return { emoji: "🏆", message: "Perfeito! Você seguiu 100% do plano hoje!", color: "text-emerald-500" };
  if (pct >= 85) return { emoji: "🔥", message: `Incrível! ${Math.round(pct)}% do plano hoje!`, color: "text-emerald-500" };
  if (pct >= 70) return { emoji: "💪", message: `Muito bom! ${Math.round(pct)}% seguido.`, color: "text-primary" };
  if (pct >= 50) return { emoji: "👍", message: `Bom esforço! ${Math.round(pct)}% seguido.`, color: "text-amber-500" };
  if (pct > 0) return { emoji: "🌱", message: `${Math.round(pct)}% seguido. Cada passo conta!`, color: "text-amber-500" };
  return { emoji: "⏳", message: "Marque suas refeições!", color: "text-muted-foreground" };
}

// ── Macro Summary Bar (memoized) ──
const MacroSummary = memo(function MacroSummary({ items, totalsStatus = 'ok' }: { items: MealPlanItem[], totalsStatus?: string }) {
  const totals = useMemo(() => ({
    calories: items.reduce((s, i) => s + safeNum(i.calories_target ?? i.metadata?.calories_target ?? i.metadata?.calories), 0),
    protein: items.reduce((s, i) => s + safeNum(i.protein_target ?? i.metadata?.protein_target ?? i.metadata?.protein), 0),
    carbs: items.reduce((s, i) => s + safeNum(i.carbs_target ?? i.metadata?.carbs_target ?? i.metadata?.carbs), 0),
    fat: items.reduce((s, i) => s + safeNum(i.fat_target ?? i.metadata?.fat_target ?? i.metadata?.fat), 0),
  }), [items]);

  const isIncomplete = totalsStatus === 'incomplete' || (totals.calories === 0 && items.length > 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <Flame className="w-4 h-4 mx-auto text-orange-500 mb-1" />
          <p className="text-xs text-muted-foreground">Calorias</p>
          <p className="font-display font-bold text-sm" data-macro="kcal">{fmtMacro(totals.calories, "...")}</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Beef className="w-4 h-4 mx-auto text-red-500 mb-1" />
          <p className="text-xs text-muted-foreground">Proteína</p>
          <p className="font-display font-bold text-sm" data-macro="protein">{fmtMacro(totals.protein, "...")}g</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Wheat className="w-4 h-4 mx-auto text-amber-500 mb-1" />
          <p className="text-xs text-muted-foreground">Carbs</p>
          <p className="font-display font-bold text-sm" data-macro="carbs">{fmtMacro(totals.carbs, "...")}g</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Droplets className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
          <p className="text-xs text-muted-foreground">Gordura</p>
          <p className="font-display font-bold text-sm" data-macro="fat">{fmtMacro(totals.fat, "...")}g</p>
        </div>
      </div>
      
      {isIncomplete && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg animate-pulse" data-testid="macros-sync-alert">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-[10px] text-amber-600 font-medium leading-tight">
            Valores nutricionais em cálculo... Atualizando em instantes.
          </p>
        </div>
      )}
    </div>
  );
});

// ── Single Meal Item Card (memoized) ──
const MealItemCard = memo(function MealItemCard({
  item, status, completedAt, isJustDone, focusMode,
  onSetAdherence, onOpenDetail, onOpenSubstitution,
}: {
  item: MealPlanItem;
  status: AdherenceStatus | null;
  completedAt: string | null;
  isJustDone: boolean;
  focusMode: boolean;
  onSetAdherence: (item: MealPlanItem, status: AdherenceStatus) => void;
  onOpenDetail: (item: MealDetailData) => void;
  onOpenSubstitution?: (item: MealPlanItem) => void;
}) {
  const impacts = useMemo(() => getImpactTags(item), [item]);
  // Primary: use image_url directly from item (populated during generation)
  // Fallback: resolve from visual library if item.image_url is missing
  const needsVisualFallback = !item.image_url && !!item.visual_library_item_id;
  const { item: visualItem } = useMealVisualItem(needsVisualFallback ? item.visual_library_item_id : null);
  const fallbackImage = visualItem?.image_url || visualItem?.image_path || null;
  const { url: signedFallback } = useSignedStorageUrl(fallbackImage, {
    bucket: "meal-images",
    enabled: !!fallbackImage,
  });
  const resolvedImage = item.image_url || signedFallback || null;
  
  const statusColor = status === "followed" ? "border-emerald-500/30 bg-emerald-500/5"
    : status === "partial" ? "border-amber-500/30 bg-amber-500/5"
    : status === "not_followed" ? "border-red-500/30 bg-red-500/5"
    : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: 1, x: 0,
        boxShadow: isJustDone ? "0 0 20px rgba(16,185,129,0.3)" : "none",
      }}
      className={`glass rounded-xl overflow-hidden transition-all ${statusColor}`}
    >
      {/* Visual image hero */}
      {resolvedImage && (
        <div
          className="relative w-full aspect-[16/9] overflow-hidden cursor-pointer bg-muted/30"
          onClick={() => onOpenDetail({ ...item, metadata: (item as any).edit_metadata ?? (item as any).metadata })}
        >
          <img src={resolvedImage} alt={item.title} className="w-full h-full object-cover object-center" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
          {/* Status overlay icon */}
          <div className="absolute top-2 right-2">
            {status === "followed" ? <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow" />
              : status === "partial" ? <MinusCircle className="w-5 h-5 text-amber-500 drop-shadow" />
              : status === "not_followed" ? <AlertCircle className="w-5 h-5 text-red-500 drop-shadow" />
              : null}
          </div>
          {needsVisualFallback && visualItem && (
            <div className="absolute bottom-1 left-1">
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/70 text-primary-foreground backdrop-blur-sm">
                📸 Inspiração
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div
          className="flex items-start gap-3 cursor-pointer"
          onClick={() => onOpenDetail({ ...item, metadata: (item as any).edit_metadata ?? (item as any).metadata })}
        >
          {!resolvedImage && (
            <div className="mt-0.5">
              {status === "followed" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                : status === "partial" ? <MinusCircle className="w-5 h-5 text-amber-500" />
                : status === "not_followed" ? <AlertCircle className="w-5 h-5 text-red-500" />
                : <Circle className="w-5 h-5 text-muted-foreground" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-medium text-sm ${status === "followed" ? "line-through text-muted-foreground" : ""}`}>
                {item.title}
              </p>
              {item.is_primary && (item.title.toLowerCase().includes("marmita") || (item as any).edit_metadata?.is_fixed) && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0 h-4 font-bold uppercase tracking-tight">
                  Prato Principal
                </Badge>
              )}
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-6 whitespace-pre-line">
                {(item.title.toLowerCase().includes("marmita") || (item as any).edit_metadata?.is_fixed) && !item.is_primary 
                  ? `Substituição: ${item.title}` 
                  : item.description}
              </p>
            )}
            {impacts.length > 0 && !focusMode && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {impacts.map(tag => {
                  const t = IMPACT_TAGS[tag];
                  return (
                    <span key={tag} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium border ${t.color}`}>
                      {t.icon} {t.label}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
              {(() => {
                const cal = item.calories_target ?? item.metadata?.calories_target ?? item.metadata?.calories;
                if (cal === null || cal === undefined) return null;
                return (
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span>{fmtMacro(cal, "...")} kcal</span>
                    {isCalorieClamped(cal) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              className="p-0.5 hover:bg-muted rounded-full transition-colors inline-flex items-center"
                              aria-label={`Aviso de segurança: Calorias ajustadas para ${getCalorieClampValue(cal)} kcal`}
                            >
                              <Info className="w-2.5 h-2.5 text-amber-500" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-[10px]">
                              Ajustado para {getCalorieClampValue(cal)} kcal (limite de segurança).
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                );
              })()}
              <span className="flex items-center gap-1"><Beef className="w-3 h-3 text-red-400" /> {fmtMacro(item.protein_target ?? item.metadata?.protein_target ?? item.metadata?.protein, "...")}g</span>
              <span className="flex items-center gap-1"><Wheat className="w-3 h-3 text-amber-400" /> {fmtMacro(item.carbs_target ?? item.metadata?.carbs_target ?? item.metadata?.carbs, "...")}g</span>
              <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-yellow-400" /> {fmtMacro(item.fat_target ?? item.metadata?.fat_target ?? item.metadata?.fat, "...")}g</span>
              
              {item.metadata?.prep_time && (
                <Badge variant="secondary" className="px-1 py-0 h-4 text-[8px] flex items-center gap-0.5 bg-primary/5 text-primary border-primary/10">
                  <Sun className="w-2 h-2" /> {item.metadata.prep_time} min
                </Badge>
              )}

              {isMacroInconsistent(item.calories_target || 0, item.protein_target || 0, item.carbs_target || 0, item.fat_target || 0) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="p-0.5 hover:bg-muted rounded-full transition-colors inline-flex items-center"
                        aria-label="Aviso: Macros recalculados para precisão calórica"
                      >
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-[10px]">Macros recalculados para precisão calórica.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex gap-1.5 mt-3">
              {ADHERENCE_OPTIONS.map(opt => (
                <button
                  key={opt.status}
                  onClick={(e) => { e.stopPropagation(); onSetAdherence(item, opt.status); }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                    status === opt.status
                      ? `${opt.bgColor} ${opt.color} ring-1 ring-current`
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
              {/* Substitution button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenSubstitution && onOpenSubstitution(item); }}
                className="flex items-center gap-1.5 mt-2 px-3 py-2 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-all w-full justify-center shadow-sm"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Trocar Opção
              </button>
            </div>
            <MealFeedbackButton mealPlanId={item.id} mealPlanItemId={item.id} mealType={item.meal_type} />
          </div>
          {completedAt && status && (
            <span className={`text-[10px] font-medium ${
              status === "followed" ? "text-emerald-500" : status === "partial" ? "text-amber-500" : "text-red-500"
            }`}>
              {new Date(completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ── Adherence Progress Card (memoized) ──
const AdherenceCard = memo(function AdherenceCard({
  dailyAdherence, followedCount, partialCount, notFollowedCount,
  completionsCount, totalItems, allMarked,
}: {
  dailyAdherence: number;
  followedCount: number;
  partialCount: number;
  notFollowedCount: number;
  completionsCount: number;
  totalItems: number;
  allMarked: boolean;
}) {
  const motivational = getMotivationalMessage(dailyAdherence);

  return (
    <motion.div className="glass rounded-2xl p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary" />
          <span className="font-display font-semibold">Aderência do Dia</span>
        </div>
        <span className="text-lg font-bold text-primary">{Math.round(dailyAdherence)}%</span>
      </div>
      <Progress value={dailyAdherence} className="h-3" />
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <div className="flex gap-3">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {followedCount}</span>
          <span className="flex items-center gap-1"><MinusCircle className="w-3 h-3 text-amber-500" /> {partialCount}</span>
          <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> {notFollowedCount}</span>
        </div>
        <span>{completionsCount}/{totalItems} marcadas</span>
      </div>
      {(completionsCount > 0 || allMarked) && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 rounded-xl bg-secondary/50 border border-border/50 text-center">
          <p className={`text-sm font-medium ${motivational.color}`}>{motivational.emoji} {motivational.message}</p>
        </motion.div>
      )}
      {dailyAdherence === 100 && totalItems > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-1 text-primary font-medium mt-2 text-xs">
          <Trophy className="w-3.5 h-3.5" /> Dia perfeito! 🎉
        </motion.div>
      )}
    </motion.div>
  );
});

// ── Date Navigator (memoized) ──
const DateNavigator = memo(function DateNavigator({
  date, dayOfWeek, isToday, onChangeDate,
}: {
  date: string;
  dayOfWeek: number;
  isToday: boolean;
  onChangeDate: (offset: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="ghost" size="icon" onClick={() => onChangeDate(-1)}>
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        <span className="font-medium">
          {isToday ? "Hoje" : new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}
        </span>
        <Badge variant="outline" className="ml-1">{DAYS[dayOfWeek]}</Badge>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onChangeDate(1)} disabled={isToday}>
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
});

// ── Meal Group (memoized) ──
const MealGroup = memo(function MealGroup({
  mealType, items, completions, justCompleted, focusMode,
  onSetAdherence, onOpenDetail, onOpenSubstitution,
}: {
  mealType: { key: MealType; label: string; icon: React.ReactNode; time: string };
  items: MealPlanItem[];
  completions: MealCompletion[];
  justCompleted: string | null;
  focusMode: boolean;
  onSetAdherence: (item: MealPlanItem, status: AdherenceStatus) => void;
  onOpenDetail: (item: MealDetailData) => void;
  onOpenSubstitution?: (item: MealPlanItem) => void;
}) {
  const mealFollowed = items.filter(i => completions.find(c => c.meal_plan_item_id === i.id && c.adherence_status === "followed")).length;
  const mealPartial = items.filter(i => completions.find(c => c.meal_plan_item_id === i.id && c.adherence_status === "partial")).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{mealType.icon}</div>
          <div>
            <h3 className="font-display font-semibold text-sm">{mealType.label}</h3>
            <p className="text-[10px] text-muted-foreground">{mealType.time}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {mealFollowed > 0 && <Badge className="bg-emerald-500/20 text-emerald-600 text-[10px]">{mealFollowed}✓</Badge>}
          {mealPartial > 0 && <Badge className="bg-amber-500/20 text-amber-600 text-[10px]">{mealPartial}~</Badge>}
        </div>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {items.map((mealItem) => {
            const completion = completions.find(c => c.meal_plan_item_id === mealItem.id);
            return (
              <MealItemCard
                key={mealItem.id}
                item={mealItem}
                status={completion?.adherence_status || null}
                completedAt={completion?.completed_at || null}
                isJustDone={justCompleted === mealItem.id}
                focusMode={focusMode}
                onSetAdherence={onSetAdherence}
                onOpenDetail={onOpenDetail}
                onOpenSubstitution={onOpenSubstitution}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
});

export {
  MacroSummary, MealItemCard, AdherenceCard, DateNavigator, MealGroup,
  MEAL_TYPES, DAYS, ADHERENCE_OPTIONS, IMPACT_TAGS,
  getImpactTags, getMotivationalMessage,
};
export type { MealPlanItem, MealCompletion, AdherenceStatus, MealDetailData };
