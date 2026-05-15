import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface EditorState {
  meals: any[];
  patientId: string | null;
  clinicalMode: boolean;
  setViewMode: (mode: any) => void;
  setPatientId: (id: string) => void;
  hydrateMeals: (meals: any) => void;
  updateMealItem: (mealId: string, itemId: string, updates: any) => Promise<void>;
  savePlan: () => Promise<void>;
  resetEditor: () => void;
  recalculateScore: () => void;
  addMarmitaToMeal: any;
  addFoodToMeal: any;
  applyTemplateToMeal: any;
  removeFood: any;
  updateFoodQuantity: any;
  addMeal: any;
  removeMeal: any;
  updateMealHeader: any;
  addMealWithHeader: any;
  duplicateMeal: any;
  reorderMeal: any;
  updateMealImage: any;
  setMeals: any;
  setGoalMetadata: any;
  setPatientContext: any;
  addAuditEntry: any;
  nutritionalScore: any;
  validationIssues: any[];
  goalMetadata: any;
  patientContext: any;
  confidence: any;
  sharingToken: string | null;
  initialMeals: any[];
  viewMode: string;
}

export const useEditorState = create<EditorState>()(
  persist(
    (set) => ({
      meals: [],
      patientId: null,
      clinicalMode: true,
      nutritionalScore: null,
      validationIssues: [],
      goalMetadata: {},
      patientContext: null,
      confidence: null,
      sharingToken: null,
      initialMeals: [],
      viewMode: 'daily',
      setViewMode: (mode) => set({ viewMode: mode }),
      setPatientId: (id) => set({ patientId: id }),
      hydrateMeals: (meals) => set({ meals }),
      updateMealItem: async () => {},
      savePlan: async () => {},
      resetEditor: () => set({ meals: [] }),
      recalculateScore: () => {},
      addMarmitaToMeal: async () => {},
      addFoodToMeal: async () => {},
      applyTemplateToMeal: () => {},
      removeFood: async () => {},
      updateFoodQuantity: () => {},
      addMeal: () => {},
      removeMeal: () => {},
      updateMealHeader: () => {},
      addMealWithHeader: () => {},
      duplicateMeal: () => {},
      reorderMeal: () => {},
      updateMealImage: () => {},
      setMeals: (m: any) => set({ meals: m }),
      setGoalMetadata: () => {},
      setPatientContext: () => {},
      addAuditEntry: () => {},
    }),
    { name: 'fitjourney-editor-v3-minimal', version: 1, storage: createJSONStorage(() => localStorage) }
  )
);