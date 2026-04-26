import { test, expect } from "./fixtures";

test.describe("Meal Plan - Primary Validation & Determinism", () => {
  test("every meal card must have exactly 1 primary and correct macros", async ({ stableMealPlanPage: page }) => {
    // 1. Identify all meal cards
    // In MealPlanCanvas, cards are grouped by meal type
    const mealCards = page.locator("div.rounded-xl.border.p-3"); // Based on MealSlotCard class
    const count = await mealCards.count();
    expect(count).toBeGreaterThan(0);

    const validateCards = async () => {
      for (let i = 0; i < count; i++) {
        const card = mealCards.nth(i);
        
        // Exactly 1 item that is NOT in the substitution section (which means it's primary)
        // or check the store/DOM structure. 
        // MealSlotCard renders primaryItems first, then a divider, then substitutionItems.
        // Primary items are outside the "Substituições" container.
        const allItems = card.locator("[data-testid^='meal-item-']");
        const subSection = card.locator("p:has-text('Substituições')");
        
        let primaryCount = 0;
        const totalItems = await allItems.count();
        
        // We can check the text or the position. 
        // Better: in MealSlotCard, primary items are rendered before the subSection.
        for (let j = 0; j < totalItems; j++) {
          const item = allItems.nth(j);
          // Check if item is before the subSection divider
          const isPrimary = await item.evaluate((el, sub) => {
            if (!sub) return true;
            return el.compareDocumentPosition(sub) & Node.DOCUMENT_POSITION_FOLLOWING;
          }, await subSection.elementHandle());
          
          if (isPrimary) primaryCount++;
        }
        
        expect(primaryCount, `Card ${i} should have exactly 1 primary item`).toBe(1);

        // Validate macros
        const cardKcal = await card.locator("text=/\\d+ kcal/").textContent();
        const primaryKcal = await allItems.first().locator("text=/\\d+ kcal/").textContent();
        
        expect(cardKcal?.trim()).toContain(primaryKcal?.trim());
      }
    };

    // Initial check
    await validateCards();

    // 2. Switch tabs (if any) and check again
    const tuesdayTab = page.locator("button:has-text('Terça')");
    if (await tuesdayTab.isVisible()) {
      await tuesdayTab.click();
      await page.waitForTimeout(300);
      await validateCards();
    }

    // 3. Reload and check again
    await page.reload();
    await page.waitForLoadState("networkidle");
    await validateCards();
  });

  test("Absolute Determinism: Save/Reload cycle repeated 5 times", async ({ stableMealPlanPage: page }) => {
    const getOrder = async () => {
      const items = page.locator("[data-testid^='meal-item-']");
      return await items.evaluateAll(list => list.map(el => el.getAttribute("data-testid")));
    };

    const initialOrder = await getOrder();
    
    for (let i = 0; i < 5; i++) {
      // Trigger a save (even if no changes, store handles it)
      await page.getByRole("button", { name: /Salvar/i }).first().click();
      await page.waitForTimeout(500); // Wait for save toast/sync
      
      await page.reload();
      await page.waitForLoadState("networkidle");
      
      const currentOrder = await getOrder();
      expect(currentOrder).toEqual(initialOrder);
    }
  });

  test("Mobile Accessibility: AUTO badge interaction", async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 812 });
    
    // We need to setup the mock here too because we are using 'page' directly to change viewport
    // Or we could have added viewport to the fixture, but let's just use the mock logic
    const MOCK_PLAN_ID = "00000000-0000-0000-0000-000000000000";
    
    // (Re-using mock logic from fixtures for isolation in this specific test)
    await page.route("**/rest/v1/meal_plans?**", (route) => route.fulfill({ status: 200, body: JSON.stringify([{ id: MOCK_PLAN_ID, edit_metadata: { substitution_count: 4 } }]) }));
    await page.route("**/rest/v1/meal_plan_items?**", (route) => route.fulfill({ 
      status: 200, 
      body: JSON.stringify([
        { id: "p1", day_of_week: 0, meal_type: "breakfast", is_primary: true, title: "P" },
        { id: "s1", day_of_week: 0, meal_type: "breakfast", is_primary: false, title: "S", item_origin: "auto_generated_sub" }
      ]) 
    }));
    await page.route("**/rest/v1/profiles?**", (route) => route.fulfill({ status: 200, body: JSON.stringify([{ full_name: "Mobile Test" }]) }));

    await page.goto(`/meal-plan-editor-v2/${MOCK_PLAN_ID}`);
    await page.waitForLoadState("networkidle");

    const autoBadge = page.locator("[aria-label='Sugestões automáticas disponíveis']").first();
    await expect(autoBadge).toBeVisible();

    // Check if it's accessible via touch/click (simulated)
    await autoBadge.tap(); // Playwright touch action
    
    const tooltip = page.locator("role=tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Sugestões geradas automaticamente pelo motor clínico");

    // Keyboard interaction on mobile (some users use external keyboards or screen readers)
    await page.keyboard.press("Tab");
    await expect(autoBadge).toBeFocused();
    await page.keyboard.press("Enter");
    
    const toast = page.getByText("Essas sugestões foram geradas automaticamente pelo motor clínico");
    await expect(toast).toBeVisible();
  });
});
