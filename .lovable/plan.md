text
═══════════════════════════════
ARQUITETURA DO RESOLVER V3 SOBERANO
═══════════════════════════════

1. Objetivo
Implementar o motor determinístico da Biblioteca V3 que resolve refeições como "estruturas completas" com uma única imagem principal, enquanto ajusta gramagens dos componentes individuais sem destruir a identidade clínica da refeição.

2. Componentes a Criar/Modificar

A. LibraryV3Resolver (services/libraryV3Resolver.ts)
- Implementar `resolveMealStructure(clusterSlug, targetMacros, context)`:
    - Busca na `v3_library_items` as opções do cluster.
    - Seleciona a melhor refeição baseada nos alvos.
    - Calcula o fator de escala global (clamp 0.4x - 2.5x).
    - Aplica o fator nos itens da composição (JSONB).
    - Retorna o objeto `Meal` pronto para o Draft.

B. Tipagem V3 (types/types.ts)
- Estender `MealItem` para suportar `is_visual_library_parent` e metadados de composição.
- Garantir que `clinical_mass_g` seja o único soberano para cálculos.

C. Motor Clínico (Lib Integration)
- Criar ponte entre o `NutriCoreV3Adapter` e o `LibraryV3Resolver`.
- Quando em "Modo Biblioteca V3", o motor de distribuição de macros envia o alvo para o Resolver, que devolve a estrutura pronta em vez de construir ingrediente por ingrediente.

3. Regras de Negócio Implementadas
- 1 Refeição = 1 Imagem Principal (Asset determinístico da biblioteca).
- Descrição Textual: Lista organizada de ingredientes e pesos abaixo da imagem.
- Preservação de Identidade: O Resolver só escala quantidades, nunca troca ingredientes da estrutura base.
- Soberania de Dados: `clinical_mass_g` congelado para evitar loops de arredondamento.

4. Plano de Ação Sandbox (Isolado)
- Passo 1: Criar o `V3SandboxGenerator` paralelo ao gerador oficial.
- Passo 2: Implementar a lógica de ajuste dinâmico (scaling) no `libraryV3Resolver.ts`.
- Passo 3: Criar um componente de visualização Sandbox para renderizar o draft (Imagem principal + lista textual).
- Passo 4: Validar rotação visual (hash determinístico para alternar imagens do mesmo item).

═══════════════════════════════
ISOLAMENTO GARANTIDO
═══════════════════════════════
- Nenhuma alteração no código legado V2.
- O runtime V3 atual continua operando; a Biblioteca V3 entra como um novo "Strategy" no Resolver.
- Drafts gerados no sandbox não são persistidos nem afetam o Patient App atual.
