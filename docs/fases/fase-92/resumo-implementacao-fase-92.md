# Resumo — Fase 92: Plano de curadoria, Fase 1 (importador, molde v1, voz com devolutiva, feedback do dia, aquecimento e trilha gerada)

Fase de plataforma da refação dos cursos (plano em `secret/produto/PLANO-CURADORIA.md`, aprovado em 02/10/2026).
No plano ela é a "Fase 1" (passos A a D); aqui no repositório principal é a Fase 92. Os passos B (backend) já
estavam em commits próprios (`124db83` a `100cc5a`); este commit fecha o passo C (front), os pontos soltos e a
virada dos 3 pilotos (Linux Dia 1, Web Security Dia 1, Arquitetura de Software Dia 1).

## O que foi implementado

**Backend (passo B)**
- A Api lê `secret/conteudo/<curso>/` (era `curadoria/`); o conteúdo antigo está arquivado em `secret/processo/arquivo/`.
- `importar <curso> [--dia N] [--dry-run] [--confirmar] [--sem-linter] [--legado]` (`ImportCuratedDaysUseCase`):
  roda o linter (`NodeDayLinter` → `processo/scripts/linter-dia`), recusa dia fora do molde v1, compara
  `ContentHash` e cria, pula ou substitui o dia inteiro; dia com respostas de aluno pede `--confirmar`.
  `CuratedEnrollmentSync` leva dias novos às matrículas (extraído do seed genérico).
- Campos do molde v1 guardados: `moldeVersion`, `targets` (`LearningTarget`), `source` do conteúdo, `target` por
  atividade e, no `VoiceSummary`, `hint`, `referenceAnswer`, `final`, `topics` (migration `MoldeV1DayInfo`).
- Analogia "Pra você" desligada por flag (`Personalization:AnalogiesEnabled`, padrão `false`), código mantido;
  `GET /api/features`.
- Devolutiva da conversa por voz: a avaliação devolve resposta correta e pontos a melhorar (migration `VoiceDebrief`).
- Feedback do dia (`DayFeedback`: clareza 1-5, atividade em que travou, comentário), `PUT/GET /api/dailies/{id}/feedback`
  e o comando `feedback <curso>` (relatório de clareza; migration `DayFeedback`).
- Aquecimento: `GET /api/dailies/{id}/warmup` devolve 2 Quiz/Cloze já respondidos em dias anteriores (menor nota primeiro).
- `resetar-usuarios --manter <email> [--confirmar --backup-feito]`: dry-run por padrão; mantém só a conta do dono
  (com perfil, cosméticos e squad) e zera o progresso dela; lista as contas do Forgejo a limpar à mão.
- Curso em Draft visível ao dono (`DraftCourseAccess`) em currículo e detalhe de semana.
- `IsBridge` (de `DailyTemplate.IsBridge`) em `DailyStatusSummaryDto` e `DailyOverviewDto`.
- Seed do Web Security não cria o curso se `conteudo/web-security/semana-1/dia-1.json` não existir (a limpeza do
  banco não é desfeita pelo próximo deploy). `arquitetura-de-software` entrou na lista do seed genérico.

**Front (passo C, telas do Figma "Fase 1 - C" aprovadas pelo dono)**
- Devolutiva da voz no `FeedbackPanel`/`VoiceSummaryActivity` (resposta correta e pontos a melhorar).
- `WarmupScreen` (aquecimento antes do dia) e `DayFeedbackScreen` (feedback ao concluir), ambos puláveis.
- `CourseTrail` (`components/courseMap/`): trilha gerada só dos dados do curso; `CourseMap.tsx` e `lib/courseMaps.ts`
  apagados. `StartDashboard`/`CourseDetailPage` tiram títulos de módulo de `course.monthlies` e usam as falas padrão
  da Focada. `CourseTrail`, `WeekTrail` e `WeeklyDetailPage` marcam a ponte por `isBridge`, não pela posição.
- `guiaTelas.ts` atualizado para as telas novas.

**Virada (passo D)** — feita em produção depois do deploy: backup, `resetar-usuarios` e `importar` dos 3 pilotos.
A limpeza dos cursos antigos ficou para depois (decisão do dono, 05/10/2026).

## Decisões técnicas tomadas que não estavam no prompt original
- Nota abaixo de 80 na conversa por voz deixa seguir; aquecimento e feedback podem ser pulados; falha técnica da IA
  não conta erro (assumidas por falta de resposta, registradas em `secret/CLAUDE.md`).
- Sem quadro 1280x720 específico nas telas novas.
- O container não tem Node: em produção o `importar` roda com `--sem-linter` (o linter já passou localmente na curadoria).
- Reset de usuários inclui zerar o progresso do próprio dono (pedido dele, 05/10/2026).
- Até a limpeza, o Web Security em produção tem o Dia 1 novo e os Dias 2-72 antigos, e segue publicado.

## Estrutura de arquivos criada
```
backend/src/Focadu.Application/
  Dailies/GetWarmupUseCase.cs
  Enrollments/DraftCourseAccess.cs
  Feedback/DayFeedbackUseCases.cs, FeedbackReport.cs
  Ports/IDayLinter.cs, IUserResetService.cs
  Seed/ImportCuratedDaysUseCase.cs, CuratedEnrollmentSync.cs
  Shared/PersonalizationOptions.cs
  Users/ResetUsersUseCase.cs
backend/src/Focadu.Domain/Dailies/DayFeedback.cs, LearningTarget.cs
backend/src/Focadu.Infrastructure/
  Persistence/UserResetService.cs, Repositories/DayFeedbackRepository.cs
  Services/NodeDayLinter.cs
  Migrations/ MoldeV1DayInfo, VoiceDebrief, DayFeedback
frontend/src/components/courseMap/CourseTrail.tsx
frontend/src/components/session/WarmupScreen.tsx, DayFeedbackScreen.tsx
```

## Testes
- `dotnet build` OK; `dotnet test` 653 aprovados, 0 falhas (inclui os testes que varrem `secret/`).
- Novos: `VoiceDebriefTests`, `WarmupSelectorTests`, `DayFeedbackTests`, `PersonalizationOptionsTests`,
  `CuratedDayMoldeV1Tests`, `ResetUsersUseCaseTests`.
- Front: `tsc -b`, `npm run lint` (só avisos pré-existentes) e `npm run build` OK.
- Os 3 pilotos foram abertos e aprovados pelo dono no app local (Linux 04/10, Web Security e Arquitetura 05/10).
  As sessões do Claude não têm navegador: aquecimento, feedback do dia e trilha não foram vistos por ele.

## Dúvidas ou pontos abertos para a próxima fase
- Limpeza dos cursos antigos no banco (não existe comando `limpar-curso`).
- Contas do Forgejo dos usuários apagados: limpar à mão (o `resetar-usuarios` lista).
- Órfãos em `frontend/src/assets/mapa/<curso>/regiao-*` (arte do mapa antigo) — apagar no arquivamento do mapa.
- Certificações por curso com equivalência por domínio do edital (`secret/processo/molde/certificacoes.md`).
- Fase 3 do plano: cursos semana a semana, começando pelo Linux Dias 2-6.
