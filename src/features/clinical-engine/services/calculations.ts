export interface PatientMetrics {
  weight_kg: number;
  height_cm: number;
  sex: 'M' | 'F';
  age?: number;
  birth_date?: string;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
}

export interface Macronutrients {
  calorias: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
  fibra_g: number;
}

export interface CalculatedMetrics {
  tmb: number;
  get: number;
  target_calories: number;
  macros: Macronutrients;
  imc: number;
  age: number;
}

export function calculateAge(birth_date: string): number {
  const birth = new Date(birth_date);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function calculateTMB(metrics: PatientMetrics): number {
  const age = metrics.age ?? (metrics.birth_date ? calculateAge(metrics.birth_date) : 0);
  
  if (metrics.weight_kg <= 0) throw new Error('Weight must be greater than zero');
  if (metrics.height_cm <= 0) throw new Error('Height must be greater than zero');
  if (age < 0) throw new Error('Age cannot be negative');

  // Mifflin-St Jeor (1990)
  if (metrics.sex === 'M') {
    return (10 * metrics.weight_kg) + (6.25 * metrics.height_cm) - (5 * age) + 5;
  } else {
    return (10 * metrics.weight_kg) + (6.25 * metrics.height_cm) - (5 * age) - 161;
  }
}

export function calculateGET(tmb: number, activity_level: PatientMetrics['activity_level']): number {
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return tmb * multipliers[activity_level];
}

export function calculateTargetCalories(get: number, goal: PatientMetrics['goal']): number {
  switch (goal) {
    case 'lose': return get - 500;
    case 'maintain': return get;
    case 'gain': return get + 400;
    default: return get;
  }
}

export function calculateMacros(targetCalories: number, weight_kg: number, goal: PatientMetrics['goal']): Macronutrients {
  const proteinMultipliers = {
    lose: 1.6,
    maintain: 1.8,
    gain: 2.0,
  };

  const protein_g = weight_kg * proteinMultipliers[goal];
  const protein_kcal = protein_g * 4;
  const gordura_kcal = targetCalories * 0.25;
  const gordura_g = gordura_kcal / 9;
  const carbo_kcal = targetCalories - protein_kcal - gordura_kcal;
  const carbo_g = carbo_kcal / 4;

  return {
    calorias: targetCalories,
    proteina_g: protein_g,
    carboidrato_g: carbo_g,
    gordura_g,
    fibra_g: 25,
  };
}

export function calculateIMC(weight_kg: number, height_cm: number): number {
  if (height_cm <= 0) throw new Error('Height must be greater than zero');
  return weight_kg / Math.pow(height_cm / 100, 2);
}

export function calculateFullMetrics(metrics: PatientMetrics): CalculatedMetrics {
  const age = metrics.age ?? (metrics.birth_date ? calculateAge(metrics.birth_date) : 0);
  const tmb = calculateTMB({ ...metrics, age });
  const get = calculateGET(tmb, metrics.activity_level);
  const target_calories = calculateTargetCalories(get, metrics.goal);
  const macros = calculateMacros(target_calories, metrics.weight_kg, metrics.goal);
  const imc = calculateIMC(metrics.weight_kg, metrics.height_cm);

  return {
    tmb,
    get,
    target_calories,
    macros,
    imc,
    age,
  };
}
