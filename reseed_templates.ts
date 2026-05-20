
import { createClient } from '@supabase/supabase-js';
import { generatePremiumTemplates } from './src/lib/seedV3Templates';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // I hope this is available in some way, if not I'll use SQL.
const supabase = createClient(supabaseUrl, supabaseKey);

async function reseed() {
  const templates = generatePremiumTemplates();
  console.log(`Reseeding ${templates.length} templates...`);
  
  for (const t of templates) {
    const { error } = await supabase
      .from('v3_diet_templates')
      .upsert({
        ...t,
        active: true,
        sovereign_validated: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });
      
    if (error) console.error(`Error seeding ${t.slug}:`, error);
    else console.log(`Seeded: ${t.title}`);
  }
}

reseed();
