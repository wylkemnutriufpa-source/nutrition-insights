# 🚀 Casos de Uso: Open Generative AI para Novos Projetos

## 📊 Resumo Executivo

O repositório **open-generative-ai** pode ser usado de **5 formas diferentes**:

1. **Fork + Customizar** — Criar seu próprio projeto baseado nele
2. **Integração Direta** — Usar a API Muapi.ai no FitJourney
3. **Copiar Padrões** — Reutilizar arquitetura e componentes
4. **Usar como Biblioteca** — Importar componentes React
5. **Estender com Novos Modelos** — Adicionar funcionalidades

---

## 1️⃣ FORK + CUSTOMIZAR — Criar Novo Projeto

### O Que É?
Fazer um fork do repositório e criar um projeto completamente novo baseado nele.

### Como Fazer?

```bash
# 1. Fork no GitHub (clique em "Fork" no repositório)
# 2. Clone seu fork
git clone https://github.com/SEU_USERNAME/open-generative-ai.git
cd open-generative-ai

# 3. Customize conforme necessário
# - Mude o nome em package.json
# - Customize cores em tailwind.config.js
# - Adicione novos modelos em packages/studio/src/models.js
# - Customize componentes em packages/studio/src/components/

# 4. Deploy
npm run setup
npm run build
npm run start
```

### Casos de Uso

#### A. **Plataforma de Geração de Imagens Personalizada**
```
Seu Projeto: "NutriImage" — Gerador de imagens de pratos nutricionais
├── Customize modelos para gerar imagens de comida
├── Adicione filtros de nutrição (calorias, macros)
├── Integre com banco de alimentos do FitJourney
└── Monetize com API key própria
```

**Exemplo de Customização**:
```typescript
// packages/studio/src/models.js
export const t2iModels = [
  {
    id: 'food-image-gen',
    name: 'Food Image Generator',
    endpoint: 'food-image-gen',
    inputs: {
      cuisine: ['brazilian', 'italian', 'asian'],
      calories: ['low', 'medium', 'high'],
      macros: ['high-protein', 'balanced', 'low-carb']
    }
  }
];
```

#### B. **Gerador de Vídeos de Receitas**
```
Seu Projeto: "RecipeVideo" — Gera vídeos de receitas com IA
├── Use VideoStudio para gerar vídeos
├── Integre com banco de receitas
├── Adicione narração com LipSyncStudio
└── Exporte como tutorial
```

#### C. **Plataforma de Design para Nutricionistas**
```
Seu Projeto: "NutriDesign" — Designer de materiais nutricionais
├── Use CinemaStudio para criar imagens profissionais
├── Customize para gerar infográficos de nutrição
├── Exporte como PDF/PNG
└── Venda templates
```

### Benefícios
✅ Projeto completamente seu
✅ Controle total sobre código
✅ Pode monetizar
✅ Sem dependências do projeto original

### Desvantagens
❌ Precisa manter atualizado
❌ Duplica código
❌ Mais trabalho de manutenção

---

## 2️⃣ INTEGRAÇÃO DIRETA — Usar API Muapi.ai no FitJourney

### O Que É?
Usar a API Muapi.ai (que open-generative-ai usa) diretamente no FitJourney para gerar imagens de pratos.

### Como Fazer?

```typescript
// src/lib/muapi-client.ts — Cliente Muapi.ai
import axios from 'axios';

const MUAPI_API_KEY = process.env.VITE_MUAPI_API_KEY;
const MUAPI_BASE_URL = 'https://api.muapi.ai';

export const generateFoodImage = async (prompt: string) => {
  // 1. Submit
  const submitResponse = await axios.post(
    `${MUAPI_BASE_URL}/api/v1/flux-dev-image`,
    {
      prompt,
      num_inference_steps: 28,
      guidance_scale: 7.5
    },
    {
      headers: { 'x-api-key': MUAPI_API_KEY }
    }
  );

  const requestId = submitResponse.data.request_id;

  // 2. Poll
  let result;
  while (true) {
    const pollResponse = await axios.get(
      `${MUAPI_BASE_URL}/api/v1/predictions/${requestId}/result`,
      {
        headers: { 'x-api-key': MUAPI_API_KEY }
      }
    );

    if (pollResponse.data.status === 'completed') {
      result = pollResponse.data;
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return result.output[0]; // URL da imagem
};
```

