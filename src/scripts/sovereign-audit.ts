
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const SEARCH_PATTERNS = [
  { pattern: "|| \\\"[a-zA-Z]+\\\"", label: "Textual Fallback (OR)", risk: "MEDIUM" },
  { pattern: "\\?\\? \\\"[a-zA-Z]+\\\"", label: "Textual Fallback (Nullish)", risk: "MEDIUM" },
  { pattern: "score \\+=", label: "Match Heuristic (Scoring)", risk: "HIGH" },
  { pattern: "\\.match\\(\\/.*\\/\\)", label: "Regex Parsing", risk: "HIGH" },
  { pattern: "Math\\.round\\(.* \\* portionRatio", label: "Implicit Scaling", risk: "HIGH" },
  { pattern: "totalCal =", label: "Manual Macro Calculation", risk: "CRITICAL" },
  { pattern: "INTOLERANCE_KEYWORDS", label: "Hardcoded Clinical Logic", risk: "CRITICAL" },
  { pattern: "getBestMealImage", label: "Legacy Image Fallback", risk: "MEDIUM" },
  { pattern: "if \\(!.*\\) return \\\".*\\\"", label: "Explicit String Fallback", risk: "MEDIUM" },
  { pattern: "ilike", label: "SQL Text-based Match", risk: "MEDIUM" },
  { pattern: "\\.includes\\(", label: "Array/String Inclusion Heuristic", risk: "LOW" },
  { pattern: "PORTION_CATEGORY_KEYWORDS", label: "Portion Heuristics", risk: "CRITICAL" }
];

const EXCLUDE_DIRS = ["node_modules", ".git", "dist", "build", "__tests__"];

function runAudit() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("             RELATÓRIO DE AUDITORIA SOBERANA V3               ");
  console.log("══════════════════════════════════════════════════════════════\n");

  const results: any[] = [];

  SEARCH_PATTERNS.forEach(({ pattern, label, risk }) => {
    try {
      const output = execSync(`rg -n "${pattern}" src/ supabase/functions/ --glob "!**/__tests__/**" --glob "!**/node_modules/**"`).toString();
      if (output) {
        const lines = output.split("\n").filter(Boolean);
        lines.forEach(line => {
          const [file, lineNumber, ...content] = line.split(":");
          results.push({
            file,
            line: lineNumber,
            content: content.join(":").trim(),
            label,
            risk
          });
        });
      }
    } catch (e) {
      // rg returns non-zero if no matches
    }
  });

  const riskOrder = { "CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3 };
  results.sort((a, b) => riskOrder[a.risk as keyof typeof riskOrder] - riskOrder[b.risk as keyof typeof riskOrder]);

  console.log(`DETECÇÕES ENCONTRADAS: ${results.length}\n`);

  results.forEach(res => {
    const color = res.risk === "CRITICAL" ? "🔴" : res.risk === "HIGH" ? "🟠" : res.risk === "MEDIUM" ? "🟡" : "⚪";
    console.log(`${color} [${res.risk}] ${res.label}`);
    console.log(`   Arquivo: ${res.file}:${res.line}`);
    console.log(`   Código:  ${res.content}\n`);
  });

  console.log("══════════════════════════════════════════════════════════════");
  console.log("              RESUMO DE RISCO SEMÂNTICO POR ROTA               ");
  console.log("══════════════════════════════════════════════════════════════");

  const routes = ["generate-diet-plan", "template-resolver", "NutriCoreV3Adapter", "EditorV3"];
  routes.forEach(route => {
    const routeResults = results.filter(r => r.file.includes(route));
    const count = routeResults.length;
    const maxRisk = routeResults.reduce((max, r) => {
       if (riskOrder[r.risk as keyof typeof riskOrder] < riskOrder[max as keyof typeof riskOrder]) return r.risk;
       return max;
    }, "LOW");
    
    if (count > 0) {
      console.log(`📍 Rota: ${route.padEnd(25)} | Detecções: ${String(count).padStart(3)} | Risco Máximo: ${maxRisk}`);
    }
  });
  console.log("\nPróximo Passo: Desintoxicar NutriCoreV3Adapter e Template-Resolver das heurísticas remanescentes.");
}

runAudit();
