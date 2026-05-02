import { useEffect, useRef, useState, useCallback } from 'react';
import { Meal, AuditLogEntry } from '../types';
import { loadOrCreateDraft, saveDraft, discardDraft, type DraftRecord } from '../services/draftService';
import { toast } from 'sonner';

type SyncState = 'idle' | 'loading' | 'saving' | 'saved' | 'offline' | 'error' | 'conflict';

const LOCAL_FALLBACK_KEY = (patientId: string | null) => `fitjourney-v3-fallback-${patientId || 'sandbox'}`;

interface UseDraftSyncReturn {
  draftId: string | null;
  syncState: SyncState;
  initialMeals: Meal[] | null;
  initialAuditLog: AuditLogEntry[];
  lastSavedAt: string | null;
  /** Chama após cada mutação local — debouncado internamente */
  scheduleSave: (meals: Meal[], auditLog: AuditLogEntry[]) => void;
  /** Marca o draft atual como descartado e limpa fallback local */
  resetDraft: () => Promise<void>;
  /** Recarrega do servidor forçadamente (resolve conflito) */
  reloadFromServer: () => Promise<void>;
  /** Reverte para o último estado salvo com sucesso */
  revertToLastSaved: () => void;
}

export function useDraftSync(
  patientId: string | null, 
  seedMeals: Meal[], 
  currentMeals: Meal[]
): UseDraftSyncReturn {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [initialMeals, setInitialMeals] = useState<Meal[] | null>(null);
  const [initialAuditLog, setInitialAuditLog] = useState<AuditLogEntry[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Meal[] | null>(null);
  const [snapshotAuditLog, setSnapshotAuditLog] = useState<AuditLogEntry[]>([]);
  
  const debounceRef = useRef<number | null>(null);
  const pendingMealsRef = useRef<Meal[] | null>(null);
  const pendingAuditLogRef = useRef<AuditLogEntry[] | null>(null);
  const lastUpdateRef = useRef<string | null>(null);

  const loadDraft = useCallback(async (isReload = false) => {
    if (!patientId) {
      // Sandbox mode: try loading from local storage
      const local = localStorage.getItem(LOCAL_FALLBACK_KEY(null));
      if (local) {
        try {
          const parsed = JSON.parse(local) as { meals: Meal[], audit_log?: AuditLogEntry[] };
          setInitialMeals(parsed.meals);
          setInitialAuditLog(parsed.audit_log || []);
          setSnapshot(parsed.meals);
          setSnapshotAuditLog(parsed.audit_log || []);
        } catch {
          setInitialMeals(seedMeals);
          setInitialAuditLog([]);
        }
      } else {
        setInitialMeals(seedMeals);
        setInitialAuditLog([]);
      }
      setSyncState('idle');
      return;
    }
    setSyncState('loading');

    const draft: DraftRecord | null = await loadOrCreateDraft(patientId, seedMeals);

    if (draft) {
      setDraftId(draft.id);
      const remoteMeals = draft.payload?.meals ?? seedMeals;
      const remoteAuditLog = draft.payload?.audit_log ?? [];
      setInitialMeals(remoteMeals);
      setInitialAuditLog(remoteAuditLog);
      setSnapshot(remoteMeals);
      setSnapshotAuditLog(remoteAuditLog);
      setLastSavedAt(draft.updated_at);
      lastUpdateRef.current = draft.updated_at;
      setSyncState('saved');
      if (isReload) toast.success('Rascunho atualizado do servidor.');
    } else {
      const local = localStorage.getItem(LOCAL_FALLBACK_KEY(patientId));
      if (local) {
        try {
          const parsed = JSON.parse(local) as { meals: Meal[], audit_log?: AuditLogEntry[] };
          setInitialMeals(parsed.meals);
          setInitialAuditLog(parsed.audit_log || []);
        } catch {
          setInitialMeals(seedMeals);
          setInitialAuditLog([]);
        }
      } else {
        setInitialMeals(seedMeals);
        setInitialAuditLog([]);
      }
      setSyncState('offline');
    }
  }, [patientId, seedMeals]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const scheduleSave = (meals: Meal[], auditLog: AuditLogEntry[]) => {
    pendingMealsRef.current = meals;
    pendingAuditLogRef.current = auditLog;

    try {
      localStorage.setItem(LOCAL_FALLBACK_KEY(patientId), JSON.stringify({ meals, audit_log: auditLog }));
    } catch {}

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (!draftId) return;
      const mealsToSave = pendingMealsRef.current;
      const auditLogToSave = pendingAuditLogRef.current;
      if (!mealsToSave) return;

      setSyncState('saving');
      const updatedRecord = await saveDraft(draftId, mealsToSave, auditLogToSave || []);
      
      if (updatedRecord) {
        setLastSavedAt(updatedRecord.updated_at);
        lastUpdateRef.current = updatedRecord.updated_at;
        setSnapshot(mealsToSave);
        setSnapshotAuditLog(auditLogToSave || []);
        setSyncState('saved');
      } else {
        setSyncState('offline');
      }
    }, 800);
  };

  const resetDraft = async () => {
    if (draftId) await discardDraft(draftId);
    localStorage.removeItem(LOCAL_FALLBACK_KEY(patientId));
    setDraftId(null);
    setInitialMeals(null);
    setInitialAuditLog([]);
    setLastSavedAt(null);
    setSnapshot(null);
    setSnapshotAuditLog([]);
    setSyncState('idle');
  };

  const revertToLastSaved = () => {
    if (snapshot) {
      setInitialMeals([...snapshot]);
      setInitialAuditLog([...snapshotAuditLog]);
      toast.success('Alterações revertidas para o último save.');
    }
  };

  return { 
    draftId, 
    syncState, 
    initialMeals, 
    initialAuditLog,
    lastSavedAt,
    scheduleSave, 
    resetDraft,
    reloadFromServer: () => loadDraft(true),
    revertToLastSaved
  };
}
