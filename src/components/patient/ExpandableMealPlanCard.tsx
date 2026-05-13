import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import {
  UtensilsCrossed, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  CheckCircle2, MinusCircle, AlertCircle, Circle, CalendarDays,
  CalendarRange, Maximize2, ExternalLink, Info,
} from "lucide-react";
import {
  MEAL_TYPES, DAYS,
  type MealPlanItem, type MealCompletion,
} from "@/components/patient/MealPlanDailyView";
import { 
  buildDailyDisplayItems,
  calculatePrimaryTotals 
} from "@/lib/mealPlanDisplay";
import { fmtMacro, isMacroInconsistent, isCalorieClamped, getCalorieClampValue, safeNum } from "@/lib/formatMacros";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getWeekDates(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const nd = new Date(d);
    nd.setDate(d.getDate() - day + i);
    dates.push(nd.toISOString().split("T")[0]);
  }
  return dates;
}

type ViewMode = "today" | "weekly" | "full";

export default function ExpandableMealPlanCard() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [plan, setPlan] = useState<{ id: string; title: string; start_date: string } | null>(null);
  const [allItems, setAllItems] = useState<MealPlanItem[]>([]);
  const [completions, setCompletions] = useState<MealCompletion[]>([]);
  const [weekCompletions, setWeekCompletions] = useState<MealCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const weekDates = useMemo(() => getWeekDates(date), [date]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: planData } = await supabase
      .from("meal_plans")
      .select("id, title, start_date")
      .eq("patient_id", user.id)
      .eq("is_active", true)
      .eq("plan_status", "published_to_patient")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!planData) { setLoading(false); return; }
    setPlan(planData);

    const { data: itemsData } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("meal_plan_id", planData.id)
      .order("created_at");

    setAllItems(itemsData || []);

    const { data: comps } = await supabase
      .from("meal_item_completions")
      .select("*")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .eq("date", date);

    setCompletions((comps || []) as unknown as MealCompletion[]);

    const ws = weekDates[0];
    const we = weekDates[6];
    const { data: wk } = await supabase
      .from("meal_item_completions")
      .select("*")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .gte("date", ws)
      .lte("date", we);

    setWeekCompletions((wk || []) as unknown as MealCompletion[]);
    setLoading(false);
  }, [user, date, weekDates]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const todayItems = useMemo(() => 
    buildDailyDisplayItems(allItems as any, dayOfWeek), 
  [allItems, dayOfWeek]);
  
  const selectedDayItems = useMemo(() => 
    buildDailyDisplayItems(allItems as any, selectedDay), 
  [allItems, selectedDay]);

  const dailyAdherence = useMemo(() => {
    if (todayItems.length === 0) return 0;
    const followed = completions.filter(c => c.adherence_status === "followed").length;
    const partial = completions.filter(c => c.adherence_status === "partial").length;
    return ((followed * 100 + partial * 50) / (todayItems.length * 100)) * 100;
  }, [completions, todayItems]);

  const getAdherenceForDay = useCallback((dayDate: string, dayIdx: number) => {
    const items = allItems.filter(i => i.day_of_week === dayIdx);
    const comps = weekCompletions.filter(c => (c as any).date === dayDate);
    if (items.length === 0) return 0;
    const followed = comps.filter(c => c.adherence_status === "followed").length;
    const partial = comps.filter(c => c.adherence_status === "partial").length;
    return ((followed * 100 + partial * 50) / (items.length * 100)) * 100;
  }, [allItems, weekCompletions]);

  if (loading) {
    return (
      <Card className="border-primary/20 overflow-hidden">
        <div className="p-4 flex items-center justify-center">
          <div data-testid="loading-spinner" className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  if (!plan || allItems.length === 0) return null;

  const groupedToday = MEAL_TYPES.map(mt => ({
    ...mt,
    items: (viewMode === "today" ? todayItems : selectedDayItems).filter(i => i.meal_type === mt.key),
  })).filter(g => g.items.length > 0);

  return (
    <Card className="border-primary/20 overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
      {/* Header - always visible, tappable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base">Meu Plano Alimentar</h3>
              <Badge variant="outline" className="text-[9px] h-5 border-primary/30 text-primary">
                {Math.round(dailyAdherence)}% hoje
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{plan.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/my-diet"
            onClick={(e) => e.stopPropagation()}
            className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* View mode tabs */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="w-full grid grid-cols-3 h-8">
                  <TabsTrigger value="today" className="text-[11px] gap-1 h-7">
                    <CalendarDays className="w-3 h-3" /> Hoje
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="text-[11px] gap-1 h-7">
                    <CalendarRange className="w-3 h-3" /> Semanal
                  </TabsTrigger>
                  <TabsTrigger value="full" className="text-[11px] gap-1 h-7">
                    <Maximize2 className="w-3 h-3" /> Completo
                  </TabsTrigger>
                </TabsList>

                {/* TODAY view */}
                <TabsContent value="today" className="mt-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {DAYS[dayOfWeek]} — {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Progress value={dailyAdherence} className="w-16 h-1.5" />
                      <span className="text-[10px] font-bold">{Math.round(dailyAdherence)}%</span>
                    </div>
                  </div>
                  {groupedToday.map(({ key, label, icon, items }) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-primary text-xs">{icon}</span>
                        <span className="text-[11px] font-semibold">{label}</span>
                      </div>
                      {items.map(item => {
                        const comp = completions.find(c => c.meal_plan_item_id === item.id);
                        const status = comp?.adherence_status;
                        return (
                          <div key={item.id} className="flex items-start gap-2 pl-5">
                            {status === "followed" ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                              : status === "partial" ? <MinusCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                              : status === "not_followed" ? <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                              : <Circle className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium truncate ${status === "followed" ? "line-through text-muted-foreground" : ""}`}>
                                  {item.title}
                                </span>
                                {(() => {
                                  const cal = item.calories_target ?? item.metadata?.calories_target ?? item.metadata?.calories;
                                  if (cal === null || cal === undefined) return null;
                                  return (
                                    <div className="flex items-center gap-1 ml-auto shrink-0">
                                      <span className="text-[9px] text-muted-foreground">{fmtMacro(cal)}kcal</span>
                                      {isCalorieClamped(cal) && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <Info className="w-2.5 h-2.5 text-amber-500" />
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
                              </div>
                              {(item.description || (item as any).edit_metadata?.display_quantity) && (
                                <div className="mt-0.5">
                                  {(() => {
                                    const editMeta = (item as any).edit_metadata;
                                    const isV3 = (item as any).editor_version === 'v3' || (item as any).editor_version === 'V3';
                                    const displayQuantity = item.display_quantity || editMeta?.display_quantity;
                                    const displayUnit = item.display_unit || editMeta?.display_unit || editMeta?.portionLabel || editMeta?.portionUnit || "";
                                    const clinicalMass = item.clinical_mass_g || (item as any).clinical_mass_g || editMeta?.clinical_mass_g;

                                    if (isV3 && displayQuantity) {
                                      return (
                                        <p className="text-[10px] font-bold text-primary leading-tight">
                                          {displayQuantity} {displayUnit}
                                        </p>
                                      );
                                    }
                                    
                                    if (isV3 && clinicalMass && !displayQuantity) {
                                      return (
                                        <p className="text-[10px] font-bold text-primary leading-tight">
                                          {clinicalMass}g
                                        </p>
                                      );
                                    }

                                    if (!isV3) {
                                      if (displayQuantity) {
                                        return (
                                          <p className="text-[10px] font-bold text-primary leading-tight">
                                            {displayQuantity} {displayUnit}
                                          </p>
                                        );
                                      }
                                      if (clinicalMass) {
                                        return (
                                          <p className="text-[10px] font-bold text-primary leading-tight">
                                            {clinicalMass}g
                                          </p>
                                        );
                                      }
                                    }
                                    
                                    return null;
                                  })()}
                                  {item.description && (
                                    <p className="text-[10px] text-muted-foreground whitespace-pre-line leading-snug">
                                      {(() => {
                                        const desc = item.description || "";
                                        const qty = String(item.display_quantity || (item as any).edit_metadata?.display_quantity || "");
                                        const mass = String(item.clinical_mass_g || (item as any).clinical_mass_g || "");
                                        if (qty && desc.trim() === `${qty} ${item.display_unit || ""}`.trim()) return null;
                                        if (mass && desc.trim() === `${mass}g`.trim()) return null;
                                        return desc;
                                      })()}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </TabsContent>

                {/* WEEKLY view */}
                <TabsContent value="weekly" className="mt-3 space-y-3">
                  {/* Week navigation */}
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 7); setDate(d.toISOString().split("T")[0]); }}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-medium">
                      {new Date(weekDates[0] + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} — {new Date(weekDates[6] + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 7); setDate(d.toISOString().split("T")[0]); }}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Day pills */}
                  <div className="grid grid-cols-7 gap-1">
                    {weekDates.map((wd, idx) => {
                      const pct = getAdherenceForDay(wd, idx);
                      const isToday = wd === new Date().toISOString().split("T")[0];
                      const isSelected = selectedDay === idx && viewMode === "weekly";
                      return (
                        <button
                          key={wd}
                          onClick={() => setSelectedDay(idx)}
                          className={`rounded-lg border p-1.5 text-center transition-all ${
                            isSelected ? "border-primary bg-primary/10" : isToday ? "border-primary/30 bg-primary/5" : "border-border/50"
                          }`}
                        >
                          <p className="text-[9px] font-semibold text-muted-foreground">{DAYS_SHORT[idx]}</p>
                          <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : pct > 0 ? "bg-red-500" : "bg-muted-foreground/20"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[8px] font-bold mt-0.5">{Math.round(pct)}%</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected day meals */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">{DAYS[selectedDay]}</span>
                    {MEAL_TYPES.map(mt => {
                      const mealItems = selectedDayItems.filter(i => i.meal_type === mt.key);
                      if (mealItems.length === 0) return null;
                      return (
                        <div key={mt.key}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-primary text-xs">{mt.icon}</span>
                            <span className="text-[11px] font-semibold">{mt.label}</span>
                          </div>
                          {mealItems.map(item => (
                            <div key={item.id} className="flex items-start gap-2 pl-5 py-0.5">
                              <Circle className="w-2.5 h-2.5 text-muted-foreground shrink-0 mt-1" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium truncate">{item.title}</span>
                                  {item.calories_target != null && (
                                    <span className="text-[9px] text-muted-foreground ml-auto shrink-0">{fmtMacro(item.calories_target)}kcal</span>
                                  )}
                                </div>
                                {(item.description || (item as any).edit_metadata?.display_quantity) && (
                                  <div className="mt-0.5">
                                  {(() => {
                                    const editMeta = (item as any).edit_metadata;
                                    const displayQuantity = item.display_quantity || editMeta?.display_quantity;
                                    const displayUnit = item.display_unit || editMeta?.display_unit || editMeta?.portionLabel || editMeta?.portionUnit || "";
                                    
                                    if (displayQuantity) {
                                      return (
                                        <p className="text-[10px] font-bold text-primary leading-tight">
                                          {displayQuantity} {displayUnit}
                                        </p>
                                      );
                                    }
                                    
                                    const clinicalMass = item.clinical_mass_g || (item as any).clinical_mass_g;
                                    if (clinicalMass) {
                                      return (
                                        <p className="text-[10px] font-bold text-primary leading-tight">
                                          {clinicalMass}g
                                        </p>
                                      );
                                    }
                                    
                                    return null;
                                  })()}
                                  {item.description && (
                                      <p className="text-[10px] text-muted-foreground whitespace-pre-line leading-snug">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* FULL view - all days */}
                <TabsContent value="full" className="mt-3 space-y-3">
                  {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                    const dayItems = allItems.filter(i => i.day_of_week === dayIdx);
                    if (dayItems.length === 0) return null;
                    const grouped = MEAL_TYPES.map(mt => ({
                      ...mt,
                      items: dayItems.filter(i => i.meal_type === mt.key),
                    })).filter(g => g.items.length > 0);

                    return (
                      <div key={dayIdx} className="space-y-1">
                        <div className="flex items-center gap-2 pb-1 border-b border-border/30">
                          <span className="text-xs font-bold">{DAYS[dayIdx]}</span>
                          <span className="text-[10px] text-muted-foreground">{dayItems.length} itens</span>
                        </div>
                        {grouped.map(({ key, label, icon, items }) => (
                          <div key={key}>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-primary text-xs">{icon}</span>
                              <span className="text-[11px] font-semibold">{label}</span>
                            </div>
                            {items.map(item => (
                              <div key={item.id} className="flex items-start gap-2 pl-5 py-0.5">
                                <Circle className="w-2.5 h-2.5 text-muted-foreground shrink-0 mt-1" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium truncate">{item.title}</span>
                                    {item.calories_target != null && (
                                      <span className="text-[9px] text-muted-foreground ml-auto shrink-0">{fmtMacro(item.calories_target)}kcal</span>
                                    )}
                                  </div>
                                  {(item.description || (item as any).edit_metadata?.display_quantity) && (
                                    <div className="mt-0.5">
                                      {(item as any).edit_metadata?.display_quantity && (
                                        <p className="text-[10px] font-bold text-primary leading-tight">
                                          {(item as any).edit_metadata.display_quantity} {(item as any).edit_metadata.display_unit || ''}
                                        </p>
                                      )}
                                      {item.description && (
                                        <p className="text-[10px] text-muted-foreground whitespace-pre-line leading-snug">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </TabsContent>
              </Tabs>

              {/* CTA to full page */}
              <Link to="/my-diet" className="block">
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs border-primary/20 hover:bg-primary/10">
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  Abrir plano completo com adesão
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
