# Resumo — Fase 72: Perfil "tela do agente" e QG do Squad

Pedido do Falves (24/09/2026): ele não gostou do Perfil da Fase 70 (casca da Daily em abas) e pediu um
desenho próprio no Figma, com o Squad virando uma tela separada que mostrasse as últimas atividades dos
membros. O desenho foi feito no Figma "Focadu — Pixel Art", página "Perfil + Squad — v2 (proposta)"
(node `120:4502`): Perfil `120:4503`, QG membro `121:6971`, QG líder `125:9441`, Convidar `125:12224`,
sem squad `126:14410`, celulares `127:15096`/`128:16846` e as notas de UX `123:9443`. O Falves aprovou e
decidiu: a meta da semana entra (o valor em Gems fica pra depois), o feed tem a opção de esconder as
notas e o "Indique um amigo" vai pro QG.

## O que foi implementado

- **Perfil sem abas (`/perfil`)**: palco do agente à esquerda (sprite em 8x no desktop largo e alto,
  6x no resto, holofote em degraus, pedestal, os 4 slots do que está vestindo recortados da folha de
  cada peça, curso ativo com a região e o progresso em blocos, "Trocar visual" e Configurações). À
  direita: ofensiva, score e posição no curso, Gems (abre a Loja), estante de troféus com a próxima
  badge, atalho do QG, últimos 14 dias e dossiê. Guarda-roupa e a lista completa de conquistas abrem
  em modal (`?abrir=guarda-roupa|conquistas`; os `?tab=` antigos continuam funcionando e
  `?tab=squad` vai pro `/squad`).
- **QG do Squad (`/squad`)**, destino do botão Squad do menu, do mapa e do celular:
  - cabeçalho com nome, "desde", líder/co-líder, código e **Convidar**;
  - **escalação** com cada membro de pé com o próprio agente, a coroa no líder, a marca VOCÊ e se já
    estudou hoje (ou quando estudou por último);
  - **meta da semana**: Dailies somadas de segunda a domingo, 5 por membro;
  - **feed de últimas atividades** (14 dias) separado por dia, com filtros e **GG** de um toque;
  - **ranking com pódio** (os agentes em cima dos blocos), recorte Semana/Mês/Curso; o líder gerencia
    pelo "⋯" de cada linha e sair pede confirmação da Focada dizendo quem assume;
  - **Convidar**: modal com o código do squad e o link de indicação;
  - **sem squad**: o agente sozinho no palco com as vagas, criar/entrar com código e "Indique um amigo".
- **Backend**:
  - `GET /api/squads/me/hq` (`GetSquadHqUseCase`);
  - `POST /api/squads/me/cheers` (`ToggleSquadCheerUseCase`, entidade `SquadCheer`);
  - `GET /api/users/me/study-calendar` (`GetStudyCalendarUseCase`);
  - `PUT /api/users/me/squad-feed-privacy` (`UpdateSquadFeedPrivacyUseCase`);
  - `UserDto` ganhou `CreatedAt` e `HideScoresInSquadFeed`;
  - migration `SquadHqCheersAndFeedPrivacy`.
- **Configurações**: interruptor "Esconder minhas notas no feed do squad", salvo no backend (não em
  localStorage, porque vale pros colegas).
- **Mock** (`npm run dev:mock`): QG, GG, calendário, privacidade e o detalhe do curso (só os campos
  que o Perfil lê). `/__mock/squad?as=membro|lider|nenhum` agora abre `/squad`.

## Decisões técnicas tomadas que não estavam no prompt original

- **O feed não é persistido.** As atividades são derivadas na leitura de datas que já existiam:
  - `Daily.CompletedAt`, com a nota de `Daily.CalculateScore`;
  - `WeeklyProject.EvaluatedAt`;
  - `UserCosmeticInventory.AcquiredAt`;
  - `SquadMembership.JoinedAt`.

  Sem tabela de eventos nem escrita nova nos fluxos de estudo. O GG aponta pra atividade por uma chave
  estável em texto (`"tipo:autor:id"`) em vez de FK.
- **O que ficou fora do feed**: badges (são calculadas sob demanda e não têm data de conquista) e
  marcos de ofensiva (`UserStreak` só guarda o valor atual). Por isso o filtro "Conquistas" do Figma
  virou "Squad" (entrada no squad + agente novo).
- **Criação do agente vira 1 atividade**: o kit básico e o 1º cabelo natural chegam juntos; o cabelo
  grátis (mesmo minuto do kit) não aparece como "comprou".
- **Meta da semana**: 5 Dailies por membro (folga sobre as 6 da semana); reforço não conta. **Nenhuma
  Gem é creditada** até o dono decidir o valor. A tela mostra "Recompensa em Gems chegando em breve".
- **Privacidade**: a nota some só pros colegas; o próprio aluno sempre vê as dele. O reforço nunca
  tem nota no feed.
