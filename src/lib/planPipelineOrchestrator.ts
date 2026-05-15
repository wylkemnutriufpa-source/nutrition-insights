// Stub: procedural plan pipeline removed. Manual templates only.
export interface PipelineInput {
  [key: string]: any;
}

export async function runPlanPipeline(_input: PipelineInput): Promise<any> {
  return { success: false, error: 'Procedural generation disabled. Use manual templates.' };
}
