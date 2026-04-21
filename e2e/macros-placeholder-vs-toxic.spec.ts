/**
 * FitJourney E2E — Placeholder vs Toxic Macro Renders
 *
 * Verifies the dual contract for macro tiles:
 *   ✅ Missing macros (null / 0 / hidden field) render a placeholder ("-",
 *      "—", "0", "N/A") OR are not rendered at all.
 *   ✅ Toxic macros (NaN / Infinity / undefined / strings) NEVER leak as text.
 *
 * Strategy:
 *  - Run TWO scenarios per page:
 *      Scenario A — STRIP: rewrite macro fields to `null` (simulates missing
 *      data). Tiles must either be absent OR show a known placeholder.
 *      Scenario B — POISON: rewrite macro fields with toxic values. Tiles
 *      must never expose NaN/Infinity/undefined and any number must be finite.
 *  - Inspection is scoped to `[data-macro-tile]` containers and their
 *    `[data-macro-value]` leaves (set up in MealCard, MealVisualCard,
 *    NextMealWidget, MacroBalanceBar, MacroGauge).
 */
import { expect, type Page, type Route } from "@playwright/test";
import { test as authedTest } from "./fixtures";

// ─── Field set ─────────────────────────────────────────────────────────────
const MACRO_FIELDS = new Set([
  "calories", "protein", "carbs", "fat",
  "kcal", "proteins", "carbohydrates", "fats",
  "calories_target", "protein_target", "carbs_target", "fat_target",
  "default_calories", "default_protein", "default_carbs", "default_fat",
  "total_calories", "total_protein", "total_carbs", "total_fat",
  "target_calories", "target_protein", "target_carbs", "target_fat",
]);

// ─── Scenario rewriters ────────────────────────────────────────────────────
function stripMacros(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripMacros);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = MACRO_FIELDS.has(k) ? null : stripMacros(v);
    }
    return out;
  }
  return value;
}

const TOXIC_VALUES: unknown[] = [
  Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
  "abc", "NaN", true, {}, [], undefined,
];

function poisonMacros(value: unknown, c: { n: number }): unknown {
  if (Array.isArray(value)) return value.map((v) => poisonMacros(v, c));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = MACRO_FIELDS.has(k)
        ? TOXIC_VALUES[c.n++ % TOXIC_VALUES.length]
        : poisonMacros(v, c);
    }
    return out;
  }
  return value;
}

// ─── Network interceptor ───────────────────────────────────────────────────
type Mode = "strip" | "poison";

async function installRewriter(page: Page, mode: Mode) {
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
      const out =
        mode === "strip" ? stripMacros(data) : poisonMacros(data, { n: 0 });
      return route.fulfill({
        response,
        body: JSON.stringify(out),
        headers: { ...response.headers(), "content-type": "application/json" },
      });
    } catch {
      return route.continue();
    }
  });
}

// ─── DOM inspection ────────────────────────────────────────────────────────
//
// Toxic tokens that must NEVER reach the DOM, regardless of context.
const TOXIC_RE = /\b(NaN|-?Infinity|undefined)\b/;

// Comprehensive placeholder detection.
//
// Real placeholders observed in the codebase (grep'd live):
//   • "-"   (MealCard fallback)
//   • "—"   (em dash — most patient cards: BodyEvolution, MealDetailModal,
//            MealVisualModal, PatientEvolutionSummary, ConsultationCompare,
//            BodyProjectionProCard, OnboardingApprovalQueue, PDF metrics)
//   • "–"   (en dash, occasional)
//   • "--"  (double hyphen, occasional)
//   • "N/A" (occasional)
//   • ""    (empty / whitespace only — tile rendered without value yet)
//
// We must recognise these AFTER stripping known label prefixes/suffixes
// emitted by the tagged tiles, so that strings like `P: -`, `meta: —`,
// `0 kcal`, `0g`, `0%` count as valid empty/zero states — NOT as toxic.
function normalizeLeafText(raw: string): string {
  let s = raw.replace(/\u00a0/g, " ").trim();

  // Strip leading macro labels: "P:", "C:", "G:", "Kcal:", "meta:",
  // "Prot:", "Carb:", "Gord:" (case-insensitive, optional colon).
  s = s.replace(
    /^(p|c|g|kcal|prot(?:e[ií]nas?)?|carb(?:o(?:hidratos?|s)?)?|gord(?:ura)?|meta|target|atual|current)\s*[:=]?\s*/i,
    "",
  );

  // Strip trailing units: kcal, g, kg, %, etc.
  s = s.replace(/\s*(kcal|kgs?|gr?|%)\s*$/i, "");

  return s.trim();
}