### Casos de Uso

#### A. **Gerar Imagens de Pratos no FitJourney**
```typescript
// src/components/MealPlanEditor.tsx
const generateMealImage = async (mealDescription: string) => {
  const prompt = `Professional food photography: ${mealDescription}, 
                  high quality, appetizing, studio lighting`;
  
  const imageUrl = await generateFoodImage(prompt);
  
  // Salvar no banco
  await supabase
    .from('meal_plan_items')
    .update({ generated_image_url: imageUrl })
    .eq('id', mealItemId);
};
```

#### B. **Visualização de Planos com Imagens**
```
Fluxo:
1. Usuário cria plano de refeição
2. Sistema gera imagens de cada prato
3. Paciente vê plano com imagens visuais
4. Melhor engajamento e compreensão
```

#### C. **Galeria de Pratos Nutricionais**
```
Seu Projeto: "NutriGallery" — Galeria de imagens de pratos
├── Gere imagens de pratos com macros específicas
├── Organize por categoria (café, almoço, jantar)
├── Permita busca por nutrientes
└── Compartilhe com pacientes
```

### Benefícios
✅ Integração simples
✅ Sem duplicação de código
✅ Usa infraestrutura existente
✅ Melhora UX do FitJourney

### Desvantagens
❌ Depende de API externa (Muapi.ai)
❌ Custo por geração
❌ Latência de rede

### Custo Estimado
- Muapi.ai cobra por geração
- Flux Dev: ~$0.01-0.05 por imagem
- Para 1000 imagens/mês: ~$10-50

---

## 3️⃣ COPIAR PADRÕES — Reutilizar Arquitetura

### O Que É?
Copiar padrões arquiteturais do open-generative-ai para seus projetos.

### Padrões Copiáveis

#### A. **Monorepo com Workspaces**
```json
// package.json
{
  "workspaces": [
    "packages/core",
    "packages/ui",
    "packages/api-client",
    "packages/validation"
  ]
}
```

**Aplicar ao FitJourney**:
```
packages/
├── core/                    # Motor clínico
├── ui/                      # Componentes React
├── api-client/              # Cliente Supabase
├── validation/              # Schemas Zod
└── types/                   # Tipos TypeScript
```

#### B. **Single Source of Truth**
```typescript
// packages/core/src/config.ts
export const MODELS = {
  IMAGE: {
    FLUX_DEV: { id: 'flux-dev', name: 'Flux Dev', endpoint: 'flux-dev-image' },
    NANO_BANANA: { id: 'nano-banana', name: 'Nano Banana', endpoint: 'nano-banana-pro' }
  },
  VIDEO: {
    KLING: { id: 'kling', name: 'Kling', endpoint: 'kling-video' }
  }
};

// Usar em qualquer lugar
import { MODELS } from '@myapp/core';
const model = MODELS.IMAGE.FLUX_DEV;
```

**Aplicar ao FitJourney**:
```typescript
// src/lib/config/clinicalRules.ts
export const CLINICAL_CONFIG = {
  MEAL_KCAL_SPLIT: { breakfast: 0.20, lunch: 0.30, dinner: 0.22 },
  BLOCKED_FOODS: ['alcohol', 'high-sugar-drinks'],
  SUBSTITUTION_GROUPS: { proteins: ['chicken', 'beef', 'fish'] }
};
```

#### C. **Submit → Poll Pattern**
```typescript
// Padrão para operações assíncronas longas
const submitAndPoll = async (endpoint: string, data: any) => {
  // 1. Submit
  const response = await POST(endpoint, data);
  const jobId = response.job_id;

  // 2. Poll
  while (true) {
    const result = await GET(`/jobs/${jobId}`);
    if (result.status === 'completed') return result;
    await sleep(1000);
  }
};
```

#### D. **localStorage para Cache**
```typescript
// Padrão para cache local
const cacheToLocalStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const getFromLocalStorage = (key: string) => {
  return JSON.parse(localStorage.getItem(key) || '{}');
};
```

#### E. **Glassmorphism UI**
```jsx
// Componente reutilizável
export const GlassPanel = ({ children, className }) => (
  <div className={`
    bg-white/5 backdrop-blur-xl 
    border border-white/10 rounded-xl 
    p-4 ${className}
  `}>
    {children}
  </div>
);
```

