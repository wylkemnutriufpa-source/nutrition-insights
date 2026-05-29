# 🔑 Como Obter Service_role Keys

## ⚠️ IMPORTANTE

**Service_role keys são sensíveis!** Nunca compartilhe ou coloque no `.env` do frontend.

---

## 📍 SUPABASE ANTIGO (Origem)

### Passo 1: Abra Supabase Dashboard
1. Vá em https://app.supabase.com
2. Faça login com suas credenciais
3. Selecione o projeto: **`vkrcobprntictsxqmjjl`**

### Passo 2: Vá em Settings → API
1. Clique em **Settings** (engrenagem no canto inferior esquerdo)
2. Clique em **API** (no menu esquerdo)

### Passo 3: Copie a Service Role Key
1. Procure por **"Service Role Key"** (não Anon Key)
2. Clique no ícone de copiar
3. A chave começa com `eyJ...` e é bem longa
4. Salve em um lugar seguro (ex: arquivo temporário)

**Exemplo:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcmNvYnBybnRpY3RzeHFtampsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk4ODM2MCwiZXhwIjoyMDg4NTY0MzYwfQ.xxxxx...
```

---

## 📍 NOVO SUPABASE (Destino)

### Passo 1: Abra Supabase Dashboard
1. Vá em https://app.supabase.com
2. Faça login com suas credenciais
3. Selecione o projeto: **`bhyyxrllhmisxyobbgfn`**

### Passo 2: Vá em Settings → API
1. Clique em **Settings** (engrenagem no canto inferior esquerdo)
2. Clique em **API** (no menu esquerdo)

### Passo 3: Copie a Service Role Key
1. Procure por **"Service Role Key"** (não Anon Key)
2. Clique no ícone de copiar
3. A chave começa com `eyJ...` e é bem longa
4. Salve em um lugar seguro (ex: arquivo temporário)

**Exemplo:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeXl4cmxsaG1pc3h5b2JiZ2ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2NTI3NiwiZXhwIjoyMDk1NjQxMjc2fQ.xxxxx...
```

---

## ✅ VERIFICAÇÃO

### Como Saber se Copiei a Chave Correta?

**Service_role key:**
- ✅ Começa com `eyJ...`
- ✅ Bem longa (500+ caracteres)
- ✅ Contém `"role":"service_role"` (se decodificar)
- ✅ Está em **Settings → API → Service Role Key**

**Anon key (ERRADA):**
- ❌ Também começa com `eyJ...`
- ❌ Também é longa
- ❌ Contém `"role":"anon"` (se decodificar)
- ❌ Está em **Settings → API → Anon Key**

### Como Decodificar para Verificar?

1. Vá em https://jwt.io
2. Cole a chave no campo "Encoded"
3. Procure por `"role":"service_role"` ou `"role":"anon"`

**Service_role (correto):**
```json
{
  "iss": "supabase",
  "ref": "vkrcobprntictsxqmjjl",
  "role": "service_role",  // ← Correto!
  "iat": 1772988360,
  "exp": 2088564360
}
```

**Anon (errado):**
```json
{
  "iss": "supabase",
  "ref": "vkrcobprntictsxqmjjl",
  "role": "anon",  // ← Errado!
  "iat": 1772988360,
  "exp": 2088564360
}
```

---

## 🚀 PRÓXIMO PASSO

Após obter ambas as service_role keys:

1. Abra `PROMPT_MIGRACAO_LOVABLE.md`
2. Substitua os placeholders:
   ```
   [VOCÊ FORNECERÁ — vá em Supabase → Settings → API → Service Role Key]
   ```
   pela service_role key do Supabase Antigo

3. Substitua o outro placeholder pela service_role key do Novo Supabase

4. Envie o prompt para Lovable

---

## ⚠️ SEGURANÇA

- **Nunca compartilhe service_role keys** em público
- **Nunca coloque em `.env` do frontend**
- **Nunca faça commit no Git**
- **Após migração, delete do seu histórico de chat**
- **Service_role keys devem estar APENAS em Edge Functions**

---

**Pronto! Agora você sabe como obter as chaves! 🔑**
