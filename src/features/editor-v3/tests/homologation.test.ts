
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Auditoria Forense de Templates V3', () => {
  it('Deve validar que todos os 14 templates premium possuem 7 dias e imagens reais', async () => {
    const { data: templates, error } = await supabase
      .from('v3_diet_templates')
      .select('id, title, plan_snapshot')
      .eq('active', true);

    if (error) throw error;
    
    expect(templates.length).toBe(14);

    const report = [];

    for (const t of templates) {
      const result: any = {
        title: t.title,
        status: 'PASSED',
        issues: []
      };

      const profiles = Object.keys(t.plan_snapshot || {});
      if (profiles.length === 0) result.issues.push('Sem snapshots');

      for (const p of profiles) {
        const snapshot = t.plan_snapshot[p];
        const days = snapshot.days || [];
        
        if (days.length !== 7) result.issues.push(`Perfil ${p}: Dias inconsistentes (${days.length})`);

        days.forEach((day, dIdx) => {
          (day.meals || []).forEach(meal => {
            (meal.items || []).forEach(item => {
              if (!item.image_url || item.image_url.includes('undefined') || item.image_url.includes('placeholder')) {
                result.issues.push(`Dia ${dIdx+1}: Item ${item.name} sem imagem real`);
              }
              if (!item.clinical_mass_g || item.clinical_mass_g <= 1) {
                result.issues.push(`Dia ${dIdx+1}: Item ${item.name} com gramagem inválida`);
              }
              if (!item.quantity_display) {
                result.issues.push(`Dia ${dIdx+1}: Item ${item.name} sem display de quantidade`);
              }
            });
          });
        });
      }

      if (result.issues.length > 0) {
        result.status = 'FAILED';
      }
      report.push(result);
    }

    console.table(report);
    
    const failed = report.filter(r => r.status === 'FAILED');
    expect(failed.length).toBe(0);
  });
});
