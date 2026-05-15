
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useEditorState } from '../hooks/useEditorState';
import { MealCard } from './MealCard';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Save, Plus, Target, Flame, 
  CheckCircle2, AlertCircle, Info, Send, Share2,
  Trash2, Copy, MoreHorizontal, Settings, Library,
  Layout, Search, Loader2, User, Activity, Calculator
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TemplateV3Modal } from './TemplateV3Modal';
import { getV3Templates } from '../utils/v3DataFetcher';
import { V3DietTemplate } from '../types/types';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { calculateItemMacros, scaleItemToTarget } from '@/lib/nutricore_v2/helpers';
import { calculateBMR, calculateTDEE, calculateTargetMacros, Gender, ActivityLevel, Goal } from '@/lib/nutritionalEquations';





export default function EditorV3Page() {
  const { patientId, planId, id } = useParams<{ patientId: string; planId: string; id: string }>();
  const effectiveId = planId || id;
  const effectivePatientId = patientId;

  const navigate = useNavigate();
  const store = useEditorState();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<V3DietTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<V3DietTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);

  // Nutritional Targets (Automatic Calculation Only)
  const nutritionalTargets = useMemo(() => {
    if (!patientData) return null;
    
    const weight = patientData.weight || 70;
    const height = patientData.height || 170;
    const age = patientData.age || 30;
    const gender = (patientData.gender === 'feminino' ? 'female' : 'male') as Gender;
    const activityLevel = (patientData.activity_level || 'moderate') as ActivityLevel;
    const goal = (patientData.goal || 'maintenance') as Goal;

    const bmr = calculateBMR(weight, height, age, gender);
    const tdee = calculateTDEE(bmr, activityLevel);
    return calculateTargetMacros(weight, tdee, goal);
  }, [patientData]);


  useEffect(() => {
    async function loadInitialData() {
      const fetchedTemplates = await getV3Templates();
      setTemplates(fetchedTemplates);
    }
    loadInitialData();
  }, []);

  const handleSelectProfile = async (kcal: number, isWeekly: boolean) => {
    if (!selectedTemplate) return;
    
    const toastId = toast.loading(`Aplicando template: ${selectedTemplate.title}...`);
    
    try {
      const clusterMap = selectedTemplate.cluster_map || {};
      const days = isWeekly ? [1, 2, 3, 4, 5, 6, 0] : [0];
      const newMeals: any[] = [];

      for (const day of days) {
        for (const dist of selectedTemplate.meal_distribution) {
          const slot = dist.slot;
          const clusterSlug = clusterMap[slot];
          let items: any[] = [];

          if (clusterSlug) {
            const { data: libraryItems } = await supabase
              .from('v3_library_items')
              .select('*')
              .eq('cluster_slug', clusterSlug)
              .eq('active', true)
              .limit(1);
            
            if (libraryItems && libraryItems.length > 0) {
              const food = libraryItems[0];
              const { data: subs } = await supabase
                .from('v3_library_items')
                .select('*')
                .eq('substitutions_group', food.substitutions_group)
                .neq('id', food.id)
                .eq('active', true)
                .limit(5);

              // Calculate quantity based on total target calories and number of meals
              const targetMealKcal = kcal / selectedTemplate.meal_distribution.length;
              const quantity = scaleItemToTarget(food, targetMealKcal, 'kcal');
              const macros = calculateItemMacros(food, quantity);
              
              items = [{
                ...food,
                instanceId: crypto.randomUUID(),
                quantity,
                clinical_mass_g: quantity,
                substitutions: subs || [],
                ...macros
              }];
            }
          }

          newMeals.push({
            id: crypto.randomUUID(),
            name: slot.replace(/_/g, ' '),
            time: dist.time,
            day_of_week: day,
            items
          });
        }
      }

      store.hydrateMeals(newMeals);
      toast.success('Template plotado com sucesso!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao plotar template', { id: toastId });
    }
  };




  useEffect(() => {
    async function loadPlan() {
      // 1. Prioritize patient ID if present in URL
      if (effectivePatientId) {
        store.setPatientId(effectivePatientId);
        
        // Load patient data even without a specific plan
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', effectivePatientId)
          .maybeSingle();
        
        if (profile) {
          setPatientData(profile);
        }
      }

      if (!effectiveId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: plan, error } = await supabase
          .from('meal_plans')
          .select('*, patient:profiles(*)') // Changed from patients(*) to profiles(*)
          .eq('id', effectiveId)
          .single();

        if (error) throw error;

        const planData = plan as any;
        if (planData?.patient) {
          setPatientData(planData.patient);
        }

        if (planData?.items_payload && (planData.items_payload as any).meals) {
          store.hydrateMeals((planData.items_payload as any).meals);
        } else if (planData?.meals) {
          store.hydrateMeals(planData.meals as any);
        }
        
        if (planData?.patient_id) {
          store.setPatientId(planData.patient_id);
        }
      } catch (err) {
        console.error('Erro ao carregar plano:', err);
        toast.error('Erro ao carregar dados do plano');
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, [effectiveId, effectivePatientId]);


  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-neutral-950">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }


  // Totals for the whole plan (Sum of PRIMARY items only)
  const planTotals = store.meals.reduce((acc, meal) => {
    meal.items.forEach((item, index) => {
      // Rule: only the "primary" items (usually the ones in the main items array) count.
      // Substitutions list within each item is already excluded because we are iterating meal.items.
      acc.kcal += item.kcal || 0;
      acc.protein += item.protein || 0;
      acc.carbs += item.carbs || 0;
      acc.fat += item.fat || 0;
    });
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });


  const handleSave = async () => {
    if (!effectiveId) return;
    setSaving(true);
    const toastId = toast.loading('Salvando alterações...');
    
    try {
      // In a real implementation, we would persist store.meals to the DB
      // For now, let's simulate and update the metadata
      const { error } = await supabase
        .from('meal_plans')
        .update({
          items_payload: { meals: store.meals },
          total_target_calories: Math.round(planTotals.kcal),
          total_target_protein: Math.round(planTotals.protein),
          total_target_carbs: Math.round(planTotals.carbs),
          total_target_fat: Math.round(planTotals.fat),
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', effectiveId);


      if (error) throw error;
      toast.success('Plano salvo com sucesso!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar plano', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMeal = () => {
    const names = ["Café da Manhã", "Lanche", "Almoço", "Café da Tarde", "Jantar", "Ceia"];
    const currentCount = store.meals.length;
    const name = names[currentCount % names.length];
    store.addMeal(name);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] bg-neutral-950 text-white selection:bg-emerald-500/30">
        {/* Header Superior */}
        <header className="px-8 py-4 bg-neutral-900/40 border-b border-white/5 flex items-center justify-between sticky top-0 z-30 shadow-2xl backdrop-blur-xl transition-all duration-300">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="h-10 w-10 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black uppercase italic tracking-tighter">FitJourney Editor Profissional</h1>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] font-black uppercase tracking-widest px-2 py-0">Estável</Badge>
              </div>
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-0.5">Gestão de templates clínicos e cálculo automático</p>
            </div>


          </div>

          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-white/5 border-white/10 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl hidden md:flex"
                >
                  <Library className="w-4 h-4 mr-2" /> Templates
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-neutral-950 border-white/10 text-white p-6 rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">Biblioteca de Templates</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setIsTemplateModalOpen(true);
                        }}
                        className="flex flex-col p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 transition-all text-left group"
                      >
                        <Badge className="w-fit mb-3 bg-emerald-500/10 text-emerald-500 border-transparent text-[8px] uppercase font-black">
                          {template.family || 'Geral'}
                        </Badge>
                        <h4 className="text-lg font-black uppercase italic group-hover:text-emerald-400 transition-colors">
                          {template.title}
                        </h4>
                        <p className="text-xs text-white/40 mt-2 line-clamp-2 uppercase font-medium">
                          {template.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl hidden md:flex"
            >
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </Button>

            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest h-10 px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Save className="w-4 h-4 mr-2" /> Salvar Plano
            </Button>
          </div>
        </header>

        {/* Dashboard de Macros */}
        <div className="px-8 py-8 bg-neutral-900/30 border-b border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8 items-center backdrop-blur-md">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <Flame className="w-3 h-3 text-orange-500" /> Valor Calórico
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black italic tracking-tighter text-white">{Math.round(planTotals.kcal)}</span>
              <span className="text-xs font-black uppercase text-white/20 tracking-widest">kcal</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <Target className="w-3 h-3 text-emerald-500" /> Proteínas
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black italic tracking-tighter text-white">{Math.round(planTotals.protein)}</span>
              <span className="text-xs font-black uppercase text-white/20 tracking-widest">g</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <Target className="w-3 h-3 text-blue-500" /> Carboidratos
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black italic tracking-tighter text-white">{Math.round(planTotals.carbs)}</span>
              <span className="text-xs font-black uppercase text-white/20 tracking-widest">g</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <Target className="w-3 h-3 text-amber-500" /> Lipídeos
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black italic tracking-tighter text-white">{Math.round(planTotals.fat)}</span>
              <span className="text-xs font-black uppercase text-white/20 tracking-widest">g</span>
            </div>
          </div>
        </div>

        {/* Workspace Principal */}
        <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Timeline de Refeições */}
          <ScrollArea className="flex-1 h-full px-8 py-8">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
              {store.meals.map((meal) => (
                <MealCard 
                  key={meal.id} 
                  meal={meal} 
                  onUpdateQuantity={(itemId, qty) => store.updateFoodQuantity(meal.id, itemId, qty)}
                  onUpdateMacros={(itemId, val, type) => store.updateMealItemMacros(meal.id, itemId, val, type)}
                  onRemoveFood={(itemId) => store.removeFood(meal.id, itemId)}
                  onAddFood={(food) => store.addFoodToMeal(meal.id, food)}
                  onRemoveMeal={() => store.removeMeal(meal.id)}
                />

              ))}

              {/* Botão Adicionar Refeição */}
              <Button 
                onClick={handleAddMeal}
                className="w-full h-32 bg-white/[0.02] border-2 border-dashed border-white/5 hover:bg-emerald-500/[0.02] hover:border-emerald-500/30 text-white/10 hover:text-emerald-500 rounded-[2.5rem] transition-all duration-500 group"
              >
                <div className="flex flex-col items-center gap-1">
                  <Plus className="w-6 h-6 group-hover:scale-125 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Nova Refeição</span>
                </div>
              </Button>
            </div>
          </ScrollArea>

          {/* Barra Lateral de Status (Hidden on Mobile) */}
          <aside className="hidden lg:flex w-80 bg-neutral-900 border-l border-white/10 p-6 flex-col gap-8">
            {/* Automatic Calculation Section */}
            {nutritionalTargets && (
              <section className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Calculator className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Alvo do Paciente</h4>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Kcal Recomendado</p>
                    <p className="text-xl font-black italic">{nutritionalTargets.calories} <span className="text-[10px] uppercase text-white/20">kcal</span></p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 border-t border-emerald-500/10 pt-3">
                    <div>
                      <p className="text-[8px] font-black uppercase text-white/30">Prot</p>
                      <p className="text-xs font-bold">{nutritionalTargets.protein}g</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-white/30">Carb</p>
                      <p className="text-xs font-bold">{nutritionalTargets.carbs}g</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-white/30">Gord</p>
                      <p className="text-xs font-bold">{nutritionalTargets.fat}g</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-[8px] text-white/40 uppercase font-medium leading-tight">
                  Cálculo automático baseado no peso ({patientData.current_weight_kg || patientData.weight || 70}kg), altura ({patientData.current_height_cm || patientData.height || 170}cm) e objetivo ({patientData.goal || 'Manutenção'}).
                </p>
              </section>
            )}

            <section>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Auditoria Nutricional
              </h4>
              <div className="space-y-3">
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-white/60 mb-1">Editor Manual Ativo</p>
                    <p className="text-[9px] text-white/40 font-medium leading-tight">Controle total do nutricionista habilitado.</p>
                  </div>
                </div>
              </div>
            </section>


            <section className="mt-auto">
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">FitJourney Editor</p>
                <p className="text-sm font-bold text-white mb-4 italic">"Plataforma Profissional de Templates e Cálculos"</p>
                <Badge className="bg-white/10 text-white/60 border-transparent text-[8px] uppercase font-black">v4.0.0-stable</Badge>

              </div>
            </section>
          </aside>
        </main>
      </div>

      <TemplateV3Modal 
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        template={selectedTemplate}
        onSelectProfile={handleSelectProfile}
      />
    </DashboardLayout>
  );
}

