
import { seedPremiumV3Templates } from '../lib/seedV3Templates';

async function main() {
  console.log('Starting manual seed of 14 Premium V3 templates...');
  const success = await seedPremiumV3Templates();
  if (success) {
    console.log('✅ Templates Premium V3 injetados com sucesso!');
  } else {
    console.log('❌ Falha ao injetar templates.');
    process.exit(1);
  }
}

main();
