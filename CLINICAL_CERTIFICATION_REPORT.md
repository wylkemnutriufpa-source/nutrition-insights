# CLINICAL_CERTIFICATION_REPORT — FitJourney V3
Data: 2026-05-14
Responsável: Lovable (auditoria operacional)

## VEREDITO

❌ **SISTEMA NÃO CERTIFICADO.**

Não vou produzir prints "validando" pacientes que não têm plano, nem prints
de planos que tecnicamente não pertencem a paciente nenhum. Isso seria
exatamente o tipo de relatório abstrato que você proibiu.

A causa raiz não está mais no motor de geração. Está na **camada de
identidade e persistência**: os planos publicados estão órfãos e os
pacientes nominais (Luciana, Débora, Catharina) não têm plano nenhum.

---

## 1. Pacientes solicitados — estado real

Query executada agora:

```sql
SELECT p.full_name, COUNT(mp.id) AS planos
FROM profiles p
LEFT JOIN meal_plans mp ON mp.patient_id = p.id
WHERE p.full_name ILIKE ANY(ARRAY['%luciana%','%débora%','%debora%','%catharina%'])
GROUP BY p.full_name;
```

| Paciente             | Planos no banco | Status certificação |
|----------------------|-----------------|---------------------|
| Luciana Figueiredo   | 0               | ❌ sem plano para validar |
| Débora Encarnação    | 0               | ❌ sem plano para validar |
| Catharina Martins    | 0               | ❌ sem plano para validar |

Não existe plano (rascunho, gerado, publicado ou arquivado) vinculado a
nenhum dos três `profiles.id`. Qualquer screenshot que eu entregasse aqui
seria fabricado.

---

## 2. Universo de planos — fotografia real

| Métrica | Valor |
|---|---|
| Total de `meal_plans` | 260 |
| `is_active = true` | 51 |
| `plan_status = 'published_to_patient'` | 65 |
| Publicados ativos | 51 |
| Publicados ativos cujo `patient_id` **NÃO existe em `profiles`** | **65 / 65 (100%)** |
| Publicados ativos com **>200 itens** (inflado/duplicado) | 4 |
| Publicados ativos com **<20 itens** (anêmicos) | 42 |

Tradução clínica:
- **100% dos planos publicados estão órfãos** do `profiles`. O JOIN com
  `profiles` que o app inteiro usa para mostrar nome, foto, anamnese,
  metas — retorna `NULL`. Por isso o app mostra cards quebrados.
- **42 de 51 planos ativos têm menos de 20 itens** num plano semanal.
  Um plano semanal saudável tem ~140 itens. Esses planos estão vazios
  ou com 1–2 dias preenchidos.
- **4 planos têm 332 a 487 itens.** Isso é duplicação acumulada do
  pipeline (re-geração somando em vez de substituir).

Top 5 planos publicados ativos:

| plan_id | patient_id | itens | tem profile? | tem auth.user? |
|---|---|---|---|---|
| d3f9ddc0… | 48a835ef… | **487** | ❌ | ✅ |
| 55815c46… | 2a57b312… | **480** | ❌ | ✅ |
| 0754c5f4… | 9db3070b… | **480** | ❌ | ✅ |
| 2407ac83… | 29a22b11… | **332** | ❌ | ✅ |
| 16647dc1… | 726d5a33… | 73    | ❌ | ✅ |

Os pacientes existem em `auth.users` mas **não em `public.profiles`**.
Isso viola o contrato de identidade do projeto.

---

## 3. Bugs encontrados (por prioridade)

### BUG-1 — Profiles órfãos (CRÍTICO, bloqueador)
- **Sintoma:** todo plano publicado mostra nome/foto vazios; isolamento
  multi-tenant via `profiles.nutritionist_id` falha porque a row não existe.
- **Root cause:** signup/import dos pacientes está criando `auth.users`
  sem o trigger `handle_new_user` populando `public.profiles`. Ou o
  trigger existe e foi desativado em alguma migração recente.
- **Correção:** ainda **não aplicada**. Requer:
  1. Auditar o trigger `on_auth_user_created` em `auth.users`.
  2. Backfill: criar `profiles` para os 65 pacientes órfãos com
     vínculo correto a `nutritionist_id`.
  3. Reativar (ou recriar) o trigger.

### BUG-2 — Planos inflados (CRÍTICO)
- **Sintoma:** 4 planos com 332–487 itens. Editor congela, PDF
  estoura, paciente vê o mesmo prato repetido N vezes.
- **Root cause provável:** `generate-meal-plan` faz `INSERT` em vez
  de `DELETE` + `INSERT` quando re-gera; cada clique no botão
  "Gerar tudo" empilhou itens.
- **Correção:** ainda **não aplicada**. Requer revisão da edge function
  `generate-meal-plan` para garantir limpeza idempotente e dedup por
  `(meal_plan_id, day_of_week, meal_type, food_id)`.

### BUG-3 — Planos anêmicos (ALTO)
- **Sintoma:** 42/51 planos ativos com <20 itens. Paciente abre o app
  e vê 1 dia preenchido, restante vazio.
- **Root cause provável:** geração interrompida por timeout ou erro
  silencioso no pool exhaustion engine; status promovido a "publicado"
  mesmo com pipeline incompleto.
- **Correção:** ainda **não aplicada**.

### BUG-4 — Pacientes nominais sem plano
- Luciana, Débora, Catharina existem como `profiles` mas nunca tiveram
  plano gerado/persistido. Provavelmente foram criadas como cobaias e
  os fluxos de teste anteriores nunca chegaram a `INSERT INTO meal_plans`.

---

## 4. O que NÃO foi feito (e por quê)

| Item pedido | Entregue? | Justificativa |
|---|---|---|
| Print Editor de Luciana/Débora/Catharina | ❌ | Pacientes não têm plano. Print mostraria tela vazia. |
| Print Patient App | ❌ | Mesmo motivo. |
| Print Modal aberto | ❌ | Mesmo motivo. |
| Print Weekly | ❌ | Mesmo motivo. |
| Print PDF | ❌ | Mesmo motivo. |

Para entregar prints reais preciso primeiro **resolver BUG-1 (profiles
órfãos)** e **BUG-3 (planos anêmicos)**. Sem isso, qualquer print é
encenação.

---

## 5. Próximo passo honesto

Eu não vou continuar empilhando "engines" e "resets". Proponho um
plano cirúrgico, na ordem:

1. **Diagnóstico do trigger `handle_new_user`** (15 min).
2. **Migração de backfill** dos 65 profiles órfãos (1 migração SQL).
3. **Hardening do `generate-meal-plan`** com `DELETE` antes de `INSERT`
   e `UNIQUE (meal_plan_id, day_of_week, meal_type, food_id, position)`.
4. **Re-gerar 1 plano de teste** para Luciana, do zero, e só então
   produzir os 5 prints exigidos por esta certificação.

Confirma essa ordem antes que eu mexa em qualquer linha de código?
