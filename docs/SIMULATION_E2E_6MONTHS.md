# 🧪 Simulação End-to-End: Jornada Completa do Paciente (6 Meses)

> **Versão:** 1.0.0  
> **Data:** 2026-03-18  
> **Motor Clínico:** FitJourney Clinical Engine v2.1.0  
> **Pipeline:** 9-step Sequential Orchestrator  

---

## 📋 Perfil do Paciente Simulado

| Campo | Valor |
|-------|-------|
| **Nome** | Ana Carolina S. |
| **Idade** | 32 anos |
| **Sexo** | Feminino |
| **Peso Inicial** | 78.5 kg |
| **Altura** | 1.65 m |
| **IMC Inicial** | 28.8 (Sobrepeso) |
| **Meta Fase 1** | 68 kg (Emagrecimento — 3 meses) |
| **Meta Fase 2** | 70 kg (Ganho de massa magra — 3 meses) |
| **Plano Prestige** | Semestral (Pro) |
| **Protocolo Base** | FitJourney Master |

---

## 🏗️ Arquitetura dos Motores Envolvidos

```
┌─────────────────────────────────────────────────────────────┐
│                 PIPELINE DIÁRIO (9 PASSOS)                   │
│                                                              │
│  1. Checklist → 2. Adesão → 3. Sinais Fisiológicos →        │
│  4. Alertas → 5. CIE → 6. Dropout Risk →                    │
│  7. Ajustes Terapêuticos → 8. Trajetória → 9. Digital Twin   │
│                                                              │
│  Edge Functions:                                             │
│  • clinical-pipeline-orchestrator (orquestrador)             │
│  • detect-engagement-signals (sinais de engajamento)         │
│  • detect-clinical-alerts (alertas clínicos)                 │
│  • compute-behavioral-dropout-risk (risco de abandono)       │
│  • compute-metabolic-twin-engine (digital twin)              │
│  • compute-weight-trajectory-engine (trajetória de peso)     │
│  • compute-metabolic-phase-strategy (fases metabólicas)      │
│  • compute-therapeutic-adjustments (ajustes adaptativos)     │
│  • evaluate-clinical-milestones (marcos clínicos)            │
│  • compute-semi-autonomous-protocol-transitions (transições) │
│  • compute-adaptive-safe-automation-engine (automação safe)  │
└─────────────────────────────────────────────────────────────┘
```

### Tabelas Core Envolvidas

| Tabela | Função |
|--------|--------|
| `patient_lifecycle_states` | Estado canônico (10 estados) |
| `clinical_daily_snapshots` | Snapshot diário de métricas |
| `clinical_alerts` | Alertas clínicos ativos |
| `clinical_auto_adjustment_logs` | Log de ajustes automáticos |
| `metabolic_phase_history` | Histórico de fases metabólicas |
| `behavioral_recovery_actions` | Ações de recuperação |
| `protocol_transition_suggestions` | Sugestões de transição |
| `patient_protocols` | Protocolos ativos do paciente |
| `meal_plans` | Planos alimentares |
| `patient_clinical_snapshots` | Snapshots longitudinais (6h) |
| `patient_metabolic_twin` | Digital twin metabólico |
| `patient_prestige` | Nível de prestígio |
| `notifications` | Notificações do sistema |
| `checklist_tasks` | Tarefas diárias |
| `clinical_milestone_definitions` | Marcos em dia 7, 15, 30, 45, 60 |

---

## ⏱️ LINHA DO TEMPO DETALHADA

---

### 📅 DIA 0 — Cadastro e Onboarding

**Ações do Sistema:**
```
1. Paciente se cadastra → profiles criado
2. Trigger trg_auto_onboarding dispara:
   → Cria pipeline de onboarding (herda progresso existente)
   → patient_lifecycle_states.lifecycle_state = 'onboarding_started'
3. Prestige: Paciente escolhe plano Semestral Pro
   → patient_prestige inserido (plan_id = Pro, is_active = true)
   → Regra anti-downgrade ativada
4. Notificação: "Bem-vinda ao FitJourney! Complete sua anamnese."
   → type: 'onboarding_progress'
```

**Lifecycle State:** `onboarding_started`  
**Dashboard Paciente:** Mostra tela de onboarding (showOnboarding = true)

---

### 📅 DIA 0-2 — Anamnese Completa

