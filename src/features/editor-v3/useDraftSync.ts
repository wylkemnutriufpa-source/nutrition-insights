import { useEffect, useRef, useState } from 'react';
import { Meal } from './types';
import { loadOrCreateDraft, saveDraft, discardDraft, type DraftRecord } from './draftService';

type SyncState = 'idle' | 'loading' | 'saving' | 'saved' | 'offline' | 'error';

const LOCAL_FALLBACK_KEY = (patientId: string) => `fitjourney-v3-fallback-${patientId}`;

interface UseDraftSyncReturn {
  draftId: string | null;
  syncState: SyncState;
  initialMeals: Meal[] | null;
  /** Chama após cada mutação local — debouncado internamente */
  scheduleSave: (meals: Meal[]) => void;
  /** Marca o draft atual como descartado e limpa fallback local */
  resetDraft: () => Promise<void>;
}

/**
 * Sincroniza o estado do Editor V3 com a tabela `v3_drafts`.
 * - Carrega ou cria o draft "editing" do par (nutricionista, paciente).
 * - Faz auto-save com debounce.
 * - Em caso de falha de rede/RLS, persiste em localStorage como fallback.
 */
export function useDraftSync(patientId: string | null, seedMeals: Meal[]): UseDraftSyncReturn {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [initialMeals, setInitialMeals] = useState<Meal[] | null>(null);
  const debounceRef = useRef<number | null>(null);
  const pendingMealsRef = useRef<Meal[] | null>(null);

  // Bootstrap: carrega/cria draft
  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    setSyncState('loading');

    (async () => {
      const draft: DraftRecord | null = await loadOrCreateDraft(patientId, seedMeals);
      if (cancelled) return;

      if (draft) {
        setDraftId(draft.id);
        setInitialMeals(draft.payload?.meals ?? seedMeals);
        setSyncState('saved');
      } else {
        // Fallback: tenta recuperar do localStorage
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
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const scheduleSave = (meals: Meal[]) => {
    if (!patientId) return;
    pendingMealsRef.current = meals;

    // Sempre escreve no fallback local imediatamente
    try {
      localStorage.setItem(LOCAL_FALLBACK_KEY(patientId), JSON.stringify({ meals }));
    } catch {}

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (!draftId) return;
      const snapshot = pendingMealsRef.current;
      if (!snapshot) return;

      setSyncState('saving');
      const ok = await saveDraft(draftId, snapshot);
      setSyncState(ok ? 'saved' : 'offline');
    }, 800);
  };

  const resetDraft = async () => {
    if (draftId) {
      await discardDraft(draftId);
    }
    if (patientId) {
      localStorage.removeItem(LOCAL_FALLBACK_KEY(patientId));
    }
    setDraftId(null);
    setInitialMeals(null);
    setSyncState('idle');
  };

  return { draftId, syncState, initialMeals, scheduleSave, resetDraft };
}
