import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEditorState } from './useEditorState';
import { useDraftSync } from './useDraftSync';
import { promoteDraftToMealPlan } from './promoteDraft';
import { loadOrCreateDraft } from './draftService';
import { searchFoods, searchMarmitas, searchTemplates } from './utils/dataFetcher';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, UserX, Plus, Trash2, Lock,
  Sparkles, Save, Package, ChefHat, Clock,
  Apple, Layers, Utensils, CloudOff, Cloud, Loader2,
  AlertTriangle, CheckCircle2, XCircle, RotateCcw,
  Zap, Activity, PieChart, Minus, Users, Search,
  User, Edit3, List, BookOpen, RefreshCw, X, History, Maximize2, ChevronDown, RefreshCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Meal, MealItem, Food } from './types';
import { MealTemplate, mockFoods } from './constants';
import { usePatientsList } from '@/hooks/queries/usePatientsList';
import { usePatientDetail } from '@/hooks/queries/usePatientDetail';
import { supabase } from '@/integrations/supabase/client';

const MEASURE_OPTIONS = [
  { label: 'Gramas', unit: 'g', type: 'gram' as const },
  { label: 'Colheres', unit: 'colher(es)', type: 'spoon' as const },
  { label: 'Porção', unit: 'porção', type: 'unit' as const },
  { label: 'Copos', unit: 'copo(s)', type: 'unit' as const },
  { label: 'Prato Raso', unit: 'prato raso', type: 'unit' as const },
  { label: 'Prato Fundo', unit: 'prato fundo', type: 'unit' as const },
  { label: 'Prato Médio', unit: 'prato médio', type: 'unit' as const },
  { label: 'Unid. P', unit: 'unid P', type: 'unit' as const },
  { label: 'Unid. M', unit: 'unid M', type: 'unit' as const },
  { label: 'Unid. G', unit: 'unid G', type: 'unit' as const },
];

const formatPortion = (quantity: number, unit: string, type?: 'unit' | 'gram' | 'spoon' | 'ml') => {
  if (type === 'gram') return `${quantity}g`;
  if (type === 'ml') return `${quantity}ml`;
  if (type === 'spoon') return `${quantity} ${quantity === 1 ? 'colher' : 'colheres'}`;
  
  const plurals: Record<string, string> = {
    fatia: 'fatias',
    unidade: 'unidades',
    pote: 'potes',
    medida: 'medidas',
    marmita: 'marmitas'
  };
  
  if (quantity === 1) {
    return `1 ${unit}`;
  }
  
  return `${quantity} ${plurals[unit] || unit + 's'}`;
};

