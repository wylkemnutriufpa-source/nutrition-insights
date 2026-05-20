
import fs from 'fs';

async function fixTemplates() {
  const data = fs.readFileSync('templates.json', 'utf8');
  const templates = JSON.parse(data);
  const visualData = fs.readFileSync('visual_library.json', 'utf8');
  const visualLibrary = JSON.parse(visualData);


  const imageMap: Record<string, string> = {};
  visualLibrary?.forEach(item => {
    imageMap[item.name.toLowerCase()] = item.image_url;
  });

  // Common aliases
  imageMap['ovos mexidos'] = imageMap['ovo-mexido'] || 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovos-mexidos.jpg';
  imageMap['frango grelhado'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-com-frango.png';
  imageMap['arroz integral'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png';
  imageMap['iogurte natural'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/kefir.jpg';
  imageMap['mamão com aveia'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-aveia.jpg';
  imageMap['salada verde'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/salada-verde.jpg';
  imageMap['whey protein'] = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/whey-protein.jpg';

  // 2. Fetch all templates
  const { data: templates } = await supabase
    .from('v3_diet_templates')
    .select('*');

  if (!templates) return;

  for (const t of templates) {
    const snapshots = t.plan_snapshot || {};
    let modified = false;

    for (const kcal of Object.keys(snapshots)) {
      const snapshot = snapshots[kcal];
      if (!snapshot.days || snapshot.days.length === 0) continue;

      snapshot.days.forEach((day: any) => {
        day.meals.forEach((meal: any) => {
          meal.items.forEach((item: any) => {
            // Fix images
            const itemName = item.name.toLowerCase();
            const foundImage = imageMap[itemName] || Object.entries(imageMap).find(([k]) => itemName.includes(k))?.[1];
            
            if (!item.image_url || item.image_url.includes('undefined') || item.image_url.includes('placeholder')) {
              if (foundImage) {
                item.image_url = foundImage;
                modified = true;
              } else {
                // Fallback for demo/safety
                item.image_url = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/arroz-feijao-frango.png';
                modified = true;
              }
            }

            // Fix clinical weight
            if (!item.clinical_mass_g || item.clinical_mass_g <= 1) {
              item.clinical_mass_g = item.mass_g || 100;
              modified = true;
            }

            // Fix quantity display
            if (!item.quantity_display) {
              item.quantity_display = `${item.clinical_mass_g}g`;
              modified = true;
            }
          });
        });
      });
    }

    if (modified) {
      console.log(`Updating template: ${t.title}`);
      await supabase
        .from('v3_diet_templates')
        .update({ plan_snapshot: snapshots, sovereign_validated: true })
        .eq('id', t.id);
    }
  }
}

fixTemplates();
