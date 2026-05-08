console.log('[V3-READY] Editor Page Initialized');
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { isFeatureEnabled } from '../../security/services/featureFlags';
import { useEditorState } from '../hooks/useEditorState';
import { useDraftSync } from '../hooks/useDraftSync';
import { promoteDraftToMealPlan } from '../services/promoteDraft';
import { loadOrCreateDraft } from '../services/draftService';
import { runV3IntegrationTests } from '../services/v3Tests';
import { 
  searchFoods, searchMarmitas, searchTemplates, 
  getCompatibleFoods, getBaseFoods, seedBaseData,
  searchVisualLibrary, uploadVisualLibraryImage 
} from '../utils/dataFetcher';
import { 
  calculateNutritionalScore, validatePlanClinically 
} from '../../clinical-engine';
import { 
  isProtein, isCarb, isFruit, getDeterministicSuggestions, calculateItemMacros 
} from '@/lib/nutricore_v2/helpers';

import { normalizeFoodMeasurement, recalculateMacros, applyClinicalSafety } from '../../clinical-engine/utils/foodNormalization';

// Direct NutriCore V2 Imports
import { generateDailyPlan } from "@/lib/nutricore_v2/plan-generator";
import { runEngine } from "@/lib/nutricore_v2/nutrition-engine";
import { BASE_FOODS } from "@/lib/nutricore_v2/food-database";
import { MealSlot } from "@/lib/nutricore_v2/meal-distribution";
import { getSubstitutions } from "@/lib/nutricore_v2/substitutions";
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
  User, Edit3, List, BookOpen, RefreshCw, X, History, Maximize2, ChevronDown, RefreshCcw, ArrowRight, Image as ImageIcon, Eye, Share2
} from 'lucide-react';


import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Meal, MealItem, Food, MealTemplate } from '../types';
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

const formatPortion = (item: MealItem) => {
  // No V3, exibimos gramas diretamente para maior precisão técnica
  if (item.measurementType === 'gram') {
    return `${Math.round(item.quantity)}g`;
  }
  if (item.measurementType === 'ml') {
    return `${Math.round(item.quantity)}ml`;
  }
  
  // Para unidades e colheres, usamos a normalização
  const { displayUnit, displayQuantity } = normalizeFoodMeasurement(item);
  return `${displayQuantity} ${displayUnit} (~${Math.round(item.quantity)}g)`;
};

