## Objetivo
Refatorar o Editor V3 para melhorar a organização, visibilidade de recursos (templates e marmitas) e a estética geral, atendendo ao feedback de que a interface está confusa e "feia".

## Alterações Propostas

### 1. Reorganização do Layout (3 Colunas)
- **Coluna Esquerda (Biblioteca):** Sidebar fixa com abas para Alimentos, Marmitas e Templates. Isso elimina a necessidade de abrir modais constantemente.
- **Coluna Central (Plano):** Área principal de edição das refeições, com cards mais limpos e organizados.
- **Coluna Direita (Diagnóstico):** Resumo nutricional, metas e alertas clínicos sempre visíveis.

### 2. Visibilidade de Templates e Refeições Prontas
- Implementar uma busca global na barra lateral que filtre entre as abas.
- Garantir que a lista de templates e marmitas seja carregada imediatamente e exibida com cards informativos (macros, número de itens).
- Adicionar funcionalidade de "um clique" para adicionar itens ou aplicar templates.

### 3. Refinamento Estético (UI/UX)
- Substituir o fundo preto puro (`bg-black`) por tons de cinza muito escuro (`bg-neutral-950`) para reduzir o cansaço visual.
- Melhorar os cards de refeição com bordas mais suaves, sombras sutis e tipografia mais clara.
- Adicionar estados de "empty" amigáveis quando não houver resultados de busca.
- Tornar o botão de "Adicionar Refeição" mais discreto, porém fácil de encontrar.

### 4. Melhorias Funcionais
- Facilitar a troca de paciente diretamente no editor.
- Melhorar o feedback visual ao adicionar itens (animações simples).

## Detalhes Técnicos
- Arquivo principal afetado: `src/features/editor-v3/components/EditorV3Page.tsx`.
- Utilização de `Tabs` do Radix UI para a biblioteca lateral.
- Ajuste no grid principal de `lg:grid-cols-12` para acomodar as 3 colunas de forma responsiva.
