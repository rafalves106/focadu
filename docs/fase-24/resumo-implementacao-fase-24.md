# Resumo — Fase 24: Squad (Fase A)

## O que foi implementado

### Domínio (`Focadu.Domain.Squads`)

- **`Squad`**: `Name`/`OwnerUserId`/`JoinCode?`/`CreatedAt`. `JoinCode` nasce nulo -
  `AssignJoinCode` só pode ser chamado 1 vez (mesmo padrão de `User.AssignReferralCode`, Fase
  17). Alfabeto/tamanho do código (8 caracteres, sem `0/O/1/I`) extraídos pro novo
  `Focadu.Application.Shared.UniqueCodeGenerator`, reaproveitado por `GetReferralInfoUseCase`
  (refatorado nesta fase, mesmo comportamento) e `GetSquadRankingUseCase`.
- **`SquadMembership`**: `SquadId`/`UserId`/`JoinedAt`, sem invariante própria além de existir
  (mesmo padrão de `Enrollment`). "1 squad ativo por usuário" é garantido em 2 camadas: a
  Application checa antes de criar/entrar, e um índice único em `UserId` garante no banco. Sair
  do squad é hard delete desta linha - não há flag "inativo".
- **`ISquadRepository`** (port, mesmo padrão de `IEnrollmentRepository`): CRUD de `Squad` +
  `SquadMembership` (por id, por `JoinCode`, por `UserId` do membro, todos os membros de um
  squad).

### Aplicação (`Focadu.Application.Squads`)

- **`CreateSquadUseCase`**: cria o squad com o usuário logado como Owner + primeiro membro.
  Rejeita se o usuário já está em outro squad (`ja_esta_em_squad`, 409). `JoinCode` fica nulo -
  não é gerado aqui.
- **`JoinSquadUseCase`**: entra por `JoinCode` (sem aprovação - quem tem o código entra direto).
  Código inválido vira `codigo_invalido` (404, mesmo tratamento de recurso inexistente do resto
  da Api); já estar em outro squad vira `ja_esta_em_squad` (409).
- **`LeaveSquadUseCase`**: sai do próprio squad. Owner só pode sair sozinho (último membro) -
  com outros membros ainda dentro, sai bloqueado (`dono_nao_pode_sair`, 409) em vez de inventar
  transferência de posse (ver "Decisões técnicas").
- **`RemoveMemberUseCase`**: Owner remove outro membro. Quem pede sem ter squad, ou sem ser o
  Owner do squad em questão, recebe `squad_nao_encontrado` (404) - nunca um erro de permissão
  distinto, mesmo padrão "404 não 403" já usado em todo `GetXxxUseCase` que filtra por dono (ex:
  `IWeeklyRepository.GetByIdAsync(id, userId)`).
- **`GetSquadRankingUseCase`**: ranking dos membros do próprio squad, reaproveitando
  `GetCourseRankingUseCase.ComputeScore`/`RankEntries`/`RankingEntryDto` (Fase 16) direto -
  mesmo princípio de Score sempre computado sob demanda, nunca persistido. Também é onde
  `Squad.JoinCode` é gerado (lazy, na 1ª vez que qualquer membro pede o próprio ranking) - não
  há endpoint dedicado "GET /squads/me", esta consulta já devolve tudo que a tela de Squad
  precisa numa única chamada (nome, código pra compartilhar, classificação, agregados).

### Endpoints

`POST /api/squads`, `POST /api/squads/join`, `DELETE /api/squads/members/{userId}` (mesma rota
serve "sair" - `{userId}` igual ao usuário logado - e "Owner remove alguém" - `{userId}`
diferente), `GET /api/squads/me/ranking?scope=weekly|monthly|course`. Todos
`RequireAuthorization()`, mesmo padrão do resto da Api.

### Migration

`AddSquads` - cria `Squads` (índice único em `JoinCode`, nullable) e `SquadMemberships` (índice
único em `UserId` - é o que garante "1 squad ativo por usuário" no banco). Puramente aditiva,
aplicada contra o Postgres de dev existente sem recriar nada.

