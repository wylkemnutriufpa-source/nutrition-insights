import { describe, it, expect } from 'vitest';
import { SovereignFatalGuard } from '../sovereign-fatal-guards';

describe('SovereignFatalGuard — Identity Validation', () => {
  it('should allow valid UUIDs', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(() => SovereignFatalGuard.validateIdentity(validUuid, 'test')).not.toThrow();
  });

  it('should block transient "ts" IDs', () => {
    const transientId = 'ts1jo365';
    expect(() => SovereignFatalGuard.validateIdentity(transientId, 'test'))
      .toThrow(/RUPTURA DE IDENTIDADE/);
  });

  it('should block any non-UUID string', () => {
    const invalidId = 'not-a-uuid';
    expect(() => SovereignFatalGuard.validateIdentity(invalidId, 'test'))
      .toThrow(/RUPTURA DE IDENTIDADE/);
  });
});
