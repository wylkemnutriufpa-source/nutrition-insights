
export const SLOT_TRANSLATIONS: Record<string, string> = {
  'café_da_manhã': 'Café da Manhã',
  'lanche_da_manhã': 'Lanche da Manhã',
  'almoço': 'Almoço',
  'lanche_da_tarde': 'Lanche da Tarde',
  'jantar': 'Jantar',
  'ceia': 'Ceia',
  'pré-treino': 'Pré-Treino',
  'pós-treino': 'Pós-Treino',
  'snack': 'Lanche',
  'snack_1': 'Lanche da Manhã',
  'snack_2': 'Lanche da Tarde',
  'supper': 'Ceia',
  'pre_workout': 'Pré-Treino',
  'post_workout': 'Pós-Treino',
  'cafe_da_manha': 'Café da Manhã',
  'lanche_da_manha': 'Lanche da Manhã',
  'almoco': 'Almoço',
  'lanche_da_tarde': 'Lanche da Tarde',
  'jantar': 'Jantar',
  'ceia': 'Ceia'
};

export const translateSlot = (slot: string): string => {
  if (!slot) return 'Refeição';
  
  // Normalização agressiva para bater no mapa de traduções
  const normalized = slot.toLowerCase()
    .trim()
    .replace(/ /g, '_');
    
  if (SLOT_TRANSLATIONS[normalized]) return SLOT_TRANSLATIONS[normalized];
  
  // Tenta remover acentos se ainda não achou
  const noAccents = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (SLOT_TRANSLATIONS[noAccents]) return SLOT_TRANSLATIONS[noAccents];
  
  return slot.replace(/_/g, ' ');
};