- **Últimos 14 dias**: `UserStreak` guarda só a última folga usada, então uma folga mais antiga
  dentro da janela aparece como "faltou". Pausa (projeto aberto) vem de `StreakPauseWindows`.
- **`SquadJoinCode.EnsureAsync`**: a geração lazy do código saiu do `GetSquadRankingUseCase` pra ser
  usada também pelo QG.
- **Líder**: a lista do ranking repete o top 3 abaixo do pódio, pra ele conseguir gerenciar quem
  está no pódio.
- **"Ver no feed" do menu do líder (Figma) não foi feito.** O menu tem só co-líder e remover.
- **Não foi implementado: quem entra pelo link de indicação cair direto no squad.** A ideia apareceu
  no Figma, sem decisão. O modal de convite diz "depois é só mandar o código do squad".
- **Escala do agente por JS** (`useStageScale`): as duas versões por CSS com variante de altura
  brigavam na ordem das classes. O pedestal acompanha a escala pra caber entre os slots em 1280px.
- **A Focada saiu do Perfil**: o desenho novo não tem a fala dela.
- **Removidos**: `AgentSheet` (e o `AgentAvatar`, sem outro uso), `ReferralPanel`, `ProfileTabs`,
  `InformationTab` (o `Section` foi pra `profile/Section.tsx`) e `SquadTab`.
- **Mock**: o detalhe do curso do mock só tem os campos que o Perfil lê. A trilha
  (`/start?course=`) do mock continua sem suporte, como antes.

## Estrutura de arquivos criada

```
backend/src/
├── Focadu.Domain/Squads/          SquadCheer.cs, SquadWeeklyGoal.cs (novos); ISquadRepository (+GG)
├── Focadu.Domain/Users/User.cs    HideScoresInSquadFeed + SetSquadFeedPrivacy
├── Focadu.Application/Squads/     GetSquadHqUseCase.cs, ToggleSquadCheerUseCase.cs, SquadJoinCode.cs
├── Focadu.Application/Gamification/GetStudyCalendarUseCase.cs
├── Focadu.Application/Users/      UpdateSquadFeedPrivacyUseCase.cs; UserDto (+CreatedAt, +privacidade)
└── Focadu.Infrastructure/         SquadCheerConfiguration.cs, SquadRepository (+GG),
                                   Migrations/*_SquadHqCheersAndFeedPrivacy
backend/tests/Focadu.Tests/        Squads/SquadHqTests.cs, Gamification/StudyCalendarTests.cs
frontend/src/
├── routes/                        SquadPage.tsx (novo), ProfilePage.tsx (reescrito)
├── components/squad/              pixelStage, SquadHero, SquadFeed, SquadRanking, InviteModal, NoSquadView
├── components/profile/            AgentStage.tsx, ProfileCards.tsx, Section.tsx (novos)
├── components/SettingsMenu.tsx    interruptor de privacidade do feed
└── lib/agentSprites.ts            lookFromDto
frontend/mock/sessionMock.ts       QG, GG, calendário, privacidade, detalhe do curso
```

## Testes

- `dotnet test`: 520 passando. Os novos cobrem:
  - semana da meta começando na segunda;
  - contagem da meta (reforço e semana passada fora);
  - ordem da escalação;
  - feed (ordem, janela de 14 dias, chave, privacidade, agente novo vs. compra, entrada no squad);
  - chave do GG malformada;
  - status dos 14 dias.
- `tsc -b` e `npm run build` ok. `npm run lint` só com os 3 avisos que já existiam.
- Playwright + Chrome contra o mock:
  - `/perfil` e `/squad` em 1440×900 e 1280×720 sem rolagem externa;
  - celular 390×844 sem rolagem horizontal;
  - console sem erro.
- Interação:
  - GG liga e desliga (4 → 5, `aria-pressed`);
  - menu do líder abre na linha;
  - modal de convite;
  - estado sem squad;
  - guarda-roupa por `?abrir=guarda-roupa`.
- Ajustes vistos nos screenshots e corrigidos:
  - vão entre o pedestal e o nome;
  - escalação cortada em 1280px (4x só a partir de 1400px);
  - slots vazando do palco;
  - piso cortando os slots no celular.

## Dúvidas ou pontos abertos para a próxima fase

- **Valor da recompensa da meta da semana** (o dono vai decidir). Quando decidir: creditar uma vez
  por membro por semana batida, provavelmente via `GamificationCreditor`, com registro pra não pagar
  duas vezes.
- **Quem entra pelo link de indicação cai no squad de quem indicou?** Não decidido.
- **Badges e marcos de ofensiva no feed** exigiriam gravar a data da conquista.
- **Próximo passo do plano das telas pixel art**: visão da semana (inclui o modal de publicação do
  módulo) e o Ranking, que segue no estilo antigo.
