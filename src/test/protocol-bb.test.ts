import { describe, it, expect } from "vitest";

// =====================================================
// Protocolo Biquíni Branco — Integrity Test Suite
// =====================================================

// --- BB Settings Schema ---
interface BBSettings {
  is_enabled: boolean;
  auto_generate_plan: boolean;
  require_approval: boolean;
  enforce_phase_blocks: boolean;
  weight_check_day: number;
  photo_check_day: number;
  phase_duration_days: number;
  min_adherence_transition: number;
  deficit_phase1: number;
  deficit_phase2: number;
  deficit_phase3: number;
  maintenance_phase4: boolean;
}

const DEFAULT_BB_SETTINGS: BBSettings = {
  is_enabled: true,
  auto_generate_plan: true,
  require_approval: true,
  enforce_phase_blocks: true,
  weight_check_day: 16,
  photo_check_day: 31,
  phase_duration_days: 30,
  min_adherence_transition: 70,
  deficit_phase1: 0,
  deficit_phase2: 400,
  deficit_phase3: 500,
  maintenance_phase4: true,
};

// --- BB Protocol Step Schema ---
interface ProtocolStep {
  id: string;
  order: number;
  icon: string;
  title: string;
  description: string;
  details: string[];
  category: "phase1" | "phase2" | "phase3" | "phase4" | "enforcement" | "audit";
}

const BB_STEPS: ProtocolStep[] = [
  { id: "bb_1", order: 1, icon: "🔄", title: "Fase 1: Reset Metabólico", description: "Normalizar padrões", details: ["d1"], category: "phase1" },
  { id: "bb_2", order: 2, icon: "📉", title: "Fase 2: Déficit Estratégico", description: "Iniciar déficit", details: ["d2"], category: "phase2" },
  { id: "bb_3", order: 3, icon: "✨", title: "Fase 3: Definição Corporal", description: "Intensificação", details: ["d3"], category: "phase3" },
  { id: "bb_4", order: 4, icon: "🏆", title: "Fase 4: Manutenção Inteligente", description: "Consolidar", details: ["d4"], category: "phase4" },
  { id: "bb_5", order: 5, icon: "🚫", title: "Bloqueios Mandatórios", description: "Enforcement", details: ["d5"], category: "enforcement" },
  { id: "bb_6", order: 6, icon: "🔒", title: "Auditoria e Geração por Fase", description: "Motor determinístico", details: ["d6"], category: "audit" },
];

// --- BB Generation Metadata Schema ---
interface BBGenerationMetadata {
  engine_version: string;
  protocol_version: string;
  bb_phase: number;
  bb_phase_name: string;
  bb_deficit_applied: number;
  bb_meta_proteinas_gkg: number;
  bmr_formula: string;
  bmr_value: number;
  tdee_factor: number;
  tdee_value: number;
  calorie_target: number;
  macro_strategy: string;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  template_selected: { id: string; slug: string; version: number };
  template_score: number;
  phase_adjustments: {
    deficit_override: number;
    protein_multiplier: number;
    carb_timing: string;
    restrictions_applied: string[];
  };
  data_sources: string[];
  generated_at: string;
}

// --- Phase transition logic ---
function canTransitionPhase(currentPhase: number, adherence: number, minAdherence: number, hasWeight: boolean, hasPhotos: boolean, enforceBlocks: boolean): { allowed: boolean; reason: string } {
  if (currentPhase >= 4) return { allowed: false, reason: "already_at_final_phase" };
  if (adherence < minAdherence) return { allowed: false, reason: `adherence_too_low: ${adherence}% < ${minAdherence}%` };
  if (enforceBlocks && !hasWeight) return { allowed: false, reason: "weight_data_missing" };
  if (enforceBlocks && !hasPhotos) return { allowed: false, reason: "photo_data_missing" };
  return { allowed: true, reason: "ok" };
}

// --- Deficit calculator ---
function calculateBBCalorieTarget(tdee: number, phase: number, settings: BBSettings): number {
  const deficits: Record<number, number> = {
    1: settings.deficit_phase1,
    2: settings.deficit_phase2,
    3: settings.deficit_phase3,
    4: 0, // maintenance
  };
  return tdee - (deficits[phase] || 0);
}

// --- Protein target by phase ---
function getProteinTarget(phase: number): number {
  const targets: Record<number, number> = { 1: 1.5, 2: 2.0, 3: 2.2, 4: 1.8 };
  return targets[phase] || 1.5;
}

