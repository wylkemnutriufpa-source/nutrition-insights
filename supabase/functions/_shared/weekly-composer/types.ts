/**
 * Weekly Composer — Atomic Types
 * Pure types, no runtime imports, no side effects.
 * See docs/WEEKLY_COMPOSER_CONTRACT.md (v1.0.0)
 */

export type SlotRole =
  | "protein_lean"
  | "protein_fat"
  | "carb_complex"
  | "carb_simple"
  | "vegetable"
  | "fruit"
  | "fat_source"
  | "dairy"
  | "legume"
  | "beverage"
  | "free";

export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type BehaviorProfileName =
  | "standard"
  | "strict_variation"
  | "high_adherence"
  | "low_complexity"
  | "clinical_restriction";

export interface BehaviorProfile {
  name: BehaviorProfileName;
  /** Minimum DISTINCT items required across the 7-day week. */
  minDistinctPerWeek: number;
  /** Maximum number of times the SAME item may appear consecutively. */
  maxRepeatConsecutive: number;
  /** 0..1 — higher = more likely to rotate even when repeat is legal. */
  rotationStrength: number;
}

export interface PoolItem {
  /** Stable food id (TACO id, custom id, etc.). NEVER invented. */
  id: string;
  /** Display name (used only in traces, never for matching). */
  name?: string;
  /** Optional clinical tags used by the filter layer. */
  tags?: string[];
}

export interface ClinicalConstraints {
  allergies?: string[];
  intolerances?: string[];
  religious?: string[];
  medical?: string[];
  dislikes?: string[];
}

export interface ComposeSlotSequenceInput {
  slotRole: SlotRole;
  /** Rotation pool — the ONLY source of truth for what may appear. */
  rotationPool: PoolItem[];
  /** Number of days to compose. Always 7 in production; param for tests. */
  days?: number;
  behaviorProfile: BehaviorProfile;
  clinical?: ClinicalConstraints;
  /** Deterministic seed string. Same seed + same input ⇒ same output. */
  seed: string;
}

export type ConstraintReason =
  | "allergy"
  | "intolerance"
  | "religious"
  | "medical"
  | "dislike";

export interface FilteredItemTrace {
  id: string;
  reason: ConstraintReason;
  matched: string;
}

export interface DecisionTrace {
  day_of_week: DayIndex;
  chosen_id: string;
  candidates: string[];
  seed_index: number;
  forced_repeat: boolean;
}

export interface ComposeMetadata {
  slot_role: SlotRole;
  behavior_profile: BehaviorProfileName;
  seed_used: string;
  distinct_count: number;
  repeat_violations: number;
  filtered_items: FilteredItemTrace[];
  pool_size_after_filter: number;
}

export interface ComposeOk {
  ok: true;
  sequence: string[];           // length = days; ids only
  traces: DecisionTrace[];
  metadata: ComposeMetadata;
}

export interface ComposeFail {
  ok: false;
  reason:
    | "POOL_EMPTY_AFTER_FILTER"
    | "POOL_EMPTY_INPUT"
    | "INVALID_DAYS"
    | "INVALID_BEHAVIOR_PROFILE";
  message: string;
  metadata: ComposeMetadata;
}

export type ComposeResult = ComposeOk | ComposeFail;
