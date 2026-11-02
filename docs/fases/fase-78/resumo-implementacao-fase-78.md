# Resumo — Fase 78: Revisão por IA do Caderninho

## O que foi implementado

Fase C de `secret/rascunhos/plano-pendencias-26-09-2026.md`, decisões do dono em
`secret/rascunhos/avaliacao-ia-do-caderninho.md` (26/09) e desenho aprovado no Figma "Caderninho: revisão
por IA — v2 (proposta)" (01 revisão aberta `166:4503`, 02 revisando `166:5714`, 03 sem nota `167:6819`,
notas `167:7707`).

- **"Revisar com a IA ›"** no cabeçalho de cada dia com nota no Caderninho (Daily original ou de reforço;
  notas de Projeto Semanal não entram). A revisão abre embaixo das notas do dia em três partes: **o que
  está bom**, **o que falta** (no máximo 2 pontos, com a seção pra reler) e **se confere com o material**.
  "Não vale nota": sem Gems, sem Score.
- A IA compara a nota **e** o material do dia: as leituras (título e corpo) e os pedidos de resumo falado
  da Daily - no reforço, da Daily de origem.
- **Guardada**: a última revisão de cada dia volta ao reabrir o Caderninho ("Ver revisão ›" /
  "Fechar revisão") sem nova chamada. **Revisar de novo** só libera quando as notas do dia mudaram
  (hash de conteúdo e tags) - "As notas mudaram desde a revisão".
- **Limite de 10 revisões por dia** por aluno (até existir o orçamento diário de IA); passou, o botão
  avisa "volta amanhã".
- **Revisando**: o botão vira "Revisando..." e a Focada avisa que está lendo as notas e o material.
- **Sem nota**: o Caderninho vazio explica o botão, a Focada muda a fala e "Como anotar" diz que toda
  nota de um dia pode ser revisada. Guia das telas: item "Revisar com a IA" e a pergunta "A IA revisa
  minhas anotações?".

## Decisões técnicas tomadas que não estavam no prompt original

- **Formativa por construção**: o prompt proíbe reescrever as notas e dar a explicação completa - só
  aponta o que falta e onde reler (princípio "contra a resposta fácil de IA"). Resposta fora do JSON vira
  502, nunca uma revisão inventada (mesmo padrão dos outros adapters Groq).
- **Uma linha por revisão** (`NotesReviews`, histórico curto): a tela usa a mais recente de cada dia e o
  limite conta as de hoje (meia-noite no horário do servidor, America/Sao_Paulo). `DailyId` sem chave
  estrangeira, igual `Notes.DailyId` (as Dailies podem ser renumeradas por migração de currículo).
- `upToDate` calculado no servidor (hash das notas atuais x hash guardado), pra tela não recalcular.
- Material truncado em 14 mil caracteres; texto da revisão cortado em 1.200 por parte.
- O texto da revisão passa pelo Markdown leve das notas (a IA às vezes usa crase/negrito).
- Mesmo modelo e cliente Groq dos outros adapters (`openai/gpt-oss-120b`, JSON mode, timeout 60s).

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/Notes/NotesReview.cs
backend/src/Focadu.Domain/Repositories/INotesReviewRepository.cs
backend/src/Focadu.Application/Ports/INotesReviewService.cs
backend/src/Focadu.Application/Notes/NotesReviewRules.cs, NotesReviewUseCases.cs
backend/src/Focadu.Infrastructure/Services/GroqNotesReviewService.cs
backend/src/Focadu.Infrastructure/Persistence/Repositories/NotesReviewRepository.cs
backend/src/Focadu.Infrastructure/Persistence/Configurations/NotesReviewConfiguration.cs
backend/src/Focadu.Infrastructure/Migrations/20260927165216_NotesReviews.cs
backend/tests/Focadu.Tests/Notes/NotesReviewTests.cs
frontend/src/components/notebook/NotesReviewCard.tsx
```

Alterados: `FocaduDbContext`, as duas `DependencyInjection`, `Program.cs`; no front `NotebookPage`,
`api/types.ts`, `api/client.ts`, `lib/guiaTelas.ts` e `mock/sessionMock.ts` (revisão com resposta fixa, e a
nota nova passou a ir pro dia pedido).

## Testes

- `dotnet test`: 546 passando (7 novos em `NotesReviewTests`: hash estável e que muda ao editar/criar,
  revisão sem nota, texto longo cortado, material do dia e do reforço, meia-noite local).
- **Chamada real ao Groq** (2 no total, programa descartável com o adapter e a leitura real do Dia 8, chave
  do container de produção sem exibir): 2,0s e 1,3s, JSON no formato. A primeira listou 5 seções em "o
  que falta"; o prompt passou a pedir no máximo os 2 pontos mais importantes, e a segunda veio assim, citando
  as seções reais da leitura.
- `tsc -b`, `oxlint` sem aviso novo, `npm run build`.
- Playwright + Chrome no mock (`/__mock/caderninho`, `/__mock/caderninho?vazio=1`): botão nos 2 dias de
  Daily (projeto sem botão), "Revisando..." com a Focada, cartão com as três partes, "Revisar de novo"
  apagado, fechar/ver, nota nova no dia → "As notas mudaram" e "Revisar de novo" libera, Caderninho vazio
  com o informativo, sem rolagem de página em 1366×768 e 1024×768.

## Dúvidas ou pontos abertos para a próxima fase

- O limite de 10/dia é provisório: vira parte do orçamento diário de IA quando a medição de tokens existir.
- Não foi rodado ponta a ponta com banco + IA juntos (a rota com banco e a IA foram verificadas separadas).
