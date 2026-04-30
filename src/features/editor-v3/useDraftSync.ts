import { useEffect, useRef, useState, useCallback } from 'react';
import { Meal } from './types';
import { loadOrCreateDraft, saveDraft, discardDraft, type DraftRecord } from './draftService';
import { toast } from 'sonner';

type SyncState = 'idle' | 'loading' | 'saving' | 'saved' | 'offline' | 'error' | 'conflict';

const LOCAL_FALLBACK_KEY = (patientId: string | null) => `fitjourney-v3-fallback-${patientId || 'sandbox'}`;

interface UseDraftSyncReturn {
  draftId: string | null;
  syncState: SyncState;
  initialMeals: Meal[] | null;
  lastSavedAt: string | null;
  /** Chama após cada mutação local — debouncado internamente */
  scheduleSave: (meals: Meal[]) => void;
  /** Marca o draft atual como descartado e limpa fallback local */
  resetDraft: () => Promise<void>;
  /** Recarrega do servidor forçadamente (resolve conflito) */
  reloadFromServer: () => Promise<void>;
  /** Reverte para o último estado salvo com sucesso */
  revertToLastSaved: () => void;
}

export function useDraftSync(patientId: string | null, seedMeals: Meal[], currentMeals: Meal[]): UseDraftSyncReturn {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [initialMeals, setInitialMeals] = useState<Meal[] | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Meal[] | null>(null);
  
  const debounceRef = useRef<number | null>(null);
  const pendingMealsRef = useRef<Meal[] | null>(null);
  const lastUpdateRef = useRef<string | null>(null);

  const loadDraft = useCallback(async (isReload = false) => {
    if (!patientId) {
      // Sandbox mode: try loading from local storage
      const local = localStorage.getItem(LOCAL_FALLBACK_KEY(null));
      if (local) {
        try {
          const parsed = JSON.parse(local) as { meals: Meal[] };
          setInitialMeals(parsed.meals);
          setSnapshot(parsed.meals);
        } catch {
          setInitialMeals(seedMeals);
        }
      } else {
        setInitialMeals(seedMeals);
      }
      setSyncState('idle');
      return;
    }
    setSyncState('loading');

    const draft: DraftRecord | null = await loadOrCreateDraft(patientId, seedMeals);

    if (draft) {
      setDraftId(draft.id);
      setInitialMeals(draft.payload?.meals ?? seedMeals);
      setSnapshot(draft.payload?.meals ?? seedMeals);
      setLastSavedAt(draft.updated_at);
      lastUpdateRef.current = draft.updated_at;
      setSyncState('saved');
      if (isReload) toast.success('Rascunho atualizado do servidor.');
    } else {
      const local = localStorage.getItem(LOCAL_FALLBACK_KEY(patientId));
      if (local) {
        try {
          const parsed = JSON.parse(local) as { meals: Meal[] };
          setInitialMeals(parsed.meals);
        } catch {
          setInitialMeals(seedMeals);
        }
      } else {
        setInitialMeals(seedMeals);
      }
      setSyncState('offline');
    }
  }, [patientId, seedMeals]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const scheduleSave = (meals: Meal[]) => {
    pendingMealsRef.current = meals;
    pendingMealsRef.current = meals;

    try {
      localStorage.setItem(LOCAL_FALLBACK_KEY(patientId), JSON.stringify({ meals }));
    } catch {}

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (!draftId) return;
      const mealsToSave = pendingMealsRef.current;
      if (!mealsToSave) return;

      // Antes de salvar, verifica se houve mudança remota (multi-aba)
      // Fazemos isso via loadOrCreateDraft rápido ou apenas confiamos no update que retornará o novo estado
      setSyncState('saving');
      const updatedRecord = await saveDraft(draftId, mealsToSave);
      
      if (updatedRecord) {
        // Se o updated_at que o banco gerou é muito diferente do que esperávamos (concorrência)
        // O Supabase trigger handle_updated_at sempre atualiza.
        // Como o update é cego, em um sistema real faríamos um check de version/updated_at no WHERE.
        // Para o MVP: se o record retornado tem updated_at > nosso lastSavedAt + delta, houve conflito detectado pós-save?
        // Na verdade, o ideal é detectar ANTES ou usar o retorno.
        
        setLastSavedAt(updatedRecord.updated_at);
        lastUpdateRef.current = updatedRecord.updated_at;
        setSnapshot(mealsToSave);
        setSyncState('saved');
      } else {
        setSyncState('offline');
      }
    }, 800);
  };

  const resetDraft = async () => {
    if (draftId) await discardDraft(draftId);
    if (patientId) localStorage.removeItem(LOCAL_FALLBACK_KEY(patientId));
    setDraftId(null);
    setInitialMeals(null);
    setLastSavedAt(null);
    setSnapshot(null);
    setSyncState('idle');
  };

  const revertToLastSaved = () => {
    if (snapshot) {
      setInitialMeals([...snapshot]);
      toast.success('Alterações revertidas para o último save.');
    }
  };

  return { 
    draftId, 
    syncState, 
    initialMeals, 
    lastSavedAt,
    scheduleSave, 
    resetDraft,
    reloadFromServer: () => loadDraft(true),
    revertToLastSaved
  };
}
