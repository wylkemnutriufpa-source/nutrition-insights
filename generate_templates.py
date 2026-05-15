
import json
import uuid

# Allowed values mapping
GOAL_MAP = {
    "hipertrofia": "hypertrophy",
    "emagrecimento": "weight_loss",
    "saude": "maintenance",
    "clinico": "metabolic",
    "performance": "hypertrophy",
    "estilo_de_vida": "maintenance",
}

categories = [
    ("Hipertrofia Masculina", "hipertrofia", "💪", "Foco em superávit calórico e alta proteína para desenvolvimento muscular masculino.", "hipertrofia", "power"),
    ("Hipertrofia Feminina", "hipertrofia", "🏋️‍♀️", "Ganho de massa magra com foco em tônus muscular e saúde hormonal feminina.", "hipertrofia", "wellness"),
    ("Emagrecimento Feminino", "emagrecimento", "👗", "Déficit calórico estratégico com foco em saciedade e controle de compulsão.", "emagrecimento", "clean"),
    ("Emagrecimento Masculino", "emagrecimento", "👕", "Redução de gordura corporal com manutenção de massa magra e alta saciedade.", "emagrecimento", "clean"),
    ("Low Carb", "emagrecimento", "🥑", "Redução de carboidratos com foco em gorduras boas e proteínas de alta qualidade.", "low_carb", "functional"),
    ("Cetogênica", "emagrecimento", "🥓", "Indução de cetose para queima acelerada de gordura e clareza mental.", "keto", "metabolic"),
    ("Mediterrânea", "saude", "🥗", "Baseada em vegetais, azeite de oliva e proteínas magras para longevidade.", "mediterranea", "lifestyle"),
    ("Anti-inflamatória", "saude", "🌿", "Foco em alimentos que reduzem a inflamação sistêmica e melhoram a imunidade.", "anti_inflamatoria", "clinical"),
    ("Diabetes", "clinico", "🩸", "Controle glicêmico rigoroso com carboidratos de baixo índice glicêmico e fibras.", "diabetes", "clinical"),
    ("Hipertensão", "clinico", "❤️", "Redução de sódio e foco em alimentos ricos em potássio e magnésio.", "hipertensao", "clinical"),
    ("SOP", "clinico", "🥚", "Estratégia nutricional para controle de resistência insulínica e saúde ovariana.", "sop", "clinical"),
    ("Menopausa", "clinico", "🌸", "Aporte de cálcio, vitamina D e fitoestrógenos para saúde feminina na maturidade.", "menopausa", "clinical"),
    ("Pós-parto", "saude", "👶", "Nutrição densa para recuperação materna e suporte à amamentação.", "pos_parto", "wellness"),
    ("Gestante", "saude", "🤰", "Aporte completo de micronutrientes para o desenvolvimento fetal saudável.", "gestante", "clinical"),
    ("Vegana", "estilo_de_vida", "🌱", "100% à base de plantas com combinações proteicas completas e biodisponíveis.", "vegana", "clean"),
    ("Vegetariana", "estilo_de_vida", "🥦", "Equilíbrio nutricional sem carnes, com foco em ovos, laticínios e leguminosas.", "vegetariana", "clean"),
    ("Performance esportiva", "performance", "🏃", "Otimização de estoques de glicogênio e recuperação muscular para atletas.", "performance", "power"),
    ("Crossfit", "performance", "🏋️", "Nutrição para alta intensidade, combinando força, potência e resistência.", "crossfit", "power"),
    ("Corrida", "performance", "👟", "Foco em carboidratos complexos e hidratação para endurance e performance.", "corrida", "performance"),
    ("Lifestyle saudável", "saude", "🍏", "Equilíbrio prático para quem busca longevidade e bem-estar no dia a dia.", "saudavel", "lifestyle"),
    ("Reeducação alimentar", "saude", "🔄", "Transição para hábitos saudáveis com alimentos reais e sem restrições extremas.", "reeducacao", "clean"),
    ("Definição muscular", "hipertrofia", "🔪", "Fase de cutting para evidenciar a musculatura com preservação de massa magra.", "definicao", "clean"),
    ("Alta proteína", "hipertrofia", "🍗", "Maximização do aporte proteico para reparação tecidual e saciedade.", "high_protein", "power"),
    ("Sem lactose", "saude", "🥛", "Plano livre de lácteos, focado em substitutos nutritivos e saúde digestiva.", "no_lactose", "functional"),
    ("Sem glúten", "saude", "🌾", "Alternativas seguras e nutritivas para celíacos ou sensíveis ao glúten.", "no_gluten", "functional"),
    ("Fit econômico", "saude", "💰", "Saúde e resultados utilizando alimentos básicos e acessíveis da cesta básica.", "economico", "pratico"),
    ("Rotina corrida", "saude", "⚡", "Refeições rápidas e práticas para quem tem pouco tempo para cozinhar.", "pratico", "pratico"),
    ("Home office", "saude", "💻", "Controle calórico e praticidade para quem trabalha de casa e cozinha pouco.", "home_office", "pratico"),
    ("Adolescente", "saude", "🎒", "Suporte ao crescimento e desenvolvimento com foco em densidade nutritiva.", "adolescente", "clinical"),
    ("Idoso", "saude", "👴", "Foco em densidade proteica para evitar sarcopenia e aporte de micronutrientes.", "idoso", "clinical"),
    ("Nutrição clínica leve", "clinico", "🏥", "Recuperação de quadros clínicos leves com dieta de fácil digestão.", "clinica_leve", "clinical"),
    ("Imunidade", "saude", "🛡️", "Aporte de zinco, vitamina C e antioxidantes para fortalecer as defesas.", "imunidade", "clinical"),
    ("Detox leve", "saude", "🥤", "Estímulo natural das vias de desintoxicação com foco em fitoquímicos.", "detox", "functional"),
    ("Massa magra feminina", "hipertrofia", "💃", "Hipertrofia moderada para curvas definidas sem acúmulo de gordura.", "massa_magra", "wellness"),
    ("Bariátrica", "clinico", "🥣", "Progressão nutricional e densidade para pacientes pós-cirurgia bariátrica.", "bariatrica", "clinical"),
    ("Pré-treino manhã", "performance", "☀️", "Energia rápida e digestão leve para treinos logo ao acordar.", "pre_treino", "performance"),
    ("Pré-treino noite", "performance", "🌙", "Aporte energético para treinos noturnos sem prejudicar a qualidade do sono.", "pre_treino", "performance"),
    ("Ceia leve / sono", "saude", "💤", "Alimentos precursores de melatonina e digestão tranquila para o sono.", "sono", "lifestyle"),
    ("Intestinal leve", "saude", "🚽", "Fibras e probióticos para regulação do trânsito intestinal e saúde do bioma.", "intestinal", "clinical"),
    ("Plano equilibrado tradicional", "saude", "🍽️", "A base da nutrição: Arroz, feijão, proteína e salada em harmonia.", "tradicional", "lifestyle"),
]

