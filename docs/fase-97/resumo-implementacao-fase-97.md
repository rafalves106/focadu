# Resumo — Fase 97: Painel de gestão, lacunas de operação

Aberta em 13/10/2026 e fechada em 14/10/2026, na branch `fase-97-lacunas-do-painel`. Pré-requisito da aba "Gerar dia" (Fase 98+):
primeiro o painel cobre a operação do dia a dia sem ninguém entrar na VM. Plano e decisões do dono em `plano-fase-97.md`. Telas no
Figma "Focadu — Painel de gestão, Fase 97" (`Uvy09SJEA9phpWZWRzj2ol`, quadros A01–A10, C01–C05, N01–N02), desenhadas pelo agente
`figma-designer` e **aprovadas pelo dono em 14/10/2026**, com os ajustes de texto feitos direto no código.

## O que foi implementado

- **Alunos (aba Alunos)**:
  - editar nome e e-mail (`PUT /api/admin/students/{id}`); trocar o e-mail zera `EmailVerifiedAt` e o aluno confirma de novo;
  - enviar o e-mail de redefinição de senha (`POST .../password-reset`, reaproveita `RequestPasswordResetUseCase`); o admin nunca
    vê nem define a senha; conta desativada é recusada (`conta_desativada`);
  - desativar e reativar (`POST .../disable` com o e-mail digitado como confirmação, `POST .../enable`), soft delete em
    `Users.DisabledAt`;
  - tornar e tirar admin (`PUT .../role`, corpo `{admin}`); o comando `admin promover` continua como plano B;
  - travas: não desativa nem rebaixa a si mesmo, não desativa admin (tire o papel antes), não promove conta desativada, não
    rebaixa o último admin.
- **Desativação vale na hora**: o login recusa com 403 `conta_desativada`; o JWT já emitido deixa de valer porque
  `OnTokenValidated` confere `DisabledAt` no banco a cada chamada autenticada (401 `conta_desativada`). O aluno desativado some do
  ranking do curso, do ranking do squad e do QG; matrículas, gems, sequência e notas ficam e voltam ao reativar.
- **Cursos (aba nova Cursos)**: listar (`GET /api/admin/courses`), criar curso vazio (`POST`, sempre rascunho), editar o texto
  do catálogo (`PUT /courses/{id}`: descrição, "antes de começar", recomendados antes, "prepara", "só pra turmas"), publicar,
  arquivar e "voltar ao curso.json" (`POST .../publish|unpublish|revert-catalog`).
- **Front**: `StudentsTab` ganhou filtro Todos/Ativos/Desativados, selo e o bloco "// CONTA" (`StudentAccount.tsx`: gaveta de
  editar, modais de senha, papel e desativar); `CoursesTab.tsx` (lista, detalhe, gaveta de criar/editar, modais de publicar,
  arquivar e voltar); `Drawer` e `DrawerHeader` viraram componentes compartilhados em `AdminUi.tsx`; o `client.ts` trata o 401
  `conta_desativada` como sessão encerrada; `lib/guiaTelas.ts` atualizado.

## Decisões técnicas tomadas que não estavam no prompt original

- **Nome do curso é só leitura**: seed e importador ligam a pasta `secret/conteudo/<curso>` ao curso pelo nome.
- **`Courses.CatalogEditedAt`**: a primeira edição pelo painel marca o curso; `SyncCourseRecommendationsUseCase` e o importador
  deixam de reescrever descrição, requisitos, recomendados e "prepara". "Voltar ao curso.json" limpa a marca e reaplica
  `curso.json` e `recomendacao.json`. Status e "só pra turmas" são sempre do painel.
- **`Courses.StatusSetByAdminAt`** (decisão do Claude, não estava no plano): publicar ou arquivar pelo painel impede seed e importador
  de publicar o curso sozinhos (`Course.CanAutoPublish`). Sem isso, importar um dia reativaria o curso arquivado.
- **Publicar exige ao menos um dia importado** (`curso_sem_dias`); criar curso já publicado (`publish=true`) é recusado pelo mesmo
  motivo.
- **Arquivar** (Active → Draft) não apaga nada; quem já está matriculado continua com acesso (`CourseViewer.CanSee`), só some do
  catálogo para novos alunos.
- **Custo da desativação imediata**: uma consulta leve (`IUserRepository.IsDisabledAsync`) por chamada autenticada; usuário
  inexistente conta como desativado.
- **Filtro padrão da aba Alunos é "Todos"** (decisão do dono); a linha desativada fica apagada com selo.
- Texto de ajuda dos campos no Figma em `secondary` em vez de `muted`: `#5c5c5c` sobre `#0a0a0a` não passa no contraste AA.

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/Admin/AdminUserManagementUseCase.cs, AdminCoursesUseCase.cs
backend/src/Focadu.Infrastructure/Migrations/20261014030000_Fase97LacunasDoPainel(.Designer).cs
backend/tests/Focadu.Tests/Admin/Fase97Tests.cs
frontend/src/components/admin/StudentAccount.tsx, CoursesTab.tsx
docs/fase-97/plano-fase-97.md, resumo-implementacao-fase-97.md
```

## Testes

- Domínio (`Fase97Tests`, 9 métodos): desativar/reativar (idempotente), troca de e-mail e reset da verificação, nome aparado,
  `EditCatalog`/`ClearCatalogEdit`, o Sync que pula curso editado, `CanAutoPublish` depois de publicar/arquivar pelo admin.
- `dotnet test` (fora os 3 que precisam do `focadu-secret`): **704 aprovados, 0 falhas**.
- Ao vivo, API real contra Postgres local descartável (migration aplicada, 3 colunas criadas): rotas de aluno e de curso
  exercitadas por HTTP, incluindo 403 para aluno comum, 409 e-mail duplicado, confirmação digitada, queda imediata da sessão ao
  desativar e volta ao reativar, travas de si mesmo/admin/conta desativada e `curso_sem_dias`.
- Front: `npx tsc -b` limpo, `npm run build` ok, `npm run lint` sem achados nos arquivos novos (2 avisos antigos em
  `TodayPage.tsx` e `ScrollArea.tsx`).

## Dúvidas ou pontos abertos para a próxima fase

- **Não verificado**: o visual no navegador (as sessões automatizadas não têm navegador) e a conferência contra o Figma
  (espaçamento, fundo dos modais, notebook 1280×720, glifos ↕ ↗ ✕ no Silkscreen); envio real do e-mail de redefinição (sem SMTP
  local, a rota respondeu 502 `smtp_nao_configurado`); publicar com sucesso e "voltar ao curso.json" (o seed não rodou, sem curso
  com dias e pasta no banco de teste); ranking, squad e QG sem o aluno desativado; a regra do "último admin" só é alcançável pela
  Api com 2 admins, e a trava de rebaixar a si mesmo age antes.
- A migration **não foi aplicada em produção**; ela roda sozinha no boot da Api no deploy.
- `AdminPanelTests`/CI: sem teste de Application (o projeto não tem fakes de repositório), só domínio.
- Próximo passo planejado: aba "Gerar dia" com a API da Anthropic (Fase 98+).
