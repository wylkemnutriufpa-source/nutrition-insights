# FITJOURNEY V3 — MAPEAMENTO FORENSE REAL

## 1. O MOTOR CLÍNICO (NutriCore V2)
O sistema foi "desintoxicado" de lógica procedural centralizada. O NutriCore V2 não é mais um "motor" que decide a dieta, mas sim um conjunto de utilitários matemáticos.

- **Onde reside**: `src/lib/nutricore_v2/`
- **O que faz**: 
  - `calculateItemMacros`: Cálculo determinístico de macros baseado em 100g.
  - `scaleItemToTarget`: Regra de três para ajustar gramagem de um alimento para atingir uma meta (kcal, proteína, etc).
  - `adjustSubstitutionsProportionally`: Mantém a proporção entre o alimento principal e suas substituições.
- **Dependências**: O **Editor V3** e o **Weekly** dependem exclusivamente desses helpers para garantir que, se o usuário mudar a gramagem ou a caloria, os macros se ajustem instantaneamente sem "inventar" dados.
- **Lógica Procedural**: O arquivo `nutrition-engine.ts` foi reduzido a um **stub (desativado)**. Não existe mais código tentando "montar" a dieta sozinho via heurísticas.

---

## 2. MAPEAMENTO DE ROTAS (STATUS REAL)

| Rota | Finalidade | Componente | Status Operacional |
| :--- | :--- | :--- | :--- |
| `/editor-v3` | Editor V3 Principal | `EditorV3Page` | **PARCIAL** (Funciona, mas com bugs de UX e falta de seletor de paciente) |
| `/editor-v3/:patientId` | Editor com paciente | `EditorV3Page` | **FUNCIONAL** |
| `/library` | Biblioteca de Alimentos | `Library.tsx` | **ESTÁVEL** |
| `/diet-templates` | Gestão de Templates (V2) | `DietTemplates.tsx` | **LEGACY** (Sendo substituído pela biblioteca interna do V3) |
| `/dashboard` | Home Profissional | `Index.tsx` | **ESTÁVEL** |
| `/patient/:id` | Perfil do Paciente | `PatientDetail.tsx` | **ESTÁVEL** |

---

## 3. FUNCIONALIDADES (MAPEAMENTO FORENSE)

### 3.1. Editor V3
- **O que faz**: Interface de edição "Sovereign" (Controle Humano).
- **Store**: `useEditorState` (Zustand com persistência local).
- **Persistência**: Salva no campo `items_payload` da tabela `meal_plans`.
- **Status**: Crítico. Reportado loop ao abrir (verificado em logs) e falta de seletor de paciente.

### 3.2. Biblioteca & Templates V3
- **O que faz**: Carrega modelos da tabela `v3_diet_templates` e alimentos da `v3_library_items`.
- **Status**: Reportado que "categorias não scrollam" e "apenas 6 aparecem". Identificado que o sistema cai em Mock Data se houver erro de conexão ou se a tabela estiver vazia (embora existam 30 registros no DB).
- **Erro Real**: Os nomes das refeições vêm do banco em inglês (`breakfast`, `lunch`) e não são traduzidos na UI.

### 3.3. Sistema de Equivalentes & Recálculo
- **O que faz**: Garante que ao trocar um alimento, as calorias se mantenham.
- **Status**: Funcional, mas reportado "calorias explodindo". Provável falta de teto (limitador) no cálculo de scaling.

### 3.4. PDF & Weekly
- **O que faz**: Gera o documento final e a visão semanal.
- **Status**: Em polimento. Reportado que o PDF às vezes "achata" arrays (perde estrutura).

---

## 4. FALHAS IDENTIFICADAS E PLANO DE CORREÇÃO

1. **Loop no Editor**: Causado por falta de fallback correto quando o `planId` é inválido ou paciente não tem plano ativo.
2. **Refeições em Inglês**: Falta de um mapeador de strings para os slots (`breakfast` -> `Café da Manhã`).
3. **Scroll na Biblioteca**: A UI atual não agrupa por categorias, dificultando a navegação em listas longas.
4. **Calorias Explodindo**: Necessário adicionar um `Math.min(quantity, 1000)` para evitar que o scaling gere gramagens absurdas (ex: 5kg de alface).
5. **Seletor de Paciente**: O Editor V3 precisa permitir trocar o paciente sem sair da tela.

---

## VEREDITO OPERACIONAL
O FitJourney V3 está **85% estável**, mas os 15% restantes (UX e pequenos bugs de cálculo) estão matando a confiança do usuário. O motor procedural foi devidamente removido, restando apenas polimento na camada de interface e helpers matemáticos.