def get_meals_for_category(cat_name):
    # Standard 6-meal structure
    return [
        {
            "meal_type": "breakfast",
            "title": "Café da Manhã",
            "blocks": [{
                "label": "Base",
                "options": [
                    {"name": "Pão com Ovos", "calories": 280, "protein": 14, "carbs": 25, "fat": 12, "portion": "2 fatias + 2 ovos"},
                    {"name": "Tapioca Recheada", "calories": 300, "protein": 12, "carbs": 35, "fat": 10, "portion": "1 unidade média"},
                    {"name": "Cuscuz com Queijo", "calories": 260, "protein": 10, "carbs": 30, "fat": 8, "portion": "1 xícara"}
                ]
            }]
        },
        {
            "meal_type": "morning_snack",
            "title": "Lanche da Manhã",
            "blocks": [{
                "label": "Fruta/Iogurte",
                "options": [
                    {"name": "Fruta da Estação", "calories": 80, "protein": 1, "carbs": 20, "fat": 0, "portion": "1 porção"},
                    {"name": "Iogurte Natural", "calories": 100, "protein": 7, "carbs": 10, "fat": 4, "portion": "170g"},
                    {"name": "Mix de Nuts", "calories": 120, "protein": 3, "carbs": 4, "fat": 11, "portion": "20g"}
                ]
            }]
        },
        {
            "meal_type": "lunch",
            "title": "Almoço",
            "blocks": [{
                "label": "Prato Principal",
                "options": [
                    {"name": "Arroz, Feijão e Frango", "calories": 450, "protein": 35, "carbs": 45, "fat": 10, "portion": "1 prato médio"},
                    {"name": "Macarrão com Carne Moída", "calories": 500, "protein": 30, "carbs": 60, "fat": 15, "portion": "1 prato médio"},
                    {"name": "Strogonoff de Frango", "calories": 480, "protein": 32, "carbs": 40, "fat": 18, "portion": "1 prato médio"}
                ]
            }]
        },
        {
            "meal_type": "afternoon_snack",
            "title": "Lanche da Tarde",
            "blocks": [{
                "label": "Proteico/Prático",
                "options": [
                    {"name": "Sanduíche de Atum", "calories": 250, "protein": 18, "carbs": 25, "fat": 8, "portion": "1 unidade"},
                    {"name": "Whey com Banana", "calories": 220, "protein": 25, "carbs": 25, "fat": 2, "portion": "1 scoop + 1 banana"},
                    {"name": "Omelete Simples", "calories": 180, "protein": 12, "carbs": 2, "fat": 14, "portion": "2 ovos"}
                ]
            }]
        },
        {
            "meal_type": "dinner",
            "title": "Jantar",
            "blocks": [{
                "label": "Refeição Principal",
                "options": [
                    {"name": "Salmão com Legumes", "calories": 400, "protein": 35, "carbs": 15, "fat": 20, "portion": "1 posta + legumes"},
                    {"name": "Carne com Mandioca", "calories": 450, "protein": 30, "carbs": 50, "fat": 12, "portion": "1 prato médio"},
                    {"name": "Sopa de Legumes", "calories": 300, "protein": 20, "carbs": 35, "fat": 8, "portion": "500ml"}
                ]
            }]
        },
        {
            "meal_type": "evening_snack",
            "title": "Ceia",
            "blocks": [{
                "label": "Leve",
                "options": [
                    {"name": "Chá com Torradas", "calories": 80, "protein": 2, "carbs": 15, "fat": 1, "portion": "200ml + 2 torradas"},
                    {"name": "Kiwi/Abacate", "calories": 100, "protein": 1, "carbs": 12, "fat": 6, "portion": "1 unidade"},
                    {"name": "Leite Morno", "calories": 120, "protein": 6, "carbs": 10, "fat": 6, "portion": "200ml"}
                ]
            }]
        }
    ]

