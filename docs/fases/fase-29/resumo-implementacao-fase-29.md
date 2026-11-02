# Resumo — Fase 29: Caderninho de Anotações

## O que foi implementado

Feature completa de ponta a ponta a partir do rascunho já elaborado e com mockups Figma validados
em `secret/rascunhos/caderninho-de-anotacoes.md`.

**Backend:**
- Entidade `Note` (`Focadu.Domain.Notes`) - aggregate root próprio, vinculada a `UserId`/`DailyId`,
  conteúdo markdown livre + tags (`List<string>`, `text[]` nativo do Postgres, mesmo padrão de
  `User.Interests`). Validação/limites em `Focadu.Domain.Policies.NotePolicy`
  (`MaxContentLength`=20.000, `MaxTagCount`=10, `MaxTagLength`=40) + dedupe de tags
  case-insensitive.
- `INoteRepository` + `NoteRepository` (EF Core), `NoteConfiguration`, migration `AddNotes`.
- 5 casos de uso (`Focadu.Application.Notes`): `CreateNoteUseCase`, `EditNoteUseCase`,
  `DeleteNoteUseCase`, `ListNotesUseCase` (histórico por Course, filtro período/busca/tag),
  `ListNoteTagsUseCase` (autocomplete).
- 5 endpoints novos: `POST /api/dailies/{dailyId}/notes`, `PUT /api/notes/{id}`,
  `DELETE /api/notes/{id}`, `GET /api/courses/{courseId}/notes?from=&to=&q=&tag=`,
  `GET /api/courses/{courseId}/notes/tags` (ver `docs/ARQUITETURA.md` pra tabela completa).
- `WeeklyDetailDto` ganhou `CourseId` (resolvido via `IMonthlyRepository` em
  `GetWeeklyDetailUseCase`) - pré-requisito pro frontend montar o link "CADERNINHO" e o
  autocomplete de tags a partir do contexto de uma Daily em andamento, sem endpoint novo.

**Frontend:**
- `MarkdownBlock.tsx` estendido pra suportar `**negrito**`/`[texto](url)` inline (antes só tinha
  `###`/`####`/`- item`) - reaproveitado tal qual pelos consumidores existentes
  (`ReadingActivity`/`ContentPreviewModal`), sem quebrar nada.
- `components/notebook/QuickNotePanel.tsx` - painel de captura rápida, empilhado abaixo do
  `MaterialSidebar` existente via `useMaterialSidebar.tsx` (aparece em toda tela de atividade:
  Leitura/Vídeo/Quiz/Ligar Palavras/Cloze/Roleplay/Resumo Falado).
- `components/notebook/CourseDetailTabs.tsx` (mesmo padrão de `ProfileTabs.tsx`) +
  `components/notebook/NotebookTab.tsx` (histórico agrupado por Semana/Dia, filtro
  período/busca/tag) + `components/notebook/NoteEditorModal.tsx` (edição/exclusão) -
  `CourseDetailPage.tsx` ganhou abas pela 1ª vez (`?tab=` na query string de `/start?course=`),
  "Conteúdo Programático" manteve o visual atual.
- `api/client.ts`/`api/types.ts`: `NoteDto`, `createNote`/`updateNote`/`deleteNote`/`listNotes`/
  `listNoteTags`.

## Decisões técnicas tomadas que não estavam no prompt original

- **`Note` não valida o `Status` da Daily** - qualquer Daily do usuário (mesmo `Locked`) aceita
  nota. O rascunho falava em "contexto de uma Daily ativa", mas isso é garantido pela UI (o painel
  só aparece dentro de uma tela de atividade em andamento), não pela regra de domínio - evita
  acoplamento desnecessário.
- **Filtro de período/busca/tag em `ListNotesUseCase` é em memória**, não uma query SQL composta -
  volume por curso é pequeno (dezenas de Dailies), e é o mesmo estilo já usado em
  `GetCourseDetailUseCase` (LINQ sobre o grafo carregado).
- **`ListNoteTagsUseCase` reaproveita `ListNotesUseCase`** (sem filtro) em vez de duplicar a
  resolução de `DailyId` da Enrollment.
- **Sem preview de markdown ao vivo** no editor (nem no painel rápido, nem no modal de edição) -
  só textarea pra escrever + `MarkdownBlock` pra exibir depois de salvo. Mantém o escopo simples,
  igual o rascunho pedia ("esboço, não desenhado de verdade").
- **Filtro de período na aba Caderninho** é um seletor simples (Todo o período / Últimos 7 dias /
  Este mês) calculado no client, não um date-range picker livre - cobre o pedido
  "dia/semana/mês" do rascunho sem inventar um componente novo.