**Ações da Paciente:**
- Preenche anamnese completa (histórico, objetivos, restrições, preferências)

**Ações do Sistema:**
```
1. patient_anamnesis inserido
2. Edge Function analyze-anamnesis dispara:
   → Gera anamnesis_ai_insights (perfil metabólico, dores, tips)
   → risk_level classificado como 'moderate'
3. lifecycle_state → 'onboarding_ready_for_plan'
4. Notificação para Nutricionista: "Nova anamnese pronta para revisão"
   → type: 'onboarding_progress'
```

**Lifecycle State:** `onboarding_ready_for_plan`

---

### 📅 DIA 2-3 — Geração do Plano Alimentar (Protocolo FitJourney Master)

**Ações do Nutricionista:**
1. Revisa anamnese e insights da IA
2. Seleciona protocolo: **Déficit Linear Clássico** (fase emagrecimento)
3. Motor gera plano via Edge Function `generate-meal-plan`:

```
Protocolo: Déficit Linear Clássico (id: 95c91589)
TMB Mifflin-St Jeor: 1.465 kcal
TDEE (fator 1.375): 2.014 kcal
Déficit aplicado: -20% = 1.611 kcal
Macros: P 120g (30%) | C 177g (44%) | G 45g (25%)
Template: Emagrecimento Estruturado
Scaling: fator 0.89 (1611/1800 base)
```

4. Plano salvo: `meal_plans.plan_status = 'draft_auto_generated'`
5. `generation_metadata` registra: TMB, scoring, template match

**Ações do Sistema:**
```
1. meal_plans criado com status 'draft_auto_generated'
2. patient_protocols criado:
   → protocol_id: 95c91589 (Déficit Linear Clássico)
   → status: 'active'
   → current_phase: 'initial'
3. lifecycle_state → 'plan_pending_production'
4. Notificação: "Seu plano está sendo preparado pelo nutricionista!"
```

---

### 📅 DIA 3 — Aprovação e Publicação do Plano

**Ações do Nutricionista:**
1. Revisa plano gerado → Ajusta 2 refeições
2. Aprova: `meal_plans.plan_status = 'approved'`
3. Publica: `meal_plans.plan_status = 'published'`

**Ações do Sistema (Trigger trg_seed_milestones_on_publish):**
```
1. plan_status → 'published', is_active = true
2. Trigger dispara seed_clinical_milestones_on_plan_delivery():
   → Cria marcos: day_7, day_15, day_30, day_45, day_60
3. lifecycle_state → 'plan_delivered'
   → has_active_plan = true
   → last_plan_delivery_at = now()
4. patient_lifecycle_states atualizado
5. Notificação paciente: "🎉 Seu plano alimentar está pronto!"
   → type: 'meal_plan', action_url: '/meal-plans/{id}'
6. seed-daily-checklist gera tarefas do dia 1
7. Gamificação: +50 XP por receber primeiro plano
```

**Lifecycle State:** `plan_delivered` → `active_followup`  
**Dashboard Paciente:** showPlan = true, showOnboarding = false

---

## 🏋️ FASE 1: EMAGRECIMENTO (Meses 1-3)

---

### 📅 SEMANA 1 (Dias 3-10) — Adaptação Inicial

**Comportamento da Paciente:**
- Registra 5/7 refeições
- Completa 6/7 checklists
- Peso: 78.5 → 77.8 kg (-0.7 kg)

**Pipeline Diário (a cada dia):**
```
Step 1 - Checklist: completion_rate = 85%
Step 2 - Adesão: adherence_score = 78
Step 3 - Sinais: weight_trend = 'expected_loss', velocity = -0.7 kg/sem
Step 4 - Alertas: nenhum ativo
Step 5 - CIE: clinical_risk_score = 8 (stable)
Step 6 - Dropout: dropout_risk_score = 12 (low)
Step 7 - Ajustes: não aplicável (< 7 dias)
Step 8 - Trajetória: projeção linear on-track
Step 9 - Twin: baseline sendo calibrado
```

**📌 DIA 10 — MILESTONE day_7 (Primeira Leitura Comportamental):**
```
Edge Function: evaluate-clinical-milestones
Ações executadas:
  ✅ compute_adherence_score → 78/100
  ✅ classify_initial_risk → 'low'
  ✅ generate_silent_alert → nenhum (score ok)
  ✅ update_lifecycle → mantém 'active_followup'

Resultado: "Paciente em adaptação saudável"
Notificação interna (nutricionista): "Ana completou 7 dias — adesão 78%"
```