describe("Protocolo Biquíni Branco — Settings", () => {
  it("should have all required settings fields", () => {
    const requiredKeys: (keyof BBSettings)[] = [
      "is_enabled", "auto_generate_plan", "require_approval", "enforce_phase_blocks",
      "weight_check_day", "photo_check_day", "phase_duration_days", "min_adherence_transition",
      "deficit_phase1", "deficit_phase2", "deficit_phase3", "maintenance_phase4"
    ];
    requiredKeys.forEach(k => expect(DEFAULT_BB_SETTINGS).toHaveProperty(k));
  });

  it("should have progressive deficit across phases", () => {
    expect(DEFAULT_BB_SETTINGS.deficit_phase1).toBe(0);
    expect(DEFAULT_BB_SETTINGS.deficit_phase2).toBeGreaterThan(DEFAULT_BB_SETTINGS.deficit_phase1);
    expect(DEFAULT_BB_SETTINGS.deficit_phase3).toBeGreaterThan(DEFAULT_BB_SETTINGS.deficit_phase2);
  });

  it("should have valid weight check day (before phase end)", () => {
    expect(DEFAULT_BB_SETTINGS.weight_check_day).toBeLessThan(DEFAULT_BB_SETTINGS.phase_duration_days);
    expect(DEFAULT_BB_SETTINGS.weight_check_day).toBeGreaterThan(0);
  });

  it("should have valid photo check day", () => {
    expect(DEFAULT_BB_SETTINGS.photo_check_day).toBeGreaterThan(DEFAULT_BB_SETTINGS.weight_check_day);
  });

  it("should have adherence threshold between 50-100%", () => {
    expect(DEFAULT_BB_SETTINGS.min_adherence_transition).toBeGreaterThanOrEqual(50);
    expect(DEFAULT_BB_SETTINGS.min_adherence_transition).toBeLessThanOrEqual(100);
  });
});

describe("Protocolo Biquíni Branco — Steps", () => {
  it("should have exactly 6 steps", () => {
    expect(BB_STEPS).toHaveLength(6);
  });

  it("should have unique IDs", () => {
    const ids = BB_STEPS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have sequential order", () => {
    BB_STEPS.forEach((step, i) => expect(step.order).toBe(i + 1));
  });

  it("should cover all 4 phases plus enforcement and audit", () => {
    const categories = BB_STEPS.map(s => s.category);
    expect(categories).toContain("phase1");
    expect(categories).toContain("phase2");
    expect(categories).toContain("phase3");
    expect(categories).toContain("phase4");
    expect(categories).toContain("enforcement");
    expect(categories).toContain("audit");
  });

  it("each step should have non-empty title and description", () => {
    BB_STEPS.forEach(s => {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
      expect(s.icon.length).toBeGreaterThan(0);
      expect(s.details.length).toBeGreaterThan(0);
    });
  });
});

describe("Protocolo Biquíni Branco — Phase Transitions", () => {
  const minAdherence = 70;

  it("should allow transition with full compliance", () => {
    const result = canTransitionPhase(1, 85, minAdherence, true, true, true);
    expect(result.allowed).toBe(true);
  });

  it("should block transition if adherence too low", () => {
    const result = canTransitionPhase(1, 50, minAdherence, true, true, true);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("adherence_too_low");
  });

  it("should block transition if weight missing and enforcement on", () => {
    const result = canTransitionPhase(2, 80, minAdherence, false, true, true);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("weight_data_missing");
  });

  it("should block transition if photos missing and enforcement on", () => {
    const result = canTransitionPhase(2, 80, minAdherence, true, false, true);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("photo_data_missing");
  });

  it("should allow transition without enforcement even if data missing", () => {
    const result = canTransitionPhase(2, 80, minAdherence, false, false, false);
    expect(result.allowed).toBe(true);
  });

  it("should block transition from phase 4 (final)", () => {
    const result = canTransitionPhase(4, 100, minAdherence, true, true, true);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("already_at_final_phase");
  });
});

