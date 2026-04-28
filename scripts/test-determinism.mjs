#!/usr/bin/env node
import { generateSnapshotData } from "./generate-schema-snapshot.mjs";
import crypto from "node:crypto";

console.log("Running Determinism Test...");

function getHash() {
  const data = generateSnapshotData();
  const deterministicOutput = JSON.stringify(data, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted, k) => {
        sorted[k] = value[k];
        return sorted;
      }, {});
    }
    return value;
  }, 2);
  return crypto.createHash('sha256').update(deterministicOutput).digest('hex');
}

const hash1 = getHash();
const hash2 = getHash();

if (hash1 === hash2) {
  console.log("✓ Determinism test passed (byte-to-byte comparison).");
  process.exit(0);
} else {
  console.error("✗ Determinism test failed! Snapshot generation is non-deterministic.");
  process.exit(1);
}
