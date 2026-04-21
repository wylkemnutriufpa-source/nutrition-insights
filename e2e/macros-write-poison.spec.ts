/**
 * FitJourney E2E — Macros Write-Path Poisoning
 *
 * Intercepts WRITE requests (POST/PATCH/PUT) to Supabase PostgREST and replaces
 * macro fields (kcal/P/C/G) in the request body with toxic values
 * (NaN, Infinity, null, strings, …). After the write, we reload the page and
 * assert the rendered DOM still never contains "NaN" / "Infinity" / "undefined"
 * inside visible text — proving the read-side shielding (fmtMacro/safeNum)
 * holds even when the database receives garbage from a malicious/buggy client.
 */
import { expect, type Page, type Route } from "@playwright/test";
import { test as authedTest } from "./fixtures";

const TOXIC_VALUES: unknown[] = [
  null,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  "",
  "NaN",
  "abc",
  true,
];

const MACRO_FIELDS = new Set([
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
  "xp_earned", // also numeric — exercise extra coercion paths
]);

let toxicCounter = 0;
const pickToxic = () => TOXIC_VALUES[toxicCounter++ % TOXIC_VALUES.length];

function poisonBody(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(poisonBody);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = MACRO_FIELDS.has(k) ? pickToxic() : poisonBody(v);
    }
    return out;
  }
  return value;
}

interface PoisonStats {
  intercepted: number;
  poisoned: number;
}

/**
 * Installs a write-path interceptor. Only POST/PATCH/PUT to /rest/v1/* are
 * mutated. GET requests pass through untouched so we read whatever the DB
 * actually stored.
 */
async function installWritePoisoner(page: Page, stats: PoisonStats) {
  await page.route(/\/rest\/v1\/.*/, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    if (method !== "POST" && method !== "PATCH" && method !== "PUT") {
      return route.continue();
    }

    const headers = { ...request.headers() };
    const contentType = headers["content-type"] || "";
    const original = request.postData();
    if (!original || !contentType.includes("application/json")) {
      return route.continue();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(original);
    } catch {
      return route.continue();
    }

    stats.intercepted++;
    const poisoned = poisonBody(parsed);
    const poisonedStr = JSON.stringify(poisoned);
    if (poisonedStr !== original) stats.poisoned++;

    return route.continue({
      method,
      headers,
      postData: poisonedStr,
    });
  });
}

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
            offenders.push(`<${tag}> ${text.slice(0, 140)}`);
          }
        }
      }
      node = walker.nextNode();
    }
    return offenders;
  });
  expect(
    findings,
    `Toxic macro tokens leaked into DOM:\n${findings.join("\n")}`,
  ).toEqual([]);
}

authedTest.describe("Macro write-path poisoning → safe render after refresh", () => {
  authedTest.setTimeout(90000);

  authedTest("create meal with poisoned macros → reload renders safe values", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    const stats: PoisonStats = { intercepted: 0, poisoned: 0 };
    await installWritePoisoner(page, stats);

    await page.goto("/meals");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);

    // Open "New meal" dialog
    const newBtn = page
      .getByRole("button", { name: /nova.*refei|novo.*meal|new meal|adicionar.*refei/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(400);

      const titleInput = page
        .locator('input[placeholder*="Frango" i], input[placeholder*="título" i], input[placeholder*="title" i], input[placeholder*="grelhado" i]')
        .first();
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.fill("E2E Toxic Write Meal");
      }

      // Fill macros with NORMAL values — interceptor will poison them in-flight.
      const numberInputs = page.locator('input[type="number"]');
      const nCount = await numberInputs.count().catch(() => 0);
      for (let i = 0; i < nCount; i++) {
        await numberInputs.nth(i).fill(String(100 + i * 10)).catch(() => {});
      }

      const submit = page
        .getByRole("button", { name: /registrar|salvar|adicionar|register|save/i })
        .first();
      if (await submit.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submit.click().catch(() => {});
        await page.waitForTimeout(2500);
      }
    }

    // Hard reload — read path now pulls poisoned values from the DB.
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2500);

    await assertNoToxicTokens(page);
  });

  authedTest("view meal plan after poisoned writes → no NaN in DOM", async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    const stats: PoisonStats = { intercepted: 0, poisoned: 0 };
    await installWritePoisoner(page, stats);

    // Touch any page that issues writes (check-ins, journey, dashboard) so the
    // interceptor poisons whatever update payloads the app emits.
    for (const path of ["/checkin", "/client-dashboard", "/journey"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1500);
    }

    // Read-path verification on the diet page.
    await page.goto("/my-diet");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2500);

    // Expand any collapsed cards that hide macro details.
    const expanders = page.locator(
      'button:has-text("Ver"), button:has-text("Detalhes"), [role="button"]:has-text("Expandir")',
    );
    const exCount = await expanders.count().catch(() => 0);
    for (let i = 0; i < Math.min(exCount, 4); i++) {
      await expanders.nth(i).click({ trial: false }).catch(() => {});
      await page.waitForTimeout(250);
    }

    await assertNoToxicTokens(page);

    // Final reload to confirm persistence + render are both clean.
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2500);
    await assertNoToxicTokens(page);
  });
});
