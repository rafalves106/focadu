# Resumo — Fase 96: Turmas

Pedida em 12/10/2026 para o teste fechado com a turma de Banco de Dados da UNA (A1 em 22 e 23/10): o dono convida o grupo e
eles estudam só as matérias da faculdade. Telas no Figma "Focadu — Pixel Art", página "Turmas — v1 (proposta)" (`289:4502`,
quadros TU 01–40), desenhadas pelo agente `figma-designer` e **aprovadas pelo dono em 12/10/2026**, junto com as respostas
recomendadas às dúvidas do desenho. Branch `fase-96-turmas`, empilhada na `fase-95-sqlite-no-laboratorio`.

## O que foi implementado

- **Turma** (`Cohort`): nome (até 80), cursos (`uuid[]`), criada em, arquivada em. Criar e editar exigem nome e ao menos um
  curso; turma arquivada não muda; não existe apagar.
- **Aluno de turma**: `User.CohortId` (uma turma por aluno). Quem se cadastra com **convite de turma** (`SignupInvite.CohortId`)
  entra na turma no mesmo `SaveChanges` do cadastro e logo depois é **matriculado nos cursos dela** (`CohortEnrollment`).
- **Quem vê cada curso** (`CourseViewer`, domínio; `CourseAccess` monta pro usuário logado e substitui o `DraftCourseAccess`):
  matriculado sempre vê; aluno de turma só vê os cursos da turma (mesmo em rascunho ou "só pra turmas", mesmo com a turma
  arquivada); lista de prévia vê tudo; o resto vê o que não é rascunho nem "só pra turmas". A mesma regra vale no catálogo,
  na matrícula e nas leituras de currículo, semana-modelo e conteúdo curado.
- **Curso "só pra turmas"** (`Course.OnlyForCohorts`): decidido pelo admin na aba Curadoria; o seed não mexe.
- **Painel de gestão**:
  - aba **Turmas** (TU 01–08): lista com filtro Todas/Ativas/Arquivadas, gaveta "Nova turma", detalhe (cursos, convites,
    alunos com o dia de cada curso, "Ver em Alunos ›"), editar (aviso quando um curso sai), arquivar (confirmação) e
    "+ Novo convite desta turma" (abre a gaveta de convite com a turma marcada);
  - **Convites** (TU 10–11): coluna Turma e escolha da turma na gaveta (rádio, "Sem turma" por padrão, turma arquivada não
    aparece);
  - **Curadoria** (TU 20–21): barra "Quem vê <curso>": "Visível pra todos" ou "Só pra turmas" (esconder pede confirmação);
  - **Alunos** (TU 30): coluna Turma (ordenável) e selo no detalhe com "Ver turma ›"; `?aluno=<id>` abre o aluno.
- **Start** (TU 40): aluno de turma vê "TURMA <nome>" no lugar de "+ Explorar cursos" (`UserDto.CohortName`).
- Guia das telas (`lib/guiaTelas.ts`) atualizado no painel e no Start.

## Decisões técnicas tomadas que não estavam no prompt original

- Regras confirmadas pelo dono (recomendações aprovadas em 12/10/2026): curso que entra na turma matricula todos os alunos
  dela na hora; curso que sai deixa as matrículas; arquivada continua restringindo os cursos; o aluno vê o nome da turma no
  Start; uma turma por aluno; pôr aluno existente numa turma sem convite fica para depois; curso "só pra turmas" sem turma
  ativa só gera aviso.
- `Cohort.CourseIds` em `uuid[]` sem FK (mesmo jeito de `Course.Requirements`): curso apagado só some da lista na leitura.
  `Users.CohortId` e `SignupInvites.CohortId` com FK `Restrict` (turma nunca é apagada).
- A matrícula da turma roda **depois** do cadastro salvo, um curso por vez; curso arquivado, apagado ou já matriculado é pulado
  sem derrubar o cadastro. Se uma matrícula falhar no meio, o aluno fica sem aquele curso (sem nova tentativa automática).
- Arquivar não pede texto digitado (nada se perde): é a confirmação do TU 07.
- `GetCourseStatus*` do `IWeeklyTemplateRepository` virou `GetCourseRef*` (id, status, "só pra turmas").
- A gaveta de convite aberta da aba Turmas usa os limites fixos (20 usos, 30 dias, padrão 7); a Api confere de novo.

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/Users/Cohort.cs, Courses/CourseViewer.cs, Repositories/ICohortRepository.cs
backend/src/Focadu.Domain/Users/User.cs, SignupInvite.cs, Courses/Course.cs        (CohortId, OnlyForCohorts)
backend/src/Focadu.Application/Enrollments/CourseAccess.cs (substitui DraftCourseAccess.cs), CohortEnrollment.cs
backend/src/Focadu.Application/Admin/AdminCohortsUseCase.cs (+ DTOs em AdminPanelDtos.cs)
backend/src/Focadu.Infrastructure/Persistence/Configurations/CohortConfiguration.cs, Repositories/CohortRepository.cs
backend/src/Focadu.Infrastructure/Migrations/20261012203652_Fase96Turmas.cs
backend/tests/Focadu.Tests/Users/CohortTests.cs
frontend/src/components/admin/CohortsTab.tsx (+ InvitesTab, StudentsTab, CurationTab, AdminShell, AdminUi.CheckOption)
frontend/src/components/start/CourseSlots.tsx, api/admin.ts, api/adminTypes.ts, api/types.ts, lib/adminFormat.ts, lib/guiaTelas.ts
```

## Testes

- `dotnet test`: 724 aprovados; as mesmas 3 falhas **pré-existentes** da Fase 95 (testes que leem dias antigos de curadoria).
  `CohortTests` (12 casos) cobre a turma, o aluno de turma, o convite de turma e o `CourseViewer`.
- `npx tsc -b`, `npm run lint` (só os 2 avisos antigos) e `npm run build`: ok.
- **Contra o Postgres local** (API reiniciada, migration aplicada no boot), com o admin de teste: criar turma com Linux, marcar
  Linux "só pra turmas", criar convite da turma, cadastrar um aluno com ele (já sai com `cohortName` e matriculado em Linux,
  catálogo vazio), editar a turma pondo Design Patterns (o aluno é matriculado na hora), arquivar (o convite vira revogado),
  e os erros `turma_arquivada`, `turma_invalida` e `turma_sem_curso`. As abas Alunos e Curadoria devolvem a turma. No fim
  Linux voltou a "visível pra todos"; a "Turma Teste 96" (arquivada) e o aluno de teste ficaram no banco local.
- **Sem verificação visual**: a sessão não tem navegador. O dono precisa conferir as telas novas contra o Figma.

## Dúvidas ou pontos abertos para a próxima fase

- Pôr um aluno que já existe numa turma pelo painel (sem convite) não existe: decisão adiada pelo dono.
- Matrícula de turma que falhou no meio não é refeita sozinha; hoje o caminho é o admin tirar e pôr o curso de novo.
- O curso Banco de Dados ainda não existe no banco: entra quando a curadoria criar `secret/conteudo/banco-de-dados/curso.json`
  e o seed rodar. Depois disso, marcar "Só pra turmas" na Curadoria e criar a turma.
