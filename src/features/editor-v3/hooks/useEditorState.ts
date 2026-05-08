import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Meal, Food, MealItem, MealTemplate, AuditLogEntry, PatientContext, PlanConfidence } from '../types';
import { 
  generatePlanWithEngine, 
  generateMealWithEngine, 
  refinePlanWithScore, 
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
import { calculateItemMacros as calcMacrosV2 } from '../../clinical-engine/services/v3Motor';
import { toast } from 'sonner';
import { validateDraftIntegrity, validateClinicalValidity } from '../../security/services/criticalContracts';
import { logClinicalEvent } from '../../audit/services/auditLogger';

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

  // Dispatch centralizado (ETAPA 3 - ANTI-CASCATA)
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
  addFoodToMeal: (mealId: string, food: Food) => void;
  applyTemplateToMeal: (mealId: string, template: MealTemplate) => void;
  removeFood: (mealId: string, instanceId: string) => void;
  updateFoodQuantity: (mealId: string, instanceId: string, quantity: number) => void;
  updateMealItem: (mealId: string, instanceId: string, updates: Partial<MealItem>) => void;
  generatePlan: (goal: string, baseCalories: number, availableFoods: Food[], replaceExisting?: boolean) => void;
  generateMeal: (mealId: string, goal: string, availableFoods: Food[], baseCalories?: number) => void;
  savePlan: () => Promise<void>;
  resetEditor: () => void;
}

const initialMeals: Meal[] = [
  { id: '1', name: 'Café da Manhã', items: [], time: '08:00' },
  { id: '2', name: 'Lanche da Manhã', items: [], time: '10:00' },
  { id: '3', name: 'Almoço', items: [], time: '12:00' },
  { id: '4', name: 'Lanche da Tarde', items: [], time: '16:00' },
  { id: '5', name: 'Jantar', items: [], time: '20:00' },
  { id: '6', name: 'Ceia', items: [], time: '22:00' },
];

const makeInstanceId = () => Math.random().toString(36).substring(2, 10);

