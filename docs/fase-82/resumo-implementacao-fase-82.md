# Resumo — Fase 82: Linux pronto pra publicar (bugs achados no teste de ponta a ponta)

## O que foi implementado

Antes de publicar o curso de Linux, ele foi percorrido inteiro numa cópia local isolada (Postgres
descartável na 5499, API na 5298, Vite na 5173; produção intocada): escolha de curso, matrícula, Start,
trilha, as duas semanas, Ranking, Certificações, Caderninho e as sessões dos Dias 1, 6, 8 e 12, com um
passo de código em Bash corrigido de verdade pela IA (certo passou com 100, "echo da resposta" reprovou
apontando o conceito). Três bugs saíram disso:

- **`GET /api/courses` só com os cursos matriculados.** Ele listava todo curso visível (publicado, ou
  Draft pra quem está na prévia), e o `StartDashboard` pede `GET /api/courses/{id}` de cada um - que exige
  matrícula. Um curso visível sem matrícula derrubava o `/start` inteiro com 404 ("ERRO 404" na tela).
  Com o Linux publicado, todo aluno só do Web Security cairia nisso; e o menu, o Perfil, o Ranking e o guia
  escolhem "o ativo ou o primeiro" dessa lista, então quem fizesse só o Linux teria Perfil quebrado e links
  do menu apontando pro Web Security. `ListCoursesUseCase.EnrolledCourses` (puro, testado).
- **Ponte do curso sem projeto reconhecida como ponte.** A Fase 80 tirou a analogia "Pra você" das pontes,
  mas só reconhecia a ponte pelo `DailyTemplate.Language`, vazio no Linux (a linguagem mora na semana,
  `PracticeLanguage`). Resultado: a leitura dos Dias 6 e 12 gerava analogia e o resumo falado era avaliado
  com o perfil. Novo `DailyTemplate.IsBridge` = tem `Language` **ou** tem `CodeStep`; usado no
  `IsBridgeContentAsync` (leitura) e no `SubmitVoiceSummaryResponseUseCase`. O `RequiresProjectLanguage`
  não mudou: ele também decide regras de semana que exigem linguagem de projeto.
- **Curso escondido sem matrícula recriado a cada deploy.** O `CuratedCourseImporter` só acrescenta dias
  novos e nunca atualiza um já importado. Em produção o Dia 8 do Linux entrou antes da seção "Subindo o
  servidor de laboratório" e ficaria sem ela pra sempre. Agora `SeedCuratedCoursesUseCase` apaga
  (`ICourseRepository.Remove`, cascata) e recria do zero um curso **Draft com zero matrículas**; com a 1a
  matrícula ou a publicação isso para. O log diz "recriado (escondido e sem matricula)".
- **Curadoria (repo `focadu-secret`):** Dias 8 e 9 do Linux sem o `File` do `lab_http.py`. O "Material de
  hoje" só lista conteúdo ligado a alguma atividade (`SessionShell.todaysContentIds`), e nesses dias
  nenhuma atividade aponta pro arquivo - ele simplesmente não aparecia. O download virou link no próprio
  texto (`[lab_http.py](/ponte/linux/semana-2/lab_http.py)`); em produção o nginx serve como
  `application/octet-stream`, então o link baixa. O Dia 12 (ponte) continua com o `File`.

## Decisões técnicas tomadas que não estavam no prompt original

- Corrigir na origem (`GET /api/courses`) em vez de só tolerar 404 no `StartDashboard`: são cinco telas
  que usam a lista como "os cursos do aluno". Descobrir curso novo já é papel do `GET /api/courses/available`
  (escolha de curso), que continua mostrando os Draft da prévia. `ListCoursesUseCase` perdeu a dependência
  de `IUserRepository`/`CoursePreviewOptions`.
- Ponte = `Language` **ou** `CodeStep`, e não `DayNumber % 6 == 0` (o critério do chat no front): o dia de
  reforço copia atividades e tem outro número; `CodeStep` só existe em ponte.
