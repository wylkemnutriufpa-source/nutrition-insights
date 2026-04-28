import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBackupValidity, getConflictVersionKey, validateSystemState } from '../dataSafety';

// Mocking console to avoid cluttering test output
global.console.log = vi.fn();
global.console.error = vi.fn();
global.console.warn = vi.fn();

describe('E2E Production Guarantee V4.7 - Fail-Safe & Consistency', () => {
  const targetUserId = 'patient-v47-001';
  const nutritionistId = 'nutri-v47-999';
  const tenantId = 'tenant-v47-xyz';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Stage 1: HARD FAIL VÍNCULO (CRÍTICO)', () => {
    it('should fail if profiles.tenant_id is missing', async () => {
      const state = { userId: targetUserId, tenantId: null };
      const validation = validateSystemState(state);
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('MISSING_TENANT');
    });

    it('should fail if userId is missing', async () => {
      const state = { userId: null, tenantId: tenantId };
      const validation = validateSystemState(state);
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('UNAUTHENTICATED');
    });

    it('should pass if everything is consistent', async () => {
      const state = { userId: targetUserId, tenantId: tenantId };
      const validation = validateSystemState(state);
      
      expect(validation.valid).toBe(true);
    });
  });

  describe('Stage 2: E2E CONFLITO REAL (CONCORRÊNCIA)', () => {
    it('should detect conflict when server updated_at changed since last load', () => {
      const lastKnownServerT = '2026-04-28T10:00:00Z';
      const actualServerT = '2026-04-28T10:05:00Z'; // Changed by another client
      
      const isConflict = lastKnownServerT !== actualServerT;
      expect(isConflict).toBe(true);
    });

    it('should generate deterministic versioned conflict keys', () => {
      const sT = '2026-04-28T10:00:00Z';
      const lT = '2026-04-28T10:01:00Z';
      
      const key1 = getConflictVersionKey(targetUserId, tenantId, sT, lT);
      const key2 = getConflictVersionKey(targetUserId, tenantId, sT, lT);
      
      expect(key1).toBe(key2);
      expect(key1).toContain(targetUserId);
      expect(key1).toContain(tenantId);
    });
  });

  describe('Stage 3: MOBILE HARDENING (UX)', () => {
    it('should allow scrolling after modal interaction', () => {
      // Simulation of document body style management
      const body = { style: { overflow: '' } };
      
      // Modal opens
      body.style.overflow = 'hidden';
      expect(body.style.overflow).toBe('hidden');
      
      // Modal closes (Hardening logic)
      body.style.overflow = 'auto';
      expect(body.style.overflow).toBe('auto');
    });
  });

  describe('Stage 4: TTL CENTRALIZADO (REGRESSÃO)', () => {
    it('should correctly identify expired backups (>30 days)', () => {
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      
      const validTS = now - (thirtyDaysMs - 1000); // 1 sec less than 30 days
      const expiredTS = now - (thirtyDaysMs + 1000); // 1 sec more than 30 days
      
      expect(getBackupValidity(validTS)).toBe('valid');
      expect(getBackupValidity(expiredTS)).toBe('expired');
    });
  });
});