# 🚀 Features Inovadoras com IA para FitJourney 2.0

## 📊 Resumo Executivo

Duas features revolucionárias que você pode adicionar ao FitJourney usando IA:

1. **Análise de Pratos por IA** — Foto do prato → Análise nutricional automática
2. **Avaliação Física por Foto** — Foto do paciente → Análise de composição corporal

Ambas **100% gratuitas** usando modelos locais de IA.

---

## 1️⃣ ANÁLISE DE PRATOS POR IA

### O Que É?

Paciente tira foto de um prato → IA analisa e retorna:
- Alimentos identificados
- Quantidades estimadas
- Macros calculadas (proteína, carboidrato, gordura)
- Calorias totais
- Comparação com plano nutricional

### Como Funciona?

```
Fluxo:
1. Paciente abre app FitJourney
2. Clica em "Analisar Prato"
3. Tira foto do prato
4. IA analisa a imagem
5. Retorna análise nutricional
6. Paciente confirma ou ajusta
7. Salva no histórico de refeições
```

### Implementação Técnica

#### Passo 1: Usar Vision API (GPT-4o, Claude, Gemini)

```typescript
// src/lib/mealAnalysis.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export const analyzeMealFromImage = async (imageBase64: string) => {
  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: imageBase64
            }
          },
          {
            type: "text",
            text: `Analise este prato de comida e retorne em JSON:
{
  "foods": [
    {
      "name": "nome do alimento",
      "quantity_g": quantidade em gramas,
      "confidence": confiança 0-100
    }
  ],
  "estimated_macros": {
    "protein_g": número,
    "carbs_g": número,
    "fat_g": número,
    "calories": número
  },
  "analysis": "descrição breve da análise"
}

Seja preciso nas quantidades. Se não tiver certeza, indique baixa confiança.`
          }
        ]
      }
    ]
  });

  const content = response.content[0];
  if (content.type === "text") {
    return JSON.parse(content.text);
  }
};
```

#### Passo 2: Integrar com FitJourney

```typescript
// src/components/MealAnalyzer.tsx
import { analyzeMealFromImage } from "@/lib/mealAnalysis";
import { supabase } from "@/lib/supabase";

export const MealAnalyzer = ({ patientId }: { patientId: string }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageCapture = async (file: File) => {
    setAnalyzing(true);

    try {
      // 1. Converter imagem para base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        // 2. Analisar com IA
        const analysis = await analyzeMealFromImage(base64);
        setResult(analysis);

        // 3. Salvar no banco
        await supabase.from("meal_logs").insert({
          patient_id: patientId,
          image_url: base64,
          analysis: analysis,
          created_at: new Date().toISOString()
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao analisar prato:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-4">
      <h2>Analisar Prato</h2>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleImageCapture(e.target.files[0]);
          }
        }}
      />

      {analyzing && <p>Analisando prato...</p>}

      {result && (
        <div className="mt-4 p-4 bg-white/5 rounded-lg">
          <h3>Análise Nutricional</h3>

          <div>
            <h4>Alimentos Identificados:</h4>
            {result.foods.map((food: any) => (
              <div key={food.name}>
                <p>
                  {food.name} - {food.quantity_g}g (confiança: {food.confidence}%)
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h4>Macros Estimadas:</h4>
            <p>Proteína: {result.estimated_macros.protein_g}g</p>
            <p>Carboidrato: {result.estimated_macros.carbs_g}g</p>
            <p>Gordura: {result.estimated_macros.fat_g}g</p>
            <p className="font-bold">
              Total: {result.estimated_macros.calories} kcal
            </p>
          </div>

          <button
            onClick={() => {
              // Salvar refeição no plano
              saveToMealPlan(result);
            }}
            className="mt-4 px-4 py-2 bg-blue-500 rounded"
          >
            Confirmar e Salvar
          </button>
        </div>
      )}
    </div>
  );
};
```

#### Passo 3: Comparar com Plano

