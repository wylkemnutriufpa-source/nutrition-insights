/**
 * FitJourney E2E — Macro container-scoped assertions
 *
 * Inspects ONLY known macro containers tagged with `[data-macro-tile]` and
 * their `[data-macro-value]` leaves. Avoids false positives from incidental
 * text like "meta", chart labels or unrelated numbers.
 *
 * Tagged containers:
 *  - MealCard            → data-macro-tile="meal-card"     (kcal, protein, carbs, fat)
 *  - MealVisualCard      → data-macro-tile="visual-card"   (kcal, protein)
 *  - NextMealWidget      → data-macro-tile="next-meal"     (kcal, P, C, G)
 *  - MacroBalanceBar     → data-macro-tile="balance-bar"   (P%, C%, G%)
 *  - MacroGauge          → data-macro-tile="gauge"         (current, target)
 *
 * For every `[data-macro-value]` leaf we assert:
 *  - text never contains NaN / Infinity / undefined / null
 *  - any number parses to a finite value (>= 0)
 */
import { expect, type Page, type Route } from "@playwright/test";
import { test as authedTest } from "./fixtures";

// ─── Toxic data injection (read path) ──────────────────────────────────────
const TOXIC_VALUES: unknown[] = [
  null, undefined, Number.NaN,
  Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
  "", "abc", "NaN", true, {}, [],
];

const MACRO_FIELDS = new Set([
  "calories", "protein", "carbs", "fat",
  "kcal", "proteins", "carbohydrates", "fats",
  "calories_target", "protein_target", "carbs_target", "fat_target",
  "default_calories", "default_protein", "default_carbs", "default_fat",
  "total_calories", "total_protein", "total_carbs", "total_fat",
  "target_calories", "target_protein", "target_carbs", "target_fat",
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

// ─── Container-scoped assertion ────────────────────────────────────────────
interface BadLeaf {
  tile: string;
  macro: string;
  text: string;
  reason: string;
}

async function collectBadMacroLeaves(page: Page): Promise<BadLeaf[]> {
  return page.evaluate(() => {
    const TOXIC_RE = /\b(NaN|-?Infinity|undefined|null)\b/;
    const offenders: { tile: string; macro: string; text: string; reason: string }[] = [];

    const tiles = Array.from(document.querySelectorAll<HTMLElement>("[data-macro-tile]"));
    for (const tile of tiles) {
      const tileName = tile.getAttribute("data-macro-tile") || "?";
      const leaves = Array.from(tile.querySelectorAll<HTMLElement>("[data-macro-value]"));
      // If a tile has no explicit value leaves, fall back to the tile itself.
      const targets = leaves.length > 0 ? leaves : [tile];
      for (const el of targets) {
        const macro =
          el.getAttribute("data-macro-value") ||
          el.getAttribute("data-macro") ||
          "tile";
        const txt = (el.textContent || "").trim();
        if (!txt) continue;
        if (TOXIC_RE.test(txt)) {
          offenders.push({ tile: tileName, macro, text: txt, reason: "toxic-token" });
          continue;
        }
        const nums = txt.match(/-?\d+(?:[.,]\d+)?/g) || [];
        for (const raw of nums) {
          const n = parseFloat(raw.replace(",", "."));
          if (!Number.isFinite(n)) {
            offenders.push({ tile: tileName, macro, text: txt, reason: `not-finite (${raw})` });
            break;
          }
          if (n < 0) {
            offenders.push({ tile: tileName, macro, text: txt, reason: `negative (${raw})` });
            break;
          }
        }
      }
    }
    return offenders;
  });
}

async function expectSafeMacroTiles(page: Page, label: string) {
  // Try to expand collapsible cards that hide macro tiles.
  const expanders = page.locator(
    'button:has-text("Ver"), button:has-text("Detalhes"), [role="button"]:has-text("Expandir"), button[aria-expanded="false"]',
  );
  const c = await expanders.count().catch(() => 0);
  for (let i = 0; i < Math.min(c, 5); i++) {
    await expanders.nth(i).click({ trial: false }).catch(() => {});
    await page.waitForTimeout(200);
  }

  const offenders = await collectBadMacroLeaves(page);
  const tilesPresent = await page.locator("[data-macro-tile]").count();
  // Empty-state (no tiles rendered) is acceptable; failure only if tiles exist
  // AND any of them render unsafe values.
  if (tilesPresent === 0) return;
  expect(
    offenders,
    `[${label}] Unsafe macro tiles detected:\n` +
      offenders
        .map((o) => `  tile=${o.tile} macro=${o.macro} → "${o.text}" (${o.reason})`)
        .join("\n"),
  ).toEqual([]);
}

const ROUTES: { path: string; label: string }[] = [
  { path: "/meals", label: "/meals" },
  { path: "/my-diet", label: "/my-diet" },
  { path: "/client-dashboard", label: "/client-dashboard" },
  { path: "/journey", label: "/journey" },
  { path: "/checkin", label: "/checkin" },
];

authedTest.describe("Macro tile containers render safely (post-refresh, scoped)", () => {
  authedTest.setTimeout(90000);

  for (const { path, label } of ROUTES) {
    authedTest(`tiles on ${label}`, async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      await installReadPoisoner(page);

      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1500);

      // Hard reload to exercise cold-load shielding.
      await page.reload();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2500);

      await expectSafeMacroTiles(page, label);
    });
  }
});
