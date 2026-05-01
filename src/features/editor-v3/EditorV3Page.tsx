import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEditorState } from './useEditorState';
import { useDraftSync } from './useDraftSync';
import { promoteDraftToMealPlan } from './promoteDraft';
import { loadOrCreateDraft } from './draftService';
import { 
  searchFoods, searchMarmitas, searchTemplates, 
  getCompatibleFoods, getBaseFoods, seedBaseData,
  searchVisualLibrary, uploadVisualLibraryImage 
} from './utils/dataFetcher';
import { isProtein, isCarb, isFruit, getDeterministicSuggestions, calculateItemMacros } from './utils/v3Motor';
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
  User, Edit3, List, BookOpen, RefreshCw, X, History, Maximize2, ChevronDown, RefreshCcw, ArrowRight, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Meal, MealItem, Food, MealTemplate } from './types';
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
    meals, auditLog, setPatientId, hydrateMeals,
    addMarmitaToMeal, addFoodToMeal, applyTemplateToMeal,
    removeFood, updateFoodQuantity, updateMealItem, generatePlan, generateMeal, savePlan, planStatus,
    resetEditor, addMeal, removeMeal, updateMealHeader, addMealWithHeader,
    duplicateMeal, reorderMeal, updateMealImage
  } = useEditorState();

  const {
    draftId, syncState, initialMeals, initialAuditLog, lastSavedAt,
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
  
  const [debugMode, setDebugMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ mealId: string, item: MealItem } | null>(null);
  const [substitutionSearch, setSubstitutionSearch] = useState('');
  const [substitutionResults, setSubstitutionResults] = useState<Food[]>([]);
  const [isSearchingSubstitutions, setIsSearchingSubstitutions] = useState(false);
  const [swapSearch, setSwapSearch] = useState('');
  const [swapResults, setSwapResults] = useState<Food[]>([]);
  const [isSearchingSwap, setIsSearchingSwap] = useState(false);
  const [smartSubstitutions, setSmartSubstitutions] = useState<Food[]>([]);
  const [isLoadingSmartSubs, setIsLoadingSmartSubs] = useState(false);
  const [replacementPending, setReplacementPending] = useState<{
    current: MealItem,
    target: Food,
    mealId: string
  } | null>(null);

  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [showMainAddModal, setShowMainAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'food' | 'marmita' | 'template' | 'visual'>('food');
  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const [newMealName, setNewMealName] = useState('');
  const [newMealTime, setNewMealTime] = useState('00:00');

  // Helper functions for modal management
  const setShowFoodsModal = (val: boolean) => {
    setActiveTab('food');
    setShowMainAddModal(val);
  };
  const setShowTemplatesModal = (val: boolean) => {
    setActiveTab('template');
    setShowMainAddModal(val);
  };
  const setShowMarmitasModal = (val: boolean) => {
    setActiveTab('marmita');
    setShowMainAddModal(val);
  };
  const showFoodsModal = showMainAddModal && activeTab === 'food';
  const showTemplatesModal = showMainAddModal && activeTab === 'template';
  const showMarmitasModal = showMainAddModal && activeTab === 'marmita';
  const showVisualLibraryModal = showMainAddModal && activeTab === 'visual';

  const [visualLibrarySearch, setVisualLibrarySearch] = useState('');
  const [visualLibraryCategories] = useState([
    { id: 'all', label: 'Todos' },
    { id: 'cafe_da_manha', label: 'Café da Manhã' },
    { id: 'lanches', label: 'Lanches' },
    { id: 'almoco', label: 'Almoço' },
    { id: 'jantar', label: 'Jantar' },
    { id: 'ceia', label: 'Ceia' },
    { id: 'outros', label: 'Outros' }
  ]);
  const [selectedVisualCategory, setSelectedVisualCategory] = useState('all');

  const openVisualLibraryForMeal = (mealId: string) => {
    setActiveMealId(mealId);
    setActiveTab('visual');
    setShowMainAddModal(true);
    
    // Auto-select category based on meal type
    const meal = meals.find(m => m.id === mealId);
    if (meal) {
      const name = meal.name.toLowerCase();
      if (name.includes('café') || name.includes('desjejum')) setSelectedVisualCategory('cafe_da_manha');
      else if (name.includes('lanche')) setSelectedVisualCategory('lanches');
      else if (name.includes('almoço')) setSelectedVisualCategory('almoco');
      else if (name.includes('jantar')) setSelectedVisualCategory('jantar');
      else if (name.includes('ceia')) setSelectedVisualCategory('ceia');
      else setSelectedVisualCategory('all');
    }
  };

  const [activeFoodCategory, setActiveFoodCategory] = useState<string>('all');

  const [foodSearch, setFoodSearch] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [marmitas, setMarmitas] = useState<Food[]>([]);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [visualLibraryResults, setVisualLibraryResults] = useState<Food[]>([]);
  const [visualLibraryInfo, setVisualLibraryInfo] = useState<{ count: number, incomplete: boolean }>({ count: 0, incomplete: false });
  const [isSearchingFoods, setIsSearchingFoods] = useState(false);
  const [isSearchingVisualLibrary, setIsSearchingVisualLibrary] = useState(false);
  const [baseFoods, setBaseFoods] = useState<Food[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [dbStatus, setDbStatus] = useState<{
    foods: number;
    marmitas: number;
    templates: number;
    visualLibrary: number;
    error: string | null;
  }>({ foods: 0, marmitas: 0, templates: 0, visualLibrary: 0, error: null });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: patientsData, isLoading: isLoadingPatients } = usePatientsList({ 
    search: patientSearch,
    pageSize: 10
  });

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

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (foodSearch.length >= 2 || (activeTab === 'visual' && foodSearch.length === 0) || (activeTab === 'visual' && selectedVisualCategory !== 'all')) {
        setIsSearchingFoods(true);
        setIsSearchingVisualLibrary(true);
        
        const [foodResults, visualResults] = await Promise.all([
          searchFoods(foodSearch),
          searchVisualLibrary(foodSearch, activeTab === 'visual' ? selectedVisualCategory : undefined, user?.id)
        ]);
        
        setFoods(foodResults);
        setVisualLibraryResults(visualResults);
        
        setIsSearchingFoods(false);
        setIsSearchingVisualLibrary(false);
      } else if (foodSearch.length === 0 && activeTab !== 'visual') {
        setFoods([]);
        setVisualLibraryResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [foodSearch, selectedVisualCategory, activeTab]);

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

  useEffect(() => {
    const loadSmartSuggestions = async () => {
      if (selectedItem) {
        setIsLoadingSmartSubs(true);
        const name = selectedItem.item.name;
        
        let category: 'protein' | 'carb' | 'fruit' | 'any' = 'any';
        if (isProtein(name)) category = 'protein';
        else if (isCarb(name)) category = 'carb';
        else if (isFruit(name)) category = 'fruit';

        const dbSuggestions = await getCompatibleFoods(category, name);
        const suggestions = getDeterministicSuggestions(
          name, 
          dbSuggestions, 
          selectedItem.item.measurementType,
          selectedItem.item.portionLabel
        );

        setSmartSubstitutions(suggestions.slice(0, 12));
        setIsLoadingSmartSubs(false);
      }
    };
    loadSmartSuggestions();
  }, [selectedItem]);

  useEffect(() => {
    const loadAllData = async () => {
      if (!user?.id) return;
      
      const startTime = performance.now();
      try {
        const [marmitasData, templatesData, baseData] = await Promise.all([
          searchMarmitas(user.id),
          searchTemplates(),
          getBaseFoods()
        ]);

        setMarmitas(marmitasData);
        setTemplates(templatesData);
        setBaseFoods(baseData);
        
        setDbStatus({
          foods: baseData.length,
          marmitas: marmitasData.length,
          templates: templatesData.length,
          visualLibrary: 0, // Will be updated as needed
          error: null
        });

        if (baseData.length === 0 || templatesData.length === 0) {
          await seedBaseData(user.id);
          const [m2, t2, b2] = await Promise.all([
            searchMarmitas(user.id),
            searchTemplates(),
            getBaseFoods()
          ]);
          setMarmitas(m2);
          setTemplates(t2);
          setBaseFoods(b2);
          setDbStatus({ foods: b2.length, marmitas: m2.length, templates: t2.length, visualLibrary: 0, error: null });
          if (b2.length > 0 && t2.length > 0) setDataReady(true);
          return;
        }

        if (baseData.length > 0 && templatesData.length > 0) {
          setDataReady(true);
        } else {
          setDbStatus(prev => ({ ...prev, error: 'Base de dados incompleta ou vazia.' }));
        }
      } catch (err: any) {
        setDbStatus(prev => ({ ...prev, error: err.message || 'Falha ao conectar com o banco de dados.' }));
      }
    };
    loadAllData();
  }, [user?.id]);

  const totalMacros = useMemo(() => {
    return meals.reduce((acc, meal) => {
      meal.items.forEach(item => {
        const q = item.quantity ?? 1;
        const cal = item.calories || item.kcal || 0;
        const factor = (item.measurementType === 'gram' || item.measurementType === 'ml') ? q / 100 : q;
        
        acc.kcal += cal * factor;
        acc.protein += (item.protein ?? 0) * factor;
        acc.carbs += (item.carbs ?? 0) * factor;
        acc.fat += (item.fat ?? 0) * factor;
      });
      return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }, [meals]);

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
      hydrateMeals(initialMeals, initialAuditLog);
      hydratedRef.current = true;
    }
  }, [initialMeals, initialAuditLog, hydrateMeals]);

  useEffect(() => {
    if (hydratedRef.current && draftId) {
      scheduleSave(meals, auditLog);
    }
  }, [meals, auditLog, draftId, scheduleSave]);

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
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!uploadName || !uploadCategory) {
      toast.error('Nome e categoria são obrigatórios para o upload.');
      return;
    }

    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('Arquivo muito grande. Limite de 2MB.');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadVisualLibraryImage(file, uploadName, uploadCategory, user.id);
      if (result.success) {
        toast.success('Imagem enviada com sucesso!');
        setUploadName('');
        setUploadCategory('');
        // Refresh library
        const visualResults = await searchVisualLibrary(foodSearch, selectedVisualCategory, user.id);
        setVisualLibraryResults(visualResults);
      } else {
        toast.error(`Erro no upload: ${result.error}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleExecuteGeneration = async (calories: number) => {
    setIsGeneratingGlobal(true);
    setShowCalorieModal(false);
    await new Promise(resolve => setTimeout(resolve, 800));
    generatePlan(selectedDietType || 'muscle-gain', calories, baseFoods, replaceExistingFlag);
    setIsGeneratingGlobal(false);
    toast.success('Motor V3: Plano gerado com sucesso!');
  };

  const handleMealGenerate = async (mealId: string) => {
    setGeneratingMealId(mealId);
    await new Promise(resolve => setTimeout(resolve, 600));
    generateMeal(mealId, 'muscle-gain', baseFoods, 2000);
    setGeneratingMealId(null);
  };

  const executeSwap = (mealId: string, instanceId: string, target: Food, autoAdjust = false) => {
    const meal = meals.find(m => m.id === mealId);
    const currentItem = meal?.items.find(i => i.instanceId === instanceId);
    
    if (!currentItem) return;

    let newQuantity = 1;

    if (autoAdjust) {
      const currentMacros = calculateItemMacros(currentItem, currentItem.quantity);
      const targetKcalPerUnit = target.kcal; 
      
      if (targetKcalPerUnit > 0) {
        if (target.measurementType === 'gram' || target.measurementType === 'ml') {
          newQuantity = Math.round((currentMacros.kcal / targetKcalPerUnit) * 100);
        } else {
          newQuantity = Math.round(currentMacros.kcal / targetKcalPerUnit);
        }
      } else {
        newQuantity = currentItem.quantity;
      }
    } else {
      if (target.measurementType === 'gram') newQuantity = 100;
      else if (target.measurementType === 'ml') newQuantity = 200;
      else newQuantity = 1;
    }

    updateMealItem(mealId, instanceId, {
      name: target.name,
      kcal: target.kcal,
      calories: target.kcal,
      protein: target.protein,
      carbs: target.carbs,
      fat: target.fat,
      portionLabel: target.portionLabel,
      imageUrl: target.imageUrl,
      ingredients: target.ingredients,
      isMarmita: target.isMarmita,
      measurementType: target.measurementType,
      quantity: newQuantity
    });
    
    setReplacementPending(null);
    setSelectedItem(null);
    toast.success(`Alimento trocado para ${target.name}`);
  };

  const handleRequestSwap = (mealId: string, current: MealItem, target: Food) => {
    if (current.measurementType !== target.measurementType) {
      setReplacementPending({ current, target, mealId });
    } else {
      executeSwap(mealId, current.instanceId, target);
    }
  };

  if (!dataReady && !isSandbox) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-pulse",
          dbStatus.error ? "bg-rose-500/10" : "bg-emerald-500/10"
        )}>
          {dbStatus.error ? <CloudOff className="w-10 h-10 text-rose-500" /> : <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />}
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
          {dbStatus.error ? "Base de dados não encontrada" : "Carregando Base Clínica"}
        </h1>
        <p className="text-white/40 max-w-sm mb-8">
          {dbStatus.error || "Sincronizando tabelas essenciais para garantir precisão clínica."}
        </p>
        {dbStatus.error && (
          <Button onClick={() => window.location.reload()} className="bg-white text-black font-black uppercase tracking-widest px-8 h-12 rounded-xl">
            Tentar Novamente
          </Button>
        )}
      </div>
    );
  }

  if (!patientId && !planId && !isSandbox) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
          <UserX className="w-10 h-10 text-rose-500" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Paciente não selecionado</h1>
        <p className="text-white/40 max-w-sm mb-8">Você precisa selecionar um paciente para criar ou editar um plano real.</p>
        <Button onClick={() => navigate('/patients')} className="bg-white text-black font-black uppercase tracking-widest px-8 h-12 rounded-xl">
          Voltar para Pacientes
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#000000] flex flex-col font-sans selection:bg-emerald-500/30">
      <div className="bg-black/40 border-b border-white/5 py-4 px-6 backdrop-blur-md sticky top-0 z-[60]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="flex flex-col">
               <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Status Nutricional</span>
                 <div className="flex items-center gap-1">
                   <button 
                     onClick={() => setDebugMode(!debugMode)}
                     className={cn(
                       "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter transition-all",
                       debugMode ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-white/20 hover:text-white/40"
                     )}
                   >
                     MODO TRANSPARÊNCIA
                   </button>
                 </div>
               </div>
               <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-white">{Math.round(totalMacros.kcal)} <span className="text-[10px] text-white/40 font-bold ml-1 uppercase">kcal</span></span>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-emerald-400">{Math.round(totalMacros.protein)}g <span className="text-[8px] text-white/30 font-bold ml-0.5 uppercase">Prot</span></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-blue-400">{Math.round(totalMacros.carbs)}g <span className="text-[8px] text-white/30 font-bold ml-0.5 uppercase">Carb</span></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-amber-400">{Math.round(totalMacros.fat)}g <span className="text-[8px] text-white/30 font-bold ml-0.5 uppercase">Gord</span></span>
                  </div>
               </div>
             </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)} className="h-9 border-white/5 bg-white/5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
              <RotateCcw className="w-3.5 h-3.5 mr-2" /> Resetar
            </Button>
            <Button variant="outline" size="sm" onClick={() => { const hasItems = meals.some(m => m.items.length > 0); if (hasItems) setShowAIGenerateConfirm(true); else handleGlobalGenerate(false); }} className="h-9 border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Gerar Plano
            </Button>
            <Button size="sm" onClick={handlePromotionRequest} disabled={promoting || !draftId} className="h-9 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-xl transition-all px-6 shadow-lg shadow-emerald-500/20">
              <Save className="w-3.5 h-3.5 mr-2" /> Salvar Plano
            </Button>
          </div>
        </div>
      </div>

      <header className="border-b border-emerald-500/10 bg-black/80 backdrop-blur-2xl sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-2xl shadow-emerald-500/5">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 transition-all active:scale-95 group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">Editor V3 Elite</h1>
            <p className="text-[9px] font-black text-emerald-500/80 uppercase tracking-[0.2em]">Control System Active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowAddMealModal(true)} className="h-9 px-4 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all gap-2">
            <Plus className="w-3.5 h-3.5" /> Refeição
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowTemplatesModal(true)} className="h-9 px-4 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all gap-2">
            <Layers className="w-3.5 h-3.5" /> Templates
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-12 pb-32">
        {meals.map((meal, index) => (
          <section key={meal.id} className="group animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex flex-col mb-6">
              {meal.imageUrl && (
                <div className="relative w-full h-48 mb-6 rounded-3xl overflow-hidden group/img">
                  <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <Button 
                      variant="outline" 
                      onClick={() => openVisualLibraryForMeal(meal.id)}
                      className="bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 hover:text-black border-0 gap-2"
                    >
                      <ImageIcon className="w-4 h-4" /> Alterar Imagem
                    </Button>
                  </div>
                  {meal.imageSource === 'manual' && (
                    <Badge className="absolute top-4 left-4 bg-emerald-500 text-black font-black uppercase tracking-tighter text-[9px] border-0">
                      Imagem Personalizada
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 relative">
                    <ChefHat className="w-6 h-6 text-emerald-500" />
                    {!meal.imageUrl && (
                      <button 
                        onClick={() => openVisualLibraryForMeal(meal.id)}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black border border-white/10 flex items-center justify-center text-white/40 hover:text-emerald-500 hover:border-emerald-500/50 transition-all shadow-xl"
                        title="Adicionar imagem à refeição"
                      >
                        <ImageIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <input className="bg-transparent border-none font-black text-xl tracking-tight text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1 w-full max-w-[300px]" value={meal.name} onChange={(e) => updateMealHeader(meal.id, e.target.value, meal.time || '00:00')} />
                    <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-wider mt-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-500/50" />
                      <input type="time" className="bg-transparent border-none text-white/40 focus:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1 w-20" value={meal.time || '00:00'} onChange={(e) => updateMealHeader(meal.id, meal.name, e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" disabled={generatingMealId === meal.id} onClick={() => handleMealGenerate(meal.id)} className="rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500/60 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all border border-emerald-500/10">
                    {generatingMealId === meal.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Gerar Refeição
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => duplicateMeal(meal.id)} className="rounded-xl h-9 w-9 text-blue-500/40 hover:text-blue-500 hover:bg-blue-500/10 transition-all border border-blue-500/10"><Layers className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { setActiveMealId(meal.id); setShowFoodsModal(true); }} className="h-9 px-4 text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all gap-1.5"><Plus className="w-3 h-3" /> Adicionar</Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remover "${meal.name}"?`)) removeMeal(meal.id); }} className="rounded-xl h-9 w-9 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-rose-500/10"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
            <div className="grid gap-5">
              {meal.items.map((item) => (
                <Card key={item.instanceId} className="p-5 flex items-center justify-between border-0 border-l-[3px] bg-white/[0.03] hover:bg-white/[0.06] transition-all rounded-2xl cursor-pointer border-emerald-500/50" onClick={() => setSelectedItem({ mealId: meal.id, item })}>
                  <div className="flex items-center gap-5">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-xl object-cover" />}
                    <div>
                      <p className="font-black text-[15px] tracking-tight text-white">{formatPortion(item.quantity ?? 1, item.portionUnit, item.measurementType)} {item.name}</p>
                      <p className="text-[11px] font-bold text-white/50">{Math.round((item.quantity ?? 1) * (item.calories ?? 0) * ((item.measurementType === 'gram' || item.measurementType === 'ml') ? 0.01 : 1))} kcal</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeFood(meal.id, item.instanceId); }} className="h-10 w-10 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                </Card>
              ))}
            </div>
          </section>
        ))}
        <div className="flex justify-center pb-24">
          <Button onClick={addMeal} className="h-16 px-10 rounded-3xl bg-emerald-500/5 hover:bg-emerald-500/10 border-2 border-dashed border-emerald-500/20 text-emerald-500 font-black gap-4 transition-all hover:scale-105">
            <Plus className="w-5 h-5" /> Adicionar Nova Refeição
          </Button>
        </div>
      </main>

      <Dialog open={showMainAddModal} onOpenChange={setShowMainAddModal}>
        <DialogContent className="sm:max-w-none w-full h-full p-0 overflow-hidden border-0 bg-black flex flex-col rounded-none backdrop-blur-2xl">
          <DialogHeader className="p-8 pb-4">
            <div className="flex items-center justify-between w-full">
              <div>
                <DialogTitle className="flex items-center gap-3 text-white font-black uppercase tracking-tighter text-3xl italic">
                  {activeTab === 'food' && <Apple className="w-8 h-8 text-emerald-500" />}
                  {activeTab === 'marmita' && <Utensils className="w-8 h-8 text-blue-500" />}
                  {activeTab === 'template' && <Layers className="w-8 h-8 text-amber-500" />}
                  {activeTab === 'food' ? 'Biblioteca de Alimentos' : activeTab === 'marmita' ? 'Minhas Marmitas' : 'Templates de Refeição'}
                </DialogTitle>
                <DialogDescription className="text-white/40 font-bold text-sm mt-1 uppercase tracking-widest">
                  {activeTab === 'food' ? 'Explore a base TACO/USDA para adicionar à sua refeição.' : activeTab === 'marmita' ? 'Refeições completas prontas para montagem rápida.' : 'Modelos estruturados para ganho de velocidade clínica.'}
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowMainAddModal(false)} className="text-white/40 hover:text-white rounded-full h-12 w-12 hover:bg-white/5 transition-all">
                <X className="w-6 h-6" />
              </Button>
            </div>
          </DialogHeader>

          <div className="px-8 py-2">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="bg-white/5 w-full justify-start p-1.5 rounded-2xl h-auto flex-wrap gap-2 mb-6 border border-white/5">
                <TabsTrigger value="food" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-black text-[11px] font-black uppercase rounded-xl h-10 px-6 transition-all">Alimentos</TabsTrigger>
                <TabsTrigger value="marmita" className="data-[state=active]:bg-blue-500 data-[state=active]:text-black text-[11px] font-black uppercase rounded-xl h-10 px-6 transition-all">Marmitas</TabsTrigger>
                <TabsTrigger value="template" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-[11px] font-black uppercase rounded-xl h-10 px-6 transition-all">Templates</TabsTrigger>
                <TabsTrigger value="visual" className="data-[state=active]:bg-rose-500 data-[state=active]:text-black text-[11px] font-black uppercase rounded-xl h-10 px-6 transition-all">Banco de Imagens</TabsTrigger>
              </TabsList>
            </Tabs>

            {(activeTab === 'food' || activeTab === 'visual') && (
              <div className="flex flex-col gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <Input 
                    placeholder={activeTab === 'food' ? "Pesquisar alimentos..." : "Pesquisar banco de imagens..."}
                    value={foodSearch} 
                    onChange={(e) => setFoodSearch(e.target.value)} 
                    className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-2xl text-lg placeholder:text-white/10 focus:border-emerald-500/50 transition-all shadow-2xl" 
                  />
                  {(isSearchingFoods || isSearchingVisualLibrary) && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 animate-spin" />}
                </div>
                
                {activeTab === 'visual' && (
                  <ScrollArea className="w-full pb-2">
                    <div className="flex gap-2">
                      {visualLibraryCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedVisualCategory(cat.id)}
                          className={cn(
                            "px-4 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                            selectedVisualCategory === cat.id 
                              ? "bg-rose-500 text-black border-rose-500" 
                              : "bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white/60"
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {activeTab === 'visual' && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4 flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-white/40 ml-1 tracking-widest">Nome da Imagem</Label>
                      <Input 
                        placeholder="Ex: Tapioca com Ovos..." 
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        className="bg-white/5 border-white/10 h-11 rounded-xl focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="w-full md:w-48 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-white/40 ml-1 tracking-widest">Categoria</Label>
                      <select 
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 h-11 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none"
                      >
                        <option value="" disabled>Selecionar...</option>
                        {visualLibraryCategories.filter(c => c.id !== 'all').map(c => (
                          <option key={c.id} value={c.id} className="bg-black text-white">{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleUploadImage}
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || !uploadName || !uploadCategory}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest h-11 rounded-xl px-6 transition-all shrink-0 gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Upload de Imagem
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {activeTab === 'food' && foods.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    if (activeMealId) addFoodToMeal(activeMealId, f);
                    setShowMainAddModal(false);
                    toast.success(`${f.name} adicionado!`);
                  }}
                  className="group relative flex flex-col items-start p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left overflow-hidden h-full shadow-2xl"
                >
                  <div className="flex items-center gap-4 w-full mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/5 group-hover:border-emerald-500/20 transition-all">
                      {f.imageUrl ? (
                        <img src={f.imageUrl} alt={f.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Apple className="w-6 h-6 text-white/10" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start w-full">
                        <span className="font-black text-white group-hover:text-emerald-400 transition-colors line-clamp-2 text-[15px] leading-tight pr-2">{f.name}</span>
                        <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase border-0">{f.kcal} kcal</Badge>
                      </div>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1 block">{f.portionLabel}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 w-full mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-white/10 uppercase mb-1">Prot</span>
                      <span className="text-xs font-black text-emerald-400/80">{f.protein}g</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-white/10 uppercase mb-1">Carb</span>
                      <span className="text-xs font-black text-blue-400/80">{f.carbs}g</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-white/10 uppercase mb-1">Gord</span>
                      <span className="text-xs font-black text-amber-400/80">{f.fat}g</span>
                    </div>
                  </div>
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/20">
                      <Plus className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))}

              {activeTab === 'visual' && visualLibraryResults.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    if (activeMealId) {
                      updateMealImage(activeMealId, v.imageUrl!, 'manual');
                      setShowMainAddModal(false);
                      toast.success(`Imagem da refeição atualizada!`);
                    }
                  }}
                  className="group relative flex flex-col items-start p-4 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all text-left overflow-hidden h-full shadow-2xl"
                >
                  <div className="w-full h-40 mb-4 rounded-2xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-rose-500/20 transition-all relative">
                    {v.imageUrl ? (
                      <img 
                        src={v.imageUrl} 
                        alt={v.name} 
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5 animate-pulse">
                         <ImageIcon className="w-10 h-10 text-white/5" />
                      </div>
                    )}
                    {v.nutritionistId === user?.id && (
                      <Badge className="absolute top-3 right-3 bg-emerald-500 text-black text-[7px] font-black uppercase border-0 shadow-xl">
                        Minha Imagem
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-start w-full px-2">
                    <span className="font-black text-white group-hover:text-rose-400 transition-colors line-clamp-2 text-sm uppercase tracking-tight">{(v as any).display_name || v.name}</span>
                  </div>
                  {v.category && (
                    <Badge className="mt-2 ml-2 bg-white/5 text-white/30 text-[8px] font-black uppercase border-0">
                      {visualLibraryCategories.find(c => c.id === v.category)?.label || v.category}
                    </Badge>
                  )}
                </button>
              ))}

              {activeTab === 'marmita' && marmitas.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    if (activeMealId) addMarmitaToMeal(activeMealId, m);
                    setShowMainAddModal(false);
                    toast.success(`${m.name} adicionada!`);
                  }}
                  className="group relative flex flex-col items-start p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left overflow-hidden h-full shadow-2xl"
                >
                  <div className="flex justify-between items-start w-full mb-3">
                    <span className="font-black text-white group-hover:text-blue-400 transition-colors line-clamp-2 text-[15px] leading-tight pr-8">{m.name}</span>
                    <Badge className="bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase border-0">{m.kcal} kcal</Badge>
                  </div>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-6">Marmita Pronta</span>
                  
                  <div className="flex items-center gap-6 w-full mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-white/10 uppercase mb-1">Prot</span>
                      <span className="text-xs font-black text-emerald-400/80">{m.protein}g</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-white/10 uppercase mb-1">Carb</span>
                      <span className="text-xs font-black text-blue-400/80">{m.carbs}g</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-white/10 uppercase mb-1">Gord</span>
                      <span className="text-xs font-black text-amber-400/80">{m.fat}g</span>
                    </div>
                  </div>
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-black shadow-lg shadow-blue-500/20">
                      <Plus className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))}

              {activeTab === 'template' && templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (activeMealId) {
                      applyTemplateToMeal(activeMealId, t);
                    } else {
                      addMealWithHeader(t.name, "08:00");
                      setTimeout(() => {
                        const state = useEditorState.getState();
                        const lastMeal = state.meals[state.meals.length - 1];
                        if (lastMeal) applyTemplateToMeal(lastMeal.id, t);
                      }, 50);
                    }
                    setShowMainAddModal(false);
                    toast.success(`Template ${t.name} aplicado!`);
                  }}
                  className="group relative flex flex-col items-start p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-left overflow-hidden h-full shadow-2xl"
                >
                  <div className="flex justify-between items-start w-full mb-3">
                    <span className="font-black text-white group-hover:text-amber-400 transition-colors line-clamp-2 text-[15px] leading-tight pr-8">{t.name}</span>
                    <Badge className="bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase border-0">{t.items.length} Itens</Badge>
                  </div>
                  <p className="text-[11px] font-medium text-white/40 line-clamp-2 mb-6 h-8 leading-relaxed uppercase tracking-tighter">{t.description}</p>
                  
                  <div className="flex gap-2 mt-auto">
                    {t.items.slice(0, 2).map((item, idx) => (
                      <Badge key={idx} variant="outline" className="text-[9px] h-5 bg-white/5 border-white/10 text-white/30 font-bold">{item.name}</Badge>
                    ))}
                    {t.items.length > 2 && <span className="text-[9px] text-white/20 font-black">+{t.items.length - 2}</span>}
                  </div>
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                    <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
                      <Plus className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))}

              {activeTab === 'food' && foods.length === 0 && !isSearchingFoods && (
                <div className="col-span-full py-40 flex flex-col items-center justify-center text-white/10 italic font-medium">
                  <Apple className="w-16 h-16 mb-6 opacity-10 animate-pulse" />
                  <p className="uppercase tracking-[0.3em] font-black text-xs">Digite para buscar na base clínica</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditorV3Page;
