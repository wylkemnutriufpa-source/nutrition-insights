/**
 * Weekly Composer — ONDA 2A
 * Core determinístico para rotação de slots.
 */
import { DeterministicRng } from './deterministicRng';

export type BehaviorProfile = 'conservative' | 'adventurous' | 'clinical_fixed';

export interface SlotConfig {
  seed: string;
  days: number;
  slots_per_day: string[];
  behavior: BehaviorProfile;
  clinical_filters: string[];
  pool: string[];
}

export interface ComposeResult {
  sequence: string[];
  metadata: {
    distinct_count: number;
    repeat_violations: number;
    behavior_profile: string;
    filtered_items: string[];
    seed_used: string;
  };
}

export function composeSlotSequence(config: SlotConfig): ComposeResult {
  const rng = new DeterministicRng(config.seed);
  const sequence: string[] = [];
  const pool = config.pool.filter(item => !config.clinical_filters.includes(item));
  
  if (pool.length === 0) throw new Error("Pool exhausted after clinical filtering");

  for (let i = 0; i < config.days * config.slots_per_day.length; i++) {
    // Basic rotation with anti-repetition (last item)
    let available = pool.filter(item => item !== sequence[sequence.length - 1]);
    if (available.length === 0) available = pool; // Fallback if pool is 1
    
    const index = Math.floor(rng.next() * available.length);
    sequence.push(available[index]);
  }

  return {
    sequence,
    metadata: {
      distinct_count: new Set(sequence).size,
      repeat_violations: 0, // Simplified for now
      behavior_profile: config.behavior,
      filtered_items: config.clinical_filters,
      seed_used: config.seed
    }
  };
}
