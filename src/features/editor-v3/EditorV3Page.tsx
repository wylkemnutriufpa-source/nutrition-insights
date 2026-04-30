import React, { useEffect, useRef, useState } from 'react';
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
  ArrowLeft, UserX, Plus, Trash2, Lock,
  Sparkles, Save, Package, ChefHat, Clock,
  Apple, Layers, Utensils, CloudOff, Cloud, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EditorV3Page = () => {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('planId');

  const {
    meals, setPatientId, hydrateMeals,
    addMarmitaToMeal, addFoodToMeal, applyTemplateToMeal,
    removeFood, generatePlan, savePlan, planStatus,
    resetEditor
  } = useEditorState();

  const {
    draftId, syncState, initialMeals, scheduleSave, resetDraft
  } = useDraftSync(patientId ?? null, meals);

  const hydratedRef = useRef(false);
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    if (patientId) setPatientId(patientId);
  }, [patientId, setPatientId]);

  // Hidrata o store com o conteúdo do draft remoto (uma única vez)
  useEffect(() => {
    if (!hydratedRef.current && initialMeals && initialMeals.length > 0) {
      hydrateMeals(initialMeals);
      hydratedRef.current = true;
    }
  }, [initialMeals, hydrateMeals]);

  // Auto-save: dispara após cada mudança em meals (depois da hidratação)
  useEffect(() => {
    if (hydratedRef.current && draftId) {
      scheduleSave(meals);
    }
  }, [meals, draftId, scheduleSave]);

  const handleSavePlan = async () => {
    if (!draftId) {
      toast.error('Rascunho não está sincronizado com o servidor.');
      return;
    }
    setPromoting(true);
    try {
      const fresh = await loadOrCreateDraft(patientId!, meals);
      if (!fresh) {
        toast.error('Não foi possível recuperar o rascunho.');
        return;
      }
      const result = await promoteDraftToMealPlan({ ...fresh, payload: { meals, version: 1 } });
      if (result.ok) {
        toast.success('Plano salvo no sistema clínico (rascunho oficial).');
        await savePlan();
      } else {
        toast.error(`Falha ao salvar plano: ${result.error}`);
      }
    } finally {
      setPromoting(false);
    }
  };

  const handleReset = async () => {
    await resetDraft();
    resetEditor();
    hydratedRef.current = false;
    toast.success('Rascunho resetado.');
  };


  if (!patientId && !planId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <UserX className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Paciente não selecionado</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Para utilizar o Editor V3, você precisa selecionar um paciente ou carregar um plano existente.
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
      {/* Header V3 */}
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
              Editor V3
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[9px] font-black text-emerald-500/80 uppercase tracking-[0.2em]">
                Elite Engine Active
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn(
            "ml-2 text-[10px] font-black gap-1.5 py-1 px-2.5 border-emerald-500/20 transition-all duration-500",
            syncState === 'saved' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]",
            syncState === 'saving' && "bg-blue-500/10 text-blue-400 border-blue-500/30",
            syncState === 'loading' && "bg-blue-500/10 text-blue-400 border-blue-500/30",
            (syncState === 'offline' || syncState === 'error') && "bg-rose-500/10 text-rose-400 border-rose-500/30",
            syncState === 'idle' && "bg-white/5 text-white/40 border-white/10"
          )}>
            {syncState === 'saving' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
            {syncState === 'saved' && <Cloud className="w-3 h-3" />}
            {(syncState === 'offline' || syncState === 'error') && <CloudOff className="w-3 h-3" />}
            {syncState === 'loading' ? 'CARREGANDO' :
             syncState === 'saving' ? 'SALVANDO' :
             syncState === 'saved' ? 'SINCRONIZADO' :
             syncState === 'offline' ? 'OFFLINE' :
             syncState === 'error' ? 'ERRO' : 'DRAFT'}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
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
            onClick={handleSavePlan}
            disabled={promoting || !draftId}
            className="gap-2 font-black text-[11px] tracking-wide bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] rounded-lg px-5"
          >
            {promoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {promoting ? 'SINCRONIZANDO...' : 'SALVAR PLANO'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-12">
        {meals.map((meal, index) => (
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
                  <h2 className="font-black text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                    {meal.name}
                  </h2>
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
                          <span className="font-bold text-white/80 group-hover/item:text-white">{f.name}</span>
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
                          <span className="font-bold text-white/80 group-hover/item:text-white truncate pr-2">{m.name}</span>
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
                              {item.calories} <span className="text-white/20">kcal</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                            <p className="text-[11px] font-bold text-white/50">
                              {item.protein}g <span className="text-white/20">Prot</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/40" />
                            <p className="text-[11px] font-bold text-white/50">
                              {item.carbs}g <span className="text-white/20">Carb</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 z-10">
                      <div className="text-right">
                        <p className="font-black text-base text-emerald-500 leading-none">
                          {item.quantity * (item.portionValue || 1)} <span className="text-[10px] text-emerald-500/60 uppercase">{item.portionUnit}</span>
                        </p>
                        <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-1">Dose Real</p>
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
        ))}
      </main>

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