const EditorV3Page = () => {
  const { user } = useAuth();
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('planId');
  const isSandbox = !patientId && !planId;

  const {
    meals, setPatientId, hydrateMeals,
    addMarmitaToMeal, addFoodToMeal, applyTemplateToMeal,
    removeFood, updateFoodQuantity, updateMealItem, generatePlan, generateMeal, savePlan, planStatus,
    resetEditor, addMeal, removeMeal, updateMealHeader
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
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [showAIGenerateConfirm, setShowAIGenerateConfirm] = useState(false);
  const [generatingMealId, setGeneratingMealId] = useState<string | null>(null);
  const [isGeneratingGlobal, setIsGeneratingGlobal] = useState(false);
  const [showDietTypeModal, setShowDietTypeModal] = useState(false);
  const [showCalorieModal, setShowCalorieModal] = useState(false);
  const [selectedDietType, setSelectedDietType] = useState<string | null>(null);
  const [replaceExistingFlag, setReplaceExistingFlag] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  
  // Modal de Detalhes do Item
  const [selectedItem, setSelectedItem] = useState<{ mealId: string, item: MealItem } | null>(null);
  const [substitutionSearch, setSubstitutionSearch] = useState('');
  const [substitutionResults, setSubstitutionResults] = useState<Food[]>([]);
  const [isSearchingSubstitutions, setIsSearchingSubstitutions] = useState(false);
  const [swapSearch, setSwapSearch] = useState('');
  const [swapResults, setSwapResults] = useState<Food[]>([]);
  const [isSearchingSwap, setIsSearchingSwap] = useState(false);
  const [smartSubstitutions, setSmartSubstitutions] = useState<Food[]>([]);
  const [isLoadingSmartSubs, setIsLoadingSmartSubs] = useState(false);

  // Estados para Modais Premium
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealTime, setNewMealTime] = useState('00:00');

  // Estados para busca de dados reais
  const [foodSearch, setFoodSearch] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [marmitas, setMarmitas] = useState<Food[]>([]);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [isSearchingFoods, setIsSearchingFoods] = useState(false);

  const { data: patientsData, isLoading: isLoadingPatients } = usePatientsList({ 
    search: patientSearch,
    pageSize: 10
  });

  const { data: patientDetail } = usePatientDetail(patientId);

  const [lastAssessment, setLastAssessment] = useState<any>(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      if (patientId) {
        const { data } = await supabase
          .from('physical_assessments')
          .select('*')
          .eq('patient_id', patientId)
          .order('assessment_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data) setLastAssessment(data);
      }
    };
    fetchAssessment();
  }, [patientId]);

  // Busca de Alimentos (TACO/USDA/Personalizados)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (foodSearch.length >= 2) {
        setIsSearchingFoods(true);
        const results = await searchFoods(foodSearch);
        setFoods(results);
        setIsSearchingFoods(false);
      } else if (foodSearch.length === 0) {
        setFoods([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [foodSearch]);
  // Busca de Substituições
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (substitutionSearch.length >= 2) {
        setIsSearchingSubstitutions(true);
        const results = await searchFoods(substitutionSearch);
        setSubstitutionResults(results);
        setIsSearchingSubstitutions(false);
      } else if (substitutionSearch.length === 0) {
        setSubstitutionResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [substitutionSearch]);
  // Busca de Trocas (Swap)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (swapSearch.length >= 2) {
        setIsSearchingSwap(true);
        const results = await searchFoods(swapSearch);
        setSwapResults(results);
        setIsSearchingSwap(false);
      } else if (swapSearch.length === 0) {
        setSwapResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [swapSearch]);
  // Carregar sugestões inteligentes ao abrir o modal
  useEffect(() => {
    const loadSmartSuggestions = async () => {
      if (selectedItem) {
        setIsLoadingSmartSubs(true);
        const name = selectedItem.item.name.toLowerCase();
        
        // Simulação de regras determinísticas do Motor V3 baseadas no banco real
        // Em um cenário real, isso faria uma chamada ao banco filtrando por categorias nutricionais
        const allAvailableFoods = mockFoods; 
        
        let suggestions: Food[] = [];
        
        // Regras determinísticas de compatibilidade nutricional (Categorias)
        const isProtein = (n: string) => n.includes('frango') || n.includes('carne') || n.includes('peixe') || n.includes('ovo') || n.includes('whey') || n.includes('patinho') || n.includes('presunto') || n.includes('queijo');
        const isCarb = (n: string) => n.includes('arroz') || n.includes('batata') || n.includes('macarrão') || n.includes('feijão') || n.includes('pão') || n.includes('aveia') || n.includes('tapioca') || n.includes('cuscuz') || n.includes('mandioca');
        const isFruit = (n: string) => n.includes('banana') || n.includes('maçã') || n.includes('uva') || n.includes('fruta') || n.includes('suco');

        if (isProtein(name)) {
          suggestions = allAvailableFoods.filter(f => isProtein(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
        } else if (isCarb(name)) {
          suggestions = allAvailableFoods.filter(f => isCarb(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
        } else if (isFruit(name)) {
          suggestions = allAvailableFoods.filter(f => isFruit(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
        }

        // Fallback: mesma unidade de medida
        if (suggestions.length === 0) {
          suggestions = allAvailableFoods.filter(f => 
            f.measurementType === selectedItem.item.measurementType && 
            f.name.toLowerCase() !== name
          );
        }

        // Priorização por measurementType e portionLabel compatíveis
        suggestions.sort((a, b) => {
          const aMatch = a.measurementType === selectedItem.item.measurementType ? 1 : 0;
          const bMatch = b.measurementType === selectedItem.item.measurementType ? 1 : 0;
          return bMatch - aMatch;
        });

        setSmartSubstitutions(suggestions.slice(0, 12));
        setIsLoadingSmartSubs(false);
      }
    };
    loadSmartSuggestions();
  }, [selectedItem]);

  // Busca de Marmitas e Templates
  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const [marmitasData, templatesData] = await Promise.all([
          searchMarmitas(user.id),
          searchTemplates()
        ]);
        setMarmitas(marmitasData);
        setTemplates(templatesData);
      }
    };
    loadData();
  }, [user?.id]);

  // Macros totais memoizados com fallback para kcal/calories
  const totalMacros = useMemo(() => {
    return meals.reduce((acc, meal) => {
      meal.items.forEach(item => {
        const q = item.quantity ?? 1;
        const cal = item.calories || item.kcal || 0;
        
        // Se for gramas ou ml, a base é 100
        const factor = (item.measurementType === 'gram' || item.measurementType === 'ml') ? q / 100 : q;
        
        acc.kcal += cal * factor;
        acc.protein += (item.protein ?? 0) * factor;
        acc.carbs += (item.carbs ?? 0) * factor;
        acc.fat += (item.fat ?? 0) * factor;
      });
      return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }, [meals]);

  // Validação do plano
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!patientId && !isSandbox) errors.push("Paciente não identificado.");
    
    const hasItems = meals.some(m => m.items.length > 0);
    if (!hasItems) errors.push("O plano deve ter pelo menos um item.");

    const emptyMeals = meals.filter(m => m.items.length === 0);
    if (emptyMeals.length > 0) {
      warnings.push(`${emptyMeals.length} refeições estão vazias.`);
    }

    if (totalMacros.kcal === 0 && meals.some(m => m.items.length > 0)) {
       errors.push("Macros totais não podem ser zero se houver alimentos.");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [meals, patientId, totalMacros.kcal, isSandbox]);

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
    if (isSandbox) {
      toast.info("No modo Sandbox, as alterações são salvas apenas localmente no seu navegador.");
      setShowValidation(false);
      return;
    }

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

  const handleGlobalGenerate = (replace: boolean) => {
    setReplaceExistingFlag(replace);
    setShowAIGenerateConfirm(false);
    setShowDietTypeModal(true);
  };

  const handleSelectDietType = (goal: string) => {
    setSelectedDietType(goal);
    setShowDietTypeModal(false);
    setShowCalorieModal(true);
  };

  const handleExecuteGeneration = async (calories: number) => {
    setIsGeneratingGlobal(true);
    setShowCalorieModal(false);
    
    // Pequeno delay para efeito visual de "processamento"
    await new Promise(resolve => setTimeout(resolve, 800));
    
    generatePlan(selectedDietType || 'muscle-gain', calories, replaceExistingFlag);
    setIsGeneratingGlobal(false);
    toast.success('Motor V3: Plano gerado com sucesso!');
  };

  const handleMealGenerate = async (mealId: string) => {
    setGeneratingMealId(mealId);
    await new Promise(resolve => setTimeout(resolve, 600));
    generateMeal(mealId, 'muscle-gain', 2000); // Default for single meal optimization
    setGeneratingMealId(null);
  };

  // Sandbox mode check

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000] flex flex-col font-sans selection:bg-emerald-500/30">
      {isSandbox && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 px-6 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top duration-500">
          <div className="flex h-5 w-5 rounded-full bg-amber-500/20 items-center justify-center">
            <Zap className="w-3 h-3 text-amber-500" />
          </div>
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
            Modo Sandbox Ativo — Testando Editor V3 Elite sem paciente vinculado
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowPatientSelector(true)}
            className="h-6 text-[9px] font-black text-amber-500/60 hover:text-amber-500 hover:bg-amber-500/10 uppercase tracking-tighter"
          >
            Selecionar Paciente para Salvar
          </Button>
        </div>
      )}
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
        
        {patientId && patientsData?.patients && (
          <div className="flex items-center gap-3 px-6 border-l border-white/10">
            <Avatar className="h-8 w-8 border border-emerald-500/20">
              <AvatarImage src={patientsData.patients.find(p => p.patient_id === patientId)?.profile?.avatar_url || ''} />
              <AvatarFallback className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black">
                {patientsData.patients.find(p => p.patient_id === patientId)?.profile?.full_name?.[0] || <User className="w-4 h-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Paciente</span>
              <span className="text-xs font-bold text-white truncate max-w-[150px]">
                {patientsData.patients.find(p => p.patient_id === patientId)?.profile?.full_name || 'Carregando...'}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Ações Premium - Header */}
          <div className="flex items-center gap-1.5 mr-4 bg-white/5 p-1 rounded-2xl border border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddMealModal(true)}
              className="h-9 px-4 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Refeição
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplatesModal(true)}
              className="h-9 px-4 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all gap-2"
            >
              <Layers className="w-3.5 h-3.5" />
              Templates
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/20 hover:text-white/60 rounded-xl"
            >
              <History className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/20 hover:text-white/60 rounded-xl"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPatientSelector(true)}
            className="text-[10px] font-black uppercase text-emerald-500/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors rounded-xl gap-2 h-9"
          >
            <Users className="w-3.5 h-3.5" />
            {patientId ? 'Paciente' : 'Escolher'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            disabled={isGeneratingGlobal}
            onClick={() => {
              const hasItems = meals.some(m => m.items.length > 0);
              if (hasItems) {
                setShowAIGenerateConfirm(true);
              } else {
                handleGlobalGenerate(false);
              }
            }}
            className="gap-2 border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-[11px] font-black tracking-wide transition-all rounded-lg min-w-[140px]"
          >
            {isGeneratingGlobal ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 fill-emerald-500/20" />
            )}
            {isGeneratingGlobal ? 'PROCESSANDO...' : 'GERAR PLANO (ENGINE V3)'}
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
            const calories = item.calories || item.kcal || 0;
            const factor = (item.measurementType === 'gram' || item.measurementType === 'ml') ? q / 100 : q;
            acc.kcal += calories * factor;
            acc.p += (item.protein ?? 0) * factor;
            acc.c += (item.carbs ?? 0) * factor;
            acc.f += (item.fat ?? 0) * factor;
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
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <input
                        className="bg-transparent border-none font-black text-xl tracking-tight text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1 w-full max-w-[300px]"
                        value={meal.name}
                        onChange={(e) => updateMealHeader(meal.id, e.target.value, meal.time || '00:00')}
                      />
                      {mealMacros.kcal > 0 && (
                        <div className="flex gap-2 shrink-0">
                           <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black border-0">{Math.round(mealMacros.kcal)} kcal</Badge>
                           <Badge className="bg-white/5 text-white/40 text-[10px] font-black border-0">{Math.round(mealMacros.p)}g P</Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-wider mt-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-500/50" />
                      <input
                        type="time"
                        className="bg-transparent border-none text-white/40 focus:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1 w-20"
                        value={meal.time || '00:00'}
                        onChange={(e) => updateMealHeader(meal.id, meal.name, e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={generatingMealId === meal.id}
                    onClick={() => handleMealGenerate(meal.id)}
                    className="rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500/60 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all border border-emerald-500/10"
                  >
                    {generatingMealId === meal.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Gerar com IA
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Remover "${meal.name}"?`)) {
                        removeMeal(meal.id);
                      }
                    }}
                    className="rounded-xl h-9 w-9 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>

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
                        <Apple className="w-3 h-3" /> Alimentos (TACO/USDA)
                      </p>
                      <div className="relative mb-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                        <Input 
                          placeholder="Buscar no banco..." 
                          value={foodSearch}
                          onChange={(e) => setFoodSearch(e.target.value)}
                          className="h-8 pl-8 text-[10px] bg-white/5 border-white/10 rounded-lg focus:ring-emerald-500/50"
                        />
                        {isSearchingFoods && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500 animate-spin" />}
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {foods.length > 0 ? (
                          foods.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => addFoodToMeal(meal.id, f)}
                              className="w-full text-left text-xs p-3 rounded-xl hover:bg-emerald-500/10 transition-all flex justify-between items-center group/item"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-white/80 group-hover/item:text-white line-clamp-1">{f.name}</span>
                                <span className="text-[10px] font-bold text-white/30 uppercase mt-0.5">{f.portionLabel}</span>
                              </div>
                              <span className="text-[10px] font-black text-white/30 group-hover/item:text-emerald-500 transition-colors uppercase shrink-0 ml-2">
                                {f.kcal} kcal
                              </span>
                            </button>
                          ))
                        ) : foodSearch.length >= 2 && !isSearchingFoods ? (
                          <p className="text-[10px] text-center py-4 text-white/20 font-bold uppercase tracking-widest">Nenhum alimento encontrado</p>
                        ) : foodSearch.length < 2 && (
                          <p className="text-[10px] text-center py-4 text-white/20 font-bold uppercase tracking-widest">Digite para buscar</p>
                        )}
                      </div>
                    </div>

                    {/* Marmitas */}
                    <div className="p-4 border-b border-emerald-500/10">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-3 flex items-center gap-2">
                        <Utensils className="w-3 h-3" /> Minhas Marmitas
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {marmitas.length > 0 ? (
                          marmitas.map((m) => (
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
                                {m.kcal} kcal
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="text-[10px] text-center py-2 text-white/20 font-bold uppercase tracking-widest">Sem marmitas cadastradas</p>
                        )}
                      </div>
                    </div>

                    {/* Templates */}
                    <div className="p-4 bg-emerald-500/[0.02]">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-3 flex items-center gap-2">
                        <Layers className="w-3 h-3" /> Templates de Refeição
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {templates.length > 0 ? (
                          templates.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => applyTemplateToMeal(meal.id, t)}
                              className="w-full text-left text-xs p-3 rounded-xl hover:bg-emerald-500/10 transition-all group/item"
                            >
                              <p className="font-bold text-white/80 group-hover/item:text-white line-clamp-1">{t.name}</p>
                              <p className="text-[10px] text-white/30 group-hover/item:text-white/50 leading-relaxed mt-0.5 line-clamp-2">{t.description}</p>
                            </button>
                          ))
                        ) : (
                          <p className="text-[10px] text-center py-2 text-white/20 font-bold uppercase tracking-widest">Carregando templates...</p>
                        )}
                      </div>
                    </div>
                    </PopoverContent>
                  </Popover>
              </div>
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
                      "p-5 flex items-center justify-between border-0 border-l-[3px] bg-white/[0.03] hover:bg-white/[0.06] transition-all hover:translate-x-1 duration-300 rounded-2xl group/card relative overflow-hidden cursor-pointer",
                      item.locked ? "border-amber-500/50" : "border-emerald-500/50"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem({ mealId: meal.id, item });
                    }}
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
                            {formatPortion(item.quantity ?? 1, item.portionUnit, item.measurementType)} {item.name} — {Math.round((item.quantity ?? 1) * (item.calories ?? 0) * ((item.measurementType === 'gram' || item.measurementType === 'ml') ? 0.01 : 1))} kcal
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
                              {Math.round((item.quantity ?? 1) * (item.calories ?? 0) * ((item.measurementType === 'gram' || item.measurementType === 'ml') ? 0.01 : 1))} <span className="text-white/20">kcal</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                            <p className="text-[11px] font-bold text-white/50">
                              {Math.round((item.quantity ?? 1) * (item.protein ?? 0) * ((item.measurementType === 'gram' || item.measurementType === 'ml') ? 0.01 : 1))}g <span className="text-white/20">Prot</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/40" />
                            <p className="text-[11px] font-bold text-white/50">
                              {Math.round((item.quantity ?? 1) * (item.carbs ?? 0) * ((item.measurementType === 'gram' || item.measurementType === 'ml') ? 0.01 : 1))}g <span className="text-white/20">Carb</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 z-20">
                      <div className="flex items-center bg-black/40 rounded-xl border border-white/5 p-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={item.locked || (item.quantity ?? 1) <= 0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const current = item.quantity ?? 1;
                            const step = item.measurementType === 'gram' ? 10 : item.measurementType === 'ml' ? 50 : 1;
                            const nextValue = Math.max(0, current - step);
                            const roundedValue = Math.floor(nextValue / step) * step;
                            updateFoodQuantity(meal.id, item.instanceId, roundedValue);
                          }}
                          className="h-8 w-8 text-white/40 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        
                        <div className="px-3 text-center min-w-[80px]">
                          <Input 
                            type="number" 
                            className="h-7 w-16 bg-transparent border-none text-center font-black text-white p-0 focus-visible:ring-0" 
                            value={item.quantity}
                            onChange={(e) => updateFoodQuantity(meal.id, item.instanceId, Number(e.target.value))}
                          />
                        </div>
 
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={item.locked}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const current = item.quantity ?? 1;
                            const step = item.measurementType === 'gram' ? 10 : item.measurementType === 'ml' ? 50 : 1;
                            const nextValue = current + step;
                            const roundedValue = Math.ceil(nextValue / step) * step;
                            updateFoodQuantity(meal.id, item.instanceId, roundedValue);
                          }}
                          className="h-8 w-8 text-white/40 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="text-right min-w-[60px]">
                        <p className="font-black text-base text-emerald-500 leading-none">
                          {Math.round((item.quantity ?? 1) * item.calories * ((item.measurementType === 'gram' || item.measurementType === 'ml') ? 0.01 : 1))} <span className="text-[10px] text-emerald-500/60 uppercase">kcal</span>
                        </p>
                        <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-1">Total</p>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFood(meal.id, item.instanceId);
                        }}
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
            
            {/* Espaço para descrição da refeição */}
            <div className="mt-6 animate-in fade-in duration-1000 delay-300">
              <div className="flex items-center gap-2 mb-2">
                <Edit3 className="w-3 h-3 text-emerald-500/50" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Instruções / Notas da Refeição</span>
              </div>
              <Textarea
                placeholder="Ex: Beber bastante água, evitar frituras nesta refeição..."
                value={meal.description || ''}
                onChange={(e) => updateMealHeader(meal.id, meal.name, meal.time || '00:00', e.target.value)}
                className="bg-emerald-500/[0.02] border-emerald-500/10 text-white/60 text-xs rounded-2xl focus:ring-emerald-500/50 min-h-[80px] resize-none p-4 placeholder:text-white/10"
              />
            </div>
          </section>
        );
      })}

      <div className="flex justify-center pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <Button
          onClick={addMeal}
          className="h-16 px-10 rounded-3xl bg-emerald-500/5 hover:bg-emerald-500/10 border-2 border-dashed border-emerald-500/20 hover:border-emerald-500/40 text-emerald-500 font-black gap-4 transition-all hover:scale-105 group"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
            <Plus className="w-5 h-5" />
          </div>
          <span className="uppercase tracking-[0.2em] text-xs">Adicionar Nova Refeição</span>
        </Button>
      </div>
    </main>

    {/* Sticky Macro Summary Bar */}
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[50] w-[90%] max-w-4xl animate-in slide-in-from-bottom-10 duration-1000">
      <div className="bg-black/80 backdrop-blur-3xl border border-emerald-500/30 rounded-3xl p-4 shadow-[0_0_50px_-10px_rgba(16,185,129,0.3)] flex items-center justify-between px-8">
        <div className="flex items-center gap-10">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Total Kcal</span>
            <span className="text-xl font-black text-white italic">{Math.round(totalMacros.kcal)} <span className="text-[10px] text-emerald-500 not-italic">kcal</span></span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-[0.2em] mb-1">Proteína</span>
              <span className="text-sm font-black text-white">{Math.round(totalMacros.protein)}g</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-blue-500/40 uppercase tracking-[0.2em] mb-1">Carbo</span>
              <span className="text-sm font-black text-white">{Math.round(totalMacros.carbs)}g</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-amber-500/40 uppercase tracking-[0.2em] mb-1">Gordura</span>
              <span className="text-sm font-black text-white">{Math.round(totalMacros.fat)}g</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-2 w-2 rounded-full animate-pulse",
            planStatus === 'saved' ? "bg-emerald-500" : "bg-amber-500"
          )} />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            {planStatus === 'saved' ? 'Sincronizado' : 'Alterações Pendentes'}
          </span>
        </div>
      </div>
    </div>

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
      
      {/* Geração com IA - Confirmação */}
      <Dialog open={showAIGenerateConfirm} onOpenChange={setShowAIGenerateConfirm}>
        <DialogContent className="sm:max-w-[500px] border-emerald-500/20 bg-black/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white font-black uppercase tracking-tighter text-xl">
              <Sparkles className="w-6 h-6 text-emerald-500" />
              Geração Inteligente Engine V3
            </DialogTitle>
            <DialogDescription className="text-white/40 font-bold">
              Já existem itens no seu plano alimentar. Como deseja proceder?
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col gap-4">
            <Button 
              onClick={() => handleGlobalGenerate(false)}
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-1 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-left"
            >
              <span className="font-black text-emerald-400 uppercase tracking-widest text-[10px]">Manter e Complementar</span>
              <span className="text-xs text-white/40">O Motor V3 preencherá apenas as refeições que estão vazias.</span>
            </Button>
            
            <Button 
              onClick={() => handleGlobalGenerate(true)}
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-1 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-left"
            >
              <span className="font-black text-rose-400 uppercase tracking-widest text-[10px]">Substituir Tudo</span>
              <span className="text-xs text-white/40 font-bold">Aviso: O Motor V3 removerá todos os alimentos atuais e criará um novo plano do zero.</span>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAIGenerateConfirm(false)} className="text-white/40 hover:text-white">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passo 1: Seleção de Tipo de Dieta */}
      <Dialog open={showDietTypeModal} onOpenChange={setShowDietTypeModal}>
        <DialogContent className="sm:max-w-[500px] border-emerald-500/20 bg-black/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white font-black uppercase tracking-tighter text-xl">
              <Layers className="w-6 h-6 text-emerald-500" />
              Tipo de Estratégia
            </DialogTitle>
            <DialogDescription className="text-white/40 font-bold">
              Selecione o objetivo principal para o Motor V3 estruturar o plano.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 grid grid-cols-1 gap-3">
            {[
              { id: 'weight-loss', label: 'Emagrecimento', desc: 'Foco em déficit calórico e saciedade', icon: <Zap className="w-4 h-4 text-amber-500" /> },
              { id: 'muscle-gain', label: 'Hipertrofia', desc: 'Foco em superávit e síntese proteica', icon: <Activity className="w-4 h-4 text-emerald-500" /> },
              { id: 'maintenance', label: 'Manutenção', desc: 'Equilíbrio calórico e performance', icon: <RefreshCw className="w-4 h-4 text-blue-500" /> },
              { id: 'ketogenic', label: 'Cetogênica', desc: 'Muito baixo carbo, gorduras como energia', icon: <PieChart className="w-4 h-4 text-purple-500" /> },
              { id: 'low-carb', label: 'Low Carb', desc: 'Redução moderada de carboidratos', icon: <Utensils className="w-4 h-4 text-rose-500" /> },
            ].map((type) => (
              <Button 
                key={type.id}
                onClick={() => handleSelectDietType(type.id)}
                variant="outline"
                className="h-auto py-4 flex items-center justify-start gap-4 border-white/10 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/20 text-left transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
                  {type.icon}
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-white uppercase tracking-widest text-[10px]">{type.label}</span>
                  <span className="text-xs text-white/40">{type.desc}</span>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Passo 2: Seleção de Base Calórica */}
      <Dialog open={showCalorieModal} onOpenChange={setShowCalorieModal}>
        <DialogContent className="sm:max-w-[500px] border-emerald-500/20 bg-black/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white font-black uppercase tracking-tighter text-xl">
              <Activity className="w-6 h-6 text-emerald-500" />
              Base Calórica do Plano
            </DialogTitle>
            <DialogDescription className="text-white/40 font-bold">
              Escolha uma das bases calóricas sugeridas pelo Motor V3.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 grid grid-cols-2 gap-4">
            {[1600, 2000, 2400, 3000].map((kcal) => (
              <Button 
                key={kcal}
                onClick={() => handleExecuteGeneration(kcal)}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 border-white/10 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 group transition-all"
              >
                <span className="text-2xl font-black text-white group-hover:text-emerald-400">{kcal}</span>
                <span className="font-black text-white/30 uppercase tracking-widest text-[9px]">Kcal / Dia</span>
              </Button>
            ))}
            
            {patientId && (
              <Button 
                onClick={() => handleExecuteGeneration(lastAssessment?.calories_target || lastAssessment?.tdee || 2000)}
                variant="outline"
                className="col-span-2 h-auto py-4 flex flex-col items-center gap-1 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-center"
              >
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-400 uppercase tracking-widest text-[10px]">Cálculo Personalizado</span>
                  {lastAssessment && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 text-[8px] border-emerald-500/30">
                      {Math.round(lastAssessment?.calories_target || lastAssessment?.tdee || 2000)} kcal
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-white/60">Utilizar dados de anamnese e avaliação física para precisão máxima</span>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPatientSelector} onOpenChange={setShowPatientSelector}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-emerald-500/20 bg-black/95 backdrop-blur-2xl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-3 text-white font-black uppercase tracking-tighter text-xl">
              <Users className="w-6 h-6 text-emerald-500" />
              Selecionar Paciente
            </DialogTitle>
            <DialogDescription className="text-white/40 font-bold">
              Escolha um paciente para vincular este plano.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Buscar paciente pelo nome..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 transition-all h-11"
              />
            </div>
          </div>

          <ScrollArea className="h-[400px] px-2 py-4">
            <div className="px-4 space-y-1">
              {isLoadingPatients ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest">Acessando Base de Dados...</p>
                </div>
              ) : patientsData?.patients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UserX className="w-12 h-12 text-white/10 mb-3" />
                  <p className="text-sm font-bold text-white/40">Nenhum paciente encontrado.</p>
                </div>
              ) : (
                patientsData?.patients.map((patient) => (
                  <button
                    key={patient.patient_id}
                    onClick={() => {
                      setShowPatientSelector(false);
                      navigate(`/v3/${patient.patient_id}${planId ? `?planId=${planId}` : ''}`);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-500/10 transition-all group border border-transparent hover:border-emerald-500/20"
                  >
                    <Avatar className="h-10 w-10 border border-white/10 group-hover:border-emerald-500/40 transition-colors">
                      <AvatarImage src={patient.profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-emerald-500/20 text-emerald-500 font-black">
                        {patient.profile?.full_name?.substring(0, 2).toUpperCase() || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {patient.profile?.full_name}
                      </span>
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-tight">
                        {patient.status === 'active' ? 'Ativo' : 'Inativo'} • Criado em {new Date(patient.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 border-t border-white/5 bg-white/5">
            <Button 
              variant="ghost" 
              onClick={() => setShowPatientSelector(false)}
              className="text-white/40 font-bold hover:text-white"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Detalhes do Item */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[600px] border-emerald-500/20 bg-black/95 backdrop-blur-2xl text-white overflow-hidden p-0">
          {selectedItem && (
            <>
              <DialogHeader className="p-6 pb-0">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    {selectedItem.item.isMarmita ? <ChefHat className="w-6 h-6 text-emerald-500" /> : <Apple className="w-6 h-6 text-emerald-500" />}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                      <Input
                        value={selectedItem.item.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateMealItem(selectedItem.mealId, selectedItem.item.instanceId, { name: val });
                          setSelectedItem(prev => prev ? { ...prev, item: { ...prev.item, name: val } } : null);
                        }}
                        className="bg-transparent border-0 border-b border-emerald-500/20 focus:border-emerald-500 rounded-none h-auto p-0 text-xl font-black tracking-tight text-white placeholder:text-white/20 w-full focus-visible:ring-0"
                      />
                      {selectedItem.item.isMarmita && <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase border-emerald-500/30 shrink-0">Marmita</Badge>}
                    </DialogTitle>
                    <DialogDescription className="text-white/40 font-bold uppercase text-[10px] tracking-widest">
                      {selectedItem.item.portionLabel} • {Math.round(selectedItem.item.kcal)} kcal (base)
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="substitutions" className="w-full">
                <div className="px-6 border-b border-white/5">
                  <TabsList className="bg-transparent h-auto p-0 gap-6">
                    <TabsTrigger value="swap" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-500 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-12 px-0 text-[10px] font-black uppercase tracking-widest border-b-2 border-transparent">
                      <RefreshCcw className="w-3.5 h-3.5 mr-2" /> Trocar
                    </TabsTrigger>
                    <TabsTrigger value="edit" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-500 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-12 px-0 text-[10px] font-black uppercase tracking-widest border-b-2 border-transparent">
                      <Edit3 className="w-3.5 h-3.5 mr-2" /> Editar
                    </TabsTrigger>
                    <TabsTrigger value="substitutions" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-500 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-12 px-0 text-[10px] font-black uppercase tracking-widest border-b-2 border-transparent">
                      <RefreshCw className="w-3.5 h-3.5 mr-2" /> Substituições
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-500 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-12 px-0 text-[10px] font-black uppercase tracking-widest border-b-2 border-transparent">
                      <List className="w-3.5 h-3.5 mr-2" /> Descrição
                    </TabsTrigger>
                    {selectedItem.item.isMarmita && (
                      <TabsTrigger value="recipe" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-500 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-12 px-0 text-[10px] font-black uppercase tracking-widest border-b-2 border-transparent">
                        <BookOpen className="w-3.5 h-3.5 mr-2" /> Receita
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <div className="p-6 h-[400px] overflow-y-auto custom-scrollbar">
                  <TabsContent value="swap" className="mt-0 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input 
                        placeholder="Buscar alimento para trocar..." 
                        value={swapSearch}
                        onChange={(e) => setSwapSearch(e.target.value)}
                        className="h-12 pl-10 bg-white/5 border-white/10 rounded-xl focus:ring-emerald-500/50"
                      />
                      {isSearchingSwap && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />}
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-2">Sugestões Inteligentes (Motor V3)</p>
                      
                      {isLoadingSmartSubs ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                        </div>
                      ) : smartSubstitutions.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {smartSubstitutions.map((food) => {
                            const needsConversion = food.measurementType !== selectedItem.item.measurementType;
                            return (
                              <Button
                                key={`smart-${food.id}`}
                                variant="ghost"
                                onClick={() => {
                                  const currentItem = selectedItem.item;
                                  updateMealItem(selectedItem.mealId, currentItem.instanceId, {
                                    name: food.name,
                                    kcal: food.kcal,
                                    calories: food.kcal,
                                    protein: food.protein,
                                    carbs: food.carbs,
                                    fat: food.fat,
                                    portionLabel: food.portionLabel,
                                    imageUrl: food.imageUrl,
                                    ingredients: food.ingredients,
                                    isMarmita: food.isMarmita,
                                    measurementType: food.measurementType
                                  });
                                  setSelectedItem(null);
                                  toast.success(`Trocado inteligentemente para ${food.name}`);
                                }}
                                className="w-full justify-between h-auto p-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-xl transition-all group"
                              >
                                <div className="text-left">
                                  <p className="font-bold text-white group-hover:text-emerald-400 text-xs">{food.name}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[9px] font-bold text-white/30 uppercase">{food.portionLabel} • {food.kcal} kcal</p>
                                    {needsConversion && <Badge className="bg-amber-500/10 text-amber-500 text-[7px] border-amber-500/20 h-3">Requer Ajuste de Porção</Badge>}
                                  </div>
                                </div>
                                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                          <AlertTriangle className="w-6 h-6 text-amber-500/40 mx-auto mb-2" />
                          <p className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-3">Nenhuma sugestão compatível encontrada</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              const input = document.querySelector('input[placeholder="Buscar alimento para trocar..."]') as HTMLInputElement;
                              if (input) input.focus();
                            }}
                            className="h-8 text-[9px] font-black uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10"
                          >
                            <Search className="w-3 h-3 mr-2" /> Buscar Manualmente
                          </Button>
                        </div>
                      )}

                      {swapResults.length > 0 && (
                        <div className="pt-4 border-t border-white/5 mt-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Resultados da Busca</p>
                          {swapResults.map((food) => (
                            <Button
                              key={food.id}
                              variant="ghost"
                              onClick={() => {
                                const currentItem = selectedItem.item;
                                updateMealItem(selectedItem.mealId, currentItem.instanceId, {
                                  name: food.name,
                                  kcal: food.kcal,
                                  calories: food.kcal,
                                  protein: food.protein,
                                  carbs: food.carbs,
                                  fat: food.fat,
                                  portionLabel: food.portionLabel,
                                  imageUrl: food.imageUrl,
                                  ingredients: food.ingredients,
                                  isMarmita: food.isMarmita,
                                  measurementType: food.measurementType
                                });
                                setSwapSearch('');
                                setSwapResults([]);
                                setSelectedItem(null);
                                toast.success(`Alimento trocado para ${food.name}`);
                              }}
                              className="w-full justify-between h-auto p-4 bg-white/5 hover:bg-emerald-500/10 border border-white/5 rounded-xl transition-all group mb-2"
                            >
                              <div className="text-left">
                                <p className="font-bold text-white group-hover:text-emerald-400">{food.name}</p>
                                <p className="text-[10px] font-bold text-white/30 uppercase">{food.portionLabel} • {food.kcal} kcal</p>
                              </div>
                              <RefreshCcw className="w-4 h-4 text-white/20 group-hover:text-emerald-500" />
                            </Button>
                          ))}
                        </div>
                      )}
                      
                      {swapSearch.length < 2 && smartSubstitutions.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl">
                          <Search className="w-8 h-8 text-white/5 mx-auto mb-2" />
                          <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Digite para buscar outros alimentos</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="edit" className="mt-0 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Quantidade</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const step = selectedItem.item.measurementType === 'gram' ? 10 : selectedItem.item.measurementType === 'ml' ? 50 : 1;
                              updateFoodQuantity(selectedItem.mealId, selectedItem.item.instanceId, Math.max(0, selectedItem.item.quantity - step));
                              setSelectedItem(prev => prev ? { ...prev, item: { ...prev.item, quantity: Math.max(0, prev.item.quantity - step) } } : null);
                            }}
                            className="bg-white/5 border-white/10 text-white h-12 w-12 hover:bg-emerald-500/20"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Input 
                            type="number"
                            value={selectedItem.item.quantity || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (isNaN(val)) return;
                              updateFoodQuantity(selectedItem.mealId, selectedItem.item.instanceId, val);
                              setSelectedItem(prev => prev ? { ...prev, item: { ...prev.item, quantity: val } } : null);
                            }}
                            className="bg-white/5 border-white/10 text-white font-black h-12 text-center text-xl"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const step = selectedItem.item.measurementType === 'gram' ? 10 : selectedItem.item.measurementType === 'ml' ? 50 : 1;
                              updateFoodQuantity(selectedItem.mealId, selectedItem.item.instanceId, selectedItem.item.quantity + step);
                              setSelectedItem(prev => prev ? { ...prev, item: { ...prev.item, quantity: prev.item.quantity + step } } : null);
                            }}
                            className="bg-white/5 border-white/10 text-white h-12 w-12 hover:bg-emerald-500/20"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Unidade / Medida</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline"
                              className="h-12 w-full justify-between border-white/10 text-white font-bold bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                            >
                              <span className="uppercase text-[11px] tracking-widest font-black">
                                {selectedItem.item.portionUnitLabel || (selectedItem.item.measurementType === 'gram' ? 'Gramas' : 'Selecionar Medida')}
                              </span>
                              <ChevronDown className="w-4 h-4 text-emerald-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-72 p-2 bg-black/95 border-emerald-500/20 backdrop-blur-3xl shadow-2xl z-[150]">
                            <div className="grid grid-cols-1 gap-1">
                              {MEASURE_OPTIONS.map((opt) => (
                                <Button
                                  key={opt.label}
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateMealItem(selectedItem.mealId, selectedItem.item.instanceId, { 
                                      measurementType: opt.type, 
                                      portionUnit: opt.unit,
                                      portionUnitLabel: opt.label
                                    });
                                    setSelectedItem(prev => prev ? { ...prev, item: { ...prev.item, measurementType: opt.type, portionUnit: opt.unit, portionUnitLabel: opt.label } } : null);
                                  }}
                                  className={cn(
                                    "h-10 justify-start px-4 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                    (selectedItem.item.portionUnitLabel === opt.label) 
                                      ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                                      : "text-white/60 hover:text-white hover:bg-emerald-500/10"
                                  )}
                                >
                                  {opt.label}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-4">Resumo Nutricional (Total)</p>
                      <div className="grid grid-cols-4 gap-4">
                        {(() => {
                          const q = selectedItem.item.quantity ?? 1;
                          const factor = (selectedItem.item.measurementType === 'gram' || selectedItem.item.measurementType === 'ml') ? 0.01 : 1;
                          return (
                            <>
                              <div className="text-center">
                                <p className="text-2xl font-black text-white">{Math.round(q * (selectedItem.item.calories ?? 0) * factor)}</p>
                                <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">Kcal</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-black text-emerald-400">{Math.round(q * (selectedItem.item.protein ?? 0) * factor)}g</p>
                                <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">Prot</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-black text-blue-400">{Math.round(q * (selectedItem.item.carbs ?? 0) * factor)}g</p>
                                <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">Carb</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-black text-amber-400">{Math.round(q * (selectedItem.item.fat ?? 0) * factor)}g</p>
                                <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">Gord</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="substitutions" className="mt-0 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input 
                        placeholder="Adicionar substituição compatível..." 
                        value={substitutionSearch}
                        onChange={(e) => setSubstitutionSearch(e.target.value)}
                        className="h-12 pl-10 bg-white/5 border-white/10 rounded-xl focus:ring-emerald-500/50"
                      />
                      {isSearchingSubstitutions && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />}
                    </div>

                    <div className="space-y-2">
                      {substitutionResults.map((food) => (
                        <Button
                          key={food.id}
                          variant="ghost"
                          onClick={() => {
                            const currentSubs = selectedItem.item.substitutions || [];
                            updateMealItem(selectedItem.mealId, selectedItem.item.instanceId, {
                              substitutions: [...currentSubs, food]
                            });
                            setSubstitutionSearch('');
                            setSubstitutionResults([]);
                            // Atualiza o estado local para refletir no modal aberto
                            setSelectedItem(prev => prev ? { ...prev, item: { ...prev.item, substitutions: [...currentSubs, food] } } : null);
                          }}
                          className="w-full justify-between h-auto p-4 bg-white/5 hover:bg-emerald-500/10 border border-white/5 rounded-xl transition-all group"
                        >
                          <div className="text-left">
                            <p className="font-bold text-white group-hover:text-emerald-400">{food.name}</p>
                            <div className="flex items-center gap-3">
                              <p className="text-[10px] font-bold text-white/30 uppercase">{food.portionLabel}</p>
                              <Badge className="h-4 bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase border-blue-500/20">Compatível</Badge>
                            </div>
                          </div>
                          <Plus className="w-4 h-4 text-white/20 group-hover:text-emerald-500" />
                        </Button>
                      ))}
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Substitutos Atuais (Clicáveis)</p>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20">
                              <Zap className="w-2.5 h-2.5 mr-1" /> Inteligentes
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 bg-black/95 border-emerald-500/20 backdrop-blur-2xl p-0 overflow-hidden shadow-2xl z-[160]">
                            <div className="p-4 border-b border-white/5 bg-emerald-500/5">
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Sugestões do Motor V3</p>
                              <p className="text-[9px] font-bold text-white/40">Itens nutricionalmente compatíveis</p>
                            </div>
                            <ScrollArea className="h-72">
                              <div className="p-2 grid grid-cols-1 gap-1">
                                {smartSubstitutions.map((food) => {
                                  const needsConversion = food.measurementType !== selectedItem.item.measurementType;
                                  return (
                                    <Button
                                      key={`smart-pop-${food.id}`}
                                      variant="ghost"
                                      onClick={() => {
                                        const currentSubs = selectedItem.item.substitutions || [];
                                        if (currentSubs.some(s => s.id === food.id)) {
                                          toast.error('Este alimento já está na lista.');
                                          return;
                                        }
                                        updateMealItem(selectedItem.mealId, selectedItem.item.instanceId, {
                                          substitutions: [...currentSubs, food]
                                        });
                                        setSelectedItem(prev => prev ? { ...prev, item: { ...prev.item, substitutions: [...currentSubs, food] } } : null);
                                        toast.success(`${food.name} adicionado como substituto.`);
                                      }}
                                      className="h-auto p-3 justify-between bg-white/[0.02] hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded-xl transition-all group"
                                    >
                                      <div className="text-left">
                                        <p className="font-bold text-white group-hover:text-emerald-400 text-[11px]">{food.name}</p>
                                        <div className="flex items-center gap-2">
                                          <p className="text-[9px] font-bold text-white/30 uppercase">{food.portionLabel} • {food.kcal} kcal</p>
                                          {needsConversion && <Badge className="bg-amber-500/10 text-amber-500 text-[7px] border-amber-500/20 h-3">Conversão</Badge>}
                                        </div>
                                      </div>
                                      <Plus className="w-3 h-3 text-white/20 group-hover:text-emerald-500" />
                                    </Button>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        {(selectedItem.item.substitutions || []).length > 0 ? (
                          selectedItem.item.substitutions?.map((sub, idx) => (
                            <div key={`${sub.id}-${idx}`} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl group/sub hover:border-emerald-500/30 transition-all cursor-pointer">
                              <div className="flex-1" onClick={() => {
                                // Swap logic: substituir o item principal pelo substituto selecionado
                                const currentItem = selectedItem.item;
                                const newMain = { ...sub, instanceId: currentItem.instanceId, quantity: currentItem.quantity, substitutions: currentItem.substitutions?.filter((_, i) => i !== idx) };
                                // Not working directly because of how data is structured, but we can update quantity/macros
                                updateMealItem(selectedItem.mealId, currentItem.instanceId, { 
                                  name: sub.name, 
                                  kcal: sub.kcal, 
                                  calories: sub.kcal,
                                  protein: sub.protein,
                                  carbs: sub.carbs,
                                  fat: sub.fat,
                                  portionLabel: sub.portionLabel,
                                  substitutions: [...(currentItem.substitutions || []).filter((_, i) => i !== idx), { ...currentItem, substitutions: [] } as any]
                                });
                                setSelectedItem(null); // Fecha para recarregar
                                toast.success(`${sub.name} agora é o item principal.`);
                              }}>
                                <p className="font-bold text-white group-hover/sub:text-emerald-400">{sub.name}</p>
                                <p className="text-[10px] font-bold text-white/20 uppercase">{sub.kcal} kcal / {sub.portionLabel}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newSubs = (selectedItem.item.substitutions || []).filter((_, i) => i !== idx);
                                  updateMealItem(selectedItem.mealId, selectedItem.item.instanceId, { substitutions: newSubs });
                                  setSelectedItem(prev => prev ? { ...prev, item: { ...prev.item, substitutions: newSubs } } : null);
                                }}
                                className="h-8 w-8 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover/sub:opacity-100 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl">
                            <RefreshCw className="w-8 h-8 text-white/5 mx-auto mb-2" />
                            <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Sem substituições</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="recipe" className="mt-0 space-y-6">
                    {selectedItem.item.ingredients && selectedItem.item.ingredients.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Ingredientes</p>
                        <div className="space-y-2">
                          {selectedItem.item.ingredients.map((ing, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                              <p className="text-xs font-bold text-white/80">
                                {ing.grams || ing.base_grams || 100}g de <span className="text-emerald-400">{ing.name || ing.food}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedItem.item.instructions && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Modo de Preparo</p>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-xs text-white/60 leading-relaxed">
                          {selectedItem.item.instructions}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="notes" className="mt-0 space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Observações do Nutricionista</Label>
                    <Textarea 
                      placeholder="Escreva algo especial sobre este alimento para o paciente..."
                      value={selectedItem.item.description || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateMealItem(selectedItem.mealId, selectedItem.item.instanceId, { description: val });
                        setSelectedItem(prev => prev ? { ...prev, item: { ...prev.item, description: val } } : null);
                      }}
                      className="min-h-[200px] bg-white/5 border-white/10 text-white rounded-xl focus:ring-emerald-500/50 p-4 leading-relaxed"
                    />
                  </TabsContent>
                </div>
              </Tabs>

              <DialogFooter className="p-6 border-t border-white/5 bg-black/50">
                <Button 
                  onClick={() => setSelectedItem(null)}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest h-12 rounded-xl"
                >
                  Concluir Edição
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Modal Fullscreen: Adicionar Refeição */}
      <Dialog open={showAddMealModal} onOpenChange={setShowAddMealModal}>
        <DialogContent className="max-w-none w-full h-screen m-0 rounded-none border-0 bg-black text-white p-0 flex flex-col animate-in slide-in-from-bottom duration-500 z-[100]">
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Nova Refeição</h2>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Estruturação de Plano</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowAddMealModal(false)} className="rounded-full h-12 w-12 hover:bg-white/5">
              <X className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-xl mx-auto w-full space-y-8">
            <div className="w-full space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Nome da Refeição</Label>
              <Input 
                placeholder="Ex: Almoço de Domingo, Pós-Treino..."
                value={newMealName}
                onChange={(e) => setNewMealName(e.target.value)}
                className="h-16 bg-white/5 border-white/10 text-2xl font-black rounded-2xl px-6 focus:ring-emerald-500/50"
              />
            </div>
            <div className="w-full space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Horário Sugerido</Label>
              <Input 
                type="time"
                value={newMealTime}
                onChange={(e) => setNewMealTime(e.target.value)}
                className="h-16 bg-white/5 border-white/10 text-2xl font-black rounded-2xl px-6 focus:ring-emerald-500/50"
              />
            </div>
            <Button 
              onClick={() => {
                if (!newMealName) {
                  toast.error("Dê um nome para a refeição");
                  return;
                }
                addMeal(); // Chama a action existente
                // Como addMeal não aceita parâmetros, precisamos atualizar o header logo após
                setTimeout(() => {
                  const state = useEditorState.getState();
                  const lastMeal = state.meals[state.meals.length - 1];
                  if (lastMeal) {
                    updateMealHeader(lastMeal.id, newMealName, newMealTime);
                  }
                }, 50);
                
                setShowAddMealModal(false);
                setNewMealName('');
              }}
              className="w-full h-16 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-[0.2em] text-sm rounded-2xl shadow-[0_0_30px_-10px_rgba(16,185,129,0.5)] transition-all active:scale-95"
            >
              Confirmar e Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Fullscreen: Templates de Plano */}
      <Dialog open={showTemplatesModal} onOpenChange={setShowTemplatesModal}>
        <DialogContent className="max-w-none w-full h-screen m-0 rounded-none border-0 bg-black text-white p-0 flex flex-col animate-in slide-in-from-bottom duration-500 z-[100]">
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Layers className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Biblioteca de Templates</h2>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Base Estrutural Premium</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowTemplatesModal(false)} className="rounded-full h-12 w-12 hover:bg-white/5">
              <X className="w-6 h-6" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
              {[
                { id: 't1', name: 'Ganho de Massa Limpo', desc: 'Foco em hipertrofia com baixo acúmulo de gordura.', kcal: '2.800' },
                { id: 't2', name: 'Cutting Agressivo', desc: 'Déficit calórico otimizado para preservação de MM.', kcal: '1.800' },
                { id: 't3', name: 'Low Carb Funcional', desc: 'Controle glicêmico e alta densidade nutritiva.', kcal: '2.000' },
                { id: 't4', name: 'Vegano Performance', desc: 'Proteínas vegetais de alto valor biológico.', kcal: '2.400' },
                { id: 't5', name: 'Manutenção Normocalórica', desc: 'Equilíbrio total para longevidade e saúde.', kcal: '2.200' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    toast.success(`Template "${t.name}" selecionado!`);
                    setShowTemplatesModal(false);
                  }}
                  className="group text-left p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-100 group-hover:text-emerald-500 transition-all">
                    <Sparkles className="w-12 h-12" />
                  </div>
                  <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors mb-2">{t.name}</h3>
                  <p className="text-xs text-white/40 leading-relaxed mb-6 font-medium">{t.desc}</p>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-white/10 text-white/60 border-0 font-black px-4 py-1 rounded-full uppercase text-[10px]">{t.kcal} kcal</Badge>
                    <span className="text-[10px] font-black uppercase text-emerald-500 opacity-0 group-hover:opacity-100 transition-all">Aplicar Template →</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
