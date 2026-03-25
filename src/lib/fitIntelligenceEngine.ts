/**
 * FitJourney Intelligence Engine
 * 
 * Deterministic behavioral reminder engine.
 * Generates contextual prompts based on behavioral profile,
 * clinical flags, time of day, and interaction history.
 */

export interface IntelligencePrompt {
  type: 'hydration_check' | 'workout_reminder' | 'motivation_nudge' | 'weekend_risk' | 'emotional_response';
  title: string;
  body: string;
  emoji: string;
  tone: 'gentle' | 'firm' | 'playful';
  quickActions?: { label: string; value: string }[];
  escalationLevel: number; // 0 = normal, 1 = light nudge, 2 = escalation
}

export interface BehavioralContext {
  firstName: string;
  waterTarget: number;
  waterConsumed: number;
  motivationStyle: 'gentle' | 'firm';
  messageTone: 'funny' | 'direct';
  weekendDietBreaks: boolean;
  forgetsWater: boolean;
  workoutTime: string;
  workoutBlocker: string | null;
  cravingHours: string[];
  failureCount: number; // consecutive days of low adherence
  isWeekend: boolean;
  currentHour: number;
  clinicalFlags: string[];
}

// ─── Hydration Templates ───
function getHydrationPrompt(ctx: BehavioralContext): IntelligencePrompt | null {
  const progress = ctx.waterTarget > 0 ? ctx.waterConsumed / ctx.waterTarget : 0;

  // FIX: Don't show prompt if goal already met
  if (progress >= 1) return null;

  const remaining = ctx.waterTarget - ctx.waterConsumed;

  const templates = {
    gentle: {
      funny: [
        `Ei ${ctx.firstName} 😊\nSua meta hoje são ${ctx.waterTarget} copos de água.\nQuantos você já tomou?`,
        `${ctx.firstName}, seus rins mandaram um recado: "mais água, por favor!" 💧😄\nQuantos copos hoje?`,
        `Hora do check de hidratação! 💧\nSeu corpo agradece cada gole, ${ctx.firstName}.`,
      ],
      direct: [
        `${ctx.firstName}, hora de registrar sua hidratação.\nMeta: ${ctx.waterTarget} copos. Quantos já tomou?`,
        `Check de hidratação, ${ctx.firstName}. Faltam ${remaining} copos para sua meta.`,
      ],
    },
    firm: {
      funny: [
        `${ctx.firstName}! Cadê a água? 🧐\nSua meta são ${ctx.waterTarget} copos e precisamos falar sobre isso!`,
        `Alô ${ctx.firstName}! Seus ${ctx.waterTarget} copos não vão se beber sozinhos! 😤💧`,
      ],
      direct: [
        `${ctx.firstName}, sua hidratação é prioridade. Meta: ${ctx.waterTarget} copos. Quantos consumiu?`,
        `Registro obrigatório: ${ctx.firstName}, quantos copos de água hoje? Meta: ${ctx.waterTarget}.`,
      ],
    },
  };

  const pool = templates[ctx.motivationStyle][ctx.messageTone];
  const body = pool[Math.floor(Math.random() * pool.length)];

  return {
    type: 'hydration_check',
    title: 'Hidratação 💧',
    body,
    emoji: '💧',
    tone: ctx.motivationStyle,
    quickActions: [
      { label: '2', value: '2' },
      { label: '4', value: '4' },
      { label: '6', value: '6' },
      { label: '8', value: '8' },
    ],
    escalationLevel: 0,
  };
}

// ─── Hydration Positive Reinforcement ───
export function getHydrationResponse(cups: number, target: number, name: string): string {
  const progress = target > 0 ? cups / target : 0;
  if (progress >= 1) return `Excelente ${name}! 🎉 Meta de hidratação atingida! Seu corpo agradece.`;
  if (progress >= 0.75) return `Muito bem ${name} 👏 Quase lá! Faltam só ${target - cups} copos!`;
  if (progress >= 0.5) return `Bom progresso ${name}! 💪 Metade da meta concluída.`;
  return `Ótimo início ${name}! 👍 Continue bebendo água ao longo do dia.`;
}

// ─── Non-Adherence Emotional Responses ───
export function getNonAdherenceResponse(failureCount: number, name: string, tone: 'funny' | 'direct'): IntelligencePrompt {
  if (failureCount <= 1) {
    return {
      type: 'emotional_response',
      title: 'Hmm... 🤔',
      body: tone === 'funny'
        ? `Hummm… seu nutricionista pode não gostar disso 😶‍🌫️\nMas amanhã é um novo dia, ${name}!`
        : `${name}, hoje ficou abaixo da meta. Amanhã vamos compensar!`,
      emoji: '😶‍🌫️',
      tone: 'playful',
      escalationLevel: 1,
    };
  }

  return {
    type: 'emotional_response',
    title: 'Atenção 👀',
    body: tone === 'funny'
      ? `Não queria ser chato…\nmas talvez seja hora de avisarmos seu nutricionista 🤨\nVamos retomar juntos, ${name}?`
      : `${name}, ${failureCount} dias consecutivos abaixo da meta. Precisamos conversar sobre estratégias.`,
    emoji: '🤨',
    tone: 'firm',
    escalationLevel: 2,
  };
}

