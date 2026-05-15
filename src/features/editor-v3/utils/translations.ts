
export const SLOT_TRANSLATIONS: Record<string, string> = {
  'Café da Manhã': 'Café da Manhã',
  'Lanche da Manhã': 'Lanche da Manhã',
  'Almoço': 'Almoço',
  'Lanche da Tarde': 'Lanche da Tarde',
  'snack': 'Lanche',
  'snack_1': 'Lanche da Manhã',
  'snack_2': 'Lanche da Tarde',
  'Jantar': 'Jantar',
  'Ceia': 'Ceia',
  'supper': 'Ceia',
  'pre_workout': 'Pré-Treino',
  'post_workout': 'Pós-Treino',
  'cafe_da_manha': 'Café da Manhã',
  'lanche_da_manha': 'Lanche da Manhã',
  'almoco': 'Almoço',
  'almoço': 'Almoço',
  'lanche_da_tarde': 'Lanche da Tarde',
  'jantar': 'Jantar',
  'ceia': 'Ceia'
};

export const translateSlot = (slot: string): string => {
  if (!slot) return 'Refeição';
  const normalized = slot.toLowerCase().trim().replace(/ /g, '_');
  return SLOT_TRANSLATIONS[normalized] || slot.replace(/_/g, ' ');
};
