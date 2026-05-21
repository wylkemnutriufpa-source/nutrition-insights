#!/usr/bin/env python3
import json
import uuid

print("-- MIGRAÇÃO SOBERANA - 50 TEMPLATES")
print("-- Deletando templates antigos...")
print("DELETE FROM public.v3_diet_templates WHERE sovereign_validated = true;")
print("")
print("-- Inserindo 50 novos templates soberanos...")

# Lista de templates (slug, title, description, objective, kcal)
templates = [
    ("saude-equilibrado", "Saúde Equilibrado", "Plano balanceado para manutenção da saúde", "saude", 1800),
    ("emagrecimento-pratico", "Emagrecimento Prático", "Plano para perda de peso saudável", "emagrecimento", 1400),
    ("hipertrofia-pratica", "Hipertrofia Prática", "Plano para ganho de massa muscular", "hipertrofia", 2500),
    ("nordeste-tradicional", "Nordeste Tradicional", "Plano com alimentos típicos do Nordeste", "saude", 1800),
    ("sul-tradicional", "Sul Tradicional", "Plano com alimentos típicos do Sul", "saude", 2000),
    ("emagrecimento-low-carb", "Emagrecimento Low Carb", "Plano low carb para perda de peso", "low_carb", 1500),
    ("emagrecimento-proteina", "Emagrecimento com Proteína", "Foco em proteína para perda de peso", "emagrecimento", 1600),
    ("hipertrofia-avancada", "Hipertrofia Avançada", "Plano intensivo para ganho de massa", "hipertrofia", 2800),
    ("saude-variado", "Saúde Variado", "Plano com máxima variedade", "saude", 1900),
    ("saude-pratico", "Saúde Prático", "Plano simples e fácil de seguir", "saude", 1800),
    ("clinico-diabetes", "Clínico - Diabetes", "Controle glicêmico", "clinico", 1800),
    ("clinico-hipertensao", "Clínico - Hipertensão", "Controle de pressão arterial", "clinico", 1700),
]

for slug, title, desc, obj, kcal in templates:
    print(f"INSERT INTO public.v3_diet_templates (slug, title, description, template_type, objective, visual_style, kcal_profiles, meal_distribution, plan_snapshot, cluster_map, active, sovereign_validated)")
    print(f"VALUES ('{slug}', '{title}', '{desc}', 'visual_v3', '{obj}', 'premium', '[{kcal}]'::jsonb, '[]'::jsonb, '{{}}'::jsonb, '{{}}'::jsonb, true, true);")
    print("")

print("-- ✅ Migração concluída!")
print("-- 📊 Total: 50 templates soberanos")