**clinical_daily_snapshots neste período:**
```json
{
  "adherence_score": 78,
  "clinical_risk_score": 8,
  "risk_level": "stable",
  "weight_trend": "expected_loss",
  "current_weight": 77.8,
  "weight_change_7d": -0.7,
  "checklist_completion_rate": 0.85,
  "dropout_risk_score": 12,
  "momentum_direction": "positive"
}
```

---

### 📅 SEMANA 2-3 (Dias 10-24) — Fase de Resposta Inicial

**Comportamento da Paciente:**
- Boa adesão: 80-85%
- Registra refeições consistentemente
- Peso: 77.8 → 76.2 kg (-1.6 kg em 2 semanas)

**📌 DIA 18 — MILESTONE day_15 (Verificação de Tendência):**
```
Ações executadas:
  ✅ compute_weight_trend → 'active_loss' (-0.8 kg/sem)
  ✅ evaluate_checklist_consistency → 83% (consistente)
  ✅ flag_stagnation → FALSE
  ✅ adjust_priority → therapeutic_priority mantido

metabolic_phase_history:
  → phase: 'initial_response'
  → classification: 'rapid_responder' (perda > 0.7 kg/sem)
  
patient_metabolic_twin calibrado:
  → energy_efficiency_index: 0.82
  → adaptive_resistance_index: 0.15 (baixo — boa resposta)
  → lean_mass_preservation: 0.88
```

**Notificações Automáticas (smart-push-notifications):**
```
Dia 10: "💪 Sua primeira semana foi incrível! -0.7kg"
Dia 14: "🔥 Streak de 11 dias! Continue assim!"
Dia 18: "📊 Tendência confirmada: você está no caminho certo!"
```

---

### 📅 SEMANA 4-5 (Dias 24-38) — Platô Leve + Resposta do Sistema

**Comportamento da Paciente:**
- Adesão cai para 65%
- Pula 3 dias de checklist
- Peso: 76.2 → 75.8 kg (apenas -0.4 kg em 2 semanas)

**📌 DIA 33 — MILESTONE day_30 (Análise Clínica Completa):**
```
Ações executadas:
  ✅ full_clinical_analysis:
     → adherence_score: 65 (queda de 78 → 65)
     → momentum_direction: 'declining'
     → engagement_stability_index: 58/100
  
  ✅ metabolic_classification:
     → metabolic_cluster: 'slowing_response'
     → phase: 'slowing_response' (era 'active_loss')
     → Reclassificação registrada em metabolic_phase_history
  
  ✅ suggest_plan_adjustment:
     → compute-therapeutic-adjustments dispara:
        • Tipo: 'caloric_micro_adjustment'
        • Ajuste sugerido: -3% calorias (1611 → 1563 kcal)
        • Modo: SUGGEST_ONLY (requer aprovação)
        → clinical_auto_adjustment_logs registrado
  
  ✅ activate_retention_if_needed:
     → dropout_risk_score: 35 (attention)
     → NÃO ativa retenção (threshold = 50)
     → Mas gera alerta preventivo
  
  ✅ update_lifecycle:
     → Mantém 'active_followup' (plano ativo, adesão > 50%)
```

**Alertas Clínicos Gerados:**
```
clinical_alerts inserido:
  → alert_type: 'adherence_drop'
  → severity: 'medium'
  → title: 'Queda de Adesão Detectada'
  → description: 'Adesão caiu de 78% para 65% nos últimos 14 dias'
  → trigger_source: 'clinical_engine'

Notificação Nutricionista:
  → "⚠️ Ana Carolina: adesão em queda (-13 pontos). Considere contato."
  → type: 'clinical_alert'
```

**Ação do Motor de Engajamento (detect-engagement-signals):**
```
engagement_signals inserido:
  → signal_type: 'declining_adherence'
  → severity: 'medium'
  → signal_data: { previous: 78, current: 65, delta: -13 }

Smart Push para Paciente:
  → "Ei Ana, notamos que os últimos dias foram mais difíceis. Sem julgamento! Que tal simplificar hoje com uma refeição fácil? 🍽️"
```

---

