## Visao geral do projeto

Focadu e uma plataforma pessoal de estudo gamificada e multi-curso. O curso piloto e
"Web Security". **Desde a Fase 12, o app tem autenticacao real e multiusuario** (antes disso era
mono-usuario hardcoded, sem login). **Desde a Fase 13a, o dominio virou Template + Instancia**:
Course/Monthly/WeeklyTemplate/DailyTemplate/DailyActivity sao curriculo compartilhado (admin-
authored, via seed/`/admin/conteudo`); Weekly/Daily/ActivityResponse/WeeklyProject/
ModulePublication sao progresso por usuario, gerados na matricula (`Enrollment`, via
`EnrollUserInCourseUseCase`) - ver "Modelo de dominio" abaixo. A plataforma forca
compreensao real de fundamentos (nao resposta facil de IA) atraves de sessoes diarias com
multiplas etapas, avaliacao por voz, sistema de pontuacao/reforco adaptativo, e atividades
variadas (quiz, ligar-palavras, cloze test, roleplay).

O projeto e construido do zero, em fases, cada uma via um prompt tecnico colado no Claude Code.
Desde a Fase 2, o repositorio e um **monorepo**: um unico repositorio Git guardando o backend
.NET, o futuro frontend e o futuro servico de WhatsApp - decisao tomada porque e um projeto solo
com multiplas stacks, e manter repositorios separados so adicionaria complexidade sem beneficio
real neste estagio.