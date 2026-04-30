import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEditorState } from './useEditorState';
import { useDraftSync } from './useDraftSync';
import { promoteDraftToMealPlan } from './promoteDraft';
import { loadOrCreateDraft } from './draftService';
import { mockMarmitas, mockFoods, mockTemplates } from './constants';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, UserX, Plus, Trash2, Lock,
  Sparkles, Save, Package, ChefHat, Clock,
  Apple, Layers, Utensils, CloudOff, Cloud, Loader2,
  AlertTriangle, CheckCircle2, XCircle, RotateCcw,
  Zap, Activity, PieChart, Minus
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Meal, MealItem } from './types';

const formatPortion = (quantity: number, unit: string) => {
  if (quantity === 1) {
    if (unit === 'fatia') return '1 fatia';
    if (unit === 'unidade') return '1 unidade';
    if (unit === 'colher') return '1 colher';
    if (unit === 'pote') return '1 pote';
    if (unit === 'medida') return '1 medida';
    if (unit === 'marmita') return '1 marmita';
    return `1 ${unit}`;
  }
  
  const plurals: Record<string, string> = {
    fatia: 'fatias',
    unidade: 'unidades',
    colher: 'colheres',
    pote: 'potes',
    medida: 'medidas',
    marmita: 'marmitas'
  };
  
  return `${quantity} ${plurals[unit] || unit + 's'}`;
};

