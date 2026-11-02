# Resumo — Fase 94: Painel de gestão (admin) e Medição de IA

Branch própria (`fase-94-painel-de-gestao`), pedida pelo dono em 10/10/2026. Telas aprovadas no Figma "Focadu — Pixel Art"
(`iNwXFcYXDajxkkhmyEr1gd`): "Medição de IA — v2" (página `244:4502`, IA 01–07 + N1) e "Painel de gestão — v1 (proposta)"
(página `263:4502`, PG 00–28), desenhadas pelo agente `figma-designer`.

## O que foi implementado

- **Papel de admin** (`User.Role`, enum `UserRole` Student/Admin, string no banco). Único jeito de virar admin: o comando
  `admin promover <email>` da Api (`admin rebaixar`, `admin listar`). Não existe rota HTTP pra isso.
- **Rotas `/api/admin/*`** atrás do `AdminAccessGuard`, que confere o papel **no banco** a cada chamada (não no JWT):
  rebaixar vale na hora. Quem não é admin recebe 403 `acesso_negado` (`ForbiddenException`, nova). `UserDto.IsAdmin` só
  decide se o menu mostra o item "Gestão".
- **Medição de IA** ("medir antes de limitar"): `AiUsageMeasuringHandler` (DelegatingHandler) em todos os clientes Groq, menos
  o ping de status. Lê o modelo do corpo enviado e o uso devolvido (`usage` do chat; `duration` da transcrição, que passou a
  pedir `verbose_json`) e grava um `AiUsageRecord` num DbContext próprio. A falha da medição só gera aviso no log, nunca quebra
  o fluxo do aluno. Cada retry conta. Aluno, curso e dia do curso vêm do `IAiUsageContext` (AsyncLocal), aberto pelos 8 casos
  de uso que chamam IA. Curso e dia ficam copiados no registro, sem chave estrangeira, e sobrevivem a apagar dia ou aluno.
- **Custo sempre estimado na leitura**: uso medido × `AiModelPrice` (tabela editável por modelo: US$/1 M tokens de entrada e de
  saída, ou US$/hora de áudio). `AiUsageSettings` (linha única) guarda `MeasuringSince` e o teto mensal, que é só informativo.
  A migration liga a medição no deploy (`now()`) e grava os preços iniciais: gpt-oss-120b 0,15/0,60 e whisper-large-v3 0,111/h.
- **Abas do painel** (`/gestao`, `/gestao/alunos`, `/gestao/convites`, `/gestao/curadoria`, `/gestao/uso-de-ia`):
  - **Visão geral**: alunos ativos 7/30 dias, cadastros por convite, dias concluídos, custo de IA do mês, gráfico de 14 dias,
    últimos cadastros e dias curados por curso.
  - **Alunos**: tabela ordenável, "Ocultar nomes", painel lateral com grade de dias por semana e **Resetar progresso** de um
    curso. Mostra uma prévia do que some e pede o e-mail do aluno pra confirmar. Apaga a matrícula (cascata) e matricula de novo
    na mesma transação.
  - **Convites**: lista por status, criar (gaveta, link e código pra copiar) e revogar. Limites de 1 a 20 usos e de 1 a 30 dias,
    padrão 7, e o convite sempre vence. Valem também no comando `convite`.
  - **Curadoria**: grade de dias com estado `em_dia`/`difere`/`so_no_arquivo`/`so_no_banco`/`sem_curadoria` (arquivo em
    `secret/conteudo` comparado com o banco pelo hash). Importar em lote em duas etapas: prévia com o linter e depois confirmar.
    É **tudo ou nada**, numa transação só (`IAdminMaintenance.InTransactionAsync`). **Apagar dias antigos** (decisão do dono:
    de qualquer curso) mostra a prévia (dias, alunos afetados, linhas por tabela) e pede o nome do curso pra confirmar. Leva
    junto as semanas e os módulos que ficarem vazios. Curso no banco sem pasta em `conteudo/` tem todos os dias como antigos.
  - **Uso de IA**: visão do mês (cartões, por tipo de chamada, teto, tabela de preços) e por aluno (tabela + custo por dia do
    curso com a média do curso), períodos mês/7d/30d e filtro de curso.
- **GlobalNav**: item "Gestão" só para admin (Figma 278:16583). Guia da tela `gestao` em `lib/guiaTelas.ts`.
- **Deploy**: a imagem do backend ganhou `nodejs` (o linter roda dentro do container quando o admin importa pelo painel). O
  `deploy.yml` instala as dependências do linter (`npm ci`, só `ajv`) no `secret/` do host com um `node:22-alpine` descartável,
  porque o `secret/` entra no container como somente leitura.

## Decisões técnicas tomadas que não estavam no prompt original

- **"Último acesso" = última resposta ou dia concluído**: o app não guarda login. "Ativo" segue a mesma regra.
- **O app não tem @usuário**: o "@" do painel vem da parte local do e-mail. A confirmação do reset é o **e-mail** do aluno, não
  o @ que aparece no Figma.
