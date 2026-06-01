# 🎉 Open Generative AI — 100% GRATUITO E OPEN-SOURCE

## 📊 Resumo Executivo

**Open Generative AI é completamente gratuito e open-source!**

- ✅ **Código aberto** — MIT License (use, modifique, venda)
- ✅ **Sem custo** — Nenhuma taxa de licença
- ✅ **Modelos locais** — Rode tudo no seu servidor
- ✅ **200+ modelos** — Flux, Nano Banana, Seedream, Kling, Sora, etc.
- ✅ **Desktop app** — Electron (macOS, Windows, Linux)
- ✅ **Web version** — Next.js (self-hosted)

---

## 💰 Modelo de Custo

### Opção 1: Usar Muapi.ai (Pago)
```
- Flux Dev: ~$0.01-0.05 por imagem
- Nano Banana: ~$0.005-0.02 por imagem
- Vídeos: ~$0.10-0.50 por vídeo
- Custo mensal: ~$10-100 (dependendo do uso)
```

### Opção 2: Usar Modelos Locais (GRATUITO) ⭐
```
- sd.cpp (bundled) — Roda no seu computador
- Modelos: SD 1.5, SDXL, Z-Image, Dreamshaper
- Custo: $0 (apenas energia do computador)
- Velocidade: Depende do hardware
```

### Opção 3: Usar Wan2GP (GRATUITO) ⭐
```
- Roda em seu próprio servidor GPU
- Modelos: Flux, Qwen-Image, Wan 2.2, Hunyuan, LTX
- Custo: $0 (apenas energia do servidor)
- Velocidade: Rápida (com GPU NVIDIA/AMD)
```

---

## 🚀 Como Usar GRATUITAMENTE

### Cenário 1: Desktop App com Modelos Locais

```bash
# 1. Clone o repositório
git clone --recurse-submodules https://github.com/Anil-matcha/Open-Generative-AI.git
cd Open-Generative-AI

# 2. Setup
npm run setup

# 3. Rode o desktop app
npm run electron:dev

# 4. Na interface:
# - Vá para Settings → Local Models
# - Instale sd.cpp (one-click)
# - Baixe um modelo (ex: Dreamshaper 8 — 2.1 GB)
# - Gere imagens GRATUITAMENTE
```

**Custo**: $0 (apenas energia do computador)

### Cenário 2: Web Version Self-Hosted

```bash
# 1. Clone
git clone --recurse-submodules https://github.com/Anil-matcha/Open-Generative-AI.git
cd Open-Generative-AI

# 2. Setup
npm run setup

# 3. Build
npm run build

# 4. Deploy em seu servidor
npm run start

# 5. Acesse em http://seu-servidor:3000
```

**Custo**: $0 (apenas hosting do servidor)

### Cenário 3: Usar Wan2GP (Modelos Avançados)

```bash
# 1. No seu servidor GPU (NVIDIA/AMD)
git clone https://github.com/deepbeepmeep/Wan2GP
cd Wan2GP
./install.sh
python wgp.py --listen --server-name 0.0.0.0

# 2. No desktop app
# - Settings → Local Models → Wan2GP server
# - Cole: http://seu-servidor:7860
# - Teste e salve

# 3. Gere vídeos e imagens GRATUITAMENTE
```

**Custo**: $0 (apenas energia do servidor GPU)

---

## 📊 Comparação: Muapi.ai vs Modelos Locais

| Aspecto | Muapi.ai (Pago) | Modelos Locais (Gratuito) |
|---------|:---------------:|:------------------------:|
| **Custo** | $0.01-0.50/geração | $0 |
| **Velocidade** | Rápida (cloud) | Depende do hardware |
| **Qualidade** | Excelente | Boa (SD 1.5) a Excelente (Flux local) |
| **Privacidade** | Dados na cloud | Dados locais |
| **Modelos** | 200+ | 6-10 (locais) |
| **Setup** | Fácil (API key) | Médio (download modelos) |
| **Escalabilidade** | Ilimitada | Limitada ao hardware |

