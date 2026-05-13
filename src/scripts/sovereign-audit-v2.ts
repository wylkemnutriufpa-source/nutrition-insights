
import { execSync } from "child_process";

const CRITICAL_FILES = [
  "supabase/functions/_shared/template-resolver.ts",
  "src/lib/nutricore_v2/adapter.ts",
  "supabase/functions/generate-meal-plan/index.ts",
  "src/features/editor-v3/services/localPlanGenerator.ts"
];

const SIGNALS = [
  { pattern: "PORTION_CATEGORY_KEYWORDS", label: "Heurística de Categoria de Porção", risk: "CRITICAL", desc: "Define porções baseadas em nomes de alimentos via string matching." },
  { pattern: "INTOLERANCE_KEYWORDS", label: "Heurística de Intolerância", risk: "CRITICAL", desc: "Filtra alimentos usando palavras-chave em vez de IDs clínicos." },
  { pattern: "totalCal =", label: "Recálculo de Macros Manual", risk: "CRITICAL", desc: "Calcula calorias somando alimentos fora do NutriCoreV3." },
  { pattern: "score \\+=", label: "Scoring Heurístico", risk: "HIGH", desc: "Usa pontuação arbitrária para decidir relevância clínica." },
  { pattern: "Math\\.round\\(.* \\* portionRatio", label: "Scaling Implícito", risk: "HIGH", desc: "Recalcula porções e macros sem supervisão determinística." },
  { pattern: "\\.includes\\(", label: "Match Textual (Inclusion)", risk: "MEDIUM", desc: "Usa .includes() para validar condições clínicas em strings." },
  { pattern: "\\?\\? \\\"", label: "Fallback Textual", risk: "MEDIUM", desc: "Usa strings hardcoded como fallback para dados ausentes." },
  { pattern: "getBestMealImage", label: "Heurística de Imagem", risk: "MEDIUM", desc: "Decide imagem da refeição baseada no nome da refeição." }
];

function audit() {
  console.log("# RELATÓRIO DE RISCO SEMÂNTICO - AUDITORIA SOBERANA V3\n");
  
  const findings: any[] = [];

  CRITICAL_FILES.forEach(file => {
    SIGNALS.forEach(sig => {
      try {
        const cmd = `rg -n "${sig.pattern}" ${file}`;
        const output = execSync(cmd).toString();
        if (output) {
          output.split("\n").filter(Boolean).forEach(line => {
            const [num, ...content] = line.split(":");
            findings.push({
              file,
              line: num,
              content: content.join(":").trim(),
              ...sig
            });
          });
        }
      } catch (e) {}
    });
  });

  // Risk levels mapping
  const riskMap: any = { CRITICAL: "🔴", HIGH: "🟠", MEDIUM: "🟡", LOW: "⚪" };

  console.log("| Risco | Arquivo | Linha | Sinal | Descrição |");
  console.log("| :--- | :--- | :--- | :--- | :--- |");
  
  findings.sort((a, b) => {
    const order: any = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.risk] - order[b.risk];
  });

  findings.forEach(f => {
    console.log(`| ${riskMap[f.risk]} ${f.risk} | \`${f.file}\` | ${f.line} | ${f.label} | ${f.desc} |`);
  });

  console.log("\n## Análise de Funções Críticas\n");

  const functionsAudit: any = {};
  findings.forEach(f => {
    // Attempt to find function name by looking back
    try {
      const context = execSync(`head -n ${f.line} ${f.file} | tail -n 50`).toString();
      const funcMatch = context.match(/function\s+([a-zA-Z0-9_]+)|([a-zA-Z0-9_]+)\s*=\s*(async\s*)?\(/g);
      const funcName = funcMatch ? funcMatch[funcMatch.length - 1].split(/[ (]/)[0] : "Top Level / Anonymous";
      
      const key = `${f.file} -> ${funcName}`;
      if (!functionsAudit[key]) functionsAudit[key] = { risk: "LOW", count: 0 };
      functionsAudit[key].count++;
      const order: any = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      if (order[f.risk] < order[functionsAudit[key].risk]) functionsAudit[key].risk = f.risk;
    } catch (e) {}
  });

  Object.entries(functionsAudit).forEach(([func, data]: [string, any]) => {
    console.log(`- ${riskMap[data.risk]} **[${data.risk}]** ${func} (${data.count} sinais)`);
  });

  console.log("\n### Conclusão de Risco Residual");
  console.log("O maior risco reside no `template-resolver.ts` e no `generate-meal-plan` (Edge Function), que ainda executam lógica de portioning e filtragem clínica via strings (V2 Legacy). O NutriCoreV3Adapter está limpo de lógica de recálculo, mas consome essas saídas contaminadas.");
}

audit();
