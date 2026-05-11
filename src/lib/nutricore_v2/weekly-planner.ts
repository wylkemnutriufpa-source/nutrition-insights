import { DailyPlan, generateDailyPlan, PatientMetrics } from "./plan-generator";
import { Food } from "./food-database";
import { MealSlot, MealType } from "./meal-distribution";
import { Marmita } from "./marmitas-database";

export interface WeeklyPlan {
  patient_id: string;
  start_date: string;
  end_date: string;
  days: DailyPlan[];
  variation_enabled: boolean;
  variation_log: string[];
}

export interface WeeklyOptions {
  variation?: boolean;
  marmita?: Marmita;
  marmitaType?: MealType;
}


/**
 * Gera um planejamento semanal baseado em um template diário.
 */
export function generateWeeklyPlan(
  patient: PatientMetrics,
  meals: MealSlot[],
  foodDb: Food[],
  startDate: string,
  options: WeeklyOptions = {}
): WeeklyPlan {
  const days: DailyPlan[] = [];
  const variationLog: string[] = [];
  const start = new Date(startDate);

  // Determinismo: usamos o patient_id ou um hash do nome para a semente de variação
  const seedBase = patient.weight_kg + patient.height_cm + patient.age_years;

  const PROTEIN_ROTATION = ["Frango", "Tilápia", "Carne", "Ovo"];
  const CARB_ROTATION = ["Arroz", "Batata Doce", "Macarrão", "Mandioca"];
  const BREAKFAST_ROTATION = ["Pão", "Tapioca", "Cuscuz"];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const dateStr = currentDate.toISOString().split("T")[0];

    // Criar preferências rotativas para este dia específico
    const dayPrefs = [
      PROTEIN_ROTATION[i % PROTEIN_ROTATION.length],
      CARB_ROTATION[i % CARB_ROTATION.length],
      BREAKFAST_ROTATION[i % BREAKFAST_ROTATION.length],
      ...(patient.preferences || [])
    ];

    // Gerar plano base para o dia com preferências rotativas e seed única
    const dailyPlan = generateDailyPlan(
      { ...patient, preferences: dayPrefs }, 
      meals, 
      foodDb, 
      dateStr, 
      options.marmita, 
      options.marmitaType,
      seedBase + i
    );

    days.push(dailyPlan);
  }

  const endDate = days[6].date;

  return {
    patient_id: patient.id || "p1", // Usar ID do paciente se existir
    start_date: startDate,
    end_date: endDate,
    days,
    variation_enabled: !!options.variation,
    variation_log: variationLog,
  };
}

/**
 * Aplica variações determinísticas para evitar monotonia.
 * Regras: Alternar proteínas/carbos, máx 3-4 variações, nunca consecutivas.
 */
// Variação agora é aplicada diretamente no loop principal usando preferências rotativas e seeds determinísticas.
