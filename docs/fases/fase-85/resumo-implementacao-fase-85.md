# Resumo — Fase 85: Prompts de IA citam o curso certo

## O que foi implementado

Levantamento pedido pelo dono ("de onde as analogias estão sendo criadas pra qualquer curso"): os
interesses do aluno entram em quatro lugares (analogia "Pra você" da leitura, feedback do resumo falado,
chat rápido e rascunho do LinkedIn), e todos os prompts de IA se apresentavam como "Focadu, plataforma de
estudo de segurança web" - o chat ainda dizia "curso Web Security" e tratava o que não fosse segurança
web como "outra coisa". Com o Linux publicado, uma dúvida de `chmod` ou de bash podia virar resposta de
"fora do assunto".

- **`CoursePromptText.Platform(courseName)`:** "da Focadu (curso Linux)", ou só "da Focadu" sem curso.
- **Seis prompts parametrizados** (`BuildSystemPrompt(courseName)` / `CorrectionSystemPrompt` /
  `GradingSystemPrompt`): analogia, correção da transcrição e nota do resumo falado, chat rápido (que também
  deixou de dizer "sobre segurança web/o curso" e "explicação errada de segurança"), passo de código da
  ponte (que também não assume mais "um arquivo de captura de rede") e revisão do Caderninho.
- **`CourseName` opcional** em `AnalogyRequest`, `ContentEvaluationRequest`, `StudyAssistantRequest`,
  `CodeStepEvaluationRequest` e `NotesReviewRequest`.
- **De onde vem o curso:** `IWeeklyTemplateRepository.GetCourseNameAsync(weeklyTemplateId)` (resumo falado,
  passo de código, Caderninho) e `GetCourseNameForContentAsync(contentId)` (leitura, só quando vai gerar a
  analogia, não no cache). No chat, o front manda o `courseId` (`setStudyAssistantCourse`, preenchido pela
  sessão e pelo Projeto Semanal) e `AskStudyAssistantUseCase` resolve o nome.

## Decisões técnicas tomadas que não estavam no prompt original

- Avaliação do Projeto Semanal (`GroqProjectEvaluationService`) e rascunho do LinkedIn
  (`GroqDraftGenerationService`) mantêm o texto de segurança web: só existem em curso com projeto, hoje só o
  Web Security.
- Analogias já em cache (`PersonalizedAnalogies`) não são regeneradas; só as novas usam o prompt novo.
- Sem curso conhecido (chat fora de uma sessão), o prompt fala só "da Focadu", sem supor curso.

## Estrutura de arquivos criada

```
backend/src/Focadu.Infrastructure/Services/CoursePromptText.cs           (novo)
backend/src/Focadu.Infrastructure/Services/Groq{AnalogyGeneration,ContentEvaluation,StudyAssistant,CodeStepEvaluation,NotesReview}Service.cs
backend/src/Focadu.Application/Ports/I{AnalogyGeneration,ContentEvaluation,StudyAssistant,CodeStepEvaluation,NotesReview}Service.cs
backend/src/Focadu.Domain/Repositories/IWeeklyTemplateRepository.cs, Infrastructure/.../WeeklyTemplateRepository.cs
backend/src/Focadu.Application/{Content/GetCuratedContentUseCase,Dailies/SubmitVoiceSummaryResponseUseCase,Dailies/SubmitCodeStepResponseUseCase,Notes/NotesReviewUseCases,Assistant/AskStudyAssistantUseCase}.cs
backend/src/Focadu.Api/{Program.cs,Contracts/AssistantRequests.cs}
backend/tests/Focadu.Tests/Infrastructure/CoursePromptTests.cs           (novo)
frontend/src/{api/client.ts,lib/studyAssistantContext.ts,lib/useStudyAssistantChat.ts,components/SessionShell.tsx,routes/WeeklyProjectPage.tsx}
```

## Testes

- `dotnet test`: 608 passando (novos: os seis prompts citam "da Focadu (curso Linux)" e não "segurança
  web"/"Web Security" com o curso; sem curso, só "da Focadu" e nenhum marcador sobrando; o passo de código
  não fala mais em captura de rede).
- `tsc -b` sem erro; `oxlint` só com os 3 avisos que já existiam.
- Chat de verdade (Groq) numa cópia local com o `courseId` do Linux: "o que faz o chmod 755 num script
  bash?" e "como faço um for em bash que percorre arquivos .log?" foram respondidas como assunto do curso,
  com código formatado e sem o "volta pro foco" de assunto alheio.

## Dúvidas ou pontos abertos para a próxima fase

- Quando existir um segundo curso com Projeto Semanal, generalizar também os prompts do projeto e do LinkedIn.
