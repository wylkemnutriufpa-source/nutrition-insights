/**
 * Weekly Composer — public surface for Onda 2A.
 * ONLY the atomic core is exported. No persistence, no integration.
 */
export { composeSlotSequence } from "./composeSlotSequence.ts";
export {
  BEHAVIOR_PROFILES,
  getBehaviorProfile,
  isValidBehaviorProfile,
} from "./behaviorProfiles.ts";
export { SLOT_ELASTICITY, getSlotElasticity } from "./slotElasticity.ts";
export {
  ComposerError,
  InvalidComposerInput,
  SlotPoolExhausted,
} from "./composerErrors.ts";
export { hashSeed, mulberry32, nextInt } from "./deterministicRng.ts";
export type * from "./types.ts";
