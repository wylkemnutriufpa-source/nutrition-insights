
export const SLOT_TRANSLATIONS: Record<string, string> = {
  'breakfast': 'Café da Manhã',
  'morning_snack': 'Lanche da Manhã',
  'lunch': 'Almoço',
  'afternoon_snack': 'Lanche da Tarde',
  'snack': 'Lanche',
  'snack_1': 'Lanche da Manhã',
  'snack_2': 'Lanche da Tarde',
  'dinner': 'Jantar',
  'evening_snack': 'Ceia',
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