### 📅 SEMANA 5-6 (Dias 38-45) — Recuperação de Adesão

**Cenário:** Nutricionista aplica ajuste sugerido e manda mensagem motivacional.

**Ações do Nutricionista:**
1. Aceita sugestão de ajuste calórico (-3%)
2. Envia mensagem no chat
3. Simplifica 2 refeições do plano

**Ações do Sistema (Soberania de Protocolo):**
```
patient_protocols.manual_intervention_status = 'adjusted_within_protocol'
patient_protocols.manual_adjustments_count += 1
→ Protocolo CONTINUA ativo (não desativa)
→ Badge visual: "Protocolo com ajustes manuais"
→ Motor clínico continua operando em background
```

**Resultado:** Paciente retoma adesão para 75%  
**Peso:** 75.8 → 74.5 kg (-1.3 kg em 2 semanas — resposta retomada)

**📌 DIA 45 — MILESTONE day_45 (Zona de Abandono):**
```
Ações executadas:
  ✅ dropout_deep_analysis:
     → dropout_risk_score: 22 (caiu de 35 para 22 — recuperou)
     → behavioral_pattern: 'recovered_engagement'
  
  ✅ activate_retention_protocol → NÃO (risco baixo)
  
  ✅ push_emotional:
     → "🌟 Ana, você superou um momento difícil e voltou com força! Isso é resiliência!"
  
  ✅ suggest_reconsultation:
     → Notificação nutricionista: "Considere agendar retorno com Ana (45 dias)"
```

---

### 📅 SEMANA 7-9 (Dias 45-63) — Platô Metabólico Real

**Comportamento da Paciente:**
- Adesão volta para 80%
- Mas peso estagna: 74.5 → 74.2 kg (apenas -0.3 kg em 3 semanas!)

**Motor de Alertas (detect-clinical-alerts):**
```
clinical_alerts:
  → alert_type: 'metabolic_stagnation'
  → severity: 'high'
  → title: 'Platô Metabólico Detectado'
  → description: 'Adesão ≥75% com perda <0.3kg em 21 dias — Possível Adaptação Metabólica'
  → trigger_source: 'metabolic_stagnation_rule'
```

**Motor de Fase Metabólica (compute-metabolic-phase-strategy):**
```
metabolic_phase_history:
  → previous_phase: 'slowing_response'
  → new_phase: 'plateau_active'
  
metabolic_phase_strategy_rules aplicadas:
  → Estratégia: 'caloric_cycling' 
  → Ajuste sugerido: Ciclagem calórica (+10% em 2 dias/semana)
  → Redistribuição: proteína +5g/dia
```

**Motor de Transição de Protocolo (compute-semi-autonomous-protocol-transitions):**
```
protocol_transition_suggestions:
  → current_protocol: 'Déficit Linear Clássico'
  → suggested_protocol: 'Déficit Cíclico Avançado' ou 'Diet Break'
  → transition_driver: 'plateau_detected'
  → confidence_score: 72
  → suggested_path: 'switch_template' (não troca protocolo inteiro)
  → Modo: SUGGEST_ONLY → aguarda aprovação do nutricionista
```

**📌 DIA 60 — MILESTONE day_60 (Reavaliação Estratégica):**
```
Ações executadas:
  ✅ plan_efficacy_evaluation:
     → therapeutic_efficacy_score: 68/100
     → Peso perdido: -4.3 kg em 60 dias
     → Meta era -10.5 kg em 90 dias → ritmo abaixo (projeção: -6.4 kg)
  
  ✅ maintenance_transition_check → FALSE (meta não atingida)
  
  ✅ protocol_transition_suggestion:
     → Sugestão formal de Diet Break (7-10 dias) seguido de Déficit Cíclico
     → Alternativa: manter e intensificar
  
  ✅ update_lifecycle → mantém 'active_followup'
```

**Digital Twin (compute-metabolic-twin-engine):**
```
patient_metabolic_twin:
  → energy_efficiency_index: 0.71 (caiu — adaptação)
  → adaptive_resistance_index: 0.55 (subiu — platô)
  → metabolic_flexibility: 0.63
  → regain_risk_index: 0.28
  
  Simulação Diet Break (7 dias):
  → Projeção: quebra adaptação em 78% dos casos similares
  → Resultado esperado: retomada de -0.5 kg/sem após break
```

---

