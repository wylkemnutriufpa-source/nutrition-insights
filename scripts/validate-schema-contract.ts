#!/usr/bin/env bun
import { supabase } from "../src/integrations/supabase/client";

/**
 * Script de validação de contrato Frontend <-> Banco de Dados.
 * Este script verifica se as colunas essenciais do "Caminho Soberano" existem no banco.
 */

const CRITICAL_COLUMNS = [
  { table: "meal_plan_items", column: "clinical_mass_g" },
  { table: "meal_plans", column: "is_active" },
  { table: "meal_plans", column: "plan_mode" },
  { table: "profiles", column: "role" }
];

const CRITICAL_FUNCTIONS = [
  "publish_meal_plan_v3",
  "get_active_meal_plan"
];

async function validate() {
  console.log("🚀 Iniciando Validação de Contrato de Dados...");
  let errors = 0;

  for (const item of CRITICAL_COLUMNS) {
    const { data, error } = await supabase.rpc('get_column_exists', { 
      p_table: item.table, 
      p_column: item.column 
    });

    if (error || !data) {
      console.error(`❌ ERRO: Coluna crítica ausente: ${item.table}.${item.column}`);
      errors++;
    } else {
      console.log(`✅ OK: ${item.table}.${item.column} detectada.`);
    }
  }

  for (const fn of CRITICAL_FUNCTIONS) {
    const { data, error } = await supabase.rpc('check_function_exists', { p_name: fn });
    if (error || !data) {
      console.error(`❌ ERRO: RPC crítica ausente: ${fn}`);
      errors++;
    } else {
      console.log(`✅ OK: RPC ${fn} detectada.`);
    }
  }

  if (errors > 0) {
    console.error(`\n🚨 Falha na validação: ${errors} divergências encontradas.`);
    process.exit(1);
  } else {
    console.log("\n✨ Todos os contratos de dados estão íntegros.");
    process.exit(0);
  }
}

validate().catch(err => {
  console.error(err);
  process.exit(1);
});
