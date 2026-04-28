#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const snapshotPath = path.join(projectRoot, "src", "integrations", "supabase", "schema-snapshot.json");

// Tables we care about for the frontend
export const TRACKED_TABLES = [
  "meal_plans",
  "meal_plan_items",
  "profiles",
  "nutritionist_patients",
  "patient_lifecycle_states",
  "onboarding_pipelines",
  "patient_anamnesis",
  "system_alerts",
  "audit_events",
  "patient_settings",
];

export function generateSnapshotData() {
  const migrations = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  const tables = {};

  for (const file of migrations) {
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    
    // Parse CREATE TABLE
    const createTableMatches = content.matchAll(/CREATE TABLE (?:public\.)?(\w+) \(([\s\S]*?)\);/gi);
    for (const match of createTableMatches) {
      const tableName = match[1].toLowerCase();
      const body = match[2];
      
      const lines = body.split("\n").map(l => l.trim()).filter(Boolean);
      const columns = [];
      for (const line of lines) {
        if (/^(CONSTRAINT|PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK|INDEX)/i.test(line)) continue;
        const colMatch = line.match(/^"?([a-z0-9_]+)"?\s+/i);
        if (colMatch) {
          columns.push(colMatch[1].toLowerCase());
        }
      }
      
      tables[tableName] = Array.from(new Set([...(tables[tableName] || []), ...columns]));
    }

    // Parse ALTER TABLE
    const alterTableMatches = content.matchAll(/ALTER TABLE (?:public\.)?(\w+)\s+([\s\S]*?);/gi);
    for (const match of alterTableMatches) {
      const tableName = match[1].toLowerCase();
      const body = match[2];
      
      // ADD COLUMN
      const addMatches = body.matchAll(/ADD COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:")?([a-z0-9_]+)(?:")?/gi);
      for (const m of addMatches) {
        const col = m[1].toLowerCase();
        if (!tables[tableName]) tables[tableName] = [];
        if (!tables[tableName].includes(col)) tables[tableName].push(col);
      }
      
      // DROP COLUMN
      const dropMatches = body.matchAll(/DROP COLUMN\s+(?:IF\s+EXISTS\s+)?(?:")?([a-z0-9_]+)(?:")?/gi);
      for (const m of dropMatches) {
        const col = m[1].toLowerCase();
        if (tables[tableName]) tables[tableName] = tables[tableName].filter(c => c !== col);
      }
      
      // RENAME COLUMN
      const renameMatches = body.matchAll(/RENAME COLUMN\s+(?:")?([a-z0-9_]+)(?:")?\s+TO\s+(?:")?([a-z0-9_]+)(?:")?/gi);
      for (const m of renameMatches) {
        const oldCol = m[1].toLowerCase();
        const newCol = m[2].toLowerCase();
        if (tables[tableName]) {
          tables[tableName] = tables[tableName].map(c => c === oldCol ? newCol : c);
        }
      }
    }
  }

  // Final deterministic sorting
  const resultTables = {};
  const sortedTrackedTables = [...TRACKED_TABLES].sort();
  
  for (const tableName of sortedTrackedTables) {
    if (tables[tableName]) {
      // Sorting columns for determinism
      resultTables[tableName] = Array.from(new Set(tables[tableName])).sort();
    }
  }

  return {
    "$schema": "./schema-snapshot.schema.json",
    // We remove generatedAt to avoid false diffs if only the timestamp changed
    "lastMigration": migrations[migrations.length - 1] || null,
    "migrationsCount": migrations.length,
    "tables": resultTables
  };
}

if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
  const newSnapshot = generateSnapshotData();
  // Stringify with ordered keys for full determinism
  const deterministicOutput = JSON.stringify(newSnapshot, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted, k) => {
        sorted[k] = value[k];
        return sorted;
      }, {});
    }
    return value;
  }, 2);
  
  fs.writeFileSync(snapshotPath, deterministicOutput + "\n");
  console.log(`✓ Generated deterministic ${snapshotPath} from ${fs.readdirSync(migrationsDir).length} migrations.`);
}
