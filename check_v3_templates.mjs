import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env file
const envPath = path.resolve('.env');
const envConfig = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing URL or Key in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTemplates() {
  const { data, error } = await supabase
    .from('v3_diet_templates')
    .select('id, title, plan_snapshot');
    
  if (error) {
    console.error("Error fetching data:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("No templates found.");
    return;
  }
  
  const result = data.map(t => {
    let firstProfileMeals = [];
    if (t.plan_snapshot) {
      const keys = Object.keys(t.plan_snapshot);
      if (keys.length > 0) {
        const firstKey = keys[0];
        const profile = t.plan_snapshot[firstKey];
        if (profile?.days?.[0]?.meals) {
          firstProfileMeals = profile.days[0].meals.map(m => m.name + ": " + m.items.map(i => i.name).join(", "));
        }
      }
    }
    
    return {
      title: t.title,
      meals: firstProfileMeals.slice(0, 3) // show first 3 meals
    };
  });
  
  console.log(JSON.stringify(result, null, 2));
}

checkTemplates();