### Frontend

- **`api/types.ts`/`api/client.ts`**: `SquadDto`/`SquadRankingResultDto` +
  `createSquad`/`joinSquad`/`leaveSquad`/`removeSquadMember`/`getSquadRanking`.
- **Nova aba "Squad" no Perfil** (`ProfileTabs.tsx` ganhou a 4ª aba, `ProfilePage.tsx` roteia
  `?tab=squad`) - decisão tomada olhando o arquivo: as 3 abas existentes (Informações/
  Customização/Conquistas) são todas leitura+ação pontual sobre o próprio usuário, enquanto
  Squad tem um fluxo próprio (criar/entrar/sair/remover + uma classificação), então ganhou aba
  nova em vez de forçar dentro de Conquistas.
- **`components/profile/SquadTab.tsx`**: reaproveita `RankingScopeTabs`/`RankingTable`/
  `CurrentUserRankingCard` (Fase 16) direto pra classificação - só troca a fonte dos dados
  (squad em vez do Course inteiro). Estado vazio "squad_nao_encontrado" (404) vira um formulário
  de criar/entrar por código, mesmo padrão de `StartDashboard` tratando
  `nenhuma_matricula_ativa` como `EmptyStateStartPage` em vez de erro genérico. Owner ganha uma
  lista simples de "remover membro"; qualquer membro tem "sair do squad".

## Decisões técnicas tomadas que não estavam no prompt original

- **Owner não pode sair enquanto há outros membros** (`dono_nao_pode_sair`, 409) - o prompt não
  cobria esse caso. Transferir a posse pra outro membro automaticamente resolveria, mas é uma
  regra nova não pedida ("papéis além de owner/member" foi explicitamente vetado); bloquear com
  mensagem clara ("remova todos os membros antes") ficou dentro do escopo pedido. Squad com 0
  membros nunca acontece por causa disso - não foi implementada limpeza de squads órfãos.
- **`GET /api/squads/me/ranking` funciona como "tela inicial do squad"**, não só ranking - é ali
  que `JoinCode` é gerado (lazy) e devolvido, então o frontend não precisa de um 5º endpoint
  "GET /squads/me" só pra mostrar nome/código. A lista de endpoints do prompt já sugeria isso
  (só 4 rotas, nenhuma dedicada a "info do squad").
- **Gems no ranking do squad NUNCA respeitam `scope`** (sempre o saldo total de cada membro) -
  diferente de Score. `UserGemBalance` (Fase 14) só guarda o saldo total e um contador "neste mês
  calendário" pro cap de ganho, sem nenhum histórico por semana/posição no currículo; forçar um
  recorte "semanal" nele seria inventar um dado que não existe. `TotalGems`/`AverageGems` no DTO
  cobrem o "soma/média de Gems" pedido no prompt sem essa invenção.
- **`SquadRankingResultDto` reaproveita `RankingEntryDto` (Fase 16) sem alteração nenhuma** pros
  membros - permitiu reusar `RankingTable`/`CurrentUserRankingCard` no frontend sem tocar em
  nenhum dos dois (ambos continuam servindo só `RankingPage`/`SquadTab`, sem parâmetro squad-
  específico). Os agregados do squad (`TotalScore`/`AverageScore`/`TotalGems`/`AverageGems`)
  ficaram como campos extras no DTO, ao lado da lista de membros.
- **`UniqueCodeGenerator` extraído de `GetReferralInfoUseCase`** pro alfabeto/algoritmo ficarem
  literalmente compartilhados (não só "parecidos") entre `ReferralCode` e `Squad.JoinCode`,
  atendendo ao "mesmo alfabeto... já usado por ReferralCode" do prompt sem duplicar as 10 linhas
  de geração+retry em dois lugares.