// ─── Weekend Risk Prevention ───
export function getWeekendRiskPrompt(ctx: BehavioralContext): IntelligencePrompt | null {
  if (!ctx.isWeekend) return null;

  const messages: string[] = [];

  // Lactose intolerance
  if (ctx.clinicalFlags.some(f => f.includes('lactose') || f.includes('intolerancia'))) {
    messages.push(`Lembre-se que você possui intolerância à lactose.\nEvite derivados de leite neste final de semana 👍`);
  }

  // Weekend diet breaks pattern
  if (ctx.weekendDietBreaks) {
    messages.push(`${ctx.firstName}, sabemos que o fim de semana é desafiador.\nPlaneje suas refeições com antecedência para manter o foco! 🎯`);
  }

  // Allergy flags
  if (ctx.clinicalFlags.some(f => f.includes('alergia') || f.includes('gluten'))) {
    messages.push(`Atenção aos alimentos em eventos sociais neste fim de semana.\nSua saúde agradece a atenção! 🛡️`);
  }

  // Craving hours on weekend
  if (ctx.cravingHours.length > 0) {
    const hours = ctx.cravingHours.join(', ');
    messages.push(`Seus horários de maior tentação: ${hours}.\nPrepare lanches saudáveis para esses momentos! 💪`);
  }

  if (messages.length === 0) return null;

  return {
    type: 'weekend_risk',
    title: 'Dica de Fim de Semana 🌙',
    body: messages[Math.floor(Math.random() * messages.length)],
    emoji: '🌙',
    tone: 'gentle',
    escalationLevel: 0,
  };
}

// ─── Workout Reminder ───
export function getWorkoutPrompt(ctx: BehavioralContext): IntelligencePrompt | null {
  const hourMap: Record<string, number> = { morning: 8, afternoon: 14, evening: 19, night: 21 };
  const targetHour = hourMap[ctx.workoutTime] || 8;

  // Only show within 1 hour window of workout time
  if (Math.abs(ctx.currentHour - targetHour) > 1) return null;

  const blockerTip = ctx.workoutBlocker && ctx.workoutBlocker !== 'nenhum'
    ? `\nDica: ${ctx.workoutBlocker === 'tempo' ? 'Mesmo 15 minutos já fazem diferença!' : ctx.workoutBlocker === 'motivacao' ? 'Coloque sua playlist favorita e comece!' : 'Você consegue!'}`
    : '';

  return {
    type: 'workout_reminder',
    title: 'Hora do Treino 💪',
    body: ctx.motivationStyle === 'firm'
      ? `${ctx.firstName}, tá na hora! Bora treinar? 🏋️${blockerTip}`
      : `${ctx.firstName}, que tal se movimentar agora? 🏃‍♂️${blockerTip}`,
    emoji: '💪',
    tone: ctx.motivationStyle,
    escalationLevel: 0,
  };
}

// ─── Main Engine: Get Current Prompt ───
// FIX: Use range-based hour check instead of exact match
export function generateCurrentPrompt(ctx: BehavioralContext): IntelligencePrompt | null {
  const now = ctx.currentHour;

  // Weekend risk — show in the morning window (8-10)
  if (ctx.isWeekend && now >= 8 && now <= 10) {
    const weekendPrompt = getWeekendRiskPrompt(ctx);
    if (weekendPrompt) return weekendPrompt;
  }

  // Workout reminder — near workout time
  const workoutPrompt = getWorkoutPrompt(ctx);
  if (workoutPrompt) return workoutPrompt;

  // FIX: Hydration — check in windows around 10am, 2pm, 6pm (±1 hour)
  const hydrationWindows = [
    { start: 9, end: 11 },
    { start: 13, end: 15 },
    { start: 17, end: 19 },
  ];
  const inHydrationWindow = hydrationWindows.some(w => now >= w.start && now <= w.end);
  if (inHydrationWindow) {
    const hydrationPrompt = getHydrationPrompt(ctx);
    if (hydrationPrompt) return hydrationPrompt;
  }

  // Evening non-adherence check (8pm-10pm)
  if (now >= 20 && now <= 22 && ctx.failureCount > 0) {
    return getNonAdherenceResponse(ctx.failureCount, ctx.firstName, ctx.messageTone);
  }

  return null;
}

// ─── Adaptive Frequency ───
export function shouldShowPrompt(
  lastPromptAt: Date | null,
  cooldownMinutes: number,
  ignoredCount: number,
  engagedCount: number
): boolean {
  if (!lastPromptAt) return true;

  const elapsed = (Date.now() - lastPromptAt.getTime()) / 60_000;

  // Adaptive: increase cooldown if user ignores, decrease if engaged
  const ratio = engagedCount > 0 ? ignoredCount / engagedCount : Math.min(ignoredCount, 5);
  const adaptedCooldown = cooldownMinutes * (1 + ratio * 0.5);

  // Cap max cooldown at 8 hours to prevent infinite silence
  const maxCooldown = 480;
  const finalCooldown = Math.min(adaptedCooldown, maxCooldown);

  return elapsed >= finalCooldown;
}
