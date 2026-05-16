import React, { memo, useMemo } from "react";
import { useExperienceUI } from "@/hooks/useExperienceUI";
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
/** Resolve a human-readable portion string from the item data hierarchy. */
const formatDisplayPortion = (item: any): string => {
  if (!item) return '';
  const meta = item.edit_metadata || item.metadata || {};
  const dQty = item.display_quantity || meta.display_quantity;
  const dUnit = item.display_unit || meta.display_unit || meta.portionLabel || meta.portionUnit || '';
  if (dQty) return `${dQty} ${dUnit}`.trim();
  const mass = item.clinical_mass_g || item.grams || meta.clinical_mass_g;
  if (mass) return `${mass}g`;
  if (item.description) return item.description;
  return '';
};

import type { Database } from "@/integrations/supabase/types";

type MealType = Database["public"]["Enums"]["tipo_refeicao"];
type AdherenceStatus = "followed" | "partial" | "not_followed";

interface MealPlanItem {
  id: string;
  title: string;
  description: string | null;
  tipo_refeicao: MealType;
  day_of_week: number | null;
  meta_calorias: number | null;
  meta_proteinas: number | null;
  meta_carboidratos: number | null;
  meta_gorduras: number | null;
  metadata?: Record<string, any> | null;
  image_url?: string | null;
  visual_library_item_id?: string | null;
  is_primary?: boolean;
  // --- SOBERANIA V3 ---
  editor_version?: string;
  display_quantity?: string | number;
  display_unit?: string;
  clinical_mass_g?: number;
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
  itemId?: string;
  title: string;
  description: string | null;
  tipo_refeicao: MealType;
  meta_calorias: number | null;
  meta_proteinas: number | null;
  meta_carboidratos: number | null;
  meta_gorduras: number | null;
  metadata?: Record<string, any> | null;
  image_url?: string | null;
}

