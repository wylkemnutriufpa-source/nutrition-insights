/**
 * composeSlotSequence — Atomic deterministic composer for a single slot.
 *
 * Contract: docs/WEEKLY_COMPOSER_CONTRACT.md (v1.0.0)
 *
 * GUARANTEES:
 *  - Pure function. No Math.random, no Date.now, no fetch, no DB, no I/O.
 *  - Same input ⇒ same output (byte-equal sequence + traces).
 *  - Empty pool (or empty after clinical filter) ⇒ explicit ComposeFail,
 *    NEVER silent substitution.
 *  - Respects behaviorProfile.maxRepeatConsecutive when at least 2 distinct
 *    items survive filtering.
 *  - Reports repeat_violations and distinct_count in metadata.
 *
 * NON-GOALS (Onda 2A):
 *  - Macro reconciliation, scaling, persistence, snapshot, PDF, UI.
 *  - Cross-slot or cross-meal coordination.
 *  - Substitution resolution (handled by SubstitutionResolver, separate layer).
 */

import type {
  ComposeMetadata,
  ComposeResult,
  ComposeSlotSequenceInput,
  ConstraintReason,
  DayIndex,
  DecisionTrace,
  FilteredItemTrace,
  PoolItem,
} from "./types.ts";
import { hashSeed, mulberry32, nextInt } from "./deterministicRng.ts";
import { isValidBehaviorProfile } from "./behaviorProfiles.ts";

const COMPOSER_VERSION = "1.0.0-onda2a";

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function itemMatchesAny(item: PoolItem, list: string[] | undefined): string | null {
  if (!list || list.length === 0) return null;
  const haystack = [item.id, item.name ?? "", ...(item.tags ?? [])].map(norm);
  for (const raw of list) {
    const needle = norm(raw);
    if (!needle) continue;
    for (const h of haystack) {
      if (h && (h === needle || h.includes(needle) || needle.includes(h))) {
        return raw;
      }
    }
  }
  return null;
}

function applyClinicalFilter(
  pool: PoolItem[],
  clinical: ComposeSlotSequenceInput["clinical"],
): { kept: PoolItem[]; filtered: FilteredItemTrace[] } {
  const filtered: FilteredItemTrace[] = [];
  const kept: PoolItem[] = [];
  // Hierarchy (Contract §3 / clinical override): allergy > intolerance >
  // religious > medical > dislike. First-match wins for the trace.
  const layers: Array<{ list?: string[]; reason: ConstraintReason }> = [
    { list: clinical?.allergies,    reason: "allergy" },
    { list: clinical?.intolerances, reason: "intolerance" },
    { list: clinical?.religious,    reason: "religious" },
    { list: clinical?.medical,      reason: "medical" },
    { list: clinical?.dislikes,     reason: "dislike" },
  ];
  for (const item of pool) {
    let blocked: { reason: ConstraintReason; matched: string } | null = null;
    for (const layer of layers) {
      const m = itemMatchesAny(item, layer.list);
      if (m) {
        blocked = { reason: layer.reason, matched: m };
        break;
      }
    }
    if (blocked) {
      filtered.push({ id: item.id, reason: blocked.reason, matched: blocked.matched });
    } else {
      kept.push(item);
    }
  }
  return { kept, filtered };
}