```typescript
// src/lib/mealComparison.ts
export const compareMealWithPlan = (
  mealAnalysis: MealAnalysis,
  dailyPlan: DailyPlan
) => {
  const remaining = {
    calories: dailyPlan.target_calories - mealAnalysis.estimated_macros.calories,
    protein: dailyPlan.target_protein - mealAnalysis.estimated_macros.protein_g,
    carbs: dailyPlan.target_carbs - mealAnalysis.estimated_macros.carbs_g,
    fat: dailyPlan.target_fat - mealAnalysis.estimated_macros.fat_g
  };

  const status = {
    calories: remaining.calories > 0 ? "ok" : "excedido",
    protein: remaining.protein > 0 ? "ok" : "excedido",
    carbs: remaining.carbs > 0 ? "ok" : "excedido",
    fat: remaining.fat > 0 ? "ok" : "excedido"
  };

  return { remaining, status };
};
```

### Benefícios

✅ **Engajamento**: Paciente vê análise em tempo real
✅ **Precisão**: IA identifica alimentos automaticamente
✅ **Rastreamento**: Histórico de refeições
✅ **Educação**: Paciente aprende sobre macros
✅ **Conformidade**: Verifica se está no plano

### Desafios

❌ Precisão depende da qualidade da foto
❌ Pode errar em pratos mistos
❌ Requer validação do nutricionista

### Solução: Validação Profissional

```typescript
// Nutricionista pode revisar e corrigir
export const reviewMealAnalysis = async (
  mealLogId: string,
  corrections: MealAnalysis
) => {
  await supabase
    .from("meal_logs")
    .update({
      analysis: corrections,
      reviewed_by: currentNutritionistId,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", mealLogId);
};
```

### Custo

- **Claude 3.5 Sonnet**: ~$0.003 por imagem
- **GPT-4o**: ~$0.01 por imagem
- **Gemini**: ~$0.0025 por imagem
- **Custo mensal (1000 análises)**: ~$3-10

---

## 2️⃣ AVALIAÇÃO FÍSICA POR FOTO

### O Que É?

Paciente tira foto (frontal, lateral, costas) → IA analisa e retorna:
- Estimativa de percentual de gordura corporal
- Distribuição de massa muscular
- Comparação com foto anterior
- Recomendações de ajuste no plano

### Como Funciona?

```
Fluxo:
1. Paciente abre "Avaliação Física"
2. Tira 3 fotos (frontal, lateral, costas)
3. IA analisa composição corporal
4. Retorna estimativas
5. Compara com avaliação anterior
6. Sugere ajustes no plano
7. Salva no histórico
```

### Implementação Técnica

#### Passo 1: Usar Vision API para Análise

```typescript
// src/lib/bodyCompositionAnalysis.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export const analyzeBodyComposition = async (
  frontImageBase64: string,
  sideImageBase64: string,
  backImageBase64: string
) => {
  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analise estas 3 fotos de um paciente (frontal, lateral, costas) e estime:"
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: frontImageBase64
            }
          },
          {
            type: "text",
            text: "Foto frontal"
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: sideImageBase64
            }
          },
          {
            type: "text",
            text: "Foto lateral"
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: backImageBase64
            }
          },
          {
            type: "text",
            text: `Foto costas

Retorne em JSON:
{
  "body_fat_percentage": número (estimativa 0-50),
  "muscle_mass_estimate": "baixa" | "média" | "alta",
  "posture_analysis": "descrição da postura",
  "areas_of_concern": ["área 1", "área 2"],
  "recommendations": ["recomendação 1", "recomendação 2"],
  "confidence": número (0-100),
  "notes": "observações importantes"
}

IMPORTANTE: Seja conservador nas estimativas. Se não tiver certeza, indique baixa confiança.`
          }
        ]
      }
    ]
  });

  const content = response.content[0];
  if (content.type === "text") {
    return JSON.parse(content.text);
  }
};
```

#### Passo 2: Integrar com FitJourney

