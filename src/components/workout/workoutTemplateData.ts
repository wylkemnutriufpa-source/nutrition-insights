// Templates de treino editáveis - organizados por nível e objetivo

export interface TemplateExercise {
  name: string;
  muscle_group: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

export interface TemplateRoutine {
  name: string;
  exercises: TemplateExercise[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  category: string;
  level: string;
  days: number;
  description: string;
  routines: TemplateRoutine[];
}

export const BUILT_IN_TEMPLATES: WorkoutTemplate[] = [
  // ════════════════════════════════════════════════
  // HIPERTROFIA 1 — INICIANTE
  // ════════════════════════════════════════════════
  {
    id: "tpl-hyper-1-iniciante",
    name: "Hipertrofia 1 — Iniciante",
    category: "hypertrophy",
    level: "iniciante",
    days: 3,
    description: "Full body 3x/semana para iniciantes em ganho muscular",
    routines: [
      { name: "Full Body A", exercises: [
        { name: "Agachamento no Smith", muscle_group: "Pernas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Supino Máquina", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Puxada Frontal", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Elevação Lateral", muscle_group: "Ombros", sets: 2, reps: "15", rest_seconds: 45 },
        { name: "Rosca Direta na Barra", muscle_group: "Bíceps", sets: 2, reps: "12", rest_seconds: 45 },
        { name: "Prancha Abdominal", muscle_group: "Core", sets: 3, reps: "30s", rest_seconds: 30 },
      ]},
      { name: "Full Body B", exercises: [
        { name: "Leg Press 45°", muscle_group: "Pernas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Remada Sentada", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Crucifixo Máquina", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Desenvolvimento Máquina", muscle_group: "Ombros", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Tríceps Corda", muscle_group: "Tríceps", sets: 2, reps: "12", rest_seconds: 45 },
        { name: "Abdominal Crunch", muscle_group: "Core", sets: 3, reps: "15", rest_seconds: 30 },
      ]},
      { name: "Full Body C", exercises: [
        { name: "Cadeira Extensora", muscle_group: "Quadríceps", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Supino Inclinado Máquina", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Remada Unilateral com Halter", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Rosca Martelo", muscle_group: "Bíceps", sets: 2, reps: "12", rest_seconds: 45 },
        { name: "Elevação de Panturrilha", muscle_group: "Panturrilha", sets: 3, reps: "15", rest_seconds: 45 },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // HIPERTROFIA 2 — INTERMEDIÁRIO
  // ════════════════════════════════════════════════
  {
    id: "tpl-hyper-2-intermediario",
    name: "Hipertrofia 2 — Intermediário (Push/Pull/Legs)",
    category: "hypertrophy",
    level: "intermediario",
    days: 4,
    description: "Divisão PPL otimizada para ganho muscular, 4x/semana",
    routines: [
      { name: "Push (Peito/Ombro/Tríceps)", exercises: [
        { name: "Supino Reto com Barra", muscle_group: "Peito", sets: 4, reps: "8-10", rest_seconds: 90 },
        { name: "Desenvolvimento com Halteres", muscle_group: "Ombros", sets: 3, reps: "10-12", rest_seconds: 60 },
        { name: "Crucifixo Inclinado com Halteres", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Elevação Lateral com Halteres", muscle_group: "Ombros", sets: 3, reps: "15", rest_seconds: 45 },
        { name: "Tríceps Corda na Polia", muscle_group: "Tríceps", sets: 3, reps: "12-15", rest_seconds: 45 },
      ]},
      { name: "Pull (Costas/Bíceps)", exercises: [
        { name: "Puxada Frontal Pegada Aberta", muscle_group: "Costas", sets: 4, reps: "8-10", rest_seconds: 90 },
        { name: "Remada Curvada com Barra", muscle_group: "Costas", sets: 4, reps: "8-10", rest_seconds: 90 },
        { name: "Remada Unilateral com Halter", muscle_group: "Costas", sets: 3, reps: "10-12", rest_seconds: 60 },
        { name: "Rosca Direta com Barra", muscle_group: "Bíceps", sets: 3, reps: "10-12", rest_seconds: 60 },
        { name: "Rosca Martelo com Halteres", muscle_group: "Bíceps", sets: 3, reps: "12", rest_seconds: 45 },
      ]},
      { name: "Legs A (Quadríceps)", exercises: [
        { name: "Agachamento Livre", muscle_group: "Quadríceps", sets: 4, reps: "8-10", rest_seconds: 120 },
        { name: "Leg Press 45°", muscle_group: "Quadríceps", sets: 4, reps: "10-12", rest_seconds: 90 },
        { name: "Cadeira Extensora", muscle_group: "Quadríceps", sets: 3, reps: "12-15", rest_seconds: 60 },
        { name: "Avanço com Halteres", muscle_group: "Quadríceps", sets: 3, reps: "10 (cada)", rest_seconds: 60 },
        { name: "Panturrilha em Pé", muscle_group: "Panturrilha", sets: 4, reps: "15-20", rest_seconds: 45 },
      ]},
      { name: "Legs B (Posterior/Glúteos)", exercises: [
        { name: "Stiff com Barra", muscle_group: "Posterior", sets: 4, reps: "10-12", rest_seconds: 90 },
        { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Hip Thrust com Barra", muscle_group: "Glúteos", sets: 4, reps: "10-12", rest_seconds: 90 },
        { name: "Abdução na Máquina", muscle_group: "Glúteos", sets: 3, reps: "15", rest_seconds: 45 },
        { name: "Panturrilha Sentado", muscle_group: "Panturrilha", sets: 4, reps: "15", rest_seconds: 45 },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // HIPERTROFIA 3 — AVANÇADO
  // ════════════════════════════════════════════════
  {
    id: "tpl-hyper-3-avancado",
    name: "Hipertrofia 3 — Avançado (Upper/Lower 5x)",
    category: "hypertrophy",
    level: "avancado",
    days: 5,
    description: "Alto volume e frequência para atletas avançados",
    routines: [
      { name: "Upper A (Força)", exercises: [
        { name: "Supino Reto com Barra", muscle_group: "Peito", sets: 5, reps: "5-6", rest_seconds: 150, notes: "Carga pesada, foco em força" },
        { name: "Remada Curvada com Barra", muscle_group: "Costas", sets: 4, reps: "6-8", rest_seconds: 120 },
        { name: "Desenvolvimento Militar Barra", muscle_group: "Ombros", sets: 4, reps: "6-8", rest_seconds: 120 },
        { name: "Rosca Direta Barra Reta", muscle_group: "Bíceps", sets: 3, reps: "8-10", rest_seconds: 60 },
        { name: "Tríceps Testa com Barra", muscle_group: "Tríceps", sets: 3, reps: "8-10", rest_seconds: 60 },
      ]},
      { name: "Lower A (Força)", exercises: [
        { name: "Agachamento Livre", muscle_group: "Quadríceps", sets: 5, reps: "5-6", rest_seconds: 180, notes: "Carga pesada, foco em força" },
        { name: "Levantamento Terra Romeno", muscle_group: "Posterior", sets: 4, reps: "6-8", rest_seconds: 120 },
        { name: "Leg Press 45°", muscle_group: "Quadríceps", sets: 4, reps: "8-10", rest_seconds: 90 },
        { name: "Hip Thrust com Barra", muscle_group: "Glúteos", sets: 4, reps: "8-10", rest_seconds: 90 },
        { name: "Panturrilha em Pé", muscle_group: "Panturrilha", sets: 4, reps: "12-15", rest_seconds: 45 },
      ]},
      { name: "Upper B (Volume)", exercises: [
        { name: "Supino Inclinado com Halteres", muscle_group: "Peito", sets: 4, reps: "10-12", rest_seconds: 60 },
        { name: "Puxada Frontal Pegada Fechada", muscle_group: "Costas", sets: 4, reps: "10-12", rest_seconds: 60 },
        { name: "Crucifixo no Cabo", muscle_group: "Peito", sets: 3, reps: "12-15", rest_seconds: 45 },
        { name: "Face Pull", muscle_group: "Ombros", sets: 3, reps: "15", rest_seconds: 45 },
        { name: "Elevação Lateral com Halteres", muscle_group: "Ombros", sets: 4, reps: "15", rest_seconds: 45 },
        { name: "Rosca Alternada com Halteres", muscle_group: "Bíceps", sets: 3, reps: "12", rest_seconds: 45 },
        { name: "Tríceps Corda na Polia", muscle_group: "Tríceps", sets: 3, reps: "15", rest_seconds: 45 },
      ]},
      { name: "Lower B (Volume)", exercises: [
        { name: "Agachamento Búlgaro", muscle_group: "Quadríceps", sets: 4, reps: "10 (cada)", rest_seconds: 90 },
        { name: "Stiff com Halteres", muscle_group: "Posterior", sets: 4, reps: "10-12", rest_seconds: 60 },
        { name: "Cadeira Extensora", muscle_group: "Quadríceps", sets: 3, reps: "15", rest_seconds: 45 },
        { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 3, reps: "15", rest_seconds: 45 },
        { name: "Abdução na Máquina", muscle_group: "Glúteos", sets: 3, reps: "20", rest_seconds: 45 },
        { name: "Panturrilha Sentado", muscle_group: "Panturrilha", sets: 4, reps: "15", rest_seconds: 45 },
      ]},
      { name: "Upper C (Metabólico)", exercises: [
        { name: "Supino com Halteres (Drop Set)", muscle_group: "Peito", sets: 3, reps: "10+10+10", rest_seconds: 90, notes: "Drop set: reduzir 20% a cada série" },
        { name: "Remada Sentada no Cabo", muscle_group: "Costas", sets: 4, reps: "12", rest_seconds: 60 },
        { name: "Desenvolvimento Arnold", muscle_group: "Ombros", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Rosca 21", muscle_group: "Bíceps", sets: 3, reps: "21", rest_seconds: 60, notes: "7 parcial baixa + 7 parcial alta + 7 completas" },
        { name: "Mergulho Paralelas", muscle_group: "Tríceps", sets: 3, reps: "max", rest_seconds: 60 },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // EMAGRECIMENTO 1 — INICIANTE
  // ════════════════════════════════════════════════
  {
    id: "tpl-emagrec-1-iniciante",
    name: "Emagrecimento 1 — Iniciante",
    category: "fat_loss",
    level: "iniciante",
    days: 3,
    description: "Treino metabólico leve para iniciantes em emagrecimento",
    routines: [
      { name: "Circuito A", exercises: [
        { name: "Agachamento no Smith", muscle_group: "Pernas", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Supino Máquina", muscle_group: "Peito", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Remada Sentada", muscle_group: "Costas", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Caminhada na Esteira", muscle_group: "Cardio", sets: 1, reps: "15 min", rest_seconds: 0, notes: "Inclinação 5-8%, passo acelerado" },
        { name: "Prancha Abdominal", muscle_group: "Core", sets: 3, reps: "20s", rest_seconds: 30 },
      ]},
      { name: "Circuito B", exercises: [
        { name: "Leg Press", muscle_group: "Pernas", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Crucifixo Máquina", muscle_group: "Peito", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Puxada Frontal", muscle_group: "Costas", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Bicicleta Ergométrica", muscle_group: "Cardio", sets: 1, reps: "15 min", rest_seconds: 0, notes: "Intensidade moderada" },
        { name: "Abdominal Crunch", muscle_group: "Core", sets: 3, reps: "15", rest_seconds: 30 },
      ]},
      { name: "Circuito C", exercises: [
        { name: "Cadeira Extensora", muscle_group: "Quadríceps", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Desenvolvimento Máquina", muscle_group: "Ombros", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Elíptico", muscle_group: "Cardio", sets: 1, reps: "15 min", rest_seconds: 0, notes: "Ritmo constante" },
        { name: "Prancha Lateral", muscle_group: "Core", sets: 2, reps: "15s (cada lado)", rest_seconds: 30 },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // EMAGRECIMENTO 2 — INTERMEDIÁRIO
  // ════════════════════════════════════════════════
  {
    id: "tpl-emagrec-2-intermediario",
    name: "Emagrecimento 2 — Intermediário (HIIT + Musculação)",
    category: "fat_loss",
    level: "intermediario",
    days: 4,
    description: "Combinação de musculação com HIIT para queima otimizada",
    routines: [
      { name: "Upper + HIIT", exercises: [
        { name: "Supino Reto com Halteres", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 45 },
        { name: "Remada Curvada com Barra", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 45 },
        { name: "Desenvolvimento com Halteres", muscle_group: "Ombros", sets: 3, reps: "12", rest_seconds: 45 },
        { name: "Rosca Alternada", muscle_group: "Bíceps", sets: 2, reps: "12", rest_seconds: 30 },
        { name: "Tríceps Corda", muscle_group: "Tríceps", sets: 2, reps: "12", rest_seconds: 30 },
        { name: "HIIT Esteira", muscle_group: "Cardio", sets: 8, reps: "30s sprint / 30s descanso", rest_seconds: 30, notes: "Total: 8 min" },
      ]},
      { name: "Lower + Cardio", exercises: [
        { name: "Agachamento com Halteres", muscle_group: "Pernas", sets: 4, reps: "12", rest_seconds: 45 },
        { name: "Stiff com Halteres", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 45 },
        { name: "Avanço Alternado", muscle_group: "Quadríceps", sets: 3, reps: "10 (cada)", rest_seconds: 45 },
        { name: "Cadeira Abdutora", muscle_group: "Glúteos", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Escada ou Elíptico", muscle_group: "Cardio", sets: 1, reps: "20 min", rest_seconds: 0, notes: "Intensidade moderada a alta" },
      ]},
      { name: "Full Body Circuito", exercises: [
        { name: "Agachamento com Salto", muscle_group: "Pernas", sets: 3, reps: "12", rest_seconds: 20 },
        { name: "Flexão de Braços", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 20 },
        { name: "Remada Alta com Halter", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 20 },
        { name: "Mountain Climber", muscle_group: "Core", sets: 3, reps: "30s", rest_seconds: 20 },
        { name: "Burpee", muscle_group: "Cardio", sets: 3, reps: "10", rest_seconds: 30 },
      ]},
      { name: "Metabólico + Core", exercises: [
        { name: "Kettlebell Swing (ou Halter)", muscle_group: "Posterior", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Push Press com Halteres", muscle_group: "Ombros", sets: 3, reps: "10", rest_seconds: 30 },
        { name: "Avanço com Salto", muscle_group: "Pernas", sets: 3, reps: "10 (cada)", rest_seconds: 30 },
        { name: "Prancha com Toque no Ombro", muscle_group: "Core", sets: 3, reps: "20", rest_seconds: 30 },
        { name: "Corrida Esteira", muscle_group: "Cardio", sets: 1, reps: "10 min", rest_seconds: 0, notes: "Ritmo forte constante" },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // EMAGRECIMENTO 3 — AVANÇADO
  // ════════════════════════════════════════════════
  {
    id: "tpl-emagrec-3-avancado",
    name: "Emagrecimento 3 — Avançado (Density Training)",
    category: "fat_loss",
    level: "avancado",
    days: 5,
    description: "Treino de alta densidade para atletas experientes",
    routines: [
      { name: "Upper Density A", exercises: [
        { name: "Supino Reto com Barra", muscle_group: "Peito", sets: 4, reps: "10", rest_seconds: 30, notes: "Sem descanso entre séries — só troca de exercício" },
        { name: "Remada Curvada", muscle_group: "Costas", sets: 4, reps: "10", rest_seconds: 30 },
        { name: "Desenvolvimento com Halteres", muscle_group: "Ombros", sets: 3, reps: "12", rest_seconds: 30 },
        { name: "Rosca + Tríceps (Bi-set)", muscle_group: "Bíceps", sets: 3, reps: "12+12", rest_seconds: 45, notes: "Bi-set: rosca direta + tríceps corda" },
        { name: "HIIT Bike", muscle_group: "Cardio", sets: 10, reps: "20s all-out / 40s leve", rest_seconds: 40, notes: "Total: 10 min Tabata" },
      ]},
      { name: "Lower Density A", exercises: [
        { name: "Agachamento Frontal", muscle_group: "Quadríceps", sets: 4, reps: "10", rest_seconds: 45 },
        { name: "Stiff com Barra", muscle_group: "Posterior", sets: 4, reps: "10", rest_seconds: 45 },
        { name: "Avanço Caminhando", muscle_group: "Quadríceps", sets: 3, reps: "12 (cada)", rest_seconds: 30 },
        { name: "Hip Thrust", muscle_group: "Glúteos", sets: 4, reps: "12", rest_seconds: 45 },
        { name: "Sprints Esteira", muscle_group: "Cardio", sets: 6, reps: "30s sprint / 60s caminhada", rest_seconds: 60 },
      ]},
      { name: "Full Body Complexo", exercises: [
        { name: "Clean & Press com Halteres", muscle_group: "Ombros", sets: 4, reps: "8", rest_seconds: 45 },
        { name: "Agachamento Goblet", muscle_group: "Pernas", sets: 4, reps: "12", rest_seconds: 30 },
        { name: "Remada Renegade", muscle_group: "Costas", sets: 3, reps: "10 (cada)", rest_seconds: 30 },
        { name: "Burpee com Peso", muscle_group: "Cardio", sets: 3, reps: "8", rest_seconds: 45 },
        { name: "Turkish Get Up", muscle_group: "Core", sets: 3, reps: "5 (cada)", rest_seconds: 60 },
      ]},
      { name: "Upper Density B", exercises: [
        { name: "Supino Inclinado Halteres", muscle_group: "Peito", sets: 4, reps: "12", rest_seconds: 30 },
        { name: "Puxada Frontal", muscle_group: "Costas", sets: 4, reps: "12", rest_seconds: 30 },
        { name: "Elevação Lateral + Face Pull", muscle_group: "Ombros", sets: 3, reps: "15+15", rest_seconds: 30, notes: "Bi-set sem descanso" },
        { name: "Flexão de Braços (variações)", muscle_group: "Peito", sets: 3, reps: "max", rest_seconds: 45 },
        { name: "Bike HIIT", muscle_group: "Cardio", sets: 8, reps: "30s forte / 30s leve", rest_seconds: 30 },
      ]},
      { name: "Lower Density B", exercises: [
        { name: "Agachamento Búlgaro", muscle_group: "Quadríceps", sets: 4, reps: "10 (cada)", rest_seconds: 45 },
        { name: "Levantamento Terra Sumô", muscle_group: "Posterior", sets: 4, reps: "8", rest_seconds: 60 },
        { name: "Step Up com Halteres", muscle_group: "Glúteos", sets: 3, reps: "12 (cada)", rest_seconds: 30 },
        { name: "Panturrilha em Pé", muscle_group: "Panturrilha", sets: 4, reps: "20", rest_seconds: 30 },
        { name: "Corrida Intervalada", muscle_group: "Cardio", sets: 1, reps: "15 min", rest_seconds: 0, notes: "Alternando 2 min forte / 1 min leve" },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // FORÇA 1 — INICIANTE
  // ════════════════════════════════════════════════
  {
    id: "tpl-forca-1-iniciante",
    name: "Força 1 — Iniciante (Starting Strength)",
    category: "strength",
    level: "iniciante",
    days: 3,
    description: "Programa linear de força com movimentos compostos",
    routines: [
      { name: "Dia A", exercises: [
        { name: "Agachamento Livre", muscle_group: "Pernas", sets: 3, reps: "5", rest_seconds: 180, notes: "Aumentar 2,5kg por sessão" },
        { name: "Supino Reto com Barra", muscle_group: "Peito", sets: 3, reps: "5", rest_seconds: 180 },
        { name: "Remada Curvada com Barra", muscle_group: "Costas", sets: 3, reps: "5", rest_seconds: 120 },
        { name: "Prancha Abdominal", muscle_group: "Core", sets: 3, reps: "30s", rest_seconds: 60 },
      ]},
      { name: "Dia B", exercises: [
        { name: "Agachamento Livre", muscle_group: "Pernas", sets: 3, reps: "5", rest_seconds: 180 },
        { name: "Desenvolvimento Militar Barra", muscle_group: "Ombros", sets: 3, reps: "5", rest_seconds: 180 },
        { name: "Levantamento Terra", muscle_group: "Posterior", sets: 1, reps: "5", rest_seconds: 300, notes: "Uma série pesada" },
        { name: "Barra Fixa (ou assistida)", muscle_group: "Costas", sets: 3, reps: "max", rest_seconds: 120 },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // FORÇA 2 — INTERMEDIÁRIO
  // ════════════════════════════════════════════════
  {
    id: "tpl-forca-2-intermediario",
    name: "Força 2 — Intermediário (5/3/1 Adaptado)",
    category: "strength",
    level: "intermediario",
    days: 4,
    description: "Periodização de força com 4 levantamentos principais",
    routines: [
      { name: "Dia Agachamento", exercises: [
        { name: "Agachamento Livre", muscle_group: "Quadríceps", sets: 4, reps: "5/3/1+", rest_seconds: 180, notes: "Semana 1: 5x, Semana 2: 3x, Semana 3: 5/3/1" },
        { name: "Leg Press", muscle_group: "Quadríceps", sets: 4, reps: "10", rest_seconds: 90 },
        { name: "Cadeira Extensora", muscle_group: "Quadríceps", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Abdominal com Peso", muscle_group: "Core", sets: 3, reps: "12", rest_seconds: 60 },
      ]},
      { name: "Dia Supino", exercises: [
        { name: "Supino Reto com Barra", muscle_group: "Peito", sets: 4, reps: "5/3/1+", rest_seconds: 180 },
        { name: "Supino Inclinado Halteres", muscle_group: "Peito", sets: 4, reps: "10", rest_seconds: 60 },
        { name: "Crucifixo no Cabo", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 45 },
        { name: "Tríceps Francês", muscle_group: "Tríceps", sets: 3, reps: "10", rest_seconds: 60 },
      ]},
      { name: "Dia Terra", exercises: [
        { name: "Levantamento Terra", muscle_group: "Posterior", sets: 4, reps: "5/3/1+", rest_seconds: 180, notes: "Foco em técnica perfeita" },
        { name: "Stiff com Halteres", muscle_group: "Posterior", sets: 4, reps: "10", rest_seconds: 60 },
        { name: "Remada Curvada", muscle_group: "Costas", sets: 4, reps: "10", rest_seconds: 60 },
        { name: "Rosca Direta", muscle_group: "Bíceps", sets: 3, reps: "12", rest_seconds: 45 },
      ]},
      { name: "Dia Desenvolvimento", exercises: [
        { name: "Desenvolvimento Militar Barra", muscle_group: "Ombros", sets: 4, reps: "5/3/1+", rest_seconds: 180 },
        { name: "Elevação Lateral", muscle_group: "Ombros", sets: 4, reps: "15", rest_seconds: 45 },
        { name: "Face Pull", muscle_group: "Ombros", sets: 3, reps: "15", rest_seconds: 45 },
        { name: "Puxada Frontal", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 60 },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // FUNCIONAL — INTERMEDIÁRIO
  // ════════════════════════════════════════════════
  {
    id: "tpl-funcional-intermediario",
    name: "Funcional — Intermediário",
    category: "functional",
    level: "intermediario",
    days: 3,
    description: "Treino funcional com movimentos compostos e equilíbrio",
    routines: [
      { name: "Funcional A", exercises: [
        { name: "Agachamento Goblet", muscle_group: "Pernas", sets: 3, reps: "12", rest_seconds: 45 },
        { name: "Remada Renegade", muscle_group: "Costas", sets: 3, reps: "10 (cada)", rest_seconds: 45 },
        { name: "Push Press com Halteres", muscle_group: "Ombros", sets: 3, reps: "10", rest_seconds: 45 },
        { name: "Prancha com Rotação", muscle_group: "Core", sets: 3, reps: "10 (cada)", rest_seconds: 30 },
        { name: "Corda Naval", muscle_group: "Cardio", sets: 3, reps: "30s", rest_seconds: 45 },
      ]},
      { name: "Funcional B", exercises: [
        { name: "Avanço Multidirecional", muscle_group: "Pernas", sets: 3, reps: "8 (cada direção)", rest_seconds: 45 },
        { name: "Clean com Halteres", muscle_group: "Posterior", sets: 3, reps: "10", rest_seconds: 60 },
        { name: "Flexão Hindu", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 45 },
        { name: "Farmer Walk", muscle_group: "Core", sets: 3, reps: "30m", rest_seconds: 60, notes: "Caminhar com halteres pesados" },
        { name: "Box Jump (ou Step Up)", muscle_group: "Pernas", sets: 3, reps: "10", rest_seconds: 45 },
      ]},
      { name: "Funcional C", exercises: [
        { name: "Turkish Get Up", muscle_group: "Core", sets: 3, reps: "3 (cada)", rest_seconds: 60 },
        { name: "Thruster com Halteres", muscle_group: "Pernas", sets: 3, reps: "12", rest_seconds: 45 },
        { name: "Barra Fixa (ou Assistida)", muscle_group: "Costas", sets: 3, reps: "max", rest_seconds: 60 },
        { name: "Dead Bug", muscle_group: "Core", sets: 3, reps: "10 (cada)", rest_seconds: 30 },
        { name: "Sprint + Caminhada", muscle_group: "Cardio", sets: 6, reps: "20s sprint / 40s walk", rest_seconds: 40 },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // FLEXIBILIDADE / MOBILIDADE
  // ════════════════════════════════════════════════
  {
    id: "tpl-mobilidade-1",
    name: "Mobilidade & Flexibilidade — Básico",
    category: "mobility",
    level: "iniciante",
    days: 3,
    description: "Rotina de mobilidade articular e alongamento para qualquer nível",
    routines: [
      { name: "Mobilidade Superior", exercises: [
        { name: "Rotação de Ombros com Bastão", muscle_group: "Ombros", sets: 3, reps: "10", rest_seconds: 15 },
        { name: "Abertura Peitoral na Parede", muscle_group: "Peito", sets: 3, reps: "30s (cada lado)", rest_seconds: 15 },
        { name: "Alongamento de Trapézio", muscle_group: "Costas", sets: 2, reps: "30s (cada lado)", rest_seconds: 15 },
        { name: "Rotação Torácica (Livro Aberto)", muscle_group: "Core", sets: 3, reps: "8 (cada lado)", rest_seconds: 15 },
        { name: "Mobilidade de Punho", muscle_group: "Outro", sets: 2, reps: "10 (cada direção)", rest_seconds: 15 },
        { name: "Cat-Cow (Gato e Vaca)", muscle_group: "Core", sets: 3, reps: "10", rest_seconds: 15 },
      ]},
      { name: "Mobilidade Inferior", exercises: [
        { name: "Agachamento Profundo (Pausa)", muscle_group: "Pernas", sets: 3, reps: "30s", rest_seconds: 15 },
        { name: "Alongamento de Quadríceps em Pé", muscle_group: "Quadríceps", sets: 2, reps: "30s (cada)", rest_seconds: 15 },
        { name: "Alongamento Posterior (Tocando os Pés)", muscle_group: "Posterior", sets: 3, reps: "30s", rest_seconds: 15 },
        { name: "Abertura de Quadril 90/90", muscle_group: "Glúteos", sets: 3, reps: "8 (cada lado)", rest_seconds: 15 },
        { name: "Mobilidade de Tornozelo (Joelho na Parede)", muscle_group: "Panturrilha", sets: 3, reps: "10 (cada)", rest_seconds: 15 },
        { name: "Borboleta (Adutores)", muscle_group: "Pernas", sets: 3, reps: "30s", rest_seconds: 15 },
      ]},
      { name: "Flow Completo", exercises: [
        { name: "Sun Salutation Adaptado", muscle_group: "Core", sets: 3, reps: "5 ciclos", rest_seconds: 15, notes: "Sequência fluida de movimentos" },
        { name: "World's Greatest Stretch", muscle_group: "Pernas", sets: 3, reps: "5 (cada lado)", rest_seconds: 15, notes: "Avanço + rotação torácica" },
        { name: "Scorpion Stretch", muscle_group: "Core", sets: 2, reps: "8 (cada lado)", rest_seconds: 15 },
        { name: "Pigeon Stretch (Pombo)", muscle_group: "Glúteos", sets: 2, reps: "45s (cada lado)", rest_seconds: 15 },
        { name: "Child's Pose (Postura da Criança)", muscle_group: "Costas", sets: 2, reps: "45s", rest_seconds: 15 },
        { name: "Respiração Diafragmática", muscle_group: "Core", sets: 3, reps: "10 respirações", rest_seconds: 0, notes: "Inspirar 4s, segurar 4s, expirar 6s" },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // GLÚTEOS — FEMININO
  // ════════════════════════════════════════════════
  {
    id: "tpl-gluteo-fem",
    name: "Glúteos — Foco Feminino",
    category: "hypertrophy",
    level: "intermediario",
    days: 3,
    description: "Foco em glúteos e membros inferiores para mulheres",
    routines: [
      { name: "Glúteo A (Pesado)", exercises: [
        { name: "Hip Thrust com Barra", muscle_group: "Glúteos", sets: 4, reps: "10-12", rest_seconds: 90 },
        { name: "Agachamento Sumô com Halter", muscle_group: "Glúteos", sets: 4, reps: "12", rest_seconds: 90 },
        { name: "Stiff Romeno com Barra", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Abdução na Máquina", muscle_group: "Glúteos", sets: 3, reps: "15", rest_seconds: 45 },
        { name: "Elevação Pélvica Unilateral", muscle_group: "Glúteos", sets: 3, reps: "12 (cada)", rest_seconds: 60 },
      ]},
      { name: "Glúteo B (Unilateral)", exercises: [
        { name: "Agachamento Búlgaro", muscle_group: "Glúteos", sets: 4, reps: "10 (cada)", rest_seconds: 90 },
        { name: "Leg Press Pés Altos e Abertos", muscle_group: "Glúteos", sets: 4, reps: "12", rest_seconds: 90 },
        { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Coice no Cabo (Glúteo Máquina)", muscle_group: "Glúteos", sets: 3, reps: "15 (cada)", rest_seconds: 45 },
        { name: "Panturrilha em Pé", muscle_group: "Panturrilha", sets: 4, reps: "15", rest_seconds: 45 },
      ]},
      { name: "Upper + Core", exercises: [
        { name: "Supino com Halteres", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Puxada Frontal", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Desenvolvimento Máquina", muscle_group: "Ombros", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Prancha Abdominal", muscle_group: "Core", sets: 3, reps: "45s", rest_seconds: 30 },
        { name: "Elevação de Pernas (Abdominal Infra)", muscle_group: "Core", sets: 3, reps: "15", rest_seconds: 30 },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // UPPER/LOWER — INTERMEDIÁRIO
  // ════════════════════════════════════════════════
  {
    id: "tpl-upper-lower-4x",
    name: "Upper/Lower — 4x Semana",
    category: "hypertrophy",
    level: "intermediario",
    days: 4,
    description: "Divisão superior/inferior para frequência 2x por grupo",
    routines: [
      { name: "Upper A (Força)", exercises: [
        { name: "Supino Reto com Barra", muscle_group: "Peito", sets: 4, reps: "6-8", rest_seconds: 120 },
        { name: "Remada Curvada com Barra", muscle_group: "Costas", sets: 4, reps: "6-8", rest_seconds: 90 },
        { name: "Desenvolvimento Militar", muscle_group: "Ombros", sets: 3, reps: "8-10", rest_seconds: 90 },
        { name: "Rosca Direta", muscle_group: "Bíceps", sets: 3, reps: "10-12", rest_seconds: 60 },
        { name: "Tríceps Testa", muscle_group: "Tríceps", sets: 3, reps: "10-12", rest_seconds: 60 },
      ]},
      { name: "Lower A (Força)", exercises: [
        { name: "Agachamento Livre", muscle_group: "Pernas", sets: 4, reps: "6-8", rest_seconds: 120 },
        { name: "Stiff com Barra", muscle_group: "Posterior", sets: 4, reps: "8-10", rest_seconds: 90 },
        { name: "Leg Press 45°", muscle_group: "Pernas", sets: 3, reps: "10-12", rest_seconds: 90 },
        { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Panturrilha Sentado", muscle_group: "Panturrilha", sets: 4, reps: "15", rest_seconds: 45 },
      ]},
      { name: "Upper B (Volume)", exercises: [
        { name: "Supino Inclinado com Halteres", muscle_group: "Peito", sets: 4, reps: "10-12", rest_seconds: 60 },
        { name: "Puxada Frontal", muscle_group: "Costas", sets: 4, reps: "10-12", rest_seconds: 60 },
        { name: "Elevação Lateral", muscle_group: "Ombros", sets: 3, reps: "15", rest_seconds: 45 },
        { name: "Rosca Alternada", muscle_group: "Bíceps", sets: 3, reps: "12", rest_seconds: 45 },
        { name: "Tríceps Corda", muscle_group: "Tríceps", sets: 3, reps: "15", rest_seconds: 45 },
      ]},
      { name: "Lower B (Volume)", exercises: [
        { name: "Agachamento Búlgaro", muscle_group: "Pernas", sets: 3, reps: "10 (cada)", rest_seconds: 90 },
        { name: "Levantamento Terra Romeno", muscle_group: "Posterior", sets: 4, reps: "10-12", rest_seconds: 90 },
        { name: "Hip Thrust", muscle_group: "Glúteos", sets: 4, reps: "10-12", rest_seconds: 90 },
        { name: "Cadeira Extensora", muscle_group: "Quadríceps", sets: 3, reps: "15", rest_seconds: 60 },
        { name: "Panturrilha em Pé", muscle_group: "Panturrilha", sets: 4, reps: "15", rest_seconds: 45 },
      ]},
    ],
  },

  // ════════════════════════════════════════════════
  // HIPERTROFIA MUSCULAR 01 — POSTURA FEMININO (Intermediário)
  // ════════════════════════════════════════════════
  {
    id: "tpl-hyper-postura-fem-01",
    name: "Hipertrofia Muscular 01 – Postura Feminino",
    category: "hypertrophy",
    level: "intermediario",
    days: 5,
    description: "Rotina feminina com foco em hipertrofia, correção postural, mobilidade e cardio. 5x/semana.",
    routines: [
      {
        name: "Membros Superiores",
        exercises: [
          { name: "Alongamento de Peitoral no Espaldar", muscle_group: "Mobilidade", sets: 2, reps: "30s", rest_seconds: 0, notes: "Combinado – Alterne com Mobilidade Torácica III" },
          { name: "Mobilidade Torácica III", muscle_group: "Mobilidade", sets: 2, reps: "10", rest_seconds: 0 },
          { name: "Alongamento de Dorsais e Posteriores II", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0, notes: "Combinado – Alterne com Mobilidade de Ombro I, Mobilidade Dorsal VII e Depressão Escapular" },
          { name: "Mobilidade de Ombro I", muscle_group: "Mobilidade", sets: 2, reps: "15", rest_seconds: 0 },
          { name: "Mobilidade Dorsal VII", muscle_group: "Mobilidade", sets: 2, reps: "10", rest_seconds: 0 },
          { name: "Depressão Escapular no Smith", muscle_group: "Costas", sets: 3, reps: "10", rest_seconds: 60 },
          { name: "Puxada Aberta Barra Reta", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 60 },
          { name: "Remada Curvada com Halteres (Pegada Supinada)", muscle_group: "Costas", sets: 3, reps: "12-15", rest_seconds: 60, notes: "📈 Progressão de carga semanal. Manter boa velocidade no exercício." },
          { name: "Remada Baixa Supinada", muscle_group: "Costas", sets: 4, reps: "12", rest_seconds: 60, notes: "Iniciar com retração das escápulas e depois flexionar os cotovelos." },
          { name: "Face Pull", muscle_group: "Ombros", sets: 3, reps: "12", rest_seconds: 80, notes: "Combinado – Alterne com Prancha e Crucifixo Inverso. Carga: 4 kg" },
          { name: "Prancha Isométrica", muscle_group: "Core", sets: 4, reps: "10", rest_seconds: 80, notes: "Carga: 7 kg" },
          { name: "Crucifixo Inverso na Máquina", muscle_group: "Ombros", sets: 4, reps: "12", rest_seconds: 80, notes: "Carga: 20 kg" },
          { name: "Rosca Direta na Polia (Barra Reta)", muscle_group: "Bíceps", sets: 3, reps: "12", rest_seconds: 60, notes: "Carga: 15 kg" },
        ],
      },
      {
        name: "Membros Inferiores",
        exercises: [
          { name: "Alongamento de Dorsal e Posteriores", muscle_group: "Mobilidade", sets: 1, reps: "30s", rest_seconds: 30, notes: "Combinado – Alterne com Alongamento de Posteriores no Caixote" },
          { name: "Alongamento de Posteriores no Caixote", muscle_group: "Mobilidade", sets: 1, reps: "30s", rest_seconds: 30 },
          { name: "Alongamento de Adutores III", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0 },
          { name: "Alongamento Adutor no Espaldar", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0 },
          { name: "Agachamento na Polia Baixa", muscle_group: "Pernas", sets: 3, reps: "20", rest_seconds: 60, notes: "Carga: 35 kg. Fazer a movimentação da remada ao subir." },
          { name: "Cadeira Extensora", muscle_group: "Quadríceps", sets: 3, reps: "10+10+10", rest_seconds: 60, notes: "Método Drop Set (3 reduções)" },
          { name: "Leg Press 45° Pés Afastados", muscle_group: "Pernas", sets: 4, reps: "12", rest_seconds: 60, notes: "Carga: 90 kg. 🎯 Meta: alcançar 150 kg" },
          { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60, notes: "Carga: 5 placas. 🔄 Substituição: Abdução de Quadril na Máquina com Corpo à Frente" },
          { name: "Leg Press Horizontal Unilateral", muscle_group: "Pernas", sets: 2, reps: "20", rest_seconds: 90, notes: "Carga: 3 barras. Descer em 3s e subir em 1s." },
          { name: "Abdução de Quadril na Máquina", muscle_group: "Glúteos", sets: 4, reps: "12", rest_seconds: 70, notes: "Carga desafiadora" },
          { name: "Esteira Caminhada", muscle_group: "Cardio", sets: 1, reps: "15 min", rest_seconds: 0 },
        ],
      },
      {
        name: "Peitoral, Ombros e Tríceps",
        exercises: [
          { name: "Alongamento de Peitoral no Espaldar", muscle_group: "Mobilidade", sets: 1, reps: "30s", rest_seconds: 0, notes: "Combinado – Alterne com Alongamento de Ombro e Peitoral II e Dorsal I" },
          { name: "Alongamento de Ombro no Espaldar", muscle_group: "Mobilidade", sets: 1, reps: "30s", rest_seconds: 0 },
          { name: "Alongamento de Peitoral no Espaldar II", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0 },
          { name: "Alongamento Dorsal no Espaldar I", muscle_group: "Mobilidade", sets: 1, reps: "15s", rest_seconds: 0 },
          { name: "Crucifixo Inclinado com Halteres", muscle_group: "Peito", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Carga: 8 kg" },
          { name: "Crucifixo na Máquina", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 90, notes: "Carga: 4 placas" },
          { name: "Remada Baixa Supinada", muscle_group: "Costas", sets: 4, reps: "12", rest_seconds: 90, notes: "Carga: 5 placas" },
          { name: "Alongamento de Peitoral no Espaldar", muscle_group: "Mobilidade", sets: 2, reps: "30s cada lado", rest_seconds: 0 },
          { name: "Elevação Lateral com Halteres", muscle_group: "Ombros", sets: 3, reps: "12", rest_seconds: 60, notes: "Carga: 5 kg. Manter ombros para trás e peito aberto." },
          { name: "Tríceps Barra na Polia", muscle_group: "Tríceps", sets: 4, reps: "12", rest_seconds: 60, notes: "Carga: 4 placas. Movimentar apenas os cotovelos." },
          { name: "Abdominal Prancha Isométrica", muscle_group: "Core", sets: 3, reps: "1 min", rest_seconds: 30 },
        ],
      },
      {
        name: "Cardio e Mobilidade (45 min)",
        exercises: [
          { name: "Anterior de Quadril com Flexão de Tronco", muscle_group: "Mobilidade", sets: 1, reps: "30s", rest_seconds: 0, notes: "Combinado – Alterne todos os exercícios de mobilidade" },
          { name: "Superman com Bastão", muscle_group: "Mobilidade", sets: 1, reps: "15", rest_seconds: 0 },
          { name: "Mobilidade de Quadril VII", muscle_group: "Mobilidade", sets: 1, reps: "40s", rest_seconds: 0 },
          { name: "Mobilidade Torácica III", muscle_group: "Mobilidade", sets: 1, reps: "30 (15 cada lado)", rest_seconds: 0 },
          { name: "Mobilidade de Ombro I", muscle_group: "Mobilidade", sets: 2, reps: "20", rest_seconds: 0 },
          { name: "Mobilidade Torácica X", muscle_group: "Mobilidade", sets: 2, reps: "12", rest_seconds: 0 },
          { name: "Mobilidade de Quadril V", muscle_group: "Mobilidade", sets: 2, reps: "20", rest_seconds: 0 },
          { name: "Esteira Caminhada", muscle_group: "Cardio", sets: 1, reps: "40 min", rest_seconds: 0, notes: "Priorizar cardio e mobilidade. Pode iniciar pelos alongamentos e finalizar com o cardio." },
        ],
      },
      {
        name: "Membros Inferiores (Complementar)",
        exercises: [
          { name: "Alongamento de Dorsal e Posteriores", muscle_group: "Mobilidade", sets: 1, reps: "30s", rest_seconds: 30, notes: "Combinado – Alterne com Alongamento de Posteriores no Caixote" },
          { name: "Alongamento de Posteriores no Caixote", muscle_group: "Mobilidade", sets: 1, reps: "30s", rest_seconds: 30 },
          { name: "Alongamento de Adutores III", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0 },
          { name: "Alongamento Adutor no Espaldar", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0 },
          { name: "Abdução de Quadril na Máquina", muscle_group: "Glúteos", sets: 4, reps: "12", rest_seconds: 70 },
          { name: "Agachamento na Polia Baixa", muscle_group: "Pernas", sets: 3, reps: "20", rest_seconds: 60, notes: "Carga: 35 kg" },
          { name: "Cadeira Extensora", muscle_group: "Quadríceps", sets: 3, reps: "10+10+10", rest_seconds: 60, notes: "Drop Set" },
          { name: "Leg Press Horizontal Unilateral", muscle_group: "Pernas", sets: 2, reps: "20", rest_seconds: 90, notes: "Carga: 3 barras" },
          { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60, notes: "Carga: 5 placas" },
          { name: "Leg Press 45° Pés Afastados", muscle_group: "Pernas", sets: 4, reps: "12", rest_seconds: 90, notes: "Carga: 90 kg. 🎯 Meta: 150 kg. 🔄 Substituição: Abdução com Corpo à Frente" },
          { name: "Esteira Caminhada", muscle_group: "Cardio", sets: 1, reps: "15 min", rest_seconds: 0 },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════
  // HIPERTROFIA MUSCULAR 02 — FEMININO (Intermediário/Avançado)
  // ════════════════════════════════════════════════
  {
    id: "tpl-hyper-fem-02",
    name: "Hipertrofia Muscular 02 – Feminino",
    category: "hypertrophy",
    level: "avancado",
    days: 5,
    description: "Rotina feminina intermediária/avançada com foco em hipertrofia, glúteos e volume. 5x/semana.",
    routines: [
      {
        name: "Membros Inferiores",
        exercises: [
          { name: "Alongamento de Dorsal e Posteriores", muscle_group: "Mobilidade", sets: 1, reps: "30s", rest_seconds: 0, notes: "Alternar com Posteriores no Caixote, Adutores III e Adutor no Espaldar" },
          { name: "Alongamento de Posteriores no Caixote", muscle_group: "Mobilidade", sets: 1, reps: "30s", rest_seconds: 0 },
          { name: "Alongamento de Adutores III", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0 },
          { name: "Alongamento Adutor no Espaldar", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0 },
          { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 4, reps: "máximo", rest_seconds: 80, notes: "Carga: 50 kg. Manter a pelve estável." },
          { name: "Stiff com Barra (pés próximos)", muscle_group: "Posterior", sets: 4, reps: "12-15", rest_seconds: 60, notes: "Carga: 30/40/50 kg (progressiva)" },
          { name: "Búlgaro com Halteres (mão inversa)", muscle_group: "Pernas", sets: 3, reps: "12", rest_seconds: 60, notes: "Carga: 12 kg" },
          { name: "Cadeira Extensora", muscle_group: "Quadríceps", sets: 3, reps: "12", rest_seconds: 60, notes: "Carga: 40 kg" },
          { name: "Agachamento Livre com Barra", muscle_group: "Pernas", sets: 3, reps: "12/8-10/8", rest_seconds: 90, notes: "Progressão: 30→40→50 kg. Controle na descida, explosão na subida. 📈 Progressão de carga semanal." },
          { name: "Abdominal Infra nas Paralelas", muscle_group: "Core", sets: 3, reps: "16", rest_seconds: 45 },
        ],
      },
      {
        name: "Peitoral, Ombros e Tríceps",
        exercises: [
          { name: "Alongamento Peitoral no Espaldar", muscle_group: "Mobilidade", sets: 1, reps: "30s", rest_seconds: 0, notes: "Alternar com Ombro no Espaldar, Peitoral II e Dorsal I" },
          { name: "Alongamento de Ombro no Espaldar", muscle_group: "Mobilidade", sets: 1, reps: "30s", rest_seconds: 0 },
          { name: "Alongamento Peitoral Espaldar II", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0 },
          { name: "Alongamento Dorsal Espaldar I", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0 },
          { name: "Crucifixo Máquina", muscle_group: "Peito", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Carga: 25 kg" },
          { name: "Supino Reto com Barra", muscle_group: "Peito", sets: 4, reps: "10-12", rest_seconds: 60, notes: "Carga: 24 kg" },
          { name: "Crucifixo com Halteres", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 60 },
          { name: "Elevação Frontal na Polia Baixa", muscle_group: "Ombros", sets: 4, reps: "12", rest_seconds: 60 },
          { name: "Elevação Lateral com Halteres", muscle_group: "Ombros", sets: 4, reps: "12-15", rest_seconds: 60, notes: "Carga: 9 kg" },
          { name: "Desenvolvimento com Halteres", muscle_group: "Ombros", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Carga: 10 kg" },
          { name: "Elevação Frontal Alternada", muscle_group: "Ombros", sets: 3, reps: "16", rest_seconds: 45, notes: "Carga: 6 kg" },
          { name: "Tríceps Unilateral na Polia Alta", muscle_group: "Tríceps", sets: 2, reps: "12", rest_seconds: 45, notes: "Carga: 15 kg" },
          { name: "Tríceps na Polia com Barra", muscle_group: "Tríceps", sets: 4, reps: "10", rest_seconds: 60, notes: "Carga: 30 kg" },
        ],
      },
      {
        name: "Glúteos",
        exercises: [
          { name: "Alongamento de Quadríceps III", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0, notes: "Alternar com Quadríceps no Caixote e Dorsal e Posteriores" },
          { name: "Alongamento de Quadríceps no Caixote", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0 },
          { name: "Alongamento de Dorsal e Posteriores", muscle_group: "Mobilidade", sets: 1, reps: "20s", rest_seconds: 0 },
          { name: "Abdução de Quadril na Polia", muscle_group: "Glúteos", sets: 4, reps: "12-15", rest_seconds: 60, notes: "Carga máxima" },
          { name: "Elevação de Quadril na Máquina", muscle_group: "Glúteos", sets: 4, reps: "12", rest_seconds: 60 },
          { name: "Agachamento Sumô no Step", muscle_group: "Glúteos", sets: 3, reps: "14-20", rest_seconds: 60, notes: "Carga crescente" },
          { name: "Afundo no Smith", muscle_group: "Pernas", sets: 3, reps: "12/12/15", rest_seconds: 90, notes: "Progressão: 40 kg → crescente → carga máxima" },
          { name: "Mesa Flexora", muscle_group: "Posterior", sets: 5, reps: "12", rest_seconds: 60, notes: "Carga desafiadora" },
          { name: "Stiff com Halteres", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60 },
          { name: "Flexora Unilateral", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60 },
        ],
      },
      {
        name: "Costas, Ombros e Bíceps",
        exercises: [
          { name: "Mobilidade de Ombro II", muscle_group: "Mobilidade", sets: 2, reps: "20", rest_seconds: 0, notes: "Ativação + Alongamento Peitoral 12 reps" },
          { name: "Alongamento de Peitoral", muscle_group: "Mobilidade", sets: 1, reps: "12", rest_seconds: 0 },
          { name: "Face Pull", muscle_group: "Ombros", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Carga: 20 kg" },
          { name: "Pulldown Barra Aberta", muscle_group: "Costas", sets: 4, reps: "10+10+10", rest_seconds: 90, notes: "Drop Set + Pré-exaustão" },
          { name: "Remada Baixa Supinada", muscle_group: "Costas", sets: 4, reps: "12", rest_seconds: 60, notes: "Carga: 30 kg" },
          { name: "Remada Curvada Supinada", muscle_group: "Costas", sets: 4, reps: "10", rest_seconds: 60, notes: "Carga: 10 kg" },
          { name: "Crucifixo Inverso com Halteres", muscle_group: "Ombros", sets: 5, reps: "10", rest_seconds: 60, notes: "Carga: 7 kg" },
          { name: "Rosca Scott Máquina", muscle_group: "Bíceps", sets: 3, reps: "12", rest_seconds: 60, notes: "Carga: 15-20 kg" },
          { name: "Rosca Direta na Polia", muscle_group: "Bíceps", sets: 4, reps: "12", rest_seconds: 60, notes: "Carga: 35 kg" },
          { name: "Rosca Martelo Alternada", muscle_group: "Bíceps", sets: 3, reps: "16", rest_seconds: 45, notes: "Carga: 10 kg" },
          { name: "Prancha Isométrica", muscle_group: "Core", sets: 3, reps: "2 min", rest_seconds: 30 },
        ],
      },
      {
        name: "Superiores",
        exercises: [
          { name: "Mobilidade de Ombro VII", muscle_group: "Mobilidade", sets: 2, reps: "20", rest_seconds: 0, notes: "Ativação + Mobilidade Torácica III 12 reps" },
          { name: "Mobilidade Torácica III", muscle_group: "Mobilidade", sets: 1, reps: "12", rest_seconds: 0 },
          { name: "Puxada Unilateral", muscle_group: "Costas", sets: 3, reps: "12-15", rest_seconds: 60 },
          { name: "Puxada Aberta Barra Reta", muscle_group: "Costas", sets: 4, reps: "10+10+10", rest_seconds: 90, notes: "Drop Set" },
          { name: "Remada Curvada Supinada", muscle_group: "Costas", sets: 4, reps: "12", rest_seconds: 60 },
          { name: "Desenvolvimento com Halteres", muscle_group: "Ombros", sets: 4, reps: "10", rest_seconds: 60, notes: "Carga: 10 kg" },
          { name: "Elevação Lateral Sentado", muscle_group: "Ombros", sets: 4, reps: "12", rest_seconds: 60, notes: "Carga: 7 kg" },
          { name: "Rosca Direta com Barra", muscle_group: "Bíceps", sets: 4, reps: "12", rest_seconds: 60, notes: "Carga: 12 kg" },
          { name: "Rosca Martelo no Banco Inclinado", muscle_group: "Bíceps", sets: 4, reps: "16", rest_seconds: 60, notes: "Carga: 10 kg" },
          { name: "Tríceps na Polia com Corda", muscle_group: "Tríceps", sets: 5, reps: "12-15", rest_seconds: 60 },
        ],
      },
    ],
  },
];

// Categorias de templates
export const TEMPLATE_CATEGORIES = [
  { value: "all", label: "Todos" },
  { value: "hypertrophy", label: "Hipertrofia" },
  { value: "fat_loss", label: "Emagrecimento" },
  { value: "strength", label: "Força" },
  { value: "functional", label: "Funcional" },
  { value: "mobility", label: "Mobilidade" },
];

// Mapeamento de níveis
export const LEVEL_LABELS: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

// Gerador de pré-plano baseado em dados da anamnese
export function generatePrePlanFromAnamnesis(anamnesisData: {
  goal?: string;
  level?: string;
  sex?: string;
  daysPerWeek?: number;
  restrictions?: string[];
  painAreas?: string[];
}): WorkoutTemplate | null {
  const { goal, level, sex, daysPerWeek = 3, restrictions = [], painAreas = [] } = anamnesisData;

  // Mapear objetivo para categoria
  let category = "hypertrophy";
  if (goal?.includes("emagrec") || goal?.includes("perder") || goal?.includes("fat")) {
    category = "fat_loss";
  } else if (goal?.includes("força") || goal?.includes("strong") || goal?.includes("power")) {
    category = "strength";
  } else if (goal?.includes("funcional") || goal?.includes("mobilidade")) {
    category = "functional";
  } else if (goal?.includes("flexib") || goal?.includes("mobil")) {
    category = "mobility";
  }

  // Mapear nível
  let templateLevel = "iniciante";
  if (level?.includes("intermed") || level?.includes("moder")) {
    templateLevel = "intermediario";
  } else if (level?.includes("avanc") || level?.includes("expert")) {
    templateLevel = "avancado";
  }

  // Selecionar glúteo feminino se for mulher com foco em glúteos
  if (sex === "F" && (goal?.includes("glut") || goal?.includes("perna"))) {
    const gluteTemplate = BUILT_IN_TEMPLATES.find(t => t.id === "tpl-gluteo-fem");
    if (gluteTemplate) {
      const selected = { ...gluteTemplate, routines: gluteTemplate.routines.map(r => ({ ...r, exercises: [...r.exercises] })) };
      // Aplicar alertas de dor antes de retornar
      if (painAreas.length > 0) {
        selected.routines = applyPainAlerts(selected.routines, painAreas);
      }
      return selected;
    }
  }

  // Buscar template mais adequado
  let candidates = BUILT_IN_TEMPLATES.filter(t => t.category === category && t.level === templateLevel);
  
  if (candidates.length === 0) {
    candidates = BUILT_IN_TEMPLATES.filter(t => t.category === category);
  }
  if (candidates.length === 0) {
    candidates = BUILT_IN_TEMPLATES.filter(t => t.level === templateLevel);
  }
  if (candidates.length === 0) return null;

  // Selecionar o que mais se aproxima dos dias disponíveis
  candidates.sort((a, b) => Math.abs(a.days - daysPerWeek) - Math.abs(b.days - daysPerWeek));
  
  const selected = { ...candidates[0] };

  // Ajustar rotinas se houver restrições de dor
  if (painAreas.length > 0) {
    selected.routines = applyPainAlerts(selected.routines, painAreas);
  }

  return selected;
}

function applyPainAlerts(routines: TemplateRoutine[], painAreas: string[]): TemplateRoutine[] {
  return routines.map(r => ({
    ...r,
    exercises: r.exercises.map(e => {
      const hasPainConflict = painAreas.some(area => {
        const areaLower = area.toLowerCase();
        const muscleLower = e.muscle_group.toLowerCase();
        return (
          (areaLower.includes("ombro") && muscleLower.includes("ombro")) ||
          (areaLower.includes("joelho") && (muscleLower.includes("perna") || muscleLower.includes("quadr"))) ||
          (areaLower.includes("lombar") && (muscleLower.includes("posterior") || e.name.toLowerCase().includes("terra"))) ||
          (areaLower.includes("punho") && e.name.toLowerCase().includes("barra"))
        );
      });
      if (hasPainConflict) {
        return { ...e, notes: `⚠️ ATENÇÃO: área com dor reportada. ${e.notes || "Avaliar substituição."}` };
      }
      return e;
    }),
  }));
}
