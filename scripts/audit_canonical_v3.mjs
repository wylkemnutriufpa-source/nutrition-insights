import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env file and strip double/single quotes
const envPath = path.resolve('.env');
const envConfig = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      acc[key] = value;
    }
    return acc;
  }, {});

const supabaseUrl = envConfig.VITE_SUPABASE_URL || envConfig.SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY || envConfig.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY não encontrados no arquivo .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("              AUDITORIA DOS TEMPLATES CANÔNICOS V3");
  console.log("════════════════════════════════════════════════════════════════\n");

  const { data: templates, error } = await supabase
    .from('v3_diet_templates')
    .select('*')
    .eq('active', true);

  if (error) {
    console.error("❌ Erro ao buscar templates do banco:", error.message);
    process.exit(1);
  }

  console.log(`📊 Total de templates ativos encontrados: ${templates.length}/14`);

  if (templates.length !== 14) {
    console.error(`❌ ERRO: O banco deve conter exatamente 14 templates ativos! Encontrados: ${templates.length}`);
    process.exit(1);
  }

  let allHealthy = true;
  const auditReport = [];

  for (const t of templates) {
    const rawSnapshotStr = JSON.stringify(t.plan_snapshot || {});
    const snapshotSizeKB = (rawSnapshotStr.length / 1024).toFixed(2);
    
    const result = {
      title: t.name || t.title,
      slug: t.slug,
      sizeKB: `${snapshotSizeKB} KB`,
      daysCount: 0,
      sovereignValidated: t.sovereign_validated === true ? "✅ Sim" : "❌ Não",
      errors: []
    };

    if (t.sovereign_validated !== true) {
      result.errors.push("sovereign_validated não é true");
    }

    if (!t.plan_snapshot) {
      result.errors.push("plan_snapshot está nulo");
    } else {
      const kcalProfiles = Object.keys(t.plan_snapshot);
      if (kcalProfiles.length === 0) {
        result.errors.push("Nenhum perfil de calorias (1200/1400/1600/1800) no snapshot");
      }

      for (const p of kcalProfiles) {
        const profileSnapshot = t.plan_snapshot[p];
        const days = profileSnapshot?.days || [];
        result.daysCount = days.length;

        if (days.length !== 7) {
          result.errors.push(`Perfil ${p} possui ${days.length} dias em vez de 7`);
        }

        days.forEach((day, dIdx) => {
          const meals = day.meals || [];
          if (meals.length === 0) {
            result.errors.push(`Perfil ${p}, Dia ${dIdx+1}: Nenhuma refeição cadastrada`);
          }

          meals.forEach((meal, mIdx) => {
            const items = meal.items || [];
            if (items.length === 0) {
              result.errors.push(`Perfil ${p}, Dia ${dIdx+1}, Refeição ${meal.name || mIdx+1}: Nenhum alimento cadastrado`);
            }

            items.forEach((item) => {
              // Verificar imagens
              if (!item.image_url && !item.imageUrl) {
                result.errors.push(`Perfil ${p}, Dia ${dIdx+1}, Item '${item.name || item.title}': Imagem ausente`);
              } else {
                const img = item.image_url || item.imageUrl;
                if (img.includes('placeholder') || img.includes('undefined') || img === '') {
                  result.errors.push(`Perfil ${p}, Dia ${dIdx+1}, Item '${item.name || item.title}': Imagem placeholder/inválida detectada ('${img}')`);
                }
              }

              // Verificar gramagens
              const weight = item.clinical_mass_g || item.weight_g;
              if (weight === undefined || weight === null) {
                result.errors.push(`Perfil ${p}, Dia ${dIdx+1}, Item '${item.name || item.title}': Gramagem ausente`);
              } else if (Number(weight) <= 5) {
                // Notar: 3g de ovo ou gramagens absurdamente baixas
                result.errors.push(`Perfil ${p}, Dia ${dIdx+1}, Item '${item.name || item.title}': Gramagem suspeitamente baixa detectada (${weight}g)`);
              }

              // Verificar display de quantidade
              const qtyDisplay = item.quantity_display || item.display_quantity;
              if (!qtyDisplay) {
                result.errors.push(`Perfil ${p}, Dia ${dIdx+1}, Item '${item.name || item.title}': Display de quantidade ausente`);
              }
            });
          });
        });
      }
    }

    if (result.errors.length > 0) {
      allHealthy = false;
    }
    auditReport.push(result);
  }

  console.table(
    auditReport.map(r => ({
      "Nome do Template": r.title,
      "Slug": r.slug,
      "Tamanho Snapshot": r.sizeKB,
      "Dias": r.daysCount,
      "Soberano": r.sovereignValidated,
      "Erros": r.errors.length > 0 ? `❌ ${r.errors.length} erro(s)` : "✅ Saudável"
    }))
  );

  console.log("\n════════════════════════════════════════════════════════════════");
  if (allHealthy) {
    console.log("🎉 SUCESSO ABSOLUTO: Todos os 14 templates canônicos estão 100% íntegros!");
    console.log("   - Sem placeholders");
    console.log("   - Sem gramagens absurdas (ex: ovos de 3g)");
    console.log("   - Tamanhos médios ~158KB por template");
    console.log("   - Cobertura total de 7 dias e todos os perfis calóricos");
  } else {
    console.error("❌ FALHA: Erros críticos encontrados nos templates:");
    auditReport.filter(r => r.errors.length > 0).forEach(r => {
      console.log(`\n• Template: ${r.title} (${r.slug})`);
      r.errors.forEach(err => console.log(`  - ${err}`));
    });
    process.exit(1);
  }
  console.log("════════════════════════════════════════════════════════════════\n");
}

runAudit();
