/**
 * FitJourney Intelligence Engine
 * 
 * Deterministic behavioral prompt engine.
 * Generates contextual prompts based on behavioral profile,
 * clinical flags, time of day, and interaction history.
 */

export type PromptType =
  | "hydration_check"
  | "hydration_progress"
  | "hydration_failure"
  | "workout_reminder"
  | "weekend_risk"
  | "clinical_warning"
  | "welcome_back"
  | "motivation_nudge"
  | "emotional_response";

export interface IntelligencePrompt {
  type: PromptType;
  title: string;
  body: string;
  emoji: string;
  tone: "gentle" | "firm" | "playful";
  quickActions?: { label: string; value: string }[];
  escalationLevel: number; // 0 = normal, 1 = light, 2 = escalation
}

export interface BehavioralContext {
  firstName: string;
  waterTarget: number;
  waterConsumed: number;
  motivationStyle: "gentle" | "firm";
  messageTone: "funny" | "direct";
  weekendDietBreaks: boolean;
  forgetsWater: boolean;
  workoutTime: string;
  workoutBlocker: string | null;
  cravingHours: string[];
  preferredReminderWindows: number[];
  failureCount: number;
  isWeekend: boolean;
  currentHour: number;
  clinicalFlags: string[];
  lastPromptAt: Date | null;
  lastPromptType: string | null;
  // Trainer integration
  hasTrainer: boolean;
  daysSinceLastWorkout: number | null;
  weeklyWorkoutCount: number;
  lastWorkoutEffort: number | null;
}

function wasPromptShownRecently(
  ctx: BehavioralContext,
  promptType: PromptType,
  cooldownMinutes: number
): boolean {
  if (!ctx.lastPromptAt || ctx.lastPromptType !== promptType) return false;
  const elapsed = (Date.now() - ctx.lastPromptAt.getTime()) / 60_000;
  return elapsed < cooldownMinutes;
}