const PLACEHOLDER_LITERALS = new Set([
  "", "-", "--", "—", "––", "–", "–––", "n/a", "na", "0",
]);

function isPlaceholder(rawText: string): boolean {
  const norm = normalizeLeafText(rawText).toLowerCase();
  if (PLACEHOLDER_LITERALS.has(norm)) return true;
  // Pure dash/whitespace runs (e.g. "— —", "- - -")
  if (/^[\s\-—–]*$/.test(norm)) return true;
  return false;
}

interface Leaf {
  tile: string;
  macro: string;
  text: string;
}

async function readMacroLeaves(page: Page): Promise<Leaf[]> {
  return page.evaluate(() => {
    const leaves: { tile: string; macro: string; text: string }[] = [];
    const tiles = Array.from(document.querySelectorAll<HTMLElement>("[data-macro-tile]"));
    for (const tile of tiles) {
      const tileName = tile.getAttribute("data-macro-tile") || "?";
      const valueLeaves = Array.from(
        tile.querySelectorAll<HTMLElement>("[data-macro-value]"),
      );
      const targets = valueLeaves.length > 0 ? valueLeaves : [tile];
      for (const el of targets) {
        const macro =
          el.getAttribute("data-macro-value") ||
          el.getAttribute("data-macro") ||
          "tile";
        leaves.push({
          tile: tileName,
          macro,
          text: (el.textContent || "").trim(),
        });
      }
    }
    return leaves;
  });
}

async function expandCollapsibles(page: Page) {
  const expanders = page.locator(
    'button:has-text("Ver"), button:has-text("Detalhes"), [role="button"]:has-text("Expandir"), button[aria-expanded="false"]',
  );
  const c = await expanders.count().catch(() => 0);
  for (let i = 0; i < Math.min(c, 5); i++) {
    await expanders.nth(i).click({ trial: false }).catch(() => {});
    await page.waitForTimeout(200);
  }
}

// ─── Routes under test ─────────────────────────────────────────────────────
const ROUTES = [
  { path: "/meals", label: "/meals" },
  { path: "/my-diet", label: "/my-diet" },
  { path: "/client-dashboard", label: "/client-dashboard" },
  { path: "/journey", label: "/journey" },
  { path: "/checkin", label: "/checkin" },
];

/**
 * Validate one leaf:
 *   ❌ Fails if text contains a toxic token (NaN, Infinity, undefined).
 *   ✅ Accepts known placeholders (handled by isPlaceholder).
 *   ✅ Accepts finite numbers ≥ 0 (after parsing all numeric segments).
 *   ✅ Accepts pure label text (no numbers and no toxic tokens).
 */
function leafIsViolation(text: string): boolean {
  if (TOXIC_RE.test(text)) return true;
  if (isPlaceholder(text)) return false;
  const nums = text.match(/-?\d+(?:[.,]\d+)?/g) || [];
  if (nums.length === 0) return false;
  return nums.some((raw) => {
    const n = parseFloat(raw.replace(",", "."));
    return !Number.isFinite(n) || n < 0;
  });
}

// ─── Suite ────────────────────────────────────────────────────────────────
authedTest.describe("Macro tiles: placeholder vs toxic contract", () => {
  authedTest.setTimeout(90000);

  for (const { path, label } of ROUTES) {
    authedTest(`STRIP → tiles on ${label} show placeholder or are hidden`, async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage;
      await installRewriter(page, "strip");

      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.reload();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2500);
      await expandCollapsibles(page);

      const leaves = await readMacroLeaves(page);
      if (leaves.length === 0) return; // empty state acceptable

      const violations = leaves.filter((l) => leafIsViolation(l.text));

      expect(
        violations,
        `[${label} | STRIP] Tiles must show placeholder or finite ≥ 0:\n` +
          violations
            .map((v) => `  tile=${v.tile} macro=${v.macro} → "${v.text}"`)
            .join("\n"),
      ).toEqual([]);
    });

    authedTest(`POISON → tiles on ${label} never expose NaN/Infinity/undefined`, async ({
      authenticatedPage,
    }) => {
      const page = authenticatedPage;
      await installRewriter(page, "poison");

      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.reload();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2500);
      await expandCollapsibles(page);

      const leaves = await readMacroLeaves(page);
      if (leaves.length === 0) return;

      const violations = leaves.filter((l) => leafIsViolation(l.text));

      expect(
        violations,
        `[${label} | POISON] Tiles leaked unsafe macro values:\n` +
          violations
            .map((v) => `  tile=${v.tile} macro=${v.macro} → "${v.text}"`)
            .join("\n"),
      ).toEqual([]);
    });
  }
});

