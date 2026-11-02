## Certificacoes de mercado sugeridas por modulo (Fase 45)

Informativo (nunca emissao de certificado): mostra ao aluno quais certificacoes de seguranca
reconhecidas pelo mercado (CompTIA Security+, eJPT, CEH, PNPT - lista aberta, nao travada nessas
4) o curriculo ja cobre ou se aproxima de cobrir, por `Monthly` (os 4 modulos grandes do curso -
diferente da granularidade de `Weekly`/"modulo" usada por `ModulePublication`, ver "Prova publica
de evolucao" abaixo; os dois usos de "modulo" nao coincidem, cuidado ao ler codigo antigo). Origem:
`secret/rascunhos/informativo-certificacoes.md`.

**Dominio**: `CertificationCoverage` (`Focadu.Domain.Monthlies`) - entidade filha de `Monthly`,
mesmo padrao de `CuratedContent` (filha de `WeeklyTemplate`): imutavel apos criacao, so
instanciavel via `Monthly.AddCertificationCoverage(code, name, certifier, coveredDomains)`, nunca
via API de autoria. Guarda contra `CertificationCode` duplicado no mesmo `Monthly` (indice unico
`MonthlyId+CertificationCode`, mesmo espirito de `AddMonthly`/`AddWeeklyTemplate`).

**Curadoria/seed**: `secret/curadoria/web-security/certificacoes.json` - primeiro arquivo de
curadoria em nivel de *curso* nessa pasta (todo o resto e por dia/semana), schema documentado em
`secret/curadoria/CURADORIA.md` secao 6. Importado por `CertificationCoverageImporter`
(`Focadu.Application.Seed`, mesmo formato de `CuratedDayImporter`/`CuratedProjectImporter`),
chamado uma vez em `SeedWebSecurityCourseUseCase.BuildCourse()` (nao dentro do loop por semana).
`CuratedContentPath` ganhou suporte a `weekFolder` vazio/nulo pra resolver esse arquivo de nivel
de curso.

**Gotcha de idempotencia do seed, resolvido nesta fase**: o seed e idempotente por nome de
`Course` - reexecutar contra um banco que ja tem "Web Security" (todo ambiente hoje, local/
producao) nao inseria nada de novo, incluindo esta cobertura de certificacao
adicionada depois do curso original ja seedado. `SeedWebSecurityCourseUseCase.ExecuteAsync` agora,
mesmo quando o curso ja existe, carrega o grafo completo e roda o importer como *backfill* se
nenhum `Monthly` ainda tiver `CertificationCoverage` - idempotente (nao duplica numa segunda
execucao), verificado ao vivo contra o Postgres local.

**Aplicacao/Api - sem endpoint novo**: `MonthlyOverviewDto` (dentro de `CourseDetailDto`, `GET
/api/courses/{id}`) e `WeeklyDetailDto` (`GET /api/weeklies/{id}`) ganharam
`Certifications`/`ModuleCertifications` (`CertificationCoverageDto`, novo em
`Focadu.Application.Shared`) - os dois endpoints existentes ja carregavam o `Monthly` certo, so
precisavam devolver o campo.

**Frontend**, 4 pontos de contato, todos reaproveitando `CourseDetailDto` ja carregado (sem
fetch novo em 3 dos 4):
- 3a aba "Certificações" em `CourseDetailPage` (`CertificationsTab`) - **removida na Fase 65**: a
  tela do curso virou o mapa da trilha e o atalho "Certificações" abre a tela dedicada abaixo.
- Card resumo em `StartDashboard` (`CertificationsSummaryCard`) - **removido na Fase 66** (a tela de
  start nao repete o que ja esta na trilha).
- Bloco sempre visivel em `WeeklyDetailPage` + reforco no `SuccessStep` do `PublicationModal`
  (momento da prova publica de fim de `Weekly`) - usando `weekly.moduleCertifications`.
- Tela dedicada com a matriz completa modulo x certificacao (`CertificationsPage`, novo em
  `routes/`), roteada via `/start?course=&certifications=1` (mesmo padrao de `?ranking=`).

"Ja estudado" (desbloqueio visual, so cosmetico) e derivado no frontend
(`lib/certifications.ts#isMonthlyComplete`) a partir de campos que `WeeklyOverviewDto` ja tinha
(`completedDailies`/`totalDailies`) - sem campo novo no backend so pra isso.