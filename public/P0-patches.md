# P0 — Patches de Correção

> Aplique na ordem. Cada seção = 1 commit isolado.

---

## 1. `server.py` — Logger antes da definição

**Problema:** `logger` usado em `analyze_meal` antes de ser definido no final do arquivo.

```diff
 # server.py — TOPO DO ARQUIVO (após imports)

 from fastapi import FastAPI
 from fastapi.middleware.cors import CORSMiddleware
+import logging
+
+logger = logging.getLogger(__name__)

 app = FastAPI()
```

```diff
 # server.py — REMOVER definição duplicada do final do arquivo

-import logging
-logger = logging.getLogger(__name__)
```

**Teste:** Chamar `POST /analyze-meal` — não deve mais dar `NameError`.

---

## 2. `features.py` — Fail-open → Fail-closed

**Problema:** Se a conexão com Supabase falhar, o sistema libera acesso (`"allowed": True`).

```diff
 # features.py — dentro do bloco except

 except Exception as e:
-    logger.error(f"Error checking feature access: {e}")
-    return {"allowed": True, "reason": "default_allow"}
+    logger.error(f"Error checking feature access: {e}")
+    return {"allowed": False, "reason": "service_unavailable"}
```

**Teste:** Derrubar Supabase temporariamente → endpoint deve retornar `403`, não `200`.

---

## 3. `AuthContext.js` — Remover dados sensíveis do localStorage

**Problema:** `patient_id` e `user_type` em `localStorage` são vulneráveis a XSS.

```diff
 # AuthContext.js — na função de login/setSession

 const handleSession = (session) => {
   if (session?.user) {
-    localStorage.setItem('patient_id', session.user.user_metadata?.patient_id);
-    localStorage.setItem('user_type', session.user.user_metadata?.user_type);
     setUser(session.user);
+    // Derivar do JWT em vez de persistir no localStorage
+    setPatientId(session.user.user_metadata?.patient_id ?? null);
+    setUserType(session.user.user_metadata?.user_type ?? null);
   }
 };
```

```diff
 # AuthContext.js — na função de logout

 const handleLogout = async () => {
   await supabase.auth.signOut();
-  localStorage.removeItem('patient_id');
-  localStorage.removeItem('user_type');
+  setPatientId(null);
+  setUserType(null);
   setUser(null);
 };
```

```diff
 # AuthContext.js — nos componentes que LEEM do localStorage

-const patientId = localStorage.getItem('patient_id');
-const userType = localStorage.getItem('user_type');
+// Usar via Context
+const { patientId, userType } = useAuth();
```

```diff
 # AuthContext.js — adicionar estados no Provider

 const AuthProvider = ({ children }) => {
   const [user, setUser] = useState(null);
+  const [patientId, setPatientId] = useState(null);
+  const [userType, setUserType] = useState(null);

   // ...

   return (
-    <AuthContext.Provider value={{ user, signIn, signOut }}>
+    <AuthContext.Provider value={{ user, patientId, userType, signIn, signOut }}>
       {children}
     </AuthContext.Provider>
   );
 };
```

**Teste:** Login → abrir DevTools → `Application > Local Storage` → confirmar que `patient_id` e `user_type` não existem mais. Funcionalidade deve continuar via Context.

---

## 4. `server.py` — CORS seguro para produção

**Problema:** `CORSMiddleware` com `allow_origins=["*"]` e adicionado após as rotas.

```diff
 # server.py — MOVER CORS para ANTES de app.include_router()
 # e restringir origens

+ALLOWED_ORIGINS = [
+    "https://seu-dominio-producao.com",
+    "https://app.seu-dominio.com",
+]
+
+if os.getenv("ENVIRONMENT") == "development":
+    ALLOWED_ORIGINS.append("http://localhost:3000")
+
+app.add_middleware(
+    CORSMiddleware,
+    allow_origins=ALLOWED_ORIGINS,
+    allow_credentials=True,
+    allow_methods=["GET", "POST", "PUT", "DELETE"],
+    allow_headers=["Authorization", "Content-Type"],
+)

 app.include_router(api_router, prefix="/api")

-# REMOVER o bloco CORS antigo que estava após include_router
-app.add_middleware(
-    CORSMiddleware,
-    allow_origins=["*"],
-    allow_credentials=True,
-    allow_methods=["*"],
-    allow_headers=["*"],
-)
```

**Teste:** Request de origem não listada → deve retornar erro CORS. Request de origem listada → deve funcionar normalmente.

---

## Ordem de aplicação recomendada

| # | Arquivo | Risco de regressão |
|---|---------|-------------------|
| 1 | `server.py` (logger) | Nenhum |
| 2 | `features.py` (fail-closed) | Baixo — testar fluxo de features |
| 3 | `AuthContext.js` (localStorage) | Médio — testar login/logout completo |
| 4 | `server.py` (CORS) | Médio — testar em dev e prod |

> **Importante:** Substitua `"https://seu-dominio-producao.com"` pelos domínios reais do seu projeto.