// ─── Hydration Templates ───
function getHydrationPrompt(ctx: BehavioralContext): IntelligencePrompt | null {
  const progress = ctx.waterTarget > 0 ? ctx.waterConsumed / ctx.waterTarget : 0;
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
    type: "hydration_check",
    title: "Hidratação 💧",
    body,
    emoji: "💧",
    tone: ctx.motivationStyle,
    quickActions: [
      { label: "2", value: "2" },
      { label: "4", value: "4" },
      { label: "6", value: "6" },
      { label: "8", value: "8" },
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
export function getNonAdherenceResponse(
  failureCount: number,
  name: string,
  tone: "funny" | "direct"
): IntelligencePrompt {
  if (failureCount <= 1) {
    return {
      type: "emotional_response",
      title: "Hmm... 🤔",
      body:
        tone === "funny"
          ? `Hummm… seu nutricionista pode não gostar disso 😶‍🌫️\nMas amanhã é um novo dia, ${name}!`
          : `${name}, hoje ficou abaixo da meta. Amanhã vamos compensar!`,
      emoji: "😶‍🌫️",
      tone: "playful",
      escalationLevel: 1,
    };
  }

  return {
    type: "emotional_response",
    title: "Atenção 👀",
    body:
      tone === "funny"
        ? `Não queria ser chato…\nmas talvez seja hora de avisarmos seu nutricionista 🤨\nVamos retomar juntos, ${name}?`
        : `${name}, ${failureCount} dias consecutivos abaixo da meta. Precisamos conversar sobre estratégias.`,
    emoji: "🤨",
    tone: "firm",
    escalationLevel: 2,
  };
}

// ─── Weekend Risk Prevention ───
export function getWeekendRiskPrompt(ctx: BehavioralContext): IntelligencePrompt | null {
  if (!ctx.isWeekend) return null;

  const messages: string[] = [];

  if (ctx.clinicalFlags.some((f) => f.includes("lactose") || f.includes("intolerancia"))) {
    messages.push(
      `Lembre-se que você possui intolerância à lactose.\nEvite derivados de leite neste final de semana 👍`
    );
  }

  if (ctx.weekendDietBreaks) {
    messages.push(
      `${ctx.firstName}, sabemos que o fim de semana é desafiador.\nPlaneje suas refeições com antecedência para manter o foco! 🎯`
    );
  }

  if (ctx.clinicalFlags.some((f) => f.includes("alergia") || f.includes("gluten"))) {
    messages.push(
      `Atenção aos alimentos em eventos sociais neste fim de semana.\nSua saúde agradece a atenção! 🛡️`
    );
  }

  if (ctx.cravingHours.length > 0) {
    const hours = ctx.cravingHours.join(", ");
    messages.push(
      `Seus horários de maior tentação: ${hours}.\nPrepare lanches saudáveis para esses momentos! 💪`
    );
  }

  if (messages.length === 0) return null;

  return {
    type: "weekend_risk",
    title: "Dica de Fim de Semana 🌙",
    body: messages[Math.floor(Math.random() * messages.length)],
    emoji: "🌙",
    tone: "gentle",
    escalationLevel: 0,
  };
}

// ─── Clinical Warning ───
export function getClinicalWarningPrompt(ctx: BehavioralContext): IntelligencePrompt | null {
  const warnings: string[] = [];

  if (ctx.clinicalFlags.some((f) => f.includes("hipertensao") || f.includes("pressao"))) {
    warnings.push(`${ctx.firstName}, atenção à ingestão de sódio hoje.\nSua saúde cardiovascular agradece! ❤️`);
  }

  if (ctx.clinicalFlags.some((f) => f.includes("diabetes") || f.includes("glicemia"))) {
    warnings.push(`${ctx.firstName}, lembre-se de monitorar os carboidratos.\nManter a glicemia estável é fundamental! 📊`);
  }

  if (warnings.length === 0) return null;

  return {
    type: "clinical_warning",
    title: "Alerta Clínico 🩺",
    body: warnings[Math.floor(Math.random() * warnings.length)],
    emoji: "🩺",
    tone: "gentle",
    escalationLevel: 0,
  };
}

// ─── Workout Reminder ───
export function getWorkoutPrompt(ctx: BehavioralContext): IntelligencePrompt | null {
  const hourMap: Record<string, number> = { morning: 8, afternoon: 14, evening: 19, night: 21 };
  const targetHour = hourMap[ctx.workoutTime] || 8;

  if (Math.abs(ctx.currentHour - targetHour) > 1) return null;

  const blockerTip =
    ctx.workoutBlocker && ctx.workoutBlocker !== "nenhum"
      ? `\nDica: ${
          ctx.workoutBlocker === "tempo"
            ? "Mesmo 15 minutos já fazem diferença!"
            : ctx.workoutBlocker === "motivacao"
            ? "Coloque sua playlist favorita e comece!"
            : "Você consegue!"
        }`
      : "";

  return {
    type: "workout_reminder",
    title: "Hora do Treino 💪",
    body:
      ctx.motivationStyle === "firm"
        ? `${ctx.firstName}, tá na hora! Bora treinar? 🏋️${blockerTip}`
        : `${ctx.firstName}, que tal se movimentar agora? 🏃‍♂️${blockerTip}`,
    emoji: "💪",
    tone: ctx.motivationStyle,
    escalationLevel: 0,
  };
}

// ─── Motivation Nudge ───
export function getMotivationNudge(ctx: BehavioralContext): IntelligencePrompt {
  const messages = {
    gentle: {
      funny: [
        `${ctx.firstName}, só vim lembrar: você tá indo bem! 🌟\nCada escolha conta.`,
        `Hey ${ctx.firstName}! Seu futuro eu tá orgulhoso de você 💫`,
      ],
      direct: [
        `${ctx.firstName}, mantenha o foco. Consistência é o segredo.`,
        `Continue firme, ${ctx.firstName}. Os resultados estão chegando.`,
      ],
    },
    firm: {
      funny: [
        `${ctx.firstName}, sem desculpas hoje! 😤\nVocê prometeu, agora cumpra! 💪`,
        `Foco total, ${ctx.firstName}! Nada de "amanhã eu faço" 🫡`,
      ],
      direct: [
        `${ctx.firstName}, disciplina supera motivação. Execute o plano.`,
        `Sem negociação, ${ctx.firstName}. O plano funciona se você seguir.`,
      ],
    },
  };

  const pool = messages[ctx.motivationStyle][ctx.messageTone];
  return {
    type: "motivation_nudge",
    title: "Motivação ✨",
    body: pool[Math.floor(Math.random() * pool.length)],
    emoji: "✨",
    tone: ctx.motivationStyle,
    escalationLevel: 0,
  };
}

// ─── Workout Absence / Post-Workout Nudge ───
export function getTrainerIntegrationPrompt(ctx: BehavioralContext): IntelligencePrompt | null {
  if (!ctx.hasTrainer) return null;

  // Missed workout for 3+ days
  if (ctx.daysSinceLastWorkout !== null && ctx.daysSinceLastWorkout >= 3) {
    return {
      type: "workout_reminder",
      title: "Cadê o Treino? 🏋️",
      body: ctx.motivationStyle === "firm"
        ? `${ctx.firstName}, são ${ctx.daysSinceLastWorkout} dias sem treinar! Seu personal tá de olho. Bora voltar? 💪`
        : `${ctx.firstName}, faz ${ctx.daysSinceLastWorkout} dias desde seu último treino. Que tal retomar hoje? 🙌`,
      emoji: "🏋️",
      tone: ctx.motivationStyle,
      escalationLevel: ctx.daysSinceLastWorkout >= 7 ? 2 : 1,
    };
  }

  // Post-intense workout (effort 8+) — suggest lighter eating
  if (ctx.lastWorkoutEffort !== null && ctx.lastWorkoutEffort >= 8) {
    return {
      type: "motivation_nudge",
      title: "Treino Intenso! 🔥",
      body: `${ctx.firstName}, seu treino foi intenso (${ctx.lastWorkoutEffort}/10)! Hidrate-se bem e priorize proteínas na próxima refeição. 💧🥩`,
      emoji: "🔥",
      tone: "gentle",
      escalationLevel: 0,
    };
  }

  // Consistent training (5+ per week) — badge nudge
  if (ctx.weeklyWorkoutCount >= 5) {
    return {
      type: "motivation_nudge",
      title: "Disciplina Total! 🏆",
      body: `${ctx.firstName}, ${ctx.weeklyWorkoutCount} treinos essa semana! Você é referência de consistência. Continue assim! 🌟`,
      emoji: "🏆",
      tone: "gentle",
      escalationLevel: 0,
    };
  }

  return null;
}

// ─── Main Engine: Get Current Prompt ───
export function generateCurrentPrompt(ctx: BehavioralContext): IntelligencePrompt | null {
  const now = ctx.currentHour;
  const reminderWindows = ctx.preferredReminderWindows?.length ? ctx.preferredReminderWindows : [9, 12, 15, 18];
  const inReminderWindow = reminderWindows.some((hour) => Math.abs(now - hour) <= 1);

  // STRICT: Only fire prompts inside admin-configured reminder windows
  if (!inReminderWindow) return null;

  // Collect all eligible candidates, then filter out the last shown type
  const candidates: IntelligencePrompt[] = [];

  // 1. Clinical warning — morning check (7-9)
  if (now >= 7 && now <= 9) {
    const clinical = getClinicalWarningPrompt(ctx);
    if (clinical && !wasPromptShownRecently(ctx, clinical.type, 240)) candidates.push(clinical);
  }

  // 2. Weekend risk — morning window (8-10)
  if (ctx.isWeekend && now >= 8 && now <= 10) {
    const weekendPrompt = getWeekendRiskPrompt(ctx);
    if (weekendPrompt && !wasPromptShownRecently(ctx, weekendPrompt.type, 360)) candidates.push(weekendPrompt);
  }

  // 3. Trainer-aware prompts
  const trainerPrompt = getTrainerIntegrationPrompt(ctx);
  if (trainerPrompt && !wasPromptShownRecently(ctx, trainerPrompt.type, 240)) candidates.push(trainerPrompt);

  // 4. Workout reminder
  const workoutPrompt = getWorkoutPrompt(ctx);
  if (workoutPrompt && !wasPromptShownRecently(ctx, workoutPrompt.type, 240)) candidates.push(workoutPrompt);

  // 5. Hydration
  if (!wasPromptShownRecently(ctx, "hydration_check", 180)) {
    const hydrationPrompt = getHydrationPrompt(ctx);
    if (hydrationPrompt) candidates.push(hydrationPrompt);
  }

  // 6. Evening non-adherence (8pm-10pm)
  if (now >= 20 && now <= 22 && ctx.failureCount > 0) {
    const nonAdherencePrompt = getNonAdherenceResponse(ctx.failureCount, ctx.firstName, ctx.messageTone);
    if (!wasPromptShownRecently(ctx, nonAdherencePrompt.type, 360)) candidates.push(nonAdherencePrompt);
  }

  // 7. Motivation nudge (always available as fallback)
  if (!wasPromptShownRecently(ctx, "motivation_nudge", 360)) {
    candidates.push(getMotivationNudge(ctx));
  }

  if (candidates.length === 0) return null;

  // ROTATION: Filter out the last shown prompt type to guarantee variety
  const lastType = ctx.lastPromptType;
  const filtered = lastType ? candidates.filter((c) => c.type !== lastType) : candidates;

  // Pick from filtered list if available, otherwise allow repeat as last resort
  const pool = filtered.length > 0 ? filtered : candidates;
  return pool[0];
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

  const ratio = engagedCount > 0 ? ignoredCount / engagedCount : Math.min(ignoredCount, 5);
  const adaptedCooldown = cooldownMinutes * (1 + ratio * 0.5);

  // Cap max cooldown at 8 hours
  const maxCooldown = 480;
  const finalCooldown = Math.min(adaptedCooldown, maxCooldown);

  return elapsed >= finalCooldown;
}

// ─── Snooze Check ───
export function isSnoozed(snoozedUntil: Date | null): boolean {
  if (!snoozedUntil) return false;
  return new Date() < snoozedUntil;
}
