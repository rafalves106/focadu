# Resumo — Fase 58: Projeto Semanal renderiza Markdown (lista numerada e sub-bullets no MarkdownBlock)

## O que foi implementado

- `frontend/src/routes/WeeklyProjectPage.tsx`: a especificação do projeto (`project.specText`) ia num
  `<p className="whitespace-pre-line">`, então `### Objetivo`, `- item`, `**negrito**` e `` `código` ``
  apareciam como texto corrido com a sintaxe crua na tela. Agora passa pelo `MarkdownBlock`, o mesmo
  renderizador das leituras, do preview e do Caderninho. O espaço entre o título "Projeto da Semana N" e o
  corpo subiu de `gap-2` para `gap-4`.
- `frontend/src/components/activities/MarkdownBlock.tsx` (compartilhado):
  - **Lista numerada** (`1. item`) vira `<ol start={N}>`, com o número do primeiro item vindo do texto.
    Uma linha em branco fecha a lista (comportamento que os bullets já tinham); o item seguinte abre uma
    `<ol>` nova retomando do número escrito.
  - **Sub-bullets indentados** (2+ espaços ou tab, `- item`) viram filhos do último item da lista aberta,
    seja ela de bullets ou numerada. Antes o `trim()` descartava o recuo e eles saíam no mesmo nível.
  - Trocar de bullet para numerada (ou o contrário) no mesmo nível fecha uma lista e abre a outra.
- `frontend/src/lib/textPreview.ts`: só o comentário, que dizia que o texto completo ia para a página
  "via whitespace-pre-line".
- Contexto: os 12 `projeto.json` usam `###`, bullets (125 linhas), lista numerada (23) e bullets aninhados
  (6, na Semana 8). O `MarkdownBlock` não cobria os dois últimos. Pedido do dono em 21/09/2026 ("texto
  corrido sem suporte a .md", primeiro item de uma rodada de correções visuais do Projeto Semanal).

## Decisões técnicas tomadas que não estavam no prompt original

- **Estendi o `MarkdownBlock` compartilhado em vez de fazer um renderizador só do projeto.** A lista
  numerada aparece em 28 dias de leitura (108 linhas) e o aninhamento em 3 (Dias 3, 57 e 59), então as
  leituras e o Caderninho melhoram junto: o Dia 3, que antes mostrava "1./2./3." como parágrafos soltos com
  os bullets achatados, passa a ser uma `<ol>` com `<ul>` dentro.
- **Sintaxe mínima, só o que o conteúdo usa.** Conferido nos JSON: nenhum `1)`, nenhum bullet `* `, nenhum
  tab. Só `- ` aninha, um nível (nível 3+ cairia no nível 2), e numerada indentada continua item de topo.
- **`project.feedback` ficou como texto simples.** O prompt do avaliador (`GroqProjectEvaluationService`)
  pede "até 3 frases em português", sem Markdown.
- Fonte do corpo do projeto: 15px → 14px (o tamanho dos parágrafos do `MarkdownBlock`).
- A lista aberta só é tocada por funções auxiliares (`flushList`/`addListItem`/`addNestedItem`); o laço
  principal não lê a variável `list` direto. Ela é um `let` alterado apenas dentro dessas funções, e o
  TypeScript não acompanha isso no escopo externo (não invalida o estreitamento a cada chamada). Ao
  mexer nisso, manter a leitura dentro das funções.

## Estrutura de arquivos criada

Nenhum arquivo de código novo. Arquivos alterados:
```
frontend/src/components/activities/MarkdownBlock.tsx
frontend/src/routes/WeeklyProjectPage.tsx
frontend/src/lib/textPreview.ts                          (só um comentário)
docs/ARQUITETURA.md
docs/fase-58/resumo-implementacao-fase-58.md             (este arquivo)
CLAUDE.md                                                ("Estado atual")
```

## Testes

O frontend não tem framework de teste (o CI roda só lint e build); a verificação foi feita com scripts
descartáveis fora do repositório, sem dependência nova.

- `tsc -b`: limpo. `npm run lint`: só o aviso que já existia em `src/routes/TodayPage.tsx`. `vite build`
  (num diretório temporário, sem tocar em `dist/`): ok.
- **Regressão do componente compartilhado:** `MarkdownBlock` de `git HEAD` contra o novo, renderizados com
  `react-dom/server` sobre os 72 textos multi-linha dos JSON curados. 37 com HTML idêntico ao byte; 35
  mudaram e todos usam `N.` ou bullet indentado (esperado); **0 mudaram sem usar a sintaxe nova**; 0
  exceções. O caso combinado do Dia 3 saiu como uma `<ol>` de 3 itens, os 2 primeiros com `<ul>` de 4 e 3
  sub-itens, e a numeração seguindo sem reiniciar.
- **Tela real no navegador** (Chrome via Playwright): `WeeklyProjectPage` servida pelo Vite numa porta livre,
  com `VITE_API_BASE_URL` vazio e a API inteira mockada por `page.route`, então nada tocou o Postgres nem a
  API de produção deste Mac. As 12 semanas em 1440px e em 390px: 4 títulos `h2` em cada, `<ol>` nas Semanas
  3, 4, 10, 11 e 12, `<ul>` aninhado na Semana 8, e nenhuma sintaxe crua (`###`, `**`, crase, `- `, `1.`)
  sobrando no texto. Sem erro de página. Capturas inspecionadas: Semanas 1, 3 e 8 em desktop e a 3 em celular.
- **Overflow horizontal em celular na Semana 7** (chip `Konscious.Security.Cryptography`, 231px numa coluna
  de 230px): já existia. Reproduzindo o DOM antigo na mesma página, ele estourava mais (426px contra 399px de
  `scrollWidth`, em viewport de 390px). Não corrigido, ver abaixo.

## Dúvidas ou pontos abertos para a próxima fase

- **Espaçamento dos títulos:** o `MarkdownBlock` usa o mesmo `gap-3` acima e abaixo de todo bloco, então
  "Entregável" e "Critérios de pronto" ficam equidistantes do que vem antes e do que vem depois, e agrupam
  fraco com o próprio conteúdo. É comportamento compartilhado com as leituras; não mexi.
- **Título do projeto:** o `projeto.json` traz `title` ("Sniffer CLI", "Secure Auth Gateway & JWT
  Validator"...), mas `CuratedProjectImporter` só grava o `specText` e o descarta. A tela mostra só "Projeto
  da Semana N". Exibir o nome exige guardar o título (schema, seed e DTO).
- **Celular:** a página tem `p-10` e o card tem `p-10`, sobrando ~230px de texto num telefone de 390px. Vale
  reduzir o padding em telas pequenas, e um `break-words` no chip de código resolve o overflow da Semana 7.
- `_itálico_`, tabela, citação (`>`) e `- [ ]` continuam sem suporte; nenhum dos 12 projetos usa.
