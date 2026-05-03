/**
 * Architectural test — guarantees the governance is the SOLE orchestrator.
 *
 * Scans flow pages for forbidden auto-redirect patterns inside useEffect.
 * User-initiated navigate() calls (button onClick) remain allowed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FLOW_FILES = [
  "src/pages/Anamnesis.tsx",
  "src/pages/OnboardingPaciente.tsx",
  "src/pages/OnboardingPipeline.tsx",
  "src/pages/ConsentRequired.tsx",
  "src/components/patient/OnboardingGateScreen.tsx",
];

/**
 * Strips block comments and line comments so we don't false-positive
 * on documentation that mentions "navigate(" inside a comment.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("Architecture — governance is the sole flow orchestrator", () => {
  it.each(FLOW_FILES)("%s contains no auto-redirect inside useEffect", (file) => {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) return; // tolerate file moves
    const src = stripComments(readFileSync(path, "utf-8"));

    // Look for useEffect blocks
    const useEffectBlocks = src.match(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[[^\]]*\]\s*\)/g) ?? [];

    for (const block of useEffectBlocks) {
      // Forbid auto-navigation to flow routes inside effects.
      const hasNavigate = /\bnavigate\s*\(/.test(block);
      const hasRouterPush = /router\.push\s*\(/.test(block);
      const hasLocationAssign = /window\.location\s*=|window\.location\.href\s*=|window\.location\.replace\s*\(/.test(block);

      const offenders: string[] = [];
      if (hasNavigate) offenders.push("navigate(");
      if (hasRouterPush) offenders.push("router.push(");
      if (hasLocationAssign) offenders.push("window.location assignment");

      expect(
        offenders,
        `Forbidden auto-redirect inside useEffect of ${file}: ${offenders.join(", ")}\nBlock:\n${block}`
      ).toEqual([]);
    }
  });
});