- **Código de entrada trim-only na comparação** (sem normalizar maiúscula/minúscula), igual
  `ReferralCode`/`RegisterUserUseCase` - o frontend força o campo pra maiúscula ao digitar
  (`JoinSquadForm`), então a comparação exata funciona sem precisar mexer no backend.

## Estrutura de arquivos criada/alterada

```
backend/src/Focadu.Domain/
├── Squads/Squad.cs, SquadMembership.cs                          (novo)
└── Repositories/ISquadRepository.cs                             (novo)

backend/src/Focadu.Application/
├── Squads/CreateSquadUseCase.cs, JoinSquadUseCase.cs,
│         LeaveSquadUseCase.cs, RemoveMemberUseCase.cs,
│         GetSquadRankingUseCase.cs                               (novo)
├── Shared/UniqueCodeGenerator.cs                                 (novo)
├── Referrals/GetReferralInfoUseCase.cs                           (alterado - usa UniqueCodeGenerator)
└── DependencyInjection.cs                                        (alterado)

backend/src/Focadu.Infrastructure/
├── Persistence/Repositories/SquadRepository.cs                   (novo)
├── Persistence/Configurations/SquadConfiguration.cs,
│                              SquadMembershipConfiguration.cs     (novo)
├── Persistence/FocaduDbContext.cs                                 (alterado)
├── Migrations/20260829030516_AddSquads.cs (+ .Designer.cs)        (novo)
└── DependencyInjection.cs                                        (alterado)

backend/src/Focadu.Api/
├── Contracts/SquadRequests.cs                                    (novo)
└── Program.cs                                                    (alterado - 4 endpoints)

backend/tests/Focadu.Tests/
├── Squads/SquadTests.cs                                          (novo)
└── Shared/UniqueCodeGeneratorTests.cs                             (novo)

frontend/src/
├── api/types.ts, api/client.ts                                   (alterado)
├── components/profile/ProfileTabs.tsx                            (alterado - 4ª aba)
├── components/profile/SquadTab.tsx                               (novo)
└── routes/ProfilePage.tsx                                        (alterado)
```

## Testes

