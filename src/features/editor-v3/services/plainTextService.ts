import { Meal } from "../types";

export function generateV3PlainText(meals: Meal[], patientName: string): string {
  let text = `PLANO ALIMENTAR V3 - ${patientName.toUpperCase()}\n`;
  text += `==========================================\n\n`;

  meals.forEach((meal, index) => {
    text += `${meal.time || '00:00'} - ${meal.name.toUpperCase()}\n`;
    text += `------------------------------------------\n`;

    meal.items.forEach(item => {
      const quantity = item.quantity ? `${item.quantity}${item.portionUnitLabel || 'g'}` : '';
      text += `• ${item.name}${quantity ? ` (${quantity})` : ''}\n`;
    });

    // Substituições
    const substitutions = meal.items.flatMap(item => item.substitutions || []);
    if (substitutions.length > 0) {
      text += `\nOPÇÕES DE SUBSTITUIÇÃO:\n`;
      substitutions.forEach(sub => {
        text += `  - ${sub.name}\n`;
      });
    }

    text += `\n`;
  });

  text += `==========================================\n`;
  text += `Gerado via FitJourney V3 Soberano\n`;

  return text;
}