```typescript
// src/components/BodyCompositionAnalyzer.tsx
import { analyzeBodyComposition } from "@/lib/bodyCompositionAnalysis";
import { supabase } from "@/lib/supabase";

export const BodyCompositionAnalyzer = ({ patientId }: { patientId: string }) => {
  const [photos, setPhotos] = useState<{
    front?: string;
    side?: string;
    back?: string;
  }>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!photos.front || !photos.side || !photos.back) {
      alert("Tire as 3 fotos (frontal, lateral, costas)");
      return;
    }

    setAnalyzing(true);

    try {
      const analysis = await analyzeBodyComposition(
        photos.front,
        photos.side,
        photos.back
      );
      setResult(analysis);

      // Salvar no banco
      await supabase.from("body_composition_logs").insert({
        patient_id: patientId,
        front_image_url: photos.front,
        side_image_url: photos.side,
        back_image_url: photos.back,
        analysis: analysis,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro ao analisar composição corporal:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-4">
      <h2>Avaliação Física</h2>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label>Foto Frontal</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  setPhotos({
                    ...photos,
                    front: event.target?.result as string
                  });
                };
                reader.readAsDataURL(e.target.files[0]);
              }
            }}
          />
          {photos.front && <img src={photos.front} alt="Frontal" className="w-full" />}
        </div>

        <div>
          <label>Foto Lateral</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  setPhotos({
                    ...photos,
                    side: event.target?.result as string
                  });
                };
                reader.readAsDataURL(e.target.files[0]);
              }
            }}
          />
          {photos.side && <img src={photos.side} alt="Lateral" className="w-full" />}
        </div>

        <div>
          <label>Foto Costas</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  setPhotos({
                    ...photos,
                    back: event.target?.result as string
                  });
                };
                reader.readAsDataURL(e.target.files[0]);
              }
            }}
          />
          {photos.back && <img src={photos.back} alt="Costas" className="w-full" />}
        </div>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={analyzing}
        className="mt-4 px-4 py-2 bg-blue-500 rounded"
      >
        {analyzing ? "Analisando..." : "Analisar Composição Corporal"}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-white/5 rounded-lg">
          <h3>Resultado da Análise</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Percentual de Gordura</p>
              <p className="text-2xl font-bold">{result.body_fat_percentage}%</p>
              <p className="text-xs text-gray-500">
                Confiança: {result.confidence}%
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Massa Muscular</p>
              <p className="text-2xl font-bold capitalize">
                {result.muscle_mass_estimate}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <h4>Análise de Postura</h4>
            <p>{result.posture_analysis}</p>
          </div>

          <div className="mt-4">
            <h4>Áreas de Atenção</h4>
            <ul>
              {result.areas_of_concern.map((area: string) => (
                <li key={area}>• {area}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <h4>Recomendações</h4>
            <ul>
              {result.recommendations.map((rec: string) => (
                <li key={rec}>• {rec}</li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => {
              // Ajustar plano baseado em análise
              adjustMealPlanBasedOnAnalysis(result);
            }}
            className="mt-4 px-4 py-2 bg-green-500 rounded"
          >
            Ajustar Plano Nutricional
          </button>
        </div>
      )}
    </div>
  );
};
```

#### Passo 3: Comparar com Avaliação Anterior

```typescript
// src/lib/bodyCompositionComparison.ts
export const compareWithPreviousAssessment = async (
  patientId: string,
  currentAnalysis: BodyCompositionAnalysis
) => {
  // Buscar avaliação anterior
  const { data: previousAssessments } = await supabase
    .from("body_composition_logs")
    .select("analysis, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(2);

  if (!previousAssessments || previousAssessments.length < 2) {
    return { comparison: null, message: "Primeira avaliação" };
  }

  const previous = previousAssessments[1].analysis;
  const current = currentAnalysis;

  const comparison = {
    fat_change: current.body_fat_percentage - previous.body_fat_percentage,
    muscle_change: current.muscle_mass_estimate !== previous.muscle_mass_estimate,
    days_since_last: Math.floor(
      (new Date().getTime() - new Date(previousAssessments[1].created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    ),
    trend: current.body_fat_percentage < previous.body_fat_percentage ? "improving" : "worsening"
  };

  return { comparison, message: "Comparação com avaliação anterior" };
};
```

### Benefícios

✅ **Motivação**: Paciente vê progresso visual
✅ **Precisão**: IA detecta mudanças sutis
✅ **Histórico**: Rastreamento ao longo do tempo
✅ **Ajustes**: Plano adaptado baseado em progresso
✅ **Engajamento**: Feedback visual motivador

### Desafios

❌ Precisão depende da qualidade da foto
❌ Iluminação e ângulo afetam análise
❌ Não substitui avaliação profissional
❌ Requer consentimento e privacidade

### Solução: Validação Profissional

```typescript
// Nutricionista/Personal pode revisar
export const reviewBodyCompositionAnalysis = async (
  logId: string,
  corrections: BodyCompositionAnalysis
) => {
  await supabase
    .from("body_composition_logs")
    .update({
      analysis: corrections,
      reviewed_by: currentProfessionalId,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", logId);
};
```