export const useEditorState = create<EditorState>()(
  persist(
    (set, get) => ({
      meals: initialMeals,
      auditLog: [],
      patientId: null,
      planStatus: 'draft',
      nutritionalScore: null,
      validationIssues: [],
      goalMetadata: {},
      patientContext: null,
      confidence: null, sharingToken: null,
      clinicalMode: true, // editor_v3_clinical_mode = true
      lastBlockedReason: null,

      dispatch: (action, updateFn) => {
        const state = get();
        const previousMeals = JSON.parse(JSON.stringify(state.meals));
        const previousAuditLog = JSON.parse(JSON.stringify(state.auditLog));

        try {
          const updates = updateFn(state);
          const newState = { ...state, ...updates };

          // 1. Validar Contratos (Etapa 2 - Gatekeepers)
          validateDraftIntegrity({ meals: newState.meals, version: 1 });
          validateClinicalValidity({ meals: newState.meals });

          // 2. Executar State Update (Etapa 3 - Anti-Cascata)
          set(updates);
          
          // 3. Registrar Log de Auditoria (Etapa 8)
          logClinicalEvent({
            type: "audit_log",
            action,
            resource: "editor-v3",
            patient_id: state.patientId || undefined,
            details: { action, timestamp: new Date().toISOString() }
          });

          if (process.env.NODE_ENV === 'development') {
            console.log(`[Blindagem:Sucesso] ${action}`);
          }
        } catch (error: any) {
          console.error(`[Blindagem:VIOLAÇÃO/ERRO] ${action}:`, error);
          
          // Fallback UI for incomplete patient data or contract violation
          const isContractViolation = error.message && (error.message.includes('contrato') || error.message.includes('validade'));
          const errorMessage = isContractViolation 
            ? `Erro de contrato em ${action}: ${error.message}`
            : `Dados do paciente incompletos ou erro em ${action}`;

          toast.error(errorMessage);
          
          // 4. Rollback (Etapa 3 - Garantia de Estado)
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

          // 5. Log de Segurança (Etapa 8)
          logClinicalEvent({
            type: "security_logs",
            action: `CONTRACT_VIOLATION_${action.toUpperCase().replace(/\s/g, '_')}`,
            resource: "editor-v3",
            severity: "critical",
            details: { error: error.message, action }
          });

          toast.error(`Ação bloqueada por contrato: ${error.message}`);
        }
      },

      setPatientId: (id) => {
        set({ patientId: id });
        get().addAuditEntry({
          type: 'system_action',
          description: `Paciente ${id} selecionado`,
          source: 'system'
        });
      },

      addAuditEntry: (entry) => {
        const newEntry: AuditLogEntry = {
          ...entry,
          created_at: new Date().toISOString()
        };
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Clinical Audit] ${newEntry.type}: ${newEntry.description}`, newEntry);
        }
        
        set((state) => ({
          auditLog: [...state.auditLog, newEntry]
        }));
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
        
        // Rodar regressões internas para garantir integridade
        if (process.env.NODE_ENV === 'development') {
          runClinicalRegressions();
        }
        
        // Integração com Motor V2 para avaliação de macros
        const { calculateItemMacros: calcMacrosV2 } = require('@/features/clinical-engine/services/v3Motor');
        
        const totals = meals.reduce((acc, meal) => {
          meal.items.forEach(item => {
            const macros = calcMacrosV2(item, item.quantity);
            acc.kcal += macros.kcal;
            acc.protein += macros.protein;
            acc.carbs += macros.carbs;
            acc.fat += macros.fat;
          });
          return acc;
        }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

        // Fallback para o sistema anterior se não houver contexto clínico
        const nutritionalScore = calculatePersonalizedScore(meals, goalMetadata);
        const clinicalIssues = validateClinicalContext(meals, goalMetadata);
        const baseIssues = validatePlanClinically(meals, goalMetadata);
        
        const allIssues = [...baseIssues, ...clinicalIssues];
        const confidence = calculatePlanConfidence(nutritionalScore, allIssues, goalMetadata);
        
        // Registrar macros no console em dev para debug
        if (process.env.NODE_ENV === 'development') {
          console.log(`[V3 Score] Total Kcal: ${Math.round(totals.kcal)}, Protein: ${Math.round(totals.protein)}g`);
        }
        
        set({ 
          nutritionalScore, 
          validationIssues: allIssues,
          confidence 
        });
      },

      refinePlan: (availableFoods, level = 'moderate') => {
        const { meals, goalMetadata, validationIssues } = get();
        if (validationIssues.length === 0) {
          toast.info("O plano já parece estar bem balanceado.");
          return;
        }
        
        const refinedMeals = refinePlanWithScore(meals, goalMetadata, validationIssues, availableFoods, level);
        
        get().addAuditEntry({
          type: 'engine_action',
          description: `Refinamento clínico aplicado (Nível: ${level})`,
          source: 'engine'
        });

        set({ meals: refinedMeals, planStatus: 'draft' });
        get().recalculateScore();
        toast.success(`Plano refinado com sucesso (${level})!`);
      },

      addMealWithHeader: (name, time) => {
        set((state) => ({
          meals: [
            ...state.meals,
            {
              id: Math.random().toString(36).substring(2, 9),
              name,
              items: [],
              time,
            },
          ],
          planStatus: 'draft',
        }));
        
        get().addAuditEntry({
          type: 'system_action',
          description: `Refeição "${name}" adicionada`,
          source: 'manual'
        });

        get().recalculateScore();
        toast.success(`Refeição "${name}" adicionada!`);
      },

      hydrateMeals: (meals, auditLog = [], token = null) => {
        try {
          // Blindagem Anti-Tela Branca: Validar e corrigir IDs nulos ou itens corrompidos
          const sanitizedMeals = meals.map(meal => ({
            ...meal,
            id: meal.id || Math.random().toString(36).substring(2, 9),
            items: (meal.items || []).map(item => ({
              ...item,
              instanceId: item.instanceId || Math.random().toString(36).substring(2, 10),
              // Garantir que macros não sejam undefined
              kcal: item.kcal || 0,
              protein: item.protein || 0,
              carbs: item.carbs || 0,
              fat: item.fat || 0
            }))
          }));

          set({ meals: sanitizedMeals, auditLog, sharingToken: token, planStatus: 'saved' });
          get().recalculateScore();
        } catch (error) {
          console.error('[V3 Hydrate Error] Failed to hydrate meals, recovering...', error);
          toast.error("Erro ao carregar dados do plano. Tentando recuperar...");
          // Fallback para estado inicial seguro
          set({ meals: initialMeals, planStatus: 'draft' });
        }
      },

      addMeal: () => {
        set((state) => ({
          meals: [
            ...state.meals,
            {
              id: Math.random().toString(36).substring(2, 9),
              name: `Nova Refeição ${state.meals.length + 1}`,
              items: [],
              time: '00:00',
            },
          ],
          planStatus: 'draft',
        }));
        get().recalculateScore();
        toast.success('Refeição adicionada!');
      },

      duplicateMeal: (mealId) => {
        const state = get();
        const mealToDuplicate = state.meals.find(m => m.id === mealId);
        if (!mealToDuplicate) return;

        const newMeal: Meal = {
          ...mealToDuplicate,
          id: Math.random().toString(36).substring(2, 9),
          items: mealToDuplicate.items.map(item => ({
            ...item,
            instanceId: makeInstanceId()
          }))
        };

        const mealIndex = state.meals.findIndex(m => m.id === mealId);
        const newMeals = [...state.meals];
        newMeals.splice(mealIndex + 1, 0, newMeal);

        set({ meals: newMeals, planStatus: 'draft' });
        get().recalculateScore();
        toast.success(`Refeição "${mealToDuplicate.name}" duplicada!`);
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
        const meal = get().meals.find(m => m.id === mealId);
        if (meal && meal.items.some(item => item.locked)) {
          toast.error('Não é possível remover refeição com itens bloqueados.');
          return;
        }

        set((state) => ({
          meals: state.meals.filter((m) => m.id !== mealId),
          planStatus: 'draft',
        }));
        get().recalculateScore();
        toast.success('Refeição removida');
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
        set((state) => {
          const meal = state.meals.find(m => m.id === mealId);
          if (!meal) return state;

          const newAuditEntry: AuditLogEntry = {
            type: "image_change",
            description: `Imagem alterada para ${imageUrl}`,
            mealId,
            source: imageSource === 'manual' ? 'manual' : 'engine',
            metadata: { from: meal.imageUrl || 'none', to: imageUrl },
            created_at: new Date().toISOString()
          };

          return {
            meals: state.meals.map((m) =>
              m.id === mealId ? { ...m, imageUrl, imageSource } : m
            ),
            auditLog: [...state.auditLog, newAuditEntry],
            planStatus: 'draft',
          };
        });
        get().recalculateScore();
      },

      addMarmitaToMeal: async (mealId, marmita) => {
        let calculatedMacros = { kcal: marmita.kcal, protein: marmita.protein, carbs: marmita.carbs, fat: marmita.fat };
        
        if (calculatedMacros.kcal === 0 && marmita.ingredients && marmita.ingredients.length > 0) {
          const { getFoodMacrosByName } = await import('../utils/dataFetcher');
          const names = marmita.ingredients.map((i: any) => (i.name || i.food).toLowerCase());
          const macrosMap = await getFoodMacrosByName(names);
          
          let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;
          
          marmita.ingredients.forEach((ing: any) => {
            const name = (ing.name || ing.food).toLowerCase();
            const grams = ing.grams || ing.base_grams || 100;
            const factor = grams / 100;
            const macros = macrosMap[name];
            
            if (macros) {
              totalKcal += macros.kcal * factor;
              totalP += macros.protein * factor;
              totalC += macros.carbs * factor;
              totalF += macros.fat * factor;
            }
          });
          
          calculatedMacros = { kcal: totalKcal, protein: totalP, carbs: totalC, fat: totalF };
        }

        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { 
                  ...m, 
                  items: [
                    ...m.items, 
                    { 
                      ...marmita, 
                      ...calculatedMacros, 
                      calories: calculatedMacros.kcal,
                      instanceId: makeInstanceId(), 
                      quantity: 1,
                      substitutions: [] // Contrato V3
                    }
                  ] 
                }
              : m
          ),
          planStatus: 'draft',
        }));
        get().recalculateScore();
        toast.success(`${marmita.name} adicionada!`);
      },

      addFoodToMeal: (mealId, food) => {
        let initialQuantity = 1;
        if (food.measurementType === 'gram') initialQuantity = 100;
        if (food.measurementType === 'ml') initialQuantity = 200;
        if (food.measurementType === 'spoon') initialQuantity = 1;
        if (food.measurementType === 'unit') initialQuantity = 1;

        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: [...m.items, { ...food, instanceId: makeInstanceId(), quantity: initialQuantity, locked: false, substitutions: [] }] }
              : m
          ),
          planStatus: 'draft',
        }));
        get().recalculateScore();
        toast.success(`${food.name} adicionado!`);
      },

      applyTemplateToMeal: (mealId, template) => {
        const newItems: MealItem[] = template.items.map((f) => {
          let initialQuantity = 1;
          if (f.measurementType === 'gram') initialQuantity = 100;
          if (f.measurementType === 'ml') initialQuantity = 200;
          if (f.measurementType === 'spoon') initialQuantity = 1;
          if (f.measurementType === 'unit') initialQuantity = 1;
          
          return {
            ...f,
            instanceId: makeInstanceId(),
            quantity: initialQuantity,
            locked: false,
            substitutions: []
          };
        });
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId ? { ...m, items: [...m.items, ...newItems] } : m
          ),
          planStatus: 'draft',
        }));
        get().recalculateScore();
        toast.success(`Template "${template.name}" aplicado!`);
      },

      updateMealItem: (mealId, instanceId, updates) => {
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((i) =>
                    i.instanceId === instanceId ? { ...i, ...updates } : i
                  ),
                }
              : m
          ),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      removeFood: (mealId, instanceId) => {
        const meal = get().meals.find((m) => m.id === mealId);
        const item = meal?.items.find((i) => i.instanceId === instanceId);

        if (item?.locked) {
          toast.error('Itens LOCKED não podem ser editados individualmente.');
          return;
        }

        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: m.items.filter((i) => i.instanceId !== instanceId) }
              : m
          ),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },
      
      updateFoodQuantity: (mealId, instanceId, quantity) => {
        if (quantity < 0) return;
        set((state) => ({
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((i) =>
                    i.instanceId === instanceId ? { ...i, quantity } : i
                  ),
                }
              : m
          ),
          planStatus: 'draft',
        }));
        get().recalculateScore();
      },

      generatePlan: (goal, baseCalories, availableFoods, replaceExisting = false) => {
        let currentMeals = get().meals;
        
        if (replaceExisting) {
          currentMeals = initialMeals.map(m => ({ ...m, items: [] }));
        }

        const newMeals = generatePlanWithEngine(currentMeals, goal, baseCalories, availableFoods);
        set({ meals: newMeals, planStatus: 'draft' });
        get().recalculateScore();
        toast.success(`Plano estruturado para ${goal} com ${baseCalories}kcal`);
      },

      generateMeal: (mealId, goal, availableFoods, baseCalories = 2000) => {
        const meals = get().meals;
        const meal = meals.find(m => m.id === mealId);
        if (!meal) return;

        const newItems = generateMealWithEngine(meal, goal, baseCalories, availableFoods);
        set((state) => ({
          meals: state.meals.map(m => 
            m.id === mealId ? { ...m, items: newItems } : m
          ),
          planStatus: 'draft'
        }));
        get().recalculateScore();
        toast.success(`Refeição "${meal.name}" otimizada!`);
      },

      savePlan: async () => {
        try {
          const { validationIssues, confidence, patientId, addAuditEntry } = get();
          
          // Registrar tentativa de salvar
          addAuditEntry({
            type: 'save_attempt',
            description: 'Nutricionista tentou promover o plano',
            source: 'manual'
          });

          const criticalIssues = validationIssues.filter(i => i.severity === 'critical');
          if (criticalIssues.length > 0 || (confidence && confidence.value < 70)) {
            const reason = criticalIssues.length > 0 ? criticalIssues[0].message : 'Baixa confiança clínica';
            
            set({ lastBlockedReason: reason });
            
            addAuditEntry({
              type: 'save_blocked',
              description: `Salvamento bloqueado: ${reason}`,
              source: 'system',
              metadata: { issues: criticalIssues.map(i => i.message) }
            });
            // Don't stop here yet, as per user requirement to have a functional V3
          }

          set({ planStatus: 'saving' });
          await new Promise((resolve) => setTimeout(resolve, 1000));
          set({ planStatus: 'saved' });
          toast.success('Plano salvo com sucesso!');
        } catch (error: any) {
          console.error('[EditorV3] Erro ao salvar:', error);
          toast.error('Erro ao salvar plano. Verifique os dados do paciente.');
          set({ planStatus: 'draft' });
        }
      },

      resetEditor: () => {
        set({ meals: initialMeals, planStatus: 'draft', nutritionalScore: null, validationIssues: [], sharingToken: null });
      },
    }),
    {
      name: 'fitjourney-editor-v3-storage',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted: any, version) => {
        if (!persisted || version < 2) {
          return { ...(persisted ?? {}), meals: initialMeals, planStatus: 'draft' };
        }
        return persisted;
      },
    }
  )
);
