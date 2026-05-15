console.log('[V3-READY] Editor Page Initialized');
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { isFeatureEnabled } from '../../security/services/featureFlags';
import { useEditorState } from '../hooks/useEditorState';
import { useDraftSync } from '../hooks/useDraftSync';
import { promoteDraftToMealPlan } from '../services/promoteDraft';
import { loadOrCreateDraft, saveDraft } from '../services/draftService';
import { validatePlanBeforePublish } from '@/lib/planSafetyNet';
import { 
  searchFoods, searchMarmitas, searchTemplates, 
  getBaseFoods, seedBaseData,
  searchVisualLibrary, uploadVisualLibraryImage, searchPlanTemplates
} from '../utils/dataFetcher';
import { getBestMealImage } from '../utils/normalization';
import { logClinicalEvent } from '../../audit/services/auditLogger';
import { 
  calculateNutritionalScore, validatePlanClinically 
} from '../../clinical-engine';
import { 
  calculateItemMacros 
} from '@/lib/nutricore_v2/helpers';


// Direct NutriCore V3 Imports (lib/nutricore_v2)
// Direct NutriCore V3 Imports are now handled via Adapter or direct types
import { getSubstitutions } from "@/lib/nutricore_v2/substitutions";
import { BASE_FOODS } from "@/lib/nutricore_v2/food-database";
import { convertGramsToHousehold } from "@/lib/nutricore_v2/unit-converter";
import { formatDisplayPortion, resolveDisplayGrams } from "@/lib/nutricore_v2/portion-display";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Zap, Activity, PieChart, Minus, Users, Search, LayoutDashboard, Target, ShieldCheck,
  User, Edit3, List, BookOpen, RefreshCw, X, History, Maximize2, ChevronDown, RefreshCcw, ArrowRight, Image as ImageIcon, Eye, Share2, FileDown, Settings2, ChevronRight, MessageSquare, BookCopy, Library, Soup, Coffee, UtensilsCrossed, Moon, Sun, ShoppingCart
} from 'lucide-react';
import { safeGeneratePDF } from '../services/pdfService';
import { type PremiumMealPlanPDFData, buildPremiumMealPlanHTML } from '@/lib/pdfExportPremium';
import { generateV3PlainText } from '../services/plainTextService';
import { buildWhatsAppUrl } from "@/utils/whatsappNotification";

import PlanAdjustmentModal from './PlanAdjustmentModal';
import TemplateEditorModal from './TemplateEditorModal';
import { TemplateV3Modal } from './TemplateV3Modal';
import { ControlledDeliveryModal } from './ControlledDeliveryModal';
import { DraftV3PreviewModal } from './DraftV3PreviewModal';
import { searchV3LibraryItems, getV3Templates } from '../utils/v3DataFetcher';
import { V3DietTemplate } from '../types/types';
import { V3TemplateEngine } from '../services/v3TemplateEngine';
import { calculateHumanMealScore } from '@/lib/clinicalHumanEngine';



import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PRODUCTION_URL } from '@/lib/config';
import { copyToClipboard } from '@/utils/clipboard';
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
  { label: 'Unid. P', unit: 'Unid. P', type: 'unit' as const },
  { label: 'Unid. M', unit: 'Unid. M', type: 'unit' as const },
  { label: 'Unid. G', unit: 'Unid. G', type: 'unit' as const },
];

const formatPortion = (item: MealItem) => {
  return formatDisplayPortion(item);
};

