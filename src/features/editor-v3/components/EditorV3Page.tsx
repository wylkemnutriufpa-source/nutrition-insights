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
  Layout, Search, Loader2, User, Activity, Calculator,
  ChevronRight, Check, ChevronsUpDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TemplateV3Modal } from './TemplateV3Modal';
import { PremiumGallery } from './PremiumGallery';
import { getV3Templates } from '../utils/v3DataFetcher';
import { V3DietTemplate } from '../types/types';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { calculateItemMacros, scaleItemToTarget } from '@/lib/nutricore_v2/helpers';
import { calculateBMR, calculateTDEE, calculateTargetMacros, Gender, ActivityLevel, Goal } from '@/lib/nutritionalEquations';
import { AnimatePresence, motion } from 'framer-motion';

// No translation mapper needed anymore as keys are PT-BR by default
const translateSlot = (s: string) => s;


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
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [availablePatients, setAvailablePatients] = useState<any[]>([]);

  // Nutritional Targets (Automatic Calculation Only)
  const nutritionalTargets = useMemo(() => {
    if (!patientData) return null;
    
    const weight = Number(patientData.current_weight_kg) || 70;
    const height = Number(patientData.current_height_cm) || 170;
    const age = Number(patientData.age) || 30;
    const gender = (patientData.gender === 'feminino' ? 'female' : 'male') as Gender;
    const activityLevel = (patientData.activity_level || 'moderate') as ActivityLevel;
    const goal = (patientData.goal || 'maintenance') as Goal;

    const bmr = calculateBMR(weight, height, age, gender);
    const tdee = calculateTDEE(bmr, activityLevel);
    return calculateTargetMacros(weight, tdee, goal);
  }, [patientData]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [fetchedTemplates, patientsResult] = await Promise.all([
          getV3Templates(),
          (supabase.from('profiles') as any).select('user_id, full_name, current_weight_kg, current_height_cm, activity_level, goal').limit(100)
        ]);
        setTemplates(fetchedTemplates);
        if (patientsResult.data) setAvailablePatients(patientsResult.data);
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    }
    loadInitialData();
  }, []);

  const handleSelectProfile = async (kcal: number, isWeekly: boolean) => {
    if (!selectedTemplate) return;
    
    // Close modal BEFORE processing to prevent double clicks and visual lag
    setIsTemplateModalOpen(false);
    const toastId = toast.loading(`Aplicando template: ${selectedTemplate.title}...`);
    
    try {
      const clusterMap = (selectedTemplate.cluster_map as any) || {};
      const days = isWeekly ? [1, 2, 3, 4, 5, 6, 0] : [0];
      const newMeals: any[] = [];
      const distribution = (selectedTemplate.meal_distribution as any[]) || [];

      if (distribution.length === 0) {
        throw new Error('Template sem distribuição de refeições configurada.');
      }

      // Pre-fetch all needed library items to avoid N+1 queries in the loop
      const allClusterSlugs = Object.values(clusterMap) as string[];
      const { data: libraryItems, error: libError } = await supabase
        .from('v3_library_items')
        .select('*, images:v3_library_images(*)')
        .in('cluster_slug', allClusterSlugs)
        .eq('active', true);

      if (libError) throw libError;

      const libraryMap = new Map();
      (libraryItems || []).forEach(item => {
        const slug = item.cluster_slug;
        if (!libraryMap.has(slug)) {
          libraryMap.set(slug, item);
        }
      });
      
      console.log('[EditorV3] Library pre-fetched count:', libraryItems?.length);
      console.log('[EditorV3] Cluster Map to plot:', clusterMap);

      for (const day of days) {
        for (const dist of distribution) {
          // Normalizar chaves do clusterMap (banco pode salvar com espaços ou acentos, UI usa slots técnicos)
          const slot = dist.slot;
          const clusterSlug = clusterMap[slot] || clusterMap[slot.trim()] || Object.entries(clusterMap).find(([k]) => k.toLowerCase() === slot.toLowerCase())?.[1];
          let items: any[] = [];

          if (clusterSlug) {
            const food = libraryMap.get(clusterSlug);

            if (food) {
              const imageUrl = food.images?.[0]?.image_asset || (food.composition as any)?.imageUrl || null;
              const targetMealKcal = kcal / distribution.length;
              let quantity = scaleItemToTarget(food, targetMealKcal, 'kcal');
              const macros = calculateItemMacros(food, quantity);
              
              items = [{
                ...food,
                instanceId: crypto.randomUUID(),
                quantity,
                clinical_mass_g: quantity,
                substitutions: [],
                imageUrl,
                ...macros
              }];
            } else {
              console.warn(`[EditorV3] No food found for cluster slug: ${clusterSlug} in slot: ${slot}`);
            }
          } else {
            console.warn(`[EditorV3] No cluster slug mapping found for slot: ${slot}`);
          }

          newMeals.push({
            id: crypto.randomUUID(),
            name: translateSlot(slot),
            time: dist.time || "08:00",
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
        const { data: plan, error } = await (supabase
          .from('meal_plans') as any)
          .select('*, patient:profiles(*)')
          .eq('id', effectiveId)
          .maybeSingle(); // Use maybeSingle to avoid throw on not found

        if (error) {
          console.error('Database error:', error);
          setLoading(false);
          return;
        }

        if (!plan) {
          console.warn('Plan not found:', effectiveId);
          setLoading(false);
          return;
        }

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


  // Totals for the whole plan (Sum of PRIMARY items only)
  const planTotals = useMemo(() => {
    // We only sum macros for the unique items across all meals.
    // If a plan is weekly (7 days), we usually average or sum based on design.
    // FitJourney design: total daily calories.
    const dailyKcalMap: Record<number, number> = {};
    const dailyProtMap: Record<number, number> = {};
    const dailyCarbMap: Record<number, number> = {};
    const dailyFatMap: Record<number, number> = {};

    store.meals.forEach((meal) => {
      const day = meal.day_of_week || 0;
      if (!dailyKcalMap[day]) {
        dailyKcalMap[day] = 0;
        dailyProtMap[day] = 0;
        dailyCarbMap[day] = 0;
        dailyFatMap[day] = 0;
      }

      meal.items.forEach((item) => {
        dailyKcalMap[day] += item.kcal || 0;
        dailyProtMap[day] += item.protein || 0;
        dailyCarbMap[day] += item.carbs || 0;
        dailyFatMap[day] += item.fat || 0;
      });
    });

    const days = Object.keys(dailyKcalMap);
    if (days.length === 0) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };

    // Return the maximum day or the average. 
    // Usually, we want to show the current active day's total if in daily mode,
    // or the average if in weekly mode.
    // For simplicity and clinical safety: return the maximum day found (prevents underestimation).
    return {
      kcal: Math.max(...Object.values(dailyKcalMap)),
      protein: Math.max(...Object.values(dailyProtMap)),
      carbs: Math.max(...Object.values(dailyCarbMap)),
      fat: Math.max(...Object.values(dailyFatMap)),
    };
  }, [store.meals]);


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
          total_meta_calorias: Math.round(planTotals.kcal),
          total_meta_proteinas: Math.round(planTotals.protein),
          total_meta_carboidratos: Math.round(planTotals.carbs),
          total_meta_gorduras: Math.round(planTotals.fat),
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
    const names = ["Café da Manhã", "Lanche", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"];
    const currentCount = store.meals.length;
    const name = names[currentCount % names.length];
    store.addMeal(name);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-neutral-950">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] bg-neutral-950 text-white selection:bg-emerald-500/30 font-sans">
        {/* Header Superior */}
        <header className="px-8 py-5 bg-neutral-900/60 border-b border-white/5 flex items-center justify-between sticky top-0 z-30 shadow-2xl backdrop-blur-2xl transition-all duration-500">
          <div className="flex items-center gap-8">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="h-11 w-11 text-white/40 hover:text-white hover:bg-white/5 rounded-2xl transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-6">
              <div className="hidden lg:block group">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none group-hover:text-emerald-400 transition-colors">FitJourney</h1>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">V3 PRO</Badge>
                </div>
                <p className="text-[10px] text-white/20 uppercase font-bold tracking-[0.2em] mt-1.5 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-500/50 animate-pulse" />
                  Ambiente de Prescrição Premium
                </p>
              </div>

              <div className="h-10 w-px bg-white/10 hidden lg:block mx-1" />

              <Select 
                value={effectivePatientId || ""} 
                onValueChange={(val) => navigate(`/editor-v3/${val}`)}
              >
                <SelectTrigger className="w-[200px] h-10 bg-white/5 border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">
                  <User className="w-4 h-4 mr-2 text-emerald-500" />
                  <SelectValue placeholder="Selecionar Paciente" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/10 text-white">
                  {availablePatients.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id} className="text-[10px] font-black uppercase">
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


          </div>

          <div className="flex items-center gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-white/5 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-white/60 hover:text-emerald-400 text-[11px] font-black uppercase tracking-[0.2em] h-12 px-8 rounded-2xl hidden md:flex transition-all duration-300 shadow-lg"
                >
                  <Library className="w-5 h-5 mr-3" /> Biblioteca Premium
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl bg-neutral-950 border-white/10 text-white p-12 rounded-[3.5rem] shadow-[0_64px_128px_-32px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none" />
                
                <DialogHeader className="mb-12 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
                      <Library className="w-8 h-8" />
                    </div>
                    <div>
                      <DialogTitle className="text-4xl font-black uppercase italic tracking-tighter leading-none text-white">Biblioteca Soberana</DialogTitle>
                      <p className="text-[11px] text-white/20 uppercase font-black tracking-[0.3em] mt-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Padrões Clínicos de Alta Performance
                      </p>
                    </div>
                  </div>
                </DialogHeader>
                
                <PremiumGallery 
                  templates={templates} 
                  onSelect={(template) => {
                    setSelectedTemplate(template);
                    setIsTemplateModalOpen(true);
                  }} 
                />
              </DialogContent>
            </Dialog>

            <TemplateV3Modal 
              isOpen={isTemplateModalOpen}
              onClose={() => setIsTemplateModalOpen(false)}
              template={selectedTemplate}
              onSelectProfile={handleSelectProfile}
            />

            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white/60 text-[11px] font-black uppercase tracking-[0.2em] h-12 px-8 rounded-2xl hidden md:flex transition-all"
            >
              <Share2 className="w-5 h-5 mr-3" /> Compartilhar
            </Button>

            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-[0.2em] h-12 px-10 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 text-[11px]"
            >
              <Save className="w-5 h-5 mr-3" /> Salvar Plano
            </Button>
          </div>
        </header>

        {/* Dashboard de Macros */}
        <div className="px-10 py-10 bg-neutral-900/40 border-b border-white/5 grid grid-cols-2 md:grid-cols-4 gap-12 items-center backdrop-blur-3xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
          <div className="space-y-2 group">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-2.5 group-hover:text-orange-500 transition-colors duration-500">
              <Flame className="w-4 h-4 text-orange-500" /> Valor Calórico
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black italic tracking-tighter text-white tabular-nums">{Math.round(planTotals.kcal)}</span>
              <span className="text-[11px] font-black uppercase text-white/10 tracking-[0.2em]">kcal</span>
            </div>
          </div>

          <div className="space-y-2 group">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-2.5 group-hover:text-emerald-500 transition-colors duration-500">
              <Target className="w-4 h-4 text-emerald-500" /> Proteínas
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black italic tracking-tighter text-white tabular-nums">{Math.round(planTotals.protein)}</span>
              <span className="text-[11px] font-black uppercase text-white/10 tracking-[0.2em]">g</span>
            </div>
          </div>

          <div className="space-y-2 group">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-2.5 group-hover:text-blue-500 transition-colors duration-500">
              <Target className="w-4 h-4 text-blue-500" /> Carboidratos
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black italic tracking-tighter text-white tabular-nums">{Math.round(planTotals.carbs)}</span>
              <span className="text-[11px] font-black uppercase text-white/10 tracking-[0.2em]">g</span>
            </div>
          </div>

          <div className="space-y-2 group">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-2.5 group-hover:text-amber-500 transition-colors duration-500">
              <Target className="w-4 h-4 text-amber-500" /> Lipídeos
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black italic tracking-tighter text-white tabular-nums">{Math.round(planTotals.fat)}</span>
              <span className="text-[11px] font-black uppercase text-white/10 tracking-[0.2em]">g</span>
            </div>
          </div>
        </div>

        {/* Workspace Principal */}
        <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Timeline de Refeições */}
          <ScrollArea className="flex-1 h-full px-8 py-12">
            <div className="max-w-5xl mx-auto space-y-12 pb-32">
              <AnimatePresence mode="popLayout">
                {store.meals.map((meal, idx) => (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  >
                    <MealCard 
                      meal={meal} 
                      onUpdateQuantity={(itemId, qty) => store.updateFoodQuantity(meal.id, itemId, qty)}
                      onUpdateMacros={(itemId, val, type) => store.updateMealItemMacros(meal.id, itemId, val, type)}
                      onRemoveFood={(itemId) => store.removeFood(meal.id, itemId)}
                      onAddFood={(food) => store.addFoodToMeal(meal.id, food)}
                      onRemoveMeal={() => store.removeMeal(meal.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              <Button 
                onClick={handleAddMeal}
                variant="outline" 
                className="w-full h-24 bg-white/[0.02] border-dashed border-white/5 hover:bg-emerald-500/[0.03] hover:border-emerald-500/30 text-white/10 hover:text-emerald-400 rounded-[2.5rem] transition-all group/add-meal shadow-inner"
              >
                <Plus className="w-8 h-8 mr-4 group-hover/add-meal:scale-125 transition-transform duration-500" />
                <span className="uppercase text-xs font-black tracking-[0.3em]">Adicionar Nova Refeição ao Plano</span>
              </Button>
            </div>
          </ScrollArea>

          {/* Lateral Info / Sidebar de Metas (Opcional) */}
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
