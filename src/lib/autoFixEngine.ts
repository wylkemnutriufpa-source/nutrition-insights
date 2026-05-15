// Stub: autoFix engine removed.
export interface AutoFixResult {
  success: boolean;
  changes: any[];
  before: any;
  after: any;
  warnings: string[];
  summary: any;
}

export async function autoFixMealPlan(
  _planId: string,
  _patientId: string,
  _userId: string,
  _tenantId: string,
): Promise<AutoFixResult> {
  return { success: true, changes: [], before: {}, after: {}, warnings: [], summary: {} };
}
