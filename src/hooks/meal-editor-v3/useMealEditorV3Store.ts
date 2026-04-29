import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { QUICK_FOODS, MARMITAS } from './constants';
import { getEquivalentFoods, applyClinicalRules, ClinicalLog } from './clinicalRules';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HouseholdMeasure {
  unit: string;
  factor: number; // multiplier for the base quantity (usually grams)
}

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionValue: number;
  portionUnit: string;
  isMarmita?: boolean;
  locked?: boolean;
  imageUrl?: string;
  usageCount?: number;
  householdMeasures?: HouseholdMeasure[];
}

export interface MealItem extends Food {
  instanceId: string;
  quantity: number; 
  selectedUnit?: string;
  substitutions?: Food[];
}

export interface Meal {
  id: string;
  name: string;
  items: MealItem[];
  daySubstitutions?: Record<string, string>; // dayId -> instanceId
  selectionMode?: 'day' | 'week';
  time?: string; // HH:MM
  icon?: string; // sun | coffee | utensils | moon | star | apple
}

interface HistoryState {
  past: Meal[][];
  future: Meal[][];
}

interface MealPlanState {
  patientId: string | null;
  patientTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    isIntolerant?: boolean;
    drinksCoffee?: boolean;
  } | null;
  meals: Meal[];
  activeMealId: string | null;
  fastMode: boolean;
  viewMode: 'day' | 'week';
  activeDay: string;
  history: HistoryState;
  planStatus: 'draft' | 'validated' | 'optimized' | 'syncing' | 'error' | 'success';
  clinicalLog: ClinicalLog | null;
  consistencyMessage: string | null;
  lastActionInsight: string | null;
  availableClinicalRules: any[];
  isPatientView: boolean;
  templates: any[];
  favorites: any[];

  setPatientId: (id: string) => void;
  setActiveMeal: (id: string | null) => void;
  setFastMode: (enabled: boolean) => void;
  setPatientView: (enabled: boolean) => void;
  setViewMode: (mode: 'day' | 'week') => void;
  setActiveDay: (dayId: string) => void;
  
  fetchClinicalRules: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  applyTemplate: (template: any) => void;
  saveAsFavorite: (name: string, type: 'meal' | 'full_plan') => Promise<void>;
  clonePlan: (newPatientId: string, newTargets: any) => void;

  addFoodToMeal: (mealId: string, food: Food) => void;
  removeFoodFromMeal: (mealId: string, instanceId: string) => void;
  updateFoodQuantity: (mealId: string, instanceId: string, quantity: number) => void;
  addSubstitution: (mealId: string, instanceId: string, food: Food) => void;
  removeSubstitution: (mealId: string, instanceId: string, foodId: string) => void;

  duplicateMeal: (mealId: string) => void;
  clearMeal: (mealId: string) => void;
  balanceMacros: (mealId: string, targetKcal: number) => void;
  optimizePlan: () => void;
  validateAndSave: () => Promise<boolean>;

  undo: () => void;
  redo: () => void;
  
  resetPlan: () => void;
  generateDeterministicPlan: (goal: string, context?: any) => Promise<void>;
  setDaySubstitution: (mealId: string, dayId: string, instanceId: string) => void;
  
  // Novas ações
  addMeal: (meal: { name: string; time?: string; icon?: string }) => void;
  renameMeal: (mealId: string, payload: { name?: string; time?: string; icon?: string }) => void;
  deleteMeal: (mealId: string) => void;
  updateFoodUnit: (mealId: string, instanceId: string, unit: string) => void;
  addQuickMeal: (mealTemplate: any) => void;
}

const DEFAULT_MEALS = [
  { id: '1', name: 'Café da Manhã', items: [] },
  { id: '2', name: 'Almoço', items: [] },
  { id: '3', name: 'Lanche da Tarde', items: [] },
  { id: '4', name: 'Jantar', items: [] },
];

const saveHistory = (state: MealPlanState) => ({
  past: [...state.history.past, JSON.parse(JSON.stringify(state.meals))].slice(-30),
  future: [],
});

