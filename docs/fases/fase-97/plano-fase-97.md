# Plano — Fase 97: Painel de gestão, lacunas de operação

Status: **fechada em 14/10/2026** (backend, front e docs; ver `resumo-implementacao-fase-97.md`). Aberta em 13/10/2026. Pré-requisito do passo seguinte (aba "Gerar dia" com a API da
Anthropic, Fase 98+): primeiro o painel precisa cobrir a operação do dia a dia sem ninguém entrar na VM.

Decisões do dono nesta abertura (13/10/2026):
- Escopo: editar usuário, excluir usuário, criar/editar curso, promover/rebaixar admin.
- Excluir usuário = **desativar (soft delete)**: conta bloqueada, dados preservados, reversível.
- Primeiro só plano e docs. Esta máquina não tem `dotnet` nem `node`, então nada foi compilado ou testado.

## 1. Usuários (aba Alunos)

| Ação | Comportamento | Observações |
|---|---|---|
| Editar nome e e-mail | `PUT /api/admin/students/{id}`; e-mail segue a regra de unicidade do `RegisterUserUseCase`. | Mudar e-mail zera `EmailVerifiedAt`: o aluno sempre confirma de novo (decisão 4). |
| Redefinir senha | `POST /api/admin/students/{id}/password-reset` reaproveita `RequestPasswordResetUseCase` e manda o e-mail de redefinição. | O admin **nunca define nem vê** a senha. |
| Desativar / reativar | `POST .../disable` e `.../enable`. Prévia + confirmação digitando o e-mail, igual ao reset de curso. | Coluna nova `Users.DisabledAt` (nullable). Login recusado com `conta_desativada`. |
| Promover / rebaixar admin | `PUT .../role`. Substitui o comando `admin promover` (o comando continua existindo como plano B). | Não pode rebaixar nem desativar a si mesmo, nem o último admin. |

Pontos de atenção:
- JWT já emitido continua válido até expirar. Para a desativação valer na hora, conferir `DisabledAt` no banco no
  `/auth/me` e num filtro de autorização, do mesmo jeito que o `AdminAccessGuard` confere o papel. Custo: uma consulta por
  chamada autenticada (decisão 1, seção 4).
- Desativar não mexe em matrículas, gems, streak, squad nem medição de IA. Aluno desativado some do ranking e do squad
  dos colegas (decisão 2).
- Tabela de alunos ganha filtro "desativados" e selo na linha.

## 2. Cursos (nova aba "Cursos", ou dentro de Curadoria)

| Ação | Comportamento |
|---|---|
| Criar curso | Nome, descrição, requisitos, recomendados antes, texto "prepara", status (Draft/Active), "só pra turmas". Cria curso vazio. Estrutura de semanas e dias continua vindo da curadoria (`importar`). |
| Editar curso | Mesmos campos. Publicar = Draft → Active. |
| Arquivar | Active → Draft. Não apaga nada. |

**Conflito e solução proposta (decisão 3):** hoje `secret/conteudo/<curso>/curso.json` é a fonte de nome, descrição, requisitos
e recomendações, e o seed/importador reescreve esses campos. Edição pelo painel seria sobrescrita no próximo deploy. Opções:
(a) painel só edita o que o `curso.json` não define (status, "só pra turmas"); (b) o `curso.json` passa a valer só na criação
e o banco vira a fonte; (c) painel grava no `curso.json` (precisa de escrita no `secret/`, o que a Fase 94 evitou).

## 3. Ordem de trabalho proposta

1. Migration: `Users.DisabledAt` e `Courses.CatalogEditedAt`. Domínio (`User.Disable/Enable/ChangeEmail/ChangeName`) com testes de domínio.
2. Casos de uso em `Focadu.Application/Admin/` e rotas em `/api/admin` (atrás do `AdminAccessGuard`).
3. Filtro de conta desativada no login e no `/auth/me`.
4. **Figma antes do front** (regra da Fase 74): telas "Aluno — editar", "Aluno — desativar", "Curso — criar/editar", pelo agente
   `figma-designer`; o dono aprova.
5. Front: `StudentsTab` (editar, desativar, papel), aba Cursos; atualizar `lib/guiaTelas.ts`.
6. Testes (`AdminPanelTests`), CI, fechamento da fase (resumo, ARQUITETURA, HISTORICO-FASES, CLAUDE.md).

## 4. Decisões do dono (13/10/2026)

1. **Desativação vale na hora:** `DisabledAt` é conferido no banco a cada chamada autenticada (filtro de autorização) e no
   login. JWT já emitido deixa de funcionar assim que o admin desativa.
2. **Aluno desativado desaparece** do ranking e do squad dos colegas. Dados continuam no banco; reativar traz de volta.
3. **Fonte dos campos do curso (sugestão do Claude, a confirmar):**
   - O nome continua vindo do `curso.json` e é só leitura no painel, porque seed e importador ligam a pasta
     `secret/conteudo/<curso>` ao curso pelo nome (renomear criaria um curso duplicado).
   - Descrição, requisitos, recomendados antes e texto "prepara": o `curso.json` preenche na criação; na primeira edição
     pelo painel o curso ganha `CatalogEditedAt` e seed/importador não reescrevem mais esses campos. Botão "voltar ao
     curso.json" limpa a marca.
   - Status e "só pra turmas" ficam sempre com o painel.
   - Criar curso pelo painel cria um curso vazio; ele só ganha dias quando existir a pasta de mesmo nome em `secret/conteudo/`
     (a tela avisa).
4. **Trocar o e-mail pelo admin exige nova confirmação** do aluno (`EmailVerifiedAt` zerado), sem opção de manter.

## 5. Fora de escopo desta fase

- Excluir usuário em cascata (descartado: desativar cobre o caso e é reversível).
- Editar a estrutura de semanas e dias pelo painel.
- Disparar deploy pelo painel e escrever no repo `focadu-secret` (continua com commit e push manuais).
- Geração de conteúdo com a API da Anthropic (Fase 98+).

## 6. Andamento (14/10/2026)

Feito e testado (`dotnet build` limpo, 704 testes passando fora os 3 que precisam do `focadu-secret`):
- Migration `Fase97LacunasDoPainel`: `Users.DisabledAt`, `Courses.CatalogEditedAt`, `Courses.StatusSetByAdminAt`.
- Domínio: `User.Disable/Enable/ChangeEmail/ChangeDisplayName`; `Course.EditCatalog/ClearCatalogEdit/PublishByAdmin/UnpublishByAdmin/CanAutoPublish`.
- Desativação na hora: `OnTokenValidated` do JWT (`IUserRepository.IsDisabledAsync`) e `conta_desativada` no login; fora do ranking, do squad e do QG.
- Casos de uso `AdminUserManagementUseCase` e `AdminCoursesUseCase`; rotas `PUT /students/{id}`, `POST .../password-reset|disable|enable`, `PUT .../role`, `GET|POST /courses`, `PUT /courses/{id}`, `POST .../publish|unpublish|revert-catalog`.
- Decisão extra: o admin publicar/arquivar um curso (`StatusSetByAdminAt`) impede seed e importador de reativá-lo sozinhos.

Falta: Figma (passo 4), front (passo 5), `AdminPanelTests`/CI e fechamento da fase (passo 6).
