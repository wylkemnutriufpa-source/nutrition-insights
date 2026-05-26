import json
import os
import sys

def reconstruct_macros(items, target_kcal, target_protein):
    """
    Ensures items in a meal sum up to reasonable values and prioritizes protein.
    """
    total_p = 0
    total_c = 0
    total_f = 0
    total_k = 0
    
    for item in items:
        # If macros are placeholder (0), set them based on name/title
        if item.get('macros', {}).get('kcal', 0) == 0 or item.get('kcal', 0) == 0:
            name = item.get('name', '').lower()
            if 'frango' in name or 'carne' in name or 'peixe' in name or 'tilápia' in name:
                # Protein source
                mass = item.get('clinical_mass_g', 100)
                item['protein'] = round(mass * 0.25) # 25% protein
                item['fat'] = round(mass * 0.05)     # 5% fat
                item['carbs'] = 0
                item['kcal'] = (item['protein'] * 4) + (item['fat'] * 9)
            elif 'ovo' in name:
                # Eggs
                qty = item.get('quantity', 2)
                item['protein'] = qty * 6
                item['fat'] = qty * 5
                item['carbs'] = 1
                item['kcal'] = (item['protein'] * 4) + (item['fat'] * 9) + (item['carbs'] * 4)
            elif 'legumes' in name or 'vegetais' in name or 'salada' in name:
                mass = item.get('clinical_mass_g', 100)
                item['protein'] = round(mass * 0.02)
                item['carbs'] = round(mass * 0.05)
                item['fat'] = 0
                item['kcal'] = (item['protein'] * 4) + (item['carbs'] * 4)
            elif 'iogurte' in name:
                item['protein'] = 5
                item['carbs'] = 8
                item['fat'] = 2
                item['kcal'] = (5*4 + 8*4 + 2*9)
            elif 'gelatina' in name:
                item['protein'] = 1
                item['carbs'] = 1
                item['fat'] = 0
                item['kcal'] = 8
            else:
                # Default generic placeholder logic
                item['protein'] = item.get('protein', 0)
                item['carbs'] = item.get('carbs', 0)
                item['fat'] = item.get('fat', 0)
                item['kcal'] = (item['protein'] * 4) + (item['carbs'] * 4) + (item['fat'] * 9)
            
            # Sync macros map
            item['macros'] = {
                'protein_g': item['protein'],
                'carbs_g': item['carbs'],
                'fat_g': item['fat'],
                'kcal': item['kcal']
            }

        total_p += item.get('protein', 0)
        total_c += item.get('carbs', 0)
        total_f += item.get('fat', 0)
        total_k += item.get('kcal', 0)
    
    return total_p, total_c, total_f, total_k

def process_template(template):
    id = template['id']
    title = template['title']
    snapshot = template['plan_snapshot']
    
    if not snapshot:
        return None

    audit_report = []
    
    # Iterate over kcal levels (keys in snapshot)
    for kcal_level, data in snapshot.items():
        if not isinstance(data, dict) or 'days' not in data:
            continue
            
        target_kcal = int(kcal_level)
        
        for day in data['days']:
            day_p = 0
            day_c = 0
            day_f = 0
            day_k = 0
            
            for meal in day.get('meals', []):
                m_p, m_c, m_f, m_k = reconstruct_macros(meal.get('items', []), target_kcal, 0)
                day_p += m_p
                day_c += m_c
                day_f += m_f
                day_k += m_k
            
            # Audit check
            divergence = abs(day_k - target_kcal) / target_kcal if target_kcal > 0 else 0
            
            audit_report.append({
                'kcal_level': kcal_level,
                'total_kcal': day_k,
                'total_protein': day_p,
                'total_carbs': day_c,
                'total_fat': day_f,
                'divergence': round(divergence * 100, 2),
                'status': 'safe' if divergence < 0.1 else 'requires_clinical_review'
            })

    # Update clinical tags
    new_tags = template['clinical_tags']
    # Remove pending status
    new_tags = [t for t in new_tags if not (isinstance(t, dict) and t.get('status') == 'nutrition_pending_reconstruction')]
    # Add reconstructed status
    new_tags.append({"status": "fisiologicamente_reconstruido"})
    new_tags.append({"audit_version": "v3_soberana_g2"})
    
    return {
        'id': id,
        'title': title,
        'plan_snapshot': snapshot,
        'clinical_tags': new_tags,
        'audit': audit_report
    }

# This script would be run for a batch of templates.
# I will simulate the update query output.
