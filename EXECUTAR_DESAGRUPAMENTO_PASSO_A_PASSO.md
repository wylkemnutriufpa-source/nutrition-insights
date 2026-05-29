# Executar Desagrupamento dos 6 Templates — Passo a Passo

**Data:** 28 de Maio de 2026  
**Objetivo:** Desagrupar 6 templates com refeições agrupadas  
**Tempo Estimado:** 30-45 minutos

---

## 📋 Passo 1: Fazer Backup

Execute no Supabase SQL Editor:

```sql
-- Criar backup dos 6 templates
CREATE TABLE IF NOT EXISTS v3_diet_templates_backup_20260528 AS
SELECT * FROM v3_diet_templates
WHERE active = true
AND plan_snapshot::text LIKE '%com%';

-- Verificar backup
SELECT COUNT(*) as templates_backed_up FROM v3_diet_templates_backup_20260528;
```

**Esperado:** `templates_backed_up: 6`

---

## 📊 Passo 2: Extrair Dados dos 6 Templates

Execute:

```sql
EXTRAIR_6_TEMPLATES_PARA_ANALISE.sql
```

Isso vai mostrar:
- ID de cada template
- Título
- Estrutura JSON completa
- Quantos items estão agrupados

**Copie o resultado e salve em um arquivo para análise.**

---

## 🔍 Passo 3: Analisar Estrutura

Para cada template, você vai ver algo como:

```json
{
  "id": "template-123",
  "title": "Dieta 2000 kcal",
  "snapshot": {
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
}
```

**Problema:** Tudo está em 1 item. Precisa ser separado em 3 items.

---

## ✂️ Passo 4: Desagrupar Manualmente

Para cada template, você precisa:

1. **Identificar a refeição agrupada**
   - Ex: "Café com Leite com Pão com Ovo" com 450 kcal

2. **Separar em items individuais**
   - Café com Leite: 150 kcal
   - Pão Integral: 100 kcal
   - Ovo Cozido: 80 kcal
   - (Outros: 120 kcal se houver)

3. **Criar JSON desagrupado**

```json
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
```

---

## 💾 Passo 5: Atualizar Template no Banco

Para cada template, execute:

```sql
UPDATE v3_diet_templates
SET plan_snapshot = jsonb_set(
  plan_snapshot,
  '{days,0,meals,0}',  -- Ajustar índices conforme necessário
  jsonb_build_object(
    'name', 'Café da Manhã',
    'items', jsonb_build_array(
      jsonb_build_object(
        'name', 'Café com Leite',
        'kcal', 150,
        'quantity', 1,
        'unit', 'xícara',
        'portion_label', '1 xícara (200ml)',
        'imageUrl', 'https://cdn.example.com/cafe-com-leite.jpg'
      ),
      jsonb_build_object(
        'name', 'Pão Integral',
        'kcal', 100,
        'quantity', 2,
        'unit', 'fatia',
        'portion_label', '2 fatias (50g)',
        'imageUrl', 'https://cdn.example.com/pao-integral.jpg'
      ),
      jsonb_build_object(
        'name', 'Ovo Cozido',
        'kcal', 80,
        'quantity', 1,
        'unit', 'unidade',
        'portion_label', '1 ovo (50g)',
        'imageUrl', 'https://cdn.example.com/ovo-cozido.jpg'
      )
    )
  )
)
WHERE id = 'TEMPLATE_ID_AQUI';
```

**Importante:**
- Substituir `TEMPLATE_ID_AQUI` pelo ID real
- Ajustar `{days,0,meals,0}` se a refeição agrupada estiver em outro dia/refeição
- Ajustar calorias e items conforme o template

---

## 🔄 Passo 6: Repetir para os 6 Templates

Executar o UPDATE para cada um dos 6 templates identificados.

---

## ✅ Passo 7: Validar Resultado

Execute:

```sql
-- Verificar que não há mais refeições agrupadas
SELECT 
  COUNT(*) as total_templates,
  COUNT(CASE WHEN plan_snapshot::text LIKE '%com%' THEN 1 END) as templates_com_refeicoes_agrupadas
FROM v3_diet_templates
WHERE active = true;
```

**Esperado:**
```
total_templates: 66
templates_com_refeicoes_agrupadas: 0
```

---

## 🧪 Passo 8: Testar no Lovable

1. Abrir Lovable
2. Gerar plano para um paciente
3. Verificar que as refeições estão desagrupadas
4. Verificar que cada item tem sua própria caloria

---

## 🔙 Passo 9: Restaurar Backup (se necessário)

Se algo der errado:

```sql
-- Restaurar do backup
DELETE FROM v3_diet_templates
WHERE id IN (SELECT id FROM v3_diet_templates_backup_20260528);

INSERT INTO v3_diet_templates
SELECT * FROM v3_diet_templates_backup_20260528;
```

---

## 📝 Checklist

- [ ] Passo 1: Backup criado
- [ ] Passo 2: Dados extraídos
- [ ] Passo 3: Estrutura analisada
- [ ] Passo 4: JSON desagrupado criado
- [ ] Passo 5: Template 1 atualizado
- [ ] Passo 5: Template 2 atualizado
- [ ] Passo 5: Template 3 atualizado
- [ ] Passo 5: Template 4 atualizado
- [ ] Passo 5: Template 5 atualizado
- [ ] Passo 5: Template 6 atualizado
- [ ] Passo 7: Validação passou
- [ ] Passo 8: Testado no Lovable

---

## 🆘 Problemas Comuns

### Problema: "Índice fora do intervalo"
**Solução:** Ajustar `{days,0,meals,0}` para o índice correto

### Problema: "JSON inválido"
**Solução:** Verificar aspas e vírgulas no JSON

### Problema: "Calorias não batem"
**Solução:** Somar items e verificar que total = original

---

**Status:** 🟡 PRONTO PARA EXECUÇÃO

Após completar todos os passos, todos os 66 templates estarão 100% corretos.