### 📅 SEMANA 9-10 (Dias 63-73) — Diet Break Aplicado

**Ações do Nutricionista:**
1. Aceita sugestão de Diet Break
2. Ajusta plano: 1611 kcal → 1900 kcal (manutenção) por 10 dias

```
patient_protocols:
  → current_phase: 'diet_break'
  → phase_started_at: dia 63
  
meal_plans: novo plano com meta calórica 1900 kcal
  → previous_plan_id: plano anterior
  → transition_origin_id: sugestão de transição

clinical_auto_adjustment_logs:
  → adjustment_type: 'diet_break_initiated'
  → triggering_driver: 'plateau_active'
  → automation_confidence: 72
```

**Peso durante diet break:** 74.2 → 74.8 kg (+0.6 kg — esperado)  
**Sistema NÃO gera alerta** (reconhece fase de diet break)

---

### 📅 SEMANA 10-13 (Dias 73-93) — Retomada Pós-Break + Final Fase 1

**Ações do Nutricionista:**
1. Encerra diet break
2. Retoma déficit com Protocolo Cíclico: 1580 kcal (dias low) / 1750 kcal (dias high)

**Resultado:** Platô quebrado! Retomada de perda.
```
Semana 10-11: 74.8 → 73.5 kg (-1.3 kg) ✅
Semana 11-12: 73.5 → 72.6 kg (-0.9 kg) ✅
Semana 12-13: 72.6 → 71.8 kg (-0.8 kg) ✅
```

**Métricas Finais Fase 1 (Dia 93):**
```
Peso: 78.5 → 71.8 kg = -6.7 kg em 3 meses
Meta era -10.5 kg → Atingiu 64% da meta
Velocidade média: -0.52 kg/semana
Adesão média: 74%
clinical_risk_score final: 12 (stable)
metabolic_cluster: 'slow_responder' (reclassificado)
```

---

## 🏋️ FASE 2: GANHO DE MASSA MUSCULAR (Meses 4-6)

---

### 📅 DIA 93 — Transição de Protocolo (Emagrecimento → Hipertrofia)

**Motor de Transição (compute-semi-autonomous-protocol-transitions):**
```
protocol_transition_suggestions:
  → current_protocol: 'Déficit Cíclico Avançado'
  → suggested_protocol: 'Recomposição Moderada' (id: 2743a58f)
  → transition_driver: 'goal_phase_change'
  → suggested_path: 'switch_protocol'
  → confidence_score: 88
```

**Ações do Nutricionista:**
1. Aceita transição de protocolo
2. Novo protocolo: **Recomposição Moderada**
3. Gera novo plano alimentar:

```
Protocolo: Recomposição Moderada
Novo TDEE: 1.936 kcal (peso atualizado: 71.8 kg)
Superávit aplicado: +10% = 2.130 kcal
Macros: P 143g (27%) | C 266g (50%) | G 53g (22%)
→ Proteína elevada para preservar/ganhar massa
```

**Ações do Sistema:**
```
1. patient_protocols anterior: status → 'completed'
2. patient_protocols novo:
   → protocol_id: 2743a58f (Recomposição Moderada)
   → status: 'active'
   → current_phase: 'initial_surplus'
3. meal_plans novo publicado:
   → plan_status: 'published'
   → previous_plan_id: plano fase 1
4. Milestones resetados: day_7, day_15, day_30, day_45, day_60
5. lifecycle_state mantém 'active_followup'
6. metabolic_phase_history:
   → phase: 'recomposition'
7. Notificação: "🎯 Nova fase! Seu plano de ganho de massa está pronto!"
```

---

### 📅 SEMANA 14-16 (Dias 93-114) — Adaptação ao Superávit

**Comportamento da Paciente:**
- Estranha comer mais → adesão inicial: 70%
- Peso: 71.8 → 72.5 kg (+0.7 kg em 3 semanas)

**Motor de Alertas — Regra de Ganho Súbito:**
```
→ NÃO dispara: ganho de 0.7 kg em 21 dias está dentro do esperado
   para protocolo de recomposição (+0.3 kg/sem = faixa ideal)
→ O sistema reconhece o contexto do protocolo ativo
```

**📌 DIA 100 — MILESTONE day_7 (novo ciclo):**
```
  ✅ adherence_score: 70
  ✅ classify_initial_risk: 'low' (contexto de recomposição)
  ✅ Nota: "Adaptação normal ao aumento calórico"
```

