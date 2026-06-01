/**
 * Migração FJ1.0 → FJ2.0 (pacientes)
 *
 * Script LOCAL. Lê do FJ1.0 (origem), grava no FJ2.0 (destino), via service_role.
 * NUNCA rodar como edge function. NUNCA commitar .env.
 *
 * Uso:
 *   cp .env.example .env  (e preencher)
 *   bun run scripts/migrate-to-fj2/migrate-patients.ts            # dryRun
 *   DRY_RUN=false bun run scripts/migrate-to-fj2/migrate-patients.ts
 *
 * Contrato aprovado entre FJ1.0 e FJ2.0:
 *   - Magic-link recovery (sem senha fixa)
 *   - app_metadata.needs_password_change (write-only via service_role)
 *   - Mapeamento de nutricionista por email — falha-duro se ausente
 *   - source_legacy_id UNIQUE para idempotência
 *   - patient_consents.consent_type='legacy_migration_v1', consent_version='fj1.0'
 *   - Colisão de email no destino: pula + loga
 *   - created_at preservado
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// .env é carregado via flag `bun --env-file=scripts/migrate-to-fj2/.env`
// (ver README). Não usamos dotenv pra evitar nova dependência.

// ============================================================
// CONFIG
// ============================================================
const SOURCE_URL = mustEnv("SOURCE_SUPABASE_URL");
const SOURCE_KEY = mustEnv("SOURCE_SERVICE_ROLE_KEY");
const DEST_URL = mustEnv("DEST_SUPABASE_URL");
const DEST_KEY = mustEnv("DEST_SERVICE_ROLE_KEY");
const DRY_RUN = (process.env.DRY_RUN ?? "true").toLowerCase() !== "false";
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 10);

const CONSENT_TYPE = "legacy_migration_v1";
const CONSENT_VERSION = "fj1.0";
const SCRIPT_TAG = "migration-script-v1";

const SCRIPT_DIR = new URL(".", import.meta.url).pathname;
const OUT_DIR = join(SCRIPT_DIR, "output");
const TS = new Date().toISOString().replace(/[:.]/g, "-");

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

// ============================================================
// TYPES
// ============================================================
type SourceNutri = { user_id: string; full_name: string | null; email: string };
type DestNutri = { id: string; auth_user_id: string; email: string };

type SourcePatient = {
  user_id: string;
  full_name: string | null;
  email: string;
  profile_created_at: string;
  nutritionist_user_id: string | null;
  nutritionist_email: string | null;
};

type MigrationOutcome =
  | { status: "ready"; patient: SourcePatient; destNutritionistId: string }
  | { status: "skip_already_migrated"; patient: SourcePatient }
  | { status: "skip_email_collision"; patient: SourcePatient; destAuthUserId: string }
  | { status: "block_no_nutritionist"; patient: SourcePatient }
  | { status: "block_orphan_no_link"; patient: SourcePatient }
  | { status: "block_no_email"; patient: SourcePatient };

// ============================================================
// HELPERS
// ============================================================
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function listAllAuthUsers(client: SupabaseClient): Promise<Map<string, string>> {
  // returns Map<user_id, email>
  const out = new Map<string, string>();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers page ${page}: ${error.message}`);
    for (const u of data.users) {
      if (u.email) out.set(u.id, u.email.toLowerCase());
    }
    if (data.users.length < perPage) break;
    page++;
  }
  return out;
}

// ============================================================
// SOURCE READERS (FJ1.0)
// ============================================================
async function readSourceNutritionists(
  src: SupabaseClient,
  emailById: Map<string, string>,
): Promise<SourceNutri[]> {
  const { data: roles, error } = await src
    .from("user_roles")
    .select("user_id")
    .eq("role", "nutritionist");
  if (error) throw new Error(`source nutri roles: ${error.message}`);

  const ids = roles!.map((r) => r.user_id);
  const { data: profiles, error: pErr } = await src
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", ids);
  if (pErr) throw new Error(`source nutri profiles: ${pErr.message}`);

  const byId = new Map(profiles!.map((p) => [p.user_id, p.full_name]));
  const out: SourceNutri[] = [];
  for (const id of ids) {
    const email = emailById.get(id);
    if (!email) {
      console.warn(`  ⚠ nutri ${id} sem email em auth.users — ignorado`);
      continue;
    }
    out.push({ user_id: id, full_name: byId.get(id) ?? null, email });
  }
  return out;
}

async function readSourcePatients(
  src: SupabaseClient,
  emailById: Map<string, string>,
): Promise<SourcePatient[]> {
  const { data: roles, error } = await src
    .from("user_roles")
    .select("user_id")
    .eq("role", "patient");
  if (error) throw new Error(`source patient roles: ${error.message}`);
  const ids = roles!.map((r) => r.user_id);

  const { data: profiles, error: pErr } = await src
    .from("profiles")
    .select("user_id, full_name, created_at")
    .in("user_id", ids);
  if (pErr) throw new Error(`source patient profiles: ${pErr.message}`);
  const profById = new Map(profiles!.map((p) => [p.user_id, p]));

  const { data: links, error: lErr } = await src
    .from("nutritionist_patients")
    .select("patient_id, nutritionist_id, status, created_at")
    .in("patient_id", ids)
    .eq("status", "active");
  if (lErr) throw new Error(`source links: ${lErr.message}`);

  // Se houver múltiplos vínculos ativos para o mesmo paciente, pega o mais recente.
  const linkByPatient = new Map<string, string>();
  for (const l of links!.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )) {
    if (!linkByPatient.has(l.patient_id)) {
      linkByPatient.set(l.patient_id, l.nutritionist_id);
    }
  }

  const out: SourcePatient[] = [];
  for (const id of ids) {
    const prof = profById.get(id);
    const email = emailById.get(id);
    const nutritionistUserId = linkByPatient.get(id) ?? null;
    const nutritionistEmail = nutritionistUserId
      ? emailById.get(nutritionistUserId) ?? null
      : null;
    out.push({
      user_id: id,
      full_name: prof?.full_name ?? null,
      email: email ?? "",
      profile_created_at: prof?.created_at ?? new Date().toISOString(),
      nutritionist_user_id: nutritionistUserId,
      nutritionist_email: nutritionistEmail,
    });
  }
  return out;
}

// ============================================================
// DEST READERS (FJ2.0)
// ============================================================
async function readDestNutritionists(
  dest: SupabaseClient,
  emailById: Map<string, string>,
): Promise<DestNutri[]> {
  // patient_consents lives in destination; nutritionists too
  const { data, error } = await dest
    .from("nutritionists")
    .select("id, auth_user_id");
  if (error) throw new Error(`dest nutritionists: ${error.message}`);
  const out: DestNutri[] = [];
  for (const n of data!) {
    const email = emailById.get(n.auth_user_id);
    if (!email) continue;
    out.push({ id: n.id, auth_user_id: n.auth_user_id, email });
  }
  return out;
}

async function readAlreadyMigratedLegacyIds(dest: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await dest
    .from("patients")
    .select("source_legacy_id")
    .not("source_legacy_id", "is", null);
  if (error) throw new Error(`dest already-migrated: ${error.message}`);
  return new Set(data!.map((r) => r.source_legacy_id as string));
}

// ============================================================
// CLASSIFICATION
// ============================================================
function classify(
  patients: SourcePatient[],
  destNutriByEmail: Map<string, DestNutri>,
  destEmailToAuthId: Map<string, string>,
  alreadyMigrated: Set<string>,
): MigrationOutcome[] {
  return patients.map<MigrationOutcome>((p) => {
    if (!p.email) return { status: "block_no_email", patient: p };
    if (alreadyMigrated.has(p.user_id))
      return { status: "skip_already_migrated", patient: p };

    const destAuth = destEmailToAuthId.get(p.email.toLowerCase());
    if (destAuth)
      return { status: "skip_email_collision", patient: p, destAuthUserId: destAuth };

    if (!p.nutritionist_user_id || !p.nutritionist_email)
      return { status: "block_orphan_no_link", patient: p };

    const destNutri = destNutriByEmail.get(p.nutritionist_email.toLowerCase());
    if (!destNutri) return { status: "block_no_nutritionist", patient: p };

    return { status: "ready", patient: p, destNutritionistId: destNutri.id };
  });
}

// ============================================================
// EXECUTION (real run)
// ============================================================
async function migrateOne(
  dest: SupabaseClient,
  o: Extract<MigrationOutcome, { status: "ready" }>,
): Promise<{ ok: true; recovery_link: string | null } | { ok: false; error: string }> {
  const { patient, destNutritionistId } = o;
  const now = new Date().toISOString();

  // 1. Cria auth.users no destino (senha aleatória 32 chars descartada)
  const throwawayPassword = randomUUID() + randomUUID();
  const { data: created, error: createErr } = await dest.auth.admin.createUser({
    email: patient.email,
    password: throwawayPassword,
    email_confirm: true,
    app_metadata: {
      needs_password_change: true,
      migrated_from: "fj1",
      migrated_at: now,
      source_legacy_id: patient.user_id,
    },
  });
  if (createErr || !created.user) return { ok: false, error: `createUser: ${createErr?.message}` };

  const newAuthId = created.user.id;

  // 2. Insere patients
  const { data: pat, error: pErr } = await dest
    .from("patients")
    .insert({
      auth_user_id: newAuthId,
      nutritionist_id: destNutritionistId,
      full_name: patient.full_name ?? patient.email,
      email: patient.email,
      created_at: patient.profile_created_at,
      source_legacy_id: patient.user_id,
    })
    .select("id")
    .single();
  if (pErr || !pat) {
    // Cleanup auth.user pra não deixar órfão
    await dest.auth.admin.deleteUser(newAuthId).catch(() => {});
    return { ok: false, error: `patients insert: ${pErr?.message}` };
  }

  // 3. Insere patient_consents
  const { error: cErr } = await dest.from("patient_consents").insert({
    patient_id: pat.id,
    consent_type: CONSENT_TYPE,
    consent_version: CONSENT_VERSION,
    accepted_at: patient.profile_created_at,
    user_agent: SCRIPT_TAG,
    ip_address: null,
  });
  if (cErr) {
    // Não rollback. patient_consents é auditável separadamente — registra falha e segue.
    console.warn(`  ⚠ consent insert falhou para ${patient.email}: ${cErr.message}`);
  }

  // 4. Gera recovery link (paciente clica e define a própria senha)
  const { data: link, error: linkErr } = await dest.auth.admin.generateLink({
    type: "recovery",
    email: patient.email,
  });
  if (linkErr || !link.properties?.action_link) {
    return { ok: true, recovery_link: null };
  }
  return { ok: true, recovery_link: link.properties.action_link };
}

// ============================================================
// REPORTING
// ============================================================
function summarize(outcomes: MigrationOutcome[]) {
  const groups: Record<string, number> = {};
  for (const o of outcomes) groups[o.status] = (groups[o.status] ?? 0) + 1;

  const ready = outcomes.filter((o) => o.status === "ready");
  const byNutri: Record<string, number> = {};
  for (const o of ready) {
    if (o.status !== "ready") continue;
    const key = o.patient.nutritionist_email ?? "(sem)";
    byNutri[key] = (byNutri[key] ?? 0) + 1;
  }

  const blockedByMissingNutri = outcomes
    .filter((o) => o.status === "block_no_nutritionist")
    .map((o) => ({
      patient_email: o.patient.email,
      patient_legacy_id: o.patient.user_id,
      nutritionist_email_missing: o.patient.nutritionist_email,
    }));

  const collisions = outcomes
    .filter((o) => o.status === "skip_email_collision")
    .map((o) => ({
      patient_email: o.patient.email,
      patient_legacy_id: o.patient.user_id,
    }));

  const orphans = outcomes
    .filter((o) => o.status === "block_orphan_no_link")
    .map((o) => ({ patient_email: o.patient.email, patient_legacy_id: o.patient.user_id }));

  return { groups, byNutri, blockedByMissingNutri, collisions, orphans };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`FJ1.0 → FJ2.0  Patient Migration`);
  console.log(`  MODE: ${DRY_RUN ? "DRY RUN (no writes)" : "REAL RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  mkdirSync(OUT_DIR, { recursive: true });

  const src = createClient(SOURCE_URL, SOURCE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const dest = createClient(DEST_URL, DEST_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("→ Lendo auth.users de origem...");
  const sourceEmailById = await listAllAuthUsers(src);
  console.log(`  ${sourceEmailById.size} usuários em auth.users (FJ1.0)`);

  console.log("→ Lendo auth.users de destino...");
  const destEmailById = await listAllAuthUsers(dest);
  console.log(`  ${destEmailById.size} usuários em auth.users (FJ2.0)`);
  const destEmailToAuthId = new Map<string, string>();
  for (const [id, email] of destEmailById) destEmailToAuthId.set(email, id);

  console.log("→ Lendo nutricionistas FJ1.0...");
  const srcNutris = await readSourceNutritionists(src, sourceEmailById);
  console.log(`  ${srcNutris.length} nutris em FJ1.0`);

  console.log("→ Lendo nutricionistas FJ2.0...");
  const destNutris = await readDestNutritionists(dest, destEmailById);
  console.log(`  ${destNutris.length} nutris em FJ2.0`);
  const destNutriByEmail = new Map<string, DestNutri>();
  for (const n of destNutris) destNutriByEmail.set(n.email.toLowerCase(), n);

  console.log("→ Lendo pacientes FJ1.0...");
  const srcPatients = await readSourcePatients(src, sourceEmailById);
  console.log(`  ${srcPatients.length} pacientes em FJ1.0`);

  console.log("→ Lendo source_legacy_id já migrados em FJ2.0...");
  const alreadyMigrated = await readAlreadyMigratedLegacyIds(dest);
  console.log(`  ${alreadyMigrated.size} já migrados`);

  console.log("\n→ Classificando...");
  const outcomes = classify(srcPatients, destNutriByEmail, destEmailToAuthId, alreadyMigrated);
  const summary = summarize(outcomes);

  console.log("\n── RELATÓRIO ──────────────────────────────────────");
  console.log(JSON.stringify(summary.groups, null, 2));
  console.log("\nPor nutricionista (prontos pra migrar):");
  console.log(JSON.stringify(summary.byNutri, null, 2));

  if (summary.blockedByMissingNutri.length > 0) {
    console.log("\n⛔ NUTRIS AUSENTES NO DESTINO (bloqueio):");
    for (const b of summary.blockedByMissingNutri.slice(0, 10)) {
      console.log(`  - ${b.patient_email} → nutri: ${b.nutritionist_email_missing}`);
    }
    if (summary.blockedByMissingNutri.length > 10) {
      console.log(`  ... +${summary.blockedByMissingNutri.length - 10} mais`);
    }
  }

  if (summary.collisions.length > 0) {
    console.log(`\n⚠ COLISÕES DE EMAIL no FJ2.0 (skip): ${summary.collisions.length}`);
  }
  if (summary.orphans.length > 0) {
    console.log(`\n⚠ PACIENTES SEM VÍNCULO ATIVO (skip): ${summary.orphans.length}`);
  }

  const ready = outcomes.filter((o): o is Extract<MigrationOutcome, { status: "ready" }> => o.status === "ready");
  console.log(`\n→ Prontos pra migrar: ${ready.length}`);

  // Sempre grava o relatório de classificação
  const reportPath = join(OUT_DIR, `report-${TS}.json`);
  writeFileSync(reportPath, JSON.stringify({ summary, outcomes }, null, 2));
  console.log(`\n📄 Relatório: ${reportPath}`);

  if (DRY_RUN) {
    console.log("\n✅ DRY RUN completo. Nada foi escrito no destino.");
    console.log("   Para executar de verdade: DRY_RUN=false bun run scripts/migrate-to-fj2/migrate-patients.ts\n");
    return;
  }

  if (summary.blockedByMissingNutri.length > 0) {
    console.error("\n⛔ ABORTANDO: há nutris ausentes no destino. Crie-os primeiro.\n");
    process.exit(2);
  }

  // ── EXECUÇÃO REAL ─────────────────────────────────────────
  console.log(`\n→ Iniciando migração real (${ready.length} pacientes, batch=${BATCH_SIZE})...\n`);
  const recoveryRows: string[] = ["email,full_name,legacy_id,recovery_link"];
  const failures: { email: string; legacy_id: string; error: string }[] = [];
  let done = 0;

  for (const batch of chunk(ready, BATCH_SIZE)) {
    const results = await Promise.all(batch.map((o) => migrateOne(dest, o)));
    results.forEach((res, i) => {
      const o = batch[i];
      done++;
      if (!res.ok) {
        failures.push({ email: o.patient.email, legacy_id: o.patient.user_id, error: res.error });
        console.log(`  ${done}/${ready.length} ✗ ${o.patient.email}: ${res.error}`);
      } else {
        const link = (res.recovery_link ?? "").replace(/"/g, '""');
        const name = (o.patient.full_name ?? "").replace(/"/g, '""');
        recoveryRows.push(`"${o.patient.email}","${name}","${o.patient.user_id}","${link}"`);
        console.log(`  ${done}/${ready.length} ✓ ${o.patient.email}`);
      }
    });
  }

  const csvPath = join(OUT_DIR, `recovery-links-${TS}.csv`);
  writeFileSync(csvPath, recoveryRows.join("\n"));
  console.log(`\n📄 Recovery links: ${csvPath}`);

  if (failures.length > 0) {
    const failPath = join(OUT_DIR, `failures-${TS}.json`);
    writeFileSync(failPath, JSON.stringify(failures, null, 2));
    console.log(`📄 Falhas: ${failPath}`);
  }

  console.log(`\n✅ Concluído: ${ready.length - failures.length} sucesso, ${failures.length} falhas`);
  console.log(`\n⚠ PRÓXIMOS PASSOS OBRIGATÓRIOS:`);
  console.log(`   1. Importar o CSV em ferramenta de envio (Lovable Emails do FJ2.0 ou outro)`);
  console.log(`   2. Rodar supabase--rotate_api_keys nos dois projetos`);
  console.log(`   3. Apagar o .env local\n`);
}

main().catch((e) => {
  console.error("\n💥 FATAL:", e);
  process.exit(1);
});
