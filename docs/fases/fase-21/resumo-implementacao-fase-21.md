# Resumo — Fase 21: Avaliação de Projeto e Conteúdo por IA + Narração por Voz

## O que foi implementado

- **Avaliação automática do Projeto Semanal por IA.** `EvaluateWeeklyProjectUseCase` não recebe
  mais nota/feedback do chamador: busca o conteúdo real do repositório GitHub submetido
  (`IGitHubService.GetContentSnapshotAsync`, Git Trees API recursiva + leitura de cada blob,
  filtrado por extensão/tamanho) e pede pro Groq (`IProjectEvaluationService`/
  `GroqProjectEvaluationService`, novo) comparar contra `WeeklyTemplate.WeeklyProjectSpecText`.
  `POST /api/weeklies/{weeklyId}/project/evaluate` voltou a ser sem corpo. Só funciona quando
  `SubmissionUrl` é um repositório GitHub público (`GitHubUrlParser`, novo, compartilhado com
  `SubmitPublicationUseCase`).
- **Analogias personalizadas na Leitura.** `GetCuratedContentUseCase`, ao servir uma leitura
  (`Reading` com `BodyText`), gera 1 analogia por seção (`#### ...`) via Groq
  (`IAnalogyGenerationService`/`GroqAnalogyGenerationService`, novo), conectando a seção a um
  interesse do aluno (`User.Interests`/`AdditionalProfileNotes`, capturados desde a Fase 13 mas
  nunca usados em prompt até agora). Cacheado em `PersonalizedAnalogy` (nova entidade + migração)
  por `UserId`+`CuratedContentId`, gerado uma vez só. `ReadingActivity.tsx` intercala cada seção
  com o card "💡 PRA VOCÊ".
- **Conteúdo curado real no seed (Dia 1).** `CuratedDayImporter` (novo, genérico) lê um `dia-N.json`
  (escrito pela skill `curar-conteudo`) e monta `DailyTemplate`/`CuratedContent`/`DailyActivity`
  a partir dele. `SeedWebSecurityCourseUseCase.AddDay1` trocou o placeholder hardcoded por essa
  importação.
- **Narração por voz da pergunta do VoiceSummary.** `VoiceSummaryActivity.tsx` lê a pergunta em voz
  alta ao entrar (Web Speech API nativa), destacando palavra por palavra conforme fala, com botão
  "Ouvir de novo".
- **Fix: VoiceSummary sobre vídeo não quebra mais.** `SubmitVoiceSummaryResponseUseCase` cai pro
  `Prompt` da atividade como referência quando o `CuratedContent` não tem `BodyText` (caso
  estrutural do tipo `Video`, que nunca tem `BodyText`) - antes disso, todo VoiceSummary sobre
  vídeo retornava `conteudo_referencia_ausente`.
- Ajuste menor: `VideoActivity.tsx` usa `aspect-video` em vez de altura fixa `h-[280px]`.

## Decisões técnicas tomadas que não estavam no prompt original

- 1 analogia por seção do texto, não 1 analogia cobrindo a leitura inteira - a versão "1 só" foi
  descartada durante o desenvolvimento desta mesma fase (ficava perdida no fim de leituras longas).
- `EvaluateWeeklyProjectUseCase` valida `WeeklyProjectStatus.Submitted` e que a URL é um repo GitHub
  **antes** de gastar a chamada (paga) a GitHub/Groq.
- `ContextText` (o `Prompt`) só é enviado à IA de avaliação do VoiceSummary quando o `BodyText` já é
  a referência principal - repeti-lo seria redundante quando a referência já caiu no fallback do
  próprio `Prompt`.
- `CuratedDayImporter` acha a raiz do repo subindo diretórios até achar `.git`, porque o seed pode
  rodar tanto da raiz quanto de `backend/`.

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/
  Ports/IAnalogyGenerationService.cs
  Ports/IProjectEvaluationService.cs
  Weeklies/GitHubUrlParser.cs
  Seed/CuratedDayImporter.cs
backend/src/Focadu.Domain/
  Content/PersonalizedAnalogy.cs
  Repositories/IPersonalizedAnalogyRepository.cs
backend/src/Focadu.Infrastructure/
  Services/GroqAnalogyGenerationService.cs
  Services/GroqProjectEvaluationService.cs
  Persistence/Configurations/PersonalizedAnalogyConfiguration.cs
  Persistence/Repositories/PersonalizedAnalogyRepository.cs
  Migrations/20260827015606_AddPersonalizedAnalogies.cs (+ .Designer.cs)
backend/tests/Focadu.Tests/
  Content/GetCuratedContentUseCaseTests.cs
  Content/PersonalizedAnalogyTests.cs
  Seed/CuratedDayImporterTests.cs
  Weeklies/GitHubUrlParserTests.cs
```

## Testes

- Backend: `dotnet build` limpo (0 erros/avisos), `dotnet test` 201/201 aprovados.
- Frontend: `tsc -b && vite build` limpo, `oxlint` sem regressão (só o warning pré-existente de
  `TodayPage.tsx`, já documentado na Fase 20).
- Sem verificação ao vivo (Playwright) nesta fase - avaliação automática de projeto e analogias
  dependem de chamadas reais à API do GitHub/Groq, ainda não exercitadas ponta a ponta (ver pontos
  abertos).

## Dúvidas ou pontos abertos para a próxima fase

- **Avaliação automática de projeto nunca foi testada contra GitHub/Groq reais** - só compila e
  passa nos testes de domínio/parsing. Antes de confiar nela em uso real: configurar
  `GitHub:Token`/`Groq:ApiKey` e submeter um projeto de verdade.
- Migração `AddPersonalizedAnalogies` foi gerada mas ainda não aplicada a nenhum banco Postgres
  (`dotnet ef database update` pendente antes do primeiro uso).
- Analogias personalizadas nunca são reavaliadas mesmo se o aluno editar os interesses depois (ou a
  leitura mudar de número de seções) - mesmo princípio de "não reescrever histórico" já usado em
  `WeeklyProject.Feedback`; se isso for um problema real, invalidar o cache vira decisão de uma
  fase futura.
- Dias 2-4 do seed continuam no conteúdo placeholder hardcoded - só o Dia 1 foi migrado pra
  `CuratedDayImporter` nesta fase.