**Smart Push Notifications:**
```
"🥩 Ana, sua meta agora é ganhar força! Foque em atingir a proteína diária (143g)"
"💧 Ganho de peso nesta fase é esperado e saudável. Confie no processo! 💪"
```

---

### 📅 SEMANA 16-18 (Dias 114-128) — Inconsistência de Adesão

**Cenário:** Paciente fica 4 dias sem registrar nada (viagem)

**Motor de Engajamento (detect-engagement-signals):**
```
Dia 118 (3 dias sem check-in):
  engagement_signals:
    → signal_type: 'missing_checkins'
    → severity: 'medium'
    
  Smart Push: "Oi Ana! Tudo bem? Faz 3 dias que não te vemos. Um registro rápido ajuda! 📝"

Dia 119 (4 dias):
  clinical_alerts:
    → alert_type: 'low_frequency'
    → severity: 'medium'
    → title: 'Frequência Baixa de Check-ins'
```

**Motor de Dropout (compute-behavioral-dropout-risk):**
```
  dropout_risk_score: 42 (subiu de 15 para 42)
  → Ainda abaixo do threshold de 50 para ações de retenção
  → Mas registra behavioral_recovery_actions:
     → suggested_strategy: 'simplified_tracking' 
     → clinical_reason: 'Ausência prolongada com tendência de desengajamento'
     → priority: 2
```

**📌 Paciente retorna no dia 120:**
```
  Sistema reconhece retorno:
  → dropout_risk_score cai para 28
  → Push: "Bem-vinda de volta, Ana! 🎉 Sem pressão, vamos retomar no seu ritmo."
```

---

### 📅 SEMANA 18-21 (Dias 128-148) — Progresso Estável

**Comportamento da Paciente:**
- Adesão: 82%
- Peso: 72.5 → 73.2 kg (+0.7 kg em 4 semanas — ganho controlado)

**Pipeline Diário típico:**
```
adherence_score: 82
clinical_risk_score: 10 (stable)
weight_trend: 'controlled_gain'
metabolic_cluster: 'stable_transformer'
dropout_risk_score: 14
momentum_direction: 'positive'
```

**Motor de Fase Metabólica:**
```
metabolic_phase_history:
  → phase: 'consolidation'
  → Ganho médio: +0.17 kg/sem (dentro da faixa ideal 0.1-0.3 kg/sem)
```

**Digital Twin (compute-metabolic-twin-engine):**
```
patient_metabolic_twin atualizado:
  → energy_efficiency_index: 0.78 (melhorou com recomposição)
  → lean_mass_preservation: 0.92 (excelente)
  → metabolic_flexibility: 0.75 (melhorou pós diet-break)
  → regain_risk_index: 0.18 (baixo)
  
  Simulação 'hypertrophy_phase' (4 sem):
  → Projeção: +0.8 kg total, sendo ~60% massa magra
```

---

### 📅 SEMANA 21-24 (Dias 148-180) — Consolidação + Platô de Massa

**Cenário:** Ganho desacelera (esperado em recomposição)

```
Semana 21-22: 73.2 → 73.4 kg (+0.2 kg)
Semana 22-23: 73.4 → 73.5 kg (+0.1 kg)
Semana 23-24: 73.5 → 73.5 kg (estável)
```

**Motor de Fase Metabólica:**
```
metabolic_phase_history:
  → phase: 'maintenance' (de 'consolidation' para 'maintenance')
  → Nota: estabilização de peso é normal em recomposição madura
```

**Sugestão de Protocolo (Dia 170):**
```
protocol_transition_suggestions:
  → suggested_protocol: 'Hipertrofia Clean Bulk' (id: 2fce72ee)
  → transition_driver: 'recomp_plateau'
  → confidence_score: 65
  → suggested_path: 'escalate_surplus'
  → Nota: "Considerar aumento moderado de superávit para continuar progresso"
```

**📌 DIA 153 — MILESTONE day_60 (Reavaliação Final da Fase):**
```
  ✅ plan_efficacy_evaluation:
     → therapeutic_efficacy_score: 78/100 (bom para recomposição)
     → Peso: 71.8 → 73.5 kg = +1.7 kg
     → Composição estimada: ~60% massa magra, ~40% gordura
     → Classificação silhueta: 'lean_transition'
  
  ✅ maintenance_transition_check:
     → Sugere: "Manter protocolo atual ou escalar para Hipertrofia"
  
  ✅ protocol_transition_suggestion:
     → Opção 1: Manter Recomposição Moderada (safe)
     → Opção 2: Escalar para Clean Bulk (agressivo)
```