- Recriar o curso inteiro em vez de sincronizar dia a dia: com zero matrículas não há Weekly/Daily/resposta
  apontando pro currículo, a cascata do Postgres cuida do resto (conferido duas vezes no banco descartável,
  inclusive a FK `RESTRICT` de `RoleplayOption.NextNodeId`). Sincronizar dia a dia exigiria casar
  `CuratedContent` por `ref`, que o banco não guarda.
- Em produção (consultado só com leitura em 30/09/2026): Linux Draft com 0 matrículas, então o próximo
  deploy recria o curso com a curadoria atual.

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/Courses/ListCoursesUseCase.cs          (so matriculados)
backend/src/Focadu.Application/Seed/SeedCuratedCoursesUseCase.cs      (recria Draft sem matricula)
backend/src/Focadu.Application/Dailies/SubmitVoiceSummaryResponseUseCase.cs
backend/src/Focadu.Domain/Dailies/DailyTemplate.cs                     (IsBridge)
backend/src/Focadu.Domain/Repositories/ICourseRepository.cs            (Remove)
backend/src/Focadu.Infrastructure/Persistence/Repositories/CourseRepository.cs
backend/src/Focadu.Infrastructure/Persistence/Repositories/WeeklyTemplateRepository.cs
backend/src/Focadu.Api/Program.cs                                      (log do seed)
backend/tests/Focadu.Tests/Courses/ListCoursesUseCaseTests.cs          (novo)
backend/tests/Focadu.Tests/Dailies/DailyTemplateBridgeTests.cs         (novo)
secret/curadoria/linux/semana-2/dia-8.json, dia-9.json                 (link no lugar do File)
```

## Testes

- `dotnet test`: 588 passando (6 novos: lista de cursos só com matrícula, oculto matriculado depois dos
  publicados, vazia antes da 1a matrícula; `IsBridge` em dia normal, variante por linguagem e dia com
  `CodeStep` sem linguagem).
- Front: `tsc -b` sem erro (nenhuma mudança de front nesta fase).
- Ponta a ponta na cópia local, em navegador (Playwright + Chrome): usuário só do Web Security com o Linux
  visível na prévia abre o `/start` sem nenhuma resposta 4xx (antes: ERRO 404); com os dois cursos, o
  `/start` mostra os dois save slots. Seed rodado 2x com o Linux Draft sem matrícula: recriado as duas
  vezes, 12 dias, só o Dia 12 com `lab_http.py` e o Dia 8 com o link. Leitura da ponte (Dia 6) com 0
  analogias; leitura do Dia 1 com as 6 de sempre.

## Dúvidas ou pontos abertos para a próxima fase

- **Telas de curso sem Projeto Semanal** (pela regra, Figma antes do código): castelo no cartão do Linux
  na escolha de curso e no "Rumo ao castelo" do Start; "Projetos 0/2" no resumo do curso; "Nenhum projeto
  definido ainda para esta semana." na visão da semana; a Focada falando do "castelo da Semana 2"; "Projeto
  Semanal · 30%" no "Como subir" do Ranking; a legenda "Rode tudo contra este arquivo." embaixo do
  `lab_http.py` do Dia 12 (é um servidor, não um arquivo pra analisar).
- **Decisões do dono** (podem vir depois da publicação): o Linux aparece como "Curso 02", depois do Web
  Security, mesmo sendo pré-requisito; opcional, recomendado ou obrigatório; ofensiva com dois cursos.
- Depois do deploy desta fase, conferir no log do seed de produção a linha "recriado (escondido e sem
  matricula)". Publicar = `"published": true` no `curso.json`, depois das telas.
- `docs/ARQUITETURA.md` ainda cita `/admin/conteudo` (lista de cursos), mas a rota não existe mais no
  roteador do front; não mexido aqui.
