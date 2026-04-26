#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const snapshotPath = path.join(__dirname, "schema-snapshot.json");
const tempSnapshotPath = path.join(__dirname, "schema-snapshot-temp.json");

console.log("Checking if schema-snapshot.json is up to date with migrations...");

try {
  // 1. Generate a temporary snapshot
  execSync(`node ${path.join(__dirname, "generate-schema-snapshot.mjs")}`, { stdio: 'inherit' });
  
  // Since generate-schema-snapshot.mjs overwrites the file, we need a slightly different approach
  // to compare without overwriting if we want to show a diff.
  // Actually, I'll just make generate-schema-snapshot.mjs output to stdout if a flag is passed.
} catch (err) {
  console.error("Failed to run generation script.");
  process.exit(1);
}

// Re-implementing logic here for simple comparison
// (Alternatively, I could have modified generate-schema-snapshot.mjs but this is cleaner for a quick task)
function getSnapshot() {
  const migrationsDir = path.resolve(__dirname, "..", "supabase", "migrations");
  const TRACKED_TABLES = [
    "meal_plans", "meal_plan_items", "profiles", "nutritionist_patients",
    "patient_lifecycle_states", "onboarding_pipelines", "patient_anamnesis", "system_alerts"
  ];
  
  const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
  const tables = {};
  for (const file of migrations) {
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const createTableMatches = content.matchAll(/CREATE TABLE (?:public\.)?(\w+) \(([\s\S]*?)\);/gi);
    for (const match of createTableMatches) {
      const tableName = match[1].toLowerCase();
      const body = match[2];
      const lines = body.split("\n").map(l => l.trim()).filter(Boolean);
      const columns = [];
      for (const line of lines) {
        if (/^(CONSTRAINT|PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK|INDEX)/i.test(line)) continue;
        const colMatch = line.match(/^"?([a-z0-9_]+)"?\s+/i);
        if (colMatch) columns.push(colMatch[1].toLowerCase());
      }
      tables[tableName] = Array.from(new Set([...(tables[tableName] || []), ...columns]));
    }
    const alterTableAddMatches = content.matchAll(/ALTER TABLE (?:public\.)?(\w+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:")?([a-z0-9_]+)(?:")?/gi);
    for (const match of alterTableAddMatches) {
      const tableName = match[1].toLowerCase();
      const columnName = match[2].toLowerCase();
      if (!tables[tableName]) tables[tableName] = [];
      if (!tables[tableName].includes(columnName)) tables[tableName].push(columnName);
    }
    const alterTableDropMatches = content.matchAll(/ALTER TABLE (?:public\.)?(\w+)\s+DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?(?:")?([a-z0-9_]+)(?:")?/gi);
    for (const match of alterTableDropMatches) {
      const tableName = match[1].toLowerCase();
      const columnName = match[2].toLowerCase();
      if (tables[tableName]) tables[tableName] = tables[tableName].filter(c => c !== columnName);
    }
  }
  const resultTables = {};
  for (const tableName of TRACKED_TABLES) {
    if (tables[tableName]) resultTables[tableName] = Array.from(new Set(tables[tableName])).sort();
  }
  return resultTables;
}

const currentRaw = fs.readFileSync(snapshotPath, "utf8");
const current = JSON.parse(currentRaw.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "")).tables;
const fresh = getSnapshot();

let hasDiff = false;
const diffs = [];

const allTables = new Set([...Object.keys(current), ...Object.keys(fresh)]);

for (const table of allTables) {
  const currentCols = current[table] || [];
  const freshCols = fresh[table] || [];
  
  const missingInSnapshot = freshCols.filter(c => !currentCols.includes(c));
  const extraInSnapshot = currentCols.filter(c => !freshCols.includes(c));
  
  if (missingInSnapshot.length > 0 || extraInSnapshot.length > 0) {
    hasDiff = true;
    let msg = `Table "${table}":\n`;
    if (missingInSnapshot.length > 0) msg += `  [+] Missing columns (exist in migrations but not in snapshot): ${missingInSnapshot.join(", ")}\n`;
    if (extraInSnapshot.length > 0) msg += `  [-] Extra columns (exist in snapshot but not in migrations): ${extraInSnapshot.join(", ")}\n`;
    diffs.push(msg);
  }
}

if (hasDiff) {
  console.error("\n✗ SCHEMA SNAPSHOT OUTDATED!\n");
  diffs.forEach(d => console.error(d));
  console.error("\nRun 'node scripts/generate-schema-snapshot.mjs' to update the snapshot.\n");
  process.exit(1);
} else {
  console.log("✓ Schema snapshot is up to date.");
  process.exit(0);
}