/** Stable dedupe by id, preserving input order. */
function dedupeById(pool: PoolItem[]): PoolItem[] {
  const seen = new Set<string>();
  const out: PoolItem[] = [];
  for (const it of pool) {
    if (!it || typeof it.id !== "string" || it.id.length === 0) continue;
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

export function composeSlotSequence(
  input: ComposeSlotSequenceInput,
): ComposeResult {
  const days = input.days ?? 7;
  const baseMeta = (over: Partial<ComposeMetadata> = {}): ComposeMetadata => ({
    slot_role: input.slotRole,
    behavior_profile: input.behaviorProfile?.name ?? ("standard" as const),
    seed_used: input.seed,
    distinct_count: 0,
    repeat_violations: 0,
    filtered_items: [],
    pool_size_after_filter: 0,
    ...over,
  });

  if (!Number.isInteger(days) || days < 1 || days > 31) {
    return {
      ok: false,
      reason: "INVALID_DAYS",
      message: `days must be an integer in [1,31], got ${days}`,
      metadata: baseMeta(),
    };
  }
  if (!isValidBehaviorProfile(input.behaviorProfile)) {
    return {
      ok: false,
      reason: "INVALID_BEHAVIOR_PROFILE",
      message: "behaviorProfile is missing or invalid",
      metadata: baseMeta(),
    };
  }
  if (typeof input.seed !== "string" || input.seed.length === 0) {
    return {
      ok: false,
      reason: "INVALID_BEHAVIOR_PROFILE",
      message: "seed must be a non-empty string",
      metadata: baseMeta(),
    };
  }

  const dedupedPool = dedupeById(input.rotationPool ?? []);
  if (dedupedPool.length === 0) {
    return {
      ok: false,
      reason: "POOL_EMPTY_INPUT",
      message: `rotationPool is empty for slot="${input.slotRole}"`,
      metadata: baseMeta(),
    };
  }

  const { kept, filtered } = applyClinicalFilter(dedupedPool, input.clinical);
  if (kept.length === 0) {
    return {
      ok: false,
      reason: "POOL_EMPTY_AFTER_FILTER",
      message: `All ${dedupedPool.length} items filtered out by clinical constraints for slot="${input.slotRole}"`,
      metadata: baseMeta({
        filtered_items: filtered,
        pool_size_after_filter: 0,
      }),
    };
  }

  // RNG seeded with composer version + slot role + caller seed.
  // Including version & slotRole guarantees independent streams across slots
  // even when the upstream seed is the same.
  const fullSeed = `${COMPOSER_VERSION}|${input.slotRole}|${input.seed}`;
  const rng = mulberry32(hashSeed(fullSeed));

  const profile = input.behaviorProfile;
  const sequence: string[] = [];
  const traces: DecisionTrace[] = [];

  // Track consecutive repeats of the LAST chosen id.
  let lastId: string | null = null;
  let consecutiveCount = 0;
  let repeatViolations = 0;

  // Track per-id usage counts for deterministic tie-break preferring
  // less-used items (encourages distinctness without breaking determinism).
  const useCount = new Map<string, number>();
  for (const it of kept) useCount.set(it.id, 0);

  for (let day = 0; day < days; day++) {
    // Step 1: build the candidate set.
    let candidates = kept.slice();

    // Step 2: enforce maxRepeatConsecutive when feasible.
    const repeatBlocked =
      lastId !== null &&
      consecutiveCount >= profile.maxRepeatConsecutive &&
      kept.length > 1;
    if (repeatBlocked) {
      candidates = candidates.filter((c) => c.id !== lastId);
    }

    // Step 3: rotation pressure — if rotationStrength is high and the last
    // item is still a candidate, optionally remove it BEFORE the RNG draw.
    // This is deterministic because rng() is deterministic.
    if (
      lastId !== null &&
      kept.length > 1 &&
      profile.rotationStrength > 0 &&
      candidates.some((c) => c.id === lastId)
    ) {
      const roll = rng();
      if (roll < profile.rotationStrength) {
        const trimmed = candidates.filter((c) => c.id !== lastId);
        if (trimmed.length > 0) candidates = trimmed;
      } else {
        // Burn the same RNG slot regardless to keep stream aligned.
        // (no-op, roll already advanced state)
      }
    }

    // Step 4: prefer least-used items (deterministic). Skipped when
    // rotationStrength=0 (low_complexity) to honor adherence-first profiles.
    let drawSet = candidates;
    if (profile.rotationStrength > 0) {
      const minUse = candidates.reduce(
        (m, c) => Math.min(m, useCount.get(c.id) ?? 0),
        Number.POSITIVE_INFINITY,
      );
      const preferred = candidates.filter(
        (c) => (useCount.get(c.id) ?? 0) === minUse,
      );
      if (preferred.length > 0) drawSet = preferred;
    }

    // Step 5: pick deterministically.
    const idx = nextInt(rng, drawSet.length);
    const chosen = drawSet[idx];

    // Step 6: bookkeeping.
    if (chosen.id === lastId) {
      consecutiveCount += 1;
      if (consecutiveCount > profile.maxRepeatConsecutive) {
        repeatViolations += 1;
      }
    } else {
      consecutiveCount = 1;
    }
    lastId = chosen.id;
    useCount.set(chosen.id, (useCount.get(chosen.id) ?? 0) + 1);
    sequence.push(chosen.id);
    traces.push({
      day_of_week: (day % 7) as DayIndex,
      chosen_id: chosen.id,
      candidates: drawSet.map((c) => c.id),
      seed_index: day,
      forced_repeat: kept.length === 1,
    });
  }

  const distinctCount = new Set(sequence).size;

  return {
    ok: true,
    sequence,
    traces,
    metadata: {
      slot_role: input.slotRole,
      behavior_profile: profile.name,
      seed_used: input.seed,
      distinct_count: distinctCount,
      repeat_violations: repeatViolations,
      filtered_items: filtered,
      pool_size_after_filter: kept.length,
    },
  };
}
