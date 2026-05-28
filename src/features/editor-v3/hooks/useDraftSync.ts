
import { useEffect, useRef, useState, useCallback } from 'react';
import { Meal, AuditLogEntry } from '../types';
import { loadOrCreateDraft, saveDraft, discardDraft, type DraftRecord } from '../services/draftService';
import { normalizeMeals } from '../utils/normalization';
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
      const remoteMeals = normalizeMeals(draft.payload?.meals ?? seedMeals);
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
  }, [patientId, planId, JSON.stringify(seedMeals)]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const debounceSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  const scheduleSave = useCallback(async (meals: Meal[], auditLog: AuditLogEntry[]) => {
    if (isLocked || !draftId) return;

    // 🛡️ DEBOUNCE 2s: Evita salvar a cada keystroke, acumula mudanças
    if (debounceSaveRef.current) {
      clearTimeout(debounceSaveRef.current);
    }

    debounceSaveRef.current = setTimeout(async () => {
      setSyncState('saving');

      // 🛡️ Validação: Não sobrescrever rascunho saudável por zerado
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
          setSnapshot(meals);
          setSnapshotAuditLog(auditLog);
          setLastSavedAt(updatedRecord.updated_at);
          lastUpdateRef.current = updatedRecord.updated_at;
          setSyncState('saved');
          retryCountRef.current = 0; // Reset contador de retries
        } else {
          setSyncState('offline');
          // 🛡️ Retry limitado (máx 3 tentativas, com backoff)
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1;
            const backoff = retryCountRef.current * 2000;
            console.warn(`[useDraftSync] Offline. Retry ${retryCountRef.current}/${MAX_RETRIES} em ${backoff}ms`);
            debounceSaveRef.current = setTimeout(() => scheduleSave(meals, auditLog), backoff);
          } else {
            console.error('[useDraftSync] Max retries atingido. Desistindo.');
            retryCountRef.current = 0;
          }
        }
      } catch (error) {
        console.error('[useDraftSync] Erro ao salvar:', error);
        setSyncState('error');
        // 🛡️ Retry limitado em caso de erro
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          const backoff = retryCountRef.current * 3000;
          debounceSaveRef.current = setTimeout(() => scheduleSave(meals, auditLog), backoff);
        } else {
          retryCountRef.current = 0;
        }
      }
    }, 2000); // Debounce de 2 segundos
  }, [draftId, isLocked, snapshot]);

  const resetDraft = async () => {
    if (draftId) {
      console.log("[DraftSync] Discarding draft:", draftId);
      // 🔥 SPRINT PRODUÇÃO: Limpeza física total para evitar ressurgimento de dados fantasmas (ovos do Igor)
      // O draft_status 'discarded' ainda permitia recuperação em alguns fluxos de busca
      const { error } = await supabase.from('v3_drafts').delete().eq('id', draftId);
      if (error) {
        console.warn("[DraftSync] Soft delete fallback for discarded draft status");
        await discardDraft(draftId);
      }
    }
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

  // Cleanup: cancelar debounce pendente ao desmontar
  useEffect(() => {
    return () => {
      if (debounceSaveRef.current) {
        clearTimeout(debounceSaveRef.current);
      }
    };
  }, []);

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
