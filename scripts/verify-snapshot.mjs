#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { generateSnapshotData } from "./generate-schema-snapshot.mjs";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const snapshotPath = path.join(__dirname, "schema-snapshot.json");

console.log("Checking if schema-snapshot.json is up to date with migrations...");

const currentRaw = fs.readFileSync(snapshotPath, "utf8");
// Strip comments before parsing
const current = JSON.parse(currentRaw.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "")).tables;
const fresh = generateSnapshotData().tables;

let hasDiff = false;
const diffResults = [];

const allTables = new Set([...Object.keys(current), ...Object.keys(fresh)]);

for (const table of allTables) {
  const currentCols = current[table] || [];
  const freshCols = fresh[table] || [];
  
  const missingInSnapshot = freshCols.filter(c => !currentCols.includes(c));
  const extraInSnapshot = currentCols.filter(c => !freshCols.includes(c));
  
  if (missingInSnapshot.length > 0 || extraInSnapshot.length > 0) {
    hasDiff = true;
    if (missingInSnapshot.length > 0) {
      diffResults.push({
        tabela: table,
        tipo: "FALTANDO NO SNAPSHOT",
        colunas: missingInSnapshot.join(", "),
        acao: "A migração tem colunas que o snapshot não conhece."
      });
    }
    if (extraInSnapshot.length > 0) {
      diffResults.push({
        tabela: table,
        tipo: "EXTRA NO SNAPSHOT",
        colunas: extraInSnapshot.join(", "),
        acao: "O snapshot tem colunas que não existem mais nas migrações."
      });
    }
  }
}

if (hasDiff) {
  console.error("\n✗ SCHEMA SNAPSHOT OUTDATED!\n");
  console.table(diffResults);
  console.error("\nSugestão: Execute 'npm run schema:update' para sincronizar o snapshot com as migrações locais.\n");
  process.exit(1);
} else {
  console.log("✓ Schema snapshot is up to date.");
  process.exit(0);
}