- **Reset de curso não mexe** em gems, sequência (são da conta), feedback do dia nem medição de IA.
- **Tipo de chamada = adapter**: a medição não separa "correção da transcrição" de "avaliação" (o Figma mostra as duas). Ambas
  vêm do `GroqContentEvaluationService` e aparecem como "Resumo falado · correção e avaliação".
- **`callType` vai como texto** no JSON. O resto da Api manda enum como número; aqui o front usa o nome pra rotular.
- **Apagar dias antigos** remove antes os `RoleplayOptions` daqueles dias: `NextNodeId` é Restrict e travava a cascata. Esse
  erro foi achado no teste local; a transação desfez tudo.
- **Aluno num dia apagado** segue pro primeiro dia curado que ainda não concluiu, porque a sequência é por progresso
  (`DailySequencing`). Confirmado pelo dono em 12/10/2026.
- O link "Abrir no Claude" usa `VITE_CLAUDE_URL` (padrão `https://claude.ai/code`). É só um link: o dono recusou o Claude por SSH
  dentro do app por segurança (o painel é público e teria um caminho da internet até o Mac).

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/AiUsage/            AiCallType, AiUsageRecord, AiModelPrice, AiUsageSettings
backend/src/Focadu.Domain/Enums/UserRole.cs
backend/src/Focadu.Domain/Repositories/IAiUsageRepository.cs
backend/src/Focadu.Application/Admin/         UserRoleAdminUseCase+AdminAccessGuard, AiUsage*, AdminPanel* (Dtos/UseCases)
backend/src/Focadu.Application/Ports/         IAiUsageContext, IAdminQueries, IAdminMaintenance
backend/src/Focadu.Application/Exceptions/ForbiddenException.cs
backend/src/Focadu.Infrastructure/AiUsage/    AiUsageContext (AsyncLocal), AiUsageMeasuringHandler
backend/src/Focadu.Infrastructure/Persistence/ AdminQueries, AdminMaintenance, Repositories/AiUsageRepository,
                                              Configurations/AiUsageConfiguration, Migrations/*Fase94PainelDeGestao
backend/src/Focadu.Api/Contracts/AdminRequests.cs  (+ rotas /api/admin e comando `admin` no Program.cs)
backend/tests/Focadu.Tests/Admin/AdminPanelTests.cs
frontend/src/api/admin.ts, adminTypes.ts
frontend/src/components/admin/                AdminShell, AdminUi, AdminGate, OverviewTab, StudentsTab, InvitesTab,
                                              CurationTab, AiUsageTab
frontend/src/lib/adminFormat.ts, adminStyles.ts
```

## Testes

- `Focadu.Tests`: 20 testes novos (`AdminPanelTests`): papel, limites e status do convite, custo por preço, teto, totais, fatia
  por tipo, modelo sem preço, custo por dia com média do curso, períodos, leitura do `usage`/`duration`, AsyncLocal, estado de
  cada dia da curadoria, tudo ou nada e confirmação digitada. Suíte inteira: 710 passam e 3 falham **fora do escopo**. As 3
  leem os dias reais do Linux em `secret/` (`TerminalMissionImporterTests` espera 4 missões no Dia 2, o arquivo tem 3;
  `BridgeDays_HaveCodeSteps`) e vêm da refação da curadoria, não deste código.
- Front: `tsc -b`, `oxlint` (sem aviso novo) e `npm run build` passam.
- **Ao vivo contra Postgres local**: aluno comum recebe 403. Testados também: `admin promover`, todas as leituras, convite
  fora do limite (25 usos, 40 dias) recusado, criar e revogar convite, teto 0 recusado, teto 5, preço salvo com autor. Na
  importação: prévia com linter, lote com dia sem arquivo recusado inteiro, dia `difere` importado (vira `em_dia`) e dia novo
  importado. No reset: prévia, confirmação errada recusada, reset certo (matrícula refeita). Em "apagar dias antigos", com
  `CURATED_CONTENT_ROOT` numa cópia sem o Dia 6 do Linux: prévia, nome errado recusado, 500 do roleplay (corrigido) e a
  exclusão de verdade. Depois o Dia 6 foi reimportado. Uma chamada real ao chat rápido foi medida (438/112 tokens, custo
  estimado).
- **Sem verificação visual**: a sessão não tem navegador. Layout, rolagem interna, gráficos, gavetas e modais das telas não
  foram conferidos com os olhos.

## Dúvidas ou pontos abertos para a próxima fase

- Em produção, a primeira importação pelo painel depende do passo novo do `deploy.yml` (dependências do linter). Conferir no
  primeiro deploy. Rodar `admin promover` com o e-mail do dono na VM
  (`docker compose exec backend dotnet Focadu.Api.dll admin promover <email>`).
- Antes de "Apagar dias antigos" em produção, fazer backup do Postgres. O botão não exige backup.
- O teto mensal é só referência. Trocar de modelo ao passar dele é decisão futura.
