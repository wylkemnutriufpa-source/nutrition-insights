
import { useEffect, useRef, useState, useCallback } from 'react';
import { Meal, AuditLogEntry } from '../types';
import { loadOrCreateDraft, saveDraft, discardDraft, type DraftRecord } from '../services/draftService';
import { toast } from 'sonner';
import { SovereignMonitor } from '@/lib/sovereignMonitor';

type SyncState = 'idle' | 'loading' | 'saving' | 'saved' | 'offline' | 'error' | 'conflict';

// 🛡️ SOBERANIA V5: REMOVIDA PERSISTÊNCIA LOCAL PARA EVITAR CONFLITOS DE VERSÃO
// A verdade reside exclusivamente no servidor.

interface UseDraftSyncReturn {
  draftId: string | null;
  syncState: SyncState;
  initialMeals: Meal[] | null;
  initialAuditLog: AuditLogEntry[];
  lastSavedAt: string | null;
  sharingToken: string | null;

  /** Chama após cada mutação local — debouncado internamente */
  scheduleSave: (meals: Meal[], auditLog: AuditLogEntry[]) => void;
  /** Marca o draft atual como descartado */
  resetDraft: () => Promise<void>;
  /** Recarrega do servidor forçadamente */
  reloadFromServer: () => Promise<void>;
  /** Reverte para o último estado salvo com sucesso */
  revertToLastSaved: () => void;
  /** Bloqueia o autosave temporariamente para evitar race conditions durante save manual */
  setLocked: (locked: boolean) => void;
}

export function useDraftSync(
  patientId: string | null, 
  seedMeals: Meal[], 
  currentMeals: Meal[],
  planId?: string | null
): UseDraftSyncReturn {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [initialMeals, setInitialMeals] = useState<Meal[] | null>(null);
  const [initialAuditLog, setInitialAuditLog] = useState<AuditLogEntry[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [sharingToken, setSharingToken] = useState<string | null>(null);
  const [isLocked, setLocked] = useState(false);

  const [snapshot, setSnapshot] = useState<Meal[] | null>(null);
  const [snapshotAuditLog, setSnapshotAuditLog] = useState<AuditLogEntry[]>([]);
  
  const lastUpdateRef = useRef<string | null>(null);

  const loadDraft = useCallback(async (isReload = false) => {
    if (!patientId) {
      setInitialMeals(seedMeals);
      setInitialAuditLog([]);
      setSyncState('idle');
      return;
    }
    setSyncState('loading');

    const draft: DraftRecord | null = await loadOrCreateDraft(patientId, seedMeals, planId);

    if (draft) {
      setDraftId(draft.id);
      const remoteMeals = draft.payload?.meals ?? seedMeals;
      const remoteAuditLog = draft.payload?.audit_log ?? [];
      setInitialMeals(remoteMeals);
      setInitialAuditLog(remoteAuditLog);
      setSnapshot(remoteMeals);
      setSnapshotAuditLog(remoteAuditLog);
      setLastSavedAt(draft.updated_at);
      setSharingToken(draft.sharing_token || null);

      lastUpdateRef.current = draft.updated_at;
      setSyncState('saved');
      if (isReload) toast.success('Rascunho atualizado do servidor.');
    } else {
      setInitialMeals(seedMeals);
      setInitialAuditLog([]);
      setSyncState('offline');
    }
  }, [patientId, planId, seedMeals]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const scheduleSave = useCallback(async (meals: Meal[], auditLog: AuditLogEntry[]) => {
    if (isLocked || !draftId) return;
    
    // 🛡️ SOBERANIA FINAL: SAVE IMEDIATO - SEM DEBOUNCE
    // Optimistic UI: Atualiza local imediatamente
    setSnapshot(meals);
    setSnapshotAuditLog(auditLog);
    setSyncState('saving');

    // Validação: Não sobrescrever rascunho saudável por zerado
    const totalKcal = meals.reduce((s, m) => s + m.items.reduce((sum, i) => sum + (i.kcal || 0), 0), 0);
    if (totalKcal === 0 && snapshot && snapshot.length > 0) {
      const snapshotKcal = snapshot.reduce((s, m) => s + m.items.reduce((sum, i) => sum + (i.kcal || 0), 0), 0);
      if (snapshotKcal > 0) {
        console.error('[Sync-Guard] Tentativa de sobrescrever rascunho saudável por um rascunho ZERADO. Abortando save.');
        setSyncState('error');
        return;
      }
    }

    try {
      const updatedRecord = await saveDraft(draftId, meals, auditLog || []);
      
      if (updatedRecord) {
        SovereignMonitor.log({
          event_type: 'snapshot_render',
          component: 'useDraftSync_Save',
          message: 'Rascunho V3 persistido com sucesso no banco estruturado'
        });
        setLastSavedAt(updatedRecord.updated_at);
        lastUpdateRef.current = updatedRecord.updated_at;
        setSyncState('saved');
      } else {
        setSyncState('offline');
        // Retry automático após 2s
        setTimeout(() => scheduleSave(meals, auditLog), 2000);
      }
    } catch (error) {
      console.error('[useDraftSync] Erro ao salvar:', error);
      setSyncState('error');
      // Retry automático após 3s
      setTimeout(() => scheduleSave(meals, auditLog), 3000);
    }
  }, [draftId, isLocked, snapshot]);

  const resetDraft = async () => {
    if (draftId) await discardDraft(draftId);
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
    sharingToken,

    scheduleSave, 
    resetDraft,
    reloadFromServer: () => loadDraft(true),
    revertToLastSaved,
    setLocked
  };
}
