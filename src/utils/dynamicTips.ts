/**
 * Sistema de Dicas Dinâmicas em Tempo Real
 * Gera dicas personalizadas conforme os dados são preenchidos
 * Usado tanto na Anamnese quanto na Avaliação Física
 */

export interface Tip {
    category: 'health' | 'restriction' | 'lifestyle' | 'goal' | 'activity' | 'personalized' | 'body' | 'progress';
    icon: string;
    title: string;
    content: string;
    priority: 'high' | 'medium' | 'low';
    source?: string;
    is_pinned?: boolean;
}

/**
 * Gera dicas em tempo real baseadas nos dados da anamnese
 */
export const generateAnamnesisTips = (anamnesisData: any, patientName: string = 'Paciente'): Tip[] => {
    const tips: Tip[] = [];
    const name = patientName.split(' ')[0];

    if (!anamnesisData) return tips;

    const answers = anamnesisData.answers || {};

    // ===== CONDIÇÕES MÉDICAS =====
    const conditions = answers.medical_conditions || [];

    if (conditions.includes('diabetes') || conditions.includes('Diabetes')) {
        tips.push({
            category: 'health',
            icon: '🩺',
            title: 'Cuidados com Diabetes',
            content: `${name}, como você tem diabetes, vamos montar um plano com baixo índice glicêmico. Prefira carboidratos complexos (aveia, quinoa, batata doce), evite açúcares simples e faça refeições regulares para manter a glicemia estável.`,
            priority: 'high',
            source: 'anamnese'
        });
    }

    if (conditions.includes('hipertensao') || conditions.includes('Hipertensão') || conditions.includes('pressao_alta')) {
        tips.push({
            category: 'health',
            icon: '❤️',
            title: 'Controle da Pressão',
            content: `${name}, para controlar sua pressão arterial, vamos reduzir o sódio da dieta. Evite alimentos industrializados, embutidos e temperos prontos. Aumente o consumo de potássio (banana, abacate, folhas verdes) que ajuda a equilibrar a pressão.`,
            priority: 'high',
            source: 'anamnese'
        });
    }

    if (conditions.includes('colesterol') || conditions.includes('Colesterol Alto')) {
        tips.push({
            category: 'health',
            icon: '🫀',
            title: 'Colesterol sob Controle',
            content: `${name}, para melhorar seu colesterol, vamos incluir mais fibras solúveis (aveia, maçã, leguminosas) e gorduras boas (azeite, castanhas, peixes). Reduza frituras e carnes gordurosas. Ômega-3 é seu aliado!`,
            priority: 'high',
            source: 'anamnese'
        });
    }

    if (conditions.includes('gastrite') || conditions.includes('Gastrite') || conditions.includes('refluxo')) {
        tips.push({
            category: 'health',
            icon: '🔥',
            title: 'Proteção Gástrica',
            content: `${name}, com sensibilidade gástrica, evite café em excesso, alimentos ácidos e muito condimentados. Prefira refeições menores e mais frequentes. Não deite logo após comer e mastiga bem os alimentos.`,
            priority: 'medium',
            source: 'anamnese'
        });
    }

    // ===== ALERGIAS E INTOLERÂNCIAS =====
    const allergies = answers.allergies || [];
    const intolerances = answers.food_intolerances || [];

    if (allergies.includes('lactose') || intolerances.includes('lactose') || intolerances.includes('Lactose')) {
        tips.push({
            category: 'restriction',
            icon: '🥛',
            title: 'Alternativas sem Lactose',
            content: `${name}, como você tem intolerância à lactose, vamos usar leites vegetais (aveia, amêndoas, coco), queijos zero lactose e garantir seu cálcio através de folhas verde-escuras, sardinha e gergelim.`,
            priority: 'high',
            source: 'anamnese'
        });
    }

    if (allergies.includes('gluten') || intolerances.includes('gluten') || intolerances.includes('Glúten')) {
        tips.push({
            category: 'restriction',
            icon: '🌾',
            title: 'Vida sem Glúten',
            content: `${name}, para evitar o glúten, usaremos farinhas alternativas (arroz, mandioca, amêndoas). Atenção aos produtos industrializados que podem conter traços. Aveia só se for certificada sem glúten!`,
            priority: 'high',
            source: 'anamnese'
        });
    }

    // ===== ESTILO DE VIDA =====
    const sleepHours = parseInt(answers.sleep_hours) || 0;
    if (sleepHours > 0 && sleepHours < 6) {
        tips.push({
            category: 'lifestyle',
            icon: '😴',
            title: 'Sono e Metabolismo',
            content: `${name}, dormir menos de 6 horas afeta seus hormônios da fome (grelina e leptina), aumentando o apetite. Tente melhorar a qualidade do sono - evite telas à noite, faça um chá calmante e mantenha horários regulares.`,
            priority: 'medium',
            source: 'anamnese'
        });
    }

    const stressLevel = answers.stress_level;
    if (stressLevel === 'high' || stressLevel === 'very_high' || stressLevel === 'alto' || stressLevel === 'muito_alto') {
        tips.push({
            category: 'lifestyle',
            icon: '🧘',
            title: 'Combatendo o Estresse',
            content: `${name}, o estresse elevado aumenta o cortisol e pode sabotar seus resultados. Inclua alimentos ricos em magnésio (chocolate amargo 70%, banana, espinafre) e reserve momentos de relaxamento. Sua saúde mental importa!`,
            priority: 'medium',
            source: 'anamnese'
        });
    }

    const waterIntake = parseInt(answers.water_intake) || 0;
    if (waterIntake > 0 && waterIntake < 1500) {
        tips.push({
            category: 'lifestyle',
            icon: '💧',
            title: 'Hidratação é Chave',
            content: `${name}, você está bebendo pouca água! A meta é pelo menos 35ml por kg de peso. Água ajuda no metabolismo, na digestão e até na sensação de saciedade. Deixe uma garrafa sempre por perto!`,
            priority: 'high',
            source: 'anamnese'
        });
    }

    // ===== OBJETIVO =====
    const goal = answers.main_goal || answers.sports_goal;
    if (goal === 'weight_loss' || goal === 'emagrecimento' || goal === 'perder_peso') {
        tips.push({
            category: 'goal',
            icon: '🎯',
            title: 'Foco no Emagrecimento',
            content: `${name}, para perder peso de forma saudável, vamos criar um déficit calórico moderado. Priorize proteínas para manter a massa muscular, fibras para saciedade e não pule refeições! Consistência é mais importante que perfeição.`,
            priority: 'high',
            source: 'anamnese'
        });
    }

    if (goal === 'muscle_gain' || goal === 'ganho_muscular' || goal === 'hipertrofia') {
        tips.push({
            category: 'goal',
            icon: '💪',
            title: 'Construindo Músculos',
            content: `${name}, para ganhar massa muscular, você precisa de superávit calórico e proteína adequada (1.6-2.2g/kg). Distribua a proteína ao longo do dia, especialmente pós-treino. Carboidratos são combustível para seus treinos!`,
            priority: 'high',
            source: 'anamnese'
        });
    }

    return tips;
};

/**
 * Combina dicas e prioriza
 */
export const combineTips = (anamnesisTips: Tip[], assessmentTips: Tip[] = []): Tip[] => {
    const allTips = [...anamnesisTips, ...assessmentTips];

    // Ordenar por prioridade
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    allTips.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

    // Remover duplicatas
    const seen = new Set<string>();
    return allTips.filter(tip => {
        const key = tip.title.toLowerCase().substring(0, 20);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};
