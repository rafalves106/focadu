# Resumo — Fase 81: Cursos de pré-requisito (seed genérico, curso escondido e semana sem projeto)

## O que foi implementado

- **Seed genérico por curso** (`SeedCuratedCoursesUseCase` + `CuratedCourseImporter`): lê
  `secret/curadoria/<slug>/curso.json` e os `dia-N.json` que já existem. Cria o curso escondido (Draft) e,
  a cada deploy, acrescenta os dias curados desde o anterior, inclusive nas matrículas que já existem.
  Roda no `-- seed`, depois do Web Security e das pontes. Hoje só o Linux tem manifesto.
- **`CuratedContentLocator`**: a busca de arquivo de curadoria virou utilitário com o slug do curso; o
  seed do Web Security delega pra ele (mesmo comportamento).
- **Semana sem Projeto Semanal**: `WeeklyTemplate.PracticeLanguage` (coluna nova, migration
  `PracticeOnlyWeeks`) e `IsPracticeOnly`. A matrícula não cria `WeeklyProject` nessas semanas; a semana
  fecha só com as Dailies, não pede publicação, e o score é a média das Dailies. A ofensiva não pausa
  por elas.
- **Ponte do curso sem projeto**: a linguagem dos passos de código vem da semana ("Bash"); o rótulo do
  `CodeStepActivity` usa `WeeklyDetailDto.PracticeLanguage`.
- **Prévia de curso escondido**: `CoursePreviewOptions` (`CoursePreview:Emails` / `COURSE_PREVIEW_EMAILS`).
  Catálogo, lista de cursos e matrícula respeitam a lista. `GET /api/courses` passou a filtrar por
  usuário e a listar publicados primeiro.
- **Curadoria**: manifesto `linux/curso.json` (2 semanas, Bash, `published: false`). Dias curados nesta
  sessão: Linux 1 a 7, 10 e 11, incluindo a ponte da Semana 1 (Dia 6). Dias 8, 9 e 12 ficaram pra outra
  IA (`secret/curadoria/PROMPT-curar-linux-dias-8-9-12.md`).

## Decisões técnicas tomadas que não estavam no prompt original

- `IsPracticeOnly` exige **linguagem de prática e ausência de spec**, não só ausência de spec: se alguma
  semana do Web Security estiver sem spec no banco de produção (seed antigo), ela continua ganhando
  projeto na matrícula como sempre.
- Seed incremental (e não "tudo ou nada") porque o curso nasce escondido e vai sendo curado aos poucos;
  os dias novos chegam às matrículas de prévia sem migração.
- `published: true` só ativa; nunca esconde de novo um curso já publicado.
- A lista de prévia é por e-mail em configuração, não um papel de admin (não existe papel de admin no
  projeto).
- **Correção de vazamento encontrada no caminho**: `GET /api/courses` devolvia todos os cursos pra
  qualquer usuário logado. Com um curso Draft no banco, ele apareceria no menu, no Start, no Ranking e
  no guia de todo mundo. Agora filtra.
- Curso Archived deixou de aceitar matrícula (antes nada checava o status).

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/Seed/
  CuratedContentLocator.cs        (novo)
  CuratedCourseImporter.cs        (novo: manifesto + Apply)
  SeedCuratedCoursesUseCase.cs    (novo)
backend/src/Focadu.Application/Enrollments/CoursePreviewOptions.cs (novo)
backend/src/Focadu.Infrastructure/Migrations/20260930012812_PracticeOnlyWeeks.cs
backend/tests/Focadu.Tests/Weeklies/PracticeOnlyWeekTests.cs
backend/tests/Focadu.Tests/Seed/CuratedCourseImporterTests.cs
frontend/public/ponte/linux/semana-1/{ponte.log,access.log}
secret/curadoria/linux/{curso.json,ROTEIRO.md,semana-1/dia-1..6.json,semana-2/dia-7,10,11.json}
```

## Testes

- `dotnet test`: 582 passando, incluindo os novos (semana sem projeto: módulo completo, sem publicação,
  score = média; `IsPracticeOnly`; importador contra a curadoria real do Linux: curso Draft, só os dias
  existentes, idempotente, dias posteriores, publicação, ponte com 6 `CodeStep`; `CoursePreviewOptions`).
- Ponta a ponta num Postgres descartável (nunca produção): seed 2x (idempotente, 9 dias do Linux, 2
  semanas sem projeto); API com `CoursePreview__Emails`: usuário comum não vê o Linux em `/courses` nem
  `/courses/available` e leva 404 ao se matricular; usuário da prévia vê, se matricula, `/today` abre o
  Dia 1 e o detalhe do curso lista as semanas sem projeto; um Dia 8 simulado numa cópia da curadoria
  chegou à matrícula existente no deploy seguinte, sem criar nenhum `WeeklyProject`.
- Front: `tsc -b` sem erro; lint só com avisos que já existiam.

## Dúvidas ou pontos abertos para a próxima fase

- **Telas de curso sem projeto** (mapa sem castelo, visão da semana, start): precisam do desenho no
  Figma aprovado antes do front. O front atual não foi conferido com semana sem projeto; só quem
  testa a prévia chega nessas telas.
- **Configurar `COURSE_PREVIEW_EMAILS`** no `.env` de produção pra testar o Linux.
- **Linux Dias 8, 9 e 12**: curar com o prompt pra outra IA; depois o Claude Code confere os comandos
  contra o servidor de laboratório e grava. Quando os 12 estiverem prontos, `published: true`.
- **Python pra Web Security**: sem `curso.json` ainda (nenhum dia curado).
- O `CodeStep` segue só nas pontes; uso em dia normal exige mexer no código acumulado (`PriorCode`).
- O seed do Web Security não foi migrado pro importador genérico (código testado, sem necessidade).
