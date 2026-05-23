import { describe, it, expect } from 'vitest';
import { assertChannelNameStable } from '../../lib/sovereign/invariantAssertions';

describe('Forensic: Realtime Stability', () => {
  it('should reject channel names with timestamps', () => {
    const invalidName = `plan_updates_${Date.now()}`;
    expect(() => assertChannelNameStable(invalidName, 'test')).toThrow();
  });

  it('should accept stable channel names', () => {
    const validName = 'plan_updates_patient_123';
    expect(() => assertChannelNameStable(validName, 'test')).not.toThrow();
  });
});
