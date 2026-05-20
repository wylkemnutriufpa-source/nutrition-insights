
import { generatePremiumTemplates } from './src/lib/seedV3Templates';
import fs from 'fs';

const templates = generatePremiumTemplates();
fs.writeFileSync('generated_templates.json', JSON.stringify(templates, null, 2));
console.log('Templates generated');