---

## 🎯 Recomendação para FitJourney

### Opção A: Usar Modelos Locais (Recomendado)
```
Vantagens:
✅ Custo zero
✅ Privacidade total (dados locais)
✅ Sem dependência de API externa
✅ Controle total

Desvantagens:
❌ Requer GPU/CPU potente
❌ Mais lento que cloud
❌ Modelos menos avançados

Implementação:
1. Rode sd.cpp localmente
2. Integre com FitJourney
3. Gere imagens de pratos GRATUITAMENTE
```

### Opção B: Usar Wan2GP (Melhor Qualidade)
```
Vantagens:
✅ Custo zero
✅ Modelos avançados (Flux, Qwen)
✅ Vídeos de alta qualidade
✅ Privacidade total

Desvantagens:
❌ Requer servidor GPU
❌ Setup mais complexo
❌ Custo de energia do servidor

Implementação:
1. Configure Wan2GP em servidor GPU
2. Integre com FitJourney
3. Gere imagens e vídeos GRATUITAMENTE
```

### Opção C: Usar Muapi.ai (Mais Fácil)
```
Vantagens:
✅ Setup simples (API key)
✅ Modelos mais avançados
✅ Rápido e confiável
✅ Sem hardware necessário

Desvantagens:
❌ Custo por geração (~$0.01-0.50)
❌ Dados na cloud
❌ Dependência de API externa

Implementação:
1. Crie conta em Muapi.ai
2. Obtenha API key
3. Integre com FitJourney
4. Pague conforme usar (~$10-100/mês)
```

---

## 🛠️ Implementação: Integrar com FitJourney (Gratuito)

### Passo 1: Usar sd.cpp Localmente

```typescript
// src/lib/localImageGeneration.ts
import axios from 'axios';

export const generateFoodImageLocally = async (prompt: string) => {
  // Assumindo sd.cpp rodando em localhost:8080
  const response = await axios.post('http://localhost:8080/api/generate', {
    prompt,
    steps: 20,
    guidance_scale: 7.5,
    height: 512,
    width: 512
  });

  return response.data.image_url;
};
```

### Passo 2: Usar em MealPlanEditor

```typescript
// src/components/MealPlanEditor.tsx
import { generateFoodImageLocally } from '@/lib/localImageGeneration';

export const MealPlanEditor = () => {
  const generateMealImage = async (mealDescription: string) => {
    const prompt = `Professional food photography: ${mealDescription}, 
                    high quality, appetizing, studio lighting`;
    
    try {
      const imageUrl = await generateFoodImageLocally(prompt);
      
      // Salvar no banco
      await supabase
        .from('meal_plan_items')
        .update({ generated_image_url: imageUrl })
        .eq('id', mealItemId);
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
    }
  };

  return (
    <div>
      <button onClick={() => generateMealImage('Frango com arroz e brócolis')}>
        Gerar Imagem
      </button>
    </div>
  );
};
```

### Passo 3: Deploy

```bash
# 1. No servidor FitJourney, rode sd.cpp
docker run -p 8080:8080 sd-cpp-server

# 2. Configure FitJourney para usar localhost:8080
# 3. Gere imagens GRATUITAMENTE
```

---

## 📦 Modelos Disponíveis Localmente

### sd.cpp (Bundled)

| Modelo | Tipo | Tamanho | Velocidade | Qualidade |
|--------|------|--------|-----------|-----------|
| **Z-Image Turbo** | Diffusion Transformer | 2.5 GB | Rápida | Boa |
| **Z-Image Base** | Diffusion Transformer | 3.5 GB | Média | Excelente |
| **Dreamshaper 8** | SD 1.5 | 2.1 GB | Rápida | Boa |
| **Realistic Vision v5.1** | SD 1.5 | 2.1 GB | Rápida | Excelente |
| **Anything v5** | SD 1.5 | 2.1 GB | Rápida | Boa (anime) |
| **SDXL Base 1.0** | SDXL | 6.9 GB | Lenta | Excelente |

