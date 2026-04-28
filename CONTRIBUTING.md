# Guia de Contribuição - Governança de Schema

Para manter a consistência entre o banco de dados (Supabase) e o frontend, utilizamos um sistema de snapshot de schema.

## Fluxo Obrigatório de Alteração de Schema

Sempre que houver mudanças no banco de dados, siga esta ordem:

1. **Criar Migration**: Crie um novo arquivo `.sql` em `supabase/migrations/`.
2. **Aplicar Migration**: Certifique-se de que a migration está correta e aplicada.
3. **Atualizar Snapshot**:
   ```bash
   npm run schema:update
   ```
4. **Validar Snapshot**:
   ```bash
   npm run schema:verify
   ```
5. **Commit**: Realize o commit tanto da migration quanto do arquivo `src/integrations/supabase/schema-snapshot.json`.

## Governança e CI

O CI (Integração Contínua) falhará se o snapshot estiver desatualizado. 

### Erros Comuns

#### ✗ SCHEMA SNAPSHOT OUTDATED!
**O que significa**: Existem migrations novas ou alteradas que não foram refletidas no snapshot.
**Como corrigir**: Execute `npm run schema:update` localmente e faça o commit das alterações.

#### Por que o snapshot é necessário?
Ele serve como uma "fonte da verdade" determinística para que o frontend possa validar tipos e referências sem precisar se conectar ao banco de dados em tempo de build.

## Determinismo
O script de geração de snapshot (`scripts/generate-schema-snapshot.mjs`) garante que as tabelas e colunas sejam exportadas em ordem alfabética e com metadados de versão, garantindo que o snapshot seja idêntico em qualquer máquina.
