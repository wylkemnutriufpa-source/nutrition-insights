import json

# Sample items mapping for reconstruction
RECON_MAP = {
    "Vitamina Verde": {"p": 2, "c": 25, "f": 1, "k": 117},
    "Salada Completa": {"p": 5, "c": 15, "f": 2, "k": 98},
    "Frango": {"p": 25, "c": 0, "f": 5, "k": 145},
    "Salada de Frutas": {"p": 1, "c": 25, "f": 0, "k": 104},
    "Sopa Detox": {"p": 8, "c": 20, "f": 2, "k": 130},
    "Ovos Mexidos": {"p": 12, "c": 1, "f": 10, "k": 142},
    "Gelatina Diet": {"p": 1, "c": 1, "f": 0, "k": 8},
    "Filé de Tilápia": {"p": 25, "c": 0, "f": 2, "k": 118},
    "Legumes no Vapor": {"p": 2, "c": 6, "f": 0, "k": 32},
    "Salada Verde": {"p": 1, "c": 3, "f": 0, "k": 16},
    "Iogurte Natural": {"p": 5, "c": 8, "f": 2, "k": 70},
    "Maçã": {"p": 0, "c": 14, "f": 0, "k": 56},
    "Frango Grelhado": {"p": 30, "c": 0, "f": 5, "k": 165}
}

def fix_snapshot(snapshot):
    new_snapshot = {}
    for kcal, data in snapshot.items():
        if 'days' not in data:
            new_snapshot[kcal] = data
            continue
        
        new_days = []
        for day in data['days']:
            new_meals = []
            for meal in day.get('meals', []):
                new_items = []
                for item in meal.get('items', []):
                    title = item.get('title', item.get('name', ''))
                    recon = RECON_MAP.get(title)
                    if recon:
                        item['protein'] = recon['p']
                        item['carbs'] = recon['c']
                        item['fat'] = recon['f']
                        item['kcal'] = recon['k']
                        item['macros'] = {
                            "protein_g": recon['p'],
                            "carbs_g": recon['c'],
                            "fat_g": recon['f'],
                            "kcal": recon['k']
                        }
                    else:
                        # Fallback calculation if macros are zero but kcal exists
                        if item.get('kcal', 0) > 0 and item.get('protein', 0) == 0:
                            k = item['kcal']
                            # Default to 30% P, 40% C, 30% F for unknown
                            p = round((k * 0.3) / 4)
                            c = round((k * 0.4) / 4)
                            f = round((k * 0.3) / 9)
                            item['protein'] = p
                            item['carbs'] = c
                            item['fat'] = f
                            item['macros'] = {"protein_g": p, "carbs_g": c, "fat_g": f, "kcal": k}
                    new_items.append(item)
                meal['items'] = new_items
                new_meals.append(meal)
            day['meals'] = new_meals
            new_days.append(day)
        data['days'] = new_days
        new_snapshot[kcal] = data
    return new_snapshot

# I'll process the Bariatrica and Detox templates
import sys

input_data = sys.stdin.read()
templates = json.loads(input_data)

updates = []
for t in templates:
    t['plan_snapshot'] = fix_snapshot(t['plan_snapshot'])
    updates.append(t)

print(json.dumps(updates))
