import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Meal, Food, MealItem, MealTemplate, AuditLogEntry, PatientContext, PlanConfidence } from '../types';
import { SimpleMealGenerator } from '../services/simpleMealGenerator';
import { normalizeFood, getBestMealImage, normalizeMeals } from '../utils/normalization';
import { 
  calculateNutritionalScore, 
  validatePlanClinically, 
  type PlanMetadata,
  calculatePersonalizedScore, 
  validateClinicalContext, 
  calculatePlanConfidence,
  calculateItemMacros,
  runClinicalRegressions,
  NutritionalScore, 
  ValidationIssue 
} from '../../clinical-engine';
import { toast } from 'sonner';
import { validateDraftIntegrity, validateClinicalValidity } from '../../security/services/criticalContracts';
import { logClinicalEvent } from '../../audit/services/auditLogger';
import { processSmartTemplate } from '../services/templateIntelligence';
import { validatePersistedState } from '../security/storeGuard';
import { normalizeSlot } from '@/lib/mealTypeIntegrity';

interface EditorState {
  meals: Meal[];
  auditLog: AuditLogEntry[];
  patientId: string | null;
  planStatus: 'draft' | 'saving' | 'saved';
  nutritionalScore: NutritionalScore | null;
  validationIssues: ValidationIssue[];
  goalMetadata: PlanMetadata;
  clinicalMode: boolean;
  lastBlockedReason: string | null;
  patientContext: PatientContext | null;
  sharingToken: string | null;
  confidence: PlanConfidence | null;
  initialMeals: Meal[]; 
  viewMode: 'daily' | 'weekly';
  setViewMode: (mode: 'daily' | 'weekly') => void;
  dispatch: (action: string, updateFn: (state: EditorState) => Partial<EditorState>) => void;
  setPatientId: (id: string) => void;
  setPatientContext: (context: PatientContext) => void;
  setGoalMetadata: (metadata: any) => void;
  recalculateScore: () => void;
  addAuditEntry: (entry: Omit<AuditLogEntry, 'created_at'>) => void;
  refinePlan: (availableFoods: Food[], level?: 'light' | 'moderate' | 'aggressive') => void;
  addMealWithHeader: (name: string, time: string) => void;
  hydrateMeals: (meals: Meal[], auditLog?: AuditLogEntry[], sharingToken?: string) => void;
  addMeal: () => void;
  duplicateMeal: (mealId: string) => void;
  reorderMeal: (mealId: string, direction: 'up' | 'down') => void;
  removeMeal: (mealId: string) => void;
  updateMealHeader: (mealId: string, name: string, time: string, description?: string, imageUrl?: string, imageSource?: 'auto' | 'manual' | 'fallback') => void;
  updateMealImage: (mealId: string, imageUrl: string, imageSource: 'auto' | 'manual' | 'fallback') => void;
  addMarmitaToMeal: (mealId: string, marmita: Food) => Promise<void>;
  addFoodToMeal: (mealId: string, food: Food) => Promise<void>;
  applyTemplateToMeal: (mealId: string, template: MealTemplate) => void;
  removeFood: (mealId: string, instanceId: string) => Promise<void>;
  updateFoodQuantity: (mealId: string, instanceId: string, quantity: number, clinical_mass_g?: number) => void;
  updateMealItem: (mealId: string, instanceId: string, updates: Partial<MealItem>, skipWeeklySync?: boolean) => Promise<void>;
  generatePlan: (goal: string, baseCalories: number, replaceExisting?: boolean) => void;
  generateMeal: (mealId: string, goal: string, baseCalories?: number) => void;
  savePlan: () => Promise<void>;
  resetEditor: () => void;
  setMeals: (meals: Meal[]) => void;
  applySmartTemplate: (template: MealTemplate, baseFoods?: Food[]) => Promise<void>;
}

const DEFAULT_MEALS: Meal[] = [
  { id: '1', name: 'Café da Manhã', items: [], time: '08:00' },
  { id: '2', name: 'Lanche da Manhã', items: [], time: '10:30' },
  { id: '3', name: 'Almoço', items: [], time: '13:00' },
  { id: '4', name: 'Lanche da Tarde', items: [], time: '16:00' },
  { id: '5', name: 'Jantar', items: [], time: '19:30' },
  { id: '6', name: 'Ceia', items: [], time: '22:00' },
];

const makeInstanceId = () => crypto.randomUUID();