const EditorV3Page = () => {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('planId');

  const {
    meals, setPatientId, hydrateMeals,
    addMarmitaToMeal, addFoodToMeal, applyTemplateToMeal,
    removeFood, updateFoodQuantity, generatePlan, savePlan, planStatus,
    resetEditor
  } = useEditorState();

  const {
    draftId, syncState, initialMeals, lastSavedAt,
    scheduleSave, resetDraft, reloadFromServer, revertToLastSaved
  } = useDraftSync(patientId ?? null, meals, meals);

  const hydratedRef = useRef(false);
  const [promoting, setPromoting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  // Macros totais memoizados
  const totalMacros = useMemo(() => {
    return meals.reduce((acc, meal) => {
      meal.items.forEach(item => {
        const q = item.quantity ?? 1;
        acc.kcal += (item.calories ?? 0) * q;
        acc.protein += (item.protein ?? 0) * q;
        acc.carbs += (item.carbs ?? 0) * q;
        acc.fat += (item.fat ?? 0) * q;
      });
      return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }, [meals]);

  // Validação do plano
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!patientId) errors.push("Paciente não identificado.");
    
    const hasItems = meals.some(m => m.items.length > 0);
    if (!hasItems) errors.push("O plano deve ter pelo menos um item.");

    const emptyMeals = meals.filter(m => m.items.length === 0);
    if (emptyMeals.length > 0) {
      warnings.push(`${emptyMeals.length} refeições estão vazias.`);
    }

    if (totalMacros.kcal === 0) errors.push("Macros totais não podem ser zero.");

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [meals, patientId, totalMacros.kcal]);

  useEffect(() => {
    if (patientId) setPatientId(patientId);
  }, [patientId, setPatientId]);

  useEffect(() => {
    if (initialMeals && initialMeals.length > 0) {
      hydrateMeals(initialMeals);
      hydratedRef.current = true;
    }
  }, [initialMeals, hydrateMeals]);

  useEffect(() => {
    if (hydratedRef.current && draftId) {
      scheduleSave(meals);
    }
  }, [meals, draftId, scheduleSave]);

  const handlePromotionRequest = () => {
    setShowValidation(true);
  };

  const handleConfirmPromotion = async () => {
    if (!validation.isValid) {
      toast.error("Corrija os erros antes de salvar.");
      return;
    }

    if (!draftId) {
      toast.error('Rascunho não está sincronizado.');
      return;
    }

    setPromoting(true);
    setShowValidation(false);
    
    try {
      const fresh = await loadOrCreateDraft(patientId!, meals);
      if (!fresh) {
        toast.error('Erro ao recuperar rascunho remoto.');
        return;
      }
      const result = await promoteDraftToMealPlan({ ...fresh, payload: { meals, version: 1 } });
      if (result.ok) {
        toast.success('Plano promovido com sucesso!');
        await savePlan();
      } else {
        toast.error(`Erro: ${result.error}`);
      }
    } finally {
      setPromoting(false);
    }
  };

  const handleReset = async () => {
    await resetDraft();
    resetEditor();
    hydratedRef.current = false;
    setShowResetConfirm(false);
    toast.success('Rascunho resetado.');
  };

  const handleRevert = () => {
    revertToLastSaved();
    setShowRevertConfirm(false);
  };

  if (!patientId && !planId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <UserX className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Paciente não selecionado</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Para utilizar o Editor V3, você precisa selecionar um paciente.
        </p>
        <Button onClick={() => navigate('/patients')} variant="default" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Pacientes
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000] flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Header V3 Elite */}
      <header className="border-b border-emerald-500/10 bg-black/80 backdrop-blur-2xl sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-2xl shadow-emerald-500/5">
        <div className="flex items-center gap-5">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 transition-all active:scale-95 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
              Editor V3 Elite
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[9px] font-black text-emerald-500/80 uppercase tracking-[0.2em]">
                Control System Active
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn(
            "ml-2 text-[10px] font-black gap-1.5 py-1 px-2.5 border-emerald-500/20 transition-all duration-500",
            syncState === 'saved' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]",
            syncState === 'saving' && "bg-blue-500/10 text-blue-400 border-blue-500/30",
            syncState === 'loading' && "bg-blue-500/10 text-blue-400 border-blue-500/30",
            (syncState === 'offline' || syncState === 'error') && "bg-rose-500/10 text-rose-400 border-rose-500/30",
            syncState === 'conflict' && "bg-amber-500/10 text-amber-400 border-amber-500/30",
            syncState === 'idle' && "bg-white/5 text-white/40 border-white/10"
          )}>
            {syncState === 'saving' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
            {syncState === 'saved' && <Cloud className="w-3 h-3" />}
            {(syncState === 'offline' || syncState === 'error') && <CloudOff className="w-3 h-3" />}
            {syncState === 'conflict' && <AlertTriangle className="w-3 h-3" />}
            {syncState === 'loading' ? 'CARREGANDO' :
             syncState === 'saving' ? 'SALVANDO' :
             syncState === 'saved' ? 'SINCRONIZADO' :
             syncState === 'offline' ? 'OFFLINE' :
             syncState === 'conflict' ? 'CONFLITO' :
             syncState === 'error' ? 'ERRO' : 'DRAFT'}
          </Badge>

          {/* Resumo de Macros no Header (Sticky) */}
          <div className="hidden md:flex items-center gap-6 ml-8 px-6 border-l border-white/10">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Total Kcal</span>
              <span className="text-sm font-black text-white">{Math.round(totalMacros.kcal)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Proteína</span>
              <span className="text-sm font-black text-emerald-400">{Math.round(totalMacros.protein)}g</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Carbo</span>
              <span className="text-sm font-black text-blue-400">{Math.round(totalMacros.carbs)}g</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Gordura</span>
              <span className="text-sm font-black text-amber-400">{Math.round(totalMacros.fat)}g</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRevertConfirm(true)}
            className="text-[11px] font-bold text-white/40 hover:text-amber-400 hover:bg-amber-400/10 transition-colors rounded-lg gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reverter
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResetConfirm(true)}
            className="text-[11px] font-bold text-white/40 hover:text-rose-400 hover:bg-rose-400/10 transition-colors rounded-lg"
          >
            Resetar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generatePlan('muscle-gain')}
            className="gap-2 border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-[11px] font-black tracking-wide transition-all rounded-lg"
          >
            <Sparkles className="w-3.5 h-3.5 fill-emerald-500/20" />
            GERAR COM IA
          </Button>
          <Button
            size="sm"
            onClick={handlePromotionRequest}
            disabled={promoting || !draftId}
            className="gap-2 font-black text-[11px] tracking-wide bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] rounded-lg px-5"
          >
            {promoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {promoting ? 'SALVANDO...' : 'SALVAR PLANO'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-12 pb-32">
        {meals.map((meal, index) => {
          // Macros por refeição
          const mealMacros = meal.items.reduce((acc, item) => {
            const q = item.quantity ?? 1;
            acc.kcal += (item.calories ?? 0) * q;
            acc.p += (item.protein ?? 0) * q;
            acc.c += (item.carbs ?? 0) * q;
            acc.f += (item.fat ?? 0) * q;
            return acc;
          }, { kcal: 0, p: 0, c: 0, f: 0 });

          return (
            <section 
              key={meal.id} 
              className="group animate-in fade-in slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <ChefHat className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="font-black text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                        {meal.name}
                      </h2>
                      {mealMacros.kcal > 0 && (
                        <div className="flex gap-2">
                           <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black border-0">{Math.round(mealMacros.kcal)} kcal</Badge>
                           <Badge className="bg-white/5 text-white/40 text-[10px] font-black border-0">{Math.round(mealMacros.p)}g P</Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 text-emerald-500/50" />
                      {meal.time}
                    </div>
                  </div>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest border-emerald-500/20 bg-black hover:bg-emerald-500/5 hover:border-emerald-500/40 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-0 overflow-hidden border-emerald-500/20 bg-black/95 backdrop-blur-2xl shadow-2xl">
                    {/* Alimentos */}
                    <div className="p-4 border-b border-emerald-500/10">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-3 flex items-center gap-2">
                        <Apple className="w-3 h-3" /> Alimentos Avulsos
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {mockFoods.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => addFoodToMeal(meal.id, f)}
                            className="w-full text-left text-xs p-3 rounded-xl hover:bg-emerald-500/10 transition-all flex justify-between items-center group/item"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-white/80 group-hover/item:text-white">{f.name}</span>
                              <span className="text-[10px] font-bold text-white/30 uppercase mt-0.5">{f.portionLabel}</span>
                            </div>
                            <span className="text-[10px] font-black text-white/30 group-hover/item:text-emerald-500 transition-colors uppercase">
                              {f.calories} kcal
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Marmitas */}
                    <div className="p-4 border-b border-emerald-500/10">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-3 flex items-center gap-2">
                        <Utensils className="w-3 h-3" /> Marmitas
                      </p>
                      <div className="space-y-1.5">
                        {mockMarmitas.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => addMarmitaToMeal(meal.id, m)}
                            className="w-full text-left text-xs p-3 rounded-xl hover:bg-emerald-500/10 transition-all flex justify-between items-center group/item"
                          >
                            <div className="flex flex-col truncate pr-2">
                              <span className="font-bold text-white/80 group-hover/item:text-white truncate">{m.name}</span>
                              <span className="text-[10px] font-bold text-white/30 uppercase mt-0.5">{m.portionLabel}</span>
                            </div>
                            <span className="text-[10px] font-black text-white/30 group-hover/item:text-emerald-500 transition-colors uppercase shrink-0">
                              {m.calories} kcal
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Templates */}
                    <div className="p-4 bg-emerald-500/[0.02]">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-3 flex items-center gap-2">
                        <Layers className="w-3 h-3" /> Templates Completos
                      </p>
                      <div className="space-y-1.5">
                        {mockTemplates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => applyTemplateToMeal(meal.id, t)}
                            className="w-full text-left text-xs p-3 rounded-xl hover:bg-emerald-500/10 transition-all group/item"
                          >
                            <p className="font-bold text-white/80 group-hover/item:text-white">{t.name}</p>
                            <p className="text-[10px] text-white/30 group-hover/item:text-white/50 leading-relaxed mt-0.5">{t.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

            <div className="grid gap-5">
              {meal.items.length === 0 ? (
                <div className="border-2 border-dashed border-emerald-500/5 rounded-3xl p-12 flex flex-col items-center justify-center text-white/20 bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-500 group/empty">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover/empty:scale-110 transition-transform duration-500">
                    <Package className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest opacity-40">Refeição Vazia</p>
                  <p className="text-[10px] uppercase font-bold tracking-tighter opacity-20 mt-1">Clique em adicionar para começar</p>
                </div>
              ) : (
                meal.items.map((item) => (
                  <Card 
                    key={item.instanceId} 
                    className={cn(
                      "p-5 flex items-center justify-between border-0 border-l-[3px] bg-white/[0.03] hover:bg-white/[0.06] transition-all hover:translate-x-1 duration-300 rounded-2xl group/card relative overflow-hidden",
                      item.locked ? "border-amber-500/50" : "border-emerald-500/50"
                    )}
                  >
                    {/* Glossy overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent pointer-events-none" />
                    
                    <div className="flex items-center gap-5 z-10">
                      {item.imageUrl && (
                        <div className="relative group/img">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-14 h-14 rounded-xl object-cover shadow-2xl transition-transform duration-500 group-hover/img:scale-110"
                          />
                          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <p className="font-black text-[15px] tracking-tight text-white group-hover/card:text-emerald-400 transition-colors">
                            {item.name}
                          </p>
                          {item.locked && (
                            <Badge variant="outline" className="h-5 text-[8px] font-black bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1 uppercase tracking-wider px-2">
                              <Lock className="w-2.5 h-2.5" />
                              LOCKED
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                            <p className="text-[11px] font-bold text-white/50">
                              {Math.round((item.quantity ?? 1) * (item.calories ?? 0))} <span className="text-white/20">kcal</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                            <p className="text-[11px] font-bold text-white/50">
                              {Math.round((item.quantity ?? 1) * (item.protein ?? 0))}g <span className="text-white/20">Prot</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/40" />
                            <p className="text-[11px] font-bold text-white/50">
                              {Math.round((item.quantity ?? 1) * (item.carbs ?? 0))}g <span className="text-white/20">Carb</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 z-10">
                      <div className="flex items-center bg-black/40 rounded-xl border border-white/5 p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={item.locked || (item.quantity ?? 1) <= 1}
                          onClick={() => updateFoodQuantity(meal.id, item.instanceId, (item.quantity ?? 1) - 1)}
                          className="h-8 w-8 text-white/40 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        
                        <div className="px-3 text-center min-w-[80px]">
                          <p className="font-black text-sm text-white">
                            {formatPortion(item.quantity ?? 1, item.portionUnit)}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={item.locked}
                          onClick={() => updateFoodQuantity(meal.id, item.instanceId, (item.quantity ?? 1) + 1)}
                          className="h-8 w-8 text-white/40 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="text-right min-w-[60px]">
                        <p className="font-black text-base text-emerald-500 leading-none">
                          {Math.round((item.quantity ?? 1) * item.calories)} <span className="text-[10px] text-emerald-500/60 uppercase">kcal</span>
                        </p>
                        <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-1">Total</p>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeFood(meal.id, item.instanceId)}
                        disabled={item.locked}
                        className={cn(
                          "h-10 w-10 text-white/20 rounded-xl transition-all",
                          item.locked ? "opacity-10 cursor-not-allowed" : "hover:text-rose-500 hover:bg-rose-500/10 active:scale-90"
                        )}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </section>
        );
      })}
      </main>

      {/* MODALS */}
      
      {/* Modal de Validação / Promoção */}
      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent className="bg-black/95 border-emerald-500/20 text-white backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black italic">
              <Zap className="w-5 h-5 text-emerald-500" />
              VALIDAÇÃO CLÍNICA
            </DialogTitle>
            <DialogDescription className="text-white/40 font-bold uppercase text-[10px] tracking-widest">
              Verificando integridade do plano antes da promoção
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {validation.errors.map((error, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 animate-in slide-in-from-left-2 duration-300">
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-rose-200">{error}</p>
              </div>
            ))}

            {validation.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-in slide-in-from-left-2 duration-500">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-amber-200">{warning}</p>
              </div>
            ))}

            {validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                  <p className="font-black text-lg text-white italic">Plano Impecável!</p>
                  <p className="text-sm text-white/40 font-bold">Tudo pronto para salvar no sistema oficial.</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowValidation(false)} className="font-black uppercase tracking-widest text-[10px]">
              Corrigir
            </Button>
            <Button 
              onClick={handleConfirmPromotion} 
              disabled={!validation.isValid || promoting}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] px-8"
            >
              {promoting ? "Promovendo..." : "Prosseguir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Reversão */}
      <Dialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
        <DialogContent className="bg-black/95 border-amber-500/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              REVERTER ALTERAÇÕES?
            </DialogTitle>
            <DialogDescription className="text-white/40 font-bold">
              Isso voltará o rascunho para o último estado sincronizado com sucesso no servidor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRevertConfirm(false)}>Cancelar</Button>
            <Button onClick={handleRevert} className="bg-amber-500 hover:bg-amber-400 text-black font-black">Reverter Agora</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Reset */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="bg-black/95 border-rose-500/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black text-rose-500">
              <Trash2 className="w-5 h-5" />
              RESET SEGURO DO DRAFT
            </DialogTitle>
            <DialogDescription className="text-white/40 font-bold">
              ATENÇÃO: Esta ação é irreversível. O rascunho atual será permanentemente removido do servidor e do armazenamento local.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowResetConfirm(false)}>Manter Plano</Button>
            <Button onClick={handleReset} className="bg-rose-500 hover:bg-rose-600 text-white font-black">Limpar Tudo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer Info */}
      <footer className="p-8 text-center border-t border-emerald-500/5 bg-black/40 backdrop-blur-md">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-700 cursor-default">
            <span className="h-px w-8 bg-emerald-500/50" />
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.4em]">
              Elite Performance System
            </p>
            <span className="h-px w-8 bg-emerald-500/50" />
          </div>
          <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
            FitJourney Editor V3 • Engine v3.0.1-stable • © 2026
          </p>
        </div>
      </footer>
    </div>
  );
};

export default EditorV3Page;