const EditorV3Page = () => {
  const { user } = useAuth();
  const { patientId, planId: urlPlanId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialPlanId = urlPlanId || searchParams.get('planId');
  const [resolvedPlanId, setResolvedPlanId] = useState<string | null>(initialPlanId || null);
  const isSandbox = !patientId && !initialPlanId;

  const {
    meals, auditLog, setPatientId, hydrateMeals, sharingToken: storeSharingToken,
    addMarmitaToMeal, addFoodToMeal, applyTemplateToMeal,
    removeFood, updateFoodQuantity, updateMealItem, savePlan, planStatus,
    resetEditor, addMeal, removeMeal, updateMealHeader, addMealWithHeader,
    duplicateMeal, reorderMeal, updateMealImage, setMeals,
    nutritionalScore, validationIssues, goalMetadata, setGoalMetadata,
    patientContext, setPatientContext, confidence, lastBlockedReason, addAuditEntry,
    initialMeals: initialMealsInStore, viewMode, setViewMode, clinicalMode
  } = useEditorState();



  if (!clinicalMode) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4 p-8 text-center bg-neutral-950 text-white">
        <div className="p-4 bg-yellow-500/10 rounded-full">
          <AlertTriangle className="w-12 h-12 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold uppercase tracking-tighter italic">Módulo em Blindagem</h2>
        <p className="text-white/40 max-w-md uppercase font-black text-[10px] tracking-widest">O Editor Elite está temporariamente em modo de segurança para garantir a estabilidade do sistema.</p>
        <Button onClick={() => navigate(patientId ? `/patients/${patientId}` : '/dashboard')} variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 uppercase font-black text-[10px] tracking-widest">
          {patientId ? 'Voltar ao Perfil' : 'Voltar ao Dashboard'}
        </Button>
      </div>
    );
  }


  const {
    draftId, syncState, initialMeals, initialAuditLog, lastSavedAt, sharingToken: draftSharingToken,
    scheduleSave, resetDraft, reloadFromServer, revertToLastSaved
  } = useDraftSync(patientId ?? null, initialMealsInStore, initialMealsInStore, resolvedPlanId);

  const hydratedRef = useRef(false);
  const [promoting, setPromoting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [warningsConfirmed, setWarningsConfirmed] = useState(false);
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
  const [showV3TemplateModal, setShowV3TemplateModal] = useState(false);
  const [v3Templates, setV3Templates] = useState<V3DietTemplate[]>([]);
  const [selectedV3Template, setSelectedV3Template] = useState<V3DietTemplate | null>(null);
  const [v3LibraryItems, setV3LibraryItems] = useState<any[]>([]);
  const [isSearchingV3Library, setIsSearchingV3Library] = useState(false);
  const [v3LibrarySearch, setV3LibrarySearch] = useState('');
  const [v3LibraryTab, setV3LibraryTab] = useState<'foods' | 'ready' | 'templates'>('foods');
  const [v3LibraryMealFilter, setV3LibraryMealFilter] = useState<string | null>(null);
  const [showV3DraftPreview, setShowV3DraftPreview] = useState(false);
  const [v3DraftMeals, setV3DraftMeals] = useState<Meal[]>([]);

  const [selectedDietType, setSelectedDietType] = useState<string | null>(null);
  const [replaceExistingFlag, setReplaceExistingFlag] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  
  const [debugMode, setDebugMode] = useState(false);
  const [showControlledDelivery, setShowControlledDelivery] = useState(false);
  const [isEditingAntro, setIsEditingAntro] = useState(false);
  const [editAntroValues, setEditAntroValues] = useState({ weight: 0, height: 0, goal: 'Manutenção' });
  const [isSavingAntro, setIsSavingAntro] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  
  const [selectedItemState, setSelectedItemState] = useState<{ mealId: string, instanceId: string } | null>(null);
  const [localDraft, setLocalDraft] = useState<MealItem | null>(null);
  const [isModalDirty, setIsModalDirty] = useState(false);
  
  // 🛡️ SYNC SOBERANO: Sincronizar localDraft com alterações globais (ex: Ajustar Plano)
  // Se o plano global mudar enquanto o modal está aberto, atualizamos o draft 
  // exceto se o usuário já tiver editado manualmente (dirty)
  useEffect(() => {
    if (selectedItemState && !isModalDirty) {
      const meal = meals.find(m => m.id === selectedItemState.mealId);
      const item = meal?.items.find(i => i.instanceId === selectedItemState.instanceId);
      if (item && JSON.stringify(item) !== JSON.stringify(localDraft)) {
        setLocalDraft(JSON.parse(JSON.stringify(item)));
      }
    }
  }, [meals, selectedItemState, isModalDirty, localDraft]);

  const selectedItem = useMemo(() => {
    if (!selectedItemState) return null;
    const meal = meals.find(m => m.id === selectedItemState.mealId);
    if (!meal) return null;
    const item = meal.items.find(i => i.instanceId === selectedItemState.instanceId);
    if (!item) return null;
    return { mealId: selectedItemState.mealId, item };
  }, [selectedItemState, meals]);

  const handleOpenModal = (data: { mealId: string, item: MealItem }) => {
    setSelectedItemState({ mealId: data.mealId, instanceId: data.item.instanceId });
    setLocalDraft(JSON.parse(JSON.stringify(data.item)));
    setIsModalDirty(false);
  };

  const handleCloseModal = () => {
    setSelectedItemState(null);
    setLocalDraft(null);
    setIsModalDirty(false);
  };

  const handleCommitModal = async () => {
    if (localDraft && selectedItemState) {
      await updateMealItem(selectedItemState.mealId, selectedItemState.instanceId, localDraft);
      toast.success('Alterações salvas com sucesso!');
      handleCloseModal();
    }
  };

  const updateLocalDraft = (updates: Partial<MealItem>) => {
    setLocalDraft(prev => {
      if (!prev) return null;
      setIsModalDirty(true);
      
      // Sincronização de massa clínica para preview real-time (Decimais permitidos)
      const sanitizedUpdates = { ...updates };
      const merged = { ...prev, ...sanitizedUpdates, manual_override: true };
      
      if (sanitizedUpdates.quantity !== undefined || sanitizedUpdates.measurementType !== undefined || sanitizedUpdates.portionValue !== undefined) {
        const pValue = Number(merged.portionValue) || 1;
        merged.clinical_mass_g = (merged.measurementType === 'gram' || merged.measurementType === 'ml')
          ? Number(merged.quantity)
          : Number(merged.quantity) * pValue;
      }
      
      return merged;
    });
  };

  const setSelectedItem = (data: { mealId: string, item: MealItem } | null) => {
    if (!data) {
      handleCloseModal();
    } else {
      handleOpenModal(data);
    }
  };

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
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);




  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [showMainAddModal, setShowMainAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'food' | 'marmita' | 'template' | 'visual'>('food');
  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const [newMealName, setNewMealName] = useState('');
  const [newMealTime, setNewMealTime] = useState('00:00');

  // Helper functions for modal management
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
  const [planTemplates, setPlanTemplates] = useState<any[]>([]);
  const [visualLibraryResults, setVisualLibraryResults] = useState<Food[]>([]);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MealTemplate | null>(null);
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
        console.debug('[V3-Init] Loading clinical data for patientId from URL:', patientId);
        
        // 1. Load Patient Profile (SINGLE SOURCE OF TRUTH)
        // We look up by both profile.id and user_id to ensure consistency
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .or(`id.eq.${patientId},user_id.eq.${patientId}`)
          .maybeSingle();

        if (!profile) {
          console.warn('[V3-Init] Profile not found for ID:', patientId);
          return;
        }

        // Clinical tables use the auth user id as patient_id/user_id.
        // profiles.id is only the row id and must not be used to load assessments.
        const canonicalPatientId = profile.user_id || profile.id;

        // 🛡️ RECOVERY SOVEREIGNTY: Se não temos um planId na URL, tentamos recuperar o plano ATIVO do paciente.
        // Isso evita que o Editor abra vazio para pacientes que já possuem plano.
        let activePlanId = resolvedPlanId;
        if (!activePlanId && canonicalPatientId) {
          const { data: activePlan } = await supabase
            .from('meal_plans')
            .select('id')
            .eq('patient_id', canonicalPatientId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (activePlan) {
            console.info(`[V3-Init] Recovered active plan ${activePlan.id} for patient ${canonicalPatientId}`);
            activePlanId = activePlan.id;
            setResolvedPlanId(activePlan.id);
          }
        }

        // Verify if we are currently using a different ID in the store (stale state)
        // If the current patientId in store is different from the canonical one from URL, 
        // it means we switched patients but the global store still has the old one.
        // We MUST prioritize the URL ID as the intent of the user.
        
        console.info(`[V3-Init] Canonical profile found: ${profile.full_name} (${canonicalPatientId}). Active Plan: ${activePlanId}`);

        // 2. Load Physical Assessment (Fallback 1)
        const { data: assessment } = await supabase
          .from('physical_assessments')
          .select('*')
          .eq('patient_id', canonicalPatientId)
          .order('assessment_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // 2.5 Load Weight History (Check-ins)
        const { data: weightHistory } = await supabase
          .from('patient_weight_history')
          .select('weight')
          .eq('patient_id', canonicalPatientId)
          .order('measurement_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // 3. Load Anamnesis (Fallback 2)
        const { data: anamnesis } = await supabase
          .from('patient_anamnesis')
          .select('*')
          .eq('user_id', canonicalPatientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const profileAny = profile as any;
        
        // 🧪 Motor de Priorização Antropométrica (Regra de Ouro)
        // 1. Profile (Source of Truth)
        // 2. Histórico de Peso (Check-ins/Feedbacks)
        // 3. Avaliação Física (Measured)
        // 4. Anamnese (Self-reported)
        // 5. Fallback 70kg (Safety)
        
        let weight = Number(profileAny.current_weight_kg || 0);
        let weightSource = 'profile';

        if (weight <= 0) {
          if (weightHistory?.weight) {
            weight = Number(weightHistory.weight);
            weightSource = 'weight_history';
          } else if (assessment?.weight) {
            weight = Number(assessment.weight);
            weightSource = 'assessment';
          } else if ((anamnesis?.answers as any)?.weight) {
            weight = Number((anamnesis?.answers as any)?.weight);
            weightSource = 'anamnesis';
          } else {
            weight = 60; // Safe dynamic fallback, NOT 70.
            weightSource = 'dynamic_fallback';
          }
        }

        console.info(`[V3-Init] Initial weight (${weight}kg) used. Source: ${weightSource}`);

        let height = Number(profileAny.current_height_cm || 0);
        // Similar para altura
        if (height <= 0 || height === 170) {
          const anamnesisHeight = Number((anamnesis?.answers as any)?.height || 0);
          const assessmentHeight = Number(assessment?.height || 0);
          if (anamnesisHeight > 0 && anamnesisHeight !== 170) height = anamnesisHeight;
          else if (assessmentHeight > 0 && assessmentHeight !== 170) height = assessmentHeight;
          else if (height === 0) height = 170;
        }

        const age = profileAny.age || (anamnesis?.answers as any)?.age || (assessment as any)?.age || 30;
        const sex = profileAny.gender || (anamnesis?.answers as any)?.gender || (assessment as any)?.gender || 'female';
        const activity = profileAny.activity_level || (assessment?.activity_factor ? String(assessment.activity_factor) : null) || (anamnesis?.answers as any)?.activity_level || 'moderado';
        const goal = profileAny.goal || (anamnesis?.answers as any)?.objective || 'Manutenção';
        
        // Metas nutricionais (Priorizando o que o Nutri definiu na avaliação ou o que foi calculado na anamnese)
        const kcal = assessment?.calories_target || anamnesis?.computed_kcal_target || 2000;
        const protein = assessment?.protein_target || anamnesis?.computed_protein || 120;
        const carbs = assessment?.carbs_target || anamnesis?.computed_carbs || 200;
        const fat = assessment?.fat_target || anamnesis?.computed_fat || 50;

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
          weight_source: weightSource,
        };

        if (weightSource === 'fallback') {
          toast.warning("Peso não encontrado, usando valor estimado de 70kg", {
            description: "Atualize os dados do paciente para maior precisão.",
            duration: 5000
          });
        } else if (weightSource !== 'profile') {
          console.info(`[V3-Init] Peso carregado via ${weightSource}: ${weight}kg`);
        }

        console.info(`[V3-Context] Assigning context for ${profile.full_name}: ${weight}kg via ${weightSource}`);
        
        // 🛡️ Blindagem de Urgência: Forçar metas da anamnese/avaliação para o Editor
        const currentState = useEditorState.getState();
        if (currentState.patientId !== canonicalPatientId) {
          setPatientId(canonicalPatientId);
        }

        // 🛡️ Blindagem de Urgência: Forçar metas da anamnese/avaliação para o Editor
        setGoalMetadata({
          goalCalories: Number(kcal),
          goalProtein: Number(protein),
          goalCarbs: Number(carbs),
          goalFat: Number(fat),
          goal: goal,
          restrictions: profileAny.restrictions || (anamnesis?.answers as any)?.restrictions || [],
          preferences: profileAny.preferences || (anamnesis?.answers as any)?.preferences || []
        });
        setPatientContext(context);
        
        // Auto-select first meal if none is active
        if (meals.length > 0 && !activeMealId) {
          setActiveMealId(meals[0].id);
        }

        // Handshake: Se a anamnese for recente (últimas 24h) e o plano estiver vazio, sugerir uso das metas
        if (anamnesis) {
          const anamnesisDate = new Date(anamnesis.created_at);
          const isRecent = (Date.now() - anamnesisDate.getTime()) < 24 * 60 * 60 * 1000;
          
          const isPlanEmpty = meals.length <= 1 && (meals[0]?.items.length === 0);
          
          if (isRecent && isPlanEmpty && !resolvedPlanId) {
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
      console.info('[v3-init] initializing session for patient:', patientId);
    }
  }, [patientId]);

  useEffect(() => {
    if (meals.length > 0 && !activeMealId) {
      setActiveMealId(meals[0].id);
    }
  }, [meals, activeMealId]);

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

  // V3 Library Search Effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (v3LibraryTab === 'foods' || v3LibraryTab === 'ready') {
        setIsSearchingV3Library(true);
        const results = await searchV3LibraryItems(
          v3LibrarySearch, 
          v3LibraryTab === 'ready' ? 'ready_meal' : undefined,
          v3LibraryMealFilter || undefined
        );
        setV3LibraryItems(results);
        setIsSearchingV3Library(false);
      } else if (v3LibraryTab === 'templates') {
        setIsSearchingV3Library(true);
        const templates = await getV3Templates();
        setV3Templates(templates);
        setIsSearchingV3Library(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [v3LibrarySearch, v3LibraryTab, v3LibraryMealFilter]);

  const handleApplyV3Profile = async (kcal: number, isWeekly: boolean = false) => {
    if (!selectedV3Template) {
      toast.error('Selecione um template antes de continuar.');
      return;
    }

    setIsGeneratingGlobal(true);
    try {
      const modeText = isWeekly ? 'Semanal' : 'Diário';
      toast.loading(`Aplicando Template ${selectedV3Template.title} ${modeText} (${kcal} kcal)...`, { id: 'v3-gen' });
      
      const v3Meals = await V3TemplateEngine.plotTemplate(
        selectedV3Template.slug,
        kcal,
        { isWeekly }
      );

      if (v3Meals && v3Meals.length > 0) {
        setV3DraftMeals(v3Meals);
        setShowV3DraftPreview(true);
        toast.success(`Template carregado com sucesso!`, { id: 'v3-gen' });
      }
    } catch (err: any) {
      console.error('[V3-UI] Error plotting template:', err);
      toast.error(`Erro ao carregar template: ${err.message}`, { id: 'v3-gen' });
    } finally {
      setIsGeneratingGlobal(false);
    }
  };

  const handleApproveDraft = (approvedMeals: Meal[]) => {
    setMeals(approvedMeals);
    toast.success(`Plano V3 Soberano aplicado com sucesso!`);
    setShowV3DraftPreview(false);
  };

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

        // V3 Logic: Use Direct NutriCore V3 Substitutions if possible
        const currentFood = BASE_FOODS.find(f => f.id === selectedItem.item.id) || 
                          BASE_FOODS.find(f => f.name.toLowerCase() === name.toLowerCase());
                          
        if (currentFood) {
          console.log('[V3-Subs] Using NutriCore V3 Substitution Engine for:', name);
          
          // 🛡️ Contrato único: substituição recebe gramas reais, corrigindo qualquer quantidade visual corrompida
          const itemTotalGrams = resolveDisplayGrams(selectedItem.item);

          const meal = meals.find(m => m.id === selectedItem.mealId);
          const v3PlanSubs = getSubstitutions(
            currentFood, 
            BASE_FOODS, 
            itemTotalGrams,
            patientContext?.restrictions || [],
            meal?.name
          );

          const v3Subs = v3PlanSubs.map(s => {
            const ratio = s.grams / 100;
            // 🛡️ Usar calculateItemMacros em vez de cálculo manual para garantir sanitização
            const computedMacros = calculateItemMacros({
              ...s.food,
              clinical_mass_g: s.grams
            }, s.grams);

            return {
              ...s.food,
              kcal: computedMacros.kcal,
              calories: computedMacros.kcal,
              protein: computedMacros.protein,
              carbs: computedMacros.carbs,
              fat: computedMacros.fat,
              portionValue: s.grams,
              portionLabel: s.unit_label,
              measurementType: 'gram' as const,
              suggestedQuantity: s.grams 
            };
          });
          
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
  }, [selectedItem, selectedItem?.item.quantity, selectedItem?.item.instanceId, patientContext]);

  useEffect(() => {
    const loadAllData = async () => {
      if (!user?.id) return;
      
      const startTime = performance.now();
      try {
        const [marmitasData, templatesData, baseData, planTemplatesData] = await Promise.all([
          searchMarmitas(user.id),
          searchTemplates(),
          getBaseFoods(),
          searchPlanTemplates()
        ]);

        setMarmitas(marmitasData);
        setTemplates(templatesData);
        setBaseFoods(baseData);
        setPlanTemplates(planTemplatesData);
        
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
    const totals = meals.reduce((acc, meal) => {
      meal.items.forEach(item => {
        const macros = calculateItemMacros(item, item.quantity);
        acc.kcal += macros.kcal;
        acc.protein += macros.protein;
        acc.carbs += macros.carbs;
        acc.fat += macros.fat;
      });
      return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

    // 🛡️ CORREÇÃO MOTOR: Garantir que macros mostrem a média diária ou o dia atual
    // No V3, se tivermos um plano semanal, as refeições têm o dia no nome ou metadata
    const isWeekly = viewMode === 'weekly' || meals.length > 10;
    const divisor = isWeekly ? 7 : 1;

    return {
      kcal: totals.kcal / divisor,
      protein: totals.protein / divisor,
      carbs: totals.carbs / divisor,
      fat: totals.fat / divisor
    };
  }, [meals, viewMode]);

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
      // Reset warnings confirmation if meals changed
      setWarningsConfirmed(false);
    }
  }, [meals, auditLog, draftId, scheduleSave]);

  const handlePromotionRequest = () => {
    // Sistema de Decisão Clínica (Pré-Salvamento) - DESATIVADO POR SOLICITAÇÃO DO USUÁRIO
    // O Nutricionista agora tem liberdade total para salvar mesmo com inconsistências clínicas.
    handleConfirmPromotion();
  };

  const handleConfirmPromotion = async () => {
    if (isSandbox) {
      toast.info("No modo Sandbox, as alterações são salvas apenas localmente no seu navegador.");
      setShowValidation(false);
      return;
    }

    // 🛡️ Safety Net - Verificações Obrigatórias
    const safetyNet = validatePlanBeforePublish({
      meals,
      patientContext,
      totalMacros,
      isWeeklyMode: viewMode === 'weekly'
    });

    if (safetyNet.errors.length > 0) {
      safetyNet.errors.forEach(err => toast.error(err));
      return;
    }

    if (safetyNet.warnings.length > 0) {
      safetyNet.warnings.forEach(warn => toast.warning(warn, { duration: 5000 }));
    }


    if (!validation.isValid) {
      toast.error("Corrija os erros antes de salvar.");
      return;
    }

    // BLOQUEIO LGPD removido para profissionais conforme ultimato
    // Profissionais devem poder trabalhar mesmo se o paciente não deu consentimento ainda.
    /*
    if (patientContext && !patientContext.consent_given) {
      toast.error('BLOQUEIO LGPD: É necessário consentimento do paciente para salvar e promover este plano.');
      setShowValidation(true);
      return;
    }
    */

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
  const handleControlledDelivery = async (targetPatientId: string) => {
    setIsGeneratingGlobal(true);
    try {
      toast.loading(`Entregando plano V3 para o paciente...`, { id: 'v3-delivery' });
      
      // 1. Garantir que temos um draft atualizado para o contexto do paciente
      const freshDraft = await loadOrCreateDraft(targetPatientId, meals);
      if (!freshDraft) {
        throw new Error('Falha ao sincronizar draft para o novo paciente.');
      }

      // 2. Promover com a flag de delivery controlado
      const result = await promoteDraftToMealPlan(
        { ...freshDraft, payload: { meals, version: 1, patient_context: patientContext, nutritional_score: nutritionalScore, confidence: confidence } },
        { v3_sandbox_delivery: true }
      );

      if (result.ok) {
        toast.success('Plano V3 entregue com sucesso sob governança controlada!', { id: 'v3-delivery' });
        
        // 🛡️ GOVERNANÇA CLÍNICA SOBERANA: Log de Auditoria Formal
        await logClinicalEvent({
          type: 'audit_log',
          action: 'CONTROLLED_DELIVERY',
          resource: 'editor-v3',
          patient_id: targetPatientId,
          severity: 'info',
          details: {
            v3_sandbox_delivery: true,
            kcal_target: totalMacros.kcal,
            template_slug: selectedV3Template?.slug || 'none',
            delivery_mode: 'controlled_clinical_delivery',
            timestamp: new Date().toISOString()
          }
        });

        addAuditEntry({
          type: 'system_action',
          description: `CONTROLLED_DELIVERY: Plano V3 entregue para ${targetPatientId}`,
          source: 'system',
          metadata: { targetPatientId, kcal: totalMacros.kcal, version: 'v3_soberano' }
        });

        navigate(`/patients/${targetPatientId}`);
      } else {
        throw new Error(result.error || 'Erro desconhecido na promoção.');
      }
    } catch (err: any) {
      console.error('[V3-ControlledDelivery] Error:', err);
      toast.error(`Falha na entrega: ${err.message}`, { id: 'v3-delivery' });
    } finally {
      setIsGeneratingGlobal(false);
    }
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
    // 🚀 NOVA FILOSOFIA V3: O "Gerar Tudo" agora prioriza a Biblioteca de Templates Premium
    setV3LibraryTab('templates');
    setShowMainAddModal(true);
    toast.info('Selecione um Template Premium da biblioteca para começar.');
  };

  const handleSaveAntro = async () => {
    if (!patientId || !patientContext) return;
    
    setIsSavingAntro(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          current_weight_kg: editAntroValues.weight,
          current_height_cm: editAntroValues.height,
          goal: editAntroValues.goal
        })
        .eq('id', patientContext.id);

      if (error) throw error;

      setPatientContext({
        ...patientContext,
        weight: editAntroValues.weight,
        height: editAntroValues.height,
        goal: editAntroValues.goal
      });
      
      setIsEditingAntro(false);
      toast.success('Dados antropométricos atualizados!');
    } catch (error: any) {
      console.error('Error saving antro:', error);
      toast.error('Erro ao salvar dados do paciente.');
    } finally {
      setIsSavingAntro(false);
    }
  };

  const preparePDFData = async (): Promise<PremiumMealPlanPDFData> => {
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", user?.id).maybeSingle();
    const profName = prof?.full_name || "Seu Nutricionista";
    
    const isWeekly = viewMode === 'weekly';
    const divisor = isWeekly ? 7 : 1;
    
    const totalKcal = meals.reduce((s, m) => s + m.items.reduce((a, i) => a + (Number(i.kcal) || 0), 0), 0);
    const totalProtein = meals.reduce((s, m) => s + m.items.reduce((a, i) => a + (Number(i.protein) || 0), 0), 0);
    const totalCarbs = meals.reduce((s, m) => s + m.items.reduce((a, i) => a + (Number(i.carbs) || 0), 0), 0);
    const totalFat = meals.reduce((s, m) => s + m.items.reduce((a, i) => a + (Number(i.fat) || 0), 0), 0);

    const mapMealToItems = (m: Meal, dayNum: number | null) => {
      const mealItems: PremiumMealPlanPDFData['items'] = [];
      const mType = m.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '_') as any;
      
      m.items.forEach(item => {
        const groupId = item.instanceId;
        mealItems.push({
          mealType: mType,
          title: item.name, // 🛡️ SOBERANIA V3: Título é o nome do alimento
          description: item.description || "", // 🛡️ SOBERANIA V3: Descrição são as notas/instruções
          display_quantity: item.quantity,
          display_unit: item.display_unit || item.portionLabel,
          clinical_mass_g: resolveDisplayGrams(item),
          calories_target: Math.round(Number(item.kcal) || 0),
          protein_target: Math.round(Number(item.protein) || 0),
          carbs_target: Math.round(Number(item.carbs) || 0),
          fat_target: Math.round(Number(item.fat) || 0),
          is_primary: true,
          substitution_group_id: groupId,
          day_of_week: dayNum !== null ? dayNum : undefined,
          editor_version: "v3"
        });

        // Só inclui substituições no modo Diário, como solicitado
        if (item.substitutions && item.substitutions.length > 0) {
          item.substitutions.forEach(sub => {
            mealItems.push({
              mealType: mType,
              title: sub.name, // 🛡️ SOBERANIA V3: Nome do alimento de troca
              description: (sub as any).description || "",
              display_quantity: (sub as any).suggestedQuantity || (sub as any).quantity || (sub as any).portionValue,
              display_unit: (sub as any).display_unit || (sub as any).portionLabel || (sub as any).portionUnitLabel,
              clinical_mass_g: resolveDisplayGrams(sub as any),
              calories_target: Math.round(Number(sub.kcal) || 0),
              protein_target: Math.round(Number(sub.protein) || 0),
              carbs_target: Math.round(Number(sub.carbs) || 0),
              fat_target: Math.round(Number(sub.fat) || 0),
              is_primary: false,
              substitution_group_id: groupId,
              day_of_week: dayNum !== null ? dayNum : undefined,
              editor_version: "v3"
            });
          });
        }
      });
      return mealItems;
    };

    const standardOrder = [
      'cafe', 'desjejum', 'manha', 'almoco', 'tarde', 'lanche', 'jantar', 'ceia', 'pre', 'pos', 'noite'
    ];

    const getMealRank = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes('cafe') || lower.includes('desjejum')) return 1;
      if (lower.includes('lanche da manha')) return 2;
      if (lower.includes('almoco')) return 3;
      if (lower.includes('lanche da tarde') || lower.includes('lanche')) return 4;
      if (lower.includes('jantar')) return 5;
      if (lower.includes('ceia')) return 6;
      return 10;
    };

    const sortedMeals = [...meals].sort((a, b) => {
      // Se for modo semanal e as refeições tiverem dias, primeiro ordena pelo dia
      // Mas se o usuário montou o plano, o getMealRank resolve a ordem das refeições
      return getMealRank(a.name) - getMealRank(b.name);
    });

    const pdfItems = isWeekly 
      ? (sortedMeals.length >= 42 
          ? sortedMeals.flatMap((m, idx) => {
              const dayIdx = Math.floor(idx / (sortedMeals.length / 7));
              const days = [1, 2, 3, 4, 5, 6, 0];
              return mapMealToItems(m, days[dayIdx]);
            })
          : [1, 2, 3, 4, 5, 6, 0].flatMap(day => sortedMeals.flatMap(m => mapMealToItems(m, day)))
        )
      : sortedMeals.flatMap(m => mapMealToItems(m, -1));

    return {
      planTitle: isWeekly ? "Plano Alimentar Semanal" : "Plano Alimentar Premium V3",
      patientName: patientContext?.name || "Paciente",
      nutritionistName: profName,
      startDate: new Date().toLocaleDateString("pt-BR"),
      planMode: isWeekly ? 'weekly' : 'single_day',
      items: pdfItems,
      targetCalories: Math.round(totalKcal / divisor),
      targetProtein: Math.round(totalProtein / divisor),
      targetCarbs: Math.round(totalCarbs / divisor),
      targetFat: Math.round(totalFat / divisor),
      goal: patientContext?.goal,
    };
  };

  const handleSendWhatsApp = async () => {
    if (!meals.length || !patientId) {
      toast.error("Nenhum item para enviar ou paciente não selecionado");
      return;
    }
    
    setSendingWhatsApp(true);
    const toastId = toast.loading("Preparando Plano Alimentar Premium para WhatsApp...");
    
    try {
      const pdfData = await preparePDFData();
      
      // 1. Gera o PDF local via Sandbox (Etapa 4 - Blindagem)
      await safeGeneratePDF(pdfData);

      // 2. Gera HTML para compartilhamento via link
      const html = buildPremiumMealPlanHTML(pdfData);
      const fileName = `plan-${patientId}-${Date.now()}.html`;
      const blob = new Blob([html], { type: "text/html" });
      
      await supabase.storage.from("shared-meal-plans").upload(fileName, blob);
      const { data: { publicUrl } } = supabase.storage.from("shared-meal-plans").getPublicUrl(fileName);
      
      // 3. Abre o WhatsApp com a mensagem e o link
      const message = `Olá ${pdfData.patientName}! Aqui está seu plano alimentar FitJourney: ${publicUrl}`;
      const { data: profile } = await supabase.from('profiles').select('phone').eq('user_id', patientId).maybeSingle();
      
      if (profile?.phone) {
        const whatsappUrl = buildWhatsAppUrl(profile.phone, message);
        window.open(whatsappUrl, '_blank');
        toast.success("WhatsApp aberto com o link do plano!", { id: toastId });
      } else {
        toast.error("Telefone do paciente não encontrado", { id: toastId });
      }
    } catch (err) {
      console.error("WhatsApp error:", err);
      toast.error("Erro ao preparar envio", { id: toastId });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleViewPDF = async () => {
    if (!meals.length) {
      toast.error("Nenhum item para visualizar");
      return;
    }
    const toastId = toast.loading("Gerando prévia do PDF...");
    try {
      const pdfData = await preparePDFData();
      await safeGeneratePDF(pdfData);

      toast.success("PDF gerado com sucesso!", { id: toastId });
    } catch (err) {
      console.error("PDF preview error:", err);
      toast.error("Erro ao gerar PDF", { id: toastId });
    }
  };

  const handleViewPlainText = () => {
    if (!meals.length) {
      toast.error("Nenhum item para visualizar");
      return;
    }
    const text = generateV3PlainText(meals, patientContext?.name || "Paciente");
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plano-alimentar-${patientContext?.name || 'paciente'}.txt`;
    a.click();
    toast.success("Plano exportado em Texto Simples!");
  };

  const handleFixPlan = async () => {
    if (!patientContext) return;
    setIsGeneratingGlobal(true);
    
    try {
      console.log('[Direct V3] Corrigindo refeições vazias ou críticas');
      
      // Identificar refeições que precisam de correção
      const mealsToFix = meals.filter(m => 
        m.items.length === 0 || 
        validationIssues.some(issue => issue.mealId === m.id && issue.severity === 'critical')
      );

      if (mealsToFix.length === 0) {
        toast.info('Nenhuma refeição crítica encontrada para correção automática.');
        return;
      }

      // Para simplificar e garantir equilíbrio, vamos regenerar o plano completo
      // mas preservando o que está bom se necessário. 
      // O usuário pediu: "Remove e recria as refeições que estão vazias ou com Ajuste Clínico Necessário"
      await handleGenerateFullPlan();
      toast.success('Refeições corrigidas com o motor NutriCore V3');
    } finally {
      setIsGeneratingGlobal(false);
    }
  };

  const handleMealGenerate = async (mealId: string) => {
    // 🛡️ SOBERANIA MANUAL: Geração procedural desativada.
    toast.info('Geração automática desativada. Utilize a biblioteca de templates para preencher o plano.');
  };

  const executeSwap = (mealId: string, instanceId: string, target: Food & { suggestedQuantity?: number }, autoAdjust = false) => {
    const meal = meals.find(m => m.id === mealId);
    const currentItem = meal?.items.find(i => i.instanceId === instanceId);
    
    if (!currentItem) return;

    let newGrams = 100;

    // Se temos uma quantidade sugerida pelo motor de substituição, usamos ela prioritariamente
    if (target.suggestedQuantity) {
      newGrams = target.suggestedQuantity;
    } else if (autoAdjust) {
      const currentMacros = calculateItemMacros(currentItem, currentItem.quantity);
      const targetKcalPerUnit = target.kcal || target.calories || 0; 
      
      if (targetKcalPerUnit > 0) {
        if (target.measurementType === 'gram' || target.measurementType === 'ml') {
          newGrams = Math.round((currentMacros.kcal / targetKcalPerUnit) * 100);
        } else {
          newGrams = Math.round(currentMacros.kcal / targetKcalPerUnit);
        }
      } else {
        newGrams = currentItem.quantity; // Fallback
      }
    } else {
      if (target.measurementType === 'gram') newGrams = 100;
      else if (target.measurementType === 'ml') newGrams = 200;
      else newGrams = target.portionValue || 1;
    }

    const macros = calculateItemMacros(target as any, newGrams);

    updateMealItem(mealId, instanceId, {
      ...target,
      ...macros,
      kcal: macros.kcal,
      calories: macros.kcal,
      instanceId,
      quantity: newGrams
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
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center text-white">
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

  if (!patientId && !resolvedPlanId && !isSandbox) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center text-white">
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
    <div className="min-h-screen bg-neutral-950 flex flex-col font-sans selection:bg-emerald-500/30 text-white">
      {/* V3 Soberano Template Modal */}
      <TemplateV3Modal 
        isOpen={showV3TemplateModal}
        onClose={() => setShowV3TemplateModal(false)}
        template={selectedV3Template}
        onSelectProfile={handleApplyV3Profile}
      />

      <DraftV3PreviewModal
        isOpen={showV3DraftPreview}
        onClose={() => setShowV3DraftPreview(false)}
        draftMeals={v3DraftMeals}
        onApprove={handleApproveDraft}
        patientName={patientContext?.name || "Paciente"}
      />

      <header className="bg-neutral-950/80 border-b border-white/5 py-3 px-6 backdrop-blur-xl sticky top-0 z-[60] shadow-2xl">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(patientId ? `/patients/${patientId}` : '/dashboard')}
              className="text-white/40 hover:text-white rounded-2xl hover:bg-white/5 border border-white/5 h-10 w-10 shrink-0"
              title={patientId ? "Voltar ao Perfil do Paciente" : "Voltar ao Dashboard"}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="relative">
              <Button 
                variant="ghost" 
                onClick={() => setShowPatientSelector(!showPatientSelector)}
                className="text-white/80 hover:text-white flex items-center gap-3 px-4 py-2 rounded-2xl hover:bg-white/5 border border-white/5 transition-all group"
              >
                <div className="h-8 w-8 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                  <Users size={18} />
                </div>
                <div className="flex flex-col items-start min-w-[120px]">
                  <span className="text-[10px] font-black uppercase text-white/40 leading-none mb-1">Selecionar Paciente</span>
                  <span className="text-sm font-black tracking-tight leading-none">
                    {patientContext?.name || "Nenhum Selecionado"}
                  </span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-white/20 transition-transform", showPatientSelector && "rotate-180")} />
              </Button>

              {showPatientSelector && (
                <div className="absolute left-0 top-full mt-3 w-80 bg-neutral-900/95 border border-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-white/5">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                      <input 
                        type="text" 
                        placeholder="Buscar paciente..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {isLoadingPatients ? (
                      <div className="p-8 flex flex-col items-center gap-3">
                        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                        <span className="text-[10px] font-black uppercase text-white/20">Buscando Base...</span>
                      </div>
                    ) : (patientsData?.patients?.length ?? 0) > 0 ? (
                      patientsData?.patients?.map(p => (
                        <button
                          key={p.patient_id}
                          onClick={() => {
                            navigate(`/meal-plans/editor/${p.patient_id}`);
                            setShowPatientSelector(false);
                          }}
                          className={cn(
                            "w-full p-3 flex items-center gap-3 rounded-2xl transition-all text-left group",
                            p.patient_id === patientId ? "bg-emerald-500/10 border border-emerald-500/20" : "hover:bg-white/5 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-black transition-colors",
                            p.patient_id === patientId ? "bg-emerald-500 text-black" : "bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white"
                          )}>
                            {p.profile?.full_name ? p.profile.full_name[0] : 'P'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-white">{p.profile?.full_name || 'Paciente'}</span>
                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Acessar Prontuário</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-8 text-center flex flex-col items-center gap-2">
                        <UserX className="w-6 h-6 text-white/10" />
                        <p className="text-[10px] font-black uppercase text-white/20">Nenhum paciente encontrado</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white/5 border-t border-white/5">
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate('/patients')}
                      className="w-full h-10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white rounded-xl"
                    >
                      Gerenciar Todos os Pacientes
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-8 w-px bg-white/5 hidden md:block mx-2" />
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black text-white tracking-tight">
                  {patientContext?.name || (patientId ? "Carregando..." : "Editor V3 Elite")}
                </h1>
                {patientContext && (
                  <Popover open={isEditingAntro} onOpenChange={setIsEditingAntro}>
                    <PopoverTrigger asChild>
                      <Badge 
                        variant="outline" 
                        onClick={() => setEditAntroValues({ 
                          weight: patientContext.weight, 
                          height: patientContext.height, 
                          goal: patientContext.goal 
                        })}
                        className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-black uppercase tracking-tighter rounded-lg cursor-pointer hover:bg-emerald-500/20 transition-all gap-1.5"
                      >
                        {patientContext.weight > 0 ? `${patientContext.weight}kg` : 'Peso?'}
                        {patientContext.weight > 0 && patientContext.weight_source && (
                          <span className="ml-1 opacity-60 normal-case font-semibold tracking-normal">
                            (fonte: {({
                              profile: 'perfil',
                              weight_history: 'check-in',
                              assessment: 'avaliação',
                              anamnesis: 'anamnese',
                              dynamic_fallback: 'estimado',
                              fallback: 'estimado',
                            } as Record<string, string>)[patientContext.weight_source] || patientContext.weight_source})
                          </span>
                        )}
                        {' · '}{patientContext.goal}
                        <Edit3 className="w-2.5 h-2.5 opacity-40" />
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 bg-black/95 border-white/10 backdrop-blur-2xl p-6 rounded-3xl shadow-2xl z-[70]">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-emerald-500" />
                          <h4 className="text-xs font-black text-white uppercase tracking-widest">Ajuste Antropométrico</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-white/40 uppercase">Peso (kg)</Label>
                            <Input 
                              type="number" 
                              value={editAntroValues.weight || ''} 
                              onChange={(e) => setEditAntroValues({ ...editAntroValues, weight: Number(e.target.value) })}
                              className="bg-white/5 border-white/10 text-white rounded-xl h-10 font-black"
                              placeholder="0.0"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-white/40 uppercase">Altura (cm)</Label>
                            <Input 
                              type="number" 
                              value={editAntroValues.height || ''} 
                              onChange={(e) => setEditAntroValues({ ...editAntroValues, height: Number(e.target.value) })}
                              className="bg-white/5 border-white/10 text-white rounded-xl h-10 font-black"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-white/40 uppercase">Objetivo</Label>
                          <select 
                            value={editAntroValues.goal}
                            onChange={(e) => setEditAntroValues({ ...editAntroValues, goal: e.target.value })}
                            className="w-full bg-white/5 border-white/10 text-white rounded-xl h-10 px-3 text-sm font-black focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                          >
                            <option value="Emagrecimento">Emagrecimento</option>
                            <option value="Hipertrofia">Hipertrofia</option>
                            <option value="Manutenção">Manutenção</option>
                            <option value="Saúde">Saúde</option>
                            <option value="Performance">Performance</option>
                          </select>
                        </div>

                        <Button 
                          onClick={handleSaveAntro} 
                          disabled={isSavingAntro}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-xl h-10 text-[10px] mt-2"
                        >
                          {isSavingAntro ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sincronizar Dados'}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
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
            
            <div className="flex bg-neutral-900 border border-white/10 p-1 rounded-2xl mr-4">
              <button 
                onClick={() => setViewMode('daily')}
                className={cn(
                  "px-4 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === 'daily' ? "bg-white text-black" : "text-white/40 hover:text-white"
                )}
              >
                Diário
              </button>
              <button 
                onClick={() => setViewMode('weekly')}
                className={cn(
                  "px-4 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  viewMode === 'weekly' ? "bg-white text-black" : "text-white/40 hover:text-white"
                )}
              >
                Semanal
              </button>
            </div>



            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-neutral-900 border border-white/10 p-1 rounded-2xl">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAdjustmentModal(true)} 
                  className="h-10 px-3 text-[10px] font-black uppercase tracking-wider text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-xl transition-all gap-2"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ajustar</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setV3LibraryTab('templates');
                    setShowMainAddModal(true);
                  }}
                  className="h-10 px-4 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black rounded-xl transition-all gap-2 border border-emerald-500/20 shadow-lg shadow-emerald-500/10"
                >
                  <BookCopy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Biblioteca de Templates</span>
                  <span className="sm:hidden">Templates</span>
                </Button>
              </div>

              <div className="h-8 w-px bg-white/5 mx-2" />

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleViewPDF}
                  className="h-10 px-4 text-[10px] font-black uppercase tracking-wider border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white rounded-xl transition-all gap-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Visualizar PDF</span>
                  <span className="sm:hidden">Ver PDF</span>
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleViewPlainText}
                  className="h-10 px-4 text-[10px] font-black uppercase tracking-wider border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white rounded-xl transition-all gap-2"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Texto Simples</span>
                  <span className="sm:hidden">Texto</span>
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (viewMode === 'weekly') {
                      handleSendWhatsApp();
                    } else {
                      // Se estiver em modo diário, perguntar se quer exportar diário ou semanal
                      // Para simplificar, vamos exportar o modo atual
                      handleSendWhatsApp();
                    }
                  }}
                  disabled={sendingWhatsApp || !patientId}
                  className="h-10 px-4 text-[10px] font-black uppercase tracking-wider border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500 hover:text-black rounded-xl transition-all gap-2"
                >
                  {sendingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                  WhatsApp
                </Button>

                <Button 
                  size="sm" 
                  onClick={handlePromotionRequest}
                  disabled={promoting || (!draftId && !isSandbox)}
                  className="h-10 px-6 text-[10px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all gap-2 shadow-xl shadow-blue-600/20 border-b-2 border-blue-800"
                >
                  {promoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar Plano
                </Button>
              </div>

              <Button variant="ghost" size="icon" onClick={() => setShowResetConfirm(true)} className="h-10 w-10 text-white/20 hover:text-rose-400 rounded-xl">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* COLUNA LATERAL: Biblioteca Clínica V3 */}
        <aside className="w-80 border-r border-white/5 bg-neutral-900/40 flex flex-col shrink-0 overflow-hidden">
          <div className="p-6 border-b border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Library className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase italic tracking-tight">Biblioteca Clínica V3</h3>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Soberana & Dinâmica</p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <Input 
                placeholder="Buscar na biblioteca..."
                value={v3LibrarySearch}
                onChange={(e) => setV3LibrarySearch(e.target.value)}
                className="bg-white/5 border-white/10 h-9 pl-9 rounded-xl text-xs focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="px-3 pt-4">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              {[
                { id: 'foods', label: 'Alimentos', icon: Apple },
                { id: 'ready', label: 'Prontas', icon: Soup },
                { id: 'templates', label: 'Templates', icon: Layers }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setV3LibraryTab(tab.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all",
                    v3LibraryTab === tab.id ? "bg-white/5 text-emerald-500 shadow-sm" : "text-white/30 hover:text-white/60"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {v3LibraryTab === 'ready' && (
            <div className="px-3 pt-3 flex flex-wrap gap-1.5">
              {[
                { id: null, label: 'Todas', icon: UtensilsCrossed },
                { id: 'breakfast', label: 'Café', icon: Coffee },
                { id: 'lunch', label: 'Almoço', icon: Sun },
                { id: 'dinner', label: 'Jantar', icon: Moon },
                { id: 'supper', label: 'Ceia', icon: ShoppingCart }
              ].map(slot => (
                <button
                  key={slot.label}
                  onClick={() => setV3LibraryMealFilter(slot.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                    v3LibraryMealFilter === slot.id 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                  )}
                >
                  <slot.icon className="w-2.5 h-2.5" />
                  {slot.label}
                </button>
              ))}
            </div>
          )}

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3 pb-20">
              {isSearchingV3Library ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/20">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Acessando Biblioteca...</p>
                </div>
              ) : v3LibraryTab === 'templates' ? (
                v3Templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedV3Template(template);
                      setShowV3TemplateModal(true);
                    }}
                    className="w-full group text-left bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                        <Target className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase italic tracking-tight truncate group-hover:text-emerald-400">{template.title}</p>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest truncate">{template.objective}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(template.kcal_profiles as any[]).slice(0, 4).map((p: any) => (
                        <Badge key={typeof p === 'number' ? p : p.kcal} className="bg-black/40 text-white/40 border-white/5 text-[8px] uppercase font-black px-1.5 h-4">
                          {typeof p === 'number' ? p : p.kcal}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))
              ) : v3LibraryItems.length > 0 ? (
                v3LibraryItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (activeMealId) {
                        const composition = item.composition || [{ name: item.title, kcal: item.kcal_base, protein: item.protein_base, carbs: item.carbs_base, fat: item.fats_base, base_grams: 100 }];
                        const firstComp = composition[0];
                        addFoodToMeal(activeMealId, {
                          id: item.id,
                          name: firstComp.name,
                          kcal: firstComp.kcal,
                          protein: firstComp.protein,
                          carbs: firstComp.carbs,
                          fat: firstComp.fat,
                          portionValue: 100,
                          portionUnitLabel: 'g',
                          portionUnit: 'g',
                          portionLabel: '100g',
                          measurementType: 'gram',
                          imageUrl: item.images?.[0]?.image_asset || undefined,
                          isVisualLibraryItem: true,
                          library_item_slug: item.slug
                        } as any);
                        toast.success(`${item.title} adicionado!`);
                      } else {
                        toast.info("Selecione uma refeição primeiro.");
                      }
                    }}
                    className="w-full group flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left overflow-hidden"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/5 group-hover:border-emerald-500/20 transition-all">
                      {item.images?.[0]?.image_asset ? (
                        <img src={item.images[0].image_asset} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-white/10" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-[10px] truncate leading-tight group-hover:text-emerald-400">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-tighter">{item.kcal_base} kcal</span>
                        <Badge className="bg-emerald-500/5 text-emerald-500/40 border-0 text-[7px] uppercase font-black px-1 h-3">Escalável</Badge>
                      </div>
                    </div>
                    <Plus className="w-3 h-3 text-white/20 group-hover:text-emerald-500" />
                  </button>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/10">
                  <Search className="w-8 h-8 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum resultado</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        <ScrollArea className="flex-1 px-8 pt-8 pb-32">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Draft Soberano</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Editor V3 Elite</span>
                  <div className="h-1 w-1 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Preview Real-Time</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => setShowControlledDelivery(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20 gap-2 border-b-2 border-blue-800"
                >
                  <ShieldCheck className="w-4 h-4" /> Entregar Manualmente
                </Button>
                <Button 
                  onClick={() => setV3LibraryTab('templates')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest h-11 px-6 rounded-xl shadow-lg shadow-emerald-500/20 gap-2"
                >
                  <Target className="w-4 h-4" /> Templates
                </Button>
              </div>
            </div>

            <div className="space-y-12">
              {viewMode === 'weekly' ? (
                ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, dayIdx) => {
                  const dayMeals = meals.length >= 42 
                    ? meals.slice(dayIdx * (meals.length / 7), (dayIdx + 1) * (meals.length / 7))
                    : meals;

                  return (
                    <div key={day} className="space-y-8 pb-12 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-4 px-2">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                          <Clock className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{day}</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {dayMeals.map((meal, mIdx) => {
                          const humanScore = calculateHumanMealScore(meal, meal.name);
                          const isAbsurd = humanScore.status === 'absurd';

                          const isEmpty = meal.items.length === 0;
                          return (
                            <Card key={`${day}-${meal.id}-${mIdx}`} className={cn(
                              "bg-neutral-900/50 border-white/5 overflow-hidden rounded-[32px] hover:border-emerald-500/30 transition-all group relative",
                              isAbsurd && !isEmpty && "border-amber-500/30"
                            )}>
                              {isEmpty ? (
                                <div className="absolute top-4 left-4 z-10">
                                  <Badge variant="secondary" className="bg-white/10 text-white/70 border-0">Slot vazio — adicione itens</Badge>
                                </div>
                              ) : isAbsurd ? (
                                <div className="absolute top-4 left-4 z-10">
                                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-300 border border-amber-500/30">⚠ Ajuste sugerido</Badge>
                                </div>
                              ) : null}
                              
                              <div className="relative w-full h-32 overflow-hidden">
                                {meal.imageUrl && (
                                  <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent opacity-60" />
                                <div className="absolute bottom-3 left-4">
                                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{meal.time}</span>
                                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{meal.name}</h4>
                                </div>
                              </div>

                              <div className="p-4 space-y-2">
                                {meal.items.map(item => (
                                  <div key={item.instanceId} className="flex justify-between items-center text-[11px] p-2 hover:bg-white/5 rounded-lg cursor-pointer" onClick={() => setSelectedItem({ mealId: meal.id, item })}>
                                    <span className="text-white/60 font-bold line-clamp-1">{item.name}</span>
                                    <span className="text-emerald-500 font-black ml-2 whitespace-nowrap">{formatPortion(item)}</span>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                meals.map((meal, index) => {
                  const humanScore = calculateHumanMealScore(meal, meal.name);
                  const isAbsurd = humanScore.status === 'absurd';

                  const isEmpty = meal.items.length === 0;
                  return (
                    <section key={meal.id} className={cn(
                      "group animate-in fade-in slide-in-from-bottom-4 duration-700 p-8 rounded-[3rem] border transition-all relative",
                      activeMealId === meal.id ? "bg-neutral-900 border-emerald-500/30 shadow-2xl shadow-emerald-500/5" : "bg-neutral-900/30 border-white/5 hover:border-white/10",
                      isAbsurd && !isEmpty && "border-amber-500/30"
                    )}>
                      {isEmpty ? (
                        <div className="absolute top-8 right-8 z-20">
                          <Badge variant="secondary" className="bg-white/10 text-white/70 border-0 h-8 px-4 text-xs font-bold uppercase">Slot vazio — adicione itens</Badge>
                        </div>
                      ) : isAbsurd ? (
                        <div className="absolute top-8 right-8 z-20 flex flex-col items-end gap-2">
                          <Badge variant="secondary" className="h-8 px-4 text-xs font-black uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">⚠ Ajuste sugerido</Badge>
                          <div className="bg-amber-950/60 border border-amber-500/20 p-3 rounded-2xl max-w-xs shadow-xl backdrop-blur-md text-right">
                            <p className="text-[10px] font-black uppercase text-amber-300/80 mb-2 tracking-widest">Sugestões:</p>
                            {humanScore.reasons.map((r, i) => (
                              <p key={i} className="text-[10px] text-white/70 leading-relaxed">{r}</p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    <div className="flex flex-col md:flex-row gap-10">
                      <div className="w-full md:w-72 shrink-0">
                        <div className="relative aspect-square rounded-[2.5rem] overflow-hidden group/img shadow-2xl border border-white/5 group-hover:border-emerald-500/20 transition-all">
                          {meal.imageUrl ? (
                            <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-white/5" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" onClick={() => openVisualLibraryForMeal(meal.id)} className="bg-white text-black font-black uppercase text-[10px] tracking-widest h-10 rounded-xl px-6">Trocar Imagem</Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                              <Clock className="w-4 h-4 text-emerald-400" />
                              <input type="time" className="bg-transparent border-none text-emerald-400 font-black text-sm p-0 w-16" value={meal.time} onChange={(e) => updateMealHeader(meal.id, meal.name, e.target.value)} />
                            </div>
                            <input className="bg-transparent border-none font-black text-3xl tracking-tight text-white focus:outline-none focus:ring-0 w-full italic uppercase" value={meal.name} onChange={(e) => updateMealHeader(meal.id, e.target.value, meal.time || '00:00')} />
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <Button variant="ghost" size="icon" onClick={() => { setActiveMealId(meal.id); setV3LibraryTab('ready'); }} className="rounded-2xl h-12 w-12 text-white/20 hover:text-emerald-500 hover:bg-emerald-500/10 border border-white/5"><Plus className="w-5 h-5" /></Button>
                             <Button variant="ghost" size="icon" onClick={() => removeMeal(meal.id)} className="rounded-2xl h-12 w-12 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 border border-white/5"><Trash2 className="w-5 h-5" /></Button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {meal.items.map((item) => (
                            <Card key={item.instanceId} className="p-6 flex items-center justify-between bg-white/[0.02] border-white/5 hover:bg-white/[0.04] transition-all rounded-3xl cursor-pointer group/item" onClick={() => setSelectedItem({ mealId: meal.id, item })}>
                              <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-black/40 overflow-hidden flex-shrink-0 border border-white/5">
                                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Apple className="w-6 h-6 text-white/5" /></div>}
                                </div>
                                <div>
                                  <p className="font-black text-xl tracking-tight text-white group-hover/item:text-emerald-400 transition-colors">{item.name}</p>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="text-sm font-black text-emerald-500">{formatPortion(item)}</span>
                                    <div className="flex gap-4">
                                      <span className="text-[10px] font-bold text-white/30 uppercase"><span className="text-white/60">{Math.round(calculateItemMacros(item, item.quantity).kcal)}</span> kcal</span>
                                      <span className="text-[10px] font-bold text-emerald-500/40 uppercase"><span className="text-emerald-500/60">{Math.round(calculateItemMacros(item, item.quantity).protein)}g</span> P</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-white/10 group-hover/item:text-emerald-500 transition-all" />
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })
            )}

              <Button onClick={addMeal} variant="ghost" className="w-full py-16 border-2 border-dashed border-white/5 rounded-[3rem] hover:border-emerald-500/20 hover:bg-emerald-500/5 text-white/20 hover:text-emerald-400 font-black gap-4 transition-all flex flex-col items-center">
                <Plus className="w-10 h-10" />
                <span className="uppercase tracking-[0.4em] text-xs">Nova Refeição Soberana</span>
              </Button>
            </div>
          </div>
        </ScrollArea>

        <aside className="w-80 border-l border-white/5 p-6 space-y-6 shrink-0 hidden xl:block">
           <Card className="p-6 bg-neutral-900/50 border-white/5 rounded-3xl backdrop-blur-sm shadow-xl">
             <h3 className="text-xs font-black text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-500" /> Distribuição Clínica
            </h3>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Proteína</span>
                    <span className="text-xs font-black text-emerald-400">{Math.round(totalMacros.protein)}g</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (totalMacros.protein / (goalMetadata.goalProtein || 150)) * 100)}%` }} />
                 </div>
              </div>
              <div className="flex flex-col gap-2">
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Kcal Totais</span>
                    <span className="text-xs font-black text-white">{Math.round(totalMacros.kcal)}</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-white/20" style={{ width: `${Math.min(100, (totalMacros.kcal / (goalMetadata.goalCalories || 2000)) * 100)}%` }} />
                 </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-emerald-500/5 border-emerald-500/10 rounded-3xl">
             <div className="flex items-center gap-3 mb-4">
               <Zap className="w-5 h-5 text-emerald-400" />
               <h4 className="text-xs font-black uppercase text-emerald-400 tracking-widest">Insights V3</h4>
             </div>
             <p className="text-[10px] font-medium text-white/40 uppercase leading-relaxed">
               Plano gerado com <span className="text-emerald-400">Rotação Visual</span> ativa e <span className="text-emerald-400">Integridade de Porções</span> garantida pelo motor soberano.
             </p>
          </Card>
        </aside>
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
                      {f.imageUrl ? <img src={f.imageUrl} alt={f.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Apple className="w-6 h-6 text-white/10" /></div>}
                    </div>
                    <div className="flex-1">
                      <span className="font-black text-white group-hover:text-emerald-400 transition-colors line-clamp-2 text-[15px] leading-tight pr-2">{f.name}</span>
                      <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase border-0 mt-1">{f.kcal} kcal</Badge>
                    </div>
                  </div>
                  <Plus className="absolute bottom-6 right-6 w-8 h-8 text-white/10 group-hover:text-emerald-500 transition-all" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!localDraft} onOpenChange={(v) => !v && handleCloseModal()}>
        <DialogContent className="max-w-4xl bg-black border-white/10 p-0 overflow-hidden rounded-3xl shadow-2xl">
          {localDraft && (
            <div className="flex flex-col h-full">
              <div className="p-8 border-b border-white/5 bg-neutral-900/30 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                    {localDraft.imageUrl ? (
                      <img src={localDraft.imageUrl} alt={localDraft.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <Apple className="w-10 h-10 text-emerald-500" />
                    )}
                  </div>
                  <div>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-2 mb-2">Edição de Alimento</Badge>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">{localDraft.name}</h2>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCloseModal} className="text-white/20 hover:text-white rounded-full h-12 w-12 hover:bg-white/5 transition-all">
                  <X size={24} />
                </Button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-2xl">
                    <Label className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em] block mb-6">Ajuste de Porção</Label>
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <span className="text-[9px] font-black text-white/30 uppercase block mb-2 ml-1">Quantidade</span>
                          <Input 
                            type="number" 
                            step="0.1" 
                            value={localDraft.quantity} 
                            onChange={(e) => updateLocalDraft({ quantity: Number(e.target.value) })} 
                            className="h-16 bg-black border-white/10 text-white rounded-2xl text-2xl font-black text-center focus:border-emerald-500/50 transition-all" 
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-[9px] font-black text-white/30 uppercase block mb-2 ml-1">Medida</span>
                          <Select 
                            value={localDraft.portionUnitLabel || 'Gramas'} 
                            onValueChange={(val) => {
                              const opt = MEASURE_OPTIONS.find(o => o.unit === val);
                              updateLocalDraft({ 
                                portionUnitLabel: val,
                                portionUnit: val,
                                measurementType: opt?.type || localDraft.measurementType,
                                portionValue: opt?.type === 'gram' ? 1 : localDraft.portionValue
                              });
                            }}
                          >
                            <SelectTrigger className="h-16 bg-black border-white/10 text-white rounded-2xl font-black text-sm">
                              <SelectValue placeholder="Unidade" />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-white/10 text-white">
                              {MEASURE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.unit} value={opt.unit} className="font-bold">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                        <div className="text-center">
                          <span className="text-[8px] font-black text-white/20 uppercase block mb-1">Calorias</span>
                          <span className="text-lg font-black text-white italic">{Math.round(localDraft.kcal || 0)}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[8px] font-black text-white/20 uppercase block mb-1">Proteína</span>
                          <span className="text-lg font-black text-emerald-500 italic">{localDraft.protein}g</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[8px] font-black text-white/20 uppercase block mb-1">Carbos</span>
                          <span className="text-lg font-black text-blue-500 italic">{localDraft.carbs}g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={() => {
                      if (selectedItemState) removeFood(selectedItemState.mealId, selectedItemState.instanceId);
                      handleCloseModal();
                    }} variant="ghost" className="flex-1 h-16 border-2 border-rose-500/20 text-rose-500 hover:bg-rose-500/10 font-black uppercase tracking-widest rounded-2xl gap-2">
                      <Trash2 size={18} /> Remover
                    </Button>
                    <Button onClick={handleCommitModal} disabled={!isModalDirty} className="flex-[2] h-16 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)] gap-2">
                      <CheckCircle2 size={18} /> Salvar Alterações
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col h-full bg-white/5 rounded-3xl p-8 border border-white/10 shadow-inner">
                  <Label className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <RefreshCcw size={14} /> Substituições Sugeridas
                  </Label>
                  <ScrollArea className="flex-1 -mx-2 px-2">
                    <div className="space-y-3">
                      {smartSubstitutions.length > 0 ? (
                        smartSubstitutions.map((sub) => (
                          <button 
                            key={sub.id} 
                            onClick={() => updateLocalDraft(sub as any)} 
                            className="w-full group flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-blue-500/50 hover:bg-black/60 transition-all text-left"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-blue-500/20 transition-all">
                                {sub.imageUrl ? <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover rounded-lg" /> : <RefreshCw size={16} className="text-white/20" />}
                              </div>
                              <div>
                                <p className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">{sub.name}</p>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{sub.kcal} kcal • {sub.protein}g P</p>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-white/10 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                          </button>
                        ))
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-20">
                          <RefreshCcw size={32} className="animate-spin-slow" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma substituição carregada</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PlanAdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        meals={meals}
        onApply={(newMeals) => setMeals(newMeals)}
        goalMetadata={goalMetadata}
      />

      <TemplateEditorModal
        isOpen={isTemplateEditorOpen}
        onClose={() => setIsTemplateEditorOpen(false)}
        template={editingTemplate}
        onSave={(updated) => {
          setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
          setIsTemplateEditorOpen(false);
        }}
      />
      <ControlledDeliveryModal
        isOpen={showControlledDelivery}
        onClose={() => setShowControlledDelivery(false)}
        onDeliver={handleControlledDelivery}
        planPreview={meals}
      />
    </div>
  );
};

export default EditorV3Page;

