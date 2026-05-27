
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

import fs from 'fs';
import path from 'path';

// Load .env robustly
const envConfig: any = {};
try {
  const envPath = path.resolve('.env');
  const envText = fs.readFileSync(envPath, 'utf8');
  envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join('=').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envConfig[key] = val;
    }
  });
} catch (e) {}

const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Auditoria Forense dos 14 Templates Soberanos', () => {
  let templates: any[] = [];

  beforeAll(async () => {
    const { data } = await supabase.from('v3_diet_templates').select('*');
    templates = data || [];
  });

  it('Deve possuir exatamente 14 templates no banco', () => {
    expect(templates.length).toBe(14);
  });

  it('Todos os templates devem ter 7 dias completos no snapshot', () => {
    templates.forEach(t => {
      const profiles = Object.keys(t.plan_snapshot || {});
      expect(profiles.length).toBeGreaterThan(0);
      
      profiles.forEach(p => {
        const snapshot = t.plan_snapshot[p];
        expect(snapshot.days).toBeDefined();
        expect(snapshot.days.length).toBe(7);
      });
    });
  });

  it('Nenhum item deve possuir imagem placeholder ou nula', () => {
    templates.forEach(t => {
      const profiles = Object.keys(t.plan_snapshot || {});
      profiles.forEach(p => {
        const snapshot = t.plan_snapshot[p];
        snapshot.days.forEach((day: any) => {
          day.meals.forEach((meal: any) => {
            meal.items.forEach((item: any) => {
              expect(item.imageUrl).toBeDefined();
              expect(item.imageUrl).not.toContain('placeholder');
              expect(item.imageUrl).not.toBe('');
              expect(item.imageUrl).not.toBeNull();
            });
          });
        });
      });
    });
  });

  it('Todos os itens devem possuir clinical_mass_g e quantity_display preenchidos', () => {
    templates.forEach(t => {
      const profiles = Object.keys(t.plan_snapshot || {});
      profiles.forEach(p => {
        const snapshot = t.plan_snapshot[p];
        snapshot.days.forEach((day: any) => {
          day.meals.forEach((meal: any) => {
            meal.items.forEach((item: any) => {
              expect(item.clinical_mass_g).toBeDefined();
              expect(Number(item.clinical_mass_g)).toBeGreaterThan(0);
              expect(item.quantity_display).toBeDefined();
              expect(item.quantity_display).not.toBe('');
            });
          });
        });
      });
    });
  });

  it('Todos os templates devem estar com sovereign_validated = true', () => {
    templates.forEach(t => {
      expect(t.sovereign_validated).toBe(true);
    });
  });
});
