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
 * Gera um planejamento semanal baseado em um template diário com alta variação.
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

  // Determinismo: usamos métricas do paciente para a semente de variação
  const seedBase = (patient.weight_kg || 70) + (patient.height_cm || 170) + (patient.age_years || 30);

  // Rotações expandidas para garantir 7 dias diferentes (Requisito: 7 dias DIFERENTES)
  const PROTEIN_ROTATION = ["Frango", "Tilápia", "Carne Moída", "Ovo", "Patinho", "Sobrecoxa", "Atum"];
  const CARB_ROTATION = ["Arroz", "Batata Doce", "Macarrão", "Mandioca", "Cuscuz", "Batata Inglesa", "Abóbora"];
  const BREAKFAST_ROTATION = ["Pão Integral", "Tapioca", "Cuscuz", "Ovo Mexido", "Iogurte", "Fruta", "Aveia"];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const dateStr = currentDate.toISOString().split("T")[0];

    // Criar preferências rotativas para este dia específico para garantir diversidade
    // Usamos offsets diferentes para cada macro para maximizar as combinações (7x7x7)
    const dayPrefs = [
      PROTEIN_ROTATION[i % PROTEIN_ROTATION.length],
      CARB_ROTATION[(i + 2) % CARB_ROTATION.length],
      BREAKFAST_ROTATION[(i + 4) % BREAKFAST_ROTATION.length],
      ...(patient.preferences || [])
    ];

    // Gerar plano base para o dia com preferências rotativas e seed única por dia
    const dailyPlan = generateDailyPlan(
      { ...patient, preferences: dayPrefs }, 
      meals, 
      foodDb, 
      dateStr, 
      options.marmita, 
      options.marmitaType,
      seedBase + (i * 100) // Multiplicador para garantir seeds bem distintas
    );

    days.push(dailyPlan);
  }

  const endDate = days[6].date;

  return {
    patient_id: patient.id || "p1",
    start_date: startDate,
    end_date: endDate,
    days,
    variation_enabled: true, // Sempre habilitado para garantir a promessa de 7 dias diferentes
    variation_log: variationLog,
  };
}
