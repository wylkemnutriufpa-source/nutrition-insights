/**
 * 🛡️ EXTRATOR SOBERANO ÚNICO — FitJourney 2.0
 *
 * Este é o ÚNICO ponto onde o snapshot é lido.
 * Componentes NÃO leem snapshot diretamente. Componentes consomem SovereignMealItem.
 *
 * Por que aqui e não nos componentes?
 * - Backend ainda tem 2 estruturas (templates antigos com `foods` e V3 com `items`)
 * - Migrar 67 templates exige tempo
 * - Esta camada é a PONTE até o backend ser 100% V3 enriquecido
 *
 * IMPORTANTE: Esta NÃO é uma camada de tradução com inferência.
 * É um EXTRATOR DETERMINÍSTICO que apenas LÊ o snapshot.
 * Sem fallback "inteligente", sem busca de imagem dinâmica, sem recálculo.
 */

import type {
  SovereignMealItem,
  SovereignSubstitution,
  SovereignMacros,
  SovereignExtractionResult,
} from './SovereignMealItem';

/**
 * Lê macros do item considerando ambas estruturas do banco
 */
function readMacros(raw: any): SovereignMacros {
  return {
    kcal: Number(raw?.macros?.kcal ?? raw?.kcal ?? 0),
    protein_g: Number(raw?.macros?.protein_g ?? raw?.protein ?? 0),
    carbs_g: Number(raw?.macros?.carbs_g ?? raw?.carbs ?? 0),
    fat_g: Number(raw?.macros?.fat_g ?? raw?.fat ?? 0),
  };
}

/**
 * Lê URL da imagem direto do snapshot (SEM inferência, SEM busca externa)
 * Suporta ambas estruturas: item.imageUrl (templates) e item.visual.image_url (planos publicados)
 */
function readImageUrl(raw: any): string | null {
  // 🛡️ Planos publicados (planPersistenceService) gravam visual.image_url
  // Templates gravam imageUrl diretamente
  const url = raw?.visual?.image_url || raw?.imageUrl || raw?.image_url || raw?.image || null;
  if (!url || typeof url !== 'string') return null;
  if (!url.startsWith('http')) return null;
  return url;
}

/**
 * Lê quantity_display direto do snapshot
 * Planos publicados usam quantity_display; templates usam qty
 */
function readQuantityDisplay(raw: any): string {
  return String(
    raw?.quantity_display || raw?.display_quantity || raw?.qty || raw?.quantity || ''
  );
}

/**
 * Detecta campos faltantes para auditoria forense (não bloqueia render)
 */
function auditIntegrity(raw: any): string[] {
  const missing: string[] = [];
  if (!readImageUrl(raw)) missing.push('imageUrl');
  if (!readQuantityDisplay(raw)) missing.push('quantity_display');
  const m = readMacros(raw);
  if (m.kcal === 0 && m.protein_g === 0 && m.carbs_g === 0) missing.push('macros');
  return missing;
}

/**
 * Extrai substituições com mesmo shape soberano
 */
function extractSubstitutions(raw: any): SovereignSubstitution[] {
  if (!Array.isArray(raw?.substitutions)) return [];

  return raw.substitutions.map((sub: any): SovereignSubstitution => ({
    id: String(sub.id || crypto.randomUUID()),
    title: String(sub.title || sub.name || 'Substituição'),
    imageUrl: readImageUrl(sub),
    quantity_display: readQuantityDisplay(sub),
    clinical_mass_g: sub.clinical_mass_g != null ? Number(sub.clinical_mass_g) : null,
    macros: readMacros(sub),
  }));
}

/**
 * 🔪 EXTRATOR PRINCIPAL
 *
 * Lê o snapshot V3 e produz uma lista de SovereignMealItem.
 * Esta é a ÚNICA função que conhece a estrutura do banco.
 */
export function extractMealsFromSnapshot(snapshot: any): SovereignExtractionResult {
  const integrityWarnings: SovereignExtractionResult['integrityWarnings'] = [];

  // Validação V3
  const isValidV3 =
    !!snapshot &&
    (snapshot.snapshot_version === 'v3' || Array.isArray(snapshot.days));

  if (!isValidV3) {
    return { items: [], integrityWarnings: [], isValidV3: false };
  }

  const items: SovereignMealItem[] = [];

  for (const day of snapshot.days || []) {
    const dayOfWeek = day.day_of_week ?? 0;

    for (const meal of day.meals || []) {
      // 🛡️ SOBERANIA V3: Todos os 65 templates já usam 'items' (confirmado 22/05/2026)
      // Ponte foods → items REMOVIDA. Frontend não traduz mais. Apenas renderiza.
      const rawItems = Array.isArray(meal.items) ? meal.items : [];

      const mealMeta = {
        id: String(meal.id || crypto.randomUUID()),
        name: String(meal.name || 'Refeição'),
        time: String(meal.time || ''),
        day_of_week: dayOfWeek,
        imageUrl: readImageUrl(meal),
        macros: meal.macros ? readMacros(meal) : null,
      };

      for (const raw of rawItems) {
        // Auditoria de integridade (não bloqueia render)
        const missing = auditIntegrity(raw);
        if (missing.length > 0) {
          integrityWarnings.push({
            itemTitle: String(raw.title || raw.name || 'sem nome'),
            missingFields: missing,
          });
        }

        const itemMacros = readMacros(raw);
        const itemImageUrl = readImageUrl(raw);
        const itemQty = readQuantityDisplay(raw);

        items.push({
          id: String(raw.id || crypto.randomUUID()),
          title: String(raw.title || raw.name || 'Item'),
          imageUrl: itemImageUrl,
          quantity_display: itemQty,
          clinical_mass_g: raw.clinical_mass_g != null ? Number(raw.clinical_mass_g) : null,
          macros: itemMacros,
          substitutions: extractSubstitutions(raw),
          meal: mealMeta,
          
          // Proxies de compatibilidade
          tipo_refeicao: mealMeta.name,
          day_of_week: mealMeta.day_of_week,
          meta_calorias: itemMacros.kcal,
          meta_proteinas: itemMacros.protein_g,
          meta_carboidratos: itemMacros.carbs_g,
          meta_gorduras: itemMacros.fat_g,
          description: itemQty,
          display_quantity: itemQty,
          image_url: itemImageUrl,
          is_primary: true,
          metadata: raw.metadata || raw.edit_metadata || {},

          __sovereign: true,
        });
      }
    }
  }

  return { items, integrityWarnings, isValidV3: true };
}

/**
 * Helper: Filtra itens por dia da semana (filtragem simples, sem transformação)
 */
export function filterItemsByDay(
  items: SovereignMealItem[],
  dayOfWeek: number,
): SovereignMealItem[] {
  return items.filter(it => it.meal.day_of_week === dayOfWeek);
}

/**
 * Helper: Agrupa itens por refeição (Café da Manhã, Almoço, etc.)
 */
export function groupItemsByMeal(
  items: SovereignMealItem[],
): Map<string, { meal: SovereignMealItem['meal']; items: SovereignMealItem[] }> {
  const groups = new Map<string, { meal: SovereignMealItem['meal']; items: SovereignMealItem[] }>();

  for (const item of items) {
    const key = `${item.meal.day_of_week}_${item.meal.name.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, { meal: item.meal, items: [] });
    }
    groups.get(key)!.items.push(item);
  }

  return groups;
}
