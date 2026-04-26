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
  console.error("\nRun 'npm run schema:update' to update the snapshot.\n");
  process.exit(1);
} else {
  console.log("✓ Schema snapshot is up to date.");
  process.exit(0);
}
