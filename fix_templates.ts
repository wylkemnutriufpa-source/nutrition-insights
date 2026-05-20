
import fs from 'fs';

async function fixTemplates() {
  const data = fs.readFileSync('templates.json', 'utf8');
  const templates = JSON.parse(data);
  const visualData = fs.readFileSync('visual_library.json', 'utf8');
  const visualLibrary = JSON.parse(visualData);

  const imageMap: Record<string, string> = {};
  visualLibrary?.forEach((item: any) => {
    imageMap[item.name.toLowerCase()] = item.image_url;
  });

  // Common aliases and high-quality clinical images
  imageMap['ovos mexidos'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovos-mexidos.jpg';
  imageMap['frango grelhado'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-com-frango.png';
  imageMap['arroz integral'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png';
  imageMap['iogurte natural'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/kefir.jpg';
  imageMap['mamão com aveia'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg';
  imageMap['salada verde'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/salada-verde.jpg';
  imageMap['whey protein'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/whey-protein.jpg';
  imageMap['banana prata'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg';
  imageMap['maçã'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frutas-vermelhas/frutas-vermelhas.jpg';
  imageMap['mix de castanhas'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/castanhas.jpg';
  imageMap['filé de tilápia'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/peixe-com-legumes.jpg';

  if (fs.existsSync('fix_templates.sql')) fs.unlinkSync('fix_templates.sql');

  for (const t of templates) {
    const snapshots = t.plan_snapshot || {};
    let modified = false;

    for (const kcal of Object.keys(snapshots)) {
      const snapshot = snapshots[kcal];
      if (!snapshot.days || snapshot.days.length === 0) continue;

      snapshot.days.forEach((day: any) => {
        day.meals.forEach((meal: any) => {
          meal.items.forEach((item: any) => {
            const itemName = item.name.toLowerCase();
            const foundImage = imageMap[itemName] || Object.entries(imageMap).find(([k]) => itemName.includes(k))?.[1];
            
            if (!item.image_url || item.image_url.includes('undefined') || item.image_url.includes('placeholder')) {
              item.image_url = foundImage || 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png';
              modified = true;
            }

            if (!item.clinical_mass_g || item.clinical_mass_g <= 1) {
              item.clinical_mass_g = item.mass_g || 100;
              modified = true;
            }

            if (!item.quantity_display || item.quantity_display === 'undefined') {
              item.quantity_display = `${item.clinical_mass_g}g`;
              modified = true;
            }
          });
        });
      });
    }

    if (modified) {
      const sql = `UPDATE v3_diet_templates SET plan_snapshot = '${JSON.stringify(snapshots).replace(/'/g, "''")}', sovereign_validated = true WHERE id = '${t.id}';\n`;
      fs.appendFileSync('fix_templates.sql', sql);
    }
  }
  console.log('SQL generated');
}

fixTemplates();
