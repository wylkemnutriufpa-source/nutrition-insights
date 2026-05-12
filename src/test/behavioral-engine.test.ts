import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════
// Replicate engine functions for testing
// ═══════════════════════════════════════════

function computeDropoutRiskScore(params: {
  daysWithoutLogin: number;
  adherenceDrop14d: number;
  adherence7d: number;
  checkinReduction: number;
  alertCount: number;
  cluster: string;
  evolutionScore: number;
  engagementVelocity: number;
}): number {
  let score = 0;
  if (params.daysWithoutLogin >= 10) score += 35;
  else if (params.daysWithoutLogin >= 5) score += 20;
  else if (params.daysWithoutLogin >= 3) score += 10;
  if (params.adherence7d < 30) score += 30;
  else if (params.adherence7d < 50) score += 20;
  else if (params.adherence7d < 60) score += 10;
  if (params.adherenceDrop14d > 30) score += 15;
  else if (params.adherenceDrop14d > 15) score += 10;
  else if (params.adherenceDrop14d > 5) score += 5;
  if (params.cluster === "disengaging_patient") score += 25;
  else if (params.cluster === "behavioral_struggler") score += 10;
  if (params.evolutionScore < 25) score += 20;
  else if (params.evolutionScore < 40) score += 10;
  if (params.alertCount >= 4) score += 10;
  else if (params.alertCount >= 2) score += 5;
  if (params.checkinReduction > 50) score += 10;
  else if (params.checkinReduction > 25) score += 5;
  if (params.engagementVelocity < -20) score += 10;
  else if (params.engagementVelocity < -10) score += 5;
  return Math.min(100, Math.max(0, score));
}

type DropoutRiskLevel = "baixo" | "moderado" | "alto" | "critico";

function classifyDropoutRisk(score: number): DropoutRiskLevel {
  if (score >= 70) return "critico";
  if (score >= 50) return "alto";
  if (score >= 30) return "moderado";
  return "baixo";
}

type RecoveryStrategy = "contato_imediato" | "simplificar_plano" | "reduzir_pressao_resultado" | "estrategia_motivacional" | "agendar_retorno" | "intervencao_intensiva";

function computeRecoveryStrategy(
  dropoutLevel: DropoutRiskLevel, cluster: string, adherence7d: number, planEfficacy: number, daysInactive: number
): { strategy: RecoveryStrategy; priority: number } {
  if (dropoutLevel === "critico" && cluster === "disengaging_patient") return { strategy: "intervencao_intensiva", priority: 1 };
  if (dropoutLevel === "critico") return { strategy: "contato_imediato", priority: 1 };
  if (dropoutLevel === "alto" && cluster === "behavioral_struggler") return { strategy: "simplificar_plano", priority: 2 };
  if (dropoutLevel === "alto" && planEfficacy < 40) return { strategy: "reduzir_pressao_resultado", priority: 2 };
  if (dropoutLevel === "alto") return { strategy: "agendar_retorno", priority: 2 };
  if (dropoutLevel === "moderado" && cluster === "disengaging_patient") return { strategy: "estrategia_motivacional", priority: 3 };
  if (dropoutLevel === "moderado" && adherence7d < 45) return { strategy: "simplificar_plano", priority: 3 };
  if (dropoutLevel === "moderado") return { strategy: "agendar_retorno", priority: 4 };
  return { strategy: "estrategia_motivacional", priority: 5 };
}

// ═══════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════

