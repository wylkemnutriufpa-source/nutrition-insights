const fs = require('fs');
const baseUrl = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";
function getImageUrl(name) {
  if (!name) return `${baseUrl}/fruta.jpg`;
  const slug = name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${baseUrl}/${slug}.jpg`;
}
const content = fs.readFileSync('debora_plan.csv', 'utf8');
if (!content.trim()) process.exit(0);
const firstComma = content.indexOf(',');
const id = content.substring(0, firstComma);
let snapshotStr = content.substring(firstComma + 1);
if (snapshotStr.startsWith('"') && snapshotStr.endsWith('"')) { snapshotStr = snapshotStr.substring(1, snapshotStr.length - 1).replace(/""/g, '"'); }
try {
  const snapshot = JSON.parse(snapshotStr);
  if (snapshot.days) {
    snapshot.days.forEach(day => {
      if (day.meals) {
        day.meals.forEach(meal => {
          if (meal.items) {
            meal.items.forEach(item => {
              item.visual = item.visual || {};
              item.visual.image_url = getImageUrl(item.title);
              item.image_url = item.visual.image_url;
              if (item.substitutions) {
                item.substitutions.forEach(sub => {
                  sub.visual = sub.visual || {};
                  sub.visual.image_url = getImageUrl(sub.title || sub.name);
                  sub.image_url = sub.visual.image_url;
                });
              }
            });
          }
        });
      }
    });
  }
  const updatedJson = JSON.stringify(snapshot).replace(/'/g, "''");
  console.log(`UPDATE meal_plans SET snapshot = '${updatedJson}' WHERE id = '${id}';`);
} catch (e) {}
