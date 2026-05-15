// Stub: clinical engine types.
export interface Food {
  id?: string;
  name?: string;
  quantity?: number;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  [key: string]: any;
}

export interface Meal {
  id?: string;
  name?: string;
  tipo_refeicao?: string;
  items?: Food[];
  [key: string]: any;
}
