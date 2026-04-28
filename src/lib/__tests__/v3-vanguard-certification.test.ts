
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSystemDecision } from '../governance';

// Mock system state
const createMockState = (overrides = {}) => ({
  user: { id: 'user-123', role: 'patient' },
  profile: { id: 'profile-123', tenant_id: 'tenant-123' },
  patientLink: { id: 'link-123', nutritionist_id: 'nut-456', journey_status: 'onboarding_active' },
  anamnesis: null,
  consent: { accepted: true },
  isReady: true,
  isDegraded: false,
  currentPath: '/',
  version: '3.0.0',
  ...overrides
});

describe('V3 Vanguard Certification - E2E Decision Flow', () => {
  
  it('STAGE 1: New Patient via Link -> Consent', () => {
    const state = createMockState({
      patientLink: { journey_status: 'lead_created' },
      consent: { accepted: false },
      currentPath: '/'
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('REDIRECT');
    expect(decision.payload.to).toBe('/consent');
    expect(decision.reason).toContain('consentimento');
  });

  it('STAGE 2: Consent Accepted -> Onboarding/Anamnesis', () => {
    const state = createMockState({
      patientLink: { journey_status: 'onboarding_active' },
      consent: { accepted: true },
      anamnesis: null,
      currentPath: '/'
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('REDIRECT');
    // Governance often points to /onboarding for onboarding_active
    expect(decision.payload.to).toBe('/onboarding');
  });

  it('STAGE 3: Onboarding Active but on Anamnesis Page -> ALLOW', () => {
    const state = createMockState({
      patientLink: { journey_status: 'onboarding_active' },
      consent: { accepted: true },
      currentPath: '/anamnesis'
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('ALLOW');
  });

  it('STAGE 4: Active Patient -> Dashboard', () => {
    const state = createMockState({
      patientLink: { journey_status: 'active' },
      consent: { accepted: true },
      currentPath: '/'
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('REDIRECT');
    expect(decision.payload.to).toBe('/patient-dashboard');
  });

  it('STAGE 5: Orphan Patient Protection', () => {
    const state = createMockState({
      patientLink: null, // No nutritionist link
      profile: { tenant_id: null }, // No tenant
      currentPath: '/patient-dashboard'
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('BLOCK');
    expect(decision.payload.component).toBe('OrphanUserBlock');
  });

  it('STAGE 6: Version Mismatch Protection', () => {
    const state = createMockState({
      versionMismatch: true
    });
    
    const decision = getSystemDecision(state as any);
    expect(decision.type).toBe('FORCE_UPDATE');
  });
});
