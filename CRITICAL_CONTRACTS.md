# 🛡️ EDITOR V3 — Anti-Cascade Architecture

> **Objetivo:** Evitar que alterações em uma parte do sistema quebrem outras (efeito cascata).

## 💎 PRINCÍPIOS FUNDAMENTAIS
- **Determinismo:** O sistema deve se comportar de forma previsível e repetível.
- **Isolamento:** Mudanças em um módulo não devem vazar para outros.
- **Validação Obrigatória:** Toda transição de estado deve ser validada antes e depois.
- **Sem Auto-Cura:** Não mascaramos erros. Falhas devem ser visíveis e tratadas na raiz.

---

## 🏛️ ARQUITETURA DE CAMADAS
1. **Editor V3 (`src/lib/editor-v3`):** Interface e orquestração do editor.
2. **Clinical Engine (`src/lib/clinical-engine`):** Regras de negócio puras e algoritmos clínicos.
3. **Persistence Layer (`src/lib/persistence-layer`):** Comunicação com o banco e integridade de dados.
4. **Visual Library (`src/lib/visual-library`):** Componentes visuais desacoplados de lógica.
5. **Security Layer (`src/lib/security-layer`):** RLS, autenticação e contratos críticos.

---

## 📜 OS 5 CONTRATOS CRÍTICOS
### 1. DRAFT INTEGRITY (`draft_integrity`)
- Um rascunho em edição nunca pode ser corrompido ou perder dados.
- Mutações parciais são proibidas sem validação de esquema.

### 2. CLINICAL VALIDITY (`clinical_validity`)
- Planos gerados devem sempre respeitar as restrições clínicas do paciente.
- Proibido gerar planos com macros incoerentes (ex: 0 kcal).

### 3. ENGINE DETERMINISM (`engine_determinism`)
- Dada a mesma entrada, o Clinical Engine deve produzir a mesma saída.
- Proibido efeitos colaterais dentro do Engine.

### 4. PERSISTENCE SAFETY (`persistence_safety`)
- O que o frontend envia deve bater 100% com o que o banco confirma.
- Bloqueio imediato se houver divergência entre cache local e DB.

### 5. UI CONSISTENCY (`ui_consistency`)
- A interface não pode mostrar estados contraditórios.
- Se o status no DB mudou, a UI deve refletir ou bloquear até a sincronia.

---

## 🔒 REGRAS CRÍTICAS DE EXECUÇÃO
- ✅ **Sempre** validar antes de executar.
- ✅ **Sempre** validar depois de executar.
- ❌ **Nunca** alterar estado diretamente (usar dispatchers/reducers validados).
- ❌ **Nunca** ignorar erro ou falha silenciosa.
- 🛑 **Bloquear** em caso de violação de contrato.

---

## 📊 GESTÃO DE FALHAS
- **Logar Tudo:** Toda falha técnica ou de contrato deve ser reportada.
- **Transparência:** O usuário deve ser informado se o sistema não puder garantir a integridade.
- **Anti-Mascaramento:** Não usamos "fallbacks" que escondam inconsistências de dados.

---

## 🧪 VALIDAÇÃO TÉCNICA
```bash
bunx vitest run src/test/antiCascade.test.ts
```
**Status:** Todas as alterações devem passar na suíte de regressão crítica.