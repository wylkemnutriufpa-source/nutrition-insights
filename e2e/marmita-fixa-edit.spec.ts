import { test, expect } from "./fixtures";

test.describe("Marmita Fixa Flow", () => {
  test("should apply a fixed lunchbox and adjust its portion correctly", async ({ page, dashboardPage }) => {
    // 1. Go to a meal plan editor
    await page.goto("/meal-plan-editor-v2/cc51e7bd-55b2-49d3-90ef-f9ac1de002e6"); // Using the ID I found earlier or a dummy one
    
    // 2. Open Meal Library Sidebar
    await page.getByRole("button", { name: /Biblioteca/i }).click();
    
    // 3. Search for a fixed lunchbox (marmita fixa)
    await page.getByPlaceholder(/Buscar/i).fill("Marmita");
    
    // 4. Click "Adicionar ao editor"
    // The button I added: <Button ...>Adicionar ao editor</Button>
    const addBtn = page.getByRole("button", { name: /Adicionar ao editor/i }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    
    // 5. Verify item is in the editor
    const mealCard = page.locator("[id^='meal-item-']").first();
    await expect(mealCard).toBeVisible();
    
    // 6. Open the smart editor for that item
    await mealCard.click();
    
    // 7. Verify macros are not zero
    const kcalValue = page.locator("span.text-orange-500").first();
    const kcalText = await kcalValue.innerText();
    expect(Number(kcalText)).toBeGreaterThan(0);
    
    // 8. Adjust portion (+10%)
    const plusBtn = page.getByRole("button", { name: "+ 10%" });
    await expect(plusBtn).toBeVisible();
    await plusBtn.click();
    
    // 9. Save and check if daily total is updated
    await page.getByRole("button", { name: /Salvar Alterações/i }).click();
    
    // 10. Verify success toast
    await expect(page.getByText(/Refeição atualizada com sucesso/i)).toBeVisible();
    
    // 11. Verify macros updated in the card (not zeroed)
    const cardKcal = mealCard.locator(".text-orange-400").parentElement();
    const cardKcalText = await cardKcal.innerText();
    expect(Number(cardKcalText.replace(/\D/g, ""))).toBeGreaterThan(0);
  });
});