### Benefícios
✅ Padrões comprovados
✅ Escalabilidade
✅ Manutenibilidade
✅ Reutilização de código

### Desvantagens
❌ Requer refatoração
❌ Tempo de implementação

---

## 4️⃣ USAR COMO BIBLIOTECA — Importar Componentes React

### O Que É?
Publicar open-generative-ai como pacote npm e importar componentes em seus projetos.

### Como Fazer?

```bash
# 1. Publicar no npm
cd packages/studio
npm publish

# 2. Instalar em outro projeto
npm install @open-generative-ai/studio

# 3. Usar componentes
import { ImageStudio, VideoStudio } from '@open-generative-ai/studio';
```

### Exemplo de Uso

```jsx
// Seu projeto: NutriDesign
import { ImageStudio } from '@open-generative-ai/studio';

export const NutriDesignPage = () => {
  return (
    <div>
      <h1>Gerar Imagens de Pratos</h1>
      <ImageStudio 
        apiKey={process.env.VITE_MUAPI_API_KEY}
        onImageGenerated={(url) => {
          // Salvar imagem
          saveFoodImage(url);
        }}
      />
    </div>
  );
};
```

### Casos de Uso

#### A. **Múltiplos Projetos Compartilhando UI**
```
Projeto 1: NutriImage
Projeto 2: RecipeVideo
Projeto 3: NutriDesign
    ↓
Todos usam @open-generative-ai/studio
```

#### B. **Integração com FitJourney**
```typescript
// FitJourney usa componentes do open-generative-ai
import { ImageStudio } from '@open-generative-ai/studio';

export const MealImageGenerator = () => {
  return <ImageStudio apiKey={MUAPI_KEY} />;
};
```

### Benefícios
✅ Reutilização máxima
✅ Sem duplicação
✅ Atualizações centralizadas
✅ Versionamento semântico

### Desvantagens
❌ Requer publicação no npm
❌ Gerenciamento de versões
❌ Compatibilidade entre versões

---

## 5️⃣ ESTENDER COM NOVOS MODELOS — Adicionar Funcionalidades

### O Que É?
Adicionar novos modelos de IA ou funcionalidades ao open-generative-ai.

### Como Fazer?

```typescript
// packages/studio/src/models.js
export const t2iModels = [
  // Modelos existentes...
  
  // Novo modelo: Gerador de Pratos Nutricionais
  {
    id: 'nutri-food-gen',
    name: 'Nutritional Food Generator',
    endpoint: 'nutri-food-gen',
    inputs: {
      cuisine: ['brazilian', 'italian', 'asian', 'mediterranean'],
      calories: ['low', 'medium', 'high'],
      macros: ['high-protein', 'balanced', 'low-carb', 'keto'],
      dietary_restrictions: ['vegan', 'gluten-free', 'dairy-free', 'none']
    }
  }
];
```

### Casos de Uso

#### A. **Novo Studio: Nutrition Studio**
```typescript
// packages/studio/src/components/NutritionStudio.jsx
export const NutritionStudio = ({ apiKey }) => {
  const [selectedMacros, setSelectedMacros] = useState('balanced');
  const [selectedCuisine, setSelectedCuisine] = useState('brazilian');
  
  const generateNutritionalMeal = async (prompt) => {
    const response = await generateImage({
      model: 'nutri-food-gen',
      prompt,
      macros: selectedMacros,
      cuisine: selectedCuisine
    });
    return response;
  };

  return (
    <div>
      <select onChange={(e) => setSelectedMacros(e.target.value)}>
        <option>High Protein</option>
        <option>Balanced</option>
        <option>Low Carb</option>
      </select>
      {/* ... resto do componente */}
    </div>
  );
};
```

#### B. **Novo Modelo: Meal Plan Video Generator**
```typescript
export const t2vModels = [
  // Modelos existentes...
  
  {
    id: 'meal-plan-video',
    name: 'Meal Plan Video Generator',
    endpoint: 'meal-plan-video',
    inputs: {
      meals: ['breakfast', 'lunch', 'dinner'],
      duration: ['30s', '60s', '90s'],
      style: ['professional', 'casual', 'educational']
    }
  }
];
```

