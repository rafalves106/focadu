# Resumo — Fase 31: Mais Tipos de Diagrama na Curadoria

## O que foi implementado

Continuação direta da Fase 30: depois de ver o diagrama `sequencia` funcionando no Dia 1, o
usuário pediu "diagrama mais elaborado, tipos diferentes de diagramas". Investigação do roteiro
completo do curso (`CURADORIA.md` seção 5) mostrou 3 estruturas recorrentes que o tipo único
(sequência causal entre atores) não representa bem: comparação entre 2 abordagens (RBAC vs. ABAC,
simétrica vs. assimétrica, SAML vs. OAuth...), hierarquia de camadas (Defesa em Profundidade,
cadeia PKI, IAM na nuvem) e anatomia de algo em partes (JWT, uma requisição HTTP, uma URL) - as 3
foram confirmadas com o usuário (via preview ASCII de cada uma) antes de implementar.

**Frontend (única camada tocada - mesmo raciocínio da Fase 30, backend não precisa saber o que
tem dentro do fence pra fazer seu trabalho):**
- `frontend/src/lib/markdown.ts`: novo `parseDiagram(text): DiagramData` - dispatcher que lê a 1ª
  linha não-vazia do bloco `` ```diagrama ``; se for `tipo: <nome>`, escolhe entre `comparacao`/
  `camadas`/`partes` e consome a linha; sem essa linha (ou tipo desconhecido), cai no tipo
  `sequencia` já existente, mantendo os blocos da Fase 30 (sem `tipo:`) funcionando sem qualquer
  edição. Parsers auxiliares `parseComparison`/`nonEmptyLines`/`splitComparisonPair` (internos, não
  exportados) + tipo `DiagramData` (union discriminada por `kind`) e `ComparisonPair`.
  `parseDiagramSteps`/`DiagramStep` (Fase 30) ficaram como estavam, reaproveitados pelo caso
  `sequencia`.
- `frontend/src/components/activities/DiagramBlock.tsx`: reescrito para despachar em cima de
  `parseDiagram` - 4 sub-componentes internos não-exportados (`SequenceDiagram` = o que já
  existia, `ComparisonDiagram`, `LayersDiagram`, `PartsDiagram`) + `EmptyDiagram` compartilhado
  pro caso de conteúdo insuficiente/sintaxe inválida em qualquer um dos 4. Sem SVG em nenhum -
  `ComparisonDiagram` é um CSS grid 2 colunas; `LayersDiagram` é caixas empilhadas com
  `marginInline: i * 14` (indentação crescente via `style` inline, único jeito de indentar por
  índice sem uma classe Tailwind por nível); `PartsDiagram` reaproveita o mesmo "Pill" visual do
  `SequenceDiagram`, mas conectado por `+` em vez de `→` (composição, não causalidade).
- Nenhuma mudança em `MarkdownBlock.tsx`/`ReadingActivity.tsx`/backend - o dispatch por `tipo:`
  vive inteiramente dentro do texto do fence `diagrama`, que já era tratado como uma unidade opaca
  por tudo em volta (o `StripFencedBlocks` do backend, por exemplo, remove o bloco inteiro
  independente do que tem dentro, tipo `sequencia` ou não).

**Convenção de curadoria:**
- `secret/curadoria/CURADORIA.md` seção 2.1 reestruturada em 4 subseções (uma por tipo), cada uma
  com sintaxe + exemplo real; regra de bom-senso ("nunca decorativo") permanece no topo, agora
  cobrindo os 4 tipos.
- `.claude/skills/aplicar-elementos-visuais/SKILL.md`: descrição, critérios de avaliação (item 3
  do Fluxo) e referências atualizados para os 4 tipos - cada tipo ganhou seu próprio critério de
  "quando vale a pena" (ex: `comparacao` só compensa com pelo menos 3 linhas reais de comparação).

**Prova de conceito (1 exemplo real por tipo novo, além do que a Fase 30 já tinha):**
- Dia 8 (`semana-2/dia-8.json`) ganhou 1 diagrama `comparacao` (RBAC vs. ABAC) logo após a seção
  de ABAC, antes de "A Arquitetura PDP/PEP".
- Dia 56 (`semana-12/dia-56.json`) ganhou 1 diagrama `camadas` (as 5 camadas de Defesa em
  Profundidade) logo após a lista de camadas já existente em prosa.
- Dia 1 (`semana-1/dia-1.json`) ganhou 1 diagrama `partes` (Anatomia da Requisição HTTP: Linha +
  Headers + Body) - encaixe natural com o próprio título da leitura.

## Decisões técnicas tomadas que não estavam no prompt original

- **`tipo:` como 1ª linha do fence, não uma nova família de fence** (ex: não usei
  `` ```diagrama-comparacao ``) - mantém 1 único fence `diagrama` pra todos os tipos, e a
  retrocompatibilidade fica trivial (tipo ausente = `sequencia`, exatamente o comportamento
  anterior a esta fase, sem precisar migrar os 2 blocos já existentes no Dia 1).
