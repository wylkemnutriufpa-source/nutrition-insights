import { describe, it, expect } from 'vitest';
import { assertSnapshotIntegrity } from '../../lib/sovereign/invariantAssertions';

describe('Forensic: Patient App Rendering', () => {
  it('should reject snapshots with placeholders', () => {
    const badSnapshot = {
      snapshot_version: 'v3',
      publication_id: '123',
      generated_at: new Date().toISOString(),
      targets: { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 60 },
      days: [{ id: '1', meals: [] }],
      daily_totals: { '1': { kcal: 2000 } },
      clinical_metadata: { engine: 'v3' },
      notes: 'Some text with PLACEHOLDER_VALUE'
    };
    
    expect(() => assertSnapshotIntegrity(badSnapshot, 'test')).toThrow();
  });

  it('should reject snapshots with missing critical fields', () => {
    const incompleteSnapshot = {
      snapshot_version: 'v3',
      // missing publication_id
      generated_at: new Date().toISOString(),
      targets: { kcal: 2000 }, // missing protein etc
      days: []
    };
    
    expect(() => assertSnapshotIntegrity(incompleteSnapshot, 'test')).toThrow();
  });
});