sql_inserts = []
for name, goal_cat, icon, desc, style, visual in categories:
    slug = name.lower().replace(" ", "-").replace("/", "-")
    meals = get_meals_for_category(name)
    
    # Customize meals based on category for variety
    if "Low Carb" in name or "Cetogênica" in name:
        for m in meals:
            for b in m["blocks"]:
                for o in b["options"]:
                    if o["carbs"] > 10:
                        o["carbs"] = 5
                        o["fat"] += 5
    if "Hipertrofia" in name:
        for m in meals:
            for b in m["blocks"]:
                for o in b["options"]:
                    o["protein"] += 10
                    o["calories"] += 50
    
    insert = f"""
INSERT INTO diet_templates (id, name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, meals, tags, is_active, template_generation, complexity_level, food_access_level)
VALUES (
  '{uuid.uuid4()}',
  '{name}',
  '{slug}-v2',
  '{desc}',
  '{icon}',
  '{goal_cat}',
  '{goal_cat}',
  '{style}',
  1800,
  '{{"protein": 30, "carbs": 40, "fat": 30}}',
  '{json.dumps(meals, ensure_ascii=False).replace("'", "''")}',
  ARRAY['premium', '{style}', 'official'],
  true,
  'official_v2',
  'simples',
  'facil'
);"""
    sql_inserts.append(insert)

with open("inserts.sql", "w") as f:
    f.write("\n".join(sql_inserts))