#### C. **Novo Modelo: Nutrition Label Generator**
```typescript
export const imageModels = [
  {
    id: 'nutrition-label-gen',
    name: 'Nutrition Label Generator',
    endpoint: 'nutrition-label-gen',
    inputs: {
      calories: 'number',
      protein_g: 'number',
      carbs_g: 'number',
      fat_g: 'number',
      style: ['modern', 'classic', 'minimal']
    }
  }
];
```

### Benefícios
✅ Extensibilidade
✅ Novos recursos
✅ Customização
✅ Inovação contínua

### Desvantagens
❌ Requer conhecimento de API
❌ Testes necessários
❌ Manutenção de novos modelos

---

## 📋 COMPARAÇÃO: Qual Abordagem Escolher?

| Abordagem | Esforço | Controle | Reutilização | Custo | Melhor Para |
|-----------|:-------:|:--------:|:------------:|:-----:|-----------|
| **Fork + Customizar** | Alto | Total | Baixa | Médio | Novo projeto independente |
| **Integração Direta** | Baixo | Médio | Alta | Médio | Adicionar features ao FitJourney |
| **Copiar Padrões** | Médio | Total | Alta | Baixo | Melhorar arquitetura |
| **Usar como Biblioteca** | Médio | Baixo | Muito Alta | Baixo | Múltiplos projetos |
| **Estender Modelos** | Médio | Alto | Alta | Médio | Novos recursos |

---

## 🎯 RECOMENDAÇÕES POR CENÁRIO

### Cenário 1: Melhorar FitJourney com Imagens
```
Recomendação: Integração Direta (#2)
├── Adicione geração de imagens de pratos
├── Use Muapi.ai API
├── Melhore UX com visualizações
└── Custo: ~$10-50/mês
```

### Cenário 2: Criar Novo Projeto de Nutrição
```
Recomendação: Fork + Customizar (#1)
├── Crie "NutriImage" — Galeria de pratos
├── Customize modelos para nutrição
├── Monetize com API key própria
└── Controle total
```

### Cenário 3: Melhorar Arquitetura do FitJourney
```
Recomendação: Copiar Padrões (#3)
├── Refatore em packages/
├── Implemente monorepo
├── Melhore manutenibilidade
└── Sem custo adicional
```

### Cenário 4: Múltiplos Projetos Compartilhando UI
```
Recomendação: Usar como Biblioteca (#4)
├── Publique @open-generative-ai/studio no npm
├── Use em FitJourney, NutriImage, RecipeVideo
├── Atualizações centralizadas
└── Máxima reutilização
```

### Cenário 5: Adicionar Novos Recursos
```
Recomendação: Estender Modelos (#5)
├── Crie NutritionStudio
├── Adicione modelos de nutrição
├── Integre com FitJourney
└── Inovação contínua
```

---

## 🚀 PRÓXIMOS PASSOS

### Imediato (Esta Semana)
- [ ] Decidir qual abordagem usar
- [ ] Criar documento de arquitetura
- [ ] Estimar esforço e custo

### Curto Prazo (Este Mês)
- [ ] Implementar abordagem escolhida
- [ ] Criar POC (Proof of Concept)
- [ ] Testar com usuários

### Médio Prazo (Este Trimestre)
- [ ] Deploy em produção
- [ ] Monitorar performance
- [ ] Coletar feedback

---

## 📞 DÚVIDAS FREQUENTES

### P: Posso usar open-generative-ai comercialmente?
**R**: Sim! É open-source (MIT license). Você pode usar, modificar e vender.

### P: Preciso pagar para usar Muapi.ai?
**R**: Sim, Muapi.ai cobra por geração. Mas você pode usar modelos locais (sd.cpp) gratuitamente.

### P: Posso integrar com FitJourney sem modificar o código?
**R**: Sim! Use a API Muapi.ai diretamente (abordagem #2).

### P: Qual é o melhor para começar?
**R**: Comece com **Integração Direta (#2)** — é rápido e baixo risco.

### P: Posso usar múltiplas abordagens?
**R**: Sim! Por exemplo: Integração Direta (#2) + Copiar Padrões (#3).

---

## 📚 Recursos

- **Repositório**: https://github.com/anil-matcha/open-generative-ai
- **Muapi.ai**: https://muapi.ai
- **Documentação**: https://github.com/anil-matcha/open-generative-ai/blob/main/README.md
- **Modelos Suportados**: 200+ (Flux, Nano Banana, Seedream, Kling, Sora, etc.)

---

**Qual abordagem você quer explorar primeiro?** 🚀

