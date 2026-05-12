export interface Exercise {
  id: string;
  name: string;
  group_id: string | null;
  group_type: string | null;
  group_order: number;
  sort_order: number;
  sets: number;
  reps: string;
}

export interface RenderBlock {
  type: string;
  exercises: Exercise[];
  groupId: string | null;
}

/**
 * Agrupa exercícios para renderização, respeitando a trava de revisão médica.
 * Se requiresMedicalReview for true, todos os agrupamentos (bisets, trisets, circuitos)
 * são ignorados e os exercícios retornados individualmente.
 */
export function groupExercisesForRender(
  exercises: Exercise[],
  requiresMedicalReview: boolean
): RenderBlock[] {
  if (requiresMedicalReview) {
    return exercises.map((ex) => ({
      type: "single",
      exercises: [ex],
      groupId: null,
    }));
  }

  const blocks: RenderBlock[] = [];
  let currentGroupId: string | null = null;
  let currentBlock: Exercise[] = [];

  exercises.forEach((ex) => {
    const gid = ex.group_id || null;

    if (gid && gid === currentGroupId) {
      currentBlock.push(ex);
    } else {
      if (currentBlock.length > 0) {
        blocks.push({
          type: currentBlock[0].group_type || "single",
          exercises: currentBlock,
          groupId: currentGroupId,
        });
      }
      currentBlock = [ex];
      currentGroupId = gid;
    }
  });

  if (currentBlock.length > 0) {
    blocks.push({
      type: currentBlock[0].group_type || "single",
      exercises: currentBlock,
      groupId: currentGroupId,
    });
  }

  return blocks;
}

/**
 * Verifica se um conjunto de rotinas contém métodos de alta intensidade (agrupamentos).
 */
export function hasHighIntensityMethods(routines: any[]): boolean {
  return routines.some((r) =>
    r.exercises.some(
      (e: any) => e.group_id && e.group_type && e.group_type !== "single"
    )
  );
}
