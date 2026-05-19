
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useEditorState } from '../hooks/useEditorState';
import { MealCard } from './MealCard';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Save, Plus, Target, Flame, 
  Trash2, Library, Search, Loader2, User, 
  ChevronRight, Check, ChevronsUpDown, Calendar, Send
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
import { AnimatePresence, motion } from 'framer-motion';
import { useDraftSync } from '../hooks/useDraftSync';
import { planPersistenceService } from '../services/planPersistenceService';
import { normalizeMealPlan } from "@/lib/legacy/mealPlanNormalizer";
import { normalizeSnapshotToV3 } from '../utils/normalization';
import { BookMarked } from 'lucide-react';
import { SaveCustomTemplateModal } from './SaveCustomTemplateModal';

export default function EditorV3Page() {
  const { patientId, planId, id } = useParams<{ patientId: string; planId: string; id: string }>();
  const [searchParams] = useSearchParams();
  const queryPlanId = searchParams.get('planId');
  const effectiveId = planId || queryPlanId || id;
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
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);


  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [activeDay, setActiveDay] = useState<number>(1); // 1 = Segunda-feira (Padrão)
  const [patientData, setPatientData] = useState<any>(null);
  const [availablePatients, setAvailablePatients] = useState<any[]>([]);

  // 🛡️ SOBERANIA V3: Sincronização de Rascunho Soberana
  const { 
    draftId, 
    syncState, 
    initialMeals, 
    scheduleSave, 
    setLocked 
  } = useDraftSync(effectivePatientId || null, [], store.meals, effectiveId);

  // Efeito para hidratar o rascunho quando carregado
  useEffect(() => {
    if (initialMeals && initialMeals.length > 0 && store.meals.length === 0) {
      store.hydrateMeals(initialMeals);
    }
  }, [initialMeals]);

  // Efeito para agendar salvamento automático
  useEffect(() => {
    if (store.meals.length > 0) {
      scheduleSave(store.meals, []);
    }
  }, [store.meals, scheduleSave]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const fetchedTemplates = await getV3Templates();
        setTemplates(fetchedTemplates);

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
      if (selectedTemplate.plan_snapshot) {
        const snapshotKey = kcal.toString();
        const snapshot = selectedTemplate.plan_snapshot[snapshotKey] || Object.values(selectedTemplate.plan_snapshot)[0];
        
        if (snapshot && snapshot.meals) {
          const days = [1, 2, 3, 4, 5, 6, 0];
          const allNewMeals: any[] = [];
          
          // Detectar se o snapshot já tem múltiplos dias
          const snapshotDays = [...new Set(snapshot.meals.map((m: any) => m.day_of_week || 1))];
          const hasMultiDaySnapshot = snapshotDays.length > 1;

          for (const day of days) {
            // Se o snapshot tem múltiplos dias, tentamos pegar o dia correspondente ou ciclar
            let mealsToUse = snapshot.meals;
            if (hasMultiDaySnapshot) {
              // Tenta achar meals para o dia específico, senão cicla usando o índice
              const targetDayInSnapshot = snapshotDays.includes(day) ? day : snapshotDays[day % snapshotDays.length];
              mealsToUse = snapshot.meals.filter((m: any) => (m.day_of_week || 1) === targetDayInSnapshot);
              
              // Se não achou nada (snapshot incompleto), pega o primeiro dia disponível
              if (mealsToUse.length === 0) {
                mealsToUse = snapshot.meals.filter((m: any) => (m.day_of_week || 1) === snapshotDays[0]);
              }
            }

            const freshMeals = mealsToUse.map((meal: any, mealIdx: number) => {
              const mealId = crypto.randomUUID();
              return {
                ...meal,
                id: mealId,
                day_of_week: day,
                items: meal.items.map((item: any, itemIdx: number) => {
                  const instanceId = crypto.randomUUID();
                  
                  // LOGICA DE VARIAÇÃO SOBERANA V5:
                  // 1. Garantir que existam substitutos (equivalentes)
                  let subs = item.substitutions || [];
                  
                  // 2. Tentar rotacionar para gerar variedade real entre os dias
                  let finalItem = { ...item, instanceId };
                  
                  // Se houver substitutos, rotacionamos baseado no dia para que a dieta mude todo dia
                  if (subs.length > 0) {
                    const rotationSeed = (day + mealIdx + itemIdx);
                    // subIndex 0 = item original, subIndex > 0 = substituto
                    const subIndex = rotationSeed % (subs.length + 1);
                    
                    if (subIndex > 0) {
                      const sub = subs[subIndex - 1];
                      const targetKcal = item.kcal;
                      const subKcal100g = sub.kcal_100g || sub.kcal || 1;
                      const neededQty = Math.round((targetKcal / subKcal100g) * 100);
                      
                      finalItem = {
                        ...sub,
                        instanceId,
                        quantity: neededQty,
                        clinical_mass_g: neededQty,
                        kcal: targetKcal,
                        protein: (sub.protein || 0) * (neededQty / 100),
                        carbs: (sub.carbs || 0) * (neededQty / 100),
                        fat: (sub.fat || 0) * (neededQty / 100),
                        substitutions: subs,
                        imageUrl: sub.imageUrl || (sub as any).image_url || null
                      } as any;
                    }
                  }

                  // 3. Garantia Visual SOBERANA: Usamos a imagem que já vem no template/item
                  if (!finalItem.imageUrl || finalItem.imageUrl.includes('unsplash.com')) {
                    finalItem.imageUrl = item.imageUrl || (item as any).image_url || null;
                  }

                  return finalItem;
                })
              };
            });
            allNewMeals.push(...freshMeals);
          }

          if (isWeekly) {
            store.hydrateMeals(allNewMeals);
          } else {
            const dailyMeals = allNewMeals.filter(m => m.day_of_week === activeDay);
            const otherDayMeals = store.meals.filter(m => m.day_of_week !== activeDay);
            store.hydrateMeals([...otherDayMeals, ...dailyMeals]);
          }

          toast.success('Plano Semanal Soberano Gerado!', { id: toastId });
          return;
        }
      }

      const distribution = (selectedTemplate.meal_distribution as any[]) || [];
      const days = isWeekly ? [1, 2, 3, 4, 5, 6, 0] : [activeDay];
      const newMeals: any[] = [];

      for (const day of days) {
        for (const dist of distribution) {
          newMeals.push({
            id: crypto.randomUUID(),
            name: dist.slot,
            time: dist.time || "08:00",
            day_of_week: day,
            items: []
          });
        }
      }

      const otherDayMeals = store.meals.filter(m => !days.includes(m.day_of_week || 0));
      store.hydrateMeals([...otherDayMeals, ...newMeals]);
      toast.success('Estrutura carregada.', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar template', { id: toastId });
    }
  };

  useEffect(() => {
    async function loadPlan() {
      if (effectivePatientId) {
        store.setPatientId(effectivePatientId);
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', effectivePatientId)
          .maybeSingle();
        if (profile) setPatientData(profile);
      }

      if (!effectiveId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: plan, error } = await (supabase.from('meal_plans') as any)
          .select('*')
          .eq('id', effectiveId)
          .maybeSingle();

        if (error) throw error;
        if (plan) {
          const planData = plan as any;
          if (planData?.patient) setPatientData(planData.patient);
          
          // 🛡️ SOBERANIA V3: Usar o normalizador mais fiel ao snapshot (o mesmo que o PDF usaria internamente)
          // Se houver snapshot, usamos normalizeSnapshotToV3. Se não, usamos o normalizador universal.
          let mealsToHydrate = [];
          if (planData.snapshot) {
            mealsToHydrate = normalizeSnapshotToV3(planData.snapshot);
          } else {
            const normalized = normalizeMealPlan(planData);
            mealsToHydrate = normalized.meals as any;
          }
          
          if (mealsToHydrate.length > 0) {
            store.hydrateMeals(mealsToHydrate);
            
            // 🛡️ SMART DAY SELECTOR: Se o dia atual (Segunda) está vazio, 
            // muda para o primeiro dia que tem conteúdo no plano carregado.
            const daysWithContent = [...new Set(mealsToHydrate.map((m: any) => m.day_of_week ?? 0))];
            if (!daysWithContent.includes(activeDay) && daysWithContent.length > 0) {
              setActiveDay(daysWithContent[0]);
            }
          }
          
          if (planData?.patient_id) store.setPatientId(planData.patient_id);
        }
      } catch (err) {
        console.error('Erro ao carregar plano:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, [effectiveId, effectivePatientId]);

  // Efeito adicional para garantir que o activeDay mude se o store for hidratado via rascunho
  useEffect(() => {
    if (store.meals.length > 0) {
      const daysWithContent = [...new Set(store.meals.map(m => m.day_of_week ?? 0))];
      if (!daysWithContent.includes(activeDay) && daysWithContent.length > 0) {
        setActiveDay(daysWithContent[0]);
      }
    }
  }, [store.meals.length]);

  const planTotals = useMemo(() => {
    const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
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
    if (!effectivePatientId) {
      toast.error('Selecione um paciente para salvar o plano.');
      return;
    }
    
    setSaving(true);
    setLocked(true); // 🛡️ LOCK DE EDIÇÃO: Pausar auto-save
    const toastId = toast.loading('Salvando e Publicando Plano Soberano...');
    
    try {
      const result = await planPersistenceService.publishPlan({
        patientId: effectivePatientId,
        nutritionistId: user?.id || '',
        meals: store.meals,
        targets: {
          kcal: planTotals.kcal,
          protein: planTotals.protein,
          carbs: planTotals.carbs,
          fat: planTotals.fat
        },
        planId: effectiveId,
        draftId: draftId
      });

      if (result.ok) {
        toast.success('Plano publicado com sucesso!', { id: toastId });
        if (!effectiveId && result.planId) {
          navigate(`/editor-v3/${effectivePatientId}/${result.planId}`, { replace: true });
        }
      } else {
        toast.error(result.error || 'Erro ao publicar plano', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro fatal ao salvar plano', { id: toastId });
    } finally {
      setSaving(false);
      setLocked(false); // Liberar lock
    }
  };

  const handleClearAll = () => {
    if (confirm("Deseja apagar todas as refeições?")) {
      store.setMeals([]);
      toast.success("Limpo!");
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
      <div className="flex flex-col h-[calc(100vh-64px)] bg-neutral-950 text-white font-sans overflow-hidden">
        {/* Compact Clinical Header */}
        <header className="px-6 py-3 bg-neutral-900 border-b border-white/5 flex items-center justify-between sticky top-0 z-30 shadow-xl backdrop-blur-3xl">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 text-white/40 hover:text-white rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <div className="hidden lg:flex items-center gap-3">
              <h1 className="text-xl font-black uppercase italic tracking-tighter">FitJourney</h1>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-1.5 py-0">V3 CLINIC</Badge>
            </div>

            <Popover open={isPatientSearchOpen} onOpenChange={setIsPatientSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[220px] h-9 bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest rounded-lg justify-between hover:border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="truncate">{effectivePatientId ? availablePatients.find((p) => p.user_id === effectivePatientId)?.full_name : "Selecionar Paciente"}</span>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0 bg-neutral-900 border-white/10 shadow-2xl">
                <Command className="bg-transparent">
                  <CommandInput placeholder="Buscar..." className="h-9 text-[10px] font-bold" />
                  <CommandList>
                    <CommandEmpty className="py-4 text-center text-[9px] uppercase font-black text-white/20">Nada encontrado.</CommandEmpty>
                    <CommandGroup>
                      {availablePatients.map((p) => (
                        <CommandItem key={p.user_id} onSelect={() => { navigate(`/editor-v3/${p.user_id}`); setIsPatientSearchOpen(false); }} className="text-[10px] font-black uppercase text-white/60 hover:text-emerald-400 cursor-pointer">
                          {p.full_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white/5 border-white/10 hover:border-emerald-500/30 text-[10px] font-black uppercase tracking-widest h-9 px-4 sm:px-6 rounded-lg flex">
                  <Library className="w-4 h-4 mr-2" /> <span className="hidden xs:inline">Biblioteca</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl h-[85vh] bg-neutral-950 border-white/10 text-white p-8 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">Protocolos Clínicos</DialogTitle>
                </DialogHeader>
                <PremiumGallery templates={templates} onSelect={(t) => { setIsGalleryOpen(false); setSelectedTemplate(t); setTimeout(() => setIsTemplateModalOpen(true), 100); }} />
              </DialogContent>
            </Dialog>

            <TemplateV3Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} template={selectedTemplate} onSelectProfile={handleSelectProfile} />

            <Button variant="outline" onClick={handleClearAll} className="bg-white/5 border-white/10 text-white/30 text-[9px] font-black uppercase tracking-widest h-9 px-4 rounded-lg hidden xl:flex">
              <Trash2 className="w-4 h-4 mr-2" /> Limpar
            </Button>

            <Button onClick={() => setIsShareDialogOpen(true)} className="bg-neutral-800 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest h-9 px-6 rounded-lg flex">
              <Send className="w-4 h-4 mr-2" /> Enviar
            </Button>

            <Button onClick={() => setIsSaveTemplateModalOpen(true)} variant="outline" className="text-[10px] font-black uppercase tracking-widest h-9 px-6 rounded-lg flex border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
              <BookMarked className="w-4 h-4 mr-2" /> Salvar como Modelo
            </Button>

            <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest h-9 px-8 rounded-lg shadow-lg shadow-emerald-500/10 text-[10px]">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar
            </Button>
          </div>
        </header>

        <SharePlanDialog 
          open={isShareDialogOpen} 
          onOpenChange={setIsShareDialogOpen} 
          data={patientData ? {
            planTitle: "Plano Alimentar Soberano",
            patientName: patientData.full_name || "Paciente",
            nutritionistName: user?.email || "Nutricionista",
            startDate: new Date().toLocaleDateString('pt-BR'),
            items: store.meals.flatMap(meal => meal.items.flatMap(item => [
              { 
                id: item.instanceId, 
                mealType: meal.name, 
                title: item.name, 
                meta_calorias: item.kcal, 
                meta_proteinas: item.protein, 
                meta_carboidratos: item.carbs, 
                meta_gorduras: item.fat, 
                day_of_week: meal.day_of_week || 0, 
                scheduled_time: meal.time, 
                is_primary: true, 
                substitution_group_id: item.substitution_group_id,
                clinical_mass_g: item.clinical_mass_g,
                display_quantity: item.quantity,
                display_unit: item.portionUnitLabel || 'g'
              },
              ...(item.substitutions || []).map(s => ({ 
                id: (s as any).instanceId || s.id, 
                mealType: meal.name, 
                title: s.name, 
                meta_calorias: s.kcal, 
                meta_proteinas: s.protein, 
                meta_carboidratos: s.carbs, 
                meta_gorduras: s.fat, 
                day_of_week: meal.day_of_week || 0, 
                scheduled_time: meal.time, 
                is_primary: false, 
                substitution_group_id: (s as any).substitution_group_id || item.substitution_group_id,
                clinical_mass_g: s.clinical_mass_g,
                display_quantity: s.quantity,
                display_unit: s.portionUnitLabel || 'g'
              }))
            ])),
            targetCalories: planTotals.kcal, targetProtein: planTotals.protein, targetCarbs: planTotals.carbs, targetFat: planTotals.fat
          } : null} 
        />

        <SaveCustomTemplateModal isOpen={isSaveTemplateModalOpen} onClose={() => setIsSaveTemplateModalOpen(false)} currentPlanData={{ meals: store.meals }} />{/* Macros Dashboard */}
        <div className="px-10 py-6 bg-neutral-900/50 border-b border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Calorias', value: planTotals.kcal, unit: 'kcal', icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> },
            { label: 'Proteínas', value: planTotals.protein, unit: 'g', icon: <Target className="w-3.5 h-3.5 text-emerald-500" /> },
            { label: 'Carbos', value: planTotals.carbs, unit: 'g', icon: <Target className="w-3.5 h-3.5 text-blue-500" /> },
            { label: 'Gorduras', value: planTotals.fat, unit: 'g', icon: <Target className="w-3.5 h-3.5 text-amber-500" /> }
          ].map(stat => (
            <div key={stat.label} className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 flex items-center gap-2">{stat.icon} {stat.label}</p>
              <p className="text-2xl font-black italic tracking-tighter tabular-nums">{Math.round(stat.value)}<span className="text-[10px] uppercase ml-1.5 opacity-20">{stat.unit}</span></p>
            </div>
          ))}
        </div>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-10 py-3 bg-neutral-900/30 border-b border-white/5 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Cronograma</span>
            </div>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              {[ {id:1,l:"SEG"}, {id:2,l:"TER"}, {id:3,l:"QUA"}, {id:4,l:"QUI"}, {id:5,l:"SEX"}, {id:6,l:"SÁB"}, {id:0,l:"DOM"} ].map(d => (
                <button key={d.id} onClick={() => setActiveDay(d.id)} className={cn("h-7 px-4 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all", activeDay === d.id ? "bg-emerald-500 text-black shadow-lg" : "text-white/30 hover:text-white hover:bg-white/5")}>
                  {d.l}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 px-8 py-8">
            <div className="max-w-4xl mx-auto space-y-6 pb-32">
              <AnimatePresence mode="popLayout">
                {store.meals
                  .filter(m => (m.day_of_week || 0) === activeDay)
                  .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                  .map((meal, idx) => (
                    <motion.div key={meal.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4, delay: idx * 0.05 }}>
                      <MealCard 
                        meal={meal} 
                        onUpdateQuantity={(itemId, qty) => store.updateFoodQuantity(meal.id, itemId, qty)}
                        onUpdateMacros={(itemId, val, type) => store.updateMealItemMacros(meal.id, itemId, val, type)}
                        onRemoveFood={(itemId) => store.removeFood(meal.id, itemId)}
                        onAddFood={(food) => store.addFoodToMeal(meal.id, food)}
                        onRemoveMeal={() => store.removeMeal(meal.id)}
                        onAddSubstitution={(itemId, food) => store.addSubstitutionToItem(meal.id, itemId, food)}
                        onUpdateMealHeader={(updates) => store.updateMealHeader(meal.id, updates)}
                        onUpdateFoodName={(itemId, name) => store.updateMealItemName(meal.id, itemId, name)}
                      />
                    </motion.div>
                  ))}
              </AnimatePresence>

              <Button 
                onClick={() => {
                  const names = ["Café da Manhã", "Lanche", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"];
                  const currentCount = store.meals.filter(m => (m.day_of_week || 0) === activeDay).length;
                  store.setMeals([...store.meals, { id: crypto.randomUUID(), name: names[currentCount % names.length], time: "08:00", day_of_week: activeDay, items: [] }]);
                }}
                variant="outline" className="w-full h-16 bg-white/[0.01] border-dashed border-white/5 hover:bg-emerald-500/[0.02] text-white/10 hover:text-emerald-400 rounded-2xl transition-all"
              >
                <Plus className="w-5 h-5 mr-3" />
                <span className="uppercase text-[10px] font-black tracking-widest">Nova Refeição</span>
              </Button>
            </div>
          </ScrollArea>
        </main>
      </div>
    </DashboardLayout>
  );
}
