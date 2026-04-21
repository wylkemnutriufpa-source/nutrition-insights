/**
 * FitJourney E2E — Targeted Macro Render Assertions
 *
 * Unlike `macros-no-nan.spec.ts` (which scans the full body), this spec
 * inspects ONLY the elements that actually render kcal/P/C/G values on each
 * page, after a hard refresh. We poison Supabase responses with toxic numeric
 * payloads, navigate, reload, then for every macro-bearing node we assert:
 *   - it does NOT contain "NaN" / "Infinity" / "undefined"
 *   - the numeric portion parses to a finite number (>= 0 for masses/kcal)
 *
 * This proves fmtMacro/safeNum are wired into every visible macro on the page,
 * not just somewhere on the document.
 */
import { expect, type Page, type Route, type Locator } from "@playwright/test";
import { test as authedTest } from "./fixtures";

// ─── Toxic data injection ──────────────────────────────────────────────────
const TOXIC_VALUES: unknown[] = [
  null,
  undefined,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  "",
  "abc",
  "NaN",
  true,
  {},
  [],
];

const MACRO_FIELDS = new Set([
  "calories", "protein", "carbs", "fat",
  "kcal", "proteins", "carbohydrates", "fats",
  "calories_target", "protein_target", "carbs_target", "fat_target",
  "total_calories", "total_protein", "total_carbs", "total_fat",
  "target_calories", "target_protein", "target_carbs", "target_fat",
  "ai_score", "xp_earned",
]);

function poison(value: unknown, c: { n: number }): unknown {
  if (Array.isArray(value)) return value.map((v) => poison(v, c));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = MACRO_FIELDS.has(k)
        ? TOXIC_VALUES[c.n++ % TOXIC_VALUES.length]
        : poison(v, c);
    }
    return out;
  }
  return value;
}

async function installReadPoisoner(page: Page) {
  await page.route(/\/rest\/v1\/.*/, async (route: Route) => {
    const req = route.request();
    if (req.method() !== "GET" && req.method() !== "POST") return route.continue();
    try {
      const response = await route.fetch();
      const ct = response.headers()["content-type"] || "";
      if (!ct.includes("application/json")) return route.fulfill({ response });
      const text = await response.text();
      if (!text) return route.fulfill({ response });
      const data = JSON.parse(text);
      const poisoned = poison(data, { n: 0 });
      return route.fulfill({
        response,
        body: JSON.stringify(poisoned),
        headers: { ...response.headers(), "content-type": "application/json" },
      });
    } catch {
      return route.continue();
    }
  });
}

// ─── Macro element discovery ───────────────────────────────────────────────
/**
 * Patterns that identify macro-bearing rendered text. We match the *visible*
 * suffix or label to find spans/divs that show kcal/P/C/G.
 */
const MACRO_TEXT_PATTERNS: RegExp[] = [
  /\bkcal\b/i,
  /\bcal\b/i,
  /\bcalorias?\b/i,
  /^\s*P\s*[:=]?\s*\d/i,   // "P 30g" / "P: 30"
  /^\s*C\s*[:=]?\s*\d/i,
  /^\s*G\s*[:=]?\s*\d/i,
  /\bprote[ií]nas?\b/i,
  /\bcarboidratos?\b/i,
  /\bgorduras?\b/i,
  /\bmeta\s*:/i,           // MacroGauge "meta: 50"
];

const TOXIC_TOKEN_RE = /\b(NaN|-?Infinity|undefined)\b/;

interface BadNode {
  text: string;
  reason: string;
  tag: string;
}

async function collectMacroNodes(page: Page): Promise<BadNode[]> {
  return page.evaluate((patterns) => {
    const macroPatterns = patterns.map((p) => new RegExp(p.source, p.flags));
    const toxicRe = /\b(NaN|-?Infinity|undefined)\b/;
    const offenders: { text: string; reason: string; tag: string }[] = [];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode() as HTMLElement | null;

    while (node) {
      const tag = node.tagName.toLowerCase();
      if (tag === "script" || tag === "style" || tag === "noscript") {
        node = walker.nextNode() as HTMLElement | null;
        continue;
      }
      // Inspect leaf elements only (no element children) to avoid duplication.
      if (node.children.length === 0) {
        const txt = (node.textContent || "").trim();
        if (txt && macroPatterns.some((re) => re.test(txt))) {
          // 1) Toxic-token check
          if (toxicRe.test(txt)) {
            offenders.push({ text: txt, reason: "toxic-token", tag });
          } else {
            // 2) Numeric sanity: every number in the string must be finite & non-negative.
            const nums = txt.match(/-?\d+(?:[.,]\d+)?/g) || [];
            for (const raw of nums) {
              const n = parseFloat(raw.replace(",", "."));
              if (!Number.isFinite(n)) {
                offenders.push({ text: txt, reason: `not-finite (${raw})`, tag });
                break;
              }
              if (n < 0) {
                offenders.push({ text: txt, reason: `negative (${raw})`, tag });
                break;
              }
            }
          }
        }
      }
      node = walker.nextNode() as HTMLElement | null;
    }
    return offenders;
  }, MACRO_TEXT_PATTERNS.map((p) => ({ source: p.source, flags: p.flags })));
}

async function expectSafeMacrosOn(page: Page, label: string) {
  // Expand any collapsible cards that hide macro details.
  const expanders = page.locator(
    'button:has-text("Ver"), button:has-text("Detalhes"), [role="button"]:has-text("Expandir"), button[aria-expanded="false"]',
  );
  const c = await expanders.count().catch(() => 0);
  for (let i = 0; i < Math.min(c, 5); i++) {
    await expanders.nth(i).click({ trial: false }).catch(() => {});
    await page.waitForTimeout(200);
  }

  const offenders = await collectMacroNodes(page);
  expect(
    offenders,
    `[${label}] Unsafe macro renders detected:\n` +
      offenders.map((o) => `  <${o.tag}> "${o.text}" → ${o.reason}`).join("\n"),
  ).toEqual([]);
}

// ─── Test matrix ───────────────────────────────────────────────────────────
const ROUTES: { path: string; label: string }[] = [
  { path: "/meals", label: "/meals" },
  { path: "/my-diet", label: "/my-diet" },
  { path: "/client-dashboard", label: "/client-dashboard" },
  { path: "/journey", label: "/journey" },
  { path: "/checkin", label: "/checkin" },
];

authedTest.describe("Targeted macro element assertions (post-refresh)", () => {
  authedTest.setTimeout(90000);

  for (const { path, label } of ROUTES) {
    authedTest(`macro nodes on ${label} render safely after refresh`, async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage;
      await installReadPoisoner(page);

      // First visit
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);

      // Hard reload — proves the shielding works on cold load too.
      await page.reload();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2500);

      await expectSafeMacrosOn(page, label);
    });
  }
});
