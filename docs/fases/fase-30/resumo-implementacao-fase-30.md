# Resumo — Fase 30: Diagramas de Fluxo Simples na Curadoria

## O que foi implementado

Origem: feedback do usuário de que o texto corrido da curadoria (Texto Cru) fica difícil de
entender sem referência visual. Investigação mostrou que a causa raiz não era estilo de escrita,
e sim o renderizador (`MarkdownBlock.tsx`), deliberadamente mínimo desde sempre (só `###`/`####`/
`- item`/negrito/link) - sem tabela, código, imagem ou diagrama. A solução escolhida (opção mais
ambiciosa entre as apresentadas) foi estender essa convenção de texto, sem nenhuma
mudança de domínio/schema/migration - `CuratedContent.BodyText` já é uma string livre sem
`MaxLength`, e desde a Fase 13b não existe UI de autoria (tudo entra via `curar-conteudo` → JSON
→ seed).

**Frontend:**
- `frontend/src/lib/markdown.ts`: `splitFences(text)` - pré-passo que separa o Texto Cru em
  segmentos `prose`/`fence` (fences são multi-linha, reconhecidas ANTES do parser linha-a-linha
  existente). `stripFencedBlocks(text)` (junta só os segmentos `prose`, usado no cálculo de tempo
  de leitura). `parseDiagramSteps(text)` + tipo `DiagramStep` - parser do DSL de diagrama
  (`origem -> destino: rótulo opcional`, um hop por linha).
- `frontend/src/components/activities/DiagramBlock.tsx` (novo): renderiza uma lista de
  `DiagramStep` como linhas empilhadas `[origem] → [destino] rótulo`, usando só tokens Tailwind já
  existentes (`border-stroke`, `bg-base`, `bg-surface-alt`, `text-primary/secondary/muted/accent`)
  - sem SVG, sem lib de diagrama nova. Bloco vazio/sintaxe inválida mostra aviso visível em vez de
    desaparecer silenciosamente.
- `frontend/src/components/activities/MarkdownBlock.tsx`: loop externo agora itera
  `splitFences(text)` em vez de `text.split('\n')` direto; `kind:'fence'` com `lang==='diagrama'`
  vira `<DiagramBlock>`, qualquer outro fence vira `<pre><code>` monoespaçado simples (bônus de
  baixo custo, mesma detecção de fence: útil pra trechos tipo requisição HTTP crua). Segmentos
  `prose` passam pelo parser linha-a-linha existente sem nenhuma mudança de comportamento.
- `frontend/src/components/ReadingActivity.tsx`: `wordCount` agora usa
  `stripFencedBlocks(content.bodyText ?? '')` antes de contar palavras, pra sintaxe do DSL não
  inflar a estimativa "~N min de leitura".
- Efeito colateral esperado (não regressão): `ContentPreviewModal.tsx` e
  `notebook/NotebookTab.tsx`/`NoteEditorModal.tsx` reaproveitam `MarkdownBlock` e também passam a
  reconhecer os 2 elementos novos.

**Backend (pequeno, evita ruído no prompt da IA de analogias):**
- `Focadu.Application/Content/GetCuratedContentUseCase.cs`: novo `internal static
  StripFencedBlocks(string)` (mesmo padrão de `SplitIntoSections`, testável via
  `InternalsVisibleTo` já existente) - remove o conteúdo de dentro de blocos cercados de uma
  seção antes de montar o `AnalogyRequest`. Não muda a quantidade de seções (só limpa conteúdo
  dentro de cada uma), então a correspondência seção↔analogia por índice e o cache em
  `PersonalizedAnalogy` continuam intactos.
- `backend/tests/Focadu.Tests/Content/GetCuratedContentUseCaseTests.cs`: 2 testes novos
  (`StripFencedBlocks_RemovesFenceContentButKeepsSurroundingText`,
  `StripFencedBlocks_WithoutAnyFence_ReturnsTextUnchanged`).

**Convenção de curadoria:**
- `secret/curadoria/CURADORIA.md`: bullet novo na Filosofia (seção 1); nova seção 2.1
  "Diagramas de fluxo simples" com sintaxe completa + os 2 exemplos reais (handshake TCP, cadeia
  DNS); bullet novo na seção 3 (Schema); nota de backlog na seção 4 (Estado atual) deixando claro
  que os outros 59 dias **não** foram retrofitados nesta fase.
- `.claude/skills/curar-conteudo/SKILL.md`: bullet novo em "Regras de Ouro" apontando pra seção
  2.1 do CURADORIA.md, pra curadoria de dias novos já nascer usando o recurso quando fizer sentido.
- `.claude/skills/aplicar-elementos-visuais/` (skill nova, a pedido do usuário): retrofita um dia
  já curado com os elementos visuais desta fase, um dia por vez, com os mesmos critérios de bom-
  senso do CURADORIA.md 2.1 ("nunca decorativo"). Não faz varredura em lote nem decide sintaxe
  nova - só aplica a convenção já fixada.

