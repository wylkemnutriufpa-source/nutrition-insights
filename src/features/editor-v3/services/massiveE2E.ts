
import { V3SandboxGenerator } from "./v3SandboxGenerator";
import { DietTemplateService } from "./dietTemplateService";
import { LibraryV3Resolver } from "./libraryV3Resolver";
import { Meal, MealItem } from "../types/types";

export interface E2EResult {
  totalPlans: number;
  clinicalCoherenceScore: number;
  visualRotationScore: number;
  mealIntegrityScore: number;
  substitutionQualityScore: number;
  humanScalingScore: number;
  topErrors: string[];
  stableTemplates: string[];
  problematicClusters: string[];
  repeatedMeals: Record<string, number>;
  repeatedImages: Record<string, number>;
  heatmap: Record<string, number>; // cluster -> score
  recommendations: string[];
}

/**
 * E2E Clínico Massivo - Biblioteca V3
 * Executa simulações em larga escala para validar a soberania da V3.
 */
export class LibraryV3MassiveE2E {
  static async runMassiveTest(planCount: number = 300): Promise<E2EResult> {
    console.info(`[E2E-V3] Starting Massive Clinical E2E: ${planCount} plans.`);
    
    const templates = await DietTemplateService.listTemplates();
    const kcalProfiles = [1200, 1500, 1800, 2200, 2500, 3000];
    const goals = ['emagrecimento', 'hipertrofia', 'performance', 'saude_geral'];
    
    const results: E2EResult = {
      totalPlans: 0,
      clinicalCoherenceScore: 0,
      visualRotationScore: 0,
      mealIntegrityScore: 0,
      substitutionQualityScore: 0,
      humanScalingScore: 0,
      topErrors: [],
      stableTemplates: [],
      problematicClusters: [],
      repeatedMeals: {},
      repeatedImages: {},
      heatmap: {},
      recommendations: []
    };

    const mealAudit: any[] = [];
    const clusterStats: Record<string, { total: number, valid: number, scalingErrors: number }> = {};

    for (let i = 0; i < planCount; i++) {
      const template = templates[i % templates.length];
      const targetKcal = kcalProfiles[Math.floor(Math.random() * kcalProfiles.length)];
      const goal = goals[Math.floor(Math.random() * goals.length)];

      try {
        const meals = await V3SandboxGenerator.generateDraft({
          templateSlug: template.slug,
          patientContext: {
            calories_target: targetKcal,
            goal: goal as any
          }
        });

        this.auditPlan(meals, template, results, mealAudit, clusterStats);
        results.totalPlans++;
      } catch (err: any) {
        results.topErrors.push(`Plan ${i} Error: ${err.message}`);
      }
    }

    this.finalizeMetrics(results, mealAudit, clusterStats, templates);
    
    console.info(`[E2E-V3] Test Complete. Score: ${results.clinicalCoherenceScore}%`);
    return results;
  }

  private static auditPlan(
    meals: Meal[], 
    template: any, 
    results: E2EResult, 
    mealAudit: any[],
    clusterStats: Record<string, any>
  ) {
    meals.forEach(meal => {
      // 1. Audit Meals & Images
      results.repeatedMeals[meal.name] = (results.repeatedMeals[meal.name] || 0) + 1;
      if (meal.imageUrl) {
        results.repeatedImages[meal.imageUrl] = (results.repeatedImages[meal.imageUrl] || 0) + 1;
      }

      // 2. Meal Integrity Check
      const mainItem = meal.items.find(it => it.isVisualLibraryParent) || meal.items[0];
      const cluster = mainItem?.library_item_slug || 'unknown';
      
      if (!clusterStats[cluster]) {
        clusterStats[cluster] = { total: 0, valid: 0, scalingErrors: 0 };
      }
      clusterStats[cluster].total++;

      // Validation: Human Scaling
      const scaleFactor = mainItem ? (mainItem.kcal / (mainItem.kcal_base || mainItem.kcal)) : 1;
      const isScalingValid = scaleFactor >= 0.5 && scaleFactor <= (template.meal_integrity_threshold || 1.8);
      
      if (isScalingValid) {
        clusterStats[cluster].valid++;
      } else {
        clusterStats[cluster].scalingErrors++;
      }

      // 3. Clinical Context Check (Simple heuristic for E2E)
      const isClinicalValid = this.validateClinicalContext(meal);
      
      mealAudit.push({
        mealName: meal.name,
        cluster,
        isScalingValid,
        isClinicalValid,
        scaleFactor
      });
    });
  }

  private static validateClinicalContext(meal: Meal): boolean {
    const name = meal.name.toLowerCase();
    const type = meal.items[0]?.category?.toLowerCase() || '';

    // ALMOÇO nunca parece ceia/café (heurística de palavras-chave para o E2E)
    if (name.includes('almoço') || name.includes('jantar')) {
      if (name.includes('mingau') || name.includes('iogurte') || name.includes('fruta')) return false;
    }
    
    // CAFÉ nunca parece almoço
    if (name.includes('café') || name.includes('desjejum')) {
      if (name.includes('arroz') || name.includes('feijão') || name.includes('steak')) return false;
    }

    return true;
  }

  private static finalizeMetrics(results: E2EResult, mealAudit: any[], clusterStats: Record<string, any>, templates: any[]) {
    const totalMeals = mealAudit.length;
    if (totalMeals === 0) return;

    const validScaling = mealAudit.filter(m => m.isScalingValid).length;
    const validClinical = mealAudit.filter(m => m.isClinicalValid).length;

    results.humanScalingScore = Math.round((validScaling / totalMeals) * 100);
    results.clinicalCoherenceScore = Math.round((validClinical / totalMeals) * 100);
    
    // Visual Rotation Score (1 - Unique Images Ratio)
    const uniqueImages = Object.keys(results.repeatedImages).length;
    results.visualRotationScore = Math.min(100, Math.round((uniqueImages / totalMeals) * 200)); // Normalized

    // Meal Integrity
    results.mealIntegrityScore = results.humanScalingScore;

    // Detect Problematic Clusters
    Object.entries(clusterStats).forEach(([cluster, stats]: [string, any]) => {
      const score = (stats.valid / stats.total) * 100;
      results.heatmap[cluster] = Math.round(score);
      if (score < 80) {
        results.problematicClusters.push(`${cluster} (${Math.round(score)}% success)`);
      }
    });

    // Stable Templates
    templates.forEach(t => {
      if (!results.topErrors.some(e => e.includes(t.slug))) {
        results.stableTemplates.push(t.title);
      }
    });

    // Recommendations
    if (results.clinicalCoherenceScore > 90) {
      results.recommendations.push("Templates V3 Soberanos prontos para fase de pré-produção.");
    } else {
      results.recommendations.push("Ajustar clusters com baixo Clinical Coherence Score antes de avançar.");
    }

    if (results.humanScalingScore < 85) {
      results.recommendations.push("Revisar Thresholds de integridade em kcal extremas (1200 ou 3000).");
    }
  }
}
