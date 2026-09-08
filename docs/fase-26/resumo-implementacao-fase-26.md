# Resumo — Fase 26: Fechamento do Currículo Web Security (Semanas 2-12)

## O que foi implementado

- **`SeedWebSecurityCourseUseCase` virou genérico**: os métodos `AddDayN` hardcoded (só existiam
  pra Semana 1) deram lugar a `ImportWeek(weeklyTemplate, pastaSemana, primeiroDia, ultimoDia)`,
  chamado em loop pros 4 módulos / 12 semanas a partir do conteúdo curado em disco
  (`secret/curadoria/web-security/semana-N/dia-N.json` + `projeto.json`). Semana 1 continua
  escrita à mão (já testada antes do `CuratedDayImporter` existir - não valia migrar).
- **Curadoria das Semanas 2-12 completa**: 60 dias / 12 projetos no total (`secret/curadoria/`,
  repositório irmão separado, ver abaixo) - fecha os 4 módulos descritos em `secret/MESTRE.md`
  §1/§8 (Fundamentos → OWASP Top 10 → Criptografia/DevSecOps → Cloud/Forense/Red-Blue Team,
  encerrando em Capstone na Semana 12).
- **`CuratedContentPath` ganhou fallback de repositório**: antes assumia `secret/` dentro do
  próprio repo `focadu` (symlink local nunca commitado). Na prática o conteúdo curado hoje mora
  num repositório **irmão** separado (`focadu-secret/`, com seu próprio `.git`, ao lado de
  `focadu/`) - o método agora tenta `<raiz-deste-repo>/secret/...` primeiro (compatibilidade) e
  cai pra `<pasta-irmã>/focadu-secret/...` se não achar.
- **Rede de segurança nova**: `CuratedContentAllFilesTests` varre **todo** `dia-N.json`/
  `projeto.json` em `secret/curadoria/web-security/` e importa cada um contra os importers reais
  (`CuratedDayImporter`/`CuratedProjectImporter`), sem precisar de banco (`WeeklyTemplate` é um
  agregado de domínio puro). Também garante "existem exatamente 60 dias, numerados 1-60" e
  "exatamente 12 projetos" - como a curadoria roda fora do ciclo normal de code review (por IA/
  humano, ver `secret/MESTRE.md`), esse teste é quem pega erro de schema/enum/referência antes do
  seed rodar contra um Postgres de verdade.

## Reseed em ambiente local (feito ao vivo, não é código novo)

O Postgres local já tinha um curso "Web Security" antigo (1 semana, 7 dias-template, de testes de
fases anteriores) - como `SeedWebSecurityCourseUseCase` é idempotente **por nome**, só rodar o
seed de novo não bastava (ele via o nome já existente e não inseria nada). Passos até o currículo
completo entrar:

1. `secret/` (repositório irmão) estava 1 commit atrás do `origin/main` - a curadoria da Semana 12
   (Capstone) só apareceu depois de um `git pull` nele.
2. Curso antigo apagado manualmente via SQL, respeitando a ordem das FKs: `RoleplayOptions`
   (FK `NextNodeId` é `RESTRICT`, auto-referência - apagar direto o `Course` em cascata batia
   nessa constraint) → `Enrollments` (cascata pra `Weeklies`/`Dailies`/etc. - precisa ir **antes**
   do `Course`, porque `Weeklies.WeeklyTemplateId`/`Dailies.DailyTemplateId` também são `RESTRICT`
   contra os Templates que o `Course` ia apagar em cascata) → `Courses`. 2 usuários de teste e seus
   dados (streak/gems/squad) preservados nessa etapa.
3. `dotnet run --project src/Focadu.Api -- seed` populou o curso novo (4 Monthlies / 12
   WeeklyTemplates / 60 DailyTemplates / 120 CuratedContents / 1082 DailyActivities).
4. A pedido do Falves, banco resetado de novo depois: 3 `DailyTemplates` órfãos (resíduo antigo,
   `WeeklyTemplateId` nulo, não relacionado ao curso apagado) + os 2 usuários de teste removidos
   por completo, pra começar limpo.

**Fica registrado pra próxima fase que precisar reseedar**: o seed não é "upsert" - se o Course já
existe (por nome), a única forma de recarregar é apagar manualmente primeiro, na ordem certa por
causa das FKs `RESTRICT` acima (não é só `DELETE FROM "Courses"` e deixar o cascade resolver
sozinho).

## Fora de escopo desta fase (decisões separadas, feitas depois)

Duas mudanças de frontend pro lançamento aconteceram na mesma janela de trabalho mas não fazem
parte do fechamento do currículo - cada uma é seu próprio commit (`1184f94`, `51bd45c`), sem doc de
fase própria por serem toggles pequenos, não features novas:

- `QuickQuestionOrb` (botão de "Suporte Rápido de IA") desativado - prometia um chat que nunca foi
  construído (ver `secret/rascunhos/visual-ui-ux.md`).
- Mapa/personagem da Fase 25 (`WorldMapPage`) desativado pro lançamento - `/start` sem params volta
  a cair no `StartDashboard` (hub de cards). Nada foi apagado, só parou de ser referenciado -
  reverter é trivial (ver comentário em `StartPage.tsx`).
