/**
 * Teste de CONCORRÊNCIA real contra o banco
 * ----------------------------------------------------------------
 * Usa Service Role Key para criar um plano single_day temporário,
 * dispara DUAS atualizações paralelas tentando inserir/atualizar
 * itens com day_of_week=1 e confirma que o trigger SQL
 * `tr_force_day_zero_on_single_day` zera o dia para 0 em ambos
 * os registros sem nenhuma race condition criar inconsistência.
 *
 * Roda com:
 *   bunx vitest run src/lib/singleDayConcurrency.test.ts
 *
 * Skipa automaticamente se SUPABASE_SERVICE_ROLE_KEY não estiver
 * disponível (não falha o pipeline em ambientes sem credencial).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const URL = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY;

const skip = !URL || !SERVICE_KEY;

const d = skip ? describe.skip : describe;

d("single_day · concorrência real (DB trigger)", () => {
  let admin: SupabaseClient;
  let planId: string | null = null;
  let nutritionistId: string | null = null;
  let patientId: string | null = null;
  let primaryId: string | null = null;

  beforeAll(async () => {
    admin = createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false } });

    // pega qualquer profissional + paciente reais para satisfazer FKs
    const { data: nut } = await admin
      .from("profiles")
      .select("user_id")
      .limit(1)
      .single();
    nutritionistId = nut?.user_id ?? null;

    const { data: pat } = await admin
      .from("profiles")
      .select("user_id")
      .neq("user_id", nutritionistId!)
      .limit(1)
      .single();
    patientId = pat?.user_id ?? null;

    if (!nutritionistId || !patientId) return;

    const { data: plan, error } = await admin
      .from("meal_plans")
      .insert({
        title: "TEST · single_day concurrency",
        nutritionist_id: nutritionistId,
        patient_id: patientId,
        plan_status: "draft",
        plan_mode: "single_day",
        is_active: false,
      })
      .select()
      .single();
    if (error) throw error;
    planId = plan.id;

    // cria primária em day=0
    const { data: prim, error: e2 } = await admin
      .from("meal_plan_items")
      .insert({
        meal_plan_id: planId,
        meal_type: "lunch",
        day_of_week: 0,
        is_primary: true,
        title: "Frango primário",
        calories_target: 300,
        protein_target: 35,
        carbs_target: 10,
        fat_target: 8,
      })
      .select()
      .single();
    if (e2) throw e2;
    primaryId = prim.id;
  });

  afterAll(async () => {
    if (planId && admin) {
      await admin.from("meal_plan_items").delete().eq("meal_plan_id", planId);
      await admin.from("meal_plans").delete().eq("id", planId);
    }
  });

  it("dois INSERTs simultâneos com day_of_week=1 ficam ambos em day=0", async () => {
    if (!planId) return;

    const insA = admin
      .from("meal_plan_items")
      .insert({
        meal_plan_id: planId,
        meal_type: "lunch",
        day_of_week: 1, // tenta dia 1 — trigger deve forçar 0
        is_primary: false,
        master_item_id: primaryId,
        substitution_group_id: primaryId,
        title: "Sub paralelo A",
        calories_target: 300,
        protein_target: 35,
        carbs_target: 10,
        fat_target: 8,
      })
      .select()
      .single();

    const insB = admin
      .from("meal_plan_items")
      .insert({
        meal_plan_id: planId,
        meal_type: "lunch",
        day_of_week: 1, // tenta dia 1
        is_primary: false,
        master_item_id: primaryId,
        substitution_group_id: primaryId,
        title: "Sub paralelo B",
        calories_target: 300,
        protein_target: 35,
        carbs_target: 10,
        fat_target: 8,
      })
      .select()
      .single();

    const [a, b] = await Promise.all([insA, insB]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    expect(a.data?.day_of_week).toBe(0);
    expect(b.data?.day_of_week).toBe(0);

    // validação global: nenhum item do plano em day≠0
    const { data: all } = await admin
      .from("meal_plan_items")
      .select("id, day_of_week")
      .eq("meal_plan_id", planId);
    expect(all?.every((i) => i.day_of_week === 0)).toBe(true);
  }, 30_000);

  it("dois UPDATEs simultâneos tentando setar day=1 são bloqueados pelo trigger", async () => {
    if (!planId || !primaryId) return;

    // cria duas substituições em day=0 primeiro
    const { data: subs, error } = await admin
      .from("meal_plan_items")
      .insert([
        {
          meal_plan_id: planId,
          meal_type: "lunch",
          day_of_week: 0,
          is_primary: false,
          master_item_id: primaryId,
          substitution_group_id: primaryId,
          title: "Sub U1",
          calories_target: 300,
          protein_target: 35,
          carbs_target: 10,
          fat_target: 8,
        },
        {
          meal_plan_id: planId,
          meal_type: "lunch",
          day_of_week: 0,
          is_primary: false,
          master_item_id: primaryId,
          substitution_group_id: primaryId,
          title: "Sub U2",
          calories_target: 300,
          protein_target: 35,
          carbs_target: 10,
          fat_target: 8,
        },
      ])
      .select();
    expect(error).toBeNull();
    expect(subs?.length).toBe(2);

    const [u1, u2] = subs!;
    const [r1, r2] = await Promise.all([
      admin.from("meal_plan_items").update({ day_of_week: 1 }).eq("id", u1.id).select().single(),
      admin.from("meal_plan_items").update({ day_of_week: 1 }).eq("id", u2.id).select().single(),
    ]);

    expect(r1.error).toBeNull();
    expect(r2.error).toBeNull();
    expect(r1.data?.day_of_week).toBe(0);
    expect(r2.data?.day_of_week).toBe(0);

    // validação global pós-corrida
    const { data: all } = await admin
      .from("meal_plan_items")
      .select("day_of_week")
      .eq("meal_plan_id", planId);
    expect(all?.every((i) => i.day_of_week === 0)).toBe(true);
  }, 30_000);

  it("validate_all_single_day_plans não reporta inconsistências para o plano de teste", async () => {
    if (!planId) return;
    const { data, error } = await admin.rpc("validate_all_single_day_plans");
    expect(error).toBeNull();
    const offending = (data || []).filter((r: any) => r.plan_id === planId);
    expect(offending).toHaveLength(0);
  });
});
