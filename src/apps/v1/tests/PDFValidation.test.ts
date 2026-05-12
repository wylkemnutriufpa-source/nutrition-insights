import { describe, it, expect } from 'vitest';
import { buildPremiumMealPlanHTML, type PremiumMealPlanPDFData } from '../lib/pdfExportPremium';

describe('PDF Export Validation', () => {
  it('should calculate "Macros não considerados" only from substitutions of the same substitution_group_id', () => {
    const data: PremiumMealPlanPDFData = {
      planTitle: 'Test Plan',
      patientName: 'John Doe',
      nutritionistName: 'Jane Smith',
      startDate: '2023-01-01',
      items: [
        {
          id: '1',
          mealType: 'breakfast',
          title: 'Primary 1',
          calories_target: 300,
          protein_target: 20,
          carbs_target: 30,
          fat_target: 10,
          is_primary: true,
          substitution_group_id: 'group-1',
          day_of_week: 1
        },
        {
          id: '2',
          mealType: 'breakfast',
          title: 'Sub 1 of Group 1',
          calories_target: 100,
          protein_target: 5,
          carbs_target: 10,
          fat_target: 5,
          is_primary: false,
          substitution_group_id: 'group-1',
          day_of_week: 1
        },
        {
          id: '3',
          mealType: 'breakfast',
          title: 'Primary 2',
          calories_target: 400,
          protein_target: 30,
          carbs_target: 40,
          fat_target: 15,
          is_primary: true,
          substitution_group_id: 'group-2',
          day_of_week: 1
        },
        {
          id: '4',
          mealType: 'breakfast',
          title: 'Sub 1 of Group 2',
          calories_target: 50,
          protein_target: 2,
          carbs_target: 5,
          fat_target: 2,
          is_primary: false,
          substitution_group_id: 'group-2',
          day_of_week: 1
        }
      ]
    } as any;

    const html = buildPremiumMealPlanHTML(data);
    
    // Check if group 1's "Macros não considerados" is correct (100kcal)
    // We look for the text around the group 1 items
    expect(html).toContain('Primary 1');
    expect(html).toContain('Sub 1 of Group 1');
    // Group 1 should have 100 kcal in its "Macros não considerados" section
    // The HTML has: <span style="margin-left: 4px;">100 kcal · P 5g · C 10g · G 5g</span>
    expect(html).toContain('100 kcal · P 5g · C 10g · G 5g');
    
    // Check if group 2's "Macros não considerados" is correct (50kcal)
    expect(html).toContain('Primary 2');
    expect(html).toContain('Sub 1 of Group 2');
    // Group 2 should have 50 kcal
    expect(html).toContain('50 kcal · P 2g · C 5g · G 2g');

    // Fail if groups are mixed (just a logical check in the test)
    // If we didn't group by substitution_group_id, we might have seen 150kcal somewhere or mixed titles
    const group1Section = html.substring(html.indexOf('Primary 1'), html.indexOf('Primary 2'));
    expect(group1Section).not.toContain('Sub 1 of Group 2');
    expect(group1Section).not.toContain('50 kcal');
  });
});