- **`comparacao` usa `|` como separador de coluna** (não vírgula/tab) - único caractere que não
  aparece naturalmente em frases em português nesse contexto, e já é a convenção visual universal
  de "coluna" (Markdown table syntax usa o mesmo caractere).
- **`camadas` indenta via `style={{ marginInline }}` inline, não uma escala de classes Tailwind**
  - indentação é proporcional ao índice (`i * 14`), não um de poucos valores fixos que uma paleta
    de classes (`ml-0`, `ml-4`, `ml-8`...) cobriria limpo; W3C/Tailwind não tem uma forma nativa de
    gerar isso dinamicamente sem inline style ou uma lib de CSS-in-JS (nenhuma no projeto).
- **`partes` usa "+" como conector, `sequencia` usa "→"** - distinção deliberada: "+" comunica
  composição espacial (isso É formado por A e B), "→" comunica causalidade/tempo (A leva a B) -
  mesma pílula visual (`Pill`) nos dois pra manter consistência do resto.
- **Critério mínimo de "vale a pena" documentado por tipo** na skill `aplicar-elementos-visuais`
  (ex: comparação só com 3+ linhas reais) - decisão tomada durante a curadoria dos exemplos: 1-2
  linhas de comparação ficam mais claras em prosa corrida do que num grid vazio.

## Estrutura de arquivos criada

```
frontend/src/lib/markdown.ts                       (editado - parseDiagram, DiagramData, ComparisonPair, parsers internos)
frontend/src/components/activities/DiagramBlock.tsx (reescrito - dispatch + 4 sub-componentes + EmptyDiagram)
secret/curadoria/CURADORIA.md                       (editado - seção 2.1 em 4 subseções)
secret/curadoria/web-security/semana-1/dia-1.json    (editado - + 1 diagrama `partes`)
secret/curadoria/web-security/semana-2/dia-8.json    (editado - + 1 diagrama `comparacao`)
secret/curadoria/web-security/semana-12/dia-56.json  (editado - + 1 diagrama `camadas`)
.claude/skills/aplicar-elementos-visuais/SKILL.md    (editado - 4 tipos)
docs/fase-31/resumo-implementacao-fase-31.md         (este arquivo)
```

## Testes

- Backend: `dotnet test tests/Focadu.Tests/Focadu.Tests.csproj` - 78 testes, 0 falhas (nenhum
  teste novo necessário - backend não sabe/precisa saber de tipos de diagrama, só trata o fence
  inteiro como texto a stripar; `CuratedContentAllFilesTests` cobre os 3 arquivos editados).
- Frontend: `npm run build` (`tsc -b && vite build`) limpo; `npm run lint` (`oxlint`) sem warning
  novo (mesmo warning pré-existente de `TodayPage.tsx`, não relacionado).
- JSON da curadoria: `python3 -c "import json; json.load(open(...))"` validado nos 3 arquivos
  editados.
- Verificação end-to-end: `UPDATE` direto no Postgres local dos 3 `CuratedContents.BodyText`
  afetados (mesmo procedimento não-destrutivo da Fase 30 - preserva enrollment/progresso local),
  confirmado via `BodyText LIKE '%diagrama%'` = true nos 3. Confirmação visual fica para o usuário
  (API/frontend já rodando localmente).

## Dúvidas ou pontos abertos para a próxima fase

- Retrofit dos outros dias (agora com 4 tipos disponíveis) continua backlog - skill
  `aplicar-elementos-visuais` atualizada, mas a varredura em si é trabalho futuro sob demanda.
- Nenhum limite de linhas foi imposto a `camadas`/`partes`/`comparacao` (ex: 10 camadas ficaria
  visualmente exagerado) - não apareceu um caso real que precisasse disso ainda; se aparecer,
  decidir limite/comportamento de overflow então.
- `comparacao` não escapa `|` literal dentro do texto de uma célula (um `|` a mais quebraria o
  split em mais de 2 partes e a linha seria descartada como inválida) - não é um problema prático
  hoje (nenhum exemplo real precisou de `|` no meio da frase), mas fica registrado.