describe("Protocolo Biquíni Branco — Calorie Calculation", () => {
  const tdee = 2200;

  it("phase 1 should have no deficit", () => {
    expect(calculateBBCalorieTarget(tdee, 1, DEFAULT_BB_SETTINGS)).toBe(2200);
  });

  it("phase 2 should apply moderate deficit", () => {
    const target = calculateBBCalorieTarget(tdee, 2, DEFAULT_BB_SETTINGS);
    expect(target).toBe(1800);
    expect(target).toBeLessThan(tdee);
  });

  it("phase 3 should apply maximum deficit", () => {
    const target = calculateBBCalorieTarget(tdee, 3, DEFAULT_BB_SETTINGS);
    expect(target).toBe(1700);
    expect(target).toBeLessThan(calculateBBCalorieTarget(tdee, 2, DEFAULT_BB_SETTINGS));
  });

  it("phase 4 maintenance should be at TDEE", () => {
    expect(calculateBBCalorieTarget(tdee, 4, DEFAULT_BB_SETTINGS)).toBe(2200);
  });
});

describe("Protocolo Biquíni Branco — Protein Targets", () => {
  it("phase 1 should be 1.5g/kg", () => expect(getProteinTarget(1)).toBe(1.5));
  it("phase 2 should be 2.0g/kg", () => expect(getProteinTarget(2)).toBe(2.0));
  it("phase 3 should be highest at 2.2g/kg", () => expect(getProteinTarget(3)).toBe(2.2));
  it("phase 4 should scale down to 1.8g/kg", () => expect(getProteinTarget(4)).toBe(1.8));
  it("protein should increase phase 1 → 3 then decrease at phase 4", () => {
    expect(getProteinTarget(2)).toBeGreaterThan(getProteinTarget(1));
    expect(getProteinTarget(3)).toBeGreaterThan(getProteinTarget(2));
    expect(getProteinTarget(4)).toBeLessThan(getProteinTarget(3));
    expect(getProteinTarget(4)).toBeGreaterThan(getProteinTarget(1));
  });
});

describe("Protocolo Biquíni Branco — Metadata Schema", () => {
  const mockMetadata: BBGenerationMetadata = {
    engine_version: "2.1.0",
    protocol_version: "biquini_branco_v1",
    bb_phase: 2,
    bb_phase_name: "Déficit Estratégico",
    bb_deficit_applied: 400,
    bb_meta_proteinas_gkg: 2.0,
    bmr_formula: "mifflin_st_jeor",
    bmr_value: 1420,
    tdee_factor: 1.55,
    tdee_value: 2201,
    calorie_target: 1801,
    macro_strategy: "bb_high_protein_cut",
    macros: { protein_g: 140, carbs_g: 180, fat_g: 60 },
    template_selected: { id: "uuid-test", slug: "low_carb_1800", version: 3 },
    template_score: 82,
    phase_adjustments: {
      deficit_override: -400,
      protein_multiplier: 2.0,
      carb_timing: "pre_post_training",
      restrictions_applied: ["no_alcohol", "no_refined_carbs_night"],
    },
    data_sources: ["anamnesis", "enrollment_data"],
    generated_at: "2025-03-15T10:00:00Z",
  };

  it("should have biquini_branco protocol version", () => {
    expect(mockMetadata.protocol_version).toContain("biquini_branco");
  });

  it("should include BB-specific fields", () => {
    expect(mockMetadata).toHaveProperty("bb_phase");
    expect(mockMetadata).toHaveProperty("bb_phase_name");
    expect(mockMetadata).toHaveProperty("bb_deficit_applied");
    expect(mockMetadata).toHaveProperty("bb_meta_proteinas_gkg");
    expect(mockMetadata).toHaveProperty("phase_adjustments");
  });

  it("calorie target should equal TDEE minus deficit", () => {
    expect(mockMetadata.calorie_target).toBe(mockMetadata.tdee_value - mockMetadata.bb_deficit_applied);
  });

  it("should use deterministic formula", () => {
    expect(mockMetadata.bmr_formula).toBe("mifflin_st_jeor");
  });

  it("phase_adjustments deficit should match bb_deficit_applied", () => {
    expect(Math.abs(mockMetadata.phase_adjustments.deficit_override)).toBe(mockMetadata.bb_deficit_applied);
  });

  it("macros should sum to reasonable calorie total", () => {
    const { protein_g, carbs_g, fat_g } = mockMetadata.macros;
    const totalCal = protein_g * 4 + carbs_g * 4 + fat_g * 9;
    // Should be within 10% of calorie_target
    expect(totalCal).toBeGreaterThan(mockMetadata.calorie_target * 0.9);
    expect(totalCal).toBeLessThan(mockMetadata.calorie_target * 1.1);
  });
});
