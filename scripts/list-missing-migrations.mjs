#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const snapshotPath = path.join(projectRoot, "src", "integrations", "supabase", "schema-snapshot.json");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");

if (!fs.existsSync(snapshotPath)) {
  console.error("✗ Snapshot missing!");
  process.exit(1);
}

const current = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const lastSnapshotMigration = current.lastMigration;

const migrations = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith(".sql"))
  .sort();

const startIndex = lastSnapshotMigration ? migrations.indexOf(lastSnapshotMigration) + 1 : 0;
const missing = migrations.slice(startIndex);

if (missing.length > 0) {
  console.log("\nMigrations faltantes:");
  missing.forEach(m => console.log(`- ${m}`));
  console.log(`\nÚltimo aplicado: ${lastSnapshotMigration || "Nenhum"}`);
  console.log(`Último disponível: ${migrations[migrations.length - 1]}`);
  console.log("\nExecute:\npnpm schema:update");
  process.exit(1);
} else {
  console.log("✓ Nenhuma migration faltante.");
  process.exit(0);
}