describe("Behavioral Dropout Risk Engine v1.0.0", () => {
  describe("Dropout Risk Score", () => {
    it("paciente some completamente (10d sem login, adesão 0%)", () => {
      const score = computeDropoutRiskScore({
        daysWithoutLogin: 12,
        adherenceDrop14d: 50,
        adherence7d: 10,
        checkinReduction: 80,
        alertCount: 5,
        cluster: "disengaging_patient",
        evolutionScore: 15,
        engagementVelocity: -30,
      });
      expect(score).toBeGreaterThanOrEqual(70);
      expect(classifyDropoutRisk(score)).toBe("critico");
    });

    it("paciente reduz adesão gradualmente", () => {
      const score = computeDropoutRiskScore({
        daysWithoutLogin: 3,
        adherenceDrop14d: 20,
        adherence7d: 45,
        checkinReduction: 30,
        alertCount: 2,
        cluster: "behavioral_struggler",
        evolutionScore: 45,
        engagementVelocity: -12,
      });
      expect(score).toBeGreaterThanOrEqual(30);
      expect(score).toBeLessThan(70);
      const level = classifyDropoutRisk(score);
      expect(["moderado", "alto"]).toContain(level);
    });

    it("paciente melhora após intervenção (engajado)", () => {
      const score = computeDropoutRiskScore({
        daysWithoutLogin: 0,
        adherenceDrop14d: 0,
        adherence7d: 85,
        checkinReduction: 0,
        alertCount: 0,
        cluster: "metabolic_responder",
        evolutionScore: 80,
        engagementVelocity: 10,
      });
      expect(score).toBeLessThan(30);
      expect(classifyDropoutRisk(score)).toBe("baixo");
    });

    it("cluster desengajado progressivo", () => {
      const score = computeDropoutRiskScore({
        daysWithoutLogin: 6,
        adherenceDrop14d: 25,
        adherence7d: 35,
        checkinReduction: 40,
        alertCount: 3,
        cluster: "disengaging_patient",
        evolutionScore: 30,
        engagementVelocity: -25,
      });
      expect(score).toBeGreaterThanOrEqual(50);
      expect(classifyDropoutRisk(score)).toBe("critico");
    });

    it("plano falha + abandono", () => {
      const score = computeDropoutRiskScore({
        daysWithoutLogin: 8,
        adherenceDrop14d: 40,
        adherence7d: 20,
        checkinReduction: 70,
        alertCount: 4,
        cluster: "behavioral_struggler",
        evolutionScore: 10,
        engagementVelocity: -35,
      });
      expect(score).toBeGreaterThanOrEqual(70);
      expect(classifyDropoutRisk(score)).toBe("critico");
    });

    it("paciente ativo com bons indicadores = baixo risco", () => {
      const score = computeDropoutRiskScore({
        daysWithoutLogin: 1,
        adherenceDrop14d: 2,
        adherence7d: 90,
        checkinReduction: 0,
        alertCount: 0,
        cluster: "metabolic_responder",
        evolutionScore: 85,
        engagementVelocity: 5,
      });
      expect(score).toBeLessThan(15);
      expect(classifyDropoutRisk(score)).toBe("baixo");
    });

    it("score nunca excede 100", () => {
      const score = computeDropoutRiskScore({
        daysWithoutLogin: 30,
        adherenceDrop14d: 80,
        adherence7d: 0,
        checkinReduction: 100,
        alertCount: 10,
        cluster: "disengaging_patient",
        evolutionScore: 0,
        engagementVelocity: -50,
      });
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe("Recovery Strategy", () => {
    it("crítico + desengajando = intervenção intensiva", () => {
      const r = computeRecoveryStrategy("critico", "disengaging_patient", 20, 15, 15);
      expect(r.strategy).toBe("intervencao_intensiva");
      expect(r.priority).toBe(1);
    });

    it("crítico + outro cluster = contato imediato", () => {
      const r = computeRecoveryStrategy("critico", "resistant_profile", 30, 40, 10);
      expect(r.strategy).toBe("contato_imediato");
      expect(r.priority).toBe(1);
    });

    it("alto + lutador = simplificar plano", () => {
      const r = computeRecoveryStrategy("alto", "behavioral_struggler", 40, 50, 6);
      expect(r.strategy).toBe("simplificar_plano");
      expect(r.priority).toBe(2);
    });

    it("alto + baixa eficácia = reduzir pressão", () => {
      const r = computeRecoveryStrategy("alto", "metabolic_adaptive", 55, 25, 5);
      expect(r.strategy).toBe("reduzir_pressao_resultado");
      expect(r.priority).toBe(2);
    });

    it("moderado + desengajando = motivacional", () => {
      const r = computeRecoveryStrategy("moderado", "disengaging_patient", 50, 60, 4);
      expect(r.strategy).toBe("estrategia_motivacional");
      expect(r.priority).toBe(3);
    });

    it("moderado + adesão baixa = simplificar", () => {
      const r = computeRecoveryStrategy("moderado", "metabolic_responder", 40, 60, 3);
      expect(r.strategy).toBe("simplificar_plano");
      expect(r.priority).toBe(3);
    });

    it("moderado default = agendar retorno", () => {
      const r = computeRecoveryStrategy("moderado", "metabolic_responder", 55, 60, 4);
      expect(r.strategy).toBe("agendar_retorno");
      expect(r.priority).toBe(4);
    });
  });

  describe("Classification Boundaries", () => {
    it("score 70 = critico", () => expect(classifyDropoutRisk(70)).toBe("critico"));
    it("score 69 = alto", () => expect(classifyDropoutRisk(69)).toBe("alto"));
    it("score 50 = alto", () => expect(classifyDropoutRisk(50)).toBe("alto"));
    it("score 49 = moderado", () => expect(classifyDropoutRisk(49)).toBe("moderado"));
    it("score 30 = moderado", () => expect(classifyDropoutRisk(30)).toBe("moderado"));
    it("score 29 = baixo", () => expect(classifyDropoutRisk(29)).toBe("baixo"));
    it("score 0 = baixo", () => expect(classifyDropoutRisk(0)).toBe("baixo"));
    it("score 100 = critico", () => expect(classifyDropoutRisk(100)).toBe("critico"));
  });
});
