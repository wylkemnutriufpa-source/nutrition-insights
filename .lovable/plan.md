O isolamento em uma branch separada resolve sim o problema de complexidade, pois podemos "limpar o terreno". Mesmo que a branch herde o código antigo por padrão, nós podemos simplesmente deletar as pastas legadas nesta branch, mantendo apenas o motor novo e a infraestrutura básica (como conexão com banco de dados).

Aqui está o plano para garantir que o **FitJourney 2.0** seja totalmente limpo:

### 1. Limpeza do Legado (Nesta Branch)
- Remover as pastas legadas que causam confusão: `src/pages/`, `src/components/`, `src/hooks/`, `src/features/`.
- Manter apenas a infraestrutura essencial: `src/integrations/` (Supabase), `src/lib/` e arquivos de configuração.

### 2. Re-implementação do Motor FitJourney 2.0
- Criar a pasta central: `src/modules/FitJourney2/`.
- Re-inserir o motor otimizado:
  - `domain-logic.ts`: Regras de cálculo (sem arroz e azeite infinito).
  - `meal-builder.ts`: Montagem de refeições equilibradas.
  - `plan-generator.ts`: Orquestrador principal.
  - `database.ts`: Dados fixos (marmitas e itens de café).

### 3. Novo Entry Point
- Configurar o `App.tsx` para renderizar **apenas** o novo sistema quando estivermos nesta branch.

### Detalhes Técnicos
- Utilizaremos a mesma infraestrutura de build (Vite/Tailwind), mas o código de negócio será 100% novo.
- Isso elimina o "código morto" porque o compilador nem chegará a olhar para as pastas antigas (já que elas serão deletadas ou ignoradas).

**Deseja que eu proceda com a limpeza das pastas legadas para deixar o ambiente 100% FitJourney 2.0?**