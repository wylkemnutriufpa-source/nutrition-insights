#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import { generateSnapshotData } from "./generate-schema-snapshot.mjs";

const startTime = Date.now();
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const snapshotPath = path.join(projectRoot, "src", "integrations", "supabase", "schema-snapshot.json");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const cachePath = path.join(projectRoot, "node_modules", ".schema-cache.json");

// Performance Meta: < 2s
// Strategy: Migration hash cache
function getMigrationsHash(migrations) {
  const hasher = crypto.createHash('sha256');
  migrations.forEach(m => hasher.update(m));
  return hasher.digest('hex');
}

// Check environments
const IS_CI = !!process.env.CI || !!process.env.GITHUB_ACTIONS || !!process.env.VERCEL;
const IS_DEV = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

console.log("Checking schema snapshot consistency...");

if (!fs.existsSync(snapshotPath)) {
  console.error("✗ Snapshot file missing!");
  process.exit(1);
}

const migrations = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith(".sql"))
  .sort();

const migrationsHash = getMigrationsHash(migrations);

// Read Cache
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  } catch (e) {}
}

// Quick Path: If hash matches and we are in dev, skip heavy lifting
if (cache.hash === migrationsHash && IS_DEV && !process.env.FORCE_VERIFY && !IS_CI) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✓ Schema snapshot matches cache. (${duration}s)`);
  process.exit(0);
}

const currentRaw = fs.readFileSync(snapshotPath, "utf8");
const current = JSON.parse(currentRaw.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, ""));
const fresh = generateSnapshotData();

const lastSnapshotMigration = current.lastMigration;
const lastActualMigration = migrations[migrations.length - 1];
const isOutdated = lastSnapshotMigration !== lastActualMigration;

let hasDiff = false;
const diffResults = [];
const summaryTables = { added: [], removed: [] };
const summaryColumns = { added: [], removed: [], changed: [] };

// Compare tables and columns
const allTables = new Set([...Object.keys(current.tables || {}), ...Object.keys(fresh.tables || {})]);

for (const table of allTables) {
  const currentCols = current.tables?.[table] || [];
  const freshCols = fresh.tables?.[table] || [];
  
  if (!current.tables?.[table] && fresh.tables?.[table]) {
    summaryTables.added.push(table);
  } else if (current.tables?.[table] && !fresh.tables?.[table]) {
    summaryTables.removed.push(table);
  }

  const missingInSnapshot = freshCols.filter(c => !currentCols.includes(c));
  const extraInSnapshot = currentCols.filter(c => !freshCols.includes(c));

  if (missingInSnapshot.length > 0 || extraInSnapshot.length > 0) {
    hasDiff = true;
    missingInSnapshot.forEach(c => summaryColumns.added.push(`${table}.${c}`));
    extraInSnapshot.forEach(c => summaryColumns.removed.push(`${table}.${c}`));
    
    if (missingInSnapshot.length > 0) {
      diffResults.push({ table, type: "MISSING_IN_SNAPSHOT", columns: missingInSnapshot.join(", ") });
    }
    if (extraInSnapshot.length > 0) {
      diffResults.push({ table, type: "EXTRA_IN_SNAPSHOT", columns: extraInSnapshot.join(", ") });
    }
  }
}

if (lastSnapshotMigration !== lastActualMigration) hasDiff = true;

const duration = ((Date.now() - startTime) / 1000).toFixed(1);

if (hasDiff) {
  console.error(`\n🚫 Schema verify failed (${duration}s)`);

  const startIndex = lastSnapshotMigration ? migrations.indexOf(lastSnapshotMigration) + 1 : 0;
  const missingMigrations = migrations.slice(startIndex);

  // Readable Summary
  let summaryText = "Summary:\n";
  if (summaryTables.added.length > 0 || summaryTables.removed.length > 0) {
    summaryText += "Tables:\n";
    summaryTables.added.forEach(t => summaryText += `+ ${t}\n`);
    summaryTables.removed.forEach(t => summaryText += `- ${t}\n`);
    summaryText += "\n";
  }
  if (summaryColumns.added.length > 0 || summaryColumns.removed.length > 0) {
    summaryText += "Columns:\n";
    summaryColumns.added.forEach(c => summaryText += `+ ${c}\n`);
    summaryColumns.removed.forEach(c => summaryText += `- ${c}\n`);
    summaryText += "\n";
  }

  console.log("\n" + summaryText);

  if (missingMigrations.length > 0) {
    console.log("Missing Migrations:");
    missingMigrations.forEach(m => console.log(`- ${m}`));
  }

  const diffFile = path.join(projectRoot, "schema.diff");
  const diffContent = {
    summary: summaryText.trim(),
    details: {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      lastSnapshotMigration,
      lastActualMigration,
      missingMigrations,
      diffResults
    }
  };
  
  fs.writeFileSync(diffFile, JSON.stringify(diffContent, null, 2));
  console.log(`\nArtifact generated: ${diffFile}`);

  if (IS_DEV && !IS_CI && !process.env.SKIP_AUTO_UPDATE) {
    console.log("\nAmbiente local detectado. Executando auto-update...");
    try {
      execSync("bun run schema:update", { stdio: "inherit" });
      const newMigrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
      fs.writeFileSync(cachePath, JSON.stringify({ hash: getMigrationsHash(newMigrations) }));
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  }

  console.error("\n🚫 Build bloqueado: schema inválido");
  console.error("Execute:\npnpm schema:update\n");
  process.exit(1);
} else {
  console.log(`✓ Schema snapshot is up to date. (${duration}s)`);
  fs.writeFileSync(cachePath, JSON.stringify({ hash: migrationsHash }));
  const diffFile = path.join(projectRoot, "schema.diff");
  if (fs.existsSync(diffFile)) fs.unlinkSync(diffFile);
  process.exit(0);
}
