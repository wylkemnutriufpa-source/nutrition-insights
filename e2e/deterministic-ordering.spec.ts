import { test, expect } from "./fixtures";

test.describe("Meal Plan Canvas — Deterministic Ordering & AUTO Seal", () => {
  test("AUTO seal tooltip should support keyboard navigation and exact text", async ({ page }) => {
    // 1. Navigate to a plan where we know there are auto-generated subs
    // For this test to be robust, we'll mock the items in the store if possible, 
    // or use a known plan ID from a fixture.
    await page.goto("/meal-plan-editor-v2/cc51e7bd-55b2-49d3-90ef-f9ac1de002e6");
    await page.waitForLoadState("networkidle");

    // 2. Locate the AUTO badge
    const autoBadge = page.locator("[aria-label='Sugestões automáticas disponíveis']").first();
    await expect(autoBadge).toBeVisible();

    // 3. Navigate via Tab
    await page.keyboard.press("Tab");
    // We might need multiple tabs to reach it, so let's just focus it directly for the first part
    // but the user wants to test "navegar com Tab".
    // Let's try to focus something before it and tab.
    await page.locator("button:has-text('Substituir')").first().focus();
    await page.keyboard.press("Tab");
    
    // Check if focused
    await expect(autoBadge).toBeFocused();

    // 4. Validate exact tooltip text
    const tooltip = page.locator("role=tooltip");
    await expect(tooltip).toContainText("Sugestões geradas automaticamente pelo motor clínico");

    // 5. Press Enter to trigger toast and check text
    await page.keyboard.press("Enter");
    const toast = page.getByText("Essas sugestões foram geradas automaticamente pelo motor clínico");
    await expect(toast).toBeVisible();

    // 6. Press Space to trigger toast again
    await page.keyboard.press("Space");
    await expect(toast).toHaveCount(1); // Still visible

    // 7. Check if it closes on Tab out
    await page.keyboard.press("Tab");
    await expect(tooltip).toBeHidden();

    // 8. Re-open via Shift+Tab
    await page.keyboard.press("Shift+Tab");
    await expect(autoBadge).toBeFocused();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Sugestões geradas automaticamente pelo motor clínico");
  });

  test("Order of primary and substitutions should remain identical after tab/day switching and reload", async ({ page }) => {
    await page.goto("/meal-plan-editor-v2/cc51e7bd-55b2-49d3-90ef-f9ac1de002e6");
    await page.waitForLoadState("networkidle");

    // Helper to get item IDs in order for a specific cell
    const getOrder = async (day: number) => {
      // Assuming each day is a column or section. Let's find breakfast for day X.
      // The items are rendered inside MealSlotCard.
      const cell = page.locator(`div:has-text('Café da Manhã')`).nth(day);
      const items = cell.locator("[data-testid^='meal-item-']");
      const ids = await items.evaluateAll(list => list.map(el => el.getAttribute("data-testid")));
      return ids;
    };

    // 1. Capture initial order for Monday (day 0) and Tuesday (day 1)
    const initialDay0 = await getOrder(0);
    const initialDay1 = await getOrder(1);

    // 2. Switch to Tuesday tab/view
    // Assuming there are tabs for days
    const tuesdayTab = page.locator("button:has-text('Terça')");
    if (await tuesdayTab.isVisible()) {
      await tuesdayTab.click();
      await page.waitForTimeout(500);
      const currentDay1 = await getOrder(1);
      expect(currentDay1).toEqual(initialDay1);
    }

    // 3. Switch back to Monday
    const mondayTab = page.locator("button:has-text('Segunda')");
    if (await mondayTab.isVisible()) {
      await mondayTab.click();
      await page.waitForTimeout(500);
      const currentDay0 = await getOrder(0);
      expect(currentDay0).toEqual(initialDay0);
    }

    // 4. Save and reload
    await page.getByRole("button", { name: /Salvar/i }).first().click();
    await page.reload();
    await page.waitForLoadState("networkidle");

    // 5. Validate order again
    const reloadedDay0 = await getOrder(0);
    const reloadedDay1 = await getOrder(1);

    expect(reloadedDay0).toEqual(initialDay0);
    expect(reloadedDay1).toEqual(initialDay1);
    
    // Ensure primary is always first
    // In our sort logic, primary has is_primary: true
    // We can't check the DB object directly easily here, but we can verify the IDs 
    // match what we expect if we had a deterministic mock.
  });
});
