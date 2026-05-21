
import re

input_file = 'scripts/migration_soberana.sql'
output_file = 'scripts/migration_soberana_upsert.sql'

on_conflict_clause = """ ON CONFLICT (slug) DO UPDATE SET 
    title = EXCLUDED.title, 
    description = EXCLUDED.description, 
    template_type = EXCLUDED.template_type, 
    objective = EXCLUDED.objective, 
    visual_style = EXCLUDED.visual_style, 
    kcal_profiles = EXCLUDED.kcal_profiles, 
    meal_distribution = EXCLUDED.meal_distribution, 
    plan_snapshot = EXCLUDED.plan_snapshot, 
    cluster_map = EXCLUDED.cluster_map, 
    active = EXCLUDED.active, 
    sovereign_validated = EXCLUDED.sovereign_validated;
"""

with open(input_file, 'r', encoding='utf-8') as f_in:
    with open(output_file, 'w', encoding='utf-8') as f_out:
        for line in f_in:
            line = line.strip()
            if line.endswith(');'):
                # Replace the trailing ); with the on conflict clause
                new_line = line[:-2] + on_conflict_clause
                f_out.write(new_line + '\n')
            elif line:
                f_out.write(line + '\n')