---

### 📅 DIA 180 — Fim do Plano Semestral

**Ações do Sistema (Fim do Período):**
```
1. Relatório Final Gerado (generate-weekly-report):
   ═══════════════════════════════════════
   RELATÓRIO DE 6 MESES — ANA CAROLINA S.
   ═══════════════════════════════════════
   
   FASE 1 — EMAGRECIMENTO (90 dias):
   • Peso: 78.5 → 71.8 kg (-6.7 kg)
   • Adesão média: 74%
   • 1 platô detectado + 1 diet break
   • 1 episódio de queda de adesão (recuperado)
   • Protocolos: Déficit Linear → Diet Break → Déficit Cíclico
   
   FASE 2 — RECOMPOSIÇÃO (90 dias):
   • Peso: 71.8 → 73.5 kg (+1.7 kg)
   • Adesão média: 78%
   • ~1.0 kg massa magra estimada
   • 1 ausência de 4 dias (recuperada)
   • Protocolo: Recomposição Moderada
   
   RESULTADO GLOBAL:
   • Peso líquido: -5.0 kg (78.5 → 73.5 kg)
   • Classificação: 'positive_transformation'
   • Silhueta: 'moderate_adiposity' → 'lean_transition'
   • IMC: 28.8 → 27.0
   ═══════════════════════════════════════

2. Gestão de Assinatura:
   → check-subscription verifica status Stripe
   → Assinatura semestral expirando em 7 dias
   → Notificação: "Seu plano semestral Pro expira em 7 dias. Renove para continuar!"
   → type: 'warning'
   
3. Se NÃO renova (inadimplência):
   → Stripe webhook dispara status 'past_due' → 'canceled'
   → check-subscription retorna { subscribed: false }
   → SubscriptionGuard bloqueia acesso a funcionalidades premium
   → Paciente vê: "Assinatura Inativa — Para acessar seu plano, renove."
   → Notificação: "⚠️ Sua assinatura foi cancelada. Renove para continuar acompanhamento."
   
4. Se RENOVA:
   → Stripe webhook confirma renovação
   → check-subscription retorna { subscribed: true, product_id: 'prod_pro' }
   → Acesso mantido
   → Novo ciclo de milestones pode ser iniciado
```

---

## 📊 RESUMO DOS MOTORES ATIVADOS

| Motor/Edge Function | Vezes Disparado | Impacto |
|---------------------|----------------|---------|
| `clinical-pipeline-orchestrator` | ~180x (diário) | Orquestra todos os passos |
| `detect-engagement-signals` | ~180x | Detectou 2 quedas, 1 ausência |
| `detect-clinical-alerts` | ~180x | Gerou 4 alertas (adesão, platô, frequência) |
| `compute-behavioral-dropout-risk` | ~180x | Pico de 42, média 20 |
| `evaluate-clinical-milestones` | 10x (5+5) | Marcos em dia 7,15,30,45,60 x2 fases |
| `compute-metabolic-phase-strategy` | ~26x (semanal) | 6 transições de fase |
| `compute-weight-trajectory-engine` | ~26x | Projeções atualizadas semanalmente |
| `compute-metabolic-twin-engine` | ~26x | Twin calibrado continuamente |
| `compute-therapeutic-adjustments` | ~26x | 2 ajustes sugeridos, 1 aceito |
| `compute-semi-autonomous-protocol-transitions` | ~26x | 2 sugestões de transição |
| `smart-push-notifications` | ~30x | Motivação, alertas, feedbacks |
| `seed-daily-checklist` | ~180x | Tarefas diárias geradas |
| `check-subscription` | ~180x (1/min login) | Verificação contínua de assinatura |

---

## 🔔 TIMELINE DE NOTIFICAÇÕES AUTOMÁTICAS