- **Tags: trim + dedupe case-insensitive, sem normalização linguística** (não tenta unificar
  "insight"/"insights") - o rascunho já previa isso como responsabilidade do autocomplete, não do
  backend.
- **`WeeklyDetailDto.CourseId`** (não `DailyStateDto.CourseId`) foi o ponto escolhido pra expor o
  Course a partir de uma Daily - `DailyStateDto` tem 4 produtores/mappers diferentes
  (`GetDailyStateUseCase`/`GetTodayUseCase`/`StartOrResumeDailyUseCase`/`CompleteDailyUseCase`),
  `WeeklyDetailDto` só tem `GetWeeklyDetailUseCase`, e `useMaterialSidebar.tsx` já buscava
  `weekly` mesmo - zero chamada de rede extra.

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/
  Notes/Note.cs
  Policies/NotePolicy.cs
  Repositories/INoteRepository.cs
backend/src/Focadu.Infrastructure/Persistence/
  Configurations/NoteConfiguration.cs
  Repositories/NoteRepository.cs
  Migrations/20260910205339_AddNotes.cs
backend/src/Focadu.Application/Notes/
  Dtos.cs, CreateNoteUseCase.cs, EditNoteUseCase.cs, DeleteNoteUseCase.cs,
  ListNotesUseCase.cs, ListNoteTagsUseCase.cs
backend/src/Focadu.Api/Contracts/NoteRequests.cs
backend/tests/Focadu.Tests/Notes/NoteTests.cs

frontend/src/components/notebook/
  QuickNotePanel.tsx, CourseDetailTabs.tsx, NotebookTab.tsx, NoteEditorModal.tsx
```

Arquivos existentes alterados: `Program.cs` (endpoints + DI), `DependencyInjection.cs` (Application
+ Infrastructure), `FocaduDbContext.cs`, `GetWeeklyDetailUseCase.cs`/`Weeklies/Dtos.cs`
(`CourseId`), `MarkdownBlock.tsx`, `useMaterialSidebar.tsx`, `CourseDetailPage.tsx`,
`api/client.ts`/`api/types.ts`.

## Testes

- `NoteTests.cs` (8 casos): criação/validação (conteúdo vazio, excede limite, tags demais, tag
  muito longa, dedupe case-insensitive), edição (atualiza campos/`UpdatedAt`, mantém `CreatedAt`,
  rejeita conteúdo vazio sem perder o valor anterior). Suíte completa (331 testes) rodada e
  passando (`dotnet test`).
- Backend testado ponta a ponta manualmente via `curl` contra a API rodando local + Postgres real:
  registro, matrícula, `GET /today`, criar nota, listar por curso, filtrar por tag/busca/tag
  inexistente, listar tags, editar, editar com conteúdo vazio (400 `nota_vazia` confirmado),
  apagar nota de outro id (404 confirmado), apagar (204), confirmar lista vazia depois, e
  `GET /api/weeklies/{id}` confirmando o `courseId` novo no payload.
- Frontend: `npm run build` (TypeScript + Vite) e `npm run lint` (oxlint) limpos - sem verificação
  visual em navegador nesta fase (ambiente sem browser interativo disponível).
- Sem teste de use case com repositório mockado (`CreateNoteUseCaseTests`, etc.) - o projeto não
  tem esse padrão estabelecido pra casos de uso simples de CRUD (Dailies/Weeklies só têm testes de
  domínio/mapper), então não foi introduzido aqui pra não destoar do resto da suíte.

## Dúvidas ou pontos abertos para a próxima fase

1. **Sem preview de markdown ao vivo** durante a escrita - só depois de salvar. Se incomodar no
   uso real, é candidato a uma iteração futura pequena.
2. **Filtro de período é fixo (3 opções)**, não um seletor de data livre - se o aluno acumular
   muitas semanas de notas, pode valer a pena um range picker de verdade.
3. **`ListNotesUseCase` não pagina** - devolve todas as notas do curso que baterem no filtro de
   uma vez. Não é problema no volume atual (1 curso piloto, poucos usuários reais), mas é o mesmo
   tipo de pendência já registrada pra `Members` de Squad antes da Fase 24c paginar.
4. Durante a implementação, o Postgres local (`docker compose`, fora do git) tinha uma tabela
   `Notes` órfã de uma migration aplicada em 2026-09-08 sem nenhum código correspondente no
   working tree/histórico do git - foi removida (tabela vazia, sem dados) antes de aplicar a
   migration desta fase. Não afeta nenhuma outra máquina/ambiente (é estado só do Postgres local
   deste ambiente de desenvolvimento).
