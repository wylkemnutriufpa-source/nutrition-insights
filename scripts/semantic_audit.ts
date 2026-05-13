
import { readFileSync } from 'fs';
import { join } from 'path';
import { globSync } from 'glob';

/**
 * SOVEREIGN SEMANTIC RISK AUDIT V1
 * Purpose: Identify legacy V2 intelligence signals in a V3 Sovereign environment.
 */

const LEGACY_SIGNALS = [
  { pattern: /ilike/g, risk: 'Low', detail: 'Fuzzy database search' },
  { pattern: /regex/gi, risk: 'Medium', detail: 'Pattern-based inference' },
  { pattern: /INTOLERANCE_KEYWORDS/g, risk: 'High', detail: 'String-based clinical safety' },
  { pattern: /getBestMealImage/g, risk: 'Medium', detail: 'Heuristic-based asset resolution' },
  { pattern: /scaleTemplateToTarget/g, risk: 'Low', detail: 'Passive scaling (verify sovereign usage)' },
  { pattern: /normalizeV2ToV3/g, risk: 'High', detail: 'Legacy hydration bridge' },
  { pattern: /"contains_lactose"|"contains_gluten"/g, risk: 'Low', detail: 'Passive tag usage (Standard)' },
];

const SEARCH_PATHS = [
  'src/features/editor-v3/**/*.ts',
  'src/features/editor-v3/**/*.tsx',
  'src/lib/sovereign/**/*.ts',
  'supabase/functions/_shared/*.ts',
  'supabase/functions/generate-meal-plan/*.ts',
];

function audit() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   FITJOURNEY V3 — AUDITORIA DE RISCO SEMÂNTICO (SRE)      ');
  console.log('═══════════════════════════════════════════════════════════\n');

  const report: any[] = [];

  SEARCH_PATHS.forEach(globPattern => {
    const files = globSync(globPattern);
    files.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      const findings: any[] = [];

      LEGACY_SIGNALS.forEach(signal => {
        const matches = content.match(signal.pattern);
        if (matches) {
          findings.push({
            signal: signal.pattern.toString(),
            risk: signal.risk,
            count: matches.length,
            detail: signal.detail
          });
        }
      });

      if (findings.length > 0) {
        report.push({ file, findings });
      }
    });
  });

  report.sort((a, b) => {
    const riskMap: any = { 'High': 3, 'Medium': 2, 'Low': 1 };
    const maxRiskA = Math.max(...a.findings.map((f: any) => riskMap[f.risk]));
    const maxRiskB = Math.max(...b.findings.map((f: any) => riskMap[f.risk]));
    return maxRiskB - maxRiskA;
  });

  report.forEach(item => {
    console.log(`📍 ARQUIVO: ${item.file}`);
    item.findings.forEach((f: any) => {
      const color = f.risk === 'High' ? '🔴' : (f.risk === 'Medium' ? '🟡' : '⚪');
      console.log(`   ${color} RISK [${f.risk}]: ${f.signal.padEnd(25)} | ${f.detail} (${f.count} ocorrências)`);
    });
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`TOTAL DE ARQUIVOS CONTAMINADOS: ${report.length}`);
  console.log('ESTADO FINAL: SOBERANIA PROTEGIDA, RISCO SEMÂNTICO RESIDUAL LOCALIZADO.');
  console.log('═══════════════════════════════════════════════════════════');
}

audit();
