#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { execSync } from "node:child_process";
import { generateSnapshotData } from "./generate-schema-snapshot.mjs";

const startTime = Date.now();
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const snapshotPath = path.join(projectRoot, "src", "integrations", "supabase", "schema-snapshot.json");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");

// Check environments
const IS_CI = !!process.env.CI || !!process.env.GITHUB_ACTIONS || !!process.env.VERCEL;
const IS_DEV = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

console.log("Checking schema snapshot consistency...");

if (!fs.existsSync(snapshotPath)) {
  console.error("✗ Snapshot file missing!");
  process.exit(1);
}

const currentRaw = fs.readFileSync(snapshotPath, "utf8");
const current = JSON.parse(currentRaw.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, ""));
const fresh = generateSnapshotData();

const migrations = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith(".sql"))
  .sort();

const lastSnapshotMigration = current.lastMigration;
const lastActualMigration = migrations[migrations.length - 1];
const isOutdated = lastSnapshotMigration !== lastActualMigration;

let hasDiff = false;
const diffResults = [];
const summary = [];

// Compare tables and columns
const allTables = new Set([...Object.keys(current.tables || {}), ...Object.keys(fresh.tables || {})]);

for (const table of allTables) {
  const currentCols = current.tables?.[table] || [];
  const freshCols = fresh.tables?.[table] || [];
  
  const missingInSnapshot = freshCols.filter(c => !currentCols.includes(c));
  const extraInSnapshot = currentCols.filter(c => !freshCols.includes(c));
  
  if (!current.tables?.[table] && fresh.tables?.[table]) {
    summary.push(`+ table: ${table}`);
  } else if (current.tables?.[table] && !fresh.tables?.[table]) {
    summary.push(`- table: ${table}`);
  }

  if (missingInSnapshot.length > 0 || extraInSnapshot.length > 0) {
    hasDiff = true;
    if (missingInSnapshot.length > 0) {
      missingInSnapshot.forEach(c => summary.push(`+ column: ${table}.${c}`));
      diffResults.push({
        table,
        type: "MISSING_IN_SNAPSHOT",
        columns: missingInSnapshot.join(", "),
        instruction: "Update snapshot to include new columns"
      });
    }
    if (extraInSnapshot.length > 0) {
      extraInSnapshot.forEach(c => summary.push(`- column: ${table}.${c}`));
      diffResults.push({
        table,
        type: "EXTRA_IN_SNAPSHOT",
        columns: extraInSnapshot.join(", "),
        instruction: "Update snapshot to remove deleted columns"
      });
    }
  }
}

// Check for missing migration files
if (lastSnapshotMigration !== lastActualMigration) {
  hasDiff = true;
}

const duration = ((Date.now() - startTime) / 1000).toFixed(1);

if (hasDiff) {
  console.error(`\n✗ SCHEMA SNAPSHOT OUTDATED! (${duration}s)`);

  // Find missing migrations
  const startIndex = lastSnapshotMigration ? migrations.indexOf(lastSnapshotMigration) + 1 : 0;
  const missingMigrations = migrations.slice(startIndex);

  if (missingMigrations.length > 0) {
    console.error(`\nMigrations faltantes:`);
    missingMigrations.forEach(m => console.error(`- ${m}`));
    console.error(`\nÚltimo aplicado: ${lastSnapshotMigration || "Nenhum"}`);
    console.error(`Último disponível: ${lastActualMigration}`);
  }

  if (summary.length > 0) {
    console.log("\nSummary:");
    summary.forEach(line => console.log(line));
  }

  if (diffResults.length > 0) {
    console.table(diffResults);
  }

  // Generate diff artifact
  const diffFile = path.join(projectRoot, "schema.diff");
  const diffContent = {
    timestamp: new Date().toISOString(),
    status: "OUTDATED",
    duration: `${duration}s`,
    lastSnapshotMigration,
    lastActualMigration,
    missingMigrations,
    summary,
    diffResults,
    message: isOutdated ? "Snapshot desatualizado." : "Deterministic mismatch detected."
  };
  
  fs.writeFileSync(diffFile, JSON.stringify(diffContent, null, 2));
  console.log(`\nArtifact generated: ${diffFile}`);

  // Auto-update logic (ONLY DEV)
  if (IS_DEV && !IS_CI && !process.env.SKIP_AUTO_UPDATE) {
    console.log("\nAmbiente local detectado. Executando auto-update...");
    try {
      execSync("pnpm schema:update", { stdio: "inherit" });
      console.log("✓ Snapshot atualizado automaticamente.");
      process.exit(0);
    } catch (error) {
      console.error("Erro ao atualizar snapshot:", error.message);
      process.exit(1);
    }
  }

  // NO CI: FAIL HARD
  if (IS_CI) {
    console.error("\n[CI FAIL] Build bloqueado: schema inválido.");
    console.error("Não é permitido atualizar o snapshot no CI.");
    console.error("Execute 'pnpm schema:update' localmente e realize o commit do arquivo 'schema-snapshot.json'.");
    process.exit(1);
  }

  console.error("\nBuild bloqueado: schema inválido.");
  console.error("Migrations faltantes detectadas.");
  console.error("Execute:");
  console.error("pnpm schema:update\n");
  process.exit(1);
} else {
  console.log(`✓ Schema snapshot is up to date. (${duration}s)`);
  // Clean up diff file if it exists and we are now clean
  const diffFile = path.join(projectRoot, "schema.diff");
  if (fs.existsSync(diffFile)) fs.unlinkSync(diffFile);
  process.exit(0);
}
