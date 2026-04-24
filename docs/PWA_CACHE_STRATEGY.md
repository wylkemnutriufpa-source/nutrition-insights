# PWA — Configuração e Estratégia de Cache

> **Arquivos relevantes:** `vite.config.ts` (bloco `VitePWA`), `src/main.tsx`
> (guarda anti-iframe), `src/components/common/UpdateBanner.tsx`
> (registro manual via `useRegisterSW`), `src/lib/pwaUpdate.ts`
> (limpeza de caches + reload), `src/lib/chunkHashValidator.ts`
> (detecção de mismatch CDN/SW).

## Resumo executivo

A configuração PWA do FitJourney foi desenhada para **NUNCA reusar bundles
antigos após um deploy**, mesmo em PWAs instaladas (iOS/Android). Esta
garantia é dada por 4 camadas:

1. **Asset hashing** (Vite/Rollup): cada chunk recebe `[hash]` no nome
   (`assets/[name]-[hash].js`). Um deploy gera nomes diferentes → nenhuma
   reaproveitamento de cache HTTP.
2. **`registerType: "autoUpdate"` + `skipWaiting`/`clientsClaim`** no Workbox:
   o SW novo é baixado e ativado sem esperar o usuário fechar todas as abas.
3. **Cache busting de runtime** no `UpdateBanner`: `clearRuntimeCaches()` +
   hard reload com `?refresh=ts` quando o usuário aceita a atualização.
4. **Validação de chunk hash** (`chunkHashValidator.ts`): após boot, compara
   `__BUILD_INFO__.shortHash` com hashes dos `<script>/<link>` no DOM e
   alerta visualmente (BuildStatusPanel) caso o navegador esteja servindo
   bundle antigo.

## Estratégias de cache (`runtimeCaching`)

| Padrão URL                                    | Strategy        | Justificativa                                          |
| --------------------------------------------- | --------------- | ------------------------------------------------------ |
| `*.supabase.co/rest/v1/*`                     | **NetworkOnly** | Dados clínicos críticos — nunca servir cache stale     |
| `*.supabase.co/functions/*`                   | **NetworkOnly** | Edge functions retornam estado vivo — sem cache        |
| `*.supabase.co/auth/*`                        | **NetworkOnly** | Tokens/sessões — qualquer cache é risco de segurança   |
| `*.supabase.co/storage/v1/*`                  | **CacheFirst**  | Imagens/arquivos estáticos com URL versionada          |
| `*.{woff,woff2,ttf,otf,eot}`                  | **CacheFirst**  | Fontes raramente mudam (TTL 30d)                       |
| **Demais assets do app** (`.js`/`.css`/`.html`) | Precache (SW)  | Nomes com `[hash]` invalidam automaticamente em deploy |

## Scope e navegação

- **`scope: "/"`** + **`start_url: "/"`**: o SW controla toda a aplicação,
  incluindo deep links.
- **`navigateFallback: "/index.html"`** com **`navigateFallbackDenylist`**:
  - `^/~oauth` (OAuth callback bypass)
  - `^/api` (rotas backend nunca caem em SPA fallback)
- **`globPatterns`**: precache somente `js/css/html/ico/png/svg/woff2`.
- **`maximumFileSizeToCacheInBytes: 3 MiB`**: limite seguro para evitar
  caching de bundles obesos por engano.
- **`cleanupOutdatedCaches: true`**: remove caches de versões anteriores do
  Workbox automaticamente.

## Por que isto previne "bundle antigo após deploy"

Cenário típico que causa o bug:

```
Deploy A:  /index.html → /assets/main-AAAAAA.js
Deploy B:  /index.html → /assets/main-BBBBBB.js   ← (5 min depois)
```

Sem hashing, o browser pediria `main.js` e o SW devolveria a versão A em
cache. **Com `[hash]` no nome**:

- O `index.html` (não cacheado pelo SW por ser o navigate fallback dinâmico)
  vem com referências a `main-BBBBBB.js`.
- O browser não tem `BBBBBB` em cache → busca da rede → recebe via
  `precacheAndRoute` ou network direto.
- O chunk antigo (`AAAAAA`) é descartado por `cleanupOutdatedCaches`.

**Garantia adicional:** `chunkHashValidator.ts` roda 500ms após boot e, se
detectar que `BUILD_INFO.shortHash` não aparece em nenhum `<script>/<link>`
do DOM, sinaliza **mismatch** no BuildStatusPanel com botão "Limpar cache e
recarregar" pronto para usar.

## Comportamento em iOS PWA (instalada)

iOS Safari tem cache de Service Worker mais agressivo. O `UpdateBanner`
detecta `isIosStandalone()` e **não força reload automático**: pede para o
usuário "Reabrir app" — isso evita reloads em loop dentro do shell PWA.

## Como testar manualmente

1. Faça um build local: `bun run build && bun run preview`.
2. Abra DevTools → Application → Service Workers e veja `activated`.
3. Inspecione o `<html>`: deve ter `data-build-hash="xxxxxxxx"`.
4. No console: `__BUILD_INFO__` retorna `{ hash, timestamp, mode }`.
5. Ative `?debug=build` para ver o BuildStatusPanel + validação de chunks.
6. Faça outro build (basta tocar em qualquer arquivo) e recarregue a aba —
   o banner "Nova versão disponível" deve aparecer.

## Garantias automatizadas

- **`e2e/templates-label-and-build-identity.spec.ts`** — confirma
  `__BUILD_INFO__` e ausência do texto legado.
- **`e2e/templates-label-prod-sw.spec.ts`** — roda contra build de produção
  com SW ativo, valida estado `activated`, e percorre navegação + 2 reloads
  garantindo que nenhum cenário de cache reintroduz o rótulo antigo.
- **`src/test/pwaUpdate.test.ts`** — versão dismissed expira em mudança de
  SW, normalização de URL.

## Quando NÃO mexer

- Não troque `registerType` para `"prompt"` sem coordenar com `UpdateBanner`
  (ele já controla o prompt manualmente).
- Não adicione **outros padrões `NetworkFirst`** para Supabase REST sem
  revisar implicações clínicas (risco de servir adesão/peso/refeição
  desatualizados).
- Não desligue `cleanupOutdatedCaches` — sem isso, caches antigos se
  acumulam e podem sobrepor chunks novos em condições raras.
