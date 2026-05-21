/**
 * LOVABLE INTEGRATION HOOK
 * Auto-runs clinical template seeder on app startup
 * Detects broken templates and auto-fixes
 */

import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { seedPremiumV3Templates } from "./seedV3Templates";

const SEEDER_VERSION = '3.2.0';
const SEEDER_RUN_KEY = `template_seeder_run_${SEEDER_VERSION}`;

export function useAutoTemplateSeeder() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const runSeeder = async () => {
      try {
        const lastRun = sessionStorage.getItem(SEEDER_RUN_KEY);
        if (lastRun === 'true') {
          console.log('✅ Templates already checked in this session');
          return;
        }

        console.log('🌱 Initializing Clinical Template Seeder...');

        // Check current templates count
        const { count, error: checkError } = await supabase
          .from('v3_diet_templates')
          .select('*', { count: 'exact', head: true });

        if (checkError) {
          console.warn('⚠️ Could not check templates:', checkError.message);
          return;
        }

        // If templates are missing (less than the expected 62), trigger reseed
        if (!count || count < 60) {
          console.warn(`⚠️ Only ${count || 0} templates found. Triggering sovereign reseed...`);
          const success = await seedPremiumV3Templates();
          if (success) {
            console.log('✅ Sovereign templates seeded successfully');
          } else {
            console.error('❌ Failed to seed templates');
          }
        } else {
          console.log(`✅ System is sovereign: ${count} templates found`);
        }

        sessionStorage.setItem(SEEDER_RUN_KEY, 'true');
      } catch (err) {
        console.error('❌ Seeder error:', err);
      }
    };

    const timer = setTimeout(runSeeder, 1500);
    return () => clearTimeout(timer);
  }, []);
}

export function TemplateSeederInitializer() {
  useAutoTemplateSeeder();
  return null;
}
