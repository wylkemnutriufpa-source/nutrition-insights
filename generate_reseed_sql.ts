
import { generatePremiumTemplates } from './src/lib/seedV3Templates';
import fs from 'fs';

const templates = generatePremiumTemplates();

let sql = '';
for (const t of templates) {
  const data = {
    ...t,
    active: true,
    sovereign_validated: true,
    updated_at: new Date().toISOString()
  };
  
  // Format for psql
  const columns = Object.keys(data).join(', ');
  const values = Object.values(data).map(v => {
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
    return v;
  }).join(', ');
  
  const update = Object.keys(data).map(k => {
    const v = (data as any)[k];
    const val = typeof v === 'object' ? `'${JSON.stringify(v).replace(/'/g, "''")}'` : (typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v);
    return `${k} = ${val}`;
  }).join(', ');

  sql += `INSERT INTO v3_diet_templates (${columns}) VALUES (${values}) ON CONFLICT (slug) DO UPDATE SET ${update};\n`;
}

fs.writeFileSync('reseed_templates.sql', sql);
console.log('SQL generated for 14 templates');
