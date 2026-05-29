# Configuração Vercel — Passo a Passo

**Status:** 🔴 EM PROGRESSO  
**Data:** 29 de Maio de 2026  
**Objetivo:** Deploy do FitJourney 2.0 no Vercel

---

## 📋 Configurações Necessárias

Você está na página de configuração do Vercel. Aqui estão os valores exatos que você precisa inserir:

### 1️⃣ **Nome do Projeto**
```
nutrition-insights-fitjourney
```

### 2️⃣ **Diretório Raiz**
```
./
```
(deixe como está, é o padrão)

### 3️⃣ **Comando de Construção (Build Command)**
```
npm run build
```

### 4️⃣ **Diretório de Saída (Output Directory)**
```
dist
```

### 5️⃣ **Comando de Instalação (Installation Command)**
```
npm install
```
(deixe como está, é o padrão)

---

## 🔑 Variáveis de Ambiente

Na seção **"Ambientes"**, você precisa adicionar as seguintes variáveis:

### Para **Produção** e **Pré-visualização**:

| Chave | Valor |
|-------|-------|
| `VITE_SUPABASE_URL` | `https://vkrcobprntictsxqmjjl.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcmNvYnBybnRpY3RzeHFtampsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODgzNjAsImV4cCI6MjA4ODU2NDM2MH0.7EeitVFMX1oFdtDCZpw7t1c6G5gnKjnvOhuScZ83VjU` |

---

## 🎯 Passo a Passo Visual

### PASSO 1: Verificar Configurações Básicas

```
☑️ Equipe Vercel: [Seu nome ou equipe]
☑️ Nome do projeto: nutrition-insights-fitjourney
☑️ Diretório raiz: ./
☑️ Comando de construção: npm run build
☑️ Diretório de saída: dist
```

### PASSO 2: Adicionar Variáveis de Ambiente

1. Clique em **"Ambientes"** (ou **"Environment Variables"**)
2. Selecione **"Produção"** (ou deixe como padrão)
3. Clique em **"Adicionar"** (ou **"Add"**)

**Primeira variável:**
- **Chave:** `VITE_SUPABASE_URL`
- **Valor:** `https://vkrcobprntictsxqmjjl.supabase.co`
- Clique em **"Salvar"** ou **"Add"**

**Segunda variável:**
- **Chave:** `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Valor:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcmNvYnBybnRpY3RzeHFtampsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODgzNjAsImV4cCI6MjA4ODU2NDM2MH0.7EeitVFMX1oFdtDCZpw7t1c6G5gnKjnvOhuScZ83VjU`
- Clique em **"Salvar"** ou **"Add"**

### PASSO 3: Fazer Deploy

1. Clique em **"Implantar"** (ou **"Deploy"**)
2. Aguarde 2-3 minutos
3. Você verá uma mensagem de sucesso

---

## ✅ Checklist

- [ ] Nome do projeto: `nutrition-insights-fitjourney`
- [ ] Diretório raiz: `./`
- [ ] Comando de construção: `npm run build`
- [ ] Diretório de saída: `dist`
- [ ] Variável `VITE_SUPABASE_URL` adicionada
- [ ] Variável `VITE_SUPABASE_PUBLISHABLE_KEY` adicionada
- [ ] Clicou em "Implantar"

---

## 🎉 Resultado Esperado

Após o deploy, você receberá uma URL como:
```
https://nutrition-insights-fitjourney.vercel.app
```

Você poderá acessar seu app em qualquer navegador!

---

## 🚨 Se Algo Der Errado

### Erro: "Build failed"
- Verifique se o comando de construção está correto: `npm run build`
- Verifique se o diretório de saída está correto: `dist`

### Erro: "Cannot find module"
- Verifique se as variáveis de ambiente estão corretas
- Certifique-se que começam com `VITE_`

### Erro: "Supabase connection refused"
- Verifique a URL do Supabase
- Verifique a chave do Supabase
- Certifique-se que o Supabase está online

---

## 📞 Próximos Passos

1. ✅ Completar configuração no Vercel
2. ✅ Fazer deploy
3. ✅ Testar o app online
4. ✅ Validar que os dados aparecem corretamente

---

**Status:** 🔴 AGUARDANDO DEPLOY  
**Data:** 29 de Maio de 2026

