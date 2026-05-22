/**
 * 🛡️ TYPE SOBERANO ÚNICO — FitJourney 2.0
 *
 * Este é o ÚNICO shape que componentes podem consumir.
 * Snapshot → extractMealsFromSnapshot() → SovereignMealItem → RENDER.
 *
 * REGRAS:
 * ❌ Componentes NÃO renomeiam campos
 * ❌ Componentes NÃO transformam dados
 * ❌ Componentes NÃO recalculam
 * ✅ Componentes renderizam EXATAMENTE estes campos
 *
 * Se um campo estiver faltando: ERRO DE INTEGRIDADE no log forense.
 * Snapshot deve nascer completo do compile-time do backend.
 */

export interface SovereignMacros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface SovereignSubstitution {
  id: string;
  title: string;
  imageUrl: string | null;
  quantity_display: string;
  clinical_mass_g: number | null;
  macros: SovereignMacros;
}

export interface SovereignMealItem {
  /** ID estável do item no snapshot */
  id: string;
  /** Nome canônico (já formatado pelo compile-time) */
  title: string;
  /** URL da imagem (vem direto do snapshot, sem inferência) */
  imageUrl: string | null;
  /** Texto pronto para exibir (ex: "100g", "2 unidades") */
  quantity_display: string;
  /** Massa em gramas para validações clínicas */
  clinical_mass_g: number | null;
  /** Macros AGRUPADOS — nunca espalhados em top-level */
  macros: SovereignMacros;
  /** Substituições (também soberanas) */
  substitutions: SovereignSubstitution[];
  /** Metadados do contexto da refeição */
  meal: {
    id: string;
    name: string;
    time: string;
    day_of_week: number;
    imageUrl: string | null;
    /** Macros agregados da refeição (do snapshot, não recalculado) */
    macros: SovereignMacros | null;
  };

  // --- PROXIES DE COMPATIBILIDADE (LEGACY) ---
  // Estes campos são povoados PELO EXTRACTOR para evitar lógica nos componentes.
  /** @deprecated Use meal.name */
  tipo_refeicao: string;
  /** @deprecated Use meal.day_of_week */
  day_of_week: number;
  /** @deprecated Use macros.kcal */
  meta_calorias: number;
  /** @deprecated Use macros.protein_g */
  meta_proteinas: number;
  /** @deprecated Use macros.carbs_g */
  meta_carboidratos: number;
  /** @deprecated Use macros.fat_g */
  meta_gorduras: number;
  /** @deprecated Use quantity_display */
  description: string;
  /** @deprecated Use quantity_display */
  display_quantity: string;
  /** @deprecated Use imageUrl */
  image_url: string | null;
  /** @deprecated Sempre true na V3 */
  is_primary: boolean;
  /** Metadados brutos (se necessário) */
  metadata: Record<string, any>;

  /** Marca de origem para debug forense */
  __sovereign: true;
}

/**
 * Resultado da extração — inclui auditoria de integridade
 */
export interface SovereignExtractionResult {
  items: SovereignMealItem[];
  /** Itens com campos faltando (para badge de integridade, NÃO bloqueia render) */
  integrityWarnings: Array<{
    itemTitle: string;
    missingFields: string[];
  }>;
  /** Se snapshot é V3 válido */
  isValidV3: boolean;
}
