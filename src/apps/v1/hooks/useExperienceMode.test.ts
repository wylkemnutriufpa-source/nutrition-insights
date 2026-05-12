import { describe, it, expect } from 'vitest';
import { checkFeaturePermission } from './useExperienceMode';

describe('useExperienceMode - checkFeaturePermission', () => {
  it('should allow basic features in basic mode for patient', () => {
    expect(checkFeaturePermission('diet', 'basic', 'patient')).toBe(true);
    expect(checkFeaturePermission('recipes', 'basic', 'patient')).toBe(true);
  });

  it('should deny pro features in basic mode for patient', () => {
    expect(checkFeaturePermission('progress', 'basic', 'patient')).toBe(false);
    expect(checkFeaturePermission('achievements', 'basic', 'patient')).toBe(false);
  });

  it('should allow pro features in pro mode for patient', () => {
    expect(checkFeaturePermission('progress', 'pro', 'patient')).toBe(true);
    expect(checkFeaturePermission('achievements', 'pro', 'patient')).toBe(true);
  });

  it('should allow all features in advanced mode', () => {
    expect(checkFeaturePermission('any-feature', 'advanced', 'patient')).toBe(true);
    expect(checkFeaturePermission('any-feature', 'advanced', 'nutritionist')).toBe(true);
  });

  it('should handle mode-based features (minMode logic)', () => {
    expect(checkFeaturePermission('pro', 'basic', 'patient')).toBe(false);
    expect(checkFeaturePermission('pro', 'pro', 'patient')).toBe(true);
    expect(checkFeaturePermission('pro', 'advanced', 'patient')).toBe(true);
  });

  it('should handle nutritionist specific features', () => {
    expect(checkFeaturePermission('patients', 'basic', 'nutritionist')).toBe(true);
    expect(checkFeaturePermission('analytics', 'basic', 'nutritionist')).toBe(false);
    expect(checkFeaturePermission('analytics', 'pro', 'nutritionist')).toBe(true);
  });
});
