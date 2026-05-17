const fs = require('fs');
const baseUrl = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";
function getImageUrl(name) {
  if (!name) return `${baseUrl}/fruta.jpg`;
  const slug = name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${baseUrl}/${slug}.jpg`;
}
const content = fs.readFileSync('templates.csv', 'utf8');
const lines = content.split('\n');
let sql = "";
for (const line of lines) {
  if (!line.trim()) continue;
  const firstComma = line.indexOf(',');
  const id = line.substring(0, firstComma);
  let snapshotStr = line.substring(firstComma + 1);
  if (snapshotStr.startsWith('"') && snapshotStr.endsWith('"')) { snapshotStr = snapshotStr.substring(1, snapshotStr.length - 1).replace(/""/g, '"'); }
  try {
    const snapshot = JSON.parse(snapshotStr);
    for (const kcal in snapshot) {
      const plan = snapshot[kcal];
      if (plan && plan.meals) {
        plan.meals.forEach(meal => {
          if (meal.items) {
            meal.items.forEach(item => {
              item.imageUrl = getImageUrl(item.name);
              if (item.substitutions) { item.substitutions.forEach(sub => { sub.imageUrl = getImageUrl(sub.name); }); }
            });
          }
        });
      }
    }
    const updatedJson = JSON.stringify(snapshot).replace(/'/g, "''");
    sql += `UPDATE v3_diet_templates SET plan_snapshot = '${updatedJson}' WHERE id = '${id}';\n`;
  } catch (e) {}
}
fs.writeFileSync('migration.sql', sql);
