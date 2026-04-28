
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSystemDecision } from '../governance';

// Mock system state
const createMockState = (overrides = {}) => ({
  pathname: '/',
  user: { id: 'user-123' },
  profile: { id: 'profile-123', tenant_id: 'tenant-123' },
  journeyStatus: 'onboarding_active',
  mode: 'patient',
  role: 'patient',
  isReady: true,
  isDegraded: false,
  isHybrid: false,
  isPatientContext: true,
  ...overrides
});

describe('V3 Vanguard Certification - E2E Decision Flow', () => {
  
  it('STAGE 1: New Patient via Link -> Consent', () => {
    const state = createMockState({
      journeyStatus: 'lead_created',
      pathname: '/'
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('REDIRECT');
    expect(decision.target).toBe('/consent');
    expect(decision.reason).toContain('onboarding');
  });

  it('STAGE 2: Consent Accepted -> Onboarding', () => {
    const state = createMockState({
      journeyStatus: 'onboarding_active',
      pathname: '/'
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('REDIRECT');
    expect(decision.target).toBe('/onboarding');
  });

  it('STAGE 3: Onboarding Active but on Anamnesis Page -> ALLOW', () => {
    const state = createMockState({
      journeyStatus: 'onboarding_active',
      pathname: '/anamnesis'
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('ALLOW');
  });

  it('STAGE 4: Active Patient -> Dashboard (Allow access to patient routes)', () => {
    const state = createMockState({
      journeyStatus: 'active',
      pathname: '/my-diet'
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('ALLOW');
  });

  it('STAGE 5: Orphan Patient Protection', () => {
    const state = createMockState({
      profile: { is_orphan: true },
      pathname: '/my-diet'
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('REDIRECT');
    expect(decision.target).toBe('/settings');
  });

  it('STAGE 6: Version Mismatch Protection', () => {
    const state = createMockState({
      versionMismatch: true
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('RELOAD');
  });

  it('STAGE 7: Professional accessing Patient Route -> Block/Redirect', () => {
    const state = createMockState({
      role: 'professional',
      pathname: '/my-diet'
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('REDIRECT');
    expect(decision.target).toBe('/');
  });
});