const MEAL_TYPES: { key: any; label: string; icon: React.ReactNode; time: string }[] = [
  { key: "Café da Manhã", label: "Café da Manhã", icon: <Coffee className="w-5 h-5" />, time: "06:00 - 09:00" },
  { key: "Lanche da Manhã", label: "Lanche da Manhã", icon: <Apple className="w-5 h-5" />, time: "10:00 - 11:00" },
  { key: "Almoço", label: "Almoço", icon: <Utensils className="w-5 h-5" />, time: "12:00 - 14:00" },
  { key: "Lanche da Tarde", label: "Lanche da Tarde", icon: <Cookie className="w-5 h-5" />, time: "15:00 - 17:00" },
  { key: "Jantar", label: "Jantar", icon: <Moon className="w-5 h-5" />, time: "18:00 - 20:00" },
  { key: "Ceia", label: "Ceia", icon: <Sun className="w-5 h-5" />, time: "21:00 - 22:00" },
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
  const p = Number(meal.meta_proteinas ?? meta.meta_proteinas ?? meta.protein) || 0;
  const c = Number(meal.meta_carboidratos ?? meta.meta_carboidratos ?? meta.carbs) || 0;
  const f = Number(meal.meta_gorduras ?? meta.meta_gorduras ?? meta.fat) || 0;
  const cal = Number(meal.meta_calorias ?? meta.meta_calorias ?? meta.calories) || 0;
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

function isCurrentMeal(timeRange: string): boolean {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Format: "HH:MM - HH:MM"
    const [start, end] = timeRange.split(" - ");
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch (e) {
    return false;
  }
}

// ── Macro Summary Bar (memoized) ──
const MacroSummary = memo(function MacroSummary({ 
  items, 
  totalsStatus = 'ok',
  targets 
}: { 
  items: MealPlanItem[], 
  totalsStatus?: string,
  targets?: {
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  }
}) {
  const totals = useMemo(() => {
    const primaryOnly = items.filter(i => {
      if (i.is_primary === false) return false;
      if ((i as any).is_substitution === true) return false;

      const lowerTitle = (i.title || "").toLowerCase();
      const lowerDesc = (i.description || "").toLowerCase();
      
      if ((lowerTitle.includes("substitu") || lowerDesc.includes("substitu")) && i.is_primary !== true) return false;
      
      return true;
    });
    
    return {
      calories: primaryOnly.reduce((s, i) => s + safeNum(i.meta_calorias ?? (i as any).kcal ?? (i as any).calories ?? (i as any).meta_calories ?? i.metadata?.meta_calorias ?? i.metadata?.calories), 0),
      protein: primaryOnly.reduce((s, i) => s + safeNum(i.meta_proteinas ?? (i as any).protein ?? (i as any).protein_g ?? i.metadata?.meta_proteinas ?? i.metadata?.protein), 0),
      carbs: primaryOnly.reduce((s, i) => s + safeNum(i.meta_carboidratos ?? (i as any).carbs ?? (i as any).carbs_g ?? i.metadata?.meta_carboidratos ?? i.metadata?.carbs), 0),
      fat: primaryOnly.reduce((s, i) => s + safeNum(i.meta_gorduras ?? (i as any).fat ?? (i as any).fat_g ?? i.metadata?.meta_gorduras ?? i.metadata?.fat), 0),
    };
  }, [items]);

  // SOBERANIA V3: Prioritize targets from plan if available
  const displayKcal = targets?.calories && targets.calories > 0 ? targets.calories : totals.calories;
  const displayProtein = targets?.protein && targets.protein > 0 ? targets.protein : totals.protein;
  const displayCarbs = targets?.carbs && targets.carbs > 0 ? targets.carbs : totals.carbs;
  const displayFat = targets?.fat && targets.fat > 0 ? targets.fat : totals.fat;

  const hasData = items.length > 0;
  // Only show warning if BOTH items sum and plan targets are 0
  const showCalculating = totalsStatus === 'incomplete' || (displayKcal === 0 && hasData && totalsStatus !== 'ok');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em]">
          {targets?.calories ? "Suas Metas Diárias" : "Metas Nutricionais do Dia"}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900/60 border border-white/5 rounded-[2rem] p-6 text-center transition-all hover:bg-neutral-900/80 group shadow-xl backdrop-blur-xl">
          <Flame className="w-5 h-5 mx-auto text-orange-500 mb-2 group-hover:scale-110 transition-transform duration-500" />
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Kcal</p>
          <p className="font-display font-black text-2xl text-white tabular-nums" data-macro="kcal">{fmtMacro(displayKcal, "0")}</p>
        </div>
        <div className="bg-neutral-900/60 border border-white/5 rounded-[2rem] p-6 text-center transition-all hover:bg-neutral-900/80 group shadow-xl backdrop-blur-xl">
          <Beef className="w-5 h-5 mx-auto text-red-500 mb-2 group-hover:scale-110 transition-transform duration-500" />
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Prot</p>
          <p className="font-display font-black text-2xl text-white tabular-nums" data-macro="protein">{fmtMacro(displayProtein, "0")}g</p>
        </div>
        <div className="bg-neutral-900/60 border border-white/5 rounded-[2rem] p-6 text-center transition-all hover:bg-neutral-900/80 group shadow-xl backdrop-blur-xl">
          <Wheat className="w-5 h-5 mx-auto text-amber-500 mb-2 group-hover:scale-110 transition-transform duration-500" />
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Carbs</p>
          <p className="font-display font-black text-2xl text-white tabular-nums" data-macro="carbs">{fmtMacro(displayCarbs, "0")}g</p>
        </div>
        <div className="bg-neutral-900/60 border border-white/5 rounded-[2rem] p-6 text-center transition-all hover:bg-neutral-900/80 group shadow-xl backdrop-blur-xl">
          <Droplets className="w-5 h-5 mx-auto text-yellow-500 mb-2 group-hover:scale-110 transition-transform duration-500" />
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Gord</p>
          <p className="font-display font-black text-2xl text-white tabular-nums" data-macro="fat">{fmtMacro(displayFat, "0")}g</p>
        </div>
      </div>
      
      {showCalculating && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-in fade-in duration-500">
          <Clock className="w-4 h-4 text-amber-500" />
          <p className="text-[11px] text-amber-600 font-bold uppercase tracking-widest leading-tight">
            Valores Nutricionais Pendentes no Template
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
  const { showMacros, isBasic } = useExperienceUI();
  const impacts = useMemo(() => getImpactTags(item), [item]);
  const needsVisualFallback = !item.image_url && !!item.visual_library_item_id;
  const { item: visualItem } = useMealVisualItem(needsVisualFallback ? item.visual_library_item_id : null);
  const fallbackImage = visualItem?.image_url || visualItem?.image_path || null;
  const { url: signedFallback } = useSignedStorageUrl(fallbackImage, {
    bucket: "meal-images",
    enabled: !!fallbackImage,
  });
  const resolvedImage = useMemo(() => {
    const raw = item.image_url || signedFallback || (item as any).imageUrl || null;
    
    // SOBERANIA V3: Fix Unsplash deprecated source endpoint and resolution
    if (raw && (raw.includes("source.unsplash.com") || raw.includes("images.unsplash.com/featured"))) {
      const query = item.title || "saudável";
      return `https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800&q=${encodeURIComponent(query)}&sig=${item.id}`;
    }
    return raw;
  }, [item.image_url, (item as any).imageUrl, item.title, signedFallback]);
  
  const statusColor = status === "followed" ? "border-emerald-500/30 bg-emerald-500/5 shadow-inner"
    : status === "partial" ? "border-amber-500/30 bg-amber-500/5 shadow-inner"
    : status === "not_followed" ? "border-red-500/30 bg-red-500/5 shadow-inner"
    : "border-border/40 hover:border-primary/30 hover:shadow-md transition-all";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1, y: 0,
        boxShadow: isJustDone ? "0 0 20px rgba(16,185,129,0.3)" : "none",
      }}
      className={`relative rounded-[3rem] border overflow-hidden bg-neutral-900/60 backdrop-blur-2xl group transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${statusColor}`}
    >
      {resolvedImage && (
        <div
          className="relative w-full aspect-[16/10] overflow-hidden cursor-pointer bg-neutral-900 group/image"
          onClick={() => onOpenDetail({ ...item, itemId: item.id, metadata: (item as any).edit_metadata ?? (item as any).metadata })}
        >
          <img 
            src={resolvedImage} 
            alt={item.title} 
            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover/image:scale-110" 
            loading="lazy" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
          <div className="absolute top-6 right-6 z-10">
            {status === "followed" ? <CheckCircle2 className="w-7 h-7 text-emerald-500 drop-shadow-2xl" />
              : status === "partial" ? <MinusCircle className="w-7 h-7 text-amber-500 drop-shadow-2xl" />
              : status === "not_followed" ? <AlertCircle className="w-7 h-7 text-red-500 drop-shadow-2xl" />
              : null}
          </div>
          {needsVisualFallback && visualItem && (
            <div className="absolute bottom-4 left-4">
              <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-emerald-500/80 text-black backdrop-blur-md">
                📸 Inspiração Real
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-3 sm:p-4">
        <div
          className="flex items-start gap-2 sm:gap-3 cursor-pointer min-w-0"
          onClick={() => onOpenDetail({ ...item, itemId: item.id, metadata: (item as any).edit_metadata ?? (item as any).metadata })}
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
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0 h-4 font-bold uppercase tracking-tight text-center">
                  Prato Principal
                </Badge>
              )}
            </div>
            <div className="mt-1">
              {(() => {
                const editMeta = (item as any).edit_metadata || item.metadata;
                const isV3 = item.editor_version === "v3" || (item as any).editor_version === "V3";

                // V3 prioritization: display_quantity > clinical_mass_g
                const dQty = item.display_quantity || editMeta?.display_quantity || item.clinical_mass_g || (item as any).grams;
                const dUnit = item.display_unit || editMeta?.display_unit || editMeta?.portionLabel || editMeta?.portionUnit || (item.clinical_mass_g || (item as any).grams ? "g" : "");
                const cMass = item.clinical_mass_g || (item as any).clinical_mass_g || editMeta?.clinical_mass_g;

                if (dQty) {
                  return (
                    <p className="text-xs font-bold text-primary mb-0.5">
                      {dQty}{dUnit ? ` ${dUnit}` : ""}
                    </p>
                  );
                }
                
                if (cMass) {
                  return (
                    <p className="text-xs font-bold text-primary mb-0.5">
                      {cMass}g
                    </p>
                  );
                }

                return null;
              })()}

              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-6 whitespace-pre-line">
                  {(() => {
                    const desc = item.description || "";
                    // 🛡️ ANTI-DUPLICAÇÃO: Se a descrição for apenas a gramagem que já renderizamos, limpamos.
                    const qty = String(item.display_quantity || (item as any).edit_metadata?.display_quantity || "");
                    const mass = String(item.clinical_mass_g || (item as any).clinical_mass_g || "");
                    
                    if (qty && desc.trim() === `${qty} ${item.display_unit || ""}`.trim()) return null;
                    if (mass && desc.trim() === `${mass}g`.trim()) return null;
                    
                    if ((item.title.toLowerCase().includes("marmita") || (item as any).edit_metadata?.is_fixed) && !item.is_primary) {
                      return `Substituição: ${item.title}`;
                    }
                    return desc;
                  })()}
                </p>
              )}
            </div>
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
            {showMacros && (
              <div className="flex flex-wrap items-center gap-4 mt-3 py-3 border-t border-white/5 text-[11px] font-black uppercase tracking-wider text-white/30">
                {(() => {
                  const cal = item.meta_calorias ?? item.metadata?.meta_calorias ?? item.metadata?.calories;
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
                <span className="flex items-center gap-1"><Beef className="w-3 h-3 text-red-400" /> {fmtMacro(item.meta_proteinas ?? item.metadata?.meta_proteinas ?? item.metadata?.protein, "...")}g</span>
                <span className="flex items-center gap-1"><Wheat className="w-3 h-3 text-amber-400" /> {fmtMacro(item.meta_carboidratos ?? item.metadata?.meta_carboidratos ?? item.metadata?.carbs, "...")}g</span>
                <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-yellow-400" /> {fmtMacro(item.meta_gorduras ?? item.metadata?.meta_gorduras ?? item.metadata?.fat, "...")}g</span>
                
                {item.metadata?.prep_time && (
                  <Badge variant="secondary" className="px-1 py-0 h-4 text-[8px] flex items-center gap-0.5 bg-primary/5 text-primary border-primary/10">
                    <Sun className="w-2 h-2" /> {item.metadata.prep_time} min
                  </Badge>
                )}

                {/* SOBERANIA: Paciente nunca vê alertas de inconsistência técnica */}
                {!isBasic && isMacroInconsistent(item.meta_calorias || 0, item.meta_proteinas || 0, item.meta_carboidratos || 0, item.meta_gorduras || 0) && (
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
            )}
            <div className="flex flex-col gap-2 mt-3 w-full">
              {isBasic ? (
                status === "followed" ? (
                  <div 
                    className="flex items-center justify-center gap-2 py-3 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 font-bold text-sm text-center break-words w-full"
                    role="status"
                    aria-label="Refeição Concluída"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="leading-tight">Refeição Concluída! 🎉</span>
                  </div>
                ) : (
                  <Button
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                    onClick={() => onSetAdherence(item, "followed")}
                    aria-label={`Marcar ${item.title} como concluída`}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    CONCLUIR AGORA
                  </Button>
                )
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {ADHERENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.status}
                      onClick={(e) => { e.stopPropagation(); onSetAdherence(item, opt.status); }}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all flex-1 min-w-0 justify-center ${
                        status === opt.status
                          ? `${opt.bgColor} ${opt.color} ring-1 ring-current`
                          : "border-border/50 text-muted-foreground hover:border-border"
                      }`}
                    >
                      {opt.icon}
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {!isBasic && (item.metadata?.substitution_count > 0 || (item as any).edit_metadata?.substitution_count > 0) && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenSubstitution && onOpenSubstitution(item); }}
                  className="flex items-center gap-1.5 mt-1 px-3 py-2 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-all w-full justify-center shadow-sm"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Trocar Opção ({item.metadata?.substitution_count || (item as any).edit_metadata?.substitution_count})
                </button>
              )}
            </div>
            <MealFeedbackButton mealPlanId={item.id} mealPlanItemId={item.id} mealType={item.tipo_refeicao} />
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
  const { isBasic, showDetailedAdherence } = useExperienceUI();
  const motivational = getMotivationalMessage(dailyAdherence);

  if (isBasic) {
    if (completionsCount === 0) return null;
    return (
      <motion.div 
        className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center" 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
      >
        <p className={`text-sm font-bold ${motivational.color}`}>
          {motivational.emoji} {motivational.message}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {completionsCount} de {totalItems} refeições concluídas
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div className="bg-neutral-900/60 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-2xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Flame className="w-6 h-6" />
          </div>
          <span className="font-black uppercase italic tracking-tighter text-white text-lg">Progresso do Dia</span>
        </div>
        <span className="text-2xl font-black italic text-primary">{Math.round(dailyAdherence)}%</span>
      </div>
      <Progress value={dailyAdherence} className="h-3 bg-white/5 border border-white/5" indicatorClassName="bg-gradient-to-r from-primary to-emerald-400" />
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
  const { isBasic } = useExperienceUI();

  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChangeDate(-1)}>
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          {!isBasic && <Calendar className="w-4 h-4 text-primary" />}
          <span className="font-bold text-sm">
            {isToday ? "Hoje" : new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
          </span>
          {!isBasic && <Badge variant="outline" className="ml-1 text-[10px]">{DAYS[dayOfWeek]}</Badge>}
        </div>
        {isBasic && <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{DAYS[dayOfWeek]}</span>}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChangeDate(1)} disabled={isToday}>
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
});

// ── Meal Slot Summary Card (New for V3 Coupling) ──
const MealSlotCard = memo(function MealSlotCard({
  mealType, items, completions, isCurrent, onClick
}: {
  mealType: { key: MealType; label: string; icon: React.ReactNode; time: string };
  items: MealPlanItem[];
  completions: MealCompletion[];
  isCurrent: boolean;
  onClick: () => void;
}) {
  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const meta = item.metadata || {};
      return {
        calories: acc.calories + (item.meta_calorias ?? (item as any).kcal ?? (item as any).calories ?? meta.meta_calorias ?? meta.calories ?? 0),
        protein: acc.protein + (item.meta_proteinas ?? (item as any).protein ?? meta.meta_proteinas ?? meta.protein ?? 0),
        carbs: acc.carbs + (item.meta_carboidratos ?? (item as any).carbs ?? meta.meta_carboidratos ?? meta.carbs ?? 0),
        fat: acc.fat + (item.meta_gorduras ?? (item as any).fat ?? meta.meta_gorduras ?? meta.fat ?? 0),
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [items]);

  const mealFollowedCount = items.filter(i => completions.find(c => c.meal_plan_item_id === i.id && c.adherence_status === "followed")).length;
  const isFullyFollowed = mealFollowedCount === items.length && items.length > 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-4 rounded-2xl border cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md ${
        isFullyFollowed 
          ? "bg-emerald-500/5 border-emerald-500/20" 
          : isCurrent 
            ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
            : "bg-card/40 border-border/50"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isCurrent ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-primary/10 text-primary"
          }`}>
            {mealType.icon}
          </div>
          <div>
            <h3 className="font-display font-bold text-sm leading-tight">{mealType.label}</h3>
            <p className="text-[10px] font-medium text-muted-foreground">{mealType.time}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-sm font-bold text-orange-600">{Math.round(totals.calories)} kcal</span>
          </div>
          <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-0.5"><Beef className="w-2.5 h-2.5 text-red-400" />{Math.round(totals.protein)}g</span>
            <span className="flex items-center gap-0.5"><Wheat className="w-2.5 h-2.5 text-amber-400" />{Math.round(totals.carbs)}g</span>
            <span className="flex items-center gap-0.5"><Droplets className="w-2.5 h-2.5 text-yellow-400" />{Math.round(totals.fat)}g</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center mt-2">
        <div className="flex -space-x-2">
          {items.map((item, idx) => (
            <div 
              key={item.id} 
              className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden shadow-sm"
              title={item.title}
            >
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                  <Utensils className="w-4 h-4 text-primary/40" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground font-semibold truncate">
            {items.map(i => i.title).join(" + ")}
          </p>
          {items.length > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-tighter">
                {items.length} {items.length === 1 ? "Item" : "Itens"}
              </span>
              <span className="text-[9px] text-muted-foreground font-medium">
                Toque para ver substituições
              </span>
            </div>
          )}
        </div>
        
        {isFullyFollowed ? (
          <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-lg">
             <CheckCircle2 className="w-3.5 h-3.5" />
             <span className="text-[10px] font-bold uppercase">Concluída</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
        )}
      </div>
    </motion.div>
  );
});

// ── Meal Group (memoized) ──
const MealGroup = memo(function MealGroup({
  mealType, items, completions, justCompleted, focusMode,
  onSetAdherence, onOpenDetail, onOpenSubstitution, onOpenSlot,
}: {
  mealType: { key: MealType; label: string; icon: React.ReactNode; time: string };
  items: MealPlanItem[];
  completions: MealCompletion[];
  justCompleted: string | null;
  focusMode: boolean;
  onSetAdherence: (item: MealPlanItem, status: AdherenceStatus) => void;
  onOpenDetail: (item: MealDetailData) => void;
  onOpenSubstitution?: (item: MealPlanItem) => void;
  onOpenSlot?: (mealType: string, items: MealPlanItem[]) => void;
}) {
  const { isBasic } = useExperienceUI();
  const isCurrent = isCurrentMeal(mealType.time);
  
  // 🛡️ SOBERANIA V3: Sempre usamos a visão acoplada se o handler onOpenSlot estiver disponível,
  // garantindo que a "Refeição" seja a unidade principal de interação, como solicitado.
  const useCoupledView = !!onOpenSlot;

  if (useCoupledView) {
    return (
      <MealSlotCard
        mealType={mealType}
        items={items}
        completions={completions}
        isCurrent={isCurrent}
        onClick={() => onOpenSlot && onOpenSlot(mealType.key, items)}
      />
    );
  }

  return (
    <div 
      className={`transition-all duration-300 w-full max-w-full overflow-hidden ${isCurrent && isBasic ? "ring-2 ring-primary ring-offset-2 rounded-2xl p-3 bg-primary/5 border border-primary/20 shadow-xl" : ""}`}
      role="region"
      aria-label={`Refeição: ${mealType.label}${isCurrent ? " - Agora" : ""}`}
      aria-current={isCurrent ? "time" : undefined}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div 
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isCurrent ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-primary/10 text-primary"}`}
            aria-hidden="true"
          >
            {mealType.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-display font-bold text-sm ${isCurrent && isBasic ? "text-primary text-base" : ""}`}>
                {isCurrent && isBasic ? `AGORA: ${mealType.label.toUpperCase()}` : mealType.label}
              </h3>
              {isCurrent && (
                <Badge className="bg-primary text-white text-[9px] animate-pulse py-0 h-4 border-none font-bold uppercase" aria-live="polite">
                  Sua vez
                </Badge>
              )}
            </div>
            <p className={`text-[10px] font-medium ${isCurrent && isBasic ? "text-primary" : "text-muted-foreground"}`}>{mealType.time}</p>
          </div>
        </div>

        <div className="flex gap-1">
          {items.filter(i => completions.find(c => c.meal_plan_item_id === i.id && c.adherence_status === "followed")).length > 0 && 
            <Badge className="bg-emerald-500/20 text-emerald-600 text-[10px]">{items.filter(i => completions.find(c => c.meal_plan_item_id === i.id && c.adherence_status === "followed")).length}✓</Badge>}
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
  MacroSummary, MealItemCard, MealSlotCard, AdherenceCard, DateNavigator, MealGroup,
  MEAL_TYPES, DAYS, ADHERENCE_OPTIONS, IMPACT_TAGS,
  getImpactTags, getMotivationalMessage,
};

export type { MealPlanItem, MealCompletion, AdherenceStatus, MealDetailData };
