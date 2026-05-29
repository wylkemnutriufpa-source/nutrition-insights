# Guia — Template Prático Café da Manhã

**Status:** ✅ PRONTO PARA USAR  
**Data:** 28 de Maio de 2026  
**Objetivo:** Template prático e editável com lógica completa de substituições

---

## 📋 O Que Este Template Oferece

### ✅ Café da Manhã (6 Opções)
```
Pão integral + Ovo
Pão integral + Queijo
Tapioca + Ovo
Tapioca + Queijo
Cuscuz + Ovo
Cuscuz + Queijo
```

### ✅ Lanches (Conforme Objetivo)
- **Emagrecimento:** Frutas (Maçã, Banana, Laranja)
- **Hipertrofia:** Vitamina de frutas com aveia (em desenvolvimento)

### ✅ Almoço (Proteína + Arroz + Feijão)
```
Frango + Arroz + Feijão
Peixe + Arroz + Feijão
Carne vermelha + Arroz + Feijão
```

### ✅ Lanche da Tarde
```
Iogurte natural
Mix de castanhas
```

### ✅ Jantar (Proteína + Arroz, SEM Feijão)
```
Frango + Arroz
Peixe + Arroz
Carne vermelha + Arroz
```

---

## 🚀 Como Usar

### 1. Inserir o Template no Banco

```bash
# Copie o conteúdo de TEMPLATE_PRATICO_CAFE_COMPLETO.sql
# E execute no Supabase SQL Editor
```

### 2. Aplicar ao Paciente

No editor V3:
1. Selecione o paciente
2. Clique em "Carregar Template"
3. Escolha "Prático Café da Manhã"
4. O template carregará com todas as 6 opções de café

### 3. Editar Conforme Necessário

- **Café:** Escolha entre as 6 opções
- **Lanches:** Selecione frutas ou vitamina conforme objetivo
- **Almoço:** Escolha proteína e acompanhamentos
- **Jantar:** Escolha proteína (sem feijão)
- **Quantidades:** Todas editáveis

---

## 📊 Estrutura de Dados

### Café da Manhã
```json
{
  "primary": "Pão integral + Ovo (280 kcal)",
  "substitutions": [
    "Pão integral + Queijo (290 kcal)",
    "Tapioca + Ovo (275 kcal)",
    "Tapioca + Queijo (285 kcal)",
    "Cuscuz + Ovo (280 kcal)",
    "Cuscuz + Queijo (290 kcal)"
  ]
}
```

### Almoço
```json
{
  "primary": "Frango + Arroz + Feijão (450 kcal)",
  "substitutions": [
    "Peixe + Arroz + Feijão (440 kcal)",
    "Carne vermelha + Arroz + Feijão (460 kcal)"
  ]
}
```

### Jantar
```json
{
  "primary": "Frango + Arroz (380 kcal)",
  "substitutions": [
    "Peixe + Arroz (370 kcal)",
    "Carne vermelha + Arroz (390 kcal)"
  ]
}
```

---

## 🎯 Níveis Calóricos Suportados

- ✅ 1200 kcal (implementado)
- ⏳ 1500 kcal (em desenvolvimento)
- ⏳ 1800 kcal (em desenvolvimento)
- ⏳ 2000 kcal (em desenvolvimento)
- ⏳ 2500 kcal (em desenvolvimento)

---

## 🔧 Customizações Possíveis

### Adicionar Novo Café
```sql
-- Adicione um novo item em substitutions do café
{
  "id": "cafe-novo-1200",
  "title": "Seu novo café",
  "quantity_display": "descrição",
  "quantity": 150,
  "clinical_mass_g": 150,
  "kcal": 280,
  "macros": {...},
  "visual": {"image_url": "..."},
  "is_primary": false
}
```

### Mudar Objetivo do Lanche
Para hipertrofia, substitua o lanche de frutas por:
```json
{
  "id": "lanche-vitamina-1200",
  "title": "Vitamina de frutas com aveia",
  "quantity_display": "1 copo",
  "quantity": 300,
  "clinical_mass_g": 300,
  "kcal": 250,
  "macros": {"kcal": 250, "protein_g": 8, "carbs_g": 40, "fat_g": 5},
  "visual": {"image_url": "..."}
}
```

---

## 📸 Imagens Utilizadas

Todas as imagens são de fontes públicas (Unsplash):
- Pão: `https://images.unsplash.com/photo-1541519227354-08fa5d50c44d`
- Ovo: `https://images.unsplash.com/photo-1585238341710-4b4e6cefc688`
- Queijo: `https://images.unsplash.com/photo-1452895917121-33c76319b7fb`
- Frango: `https://images.unsplash.com/photo-1598103442097-8b74394b95c6`
- Peixe: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c`
- Carne: `https://images.unsplash.com/photo-1432139555190-58524dae6a55`
- Frutas: `https://images.unsplash.com/photo-1560806674-d257a3f67b51`

---

## ✅ Checklist de Implementação

- [x] Café da manhã com 6 opções
- [x] Lanches conforme objetivo
- [x] Almoço com proteína + arroz + feijão
- [x] Jantar com proteína + arroz (sem feijão)
- [x] Todas as refeições editáveis
- [x] Imagens do banco
- [x] Macros calculados
- [x] Substituições configuradas
- [ ] Todos os níveis calóricos (1200-2500)
- [ ] Teste com Igor

---

## 🚀 Próximos Passos

1. **Executar SQL:** Insira o template no banco
2. **Testar:** Aplique ao paciente Igor
3. **Validar:** Verifique se as substituições funcionam
4. **Expandir:** Crie versões para outros níveis calóricos
5. **Refinar:** Ajuste conforme feedback

---

**Status:** 🟢 PRONTO PARA TESTE  
**Criado por:** Kiro Agent  
**Data:** 28 de Maio de 2026

