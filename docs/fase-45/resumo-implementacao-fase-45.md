# Resumo — Fase 45: Certificações de mercado sugeridas por módulo

## O que foi implementado

- Domínio: `CertificationCoverage` (`Focadu.Domain.Monthlies`), entidade filha de `Monthly`
  (mesmo padrão de `CuratedContent`/`WeeklyTemplate`) — `CertificationCode`, `CertificationName`,
  `Certifier`, `CoveredDomains`, criada só via `Monthly.AddCertificationCoverage(...)`, guardada
  contra `CertificationCode` duplicado no mesmo `Monthly`.
- Infraestrutura EF Core: `CertificationCoverageConfiguration` (tabela + índice único
  `MonthlyId+CertificationCode`), `HasMany` em `MonthlyConfiguration`, `DbSet` novo em
  `FocaduDbContext`, `Include` novo em `CourseRepository`/`MonthlyRepository`. Migration
  `AddCertificationCoverages` gerada e aplicada contra o Postgres local.
- Curadoria: novo arquivo `secret/curadoria/web-security/certificacoes.json` — primeiro arquivo
  de curadoria em nível de *curso* (não de dia/semana) nessa pasta, mapeando os 4 módulos a
  CompTIA Security+, eJPT, CEH e PNPT (lista aberta). Schema documentado em
  `secret/curadoria/CURADORIA.md` seção 6 (nova).
- Seed: `CertificationCoverageImporter` novo (mesmo formato de `CuratedDayImporter`/
  `CuratedProjectImporter`), chamado uma vez em `SeedWebSecurityCourseUseCase.BuildCourse()`.
  `SeedWebSecurityCourseUseCase.ExecuteAsync` ganhou um backfill: mesmo quando o Course "Web
  Security" já existe (idempotência por nome), roda o importer se nenhum `Monthly` ainda tiver
  `CertificationCoverage` — sem isso, ambientes já seedados (local/homologação/produção) nunca
  ganhariam a cobertura nova.
- Aplicação: `CertificationCoverageDto` novo (`Focadu.Application.Shared`), embutido em
  `MonthlyOverviewDto.Certifications` (dentro de `CourseDetailDto`, `GET /api/courses/{id}`) e em
  `WeeklyDetailDto.ModuleCertifications` (`GET /api/weeklies/{id}`) — nenhum endpoint novo, os
  dois casos de uso já carregavam o `Monthly` certo.
- Frontend, 4 pontos de contato, todos reaproveitando `CourseDetailDto` já carregado:
  - 3ª aba "Certificações" em `CourseDetailPage` (`CertificationsTab`).
  - Card resumo novo em `StartDashboard` (`CertificationsSummaryCard`).
  - Bloco sempre visível em `WeeklyDetailPage` + reforço no `SuccessStep` do `PublicationModal`.
  - Tela dedicada com a matriz completa módulo × certificação (`CertificationsPage`), roteada via
    `/start?course=&certifications=1` (mesmo padrão de `?ranking=`).
  - `lib/certifications.ts#isMonthlyComplete` deriva o desbloqueio visual ("já estudado") a
    partir de campos que `WeeklyOverviewDto` já tinha, sem campo novo no backend.
- Documentação de processo: `secret/curadoria/CURADORIA.md` seção 6 nova + entrada no log de
  notas datadas da seção 4; `.claude/skills/curar-conteudo/SKILL.md` ganhou referência ao arquivo
  novo (revisitado quando um módulo inteiro é curado/revisado, não em toda curadoria de dia).

## Decisões técnicas tomadas que não estavam no prompt original

- **Granularidade por `Monthly`, reforço mostrado por `Weekly`**: a prova pública existente
  (`ModulePublication`) é 1:1 com `Weekly` ("módulo" nesse contexto = semana), não com `Monthly`
  (os 4 módulos grandes, granularidade decidida pra certificações). Resolvido mostrando, a cada
  publicação de `Weekly` bem-sucedida, as certificações do `Monthly` ao qual aquela semana
  pertence — reforço incremental, não uma alegação de "módulo 100% concluído".
- **Sem endpoint novo**: os dois endpoints que a UI já usa devolvem os campos novos — decisão
  para não duplicar dados já carregados nem criar uma rota redundante.
- **Backfill de idempotência**: sem esse ajuste em `ExecuteAsync`, rodar o seed de novo contra um
  banco que já tem "Web Security" (todo ambiente hoje) não teria populado nada — não estava no
  escopo original do pedido, mas é necessário pra qualquer ambiente real receber os dados.
