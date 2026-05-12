import { describe, it, expect } from "vitest";
import { groupExercisesForRender, hasHighIntensityMethods, Exercise } from "@/lib/workoutIntensityUtils";

describe("workoutIntensityUtils - Bloqueio de Alta Intensidade", () => {
  const mockExercises: Exercise[] = [
    { id: "e1", name: "Supino", group_id: "g1", group_type: "biset", group_order: 0, sort_order: 0, sets: 3, reps: "10" },
    { id: "e2", name: "Crucifixo", group_id: "g1", group_type: "biset", group_order: 1, sort_order: 1, sets: 3, reps: "12" },
    { id: "e3", name: "Agachamento", group_id: null, group_type: "single", group_order: 0, sort_order: 2, sets: 3, reps: "15" }
  ];

  it("deve agrupar exercícios normalmente quando medical review não for requerido", () => {
    const blocks = groupExercisesForRender(mockExercises, false);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("biset");
    expect(blocks[0].exercises).toHaveLength(2);
    expect(blocks[1].type).toBe("single");
  });

  it("deve separar todos os exercícios quando medical review for requerido", () => {
    const blocks = groupExercisesForRender(mockExercises, true);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe("single");
    expect(blocks[0].exercises).toHaveLength(1);
    expect(blocks[1].type).toBe("single");
    expect(blocks[1].exercises).toHaveLength(1);
    expect(blocks[2].type).toBe("single");
    expect(blocks[2].exercises).toHaveLength(1);
  });

  it("hasHighIntensityMethods deve detectar corretamente a presença de bisets/trisets", () => {
    const routinesWithHighIntensity = [
      { exercises: mockExercises }
    ];
    const routinesWithoutHighIntensity = [
      { 
        exercises: [
          { id: "e3", name: "Agachamento", group_id: null, group_type: "single", group_order: 0, sort_order: 0, sets: 3, reps: "15" }
        ] 
      }
    ];

    expect(hasHighIntensityMethods(routinesWithHighIntensity)).toBe(true);
    expect(hasHighIntensityMethods(routinesWithoutHighIntensity)).toBe(false);
  });
});
