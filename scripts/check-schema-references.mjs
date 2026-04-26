#!/usr/bin/env node
/**
 * Schema reference checker
 * ----------------------------------------------------------------
 * Lê chamadas Supabase do tipo:
 *
 *     supabase.from("<table>").select("col1, col2, ...")
 *     .from('<table>').select('col1, col2(...) , relation!fk(field)')
 *
 * E valida que cada coluna referenciada existe em
 * `scripts/schema-snapshot.json`. Tabelas não listadas no snapshot
 * são silenciosamente ignoradas.
 *
 * Uso:
 *   node scripts/check-schema-references.mjs           # exit 1 se falhar
 *   node scripts/check-schema-references.mjs --json    # saída JSON
 *
 * Integração no build (opcional):
 *   "build": "node scripts/check-schema-references.mjs && vite build"
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const snapshotPath = path.join(projectRoot, "src", "integrations", "supabase", "schema-snapshot.json");

const RAW = fs.readFileSync(snapshotPath, "utf8");
const STRIPPED = RAW.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
const snapshot = JSON.parse(STRIPPED);
const TABLES = snapshot.tables ?? {};

const SRC_DIR = path.join(projectRoot, "src");
const IGNORED_DIRS = new Set([
  "integrations", // tipos auto-gerados
  "test",
  "tests",
  "__tests__",
]);
const IGNORED_FILE_PATTERNS = [/\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/, /__tests__/];

const TABLE_NAMES = new Set(Object.keys(TABLES));

/** Walk src tree and yield .ts/.tsx files. */
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
      continue;
    }
    const full = path.join(dir, entry.name);
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (IGNORED_FILE_PATTERNS.some((re) => re.test(full))) continue;
    yield full;
  }
}

/**
 * Find chained `.from("X").select("...")` calls. We allow optional whitespace,
 * intermediate awaits, and casts. The select string must be a string literal.
 */
const CHAIN_RE =
  /\.from\(\s*["'`]([a-zA-Z_][a-zA-Z0-9_]*)["'`]\s*\)[^;]*?\.select\(\s*(["'`])([^"'`]+)\2/g;

/**
 * Parse a select string into top-level column tokens.
 * Strategy:
 *   1. Tokenize by top-level commas (respecting parens depth).
 *   2. Drop tokens that are relation joins:
 *        - foo(...)              → embedded relation
 *        - foo!fkey(...)         → embedded relation with fk hint
 *        - foo!fkey              → relation reference w/o subselect
 *      Detect by presence of "(" or "!" anywhere in the token.
 *   3. For remaining tokens, strip "alias:" prefix and validate as identifier.
 */
function extractColumns(selectStr) {
  // 1. Tokenize at depth 0
  const tokens = [];
  let depth = 0;
  let buf = "";
  for (const ch of selectStr) {
    if (ch === "(") { depth++; buf += ch; continue; }
    if (ch === ")") { depth = Math.max(0, depth - 1); buf += ch; continue; }
    if (ch === "," && depth === 0) {
      tokens.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) tokens.push(buf);

  return tokens
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !t.includes("(") && !t.includes("!")) // drop relation joins
    .map((t) => {
      const aliasIdx = t.indexOf(":");
      if (aliasIdx >= 0) t = t.slice(aliasIdx + 1).trim();
      return t;
    })
    .filter((t) => /^[a-zA-Z_][a-zA-Z0-9_]*$|^\*$/.test(t));
}

const violations = [];

for (const file of walk(SRC_DIR)) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  CHAIN_RE.lastIndex = 0;
  while ((match = CHAIN_RE.exec(content)) !== null) {
    const [, table, , selectStr] = match;
    if (!TABLE_NAMES.has(table)) continue;
    const known = new Set(TABLES[table]);
    const cols = extractColumns(selectStr);
    const missing = cols.filter((c) => c !== "*" && !known.has(c));
    if (missing.length > 0) {
      // Compute line number
      const lineNo = content.slice(0, match.index).split("\n").length;
      violations.push({
        file: path.relative(projectRoot, file),
        line: lineNo,
        table,
        select: selectStr,
        missing,
      });
    }
  }
}

const wantsJson = process.argv.includes("--json");

if (wantsJson) {
  console.log(JSON.stringify({ violations }, null, 2));
} else if (violations.length === 0) {
  console.log("✓ schema-check: nenhuma referência inválida encontrada.");
} else {
  console.error(
    `✗ schema-check: ${violations.length} referência(s) inválida(s) detectada(s):\n`,
  );
  for (const v of violations) {
    console.error(
      `  • ${v.file}:${v.line}  →  meal_plans-like table "${v.table}" não tem: ${v.missing.join(", ")}`,
    );
    console.error(`      select: ${v.select.slice(0, 120)}${v.select.length > 120 ? "…" : ""}`);
  }
  console.error(
    "\nAtualize scripts/schema-snapshot.json se a migração realmente removeu/renomeou as colunas\n" +
      "ou corrija o frontend para usar os nomes corretos.",
  );
}

process.exit(violations.length === 0 ? 0 : 1);