- **Conteúdo do `coveredDomains`**: o texto de cada módulo × certificação foi escrito a partir
  dos títulos/temas reais dos módulos (conhecimento geral sobre os exames citados), não uma
  curadoria formal linha a linha contra o edital oficial de cada certificação — precisa de
  revisão do Falves antes de ser considerado "curadoria de verdade" no mesmo padrão do resto de
  `secret/curadoria/`.
- **Desbloqueio visual só no frontend**: "módulo já estudado" é derivado no cliente a partir de
  campos que já existiam (`completedDailies`/`totalDailies` por semana), evitando um campo novo
  no backend só para isso.

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/Monthlies/CertificationCoverage.cs
backend/src/Focadu.Infrastructure/Persistence/Configurations/CertificationCoverageConfiguration.cs
backend/src/Focadu.Infrastructure/Migrations/20260918024306_AddCertificationCoverages.cs(+.Designer.cs)
backend/src/Focadu.Application/Seed/CertificationCoverageImporter.cs
backend/src/Focadu.Application/Shared/CertificationCoverageDto.cs
backend/tests/Focadu.Tests/Seed/CertificationCoverageImporterTests.cs
backend/tests/Focadu.Tests/Seed/CertificationCoverageFileTests.cs
frontend/src/lib/certifications.ts
frontend/src/components/certifications/CertificationsTab.tsx
frontend/src/routes/CertificationsPage.tsx
secret/curadoria/web-security/certificacoes.json
docs/fase-45/resumo-implementacao-fase-45.md
```

Arquivos existentes editados: `Monthly.cs`, `MonthlyConfiguration.cs`, `FocaduDbContext.cs`,
`CourseRepository.cs`, `MonthlyRepository.cs`, `SeedWebSecurityCourseUseCase.cs`,
`Courses/Dtos.cs`, `GetCourseDetailUseCase.cs`, `Weeklies/Dtos.cs`, `GetWeeklyDetailUseCase.cs`,
`frontend/src/api/types.ts`, `CourseDetailPage.tsx`, `CourseDetailTabs.tsx`, `StartDashboard.tsx`,
`WeeklyDetailPage.tsx`, `PublicationModal.tsx`, `StartPage.tsx`, `secret/curadoria/CURADORIA.md`,
`.claude/skills/curar-conteudo/SKILL.md`.

## Testes

- Backend: `dotnet test` completo — 365 testes passando (10 novos: 4 em
  `CertificationCoverageImporterTests`, 2 em `CertificationCoverageFileTests`, nenhum teste
  existente quebrado).
- Migration aplicada contra Postgres local (`dotnet ef database update`), seed rodado 2x — 1ª
  execução fez backfill de 12 `CertificationCoverage` (4 módulos × certificações reais do
  arquivo), 2ª execução não duplicou nada (confirmado direto no Postgres via `psql`).
- API local testada via `curl` com usuário/matrícula reais: `GET /api/courses/{id}` devolve
  `certifications` por módulo, `GET /api/weeklies/{id}` devolve `moduleCertifications` do módulo
  certo — payloads inspecionados e confirmados batendo com o arquivo curado.
- Frontend: `tsc -b --noEmit` sem erros, `npm run lint` sem novos warnings (só um pré-existente
  em `TodayPage.tsx`, não tocado nesta fase).
- **Não verificado visualmente no navegador** (sem ferramenta de automação de browser disponível
  nesta sessão) — a integração de dados foi confirmada ponta a ponta via API + type-check, mas o
  render final das 4 telas novas/alteradas não foi visto ao vivo. Recomendo o Falves abrir
  `http://localhost:5173` e conferir a aba "Certificações" em Detalhes do Curso, o card novo na
  tela inicial, o bloco na Visão Semanal e a tela `/start?course=...&certifications=1`.

## Dúvidas ou pontos abertos para a próxima fase

- Texto de `coveredDomains` em `certificacoes.json` é um rascunho técnico plausível, não
  curadoria formal — vale uma revisão do Falves linha a linha contra o edital real de cada
  certificação antes de tratar como definitivo.
- Nenhuma decisão de produto ficou pendente (todas resolvidas na conversa que precedeu esta
  fase, ver `secret/rascunhos/informativo-certificacoes.md`) — o que resta é validação visual no
  navegador e, se o Falves quiser, ajuste fino de copy/layout das 4 telas.
