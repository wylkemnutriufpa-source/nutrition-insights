
const fs = require('fs');

const templates = JSON.parse(fs.readFileSync('templates.json', 'utf8'));

const BASE_IMAGE_URL = 'https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/';

const IMAGE_MAP = {
  'Pão Integral': 'pao-integral.jpg',
  'Pão Francês': 'pao-frances.jpg',
  'Ovo Mexido': 'ovos-mexidos.jpg',
  'Arroz Branco': 'arroz-branco.jpg',
  'Feijão Carioca': 'feijao-carioca.jpg',
  'Frango Grelhado': 'frango-grelhado.jpg',
  'Iogurte com Frutas': 'iogurte-com-fruta/iogurte-com-fruta.jpg',
  'Sopa de Legumes': 'sopa-de-legumes.jpg',
  'Banana com Aveia': 'banana-com-aveia.jpg',
  'Whey Protein': 'whey-protein.jpg',
  'Carne Grelhada': 'carne-grelhada.jpg',
  'Tapioca': 'tapioca-com-queijo.jpg'
};

const sqlStatements = [];

templates.forEach(template => {
  const snapshot = template.plan_snapshot;
  if (!snapshot) return;

  const kcalProfiles = Object.keys(snapshot);
  kcalProfiles.forEach(kcal => {
    const data = snapshot[kcal];
    if (!data || !data.meals) return;

    const baseMeals = data.meals.filter(m => m.day_of_week === 1 || m.day_of_week === data.meals[0].day_of_week);
    const newMeals = [];
    for (let d = 1; d <= 7; d++) {
      baseMeals.forEach(m => {
        newMeals.push({
          ...m,
          day_of_week: d,
          id: `m-${m.name}-${d}-${Math.random().toString(36).substr(2, 5)}`,
          items: m.items.map(it => {
            const img = IMAGE_MAP[it.name] ? `${BASE_IMAGE_URL}${IMAGE_MAP[it.name]}` : (it.imageUrl || `${BASE_IMAGE_URL}fruta.jpg`);
            const subs = it.substitutions || [];
            if (subs.length === 0 && it.name === 'Pão Integral') {
              subs.push({
                id: `sub-${Math.random().toString(36).substr(2, 5)}`,
                name: 'Tapioca',
                kcal: it.kcal,
                protein: 1,
                carbs: 34,
                fat: 0,
                clinical_mass_g: 50,
                imageUrl: `${BASE_IMAGE_URL}tapioca-com-queijo.jpg`
              });
            }
            return {
              ...it,
              imageUrl: img,
              substitutions: subs.map(s => ({
                ...s,
                imageUrl: s.imageUrl || (IMAGE_MAP[s.name] ? `${BASE_IMAGE_URL}${IMAGE_MAP[s.name]}` : `${BASE_IMAGE_URL}fruta.jpg`)
              }))
            };
          })
        });
      });
    }
    snapshot[kcal].meals = newMeals;
  });

  const escapedSnapshot = JSON.stringify(snapshot).replace(/'/g, "''");
  sqlStatements.push(`UPDATE v3_diet_templates SET plan_snapshot = '${escapedSnapshot}' WHERE id = '${template.id}';`);
});

fs.writeFileSync('updates.sql', sqlStatements.join('\n'));
