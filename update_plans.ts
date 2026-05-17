import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const MAPPINGS = {
  "Cuscuz Nordestino": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/cuscuz-com-ovo-2.jpg",
  "Queijo Branco": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/queijo-minas.jpg",
  "Batata Doce": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-com-batata-doce/frango-com-batata-doce.jpg",
  "Feijão Carioca": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/feijao-carioca.jpg",
  "Peito de Frango Grelhado": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/frango-grelhado.jpg",
  "Banana Prata": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/banana-com-canela.jpg",
  "Omelete Completa": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/omelete.jpg",
  "Tapioca com Queijo": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/tapioca-com-queijo.jpg",
  "Ovo Mexido": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovos-mexidos.jpg",
  "Mandioca Cozida": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mandioca-cozida.jpg",
  "Macarrão": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/macarrao-integral.jpg",
  "Maçã": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/maca/maca.jpg",
  "Mamão Papaia": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/mamao/mamao.jpg",
  "Sanduíche Natural": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/sanduiche-natural%2Fsanduiche-natural.jpg",
  "Iogurte Natural Desnatado": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/iogurte-natural/iogurte-natural.jpg",
  "Pão Integral": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-frances.jpg",
  "Frango Desfiado": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/pao-com-frango-desfiado.jpg"
};

async function fixPlan(patientId: string) {
  const { data: plans } = await supabase
    .from('meal_plans')
    .select('id, snapshot')
    .eq('patient_id', patientId)
    .eq('is_active', true);

  if (!plans) return;

  for (const plan of plans) {
    let snapshot = plan.snapshot;
    if (!snapshot) continue;

    const processItems = (items: any[]) => {
      return items.map(it => {
        const title = it.title || it.name;
        for (const [key, url] of Object.entries(MAPPINGS)) {
          if (title && title.includes(key)) {
            it.imageUrl = url;
            it.image_url = url;
            if (it.metadata) {
              it.metadata.imageUrl = url;
              it.metadata.image_url = url;
            }
          }
        }
        return it;
      });
    };

    if (Array.isArray(snapshot.meals)) {
      snapshot.meals = snapshot.meals.map((m: any) => ({
        ...m,
        items: processItems(m.items || [])
      }));
    } else if (Array.isArray(snapshot.days)) {
      snapshot.days = snapshot.days.map((d: any) => ({
        ...d,
        meals: (d.meals || []).map((m: any) => ({
          ...m,
          items: processItems(m.items || [])
        }))
      }));
    }

    await supabase.from('meal_plans').update({ snapshot }).eq('id', plan.id);
  }
}

async function main() {
  await fixPlan('69f7926d-d2b1-4b54-ad69-6d1683ca1a13'); // Catharina
  await fixPlan('ef4e3fce-568f-4160-bd19-0f524f723fe5'); // Débora
}

main();