const EditorV3Page = () => {
  const { user } = useAuth();
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('planId');
  const isSandbox = !patientId && !planId;

  const {
    meals, auditLog, setPatientId, hydrateMeals, sharingToken: storeSharingToken,
    addMarmitaToMeal, addFoodToMeal, applyTemplateToMeal,
    removeFood, updateFoodQuantity, updateMealItem, generatePlan, generateMeal, savePlan, planStatus,
    resetEditor, addMeal, removeMeal, updateMealHeader, addMealWithHeader,
    duplicateMeal, reorderMeal, updateMealImage, setMeals,

    nutritionalScore, validationIssues, refinePlan, goalMetadata, setGoalMetadata,
    patientContext, setPatientContext, confidence, lastBlockedReason, addAuditEntry
  } = useEditorState();

  if (!isFeatureEnabled('editorV3')) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4 p-8 text-center">
        <div className="p-4 bg-yellow-50 rounded-full">
          <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-2xl font-bold">Módulo em Blindagem</h2>
        <p className="text-muted-foreground max-w-md">O Editor V3 está temporariamente desativado para garantir a estabilidade do sistema principal. Por favor, utilize a versão estável.</p>
        <Button onClick={() => navigate('/dashboard')} variant="outline">Voltar ao Dashboard</Button>
      </div>
    );
  }

  const {
    draftId, syncState, initialMeals, initialAuditLog, lastSavedAt, sharingToken: draftSharingToken,
    scheduleSave, resetDraft, reloadFromServer, revertToLastSaved
  } = useDraftSync(patientId ?? null, meals, meals, planId);

  const hydratedRef = useRef(false);
  const [promoting, setPromoting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showClinicalDecision, setShowClinicalDecision] = useState(false);
  const [showClinicalHistory, setShowClinicalHistory] = useState(false);
  const [showRefineOptions, setShowRefineOptions] = useState(false);
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
  const [isEditingAntro, setIsEditingAntro] = useState(false);
  const [editAntroValues, setEditAntroValues] = useState({ weight: 0, height: 0, goal: 'Manutenção' });
  const [isSavingAntro, setIsSavingAntro] = useState(false);
  
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
  const [showAnamnesisHandshake, setShowAnamnesisHandshake] = useState(false);
  const [pendingAnamnesisData, setPendingAnamnesisData] = useState<any>(null);


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
    const fetchClinicalData = async () => {
      if (patientId) {
        console.debug('[V3-Init] Carregando dados clínicos para:', patientId);
        
        // 1. Carregar Perfil do Paciente (FONTE ÚNICA DA VERDADE)
        // Buscamos tanto por id quanto por user_id para garantir compatibilidade
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .or(`id.eq.${patientId},user_id.eq.${patientId}`)
          .maybeSingle();

        if (!profile) {
          console.warn('[V3-Init] Perfil não encontrado para ID:', patientId);
          return;
        }

        // Importante: A partir daqui, usamos o ID REAL do perfil (profiles.id)
        // para garantir que queries em outras tabelas (que usam patient_id FK) funcionem.
        const profileId = profile.id;
        
        // 2. Carregar Avaliação Física (Fallback 1) - Usando profileId
        const { data: assessment } = await supabase
          .from('physical_assessments')
          .select('*')
          .eq('patient_id', profileId)
          .order('assessment_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // 3. Carregar Anamnese (Fallback 2) - Usando profileId ou user_id
        const { data: anamnesis } = await supabase
          .from('patient_anamnesis')
          .select('*')
          .eq('user_id', profile.user_id || profileId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const profileAny = profile as any;
        
        // Lógica de Prioridade: Profile -> Assessment -> Anamnesis -> Default
        const weight = profileAny.current_weight_kg || assessment?.weight || (anamnesis?.answers as any)?.weight || 0;
        const height = profileAny.current_height_cm || assessment?.height || (anamnesis?.answers as any)?.height || 0;
        const age = profileAny.age || (anamnesis?.answers as any)?.age || 30;
        const sex = profileAny.gender || (anamnesis?.answers as any)?.gender || 'male';
        const activity = profileAny.activity_level || (assessment?.activity_factor ? String(assessment.activity_factor) : null) || (anamnesis?.answers as any)?.activity_level || 'moderado';
        const goal = profileAny.goal || (anamnesis?.answers as any)?.objective || 'Manutenção';
        
        // Metas nutricionais (Priorizando o que o Nutri definiu na avaliação ou o que foi calculado na anamnese)
        const kcal = assessment?.calories_target || anamnesis?.computed_kcal_target || 2000;
        const protein = assessment?.protein_target || anamnesis?.computed_protein || 150;
        const carbs = assessment?.carbs_target || anamnesis?.computed_carbs || 200;
        const fat = assessment?.fat_target || anamnesis?.computed_fat || 60;

        const context = {
          id: profile.id,
          name: profile.full_name || 'Paciente',
          goal,
          restrictions: profileAny.restrictions || (anamnesis?.answers as any)?.restrictions || [],
          preferences: profileAny.preferences || (anamnesis?.answers as any)?.preferences || [],
          weight: Number(weight),
          height: Number(height),
          age: Number(age),
          gender: sex,
          activityLevel: activity,
          calories_target: Number(kcal),
          protein_target: Number(protein),
          carbs_target: Number(carbs),
          fat_target: Number(fat),
          consent_given: profileAny.consent_given,
          consent_date: profileAny.consent_date,
          protocol_type: profileAny.protocol_type || 'default_v3',
        };

        console.info(`[V3-Context] Atribuindo contexto para ${profile.full_name}: ${weight}kg, ${goal}, ${kcal}kcal`);
        setPatientContext(context);
        
        // Sincroniza o patientId na store com o ID REAL do perfil
        setPatientId(profileId);

        // Handshake: Se a anamnese for recente (últimas 24h) e o plano estiver vazio, sugerir uso das metas
        if (anamnesis) {
          const anamnesisDate = new Date(anamnesis.created_at);
          const isRecent = (Date.now() - anamnesisDate.getTime()) < 24 * 60 * 60 * 1000;
          
          const isPlanEmpty = meals.length <= 1 && (meals[0]?.items.length === 0);
          
          if (isRecent && isPlanEmpty && !planId) {
            setPendingAnamnesisData({
              kcal: Number(anamnesis.computed_kcal_target),
              protein: Number(anamnesis.computed_protein),
              carbs: Number(anamnesis.computed_carbs),
              fat: Number(anamnesis.computed_fat)
            });
            setShowAnamnesisHandshake(true);
          }
        }

        if (assessment) setLastAssessment(assessment);
      }
    };
    fetchClinicalData();
  }, [patientId, setPatientContext, setPatientId]);

  useEffect(() => {
    if (patientId) {
      console.debug('[v3-init] checking system health for patient:', patientId);
      runV3IntegrationTests(patientId).then(res => {
        if (res.errors.length > 0) {
          console.error('[v3-health] issues detected during initialization', res.errors);
        } else {
          console.info('[v3-health] all systems operational');
        }
      });
    }
  }, [patientId]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (foodSearch.length >= 2 || (activeTab === 'visual' && foodSearch.length === 0) || (activeTab === 'visual' && selectedVisualCategory !== 'all')) {
        setIsSearchingFoods(true);
        setIsSearchingVisualLibrary(true);
        
        const [foodResults, visualData] = await Promise.all([
          searchFoods(foodSearch),
          searchVisualLibrary(foodSearch, activeTab === 'visual' ? selectedVisualCategory : undefined, user?.id)
        ]);
        
        setFoods(foodResults);
        if (visualData) {
          setVisualLibraryResults(visualData.items);
          setVisualLibraryInfo({ 
            count: visualData.categoryCount || 0, 
            incomplete: visualData.incomplete || false 
          });
        }
        
        setIsSearchingFoods(false);
        setIsSearchingVisualLibrary(false);
      } else if (foodSearch.length === 0 && activeTab !== 'visual') {
        setFoods([]);
        setVisualLibraryResults([]);
        setVisualLibraryInfo({ count: 0, incomplete: false });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [foodSearch, selectedVisualCategory, activeTab, user?.id]);

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

        // V3 Logic: Use Direct NutriCore V2 Substitutions if possible
        const currentFood = BASE_FOODS.find(f => f.id === selectedItem.item.id) || 
                          BASE_FOODS.find(f => f.name.toLowerCase() === name.toLowerCase());
                          
        if (currentFood) {
          console.log('[V3-Subs] Using NutriCore V2 Substitution Engine for:', name);
          const v2Subs = getSubstitutions(
            currentFood, 
            BASE_FOODS, 
            selectedItem.item.quantity,
            patientContext?.restrictions || []
          );
          
          const v3Subs = v2Subs.map(s => ({
            ...s.food,
            kcal: s.food.kcal_100g,
            calories: s.food.kcal_100g,
            protein: s.food.protein_100g,
            carbs: s.food.carb_100g,
            fat: s.food.fat_100g,
            portionValue: 100,
            portionLabel: '100g',
            measurementType: 'gram' as const,
            suggestedQuantity: s.grams 
          }));
          
          setSmartSubstitutions(v3Subs as any);
          setIsLoadingSmartSubs(false);
          return;
        }

        let category: 'protein' | 'carb' | 'fruit' | 'any' = 'any';
        if (isProtein(name)) category = 'protein';
        else if (isCarb(name)) category = 'carb';
        else if (isFruit(name)) category = 'fruit';

        const dbSuggestions = await getCompatibleFoods(
          category, 
          name, 
          patientContext?.restrictions || []
        );
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
        // No V3, usamos calculateItemMacros do motor V3 para consistência
        const macros = calculateItemMacros(item, item.quantity);
        acc.kcal += macros.kcal;
        acc.protein += macros.protein;
        acc.carbs += macros.carbs;
        acc.fat += macros.fat;
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

    // Integrar com o novo sistema de score
    const score = calculateNutritionalScore(meals, goalMetadata);
    const clinicalIssues = validatePlanClinically(meals, goalMetadata);

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [...warnings, ...clinicalIssues.map(i => i.message)],
      score
    };
  }, [meals, patientId, totalMacros.kcal, isSandbox, goalMetadata]);

  useEffect(() => {
    if (patientId) setPatientId(patientId);
  }, [patientId, setPatientId]);

  useEffect(() => {
    if (initialMeals && initialMeals.length > 0 && !hydratedRef.current) {
      console.log('[V3-UI] Hydrating meals from sync source', initialMeals.length);
      hydrateMeals(initialMeals, initialAuditLog, draftSharingToken || undefined);
      hydratedRef.current = true;
    }
  }, [initialMeals, initialAuditLog, hydrateMeals, draftSharingToken]);

  useEffect(() => {
    if (hydratedRef.current && draftId) {
      console.debug('[V3-UI] Scheduling sync save for updated meals');
      scheduleSave(meals, auditLog);
    }
  }, [meals, auditLog, draftId, scheduleSave]);

  const handlePromotionRequest = () => {
    // Sistema de Decisão Clínica (Pré-Salvamento)
    const criticalIssues = validationIssues.filter(i => i.severity === 'critical');
    const hasViolations = criticalIssues.length > 0;
    const isLowConfidence = confidence && confidence.value < 70;

    if (hasViolations || isLowConfidence) {
      setShowClinicalDecision(true);
    } else {
      handleConfirmPromotion();
    }
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

    if (patientContext && !patientContext.consent_given) {
      toast.error('BLOQUEIO LGPD: É necessário consentimento do paciente para salvar e promover este plano.');
      setShowValidation(true);
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
      const result = await promoteDraftToMealPlan({ ...fresh, payload: { meals, version: 1, patient_context: patientContext, nutritional_score: nutritionalScore, confidence: confidence } });
      if (result.ok) {
        toast.success('Plano salvo e publicado para o paciente!');
        await savePlan();
        
        // Fluxo V3: Salva e retorna para o detalhe do paciente para visualização do plano oficial
        if (patientId) {
          navigate(`/patients/${patientId}`);
        } else {
          navigate('/dashboard');
        }
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
        const visualData = await searchVisualLibrary(foodSearch, selectedVisualCategory, user.id);
        if (visualData) {
          setVisualLibraryResults(visualData.items);
          setVisualLibraryInfo({ 
            count: visualData.categoryCount || 0, 
            incomplete: visualData.incomplete || false 
          });
        }
      } else {
        toast.error(`Erro no upload: ${result.error}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const sanitizeFoods = (foods: Food[]) => {
    const sanitized = foods.map(f => {
      // Se for gramas e a base for <= 1, corrige para 100g
      if (f.measurementType === 'gram' && (f.portionValue <= 1 || !f.portionValue)) {
        return {
          ...f,
          portionValue: 100,
          portionLabel: "100g",
          kcal: f.kcal > 0 && f.portionValue === 1 ? f.kcal * 100 : f.kcal, // Se era 1g, multiplica kcal por 100
          calories: f.calories > 0 && f.portionValue === 1 ? f.calories * 100 : f.calories
        };
      }
      return f;
    });

    sanitized.forEach(f => {
      if (f.portionValue === 100) {
        console.log(`[SANITIZE] Corrected: ${f.name} to 100g | kcal: ${f.kcal}`);
      }
    });
    return sanitized;
  };

  const handleGenerateFullPlan = async () => {
    if (!patientContext) {
      toast.error('Carregando dados do paciente... Aguarde.');
      return;
    }

    if (!patientContext.weight || !patientContext.height) {
      toast.error('O paciente está sem Peso ou Altura. Preencha os dados antropométricos antes de gerar o plano.');
      return;
    }

    setIsGeneratingGlobal(true);
    setShowCalorieModal(false);
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      console.log('[Direct V2] Gerando plano diário completo');
      
      const mealTypeMap: Record<string, string> = {
        'cafe_da_manha': 'Café da Manhã',
        'lanche_da_manha': 'Lanche da Manhã',
        'almoço': 'Almoço',
        'lanche_da_tarde': 'Lanche da Tarde',
        'jantar': 'Jantar',
        'ceia': 'Ceia'
      };

      const mapGoal = (v3Goal: string): any => {
        const goalMap: Record<string, string> = {
          'lose_weight': 'emagrecimento',
          'gain_muscle': 'hipertrofia',
          'maintain': 'manutencao',
          'health': 'saude',
          'performance': 'performance',
          'lose-weight': 'emagrecimento',
          'muscle-gain': 'hipertrofia',
          'Emagrecimento': 'emagrecimento',
          'Hipertrofia': 'hipertrofia',
          'Manutenção': 'manutencao'
        };
        return goalMap[v3Goal] || 'manutencao';
      };

      const mapActivity = (v3Activity: string): any => {
        const activityMap: Record<string, string> = {
          'sedentary': 'sedentario',
          'light': 'leve',
          'moderate': 'moderado',
          'intense': 'intenso',
          'very_active': 'muito_intenso',
          'sedentario': 'sedentario',
          'leve': 'leve',
          'moderado': 'moderado',
          'intenso': 'intenso'
        };
        return activityMap[v3Activity] || 'moderado';
      };

      const engineInput = {
        weight_kg: patientContext.weight || 75,
        height_cm: patientContext.height || 175,
        age_years: patientContext.age || 30,
        sex: (patientContext.gender === 'female' || patientContext.gender === 'feminino') ? 'feminino' : 'masculino' as any,
        activity_level: mapActivity(patientContext.activityLevel || 'moderado'),
        goal: mapGoal(patientContext.goal || 'manutencao'),
        restrictions: patientContext.restrictions || [],
        preferences: patientContext.preferences || []
      };

      const mealSlots: MealSlot[] = [
        { type: 'cafe_da_manha', time: '08:00' },
        { type: 'lanche_da_manha', time: '10:30' },
        { type: 'almoço', time: '13:00' },
        { type: 'lanche_da_tarde', time: '16:00' },
        { type: 'jantar', time: '19:30' },
        { type: 'ceia', time: '22:00' }
      ];

      const dailyPlan = generateDailyPlan(engineInput, mealSlots, BASE_FOODS);
      
      const v3Meals = dailyPlan.meals.map(v2Meal => {
        const mealName = mealTypeMap[v2Meal.type] || v2Meal.type;
        return {
          id: Math.random().toString(36).substring(2, 9),
          name: mealName,
          time: v2Meal.time,
          items: v2Meal.items.map(item => {
            const factor = item.grams / 100;
            return {
              id: item.foodId,
              name: item.name,
              kcal: Math.round(item.macros.kcal / (factor || 1)),
              calories: Math.round(item.macros.kcal / (factor || 1)),
              protein: Number((item.macros.protein_g / (factor || 1)).toFixed(1)),
              carbs: Number((item.macros.carb_g / (factor || 1)).toFixed(1)),
              fat: Number((item.macros.fat_g / (factor || 1)).toFixed(1)),
              portionValue: 100,
              portionUnitLabel: 'g',
              portionUnit: 'g',
              portionLabel: 'g',
              measurementType: 'gram' as const,
              instanceId: Math.random().toString(36).substring(2, 10),
              quantity: item.grams,
              substitutions: []
            };
          })
        };
      });

      hydrateMeals(v3Meals);
      
      setGoalMetadata({
        goalCalories: dailyPlan.daily_totals.protein_kcal + dailyPlan.daily_totals.carb_kcal + dailyPlan.daily_totals.fat_kcal,
        goalProtein: dailyPlan.daily_totals.protein_g,
        goalCarbs: dailyPlan.daily_totals.carb_g,
        goalFat: dailyPlan.daily_totals.fat_g
      });

      toast.success('NutriCore V2: Plano completo gerado com sucesso!');
    } catch (error) {
      console.error('[Direct V2 Error]', error);
      toast.error('Erro ao gerar plano completo no NutriCore V2');
    } finally {
      setIsGeneratingGlobal(false);
    }
  };

  const handleFixPlan = async () => {
    if (!patientContext) return;
    setIsGeneratingGlobal(true);
    
    try {
      console.log('[Direct V2] Corrigindo refeições vazias ou críticas');
      
      // Identificar refeições que precisam de correção
      const mealsToFix = meals.filter(m => 
        m.items.length === 0 || 
        validationIssues.some(issue => issue.mealId === m.id && issue.severity === 'critical')
      );

      if (mealsToFix.length === 0) {
        toast.info("Não foram encontradas refeições críticas para corrigir.");
        return;
      }

      // Para simplificar e garantir equilíbrio, vamos regenerar o plano completo
      // mas preservando o que está bom se necessário. 
      // O usuário pediu: "Remove e recria as refeições que estão vazias ou com Ajuste Clínico Necessário"
      await handleGenerateFullPlan();
      toast.success('Refeições corrigidas com o motor NutriCore V2');
    } finally {
      setIsGeneratingGlobal(false);
    }
  };

  const handleMealGenerate = async (mealId: string) => {
    toast.info('Use a geração global ou o botão "Corrigir" para garantir o equilíbrio do NutriCore V2');
  };

  const executeSwap = (mealId: string, instanceId: string, target: Food & { suggestedQuantity?: number }, autoAdjust = false) => {
    const meal = meals.find(m => m.id === mealId);
    const currentItem = meal?.items.find(i => i.instanceId === instanceId);
    
    if (!currentItem) return;

    let newQuantity = 1;

    // Se temos uma quantidade sugerida pelo motor de substituição, usamos ela prioritariamente
    if (target.suggestedQuantity) {
      newQuantity = target.suggestedQuantity;
    } else if (autoAdjust) {
      const currentMacros = recalculateMacros(currentItem, currentItem.quantity);
      const targetKcalPerUnit = target.kcal || target.calories || 0; 
      
      if (targetKcalPerUnit > 0) {
        if (target.measurementType === 'gram' || target.measurementType === 'ml') {
          newQuantity = Math.round((currentMacros.calories / targetKcalPerUnit) * 100);
        } else {
          newQuantity = Math.round(currentMacros.calories / targetKcalPerUnit);
        }
      } else {
        newQuantity = currentItem.quantity;
      }
    } else {
      if (target.measurementType === 'gram') newQuantity = 100;
      else if (target.measurementType === 'ml') newQuantity = 200;
      else newQuantity = 1;
    }

    const safeQuantity = applyClinicalSafety(target.name, newQuantity);
    const macros = recalculateMacros(target, safeQuantity);

    updateMealItem(mealId, instanceId, {
      ...target,
      ...macros,
      kcal: macros.calories,
      calories: macros.calories,
      instanceId,
      quantity: safeQuantity
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

  // Bloqueio de Carregamento Crucial
  if (!dataReady || (patientId && !patientContext)) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-pulse",
          dbStatus.error ? "bg-rose-500/10" : "bg-emerald-500/10"
        )}>
          {dbStatus.error ? <CloudOff className="w-10 h-10 text-rose-500" /> : <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />}
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
          {dbStatus.error ? "Base de dados não encontrada" : patientId ? "Sincronizando Paciente" : "Carregando Base Clínica"}
        </h1>
        <p className="text-white/40 max-w-sm mb-8">
          {dbStatus.error || (patientId ? "Recuperando dados antropométricos e metas para precisão clínica." : "Sincronizando tabelas essenciais para garantir precisão clínica.") }
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
    <div className="min-h-screen bg-black flex flex-col font-sans selection:bg-emerald-500/30">
      <header className="bg-black/90 border-b border-white/5 py-4 px-6 backdrop-blur-xl sticky top-0 z-[60] shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/patients/${patientId || ''}`)}
              className="text-white/40 hover:text-white rounded-2xl hover:bg-white/5 border border-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black text-white tracking-tight">
                  {patientContext?.name || (patientId ? "Carregando..." : "Editor V3 Elite")}
                </h1>
                {patientContext && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-black uppercase tracking-tighter rounded-lg">
                    {patientContext.weight}kg · {patientContext.goal}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-white leading-none">{Math.round(totalMacros.kcal)} <span className="text-[10px] text-white/40 font-bold uppercase ml-0.5">kcal</span></span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex gap-4">
                      <span className="text-xs font-black text-emerald-400">{Math.round(totalMacros.protein)}g <span className="text-[8px] text-white/30 font-bold uppercase">Prot</span></span>
                      <span className="text-xs font-black text-blue-400">{Math.round(totalMacros.carbs)}g <span className="text-[8px] text-white/30 font-bold uppercase">Carb</span></span>
                      <span className="text-xs font-black text-amber-400">{Math.round(totalMacros.fat)}g <span className="text-[8px] text-white/30 font-bold uppercase">Gord</span></span>
                    </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-4 mr-6 pr-6 border-r border-white/5">
              {nutritionalScore && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Score Nutricional</span>
                    <span className={cn(
                      "text-lg font-black",
                      nutritionalScore.total >= 90 ? "text-emerald-500" : 
                      nutritionalScore.total >= 70 ? "text-amber-500" : "text-rose-500"
                    )}>{nutritionalScore.total}</span>
                  </div>
                  <div className="flex gap-1">
                    {[
                      { v: nutritionalScore.breakdown.calories, c: "bg-emerald-500" },
                      { v: nutritionalScore.breakdown.macros, c: "bg-blue-500" },
                      { v: nutritionalScore.breakdown.distribution, c: "bg-amber-500" },
                      { v: nutritionalScore.breakdown.quality, c: "bg-rose-500" }
                    ].map((b, i) => (
                      <div key={i} className="w-6 h-0.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={cn("h-full transition-all", b.c)} style={{ width: `${b.v}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateFullPlan} 
              disabled={isGeneratingGlobal}
              className="h-10 px-4 text-[10px] font-black uppercase tracking-wider border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded-xl transition-all gap-2"
            >
              {isGeneratingGlobal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Gerar Plano Completo
            </Button>

            <Button 
              size="sm" 
              onClick={handlePromotionRequest}
              disabled={promoting || !draftId}
              className="h-10 px-6 text-[10px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all gap-2 shadow-lg shadow-blue-500/20"
            >
              {promoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar e Publicar
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setShowResetConfirm(true)} className="h-10 w-10 text-white/20 hover:text-rose-400 rounded-xl">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 pb-32">

        <div className="lg:col-span-8 space-y-12">
          {(() => { if (process.env.NODE_ENV === 'development') console.log('[V3-UI] Rendering meals count:', meals.length); return null; })()}
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <Badge className="absolute top-4 left-4 bg-emerald-500 text-black font-black uppercase tracking-tighter text-[9px] border-0 cursor-help shadow-lg">
                          Imagem Personalizada
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 bg-black/90 border-white/10 backdrop-blur-xl p-4 rounded-2xl">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Histórico de Alterações</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {auditLog
                              .filter(log => log.mealId === meal.id)
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .map((log, i) => (
                                <div key={i} className="flex flex-col gap-1 border-l border-emerald-500/30 pl-3 py-1">
                                  <p className="text-[10px] text-white font-bold leading-tight">Imagem alterada manualmente</p>
                                  <p className="text-[8px] text-white/40 uppercase font-black">{new Date(log.created_at).toLocaleString()}</p>
                                </div>
                              ))}
                            {auditLog.filter(log => log.mealId === meal.id).length === 0 && (
                              <p className="text-[9px] text-white/20 italic">Nenhum registro encontrado</p>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
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
              {validationIssues.some(issue => issue.mealId === meal.id) && (
                <div className="flex items-center gap-1.5 mt-2 bg-amber-500/10 w-fit px-2 py-0.5 rounded-lg border border-amber-500/20 animate-in fade-in zoom-in duration-300">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] font-black text-amber-500 uppercase">Ajuste Clínico Necessário</span>
                </div>
              )}
            </div>
            <div className="grid gap-5">
              {meal.items.map((item) => (
                <Card key={item.instanceId} className="p-5 flex items-center justify-between border-0 border-l-[3px] bg-white/[0.03] hover:bg-white/[0.06] transition-all rounded-2xl cursor-pointer border-emerald-500/50" onClick={() => { console.log('[V3-UI] Item clicked:', item.name); setSelectedItem({ mealId: meal.id, item }); }}>
                  <div className="flex items-center gap-5">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-xl object-cover" />}
                    <div>
                      <p className="font-black text-[15px] tracking-tight text-white">{formatPortion(item)} {item.name}</p>
                      <p className="text-[11px] font-bold text-white/50">{Math.round(recalculateMacros(item, item.quantity).calories)} kcal</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeFood(meal.id, item.instanceId); }} className="h-10 w-10 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                </Card>
              ))}
            </div>
          </section>
          ))}
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <Card className="p-6 bg-black border-white/5 rounded-3xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-10 -mt-10" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" /> Diagnóstico do Plano
            </h3>

            {validationIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-xs font-bold text-white/60">Nenhum problema detectado.</p>
                <p className="text-[10px] text-white/30 uppercase mt-1">Plano nutricionalmente equilibrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {validationIssues.map((issue, i) => (
                  <div key={i} className={cn(
                    "p-4 rounded-2xl border flex gap-3 transition-all hover:translate-x-1",
                    issue.severity === 'critical' ? "bg-rose-500/5 border-rose-500/20" : "bg-amber-500/5 border-amber-500/20"
                  )}>
                    <div className="mt-0.5">
                      {issue.severity === 'critical' ? <XCircle className="w-4 h-4 text-rose-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-[11px] font-black leading-tight",
                        issue.severity === 'critical' ? "text-rose-400" : "text-amber-400"
                      )}>{issue.message}</p>
                      <button 
                        onClick={() => refinePlan(baseFoods)}
                        className="text-[9px] font-bold text-white/40 hover:text-white mt-2 flex items-center gap-1 uppercase tracking-tighter"
                      >
                        Corrigir com V3 <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {planId && (
            <Card className="p-6 bg-emerald-500/5 border-emerald-500/20 rounded-3xl">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Modo Paciente
              </h3>
              <p className="text-[10px] text-white/50 mb-4 uppercase leading-relaxed">
                Visualize como o paciente verá o plano ou compartilhe o link seguro.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => navigate(`/patient/plan/${planId}`)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[10px] uppercase rounded-xl h-10"
                >
                  <Eye className="w-3.5 h-3.5 mr-2" /> Visualizar
                </Button>
                <Button 
                  onClick={() => {
                    const token = storeSharingToken || draftSharingToken || (meals.length > 0 ? meals[0].id : null);
                    if (!token) {
                      toast.error("Salve o rascunho ou promova o plano para compartilhar.");
                      return;
                    }
                    navigator.clipboard.writeText(`${window.location.origin}/patient/view/${token}`);
                    toast.success("Link de compartilhamento copiado!");
                  }}
                  variant="outline"
                  className="border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400 font-black text-[10px] uppercase rounded-xl h-10"
                >
                  <Share2 className="w-3.5 h-3.5 mr-2" /> Link
                </Button>
              </div>
            </Card>
          )}


          <Card className="p-6 bg-black border-white/5 rounded-3xl">
             <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-500" /> Insights Clínicos
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Proteína Diária</span>
                    <span className="text-xs font-black text-emerald-400">{Math.round(totalMacros.protein)}g</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (totalMacros.protein / (goalMetadata.goalProtein || 150)) * 100)}%` }} />
                 </div>
              </div>
              <div className="flex flex-col gap-1.5">
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Carboidratos</span>
                    <span className="text-xs font-black text-blue-400">{Math.round(totalMacros.carbs)}g</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (totalMacros.carbs / (goalMetadata.goalCarbs || 300)) * 100)}%` }} />
                 </div>
              </div>
            </div>
          </Card>
        </aside>

        <div className="flex justify-center pb-24">
          <Button onClick={addMeal} className="h-16 px-10 rounded-3xl bg-emerald-500/5 hover:bg-emerald-500/10 border-2 border-dashed border-emerald-500/20 text-emerald-500 font-black gap-4 transition-all hover:scale-105">
            <Plus className="w-5 h-5" /> Adicionar Nova Refeição
          </Button>
        </div>
      </main>

      <Dialog open={showMainAddModal} onOpenChange={setShowMainAddModal}>
        <DialogContent className="sm:max-w-[95vw] max-w-full h-[90vh] p-0 overflow-hidden border border-white/10 bg-black/95 flex flex-col rounded-3xl backdrop-blur-3xl shadow-2xl">
          <DialogHeader className="p-8 pb-4">
            <div className="flex items-center justify-between w-full">
              <div>
                <DialogTitle className="flex items-center gap-3 text-white font-black uppercase tracking-tighter text-3xl italic">
                  {activeTab === 'food' && <Apple className="w-8 h-8 text-emerald-500" />}
                  {activeTab === 'marmita' && <Utensils className="w-8 h-8 text-blue-500" />}
                  {activeTab === 'template' && <Layers className="w-8 h-8 text-amber-500" />}
                  {activeTab === 'visual' && <ImageIcon className="w-8 h-8 text-rose-500" />}
                  {activeTab === 'food' ? 'Biblioteca de Alimentos' : activeTab === 'marmita' ? 'Minhas Marmitas' : activeTab === 'template' ? 'Templates de Refeição' : 'Biblioteca Visual'}
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

          <ScrollArea className="flex-1 px-8 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {activeTab === 'food' && (foodSearch.length > 0 ? foods : baseFoods).map((f) => (
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
                        {f.kcal > 0 && <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase border-0">{f.kcal} kcal</Badge>}
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

              {activeTab === 'visual' && (
                <>
                  {visualLibraryInfo.incomplete && (
                    <div className="col-span-full mb-4">
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-black text-amber-500 uppercase tracking-wider">Catálogo Incompleto</p>
                          <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-tight">Esta categoria possui poucas imagens. Recomendamos o upload de novas fotos para esta categoria.</p>
                        </div>
                        <Badge className="bg-amber-500 text-black text-[9px] font-black uppercase">Mínimo não atingido</Badge>
                      </div>
                    </div>
                  )}

                  {visualLibraryResults.length === 0 && !isSearchingVisualLibrary ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-white/10">
                      <ImageIcon className="w-16 h-16 mb-4 opacity-10" />
                      <p className="uppercase tracking-[0.2em] font-black text-xs">Nenhuma imagem disponível para esta categoria</p>
                    </div>
                  ) : (
                    visualLibraryResults.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          if (activeMealId) {
                            updateMealImage(activeMealId, v.imageUrl!, 'manual');
                            setShowMainAddModal(false);
                            toast.success(`Imagem da refeição atualizada!`);
                          }
                        }}
                        className="group relative flex flex-col items-start p-4 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left overflow-hidden h-full shadow-2xl"
                      >
                        <div className="w-full h-40 mb-4 rounded-2xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-emerald-500/20 transition-all relative">
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
                          <span className="font-black text-white group-hover:text-emerald-400 transition-colors line-clamp-2 text-sm uppercase tracking-tight">{(v as any).display_name || v.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 ml-2">
                          {v.category && (
                            <Badge className="bg-white/5 text-white/30 text-[8px] font-black uppercase border-0">
                              {visualLibraryCategories.find(c => c.id === v.category)?.label || v.category}
                            </Badge>
                          )}
                          {v.nutritionistId ? (
                             <Badge className="bg-emerald-500/10 text-emerald-500/50 text-[8px] font-black uppercase border-0">
                               Personalizada
                             </Badge>
                          ) : (
                             <Badge className="bg-white/5 text-white/20 text-[8px] font-black uppercase border-0">
                               Sistema
                             </Badge>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </>
              )}

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
      <Dialog open={showClinicalDecision} onOpenChange={setShowClinicalDecision}>
        <DialogContent className="max-w-2xl bg-[#000000] border-white/10 p-0 overflow-hidden rounded-3xl">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                    <AlertTriangle className="w-8 h-8 text-rose-500" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Decisão Clínica Necessária</h2>
                    <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest">O plano atual possui inconsistências críticas para este paciente.</p>
                 </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowClinicalDecision(false)} className="text-white/40 hover:text-white rounded-full">
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="space-y-6">
               <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Diagnóstico V3</p>
                    {confidence && (
                       <Badge className={cn(
                        "font-black uppercase text-[10px]",
                        confidence.level === 'high' ? "bg-emerald-500 text-black" :
                        confidence.level === 'medium' ? "bg-amber-500 text-black" : "bg-rose-500 text-white"
                      )}>
                        Confiança: {confidence.value}%
                      </Badge>
                    )}
                  </div>
      <Dialog open={showAnamnesisHandshake} onOpenChange={setShowAnamnesisHandshake}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Metas da Anamnese Disponíveis
            </DialogTitle>
            <DialogDescription>
              Detectamos uma anamnese recente para este paciente com metas calculadas. 
              Deseja carregar as metas de {pendingAnamnesisData?.kcal} kcal automaticamente no editor?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 py-4">
            <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
              <span className="text-xs font-medium">Kcal</span>
              <span className="text-lg font-bold">{pendingAnamnesisData?.kcal}</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
              <span className="text-xs font-medium">Prot</span>
              <span className="text-lg font-bold">{pendingAnamnesisData?.protein}g</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
              <span className="text-xs font-medium">Carb</span>
              <span className="text-lg font-bold">{pendingAnamnesisData?.carbs}g</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
              <span className="text-xs font-medium">Gord</span>
              <span className="text-lg font-bold">{pendingAnamnesisData?.fat}g</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnamnesisHandshake(false)}>Manter Atual</Button>
            <Button onClick={() => {
              if (pendingAnamnesisData && patientContext) {
                setPatientContext({
                  ...patientContext,
                  calories_target: pendingAnamnesisData.kcal,
                  protein_target: pendingAnamnesisData.protein,
                  carbs_target: pendingAnamnesisData.carbs,
                  fat_target: pendingAnamnesisData.fat
                });
                toast.success('Metas da anamnese aplicadas!');
              }
              setShowAnamnesisHandshake(false);
            }}>Usar Metas</Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>

                  <div className="space-y-3">
                    {validationIssues.filter(i => i.severity === 'critical').map((issue, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-white/80 font-bold">{issue.message}</p>
                      </div>
                    ))}
                    {validationIssues.filter(i => i.severity === 'attention').map((issue, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-white/80 font-bold">{issue.message}</p>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowClinicalDecision(false);
                      setShowRefineOptions(true);
                    }}
                    className="h-14 border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10 font-black uppercase tracking-widest text-xs rounded-2xl gap-3"
                  >
                    <Sparkles className="w-5 h-5" /> Corrigir Automaticamente
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowClinicalDecision(false)}
                    className="h-14 border-white/5 bg-white/5 text-white/60 hover:bg-white/10 font-black uppercase tracking-widest text-xs rounded-2xl gap-3"
                  >
                    <Edit3 className="w-5 h-5" /> Revisar Manualmente
                  </Button>
               </div>
            </div>
          </div>
          
          <div className="bg-white/5 p-6 flex flex-col gap-4 border-t border-white/10">
             {lastBlockedReason && (
               <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase">
                  <XCircle className="w-3 h-3" />
                  Última tentativa bloqueada: {lastBlockedReason}
               </div>
             )}
             <div className="flex items-center justify-between">
               <p className="text-[10px] text-white/20 font-black uppercase tracking-tighter max-w-[200px]">
                 Forçar o salvamento pode comprometer a estratégia nutricional do paciente.
               </p>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    if (patientContext && !patientContext.consent_given) {
                      toast.error('BLOQUEIO LGPD: Sem consentimento, o salvamento não pode ser forçado.');
                      return;
                    }
                    setShowClinicalDecision(false);
                    handleConfirmPromotion();
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-rose-500 transition-colors"
                >
                  Forçar Salvamento (Com Confirmação)
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showClinicalHistory} onOpenChange={setShowClinicalHistory}>
        <DialogContent className="max-w-2xl bg-[#000000] border-white/10 p-0 overflow-hidden rounded-3xl">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <History className="w-8 h-8 text-emerald-500" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Histórico Clínico</h2>
                    <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest">Audit Trail das decisões tomadas para este rascunho.</p>
                 </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowClinicalHistory(false)} className="text-white/40 hover:text-white rounded-full">
                <X className="w-6 h-6" />
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {auditLog.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-white/10">
                    <History className="w-12 h-12 mb-4 opacity-10" />
                    <p className="uppercase tracking-widest font-black text-[10px]">Nenhum registro encontrado</p>
                  </div>
                ) : (
                  auditLog.slice().reverse().map((log, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 transition-all">
                       <div className="pt-1">
                          {log.source === 'engine' ? <Sparkles className="w-4 h-4 text-blue-400" /> : 
                           log.source === 'system' ? <Lock className="w-4 h-4 text-rose-500" /> : 
                           <User className="w-4 h-4 text-emerald-500" />}
                       </div>
                       <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                             <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                {log.type === 'save_blocked' ? 'Bloqueio de Salvamento' : 
                                 log.type === 'engine_action' ? 'Ação da Engine' : 
                                 log.type === 'image_change' ? 'Visual Update' : 'Interação Manual'}
                             </p>
                             <span className="text-[9px] text-white/20 font-bold">{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs text-white/80 font-bold">{log.description}</p>
                          {log.metadata?.issues && (
                            <div className="mt-2 flex flex-wrap gap-2">
                               {log.metadata.issues.map((issue: string, i: number) => (
                                 <Badge key={i} variant="outline" className="text-[8px] border-rose-500/20 bg-rose-500/5 text-rose-400">{issue}</Badge>
                               ))}
                            </div>
                          )}
                       </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRefineOptions} onOpenChange={setShowRefineOptions}>
        <DialogContent className="max-w-md bg-[#000000] border-white/10 p-0 overflow-hidden rounded-3xl">
          <div className="p-8 text-center relative">
            <Button variant="ghost" size="icon" onClick={() => setShowRefineOptions(false)} className="absolute top-4 right-4 text-white/40 hover:text-white rounded-full">
              <X className="w-6 h-6" />
            </Button>
            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mx-auto mb-6">
               <Sparkles className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Refinar Estratégia</h2>
            <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-8">Como você deseja que a engine corrija o plano?</p>

            <div className="grid gap-4">
              <button 
                onClick={() => {
                  refinePlan(baseFoods, 'light');
                  setShowRefineOptions(false);
                }}
                className="group flex flex-col items-start p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left"
              >
                 <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Correção Leve</span>
                 <p className="text-xs text-white font-black group-hover:text-emerald-400">Apenas ajusta quantidades dos itens existentes.</p>
              </button>

              <button 
                onClick={() => {
                  refinePlan(baseFoods, 'moderate');
                  setShowRefineOptions(false);
                }}
                className="group flex flex-col items-start p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left"
              >
                 <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Correção Moderada (Recomendada)</span>
                 <p className="text-xs text-white font-black group-hover:text-blue-400">Substitui alimentos e adiciona itens similares.</p>
              </button>

              <button 
                onClick={() => {
                  refinePlan(baseFoods, 'aggressive');
                  setShowRefineOptions(false);
                }}
                className="group flex flex-col items-start p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all text-left"
              >
                 <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Correção Completa</span>
                 <p className="text-xs text-white font-black group-hover:text-rose-400">Reestrutura refeições críticas do zero.</p>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedItem} onOpenChange={(v) => !v && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl bg-[#000000] border-white/10 p-0 overflow-hidden rounded-3xl">
          {selectedItem && (
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    {selectedItem.item.imageUrl ? (
                      <img src={selectedItem.item.imageUrl} alt={selectedItem.item.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Apple className="w-8 h-8 text-emerald-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{selectedItem.item.name}</h2>
                    <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest">Ajuste de Porção e Substituições Inteligentes</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)} className="text-white/40 hover:text-white rounded-full">
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <Label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 block">Quantidade</Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        type="number" 
                        value={selectedItem.item.quantity} 
                        onChange={(e) => updateFoodQuantity(selectedItem.mealId, selectedItem.item.instanceId, Number(e.target.value))}
                        className="h-14 bg-white/5 border-white/10 text-white rounded-xl text-xl font-black focus:border-emerald-500/50"
                      />
                      <span className="text-lg font-black text-white/60 uppercase">{selectedItem.item.portionUnitLabel}</span>
                    </div>
                    <div className="mt-4 flex gap-4">
                      <div className="flex-1 text-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[8px] font-black text-white/30 uppercase">Calorias</p>
                        <p className="text-sm font-black text-white">{Math.round(recalculateMacros(selectedItem.item, selectedItem.item.quantity).calories)} kcal</p>
                      </div>
                      <div className="flex-1 text-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[8px] font-black text-white/30 uppercase">Proteína</p>
                        <p className="text-sm font-black text-emerald-400">{Math.round(recalculateMacros(selectedItem.item, selectedItem.item.quantity).protein)}g</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <Label className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 block">Substituições Recomendadas</Label>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      {isLoadingSmartSubs ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
                      ) : smartSubstitutions.map((sub) => (
                        <button 
                          key={sub.id}
                          onClick={() => handleRequestSwap(selectedItem.mealId, selectedItem.item, sub)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left group"
                        >
                          <span className="text-xs font-bold text-white group-hover:text-blue-400">
                            {sub.name} { (sub as any).suggestedQuantity ? `(${(sub as any).suggestedQuantity}g)` : ''}
                          </span>
                          <span className="text-[9px] font-black text-white/30 uppercase">{sub.kcal} kcal</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <Input 
                        placeholder="Buscar outra substituição..." 
                        value={substitutionSearch}
                        onChange={(e) => setSubstitutionSearch(e.target.value)}
                        className="bg-white/5 border-white/10 h-11 rounded-xl pl-10 text-sm focus:border-emerald-500/50"
                      />
                   </div>
                   
                   <ScrollArea className="h-[350px] pr-2">
                      <div className="grid gap-2">
                        {(substitutionSearch.length > 0 ? substitutionResults : []).map((res) => (
                          <button 
                            key={res.id}
                            onClick={() => handleRequestSwap(selectedItem.mealId, selectedItem.item, res)}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all text-left"
                          >
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                               {res.imageUrl ? <img src={res.imageUrl} className="w-full h-full object-cover rounded-lg" /> : <Apple className="w-5 h-5 text-white/20" />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-xs font-bold text-white truncate">{res.name}</p>
                               <p className="text-[9px] font-black text-white/30 uppercase">{res.kcal} kcal / 100g</p>
                            </div>
                            <Plus className="w-4 h-4 text-emerald-500/40" />
                          </button>
                        ))}
                      </div>
                   </ScrollArea>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditorV3Page;