### Wan2GP (Remote Server)

| Modelo | Tipo | Qualidade | Velocidade |
|--------|------|-----------|-----------|
| **Flux.1 Dev** | Image | Excelente | Média |
| **Qwen Image** | Image | Excelente | Média |
| **Wan 2.2** | Video | Excelente | Lenta |
| **Hunyuan Video** | Video | Excelente | Lenta |
| **LTX Video** | Video | Excelente | Rápida |

---

## 💡 Casos de Uso Gratuitos para FitJourney

### 1. Gerar Imagens de Pratos
```
Fluxo:
1. Nutricionista cria plano
2. Sistema gera imagens de cada prato (sd.cpp)
3. Paciente vê plano com imagens
4. Melhor engajamento
Custo: $0
```

### 2. Criar Galeria de Alimentos
```
Fluxo:
1. Gere imagens de 500 alimentos comuns
2. Armazene localmente
3. Reutilize em todos os planos
4. Custo único: ~2 horas de processamento
Custo: $0
```

### 3. Gerar Vídeos de Receitas
```
Fluxo:
1. Use Wan2GP para gerar vídeos
2. Crie tutoriais de receitas
3. Compartilhe com pacientes
4. Melhor educação nutricional
Custo: $0 (apenas energia do servidor)
```

### 4. Criar Infográficos Nutricionais
```
Fluxo:
1. Gere imagens de infográficos
2. Customize com dados do paciente
3. Exporte como PDF
4. Compartilhe com paciente
Custo: $0
```

---

## 🚀 Roadmap: Integração com FitJourney

### Fase 1: Setup Local (Semana 1)
- [ ] Instalar sd.cpp
- [ ] Baixar modelo Dreamshaper 8
- [ ] Testar geração local
- [ ] Documentar setup

### Fase 2: Integração Básica (Semana 2)
- [ ] Criar `localImageGeneration.ts`
- [ ] Integrar com MealPlanEditor
- [ ] Testar com 10 pratos
- [ ] Validar qualidade

### Fase 3: Otimização (Semana 3)
- [ ] Cache de imagens
- [ ] Batch generation
- [ ] Fallback para Muapi.ai (opcional)
- [ ] Monitoramento

### Fase 4: Expansão (Semana 4)
- [ ] Adicionar Wan2GP para vídeos
- [ ] Criar galeria de alimentos
- [ ] Gerar infográficos
- [ ] Deploy em produção

---

## 📊 Economia Estimada

### Cenário: 1000 Imagens/Mês

| Opção | Custo | Tempo Setup | Qualidade |
|-------|:-----:|:----------:|-----------|
| **Muapi.ai** | $10-50 | 1 hora | Excelente |
| **sd.cpp Local** | $0 | 2 horas | Boa |
| **Wan2GP** | $0 | 4 horas | Excelente |

**Economia anual com sd.cpp**: ~$120-600 🎉

---

## 🎓 Recursos

- **Repositório**: https://github.com/anil-matcha/open-generative-ai
- **Documentação**: https://github.com/anil-matcha/open-generative-ai/blob/main/README.md
- **sd.cpp**: https://github.com/leejet/stable-diffusion.cpp
- **Wan2GP**: https://github.com/deepbeepmeep/Wan2GP
- **License**: MIT (use livremente)

---

## ✅ Conclusão

**Open Generative AI é 100% gratuito e open-source!**

Você pode:
- ✅ Usar modelos locais (sd.cpp) — $0
- ✅ Usar Wan2GP — $0
- ✅ Integrar com FitJourney — $0
- ✅ Gerar imagens e vídeos — $0
- ✅ Monetizar seu projeto — Sim!

**Recomendação**: Comece com **sd.cpp local** para máxima economia e privacidade. 🚀

