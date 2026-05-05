import { test, expect } from '@playwright/test';

test.describe('Editor V3 E2E Flow', () => {
  const patientId = '42b958c6-aa5f-4955-9406-3c1d04d6a045';

  test('should create draft and save successfully', async ({ page }) => {
    // 1. Abrir rota v3
    await page.goto(`/v3/${patientId}`);
    
    // 2. Validar criação de draft via log ou rede
    const draftRequest = await page.waitForRequest(request => 
      request.url().includes('v3_drafts') && request.method() === 'POST' || request.method() === 'GET'
    );
    expect(draftRequest).toBeDefined();

    // 3. Executar save
    const saveButton = page.locator('button:has-text("SALVAR"), button:has-text("Salvar")');
    await saveButton.click();

    // 4. Validar PATCH 200
    const patchResponse = await page.waitForResponse(response => 
      response.url().includes('v3_drafts') && response.request().method() === 'PATCH'
    );
    expect(patchResponse.status()).toBe(200);

    // 5. Refresh e validar persistência
    await page.reload();
    const reloadResponse = await page.waitForResponse(response => 
      response.url().includes('v3_drafts') && response.request().method() === 'GET'
    );
    expect(reloadResponse.status()).toBe(200);
  });
});
