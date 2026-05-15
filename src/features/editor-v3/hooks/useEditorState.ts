import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Meal, MealItem, AuditLogEntry, PatientContext } from '../types';

const DEFAULT_MEALS: Meal[] = [
  { id: '1', name: 'Café da Manhã', items: [], time: '08:00' },
  { id: '2', name: 'Lanche da Manhã', items: [], time: '10:30' },
  { id: '3', name: 'Almoço', items: [], time: '13:00' },
  { id: '4', name: 'Lanche da Tarde', items: [], time: '16:00' },
  { id: '5', name: 'Jantar', items: [], time: '19:30' },
  { id: '6', name: 'Ceia', items: [], time: '22:00' },
];

interface EditorState {
  meals: Meal[];
  auditLog: AuditLogEntry[];
  patientId: string | null;
  planStatus: 'draft' | 'saving' | 'saved';
  nutritionalScore: any;
  validationIssues: any[];
  goalMetadata: any;
  clinicalMode: boolean;
  lastBlockedReason: string | null;
  patientContext: PatientContext | null;
  sharingToken: string | null;
  confidence: any;
  initialMeals: Meal[]; 
  viewMode: 'daily' | 'weekly';
  setViewMode: (mode: 'daily' | 'weekly') => void;
  setPatientId: (id: string) => void;
  hydrateMeals: (meals: Meal[], auditLog?: AuditLogEntry[], sharingToken?: string) => void;
  updateMealItem: (mealId: string, instanceId: string, updates: Partial<MealItem>) => Promise<void>;
  savePlan: () => Promise<void>;
  resetEditor: () => void;
  recalculateScore: () => void;
}

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
      setPatientId: (id) => set({ patientId: id }),
      hydrateMeals: (meals) => set({ meals, planStatus: 'saved' }),
      updateMealItem: async (mealId, instanceId, updates) => {
        set((state) => ({
          meals: state.meals.map(m => m.id === mealId ? {
            ...m,
            items: m.items.map(i => i.instanceId === instanceId ? { ...i, ...updates } : i)
          } : m)
        }));
      },
      savePlan: async () => { set({ planStatus: 'saved' }); },
      resetEditor: () => set({ meals: DEFAULT_MEALS, planStatus: 'draft' }),
      recalculateScore: () => {},
    }),
    { name: 'fitjourney-editor-v3-storage', version: 3, storage: createJSONStorage(() => localStorage) }
  )
);