# Correção dos 6 Templates com Refeições Agrupadas

**Data:** 28 de Maio de 2026  
**Problema:** 6 templates têm refeições agrupadas  
**Solução:** Desagrupar em items individuais

---

## 📋 Passo 1: Identificar os 6 Templates

Execute a query:
```sql
IDENTIFICAR_TEMPLATES_AGRUPADOS.sql
```

Isso vai mostrar:
- ID do template
- Título
- Dia da semana
- Nome da refeição agrupada
- Quantos items tem

---

## 🔧 Passo 2: Desagrupar Manualmente

Para cada template agrupado:

### Exemplo: Template "Dieta 2000 kcal"

**Antes (ERRADO):**
```json
{
  "days": [
    {
      "day_of_week": "monday",
      "meals": [
        {
          "name": "Café com Leite com Pão com Ovo",
          "items": [
            {
              "name": "Café com Leite com Pão com Ovo",
              "kcal": 450,
              "quantity": 1,
              "unit": "porção"
            }
          ]
        }
      ]
    }
  ]
}
```

**Depois (CORRETO):**
```json
{
  "days": [
    {
      "day_of_week": "monday",
      "meals": [
        {
          "name": "Café da Manhã",
          "items": [
            {
              "name": "Café com Leite",
              "kcal": 150,
              "quantity": 1,
              "unit": "xícara",
              "portion_label": "1 xícara (200ml)",
              "imageUrl": "https://cdn.example.com/cafe-com-leite.jpg"
            },
            {
              "name": "Pão Integral",
              "kcal": 100,
              "quantity": 2,
              "unit": "fatia",
              "portion_label": "2 fatias (50g)",
              "imageUrl": "https://cdn.example.com/pao-integral.jpg"
            },
            {
              "name": "Ovo Cozido",
              "kcal": 80,
              "quantity": 1,
              "unit": "unidade",
              "portion_label": "1 ovo (50g)",
              "imageUrl": "https://cdn.example.com/ovo-cozido.jpg"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 📝 Passo 3: Usar Supabase Editor

1. Abrir Supabase Dashboard
2. Ir para SQL Editor
3. Executar query para ver o template completo:

```sql
SELECT 
  id,
  title,
  plan_snapshot
FROM v3_diet_templates
WHERE id = 'TEMPLATE_ID_AQUI'
LIMIT 1;
```

4. Copiar o JSON do `plan_snapshot`
5. Desagrupar localmente (em um editor de texto)
6. Atualizar o template:

```sql
UPDATE v3_diet_templates
SET plan_snapshot = '{"days": [...desagrupado...]}'::jsonb
WHERE id = 'TEMPLATE_ID_AQUI';
```

---

## ✅ Checklist de Correção

Para cada um dos 6 templates:

- [ ] Template 1: Identificado e desagrupado
- [ ] Template 2: Identificado e desagrupado
- [ ] Template 3: Identificado e desagrupado
- [ ] Template 4: Identificado e desagrupado
- [ ] Template 5: Identificado e desagrupado
- [ ] Template 6: Identificado e desagrupado

---

## 🔍 Validação Pós-Correção

Executar novamente:
```sql
DIAGNOSTICO_TEMPLATES_ESTRUTURA.sql
```

Esperado:
```
total_templates: 66
templates_com_menos_de_7_dias: 0
templates_sem_imagens: 0
templates_com_refeicoes_agrupadas: 0 ✅
```

---

## 📌 Notas Importantes

1. **Não deletar templates** — apenas desagrupar
2. **Manter IDs dos items** — para rastreabilidade
3. **Validar calorias** — soma dos items deve bater com total
4. **Testar no Lovable** — verificar se renderiza corretamente

---

**Status:** 🟡 AGUARDANDO EXECUÇÃO

Após desagrupar os 6 templates, todos os 66 templates estarão 100% corretos.
