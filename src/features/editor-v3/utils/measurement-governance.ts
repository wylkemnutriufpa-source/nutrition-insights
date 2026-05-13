
export interface MeasurementGovernance {
  step: number;
  min: number;
  max: number;
  default: number;
}

export const MEASUREMENT_RULES: Record<string, MeasurementGovernance> = {
  gram: { step: 1, min: 0, max: 2000, default: 100 },
  ml: { step: 1, min: 0, max: 2000, default: 200 },
  unit: { step: 1, min: 0, max: 100, default: 1 },
  slice: { step: 1, min: 0, max: 50, default: 1 },
  spoon: { step: 1, min: 0, max: 50, default: 1 },
};

export const getMeasurementGovernance = (type: string, name: string = ''): MeasurementGovernance => {
  const n = name.toLowerCase();
  
  // Semantic overrides
  if (n.includes('fatia')) return MEASUREMENT_RULES.slice;
  if (n.includes('colher')) return MEASUREMENT_RULES.spoon;
  
  return MEASUREMENT_RULES[type] || MEASUREMENT_RULES.unit;
};