export const useMealEditorV3Store = create<MealPlanState>()(
  persist(
    (set, get) => ({
      patientId: null,
      patientTargets: null,
      meals: DEFAULT_MEALS,
      activeMealId: '1',
      fastMode: false,
      viewMode: 'day',
      activeDay: 'mon',
      history: { past: [], future: [] },
      planStatus: 'draft',
      clinicalLog: null,
      consistencyMessage: null,
      lastActionInsight: null,
      availableClinicalRules: [],
      isPatientView: false,
      templates: [],
      favorites: [],

      setPatientId: async (id) => {
        const storedFastMode = localStorage.getItem(`fastMode_${id}`);
        
        set({ patientId: id, fastMode: storedFastMode === 'true', planStatus: 'syncing' });

        try {
          // Buscar dados reais da anamnese do paciente
          const { data: anamnesis, error } = await supabase
            .from('patient_anamnesis')
            .select('*')
            .eq('user_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (anamnesis && !error) {
            set({ 
              patientTargets: { 
                calories: Number(anamnesis.computed_kcal_target) || 2000, 
                protein: Number(anamnesis.computed_protein) || 150, 
                carbs: Number(anamnesis.computed_carbs) || 200, 
                fat: Number(anamnesis.computed_fat) || 60,
                isIntolerant: (anamnesis.answers as any)?.restrictions?.toLowerCase().includes('leite') || false,
                drinksCoffee: !(anamnesis.answers as any)?.restrictions?.toLowerCase().includes('café')
              },
              planStatus: 'draft'
            });
            toast.success('Dados do paciente carregados com sucesso');
          } else {
            // Fallback se não houver anamnese
            set({ 
              patientTargets: { 
                calories: 2000, 
                protein: 150, 
                carbs: 200, 
                fat: 60,
                isIntolerant: false,
                drinksCoffee: true
              },
              planStatus: 'draft'
            });
            toast.info('Paciente sem anamnese. Usando alvos padrão.');
          }
        } catch (err) {
          console.error('Erro ao carregar paciente:', err);
          set({ planStatus: 'error' });
        }
      },
      setActiveMeal: (id) => set({ activeMealId: id }),
      setFastMode: (enabled) => {
        const { patientId } = get();
        if (patientId) {
          localStorage.setItem(`fastMode_${patientId}`, enabled.toString());
        }
        set({ fastMode: enabled });
      },
      setPatientView: (enabled) => set({ isPatientView: enabled }),
      setViewMode: (mode) => {
        const { viewMode } = get();
        if (mode === 'week') {
          toast.info('Modo semanal é apenas visualização e escolha de variações');
        }
        set({ viewMode: mode });
      },
      setActiveDay: (dayId) => set({ activeDay: dayId }),

      fetchClinicalRules: async () => {
        const { data } = await supabase
          .from('meal_clinical_rules')
          .select('*')
          .order('condition_name');
        
        if (data) set({ availableClinicalRules: data });
      },

      fetchTemplates: async () => {
        const { data } = await supabase.from('meal_plan_templates').select('*');
        if (data) set({ templates: data });
      },

      applyTemplate: (template) => {
        const { patientTargets, availableClinicalRules, addFoodToMeal } = get();
        let adaptedMeals = JSON.parse(JSON.stringify(template.meals)) as Meal[];

        // --- ETAPA 1 & 2: Clinical Adaptation & Automatic Breakfast Logic ---
        if (template.clinical_condition) {
          const condition = availableClinicalRules.find(r => r.condition_name === template.clinical_condition);
          if (condition) {
            const result = applyClinicalRules(adaptedMeals, condition.id);
            adaptedMeals = result.meals;
            set({ clinicalLog: result.log });
          }
        }

        const isHypertrophy = patientTargets?.calories && patientTargets.calories >= 2500;
        const isWeightLoss = patientTargets?.calories && patientTargets.calories <= 1800;

        adaptedMeals = adaptedMeals.map(meal => ({
          ...meal,
          items: meal.items.filter(item => {
            // Regra: intolerância -> remover leite
            if (patientTargets?.isIntolerant && item.name.toLowerCase().includes('leite')) return false;
            return true;
          }).map(item => {
            if (item.isMarmita || item.locked) return item;
            
            let quantity = item.quantity;
            let name = item.name;
            let calories = item.calories;
            let fat = item.fat;
            let protein = item.protein;

            // --- ETAPA 2: Bebidas automáticas ---
            if (name.toLowerCase().includes('café')) {
              if (patientTargets?.drinksCoffee === false) {
                name = 'Chá de Ervas'; // Não toma café -> Chá
                calories = 1; fat = 0; protein = 0;
              } else if (patientTargets?.isIntolerant && name.toLowerCase().includes('leite')) {
                name = 'Café Preto'; // Intolerante -> Café Preto
                calories = 2; fat = 0; protein = 0;
              } else if (isWeightLoss && name.toLowerCase().includes('leite')) {
                name = 'Café com Leite Desnatado'; // Emagrecimento -> Desnatado
                calories = 37; fat = 0.1; protein = 3.5;
              }
            }

            // --- ETAPA 4: Adaptação Automática por Objetivo ---
            if (isHypertrophy) {
              if (name.toLowerCase().includes('ovo')) quantity += 1; // Aumentar ovos
              if (item.protein > 10) quantity *= 1.3; // Reforçar proteína
            } else if (isWeightLoss) {
              if (item.carbs > 15) quantity *= 0.7; // Reduzir carbo
            }

            return { ...item, name, calories, fat, protein, quantity };
          })
        }));

        // --- ETAPA 3: Lanches Inteligentes (Fruta Base) ---
        adaptedMeals = adaptedMeals.map(meal => {
          if (meal.name.toLowerCase().includes('lanche')) {
            const hasFruit = meal.items.some(i => i.name.toLowerCase().includes('fruta') || i.name.toLowerCase().includes('banana') || i.name.toLowerCase().includes('maçã'));
            if (!hasFruit) {
              const fruitItem = {
                id: 'q6', name: 'Fruta da Estação', calories: 60, protein: 0.5, carbs: 15, fat: 0.1,
                portionValue: 100, portionUnit: 'g', quantity: 1, instanceId: Math.random().toString(36).substring(7)
              };
              meal.items.push(fruitItem);
            }
            
            // Se dia longo (simulado por hipertrofia ou alta caloria) -> Fruta + Proteína
            if (isHypertrophy && !meal.items.some(i => i.protein > 5)) {
              meal.items.push({
                id: 'q1', name: 'Ovo Cozido', calories: 78, protein: 6, carbs: 0.6, fat: 5,
                portionValue: 1, portionUnit: 'un', quantity: 1, instanceId: Math.random().toString(36).substring(7)
              });
            }
          }
          return meal;
        });

        set({ 
          meals: adaptedMeals, 
          planStatus: 'draft',
          lastActionInsight: `Template "${template.name}" aplicado e adaptado 100% via inteligência clínica.`
        });
      },

      saveAsFavorite: async (name, type) => {
        const { meals } = get();
        const userData = (await supabase.auth.getUser()).data.user;
        if (!userData) return;

        const favoriteData = type === 'full_plan' ? meals : meals.find(m => m.id === get().activeMealId);
        if (!favoriteData) return;

        await supabase.from('meal_plan_favorites').insert([{
          name,
          type,
          data: favoriteData as any,
          user_id: userData.id
        }]);
        toast.success('Salvo nos favoritos');
      },

      clonePlan: (newPatientId, newTargets) => {
        const { meals } = get();
        const currentCals = meals.reduce((acc, m) => acc + m.items.reduce((a, i) => a + i.calories * i.quantity, 0), 0);
        const ratio = newTargets.calories / (currentCals || 1);

        const adaptedMeals = meals.map(m => ({
          ...m,
          items: m.items.map(i => i.isMarmita ? i : { ...i, quantity: i.quantity * ratio })
        }));

        set({ 
          patientId: newPatientId, 
          patientTargets: newTargets, 
          meals: adaptedMeals,
          lastActionInsight: 'Plano clonado e adaptado para o novo paciente.'
        });
      },

      addFoodToMeal: (mealId, food) => {
        const { availableClinicalRules, meals, viewMode } = get();
        
        if (viewMode === 'week') {
          toast.error('Não é permitido adicionar alimentos no Modo Semana');
          return;
        }
        
        // Marmitas podem ser adicionadas em qualquer refeição se o profissional assim desejar
        // Removida restrição anterior por solicitação do usuário

        const instanceId = Math.random().toString(36).substring(7);
        const subs = getEquivalentFoods(food.id);
        
        // Bloqueio Preventivo: Se item fere regra clínica ativa, avisar
        if (get().clinicalLog) {
          const condition = availableClinicalRules.find(r => r.id === get().clinicalLog?.conditionId);
          if (condition?.restrictions.some((r: string) => food.name.toLowerCase().includes(r.toLowerCase()))) {
            toast.error(`Atenção: ${food.name} não é recomendado para ${condition.condition_name}`);
          }
        }
        
        set((state) => ({
          history: saveHistory(state),
          planStatus: 'draft',
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: [...m.items, { ...food, instanceId, quantity: 1, substitutions: subs }] }
              : m
          ),
        }));
      },

      removeFoodFromMeal: (mealId, instanceId) => {
        const { meals, viewMode } = get();
        
        if (viewMode === 'week') {
          toast.error('Não é permitido remover alimentos no Modo Semana');
          return;
        }
        const meal = meals.find(m => m.id === mealId);
        const item = meal?.items.find(i => i.instanceId === instanceId);
        
        if (item?.isMarmita || item?.locked) {
          toast.error('Marmitas/Itens bloqueados possuem composição fixa');
          return;
        }

        set((state) => ({
          history: saveHistory(state),
          planStatus: 'draft',
          meals: state.meals.map((m) =>
            m.id === mealId
              ? { ...m, items: m.items.filter((item) => item.instanceId !== instanceId) }
              : m
          ),
        }));
      },

      updateFoodQuantity: (mealId, instanceId, quantity) => {
        const { meals, viewMode } = get();
        
        if (viewMode === 'week') {
          toast.error('Não é permitido editar quantidades no Modo Semana');
          return;
        }
        const meal = meals.find(m => m.id === mealId);
        const item = meal?.items.find(i => i.instanceId === instanceId);
        
        if (item?.isMarmita || item?.locked) {
          toast.error('Marmitas/Itens bloqueados possuem composição fixa');
          return;
        }

        if (isNaN(quantity) || quantity < 0) {
          set({ consistencyMessage: 'Quantidade inválida detectada' });
          return;
        }
        
        set((state) => ({
          history: saveHistory(state),
          planStatus: 'draft',
          consistencyMessage: null,
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((item) =>
                    item.instanceId === instanceId
                      ? { ...item, quantity }
                      : item
                  ),
                }
              : m
          ),
        }));
      },

      updateFoodUnit: (mealId, instanceId, unit) => {
        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((item) =>
                    item.instanceId === instanceId
                      ? { ...item, selectedUnit: unit }
                      : item
                  ),
                }
              : m
          ),
        }));
      },

      addSubstitution: (mealId, instanceId, food) => {
        const { meals } = get();
        const meal = meals.find(m => m.id === mealId);
        const item = meal?.items.find(i => i.instanceId === instanceId);
        
        if (item?.isMarmita || item?.locked) {
          toast.error('Marmitas/Itens bloqueados não podem ser alterados');
          return;
        }

        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((item) =>
                    item.instanceId === instanceId
                      ? { ...item, substitutions: [...(item.substitutions || []), food] }
                      : item
                  ),
                }
              : m
          ),
        }));
      },

      removeSubstitution: (mealId, instanceId, foodId) => {
        const { meals } = get();
        const meal = meals.find(m => m.id === mealId);
        const item = meal?.items.find(i => i.instanceId === instanceId);
        
        if (item?.isMarmita || item?.locked) {
          toast.error('Marmitas/Itens bloqueados não podem ser alterados');
          return;
        }

        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.map((m) =>
            m.id === mealId
              ? {
                  ...m,
                  items: m.items.map((item) =>
                    item.instanceId === instanceId
                      ? {
                          ...item,
                          substitutions: (item.substitutions || []).filter((s) => s.id !== foodId),
                        }
                      : item
                  ),
                }
              : m
          ),
        }));
      },

      duplicateMeal: (mealId) => {
        const { viewMode } = get();
        if (viewMode === 'week') {
          toast.error('Não é permitido duplicar refeições no Modo Semana');
          return;
        }
        set((state) => {
          const meal = state.meals.find(m => m.id === mealId);
          if (!meal) return state;
          const newId = Math.random().toString(36).substring(7);
          return {
            history: saveHistory(state),
            meals: [...state.meals, { ...meal, id: newId, name: `${meal.name} (Cópia)` }]
          };
        });
      },

      clearMeal: (mealId) => {
        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.map(m => m.id === mealId ? { ...m, items: [] } : m)
        }));
      },

      balanceMacros: (mealId, targetKcal) => {
        set((state) => {
          const meal = state.meals.find(m => m.id === mealId);
          if (!meal || meal.items.length === 0) return state;
          
          const currentKcal = meal.items.reduce((acc, item) => acc + (item.calories * item.quantity), 0);
          if (currentKcal === 0) return state;
          const ratio = targetKcal / currentKcal;
          
          return {
            history: saveHistory(state),
            lastActionInsight: `Refeição ajustada para meta de ${targetKcal} kcal`,
            meals: state.meals.map(m => 
              m.id === mealId 
                ? { ...m, items: m.items.map(item => item.isMarmita ? item : { ...item, quantity: item.quantity * ratio }) } 
                : m
            )
          };
        });
      },

      optimizePlan: () => {
        const { meals, patientTargets } = get();
        if (!patientTargets) {
          toast.error('Impossível otimizar sem alvos nutricionais do paciente');
          return;
        }

        const currentTotals = meals.reduce((acc, meal) => {
          meal.items.forEach(item => {
            const currentMeasure = item.householdMeasures?.find(m => m.unit === item.selectedUnit) || { unit: item.portionUnit, factor: 1 };
            acc.calories += item.calories * item.quantity * currentMeasure.factor;
          });
          return acc;
        }, { calories: 0 });

        if (currentTotals.calories === 0) return;

        const ratio = patientTargets.calories / currentTotals.calories;

        set((state) => ({
          history: saveHistory(state),
          planStatus: 'optimized',
          lastActionInsight: `Plano recalibrado para atingir ${Math.round(patientTargets.calories)} kcal`,
          meals: state.meals.map(meal => ({
            ...meal,
            items: meal.items.map(item => item.isMarmita || item.locked 
              ? item 
              : { ...item, quantity: Number((item.quantity * ratio).toFixed(1)) }
            )
          }))
        }));
      },

      validateAndSave: async () => {
        const { meals, patientTargets, patientId, clinicalLog, viewMode } = get();
        
        if (!patientId) {
          toast.error('Selecione um paciente antes de salvar');
          return false;
        }

        const totals = meals.reduce((acc, meal) => {
          meal.items.forEach(item => {
            const currentMeasure = item.householdMeasures?.find(m => m.unit === item.selectedUnit) || { unit: item.portionUnit, factor: 1 };
            const factor = item.quantity * currentMeasure.factor;
            acc.calories += item.calories * factor;
            acc.protein += item.protein * factor;
            acc.carbs += item.carbs * factor;
            acc.fat += item.fat * factor;
          });
          return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

        try {
          // 1. Garantir que o plano exista ou criar um novo
          let { data: existingPlan } = await supabase
            .from('meal_plans')
            .select('id')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let planId = existingPlan?.id;

          if (!planId) {
            const { data: newPlan, error: createError } = await supabase
              .from('meal_plans')
              .insert([{
                patient_id: patientId,
                title: 'Plano Alimentar Ativo',
                total_target_calories: totals.calories,
                total_target_protein: totals.protein,
                total_target_carbs: totals.carbs,
                total_target_fat: totals.fat,
                status: 'active'
              }])
              .select()
              .single();
            
            if (createError) throw createError;
            planId = newPlan.id;
          } else {
            // Atualizar plano existente
            await supabase
              .from('meal_plans')
              .update({
                total_target_calories: totals.calories,
                total_target_protein: totals.protein,
                total_target_carbs: totals.carbs,
                total_target_fat: totals.fat,
                updated_at: new Date().toISOString()
              })
              .eq('id', planId);
          }

          // 2. Limpar itens antigos (para simplicidade nesta v3)
          await supabase.from('meal_plan_items').delete().eq('meal_plan_id', planId);

          // 3. Inserir novos itens
          const itemsToInsert = meals.flatMap(meal => 
            meal.items.map(item => ({
              meal_plan_id: planId,
              meal_type: meal.name.toLowerCase().includes('café') ? 'breakfast' : 
                         meal.name.toLowerCase().includes('almoço') ? 'lunch' : 
                         meal.name.toLowerCase().includes('lanche') ? 'snack' : 'dinner',
              title: item.name,
              description: `Quantidade: ${item.quantity} ${item.selectedUnit || item.portionUnit}`,
              calories_target: item.calories * item.quantity,
              protein_target: item.protein * item.quantity,
              carbs_target: item.carbs * item.quantity,
              fat_target: item.fat * item.quantity,
              day_of_week: null // Plano geral por enquanto
            }))
          );

          if (itemsToInsert.length > 0) {
            const { error: insertError } = await supabase.from('meal_plan_items').insert(itemsToInsert);
            if (insertError) throw insertError;
          }

          if (clinicalLog) {
            await supabase.from('meal_clinical_decision_log').insert([{
              patient_id: patientId,
              condition_applied: clinicalLog.conditionId,
              rules_applied: clinicalLog.appliedRules,
              substitutions: clinicalLog.changes.filter(c => c.type === 'substitution'),
              reasons: clinicalLog.changes.map(c => c.reason)
            }]);
          }

          set({ planStatus: 'validated', consistencyMessage: null });
          toast.success('Plano salvo no prontuário com sucesso!');
          return true;
        } catch (error) {
          console.error('Erro ao salvar plano:', error);
          toast.error('Erro ao sincronizar com o servidor');
          return false;
        }
      },

      validateConsistency: () => {
        const { meals } = get();
        // Verifica se todos os itens em daySubstitutions ainda existem na lista de itens
        for (const meal of meals) {
          if (meal.daySubstitutions) {
            for (const [day, instanceId] of Object.entries(meal.daySubstitutions)) {
              if (!meal.items.some(i => i.instanceId === instanceId)) {
                return false;
              }
            }
          }
        }
        return true;
      },


      undo: () => {
        set((state) => {
          if (state.history.past.length === 0) return state;
          const prev = state.history.past[state.history.past.length - 1];
          return {
            meals: prev,
            history: {
              past: state.history.past.slice(0, -1),
              future: [state.meals, ...state.history.future],
            },
          };
        });
      },

      redo: () => {
        set((state) => {
          if (state.history.future.length === 0) return state;
          const next = state.history.future[0];
          return {
            meals: next,
            history: {
              past: [...state.history.past, state.meals],
              future: state.history.future.slice(1),
            },
          };
        });
      },

      resetPlan: () => set({ meals: DEFAULT_MEALS, history: { past: [], future: [] }, planStatus: 'draft' }),

      generateDeterministicPlan: async (goal, context) => {
        const { patientTargets, patientId, addMeal } = get();
        if (!patientId) {
          toast.error('Selecione um paciente primeiro');
          return;
        }

        const foodMap = QUICK_FOODS.reduce((acc, f) => ({ ...acc, [f.id]: f }), {} as any);
        const createItem = (foodId: string, quantity = 1): MealItem => ({
          ...foodMap[foodId],
          instanceId: Math.random().toString(36).substring(7),
          quantity,
          substitutions: getEquivalentFoods(foodId)
        });

        const targetCals = patientTargets?.calories || 2000;
        const calRatio = targetCals / 2000;
        
        // Estrutura base de refeições
        const meals: Meal[] = [
          { id: '1', name: 'Café da Manhã', items: [], time: '07:30', icon: 'coffee' },
          { id: '2', name: 'Almoço', items: [], time: '12:30', icon: 'utensils' },
          { id: '3', name: 'Lanche da Tarde', items: [], time: '16:00', icon: 'apple' },
          { id: '4', name: 'Jantar', items: [], time: '20:00', icon: 'moon' }
        ];

        const breakfast = meals[0];
        const lunch = meals[1];
        const snack = meals[2];
        const dinner = meals[3];

        // 1. CAFÉ DA MANHÃ
        breakfast.items.push(createItem('q2', Math.max(1, Math.round(2 * calRatio)))); // Pão Integral
        breakfast.items.push(createItem('q1', goal === 'muscle-gain' ? 3 : 2)); // Ovos
        if (patientTargets?.drinksCoffee) {
          breakfast.items.push(createItem('q8', 1)); // Leite
        }

        // 2. ALMOÇO
        if (goal === 'marmitas') {
          lunch.items.push({ ...MARMITAS[0], instanceId: Math.random().toString(36).substring(7), quantity: 1 });
        } else {
          const carbMult = goal === 'low-carb' ? 0.4 : (goal === 'muscle-gain' ? 1.5 : 1.0);
          lunch.items.push(createItem('q10', Math.round(4 * calRatio * carbMult))); // Arroz (colheres)
          lunch.items.push(createItem('q9', Math.round(1.2 * (goal === 'muscle-gain' ? 1.4 : 1.0)))); // Frango
        }

        // 3. LANCHE
        snack.items.push(createItem('q6', 1)); // Banana
        if (goal === 'muscle-gain') {
          snack.items.push(createItem('q20', 1)); // Iogurte com Granola
        }

        // 4. JANTAR
        if (goal === 'marmitas') {
          dinner.items.push({ ...MARMITAS[1], instanceId: Math.random().toString(36).substring(7), quantity: 1 });
        } else {
          const carbMult = goal === 'low-carb' ? 0.2 : (goal === 'muscle-gain' ? 1.2 : 0.8);
          dinner.items.push(createItem('q10', Math.round(3 * calRatio * carbMult))); 
          dinner.items.push(createItem('q9', Math.round(1.0 * (goal === 'muscle-gain' ? 1.3 : 1.0)))); 
        }

        // Adaptações clínicas (Stage 2)
        let finalMeals = meals;
        let finalLog = null;
        if (context?.conditionId || goal.includes('clinical')) {
          const conditionId = context?.conditionId || goal;
          const result = applyClinicalRules(meals, conditionId);
          finalMeals = result.meals;
          finalLog = result.log;
        }

        set((state) => ({ 
          history: saveHistory(state),
          meals: finalMeals, 
          activeMealId: '1',
          planStatus: 'validated',
          clinicalLog: finalLog,
          lastActionInsight: `Plano gerado com sucesso: ${goal} (${Math.round(targetCals)} kcal)`
        }));
      },
      setDaySubstitution: (mealId, dayId, instanceId) => {
        set((state) => {
          const auditLog = `Substituição alterada no dia ${dayId} da refeição ${mealId}`;
          console.log(`[AUDITORIA] ${auditLog}`);
          
          return {
            meals: state.meals.map((m) =>
              m.id === mealId
                ? {
                    ...m,
                    daySubstitutions: {
                      ...(m.daySubstitutions || {}),
                      [dayId]: instanceId,
                    },
                  }
                : m
            ),
            lastActionInsight: `Variação de cardápio salva para ${dayId}`
          };
        });
      },
      addMeal: ({ name, time, icon }) => {
        set((state) => {
          const newId = Math.random().toString(36).substring(7);
          const newMeal: Meal = { id: newId, name, time, icon, items: [] };
          return {
            history: saveHistory(state),
            meals: [...state.meals, newMeal],
            activeMealId: newId,
            lastActionInsight: `Refeição "${name}" adicionada`
          };
        });
      },
      renameMeal: (mealId, payload) => {
        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.map((m) =>
            m.id === mealId ? { ...m, ...payload } : m
          )
        }));
      },
      deleteMeal: (mealId) => {
        set((state) => ({
          history: saveHistory(state),
          meals: state.meals.filter((m) => m.id !== mealId),
          activeMealId: state.activeMealId === mealId ? state.meals[0]?.id || null : state.activeMealId
        }));
      },
      addQuickMeal: (template) => {
        set((state) => {
          const newId = Math.random().toString(36).substring(7);
          const newMeal: Meal = { 
            id: newId, 
            name: template.name, 
            items: [{ ...template, instanceId: Math.random().toString(36).substring(7), quantity: 1 }],
            time: '08:00',
            icon: 'zap'
          };
          return {
            history: saveHistory(state),
            meals: [...state.meals, newMeal],
            activeMealId: newId,
            lastActionInsight: `Refeição rápida "${template.name}" adicionada`
          };
        });
      },
    }),
    {
      name: 'meal-editor-v3-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        meals: state.meals,
        patientTargets: state.patientTargets,
        fastMode: state.fastMode
      }),
    }
  )
);
