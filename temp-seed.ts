import { seedPremiumV3Templates } from "./src/lib/seedV3Templates.ts";

console.log("Iniciando limpeza e injeção de templates premium...");
seedPremiumV3Templates()
  .then(success => {
    if (success) {
      console.log("✅ Templates Premium atualizados e limpos com sucesso!");
    } else {
      console.log("❌ Erro ao atualizar templates.");
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error("💥 Erro fatal:", err);
    process.exit(1);
  });
