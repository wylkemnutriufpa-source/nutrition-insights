import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useEditorState } from '../hooks/useEditorState';
import { MealCard } from './MealCard';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Save, Plus, Target, Flame, 
  CheckCircle2, AlertCircle, Info, Send,
  Trash2, Copy, MoreHorizontal, Settings, Library,
  Layout, Search, Loader2, User, Activity, Calculator,
  ChevronRight, Check, ChevronsUpDown, Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TemplateV3Modal } from './TemplateV3Modal';
import { PremiumGallery } from './PremiumGallery';
import SharePlanDialog from '@/components/meal-plan/SharePlanDialog';
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
import { useAuth } from '@/lib/auth';
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
  const { user } = useAuth();
  const store = useEditorState();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<V3DietTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<V3DietTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const [activeDay, setActiveDay] = useState<number>(1); // 1 = Segunda-feira (Padrão)
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
        // Fetch templates
        const fetchedTemplates = await getV3Templates();
        setTemplates(fetchedTemplates);

        // Fetch patients filtered by this nutritionist's patients
        if (user?.id) {
          const { data: links } = await supabase
            .from('nutritionist_patients')
            .select('patient_id')
            .eq('nutritionist_id', user.id)
            .eq('status', 'active');

          if (links && links.length > 0) {
            const patientIds = links.map((l: any) => l.patient_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, full_name, current_weight_kg, current_height_cm, activity_level, goal')
              .in('user_id', patientIds)
              .order('full_name', { ascending: true });
            if (profiles) setAvailablePatients(profiles);
          }
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    }
    loadInitialData();
  }, [user?.id]);

  const handleSelectProfile = async (kcal: number, isWeekly: boolean) => {
    if (!selectedTemplate) return;
    
    setIsTemplateModalOpen(false);
    const toastId = toast.loading(`Aplicando template: ${selectedTemplate.title}...`);
    
    try {
      const clusterMap = (selectedTemplate.cluster_map as any) || {};
      const days = isWeekly ? [1, 2, 3, 4, 5, 6, 0] : [activeDay]; 
      const newMeals: any[] = [];
      const distribution = (selectedTemplate.meal_distribution as any[]) || [];

      if (distribution.length === 0) {
        throw new Error('Template sem distribuição de refeições configurada.');
      }

      // 1. Get all clusters for the whole template
      const allClusterSlugs = Object.values(clusterMap) as string[];
      
      // 2. Fetch primary items for those clusters
      const { data: primaryItems } = await supabase
        .from('v3_library_items')
        .select('*')
        .in('cluster_slug', allClusterSlugs);

      if (!primaryItems || primaryItems.length === 0) {
        throw new Error('Nenhum alimento encontrado para os clusters deste template.');
      }

      // 3. Identify substitution groups for these items
      const subGroups = Array.from(new Set(primaryItems
        .map(i => i.substitutions_group)
        .filter(Boolean))) as string[];

      // 4. Fetch all substitutes in parallel
      const { data: allSubstitutes } = await supabase
        .from('v3_library_items')
        .select('*')
        .in('substitutions_group', subGroups.length > 0 ? subGroups : ['none']);

      // 5. Organize data for efficient processing
      const itemsByCluster = new Map<string, any[]>();
      primaryItems.forEach(item => {
        if (!itemsByCluster.has(item.cluster_slug)) itemsByCluster.set(item.cluster_slug, []);
        itemsByCluster.get(item.cluster_slug)?.push(item);
      });

      const substitutesByGroup = new Map<string, any[]>();
      (allSubstitutes || []).forEach(sub => {
        if (!substitutesByGroup.has(sub.substitutions_group)) substitutesByGroup.set(sub.substitutions_group, []);
        substitutesByGroup.get(sub.substitutions_group)?.push(sub);
      });

      // 6. Generate the plan
      for (const day of days) {
        for (const dist of distribution) {
          const slot = dist.slot;
          const clusterSlug = clusterMap[slot];
          
          if (!clusterSlug) continue;

          const clusterFoods = itemsByCluster.get(clusterSlug) || [];
          if (clusterFoods.length === 0) continue;

          // VARIETY LOGIC: Rotate foods based on the day
          // This ensures Mon, Tue, Wed have different foods if the cluster has multiple options
          const foodToUseIndex = day % clusterFoods.length;
          const rawFood = clusterFoods[foodToUseIndex];

          // BREAK DOWN PACKAGED MEALS: If the item has ingredients/composition, we extract them
          // BUT the user wants INDIVIDUAL items. If a cluster food represents a "plate", 
          // we should ideally have individual items in the library.
          // For now, if composition exists, we plot them as separate items.
          
          let itemsToPlot: any[] = [];
          const composition = rawFood.composition as any;
          
          if (composition && Array.isArray(composition.items) && composition.items.length > 0) {
            // It's a "packaged" meal, we break it down into individual items
            itemsToPlot = composition.items.map((compItem: any) => {
              // Try to find if this item exists as a standalone in the library for better metadata
              // For now, we create a basic item
              const targetKcal = (kcal / distribution.length) / composition.items.length;
              
              return {
                id: crypto.randomUUID(), // Temp ID for broken down item
                instanceId: crypto.randomUUID(),
                name: compItem.name,
                quantity: parseFloat(compItem.amount) || 100,
                clinical_mass_g: parseFloat(compItem.amount) || 100,
                kcal: targetKcal, 
                protein: targetKcal * 0.1, // Fallback ratio
                carbs: targetKcal * 0.1,
                fat: targetKcal * 0.05,
                substitutions: [], // Will need a separate fetch if we want subs for components
                category: slot
              };
            });
          } else {
            // Standalone item
            const targetKcal = (kcal / distribution.length);
            let quantity = scaleItemToTarget(rawFood, targetKcal, 'kcal');
            if (!quantity || isNaN(quantity)) quantity = 100;

            const macros = calculateItemMacros(rawFood, quantity);
            
            // Get REAL substitutions from the same group
            const subGroup = rawFood.substitutions_group;
            const potentialSubs = subGroup ? (substitutesByGroup.get(subGroup) || []) : [];
            const substitutions = potentialSubs
              .filter((s: any) => s.id !== rawFood.id)
              .map((s: any) => {
                const subQty = scaleItemToTarget(s, macros.kcal, 'kcal');
                const subMacros = calculateItemMacros(s, subQty);
                return {
                  ...s,
                  name: s.title || s.name,
                  quantity: subQty,
                  clinical_mass_g: subQty,
                  ...subMacros
                };
              })
              .slice(0, 8); // Abundant substitutions

            itemsToPlot.push({
              ...rawFood,
              instanceId: crypto.randomUUID(),
              name: rawFood.title || rawFood.name,
              quantity,
              clinical_mass_g: quantity,
              substitutions,
              category: rawFood.category || slot,
              ...macros
            });
          }

          newMeals.push({
            id: crypto.randomUUID(),
            name: slot,
            time: dist.time || "08:00",
            day_of_week: day,
            items: itemsToPlot
          });
        }
      }

      const otherDayMeals = store.meals.filter(m => !days.includes(m.day_of_week || 0));
      store.hydrateMeals([...otherDayMeals, ...newMeals]);
      
      toast.success('Plano Soberano gerado com sucesso!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar plano modular', { id: toastId });
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

        if (planData?.snapshot && (planData.snapshot as any).meals) {
          store.hydrateMeals((planData.snapshot as any).meals);
        } else if (planData?.items_payload && (planData.items_payload as any).meals) {
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
    const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    
    // Sum macros ONLY for the currently active day
    store.meals
      .filter(m => (m.day_of_week || 0) === activeDay)
      .forEach((meal) => {
        meal.items.forEach((item) => {
          totals.kcal += item.kcal || 0;
          totals.protein += item.protein || 0;
          totals.carbs += item.carbs || 0;
          totals.fat += item.fat || 0;
        });
      });

    return totals;
  }, [store.meals, activeDay]);


  const handleSave = async () => {
    if (!effectiveId) return;
    setSaving(true);
    const toastId = toast.loading('Salvando alterações...');
    
    try {
      // In a real implementation, we would persist store.meals to the DB
      // For now, let's simulate and update the metadata
      // Check if items_payload or snapshot should be used
      const { error } = await supabase
        .from('meal_plans')
        .update({
          snapshot: { meals: store.meals },
          // We include items_payload just in case other parts of the system expect it
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

  const handleClearAll = () => {
    if (confirm("Deseja realmente apagar todas as refeições deste plano?")) {
      store.setMeals([]);
      toast.success("Plano limpo com sucesso");
    }
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
                  Editor de Planos
                </p>
              </div>

              <div className="h-10 w-px bg-white/10 hidden lg:block mx-1" />

              <Popover open={isPatientSearchOpen} onOpenChange={setIsPatientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isPatientSearchOpen}
                    className="w-[240px] h-11 bg-white/5 border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl justify-between hover:bg-white/10 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-500" />
                      {effectivePatientId 
                        ? availablePatients.find((p) => p.user_id === effectivePatientId)?.full_name 
                        : "Selecionar Paciente..."}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0 bg-neutral-900 border-white/10 shadow-2xl">
                  <Command className="bg-transparent">
                    <CommandInput placeholder="Buscar paciente..." className="h-9 text-[10px] font-bold uppercase text-white" />
                    <CommandList>
                      <CommandEmpty className="py-6 text-center text-[10px] uppercase font-black text-white/20">Nenhum paciente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {availablePatients.map((p) => (
                          <CommandItem
                            key={p.user_id}
                            value={p.full_name}
                            onSelect={() => {
                              navigate(`/editor-v3/${p.user_id}`);
                              setIsPatientSearchOpen(false);
                            }}
                            className="text-[10px] font-black uppercase text-white/60 hover:text-emerald-400 hover:bg-white/5 cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-emerald-500",
                                effectivePatientId === p.user_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {p.full_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>


          </div>

          <div className="flex items-center gap-4">
            <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-white/5 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-white/60 hover:text-emerald-400 text-[11px] font-black uppercase tracking-[0.2em] h-12 px-8 rounded-2xl hidden md:flex transition-all duration-300 shadow-lg"
                >
                  <Library className="w-5 h-5 mr-3" /> Biblioteca Premium
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl w-[95vw] h-[90vh] bg-neutral-950 border-white/10 text-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] shadow-[0_64px_128px_-32px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col gap-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none" />
                
                <DialogHeader className="mb-6 md:mb-8 relative z-10">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] md:rounded-[2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
                      <Library className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none text-white">Biblioteca de Templates</DialogTitle>
                      <p className="text-[9px] md:text-[11px] text-white/20 uppercase font-black tracking-[0.3em] mt-2 md:mt-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Templates verificados
                      </p>
                    </div>
                  </div>
                </DialogHeader>
                
                <PremiumGallery 
                  templates={templates} 
                  onSelect={(template) => {
                    setIsGalleryOpen(false); // Close gallery when selecting a template
                    setSelectedTemplate(template);
                    setTimeout(() => setIsTemplateModalOpen(true), 100);
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
              onClick={handleClearAll}
              className="bg-white/5 border-white/10 hover:bg-red-500/10 hover:text-red-400 text-white/40 text-[11px] font-black uppercase tracking-[0.2em] h-12 px-6 rounded-2xl hidden md:flex transition-all"
            >
              <Trash2 className="w-5 h-5 mr-3" /> Limpar
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
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Seletor de Dias - Essencial para evitar o CAOS */}
          <div className="px-10 py-4 bg-neutral-900/20 border-b border-white/5 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Cronograma Semanal</span>
            </div>
            
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              {[
                { id: 1, label: "SEG" },
                { id: 2, label: "TER" },
                { id: 3, label: "QUA" },
                { id: 4, label: "QUI" },
                { id: 5, label: "SEX" },
                { id: 6, label: "SÁB" },
                { id: 0, label: "DOM" },
              ].map((day) => (
                <button
                  key={day.id}
                  onClick={() => setActiveDay(day.id)}
                  className={cn(
                    "h-8 px-4 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                    activeDay === day.id 
                      ? "bg-emerald-500 text-black shadow-lg" 
                      : "text-white/30 hover:text-white hover:bg-white/5"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline de Refeições */}
          <ScrollArea className="flex-1 h-full px-8 py-12">
            <div className="max-w-5xl mx-auto space-y-12 pb-32">
              <AnimatePresence mode="popLayout">
                {store.meals
                  .filter(m => (m.day_of_week || 0) === activeDay)
                  .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                  .map((meal, idx) => (
                    <motion.div
                      key={meal.id}
                      layout
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: idx * 0.05 }}
                    >
                      <MealCard 
                        meal={meal} 
                        onUpdateQuantity={(itemId, qty) => store.updateFoodQuantity(meal.id, itemId, qty)}
                        onUpdateMacros={(itemId, val, type) => store.updateMealItemMacros(meal.id, itemId, val, type)}
                        onRemoveFood={(itemId) => store.removeFood(meal.id, itemId)}
                        onAddFood={(food) => store.addFoodToMeal(meal.id, food)}
                        onRemoveMeal={() => store.removeMeal(meal.id)}
                        onAddSubstitution={(itemId, food) => store.addSubstitutionToItem(meal.id, itemId, food)}
                      />
                    </motion.div>
                  ))}
              </AnimatePresence>

              <Button 
                onClick={() => {
                  const names = ["Café da Manhã", "Lanche", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"];
                  const currentCount = store.meals.filter(m => (m.day_of_week || 0) === activeDay).length;
                  const name = names[currentCount % names.length];
                  
                  // Use standard zustand set pattern to ensure immediate day assignment
                  const newId = crypto.randomUUID();
                  const newMeal = {
                    id: newId,
                    name,
                    time: "08:00",
                    day_of_week: activeDay,
                    items: []
                  };
                  store.setMeals([...store.meals, newMeal]);
                }}
                variant="outline" 
                className="w-full h-24 bg-white/[0.02] border-dashed border-white/5 hover:bg-emerald-500/[0.03] hover:border-emerald-500/30 text-white/10 hover:text-emerald-400 rounded-[2.5rem] transition-all group/add-meal shadow-inner"
              >
                <Plus className="w-8 h-8 mr-4 group-hover/add-meal:scale-125 transition-transform duration-500" />
                <span className="uppercase text-xs font-black tracking-[0.3em]">Adicionar Nova Refeição ao Dia</span>
              </Button>
            </div>
          </ScrollArea>

          {/* Lateral Info / Sidebar de Metas (Opcional) */}
        </main>
      </div>


    </DashboardLayout>
  );
}