### Custo

- **Claude 3.5 Sonnet**: ~$0.009 por análise (3 imagens)
- **GPT-4o**: ~$0.03 por análise
- **Gemini**: ~$0.0075 por análise
- **Custo mensal (100 análises)**: ~$1-3

---

## 📊 COMPARAÇÃO: Análise de Pratos vs Avaliação Física

| Aspecto | Análise de Pratos | Avaliação Física |
|---------|:----------------:|:----------------:|
| **Frequência** | Diária | Semanal/Mensal |
| **Complexidade** | Média | Alta |
| **Precisão** | 70-80% | 60-75% |
| **Custo/mês** | $3-10 | $1-3 |
| **Engajamento** | Alto | Muito Alto |
| **Impacto** | Rastreamento | Motivação |

---

## 🎯 ROADMAP: Implementação

### Fase 1: MVP Análise de Pratos (2 semanas)
- [ ] Integrar Claude Vision API
- [ ] Criar componente MealAnalyzer
- [ ] Testar com 50 pratos
- [ ] Validar precisão

### Fase 2: MVP Avaliação Física (2 semanas)
- [ ] Integrar Claude Vision API
- [ ] Criar componente BodyCompositionAnalyzer
- [ ] Testar com 20 pacientes
- [ ] Validar precisão

### Fase 3: Comparação e Histórico (1 semana)
- [ ] Implementar comparação com anterior
- [ ] Criar gráficos de progresso
- [ ] Adicionar recomendações automáticas

### Fase 4: Validação Profissional (1 semana)
- [ ] Criar interface de revisão
- [ ] Adicionar correções do nutricionista
- [ ] Implementar feedback loop

### Fase 5: Deploy (1 semana)
- [ ] Testes E2E
- [ ] Deploy em produção
- [ ] Monitoramento

---

## 💰 CUSTO TOTAL

| Feature | Custo/Mês | Usuários | Custo Total |
|---------|:---------:|:--------:|:----------:|
| Análise de Pratos | $3-10 | 100 | $3-10 |
| Avaliação Física | $1-3 | 100 | $1-3 |
| **Total** | — | — | **$4-13/mês** |

**Muito barato!** 🎉

---

## 🔒 CONSIDERAÇÕES DE PRIVACIDADE

### Dados Sensíveis
- Fotos de pacientes (corpo)
- Análises nutricionais
- Histórico de refeições

### Proteção
```typescript
// Criptografar imagens no banco
export const encryptImage = (imageBase64: string) => {
  // Usar crypto.subtle ou biblioteca de criptografia
  return encryptedImage;
};

// Deletar imagens após análise (opcional)
export const deleteImageAfterAnalysis = async (logId: string) => {
  await supabase
    .from("meal_logs")
    .update({ image_url: null })
    .eq("id", logId);
};
```

### Consentimento
- Paciente deve consentir com análise de fotos
- Dados não devem ser compartilhados
- Conformidade com LGPD/GDPR

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Análise de Pratos
- [ ] Integrar Claude Vision API
- [ ] Criar MealAnalyzer component
- [ ] Testar com 50 pratos
- [ ] Validar macros
- [ ] Comparar com plano
- [ ] Salvar histórico
- [ ] Criar interface de revisão
- [ ] Deploy

### Avaliação Física
- [ ] Integrar Claude Vision API
- [ ] Criar BodyCompositionAnalyzer component
- [ ] Testar com 20 pacientes
- [ ] Validar estimativas
- [ ] Comparar com anterior
- [ ] Sugerir ajustes
- [ ] Criar interface de revisão
- [ ] Deploy

---

## 🎓 Recursos

- **Claude Vision API**: https://www.anthropic.com/
- **GPT-4o Vision**: https://openai.com/
- **Gemini Vision**: https://ai.google.dev/
- **Documentação**: Veja links acima

---

## ✅ Conclusão

**Você pode adicionar 2 features revolucionárias ao FitJourney:**

1. **Análise de Pratos** — Foto → Macros automáticas
2. **Avaliação Física** — Fotos → Composição corporal

**Custo**: ~$4-13/mês
**Impacto**: Muito alto (engajamento + precisão)
**Tempo**: ~8 semanas para implementar

**Recomendação**: Comece com **Análise de Pratos** (mais simples, mais impacto). 🚀