**Prova de conceito:** `secret/curadoria/web-security/semana-1/dia-1.json` ganhou 2 blocos
` ```diagrama ` reais no `bodyText` da leitura - cadeia de resolução DNS (Fase 1) e three-way
handshake do TCP (Fase 2) - inseridos logo após o bullet que cada um complementa, sem alterar a
prosa técnica existente.

## Decisões técnicas tomadas que não estavam no prompt original

- **Um único modelo de renderização** para os dois casos que importam (ping-pong entre 2 atores,
  tipo handshake TCP; cadeia linear de N atores, tipo resolução DNS): cada linha do DSL vira uma
  linha visual empilhada `[origem] → [destino]`, sem distinguir os dois casos. Uma alternativa
  descartada foi um layout "2 raias" (sequence diagram de verdade, colunas fixas por ator) - exigia
  detectar quantos atores distintos existem e desenhar setas direcionais em CSS puro (sem SVG),
  por um ganho de legibilidade marginal frente ao handshake já ficar claríssimo como 3 linhas
  empilhadas.
- **`parseDiagramSteps`/`DiagramStep` vivem em `lib/markdown.ts`, não dentro de
  `DiagramBlock.tsx`** - `oxlint` (regra `react/only-export-components`) reclama de um arquivo de
  componente exportar função/tipo auxiliar junto; a mesma separação já existia entre
  `MarkdownBlock.tsx` (componente) e `lib/markdown.ts` (funções puras).
- **Bônus incluído**: bloco ` ``` ` genérico (sem `diagrama`) virou bloco de código monoespaçado
  simples, sem highlight de sintaxe - resolve de brinde a outra metade do feedback original (a
  requisição HTTP crua do Dia 1, narrada em prosa, fica melhor como código). Custo incremental
  quase zero por já compartilhar 100% da detecção de fence com o `diagrama`.
- **`StripFencedBlocks` só no backend, só em `GetCuratedContentUseCase`** - não precisou tocar
  `PersonalizationPromptBuilder` nem `GroqAnalogyGenerationService`: a limpeza acontece antes do
  `AnalogyRequest` existir, então o adapter Groq nunca precisa saber que a sintaxe de diagrama
  existe.
- **Retrofit dos 59 dias restantes não é trabalho desta fase** - explicitamente registrado como
  backlog no CURADORIA.md, com uma skill nova (`aplicar-elementos-visuais`) pronta pra fazer isso
  sob demanda, dia a dia, em vez de uma migração em massa automática (risco de diagrama
  didaticamente fraco/forçado num dia que não tem uma sequência real de atores).
- **Verificação do Dia 1 via `UPDATE` direto no Postgres local, não reseed completo** - o
  ambiente já tinha um `Course`/`Enrollment` local seedado; o procedimento documentado de reseed
  (`RoleplayOptions` → `Enrollments` → `Courses`) apagaria progresso de matrícula só pra atualizar
  1 coluna de texto. Um `UPDATE "CuratedContents" SET "BodyText" = ...` (dollar-quoted, sem risco
  de escaping) atualizou só o conteúdo, preservando qualquer enrollment/progresso local.

## Estrutura de arquivos criada

```
frontend/src/lib/markdown.ts                                    (editado - splitFences, stripFencedBlocks, parseDiagramSteps, DiagramStep)
frontend/src/components/activities/DiagramBlock.tsx              (novo)
frontend/src/components/activities/MarkdownBlock.tsx              (editado - loop por segmento de fence)
frontend/src/components/ReadingActivity.tsx                      (editado - wordCount)
backend/src/Focadu.Application/Content/GetCuratedContentUseCase.cs (editado - StripFencedBlocks)
backend/tests/Focadu.Tests/Content/GetCuratedContentUseCaseTests.cs (editado - 2 testes novos)
secret/curadoria/CURADORIA.md                                    (editado - seção 2.1 nova + notas)
secret/curadoria/web-security/semana-1/dia-1.json                 (editado - 2 diagramas de exemplo)
.claude/skills/curar-conteudo/SKILL.md                            (editado - bullet novo)
.claude/skills/aplicar-elementos-visuais/SKILL.md                 (novo)
docs/fase-30/resumo-implementacao-fase-30.md                      (este arquivo)
```

## Testes

- Backend: `dotnet test tests/Focadu.Tests/Focadu.Tests.csproj` - 78 testes, 0 falhas (inclui os
  2 novos de `StripFencedBlocks`, os 2 já existentes de `SplitIntoSections` intactos, e
  `CuratedContentAllFilesTests.EveryDayFile_ImportsWithoutException` cobrindo o `dia-1.json`
  editado).
- Frontend: `npm run build` (`tsc -b && vite build`) limpo; `npm run lint` (`oxlint`) sem nenhum
  warning novo (o único warning restante, em `TodayPage.tsx`, é pré-existente e não relacionado).
- JSON da curadoria: `python3 -c "import json; json.load(open('.../dia-1.json'))"` validado depois
  de cada uma das 2 inserções de diagrama.
- Verificação end-to-end: `UPDATE` do `BodyText` do Dia 1 no Postgres local (API/frontend já
  rodando no ambiente) - conteúdo confirmado no banco (`BodyText LIKE '%diagrama%'` = true).
  Confirmação visual final (abrir a sessão de Leitura do Dia 1 no navegador) fica para o usuário,
  que já tem o app rodando localmente.

## Dúvidas ou pontos abertos para a próxima fase

- Retrofitar os outros 59 dias com diagramas onde fizer sentido - usar a skill
  `aplicar-elementos-visuais`, dia a dia, nunca em lote (ver backlog no `CURADORIA.md`).
- O bloco de código genérico (` ``` ` sem `diagrama`) não tem highlight de sintaxe - se algum dia
  isso importar (ex: destacar palavras-chave de um payload), precisaria de decisão própria (trocar
  por uma lib leve vs. continuar hand-rolled), não decidido nesta fase por ser fora do pedido
  original.
- Nenhuma cobertura de teste de frontend foi adicionada (`splitFences`/`parseDiagramSteps` não têm
  teste automatizado) porque o projeto não tem framework de teste de frontend configurado hoje -
  mesma lacuna que já existia antes desta fase, não introduzida por ela.
