import { supabase } from "./src/integrations/supabase/client";

async function testFlow() {
  console.log("--- ETAPA 1: TESTE REAL ---");
  const planId = "cc51e7bd-55b2-49d3-90ef-f9ac1de002e6"; // Plano da Cristiane
  const itemId = "983d7573-1e0d-4864-b6ca-fcd6ad7e2d30"; // Iogurte natural
  
  console.log("1. Editando 1 alimento (mudando título)");
  const payload = { title: "Lanche da Manhã - Diabetes (Testado)" };
  console.log("Payload enviado:", payload);
  
  const { data: updateData, error: updateErr } = await supabase
    .from("meal_plan_items")
    .update(payload)
    .eq("id", itemId)
    .select();
    
  console.log("Resposta do Supabase (Update):", updateErr ? `ERRO: ${updateErr.message}` : "SUCESSO");
  if (updateData) console.log("Dados retornados:", updateData);

  console.log("\n2. Testando DELETE");
  const { error: deleteErr } = await supabase
    .from("meal_plan_items")
    .delete()
    .eq("id", itemId)
    .eq("meal_plan_id", planId);

  console.log("Resposta do Supabase (Delete):", deleteErr ? `ERRO: ${deleteErr.message}` : "SUCESSO");

  console.log("\n--- ETAPA 2: VERIFICAÇÃO ---");
  const { data: finalItems } = await supabase
    .from("meal_plan_items")
    .select("id, title")
    .eq("meal_plan_id", planId);
  
  console.log("Itens no banco após operações:", finalItems?.length);
}

testFlow();
