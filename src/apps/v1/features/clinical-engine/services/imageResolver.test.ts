import { describe, test, expect, vi } from "vitest";
import { 
  getFoodImage, 
  filterFoodsWithImages, 
  validateMealImage 
} from "./imageResolver";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ 
          data: [
            { name: 'Frango Grelhado', display_name: 'Filé de frango grelhado', image_url: '/img/frango.jpg', is_active: true },
            { name: 'Arroz Branco', display_name: 'Arroz Branco', image_url: '/img/arroz.jpg', is_active: true }
          ], 
          error: null 
        }))
      }))
    }))
  }
}));

describe("Phase 6 — Image Resolver", () => {
  test('Frango grelhado tem imagem de frango (não carne)', async () => {
    const img = await getFoodImage('Filé de frango grelhado');
    expect(img.url).toContain('frango');
    expect(img.url).not.toContain('carne');
    expect(img.source).toBe('exact');
  });

  test('Busca por nome similar funciona', async () => {
    const img = await getFoodImage('frango'); // partial
    expect(img.url).toContain('frango');
    expect(img.source).toBe('similar');
  });

  test('Alimento sem imagem → NÃO retorna na lista filtrada', async () => {
    const foods = [
      { id: '1', name: 'Sardinha' }, 
      { id: '2', name: 'Frango' }
    ];
    const imageBank = [
      { food_name: 'Frango', image_url: '/img/frango.jpg' }
    ];
    const filtered = await filterFoodsWithImages(foods, imageBank);
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Frango');
  });

  test('Fallback de categoria funciona para itens sem imagem exata', async () => {
    const img = await getFoodImage('Alimento Desconhecido', 'proteina');
    expect(img.url).toContain('protein-fallback');
    expect(img.source).toBe('fallback');
  });

  test('validateMealImage bloqueia itens sem imagem válida', () => {
    expect(validateMealImage({ name: 'Teste', imageUrl: '/img/valida.jpg' })).toBe(true);
    expect(validateMealImage({ name: 'Teste' })).toBe(false);
    expect(validateMealImage({ name: 'Teste', imageUrl: '/placeholder.svg' })).toBe(false);
  });
});