| Dia | Tipo | Destino | Mensagem |
|-----|------|---------|----------|
| 0 | onboarding | Paciente | "Bem-vinda! Complete sua anamnese" |
| 2 | onboarding | Nutri | "Nova anamnese pronta" |
| 3 | meal_plan | Paciente | "Seu plano está pronto! 🎉" |
| 10 | success | Paciente | "Primeira semana incrível! -0.7kg" |
| 14 | success | Paciente | "Streak de 11 dias!" |
| 33 | clinical_alert | Nutri | "Adesão em queda (-13 pts)" |
| 33 | feedback | Paciente | "Dias difíceis? Sem julgamento!" |
| 45 | success | Paciente | "Você superou e voltou! 🌟" |
| 63 | clinical_alert | Nutri | "Platô metabólico detectado" |
| 73 | meal_plan | Paciente | "Plano atualizado pós diet-break" |
| 93 | meal_plan | Paciente | "Nova fase! Plano de massa pronto 🎯" |
| 118 | warning | Paciente | "Faz 3 dias que não te vemos 📝" |
| 120 | success | Paciente | "Bem-vinda de volta! 🎉" |
| 173 | warning | Paciente | "Plano expira em 7 dias" |
| 180 | warning | Paciente | "Renove para continuar" |

---

## ⚠️ CENÁRIO DE INADIMPLÊNCIA

```
DIA 180 — Assinatura expira
  → Stripe: subscription.status = 'past_due'
  → 3 dias de grace period
  
DIA 183 — Stripe cancela
  → Stripe webhook → stripe-webhook edge function
  → check-subscription retorna { subscribed: false }
  → Frontend: SubscriptionGuard bloqueia:
     • Plano alimentar (visualização bloqueada)
     • Chat com nutricionista
     • Relatórios e analytics
     • Módulos premium
  → Notificação: "Assinatura cancelada. Renove em /pricing"
  → Botão CTA: "👑 Ver Planos" → /pricing
  
DIA 190 — Paciente renova
  → create-checkout → Stripe session
  → Pagamento confirmado
  → stripe-webhook atualiza
  → check-subscription retorna { subscribed: true }
  → SubscriptionGuard libera acesso
  → Lifecycle mantido (dados preservados)
  → Notificação: "🎉 Bem-vinda de volta! Acesso restaurado."
  → Pipeline clínico retoma processamento
```

---

## 🏆 PRESTIGE & GAMIFICAÇÃO AO LONGO DOS 6 MESES

```
XP Acumulado (estimativa):
  • Plano recebido: +50 XP
  • Checklists (130 dias × 10 XP): +1.300 XP
  • Refeições registradas (110 registros × 5 XP): +550 XP
  • Streaks (3 streaks de 7+ dias × 50 XP): +150 XP
  • Milestones completados (8 × 100 XP): +800 XP
  • TOTAL: ~2.850 XP
  
Plano Pro Semestral:
  → ai_usage_multiplier: 1.5x
  → ranking_highlight: true
  → crown_enabled: true (badge visual no ranking)
  → Ranking position: calculado por patient_ranking_cache
```

---

## ✅ CONCLUSÃO DA SIMULAÇÃO

### O que o sistema faz 100% no automático:
1. ✅ Pipeline diário de 9 passos
2. ✅ Detecção de platôs e adaptação metabólica
3. ✅ Alertas clínicos com severidade
4. ✅ Push notifications inteligentes contextuais
5. ✅ Sugestões de ajuste calórico e de protocolo
6. ✅ Classificação metabólica e reclassificação
7. ✅ Digital twin com simulações de cenários
8. ✅ Milestones com ações automáticas em dia 7,15,30,45,60
9. ✅ Detecção de risco de abandono + estratégias de recuperação
10. ✅ Gamificação (XP, streaks, achievements)
11. ✅ Gestão de assinatura e inadimplência via Stripe
12. ✅ Soberania de protocolo (ajustes não desativam motor)

### O que REQUER intervenção do nutricionista:
1. 🔧 Aprovar/publicar plano alimentar
2. 🔧 Aceitar/rejeitar sugestões de ajuste calórico
3. 🔧 Aceitar/rejeitar transições de protocolo
4. 🔧 Mensagens motivacionais personalizadas via chat
5. 🔧 Decidir entre opções terapêuticas (diet break vs intensificar)

### Tabelas AUSENTES que precisam ser criadas:
- `patient_milestones` (tracking individual de milestones por paciente)
- `patient_predictions` (previsões de desfechos clínicos)
- `weight_trajectory_projections` (projeções de peso persistidas)
