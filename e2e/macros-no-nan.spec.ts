/**
 * FitJourney E2E — Macros No-NaN Guard
 *
 * Visits patient-facing pages that render kcal/P/C/G and asserts the rendered
 * DOM never contains "NaN", "Infinity" or "undefined" — even when the backend
 * returns toxic numeric payloads (null, NaN-coerced, strings, booleans, …).
 *
 * Strategy:
 *  1. Intercept Supabase PostgREST responses for the relevant tables and
 *     rewrite macro fields with a "toxic matrix" of values.
 *  2. Visit each patient route and assert the body innerText never matches
 *     /\bNaN\b|\bInfinity\b|\bundefined\b/ in any macro context.
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import { test as authedTest } from "./fixtures";

// Toxic values cycled across rows/fields to maximize coverage of edge cases.
const TOXIC_VALUES: unknown[] = [
  null,
  undefined,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  "",
  "abc",
  "NaN",
  "Infinity",
  true,
  false,
  {},
  [],
];

const MACRO_FIELDS = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "kcal",
  "proteins",
  "carbohydrates",
  "fats",
  "total_calories",
  "total_protein",
  "total_carbs",
  "total_fat",
  "target_calories",
  "target_protein",
  "target_carbs",
  "target_fat",
];

function pickToxic(seed: number): unknown {
  return TOXIC_VALUES[seed % TOXIC_VALUES.length];
}

function poisonValue(value: unknown, path: string, counter: { n: number }): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => poisonValue(v, path, counter));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (MACRO_FIELDS.includes(k)) {
        out[k] = pickToxic(counter.n++);
      } else {
        out[k] = poisonValue(v, `${path}.${k}`, counter);
      }
    }
    return out;
  }
  return value;
}

/**
 * Install a route handler that poisons macro fields on Supabase REST responses.
 */
async function installToxicProxy(page: Page) {
  await page.route(/\/rest\/v1\/.*/, async (route: Route) => {
    const request = route.request();
    // Only mutate GET/POST(select) responses; pass-through writes untouched.
    const method = request.method();
    if (method !== "GET" && method !== "POST") {
      return route.continue();
    }

    try {
      const response = await route.fetch();
      const contentType = response.headers()["content-type"] || "";
      if (!contentType.includes("application/json")) {
        return route.fulfill({ response });
      }

      const text = await response.text();
      if (!text) return route.fulfill({ response });

      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        return route.fulfill({ response });
      }

      const counter = { n: 0 };
      const poisoned = poisonValue(data, "$", counter);
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

/**
 * Asserts no rendered text inside the page contains the toxic tokens.
 * We allow these tokens inside <script>/<style> (e.g. inlined JSON) but never
 * in user-visible text nodes.
 */
async function assertNoToxicTokens(page: Page) {
  const findings = await page.evaluate(() => {
    const TOXIC_RE = /(?:^|[\s>(:,/])(NaN|Infinity|-Infinity|undefined)(?:$|[\s<).,;:/%])/;
    const offenders: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent) {
        const tag = parent.tagName.toLowerCase();
        if (tag !== "script" && tag !== "style" && tag !== "noscript") {
          const text = (node.nodeValue || "").trim();
          if (text && TOXIC_RE.test(` ${text} `)) {
            offenders.push(`${tag}: ${text.slice(0, 120)}`);
          }
        }
      }
      node = walker.nextNode();
    }
    return offenders;
  });
  expect(findings, `Found toxic macro tokens in DOM:\n${findings.join("\n")}`).toEqual([]);
}

const PATIENT_ROUTES = [
  { path: "/my-diet", label: "Patient meal plan (toxic backend)" },
  { path: "/meals", label: "Patient meals list (toxic backend)" },
  { path: "/client-dashboard", label: "Patient dashboard (toxic backend)" },
  { path: "/checkin", label: "Patient check-in (toxic backend)" },
  { path: "/journey", label: "Patient journey (toxic backend)" },
];

authedTest.describe("Macros never render as NaN / Infinity / undefined", () => {
  authedTest.setTimeout(60000);

  for (const { path, label } of PATIENT_ROUTES) {
    authedTest(label, async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      await installToxicProxy(page);

      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => {});
      // Give async UI (charts, recharts, framer-motion) time to settle.
      await page.waitForTimeout(2500);

      // Try to expand any collapsed cards/dialogs that may hide macros.
      const expandable = page.locator(
        'button:has-text("Ver"), button:has-text("Detalhes"), [role="button"]:has-text("Expandir")'
      );
      const count = await expandable.count().catch(() => 0);
      for (let i = 0; i < Math.min(count, 3); i++) {
        await expandable.nth(i).click({ trial: false }).catch(() => {});
        await page.waitForTimeout(300);
      }

      await assertNoToxicTokens(page);
    });
  }

  authedTest("Meal registration flow keeps macros safe with empty inputs", async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    // No proxy here — we exercise the real form with empty macro inputs.
    await page.goto("/meals");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);

    const newMealBtn = page.getByRole("button", { name: /nova.*refei|novo.*meal|new meal/i }).first();
    if (await newMealBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await newMealBtn.click();
      await page.waitForTimeout(500);

      const titleInput = page.getByPlaceholder(/grelhado|título|title|salada/i).first();
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill("E2E NaN Guard Meal");
      }
      // Intentionally leave kcal / P / C / G blank to trigger fallbacks.

      const submit = page.getByRole("button", { name: /registrar|salvar|adicionar|register/i }).first();
      if (await submit.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submit.click().catch(() => {});
        await page.waitForTimeout(2000);
      }
    }

    await assertNoToxicTokens(page);
  });
});
