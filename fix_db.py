import subprocess
import json
import os

MAPPINGS = {
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
}

def process_items(items):
    for it in items:
        title = it.get('title') or it.get('name')
        if not title: continue
        for key, url in MAPPINGS.items():
            if key.lower() in title.lower():
                it['imageUrl'] = url
                it['image_url'] = url
                if 'metadata' in it:
                    it['metadata']['imageUrl'] = url
                    it['metadata']['image_url'] = url
    return items

def fix_patient(patient_id):
    cmd = ["psql", "-t", "-c", f"SELECT json_build_object('id', id, 'snapshot', snapshot) FROM meal_plans WHERE patient_id = '{patient_id}' AND is_active = true;"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if not result.stdout.strip(): return
    
    for line in result.stdout.strip().split('\n'):
        if not line.strip(): continue
        plan = json.loads(line)
        pid = plan['id']
        snapshot = plan['snapshot']
        if not snapshot: continue

        if 'meals' in snapshot and isinstance(snapshot['meals'], list):
            for m in snapshot['meals']:
                m['items'] = process_items(m.get('items', []))
        elif 'days' in snapshot and isinstance(snapshot['days'], list):
            for d in snapshot['days']:
                # Forçar day_of_week correto se for 0
                if d.get('day_of_week') is None:
                    d['day_of_week'] = 0
                for m in d.get('meals', []):
                    m['items'] = process_items(m.get('items', []))

        snapshot_json = json.dumps(snapshot)
        update_cmd = ["psql", "-c", f"UPDATE meal_plans SET snapshot = '{snapshot_json}' WHERE id = '{pid}';"]
        subprocess.run(update_cmd)

fix_patient('69f7926d-d2b1-4b54-ad69-6d1683ca1a13') # Catharina
fix_patient('ef4e3fce-568f-4160-bd19-0f524f723fe5') # Débora
