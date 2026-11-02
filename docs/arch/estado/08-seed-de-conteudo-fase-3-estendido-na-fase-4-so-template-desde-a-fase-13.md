## Seed de conteudo (Fase 3, estendido na Fase 4, so template desde a Fase 13)

Course/Monthly/WeeklyTemplate/DailyTemplate/DailyActivity nao tem endpoint de autoria (ver "Fora
de escopo"), entao o unico jeito de popular essa estrutura e via `SeedWebSecurityCourseUseCase`
(`Focadu.Application.Seed`) - idempotente por nome de Course ("Web Security"), monta o grafo
TEMPLATE inteiro em memoria via API publica do dominio e persiste com uma unica chamada a
`ICourseRepository.AddAsync` + `IUnitOfWork.SaveChangesAsync` (o `Add` do EF Core cascateia o
grafo inteiro automaticamente, sem precisar de `IMonthlyRepository`/`IWeeklyTemplateRepository`
separados). `CuratedContent` em si tambem pode ser criado/editado via Api (ver "Autoria de
conteudo curado" acima) - o seed so garante que exista *algo* pra começar. **Fase 13: o seed nao
cria mais nenhuma instancia** (Weekly/Daily-instancia, com datas reais) - isso virou trabalho de
`EnrollUserInCourseUseCase`, disparado quando alguem de fato se matricula (ver "Template vs
Instancia").

Popula a Semana 1 completa do curso "Web Security": 4 Dailies, CuratedContent por dia (texto
completo das 4 leituras carregado via `PUT /api/curated-content/{id}` - Fase 4, nao faz parte do
seed em si), e pelo menos 1 `DailyActivity` de cada tipo distribuida pelos 4 dias - Quiz (todos os
dias), WordMatch (2 termos, Dia 2), Cloze/MultipleChoice + Cloze/FreeText (Dia 3), Roleplay (3
niveis, Dia 4), VoiceSummary (Dia 1, referenciando a leitura "Como a web funciona" - Fase 5) -
alem do `WeeklyProject`. Conteudo completo em `docs/fase-3/resumo-implementacao-fase-3.md`,
`docs/fase-4/resumo-implementacao-fase-4.md` e `docs/fase-5/resumo-implementacao-fase-5.md`.

Acionado via `dotnet run --project src/Focadu.Api -- seed` (checagem de `args` em `Program.cs`,
antes de `app.Run()` - roda e encerra, sem subir o servidor HTTP).

**Fase 21: Dia 1 passou a usar conteudo curado de verdade.** `CuratedDayImporter`
(`Focadu.Application.Seed`, generico por design - o roteiro real tem 72 dias desde a Fase 69, um metodo `AddDayN`
por dia nao escala) le um `dia-N.json` (schema em `secret/curadoria/CURADORIA.md`, escrito pela
skill `curar-conteudo`) do disco e aplica a uma `WeeklyTemplate`: cria `DailyTemplate`,
`CuratedContent`s e `DailyActivity`s em ordem (`QuizOption`s e o grafo de `RoleplayNode`s
incluidos, resolvido em 2 passadas porque `NodeKey` pode apontar pra um node definido depois no
JSON). `SeedWebSecurityCourseUseCase.AddDay1` chama `CuratedDayImporter.ImportFile` em vez do
placeholder hardcoded que existia (o `TODO` original); acha a raiz do repo subindo diretorios ate
achar `.git` (o seed pode rodar tanto da raiz quanto de `backend/`) - **Fase 40:** ou, se a env var
`CURATED_CONTENT_ROOT` estiver definida (caso do container Docker, que nao tem `.git`), usa ela
direto sem subir diretorio nenhum (ver "Docker e Deploy" abaixo). Dias 2-4 continuam no
placeholder - so o Dia 1 foi pedido nesta fase, trocar os outros e a mesma 1 linha cada.

### Cursos de pre-requisito: seed generico, curso escondido e semana sem projeto (Fase 81)

Origem: `secret/rascunhos/trilha-pre-requisitos-linux-python.md` (trilha Linux -> Python pra Web
Security antes/junto do Web Security; decisoes do dono em 29/09/2026: **sem Projeto Semanal**, curso
**escondido ate a curadoria terminar**, telas de curso sem projeto **desenhadas no Figma antes** do front).

- **Manifesto por curso:** `secret/curadoria/<slug>/curso.json` (`name`, `description`,
  `practiceLanguage`, `published`, `modules[].weeks[]` com `number`/`title`/`theme`/`days`). Slugs
  conhecidos em `SeedCuratedCoursesUseCase.CourseSlugs` (`linux`, `python-websec`); sem `curso.json`, o
  curso nao existe (hoje so o Linux tem).
- **`SeedCuratedCoursesUseCase`** (roda no `-- seed`, depois do Web Security e das pontes): cria o curso
  **Draft** se nao existir e, em todo deploy, acrescenta os dias curados desde o anterior
  (`CuratedCourseImporter.Apply`, puro, testado contra a curadoria real). Diferente do seed do Web
  Security (tudo de uma vez, nunca mais mexe): **incremental** - um dia so entra quando o `dia-N.json`
  existe. Os dias novos chegam tambem as matriculas que ja existem (Daily na Weekly da semana; Weekly
  criada se a semana for nova; numero ocupado vira aviso no log, nao derruba o deploy). `published: true`
  ativa o curso (so ida, nunca esconde de novo). **Fase 82:** como o importador nunca mexe num dia ja
  importado, um curso **Draft sem nenhuma matricula** e apagado (`ICourseRepository.Remove`, cascata do
  curriculo) e recriado do zero a cada deploy - o banco sempre reflete a curadoria atual ate a 1a
  matricula ou a publicacao. O log diz "recriado (escondido e sem matricula)". O Id do curso muda a cada
  recriacao (sem efeito: ninguem esta matriculado).
- **`CuratedContentLocator`**: a busca de arquivo de curadoria (CURATED_CONTENT_ROOT / `.git` / repo irmao)
  saiu do seed do Web Security e passou a receber o slug; o do Web Security delega pra ele.
- **Semana sem projeto:** `WeeklyTemplate.PracticeLanguage` (coluna nova, migration `PracticeOnlyWeeks`)
  e `IsPracticeOnly` (linguagem de pratica **e** nenhuma especificacao de projeto - as duas condicoes de
  proposito, pra uma semana do Web Security sem spec no banco continuar ganhando projeto). A matricula
  nao inicializa `WeeklyProject` nessas semanas. `Weekly.IsModuleComplete` = Dailies concluidas quando
  nao ha projeto; `RequiresPublicationToUnlock` e sempre falso sem projeto (a publicacao e a prova do
  projeto); `CalculateScore` = media das Dailies; `StreakPauseWindows` ignora a semana (nao ha espera).
- **Ponte do curso sem projeto:** dia normal (sem `DailyTemplate.Language`) com `CodeStep`. A linguagem
  mandada pra IA sai de `WeeklyTemplate.PracticeLanguage` ("Bash") quando o dia nao tem variante; o
  `WeeklyDetailDto.PracticeLanguage` alimenta o rotulo "Seu codigo · Bash" do `CodeStepActivity`.
  Fase 82: `DailyTemplate.IsBridge` (tem `Language` **ou** tem `CodeStep`) e o que marca a ponte pra
  "sem analogia" (Fase 80) - antes so `Language` contava e a ponte do Linux gerava "Pra voce".
  Fase 98: `IsBridge` tambem vale `true` com `DailyTemplate.BridgeMark` (coluna `BridgeMark`, lida de `"ponte": true` no
  `dia-N.json`): a ponte do Linux (molde B) roda em missoes de terminal, sem `CodeStep` nem `Language`, e sem a marca a trilha a
  tratava como dia comum. Banco de Dados semana 2 (dias com `CodeStep` de SQL) cai na inferencia por `CodeStep` - ponto aberto.
- **Quem ve cada curso (Fase 96):** regra unica em `CourseViewer.CanSee` (dominio, montado por `CourseAccess` na Application,
  que substituiu o `DraftCourseAccess`): matriculado sempre ve; aluno de turma so ve os cursos da turma (mesmo em rascunho ou
  "so pra turmas", mesmo com a turma arquivada); lista de previa ve tudo; o resto ve o que nao e Draft nem
  `Course.OnlyForCohorts`. `CanEnroll` = ve e nao esta arquivado. Vale no catalogo, na matricula e nas leituras de curriculo,
  semana-modelo e conteudo curado (`IWeeklyTemplateRepository.GetCourseRef*` devolve `CourseRef`). Ver "Turmas (Fase 96)".
- **Curso escondido (Draft) e previa:** `CoursePreviewOptions` (config `CoursePreview:Emails`, env
  `COURSE_PREVIEW_EMAILS` no compose, e-mails separados por virgula). Quem esta na lista ve o curso
  Draft em `GET /api/courses/available` e consegue se matricular; os demais nao veem e recebem 404
  (`curso_nao_encontrado`) no `POST /api/enrollments`. **`GET /api/courses` lista so os cursos em que o
  usuario esta matriculado** (Fase 82; publicados primeiro): o front usa essa lista como "os cursos do
  aluno" no menu, Start, Perfil, Ranking e guia, e pede `GET /api/courses/{id}` (que exige matricula) de
  cada um - um curso visivel sem matricula na lista derrubava o Start com 404. Descobrir curso novo e so
  pelo `/available`.
  Curso Archived nunca aceita matricula.
- **Telas de curso sem projeto (Fase 83, Figma "Cursos de pre-requisito — v2", quadros 01-05):**
  `WeeklyOverviewDto` e `WeeklyDetailDto` ganharam `IsPracticeOnly` e `IsClosed` (`Weekly.IsModuleComplete`).
  O castelo continua em toda semana, mas no curso sem projeto ele e o **fechamento da semana** (trancado ate
  a ponte fechar, concluido depois; nunca "pendente"/"entregue"; o clique leva a visao da semana). Visao da
  semana: `WeekCastleRow` (castelo da semana + "Ir pra Semana N"), regras com "um script <linguagem>" e
  falas proprias (`buildPracticeOnlyWeekLine`). Trilha: mapa curto `assets/mapa/linux/regiao-1` (2 ilhas,
  gerado por `secret/curadoria/scripts/mapa/regiao-linux-1.js`, `exportar-frontend.js` agora exporta por
  curso), sem seletor de mes quando o curso tem uma regiao so, nevoa "Abre quando a Semana N fechar",
  "Pontes" (semanas fechadas) no resumo, sem o atalho de Certificacoes, "N semanas · pre-requisito".
  Start: "Rumo a ponte" (`BridgePathCard`: dias 1-5 e a ponte como fim da linha). Ranking: "Como subir"
  sem Projeto Semanal (score = media das Dailies). Falas do mapa: `PRACTICE_ONLY_MAP_LINES` (um
  `falas.json` do curso ainda vence). Guia das telas com textos que valem pros dois tipos de curso.
- **Cursos livres com recomendacao (Fase 84, decisao do dono 30/09/2026, Figma "Escolha de curso:
  recomendacao — v2"):** nenhum curso destrava outro. `Course` ganhou `Requirements` e `RecommendedBefore`
  (`text[]`) e `PreparesText` (migration `CourseRecommendation`), vindos de
  `secret/curadoria/<slug>/recomendacao.json` (`requisitos`, `recomendadoAntes`, `preparaTexto`) pelo
  `SyncCourseRecommendationsUseCase`, que roda em todo `seed` e sobrescreve (informacao de vitrine, vale
  tambem pra curso publicado; slug = nome normalizado, igual ao `courseSlug` do front). Na escolha de curso,
  selo ambar "Recomendado antes: X" (verde "X em andamento"/"X feito" conforme a matricula do aluno no
  recomendado; "Completed" = todas as semanas `IsModuleComplete`) ou verde "Prepara pro Y · comeca do zero";
  "Ver curso" abre a ficha com o que ajuda saber antes, a recomendacao e "Comecar pelo X"/"Ir pro X" ao lado
  de "Iniciar <curso>", que matricula direto.
- **Prompts de IA por curso (Fase 85):** analogia da leitura, correcao e nota do resumo falado, chat rapido,
  passo de codigo da ponte e revisao do Caderninho citam "da Focadu (curso <nome>)" em vez de "plataforma de
  estudo de seguranca web" (`CoursePromptText.Platform`; sem curso, so "da Focadu"). Os pedidos ganharam
  `CourseName` opcional; o curso vem de `IWeeklyTemplateRepository.GetCourseNameAsync(weeklyTemplateId)` /
  `GetCourseNameForContentAsync(contentId)`, e no chat do `courseId` que o front manda
  (`setStudyAssistantCourse`, preenchido pela sessao e pelo Projeto Semanal). O passo de codigo nao assume
  mais "arquivo de captura de rede". Avaliacao do Projeto Semanal e rascunho do LinkedIn seguem com o texto
  do Web Security (so existem em curso com projeto).
- **Legenda do arquivo da ponte:** o `bodyText` de um `CuratedContent` `File` vira a legenda no "Material
  de hoje" (`MaterialSidebar`); sem ele, "Rode tudo contra este arquivo.".