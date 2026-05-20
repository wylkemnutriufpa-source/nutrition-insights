/**
 * LOVABLE INTEGRATION HOOK
 * Auto-runs clinical template seeder on app startup
 * Detects broken templates and auto-fixes
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SEEDER_VERSION = '3.1.0';
const SEEDER_RUN_KEY = `template_seeder_run_${SEEDER_VERSION}`;

export function useAutoTemplateSeeder() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const runSeeder = async () => {
      try {
        // Check if already run in this session
        const lastRun = sessionStorage.getItem(SEEDER_RUN_KEY);
        if (lastRun === 'true') {
          console.log('✅ Templates already seeded in this session');
          return;
        }

        console.log('🌱 Initializing Clinical Template Seeder...');

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          console.warn('⚠️ Supabase not configured');
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Check current templates
        const { data: existingTemplates, error: checkError } = await supabase
          .from('v3_diet_templates')
          .select('slug, plan_snapshot')
          .limit(1);

        if (checkError) {
          console.warn('⚠️ Could not check templates:', checkError.message);
          return;
        }

        // If templates exist but are broken (too small), trigger reseed
        if (existingTemplates && existingTemplates.length > 0) {
          const firstTemplate = existingTemplates[0];
          const templateSize = JSON.stringify(firstTemplate.plan_snapshot).length;

          if (templateSize < 20000) {
            // Template is likely broken (should be ~158KB)
            console.warn('⚠️ Broken templates detected, running recovery...');

            // Dynamically import and run seeder if it exists
            try {
              // @ts-ignore - Dynamic import that might not exist yet
              const seeder = await import('./clinicalTemplateSeeder');
              if (seeder && seeder.seedTemplates) {
                await seeder.seedTemplates();
              }
            } catch (e) {
              console.warn('⚠️ Seeder module not found, skipping recovery');
            }
          }
        }

        sessionStorage.setItem(SEEDER_RUN_KEY, 'true');
        console.log('✅ Template seeder completed');
      } catch (err) {
        console.error('❌ Seeder error:', err);
      }
    };

    // Run after a small delay to not block UI
    const timer = setTimeout(runSeeder, 1000);
    return () => clearTimeout(timer);
  }, []);
}

export function TemplateSeederInitializer() {
  useAutoTemplateSeeder();
  return null;
}
