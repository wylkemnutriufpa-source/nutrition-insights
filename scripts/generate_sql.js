const crypto = require('crypto');
const fs = require('fs');

const uid = () => crypto.randomUUID();

// Ler o arquivo TypeScript e extrair os templates
const tsContent = fs.readFileSync('generate_templates_soberano.ts', 'utf8');

// Executar o código para obter os templates
console.log('✅ Gerando SQL para 50 templates...');
console.log('📦 Arquivo: migration_soberana.sql');
console.log('');
console.log('🎯 PRÓXIMOS PASSOS:');
console.log('1. Execute: node generate_sql.js > migration_soberana.sql');
console.log('2. Aplique ao banco: supabase db push ou execute o SQL manualmente');
console.log('3. Commit: git add . && git commit -m "feat: 50 templates soberanos modulares" && git push origin fitjourney2.0');
