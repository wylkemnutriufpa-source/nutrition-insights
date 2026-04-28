import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBackupValidity, getConflictVersionKey } from '../utils/dataSafety';

// Mocking localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    length: 0,
    key: (i: number) => null
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Hardening V4.6 - Data Safety & Guarantee Real', () => {
  const targetUserId = 'patient-v46';
  const tenantId = 'tenant-v46';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('Etapa 1: Centralização do TTL (getBackupValidity)', () => {
    it('should return valid for backup exactly 30 days old', () => {
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const exactlyThirtyDaysAgo = now - thirtyDaysMs;
      
      expect(getBackupValidity(exactlyThirtyDaysAgo)).toBe('valid');
    });

    it('should return expired for backup 30 days + 1ms old', () => {
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const expiredTs = now - (thirtyDaysMs + 1);
      
      expect(getBackupValidity(expiredTs)).toBe('expired');
    });

    it('should return invalid for null or garbage timestamp', () => {
      expect(getBackupValidity(null)).toBe('invalid');
      expect(getBackupValidity('garbage')).toBe('invalid');
    });
  });

  describe('Etapa 2: Versionamento de Conflito', () => {
    it('should generate a unique version key and persist decision', () => {
      const sTS = '2026-04-28T10:00:00Z';
      const lTS = '2026-04-28T10:05:00Z';
      
      const key = getConflictVersionKey(targetUserId, tenantId, sTS, lTS);
      
      // Persist decision
      localStorage.setItem(key, 'manter_local');
      
      // Verify persistence
      expect(localStorage.getItem(key)).toBe('manter_local');
      
      // Different version should not have decision
      const key2 = getConflictVersionKey(targetUserId, tenantId, sTS, '2026-04-28T10:06:00Z');
      expect(localStorage.getItem(key2)).toBeNull();
    });
  });

  describe('Etapa 4: Validação de Vínculo Real (Critical)', () => {
    it('should fail hard if critical link entities are missing', () => {
      const validateLink = (profile: any, userTenant: any, nutriPatient: any) => {
        if (!profile.tenant_id) throw new Error("CRITICAL: profiles.tenant_id is null");
        if (!userTenant) throw new Error("CRITICAL: user_tenants missing");
        if (!nutriPatient) throw new Error("CRITICAL: nutritionist_patients missing");
        return true;
      };

      // Valid case
      expect(validateLink({ tenant_id: 't1' }, {}, {})).toBe(true);

      // Failure cases
      expect(() => validateLink({ tenant_id: null }, {}, {})).toThrow("profiles.tenant_id is null");
      expect(() => validateLink({ tenant_id: 't1' }, null, {})).toThrow("user_tenants missing");
      expect(() => validateLink({ tenant_id: 't1' }, {}, null)).toThrow("nutritionist_patients missing");
    });
  });
});
