export const DEFAULT_RECIPES = [
    {
        title: "Frango Grelhado com Quinoa e Legumes",
        description: "Uma refeição leve, rica em proteínas e fibras. Ideal para almoço ou jantar.",
        category: "main",
        difficulty: "easy",
        prep_time_minutes: 10,
        cook_time_minutes: 20,
        servings: 1,
        calories_per_serving: 450,
        protein_per_serving: 35,
        carbs_per_serving: 45,
        fat_per_serving: 12,
        ingredients: [
            "150g de peito de frango",
            "1/2 xícara de quinoa cozida",
            "1 xícara de brócolis cozido no vapor",
            "1/2 cenoura ralada",
            "1 colher de sopa de azeite de oliva",
            "Sal e temperos a gosto (limão, ervas finas)"
        ],
        instructions: [
            "Tempere o frango com sal, limão e ervas.",
            "Grelhe o frango em uma frigideira antiaderente com um fio de azeite.",
            "Cozinhe a quinoa em água fervente por 12 minutos.",
            "Misture a quinoa com os legumes e sirva com o frango."
        ],
        is_ai_generated: false,
        is_shared: true
    },
    {
        title: "Omelete de Espinafre e Queijo Branco",
        description: "Café da manhã nutritivo e rápido.",
        category: "breakfast",
        difficulty: "easy",
        prep_time_minutes: 5,
        cook_time_minutes: 10,
        servings: 1,
        calories_per_serving: 280,
        protein_per_serving: 22,
        carbs_per_serving: 5,
        fat_per_serving: 18,
        ingredients: [
            "3 ovos inteiros",
            "1 punhado de espinafre fresco",
            "30g de queijo branco picado",
            "Pimenta do reino a gosto"
        ],
        instructions: [
            "Bata os ovos levemente.",
            "Refogue o espinafre na frigideira rapidamente.",
            "Despeje os ovos e adicione o queijo.",
            "Dobre a omelete quando estiver firme e sirva."
        ],
        is_ai_generated: false,
        is_shared: true
    },
    {
        title: "Smoothie de Banana e Pasta de Amendoim",
        description: "Excelente pré-treino ou lanche da tarde.",
        category: "snack",
        difficulty: "easy",
        prep_time_minutes: 5,
        cook_time_minutes: 0,
        servings: 1,
        calories_per_serving: 350,
        protein_per_serving: 15,
        carbs_per_serving: 40,
        fat_per_serving: 15,
        ingredients: [
            "1 banana congelada",
            "1 scoop de whey protein (opcional)",
            "1 colher de sopa de pasta de amendoim",
            "200ml de leite de amêndoas ou água"
        ],
        instructions: [
            "Bata todos os ingredientes no liquidificador até ficar homogêneo.",
            "Sirva gelado."
        ],
        is_ai_generated: false,
        is_shared: true
    }
];

export const DEFAULT_DIET_TEMPLATES = [
    {
        name: "Emagrecimento Sustentável",
        slug: "emagrecimento-sustentavel",
        description: "Focado em saciedade e déficit calórico moderado. Rico em fibras e proteínas.",
        icon: "🥗",
        category: "weight",
        conditions: ["perder peso", "saúde"],
        base_calories: 1600,
        macro_ratio: { protein: 35, carbs: 35, fat: 30 },
        tags: ["low_calorie", "high_protein"],
        meals: [
            {
                meal_type: "breakfast",
                title: "Café da Manhã",
                foods: [
                    { name: "Ovos mexidos", portion: "2 unidades", calories: 140, protein: 12, carbs: 1, fat: 10, substitutions: ["Omelete de claras"] },
                    { name: "Mamão Papaia", portion: "1/2 unidade", calories: 60, protein: 1, carbs: 15, fat: 0, substitutions: ["Melão", "Morango"] }
                ]
            },
            {
                meal_type: "lunch",
                title: "Almoço",
                foods: [
                    { name: "Frango grelhado", portion: "120g", calories: 190, protein: 30, carbs: 0, fat: 5, substitutions: ["Peixe branco", "Tofu"] },
                    { name: "Arroz integral", portion: "3 colheres de sopa", calories: 110, protein: 3, carbs: 23, fat: 1, substitutions: ["Batata doce", "Quinoa"] },
                    { name: "Salada verde", portion: "À vontade", calories: 20, protein: 1, carbs: 4, fat: 0, substitutions: [] }
                ]
            },
            {
                meal_type: "dinner",
                title: "Jantar",
                foods: [
                    { name: "Filé de Tilápia", portion: "150g", calories: 150, protein: 30, carbs: 0, fat: 3, substitutions: ["Sobrecoxa sem pele"] },
                    { name: "Legumes assados", portion: "150g", calories: 80, protein: 3, carbs: 12, fat: 2, substitutions: ["Sopa de legumes"] }
                ]
            }
        ]
    },
    {
        name: "Hipertrofia Limpa",
        slug: "hipertrofia-limpa",
        description: "Superávit calórico controlado com fontes de carboidratos de baixo índice glicêmico.",
        icon: "💪",
        category: "sport",
        conditions: ["ganho de massa", "treino"],
        base_calories: 2500,
        macro_ratio: { protein: 30, carbs: 45, fat: 25 },
        tags: ["bulking", "clean_eating"],
        meals: [
            {
                meal_type: "breakfast",
                title: "Café da Manhã",
                foods: [
                    { name: "Panqueca de aveia", portion: "2 unidades", calories: 350, protein: 15, carbs: 45, fat: 8, substitutions: ["Pão integral com ovos"] },
                    { name: "Pasta de amendoim", portion: "1 colher de sopa", calories: 90, protein: 4, carbs: 3, fat: 8, substitutions: [] }
                ]
            },
            {
                meal_type: "lunch",
                title: "Almoço",
                foods: [
                    { name: "Patinho moído", portion: "150g", calories: 250, protein: 35, carbs: 0, fat: 10, substitutions: ["Frango", "Atum"] },
                    { name: "Feijão preto", portion: "1 concha pequena", calories: 100, protein: 6, carbs: 18, fat: 0, substitutions: ["Lentilha"] },
                    { name: "Arroz branco", portion: "4 colheres de sopa", calories: 130, protein: 3, carbs: 28, fat: 0, substitutions: ["Macarrão integral"] }
                ]
            }
        ]
    }
];