- Backend: `dotnet build`/`dotnet test` limpos, **230 aprovados** (todos os pré-existentes +
  novos: `Squad`/`SquadMembership` (construção, `AssignJoinCode` só uma vez/vazio rejeitado -
  mesmo roteiro de `UserTests.AssignReferralCode`), `UniqueCodeGenerator` (tamanho/alfabeto do
  código, retry até achar um candidato livre, `InvalidOperationException` se sempre ocupado).
  `GetSquadRankingUseCase` não ganhou teste dedicado - só orquestra repositórios (mesmo critério
  já documentado em `docs/ARQUITETURA.md`, "`Focadu.Tests` só testa domínio puro": nenhum
  `GetXxxRankingUseCase`/`GetXxxCatalogUseCase` tem teste de integração, só os núcleos
  `internal static` que não dependem de repositório).
- **Verificação ao vivo** (Postgres real, instância temporária da Api numa porta separada pra
  não interferir com a instância de dev já rodando, via `curl`): registro de 2 usuários → criar
  squad (Owner) → `GET .../ranking` gera e devolve o `JoinCode` (`N5LKJHWS`, alfabeto correto) →
  2º usuário entra com o código → ranking mostra os 2 membros → tentativa de entrar/criar de novo
  rejeitada (`ja_esta_em_squad`, 409) → Owner tenta sair com o outro membro ainda dentro
  (`dono_nao_pode_sair`, 409) → membro tenta remover o Owner sem ser o Owner (`squad_nao_encontrado`,
  404) → Owner remove o membro (204) → membro removido confirmado livre (`GET .../ranking` dele
  vira 404 de novo) → Owner (sozinho agora) sai (204) → `GET .../ranking` dele confirma sem squad.
  Todos os status/códigos de erro bateram com o esperado. Usuários de teste removidos do banco ao
  final.
- Frontend: `tsc -b`, `oxlint src`, `vite build` limpos (só o warning pré-existente de
  `TodayPage.tsx`, mesmo de todas as fases anteriores desde a 22). **Não exercitado ao vivo via
  Playwright** nesta fase - havia uma instância de dev (`localhost:5173`/`:5282`) já em uso por
  outra sessão em paralelo neste mesmo repositório (trabalho não relacionado, em
  `GitHubService`/adapters da Groq); evitado tomar conta dela pra não interromper esse trabalho.
  Compensado com a verificação de backend via `curl` (que exercita exatamente os mesmos
  endpoints que `SquadTab.tsx` chama) + `tsc -b` limpo (garante que os tipos de
  `SquadRankingResultDto`/`SquadDto` batem entre front e back).

## Fase 24b - sucessão de liderança + limpeza (2026-08-31)

Duas pendências abaixo foram fechadas a pedido do usuário, com referência explícita ao Clash of
Clans:

- **Squads com 0 membros agora são deletados** - `LeaveSquadUseCase` chama
  `ISquadRepository.RemoveAsync` quando o Owner sai sozinho, em vez de deixar a linha órfã.
- **Transferência de posse automática** - `Squad` ganhou `CoLeaderUserId` (opcional, promovido
  pelo Owner via `PUT /api/squads/co-leader/{userId}`, rebaixado via `DELETE .../co-leader`,
  `SetSquadCoLeaderUseCase`). Quando o Owner sai com outros membros dentro: o Co-Leader herda a
  liderança; sem Co-Leader, o membro com `SquadMembership.JoinedAt` mais antigo (lógica pura em
  `LeaveSquadUseCase.ResolveSuccessor`, testada sem repositório, mesmo critério de
  `GetCourseRankingUseCase.ComputeScore`). `dono_nao_pode_sair` não existe mais como bloqueio -
  sair do próprio squad sempre funciona agora, com ou sem outros membros.
- Se o membro removido/que saiu era o Co-Leader, o cargo esvazia (`ClearCoLeaderIfMatches`) em vez
  de apontar pra alguém fora do squad.
- Migration `AddSquadCoLeader`, puramente aditiva - **não aplicada contra o Postgres de dev**
  (Docker Desktop não estava rodando na sessão que fez esta mudança); rodar
  `dotnet ef database update --startup-project backend/src/Focadu.Api --project backend/src/Focadu.Infrastructure`
  antes de usar o backend.
- Backend: 238 testes (230 anteriores + 8 novos: `Squad.PromoteCoLeader`/`ClearCoLeader`/
  `ClearCoLeaderIfMatches`/`TransferOwnership`, `LeaveSquadUseCase.ResolveSuccessor` com/sem
  Co-Leader e Co-Leader que já saiu). `tsc -b`/`oxlint` limpos no frontend - **não verificado ao
  vivo** (mesma limitação de Postgres acima, mais a instância de dev compartilhada mencionada na
  Fase 24 original).

## Dúvidas ou pontos abertos para a próxima fase

- **`SquadTab.tsx` nunca foi visto renderizado de verdade num navegador** (ver "Testes" acima) -
  recomendado um passe visual/Playwright assim que a outra sessão em paralelo liberar a
  instância de dev compartilhada, antes de considerar o frontend desta fase 100% fechado.
- **Ranking do squad não pagina/limita** (diferente de `GetCourseRankingUseCase`, que corta em
  10) - squads são times pequenos por natureza (sem convite/aprovação, cresce só por quem tem o
  código), então não pareceu necessário; reavaliar se squads gigantes aparecerem na prática.
- **Detectado trabalho concorrente não relacionado no mesmo repositório** durante esta fase
  (retry/timeout em `GitHubService`/adapters da Groq, `HttpRetry.cs` novo, `Focadu.Tests.csproj`
  alterado) - nenhum arquivo dessa frente foi tocado ou commitado por esta fase; só os arquivos
  listados em "Estrutura de arquivos" acima entraram no commit de fechamento desta fase.
