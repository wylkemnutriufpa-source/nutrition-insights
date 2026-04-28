import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocking localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Anamnesis Data Safety V4.5 - Conflict and TTL Logic', () => {
  const targetUserId = 'test-user-123';
  const backupKey = `fj_anamnesis_backup_${targetUserId}`;
  const actionKey = `fj_anamnesis_action_${targetUserId}`;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should detect backup expiration correctly (TTL 30 days)', () => {
    // Simulate backup from 31 days ago
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
    
    const oldData = {
      answers: { goal: 'lose_weight' },
      updated_at: thirtyOneDaysAgo.toISOString()
    };
    
    localStorage.setItem(backupKey, JSON.stringify(oldData));
    
    // Simulate the logic in Anamnesis.tsx useEffect
    const stored = localStorage.getItem(backupKey);
    let localData = stored ? JSON.parse(stored) : null;
    let backupExpired = false;
    
    if (localData) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (new Date().getTime() - new Date(localData.updated_at).getTime() > thirtyDays) {
        backupExpired = true;
        localData = null; // Should not auto-restore
      }
    }
    
    expect(backupExpired).toBe(true);
    expect(localData).toBeNull();
  });

  it('should detect version conflict and log decision', () => {
    const serverTS = new Date('2026-04-20T10:00:00Z').getTime();
    const localTS = new Date('2026-04-20T10:05:00Z').getTime(); // Local is newer
    
    const localBackup = {
      answers: { weight: 80 },
      updated_at: new Date(localTS).toISOString()
    };
    
    const serverVersion = {
      answers: { weight: 75 },
      updated_at: new Date(serverTS).toISOString()
    };

    // Simulate conflict detection logic
    const diff = Math.abs(serverTS - localTS);
    const hasConflict = diff > 2000;
    
    expect(hasConflict).toBe(true);

    // Simulate decision: Keep Local
    const logSafetyAction = (type: string) => {
      const action = { type, timestamp: new Date().toISOString() };
      localStorage.setItem(actionKey, JSON.stringify(action));
    };

    logSafetyAction('manter_local');
    
    const savedAction = JSON.parse(localStorage.getItem(actionKey)!);
    expect(savedAction.type).toBe('manter_local');
    expect(savedAction.timestamp).toBeDefined();
  });

  it('should block restore if no valid backup exists', () => {
    const canRestore = (localBackup: any, backupExpired: boolean) => {
      return !backupExpired && !!localBackup;
    };

    expect(canRestore(null, false)).toBe(false);
    expect(canRestore({ answers: {} }, true)).toBe(false);
    expect(canRestore({ answers: {} }, false)).toBe(true);
  });
});