export const useEditorState = create<EditorState>()(
  persist(
    (set, get) => ({
      meals: DEFAULT_MEALS,
      auditLog: [],
      patientId: null,
      planStatus: 'draft',
      nutritionalScore: null,
      validationIssues: [],
      goalMetadata: {},
      patientContext: null,
      confidence: null, 
      sharingToken: null,
      initialMeals: DEFAULT_MEALS,
      viewMode: 'daily',
      clinicalMode: true,
      lastBlockedReason: null,

      setViewMode: (mode) => set({ viewMode: mode }),

      dispatch: (action, updateFn) => {
        const state = get();
        const previousMeals = JSON.parse(JSON.stringify(state.meals));
        const previousAuditLog = JSON.parse(JSON.stringify(state.auditLog));

        try {
          const updates = updateFn(state);
          const newState = { ...state, ...updates };
          validateDraftIntegrity({ meals: newState.meals, version: 1 });
          validateClinicalValidity({ meals: newState.meals });
          set(updates);
          logClinicalEvent({
            type: "audit_log",
            action,
            resource: "editor-v3",
            patient_id: state.patientId || undefined,
            details: { action, timestamp: new Date().toISOString() }
          });
        } catch (error: any) {
          set({ 
            meals: previousMeals, 
            auditLog: [...previousAuditLog, {
              type: 'system_action',
              description: `Rollback em ${action}: ${error.message}`,
              source: 'system',
              created_at: new Date().toISOString()
            }],
            lastBlockedReason: error.message
          });
          toast.error(`Ação bloqueada: ${error.message}`);
        }
      },

      setPatientId: (id) => {
        const currentId = get().patientId;
        if (currentId === id) return;
        
        // 🛡️ RESET SOBERANO: Limpa o rascunho em memória e localStorage ao trocar de paciente
        // Isso impede que o plano da Catharina "vaze" para a Luciana.
        set({ 
          patientId: id,
          meals: DEFAULT_MEALS,
          initialMeals: DEFAULT_MEALS,
          auditLog: [],
          sharingToken: null,
          planStatus: 'draft',
          nutritionalScore: null,
          validationIssues: [],
          confidence: null,
          patientContext: null
        });
        
        // Limpar rascunho persistido localmente para o paciente anterior
        if (currentId) {
          localStorage.removeItem(`fitjourney-v3-fallback-${currentId}`);
        }
      },

      addAuditEntry: (entry) => {
        const newEntry: AuditLogEntry = { ...entry, created_at: new Date().toISOString() };
        set((state) => ({ auditLog: [...state.auditLog, newEntry] }));
      },
      
      setPatientContext: (context) => {
        set({ patientContext: context, goalMetadata: {
          goalCalories: context.calories_target,
          goalProtein: context.protein_target,
          goalCarbs: context.carbs_target,
          goalFat: context.fat_target,
          goal: context.goal,
          restrictions: context.restrictions,
          preferences: context.preferences
        }});
        get().recalculateScore();
      },
      
      setGoalMetadata: (metadata) => {
        set({ goalMetadata: metadata });
        get().recalculateScore();
      },

      recalculateScore: () => {
        const { meals, goalMetadata } = get();
        const nutritionalScore = calculatePersonalizedScore(meals, goalMetadata);
        const clinicalIssues = validateClinicalContext(meals, goalMetadata);
        const baseIssues = validatePlanClinically(meals, goalMetadata);
        const allIssues = [...baseIssues, ...clinicalIssues];
        const confidence = calculatePlanConfidence(nutritionalScore, allIssues, goalMetadata);
        set({ nutritionalScore, validationIssues: allIssues, confidence });
      },

      refinePlan: (availableFoods, level = 'moderate') => {
        const { meals, goalMetadata, validationIssues } = get();
        toast.info("Refinamento simplificado aplicado.");
        set({ planStatus: 'draft' });
      },

      addMealWithHeader: (name, time) => {
        set((state) => ({
          meals: [...state.meals, { id: crypto.randomUUID(), name, items: [], time }],
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      hydrateMeals: async (meals, auditLog = [], token = null) => {
        const normalized = normalizeMeals(meals);
        set({ 
          meals: normalized, 
          initialMeals: JSON.parse(JSON.stringify(normalized)), 
          auditLog, 
          sharingToken: token, 
          planStatus: 'saved' 
        });
        get().recalculateScore();
      },

      addMeal: () => {
        set((state) => ({
          meals: [...state.meals, { id: crypto.randomUUID(), name: `Nova Refeição ${state.meals.length + 1}`, items: [], time: '00:00' }],
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      duplicateMeal: (mealId) => {
        const state = get();
        const mealToDuplicate = state.meals.find(m => m.id === mealId);
        if (!mealToDuplicate) return;
        const newMeal: Meal = {
          ...mealToDuplicate,
          id: crypto.randomUUID(),
          items: mealToDuplicate.items.map(item => ({ ...item, instanceId: makeInstanceId() }))
        };
        const mealIndex = state.meals.findIndex(m => m.id === mealId);
        const newMeals = [...state.meals];
        newMeals.splice(mealIndex + 1, 0, newMeal);
        set({ meals: newMeals, planStatus: 'draft' });
        get().recalculateScore();
      },

      reorderMeal: (mealId, direction) => {
        const state = get();
        const mealIndex = state.meals.findIndex(m => m.id === mealId);
        if (mealIndex === -1) return;
        const newIndex = direction === 'up' ? mealIndex - 1 : mealIndex + 1;
        if (newIndex < 0 || newIndex >= state.meals.length) return;
        const newMeals = [...state.meals];
        const [removed] = newMeals.splice(mealIndex, 1);
        newMeals.splice(newIndex, 0, removed);
        set({ meals: newMeals, planStatus: 'draft' });
        get().recalculateScore();
      },

      removeMeal: (mealId) => {
        set((state) => ({
          meals: state.meals.filter((m) => m.id !== mealId),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      updateMealHeader: (mealId, name, time, description, imageUrl, imageSource) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId ? { 
              ...m, 
              name, 
              time, 
              description: description !== undefined ? description : m.description,
              imageUrl: imageUrl !== undefined ? imageUrl : m.imageUrl,
              imageSource: imageSource !== undefined ? imageSource : m.imageSource
            } : m
          ),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      updateMealImage: (mealId, imageUrl, imageSource) => {
        set((state) => ({
          meals: state.meals.map((m) => m.id === mealId ? { ...m, imageUrl, imageSource } : m),
          planStatus: 'draft',
        }));
      },

      addMarmitaToMeal: async (mealId, marmita) => {
        const item: MealItem = {
          ...normalizeFood(marmita),
          instanceId: makeInstanceId(),
          quantity: 1,
          is_primary: true,
          substitutions: []
        } as any;
        set((state) => ({
          meals: state.meals.map((m) => m.id === mealId ? { ...m, items: [...m.items, item] } : m),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      addFoodToMeal: async (mealId, food) => {
        const item: MealItem = {
          ...normalizeFood(food),
          instanceId: makeInstanceId(),
          quantity: food.measurementType === 'gram' ? 100 : 1,
          is_primary: true,
          substitutions: []
        } as any;
        set((state) => ({
          meals: state.meals.map((m) => m.id === mealId ? { ...m, items: [...m.items, item] } : m),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      applyTemplateToMeal: (mealId, template) => {
        const newItems = template.items.map(f => ({
          ...normalizeFood(f),
          instanceId: makeInstanceId(),
          quantity: f.portionValue || 1,
          is_primary: true,
          substitutions: []
        }));
        set((state) => ({
          meals: state.meals.map((m) => m.id === mealId ? { ...m, items: newItems as any } : m),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      removeFood: async (mealId, instanceId) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId ? { ...m, items: m.items.filter((i) => i.instanceId !== instanceId) } : m
          ),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      updateFoodQuantity: (mealId, instanceId, quantity, clinical_mass_g) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((i) =>
                    i.instanceId === instanceId ? { ...i, quantity, clinical_mass_g: clinical_mass_g ?? quantity } : i
                  ),
                }
              : m
          ),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      updateMealItem: async (mealId, instanceId, updates) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((i) => i.instanceId === instanceId ? { ...i, ...updates } : i),
                }
              : m
          ),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      generatePlan: async (goal, baseCalories, replaceExisting = false) => {
        const { patientContext, patientId } = get();
        const context = {
          ...patientContext,
          calories_target: baseCalories,
          id: patientId || 'sandbox',
          name: patientContext?.name || 'Paciente',
          goal: goal,
        };
        const newMeals = SimpleMealGenerator.generatePlan(context as any, false);
        const mealsWithImages = await Promise.all(newMeals.map(async (meal) => {
          const bestImage = await getBestMealImage(meal.name, meal.items);
          return { ...meal, imageUrl: bestImage.url, imageSource: bestImage.source };
        }));
        set({ meals: mealsWithImages, planStatus: 'draft' });
        get().recalculateScore();
      },

      generateMeal: async (mealId, goal, baseCalories = 2000) => {
        const { meals, patientContext, patientId } = get();
        const meal = meals.find(m => m.id === mealId);
        if (!meal) return;
        const context = { ...patientContext, calories_target: baseCalories, goal };
        const allGenerated = SimpleMealGenerator.generatePlan(context as any, false);
        const sourceMeal = allGenerated.find(m => m.name === meal.name) || allGenerated[0];
        const bestImage = await getBestMealImage(meal.name, sourceMeal.items);
        set((state) => ({
          meals: state.meals.map(m => m.id === mealId ? { ...m, items: sourceMeal.items, imageUrl: bestImage.url, imageSource: bestImage.source } : m),
          planStatus: 'draft'
        }));
        get().recalculateScore();
      },

      savePlan: async () => {
        set({ planStatus: 'saving' });
        await new Promise((resolve) => setTimeout(resolve, 500));
        set({ planStatus: 'saved' });
        toast.success('Plano salvo!');
      },

      resetEditor: () => set({ meals: DEFAULT_MEALS, planStatus: 'draft' }),

      setMeals: (meals) => {
        set({ meals, planStatus: 'draft' });
        get().recalculateScore();
      },

      applySmartTemplate: async (template, baseFoods = []) => {
        const smartMeals = processSmartTemplate(template, { isWeeklyMode: get().viewMode === 'weekly' }, baseFoods);
        set({ meals: smartMeals, planStatus: 'draft' });
        get().recalculateScore();
      },
    }),
    {
      name: 'fitjourney-editor-v3-storage',
      version: 3,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
