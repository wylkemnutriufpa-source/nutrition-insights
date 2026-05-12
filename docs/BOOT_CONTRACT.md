# BOOT CONTRACT — FITJOURNEY V2

Este documento define a estrutura obrigatória e as regras de inicialização do sistema para garantir estabilidade e impedir desmontagem acidental da infraestrutura base.

## Árvore de Providers Obrigatória

O bootstrap do sistema DEVE seguir esta hierarquia exata:

```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <TooltipProvider>
      <BrowserRouter>
        <AppShell>
          {/* Rotas e Conteúdo */}
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
</QueryClientProvider>
```

## Regras de Ouro

1.  **Imutabilidade da Infraestrutura**: Alterações em `src/core/app-shell` exigem aprovação arquitetural e validação via smoke tests.
2.  **Entrypoint Único**: `main.tsx` é o único ponto de entrada. Nenhuma lógica de branch V1/V2 deve existir nele.
3.  **Isolamento de Compatibilidade**: O `CompatibilityFallback` deve ser um componente passivo. Ele NÃO deve importar hooks de domínio, stores ou realizar chamadas de rede.
4.  **Anti-Destruição**: Removê-lo ou alterar a ordem dos providers quebrará o contrato de boot e deve ser detectado por testes automatizados.

## Estrutura de Domínio

- `src/core/`: Infraestrutura soberana (AppShell, Providers, Router, Guards).
- `src/features/`: Domínio funcional e regras de negócio.
- `src/modules/`: Experimentos, protótipos e novas funcionalidades em desenvolvimento.
- `src/legacy/`: Código de compatibilidade e pontes para o sistema antigo.

**PROIBIDO**: Features ou Módulos importarem `src/legacy` diretamente.
