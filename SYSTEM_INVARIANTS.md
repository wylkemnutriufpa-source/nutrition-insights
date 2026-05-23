# 🛡️ FITJOURNEY 2.0 - SYSTEM INVARIANTS

**ESTE DOCUMENTO É A CONSTITUIÇÃO TÉCNICA DO PROJETO.**
Qualquer alteração que viole estas regras será considerada uma REGRESSÃO CRÍTICA.

## 1. BLINDAGEM DE REGRESSÃO (ANTI-LOVABLE AUTONOMY)
- O Lovable deve operar apenas como **UI/RENDER/SYNC**.
- ❌ **PROIBIDO**: Lovable agir como arquiteto do motor clínico.
- ❌ **PROIBIDO**: Lovable recriar comportamentos legados proibidos.

## 2. SOBERANIA DO SNAPSHOT (SNAPSHOT → RENDER)
O Snapshot V3 é a **ÚNICA** fonte de verdade para o Patient App.

- ❌ **PROIBIDO**: Calcular macros no frontend.
- ❌ **PROIBIDO**: Normalizar dados em runtime.
- ❌ **PROIBIDO**: Inferir imagens de alimentos dinamicamente no render.
- ❌ **PROIBIDO**: Placeholder ou campos `null` em dados críticos.
- ✅ **OBRIGATÓRIO**: `clinical_metadata` deve ser preservado.

## 3. MOTOR CLÍNICO (DETERMINÍSTICO)
O cálculo clínico acontece exclusivamente no Backend (Edge Functions / RPC).

- ❌ **PROIBIDO**: Motores de geração locais (frontend).
- ❌ **PROIBIDO**: Queries N+1 ao carregar planos.
- ✅ **OBRIGATÓRIO**: Mesmo input + mesmo template = mesmo Snapshot.

## 4. ARCHITECTURE LOCKS
- `src/lib/sovereign/`: Núcleo de proteção.
- `.agents/STEERING.md`: Instruções de navegação do agente.
- `LEGACY_DENYLIST`: Bloqueio de símbolos e arquivos proibidos.

## 5. ANTI-HEALING & ANTI-INFERENCE
- Se o dado falhar na validação, o sistema **bloqueia** o fluxo.
- ❌ **PROIBIDO**: "Silent fixing" de dados corrompidos.
- ❌ **PROIBIDO**: Inferência visual (deduzir macros por nome de alimento).

## 6. PASSIVE FRONTEND ENFORCEMENT
O Patient App deve ser uma "folha de papel" que renderiza o snapshot.
Qualquer tentativa de processamento adicional no render é uma violação.

---
*Assinado: Arquitetura FitJourney 2.0*
