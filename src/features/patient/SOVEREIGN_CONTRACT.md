# CONTRATO DE SOBERANIA V3 - BLOCO 1

Este documento define o inventário de motores a serem removidos do Patient App e o esquema do Snapshot Soberano que os substituirá.

## 1. INVENTÁRIO DE MOTORES (FASE 1.2)

| Item | Status | Destino | Descrição |
| :--- | :--- | :--- | :--- |
| `dedupeGroups` | **CONGELADO** | MOVE TO PUBLISH | Grupos de substituição devem ser definidos no publish. |
| `hydrateItem` | **CONGELADO** | DELETE | O snapshot deve vir completo. |
| `normalize macros` | **CONGELADO** | MOVE TO PUBLISH | Arredondamento e conversão de macros feitos no publish. |
| `useMealVisualMatch` | **CONGELADO** | DELETE | Proibido busca por texto/semântica no Patient App. |
| `useMealVisualItem` | **CONGELADO** | MOVE TO PUBLISH | URL da imagem resolvida no publish. |
| `meal_visual_aliases`| **CONGELADO** | DELETE | Heurísticas de nomes de alimentos removidas. |
| `meal_visual_library`| **MANTIDO** | DATA SOURCE | Fonte de dados exclusiva para o Publish. |
| `fallback Unsplash` | **CONGELADO** | DELETE | Substituído por Placeholder Oficial no publish. |
| `runtime grouping` | **CONGELADO** | MOVE TO PUBLISH | Refeições já agrupadas no JSON do snapshot. |
| `snapshot hydration`| **CONGELADO** | DELETE | Snapshot é a verdade absoluta (sem fallbacks). |
| `macro recalculation`| **CONGELADO** | MOVE TO PUBLISH | Substitutos já vêm com macros pré-calculados. |
| `runtime reconstruction`| **CONGELADO** | DELETE | Proibido reconstruir plano V3 no app. |
| `resolver paralelo` | **CONGELADO** | DELETE | Acesso direto ao snapshot apenas. |
| `V2 macro logic` | **CONGELADO** | DELETE | Lógica legado removida do fluxo V3. |

## 2. ESQUEMA DO SNAPSHOT SOBERANO (FASE 1.3)

O campo `snapshot` na tabela `meal_plans` deve seguir rigorosamente esta estrutura:

```typescript
interface SovereignSnapshotV3 {
  publication_id: string;      // ID único da publicação
  snapshot_version: 'v3';      // Sempre v3
  generated_at: string;        // ISO Timestamp
  
  targets: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };

  days: Array<{
    day_of_week: number;       // 0-6
    meals: Array<{
      id: string;              // Estável
      name: string;            // Título final (ex: "Café da Manhã")
      time?: string;           // Horário formatado
      order_index: number;
      
      items: Array<{
        id: string;            // ID único do item no plano
        title: string;         // Nome final do alimento
        quantity_display: string; // Ex: "2 fatias (50g)"
        clinical_mass_g: number;  // Massa em gramas (opcional)
        
        macros: {
          kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
        };

        visual: {
          image_url: string;      // URL final (S3/Cloudinary)
          is_placeholder: boolean; // Flag se é imagem real ou fallback
          placeholder_id?: string; // ID do placeholder oficial
        };

        substitutions: Array<{
          id: string;
          title: string;
          quantity_display: string;
          macros: {
            kcal: number;
            protein_g: number;
            carbs_g: number;
            fat_g: number;
          };
          visual: {
            image_url: string;
            is_placeholder: boolean;
          };
        }>;
      }>;
    }>;
  }>;

  daily_totals: Record<number, {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }>;

  notes?: string;              // Observações do plano
}
```

## 3. REGRAS DE OURO

1. **Se o App do Paciente precisar calcular `A + B`, o Snapshot falhou.**
2. **Se o App do Paciente precisar de um `useEffect` para buscar uma imagem, o Snapshot falhou.**
3. **Se o App do Paciente mostrar "Calculando...", o Snapshot falhou.**
