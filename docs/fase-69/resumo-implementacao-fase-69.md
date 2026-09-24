# Resumo — Fase 69: Semana de 6 dias (ponte pro projeto) e ofensiva com folga e pausa

Pedido do Falves (23/09/2026), a partir de uma dor dele como aluno: o projeto da Semana 1 (Sniffer CLI)
era difícil de começar — as Dailies são teóricas e a documentação do Scapy é grande e com poucos
exemplos aplicados. Na mesma conversa a ideia virou decisão (rascunhos
`secret/rascunhos/ponte-teoria-projeto-semanal.md` e `ofensiva-conta-trabalho-no-projeto.md`):

- a semana passa a ter **6 Dailies + Projeto**; o 6º dia é a **ponte**, prático e guiado, numa versão
  por linguagem (Python/JavaScript), e a **escolha da linguagem do projeto** sai da abertura do projeto
  e vai pra entrada da ponte;
- o curso é **renumerado de 60 pra 72 dias** antes da v0.1.0 (semana N = Dias 6N-5 a 6N);
- a ofensiva troca o "fim de semana não quebra" por uma **folga móvel** (1 dia sem estudo a cada 7) e
  fica **pausada** enquanto o projeto da semana está aberto (até a semana fechar, no máximo 14 dias).

A curadoria (ponte da Semana 1 nas duas linguagens, renumeração dos arquivos) foi feita antes desta
fase, no repo `focadu-secret` (commits `5c0acf1` e `c916c56`).

## O que foi implementado

- **Dia com uma versão por linguagem.** `DailyTemplate.Language` (nulo = dia único). Um DayNumber tem
  OU um dia único OU variantes por linguagem (`WeeklyTemplate.AddDailyTemplate(day, language?)`);
  índice único passou a `(WeeklyTemplateId, DayNumber, Language)`. A matrícula cria 1 Daily por dia
  (`WeeklyTemplate.DefaultDailyTemplatesByDay`), na variante da menor linguagem como ponto de partida.
- **Escolha da linguagem na entrada da ponte.** `Weekly.EnsureProjectLanguageCanBeChosen` passou a
  exigir só as Dailies de conteúdo (as sem linguagem) concluídas; `Weekly.ChooseProjectLanguage` troca a
  ponte pra variante escolhida (`Daily.BindLanguageVariant`, só antes de começar). Iniciar a ponte sem
  linguagem: `linguagem_nao_escolhida` (409). `GET /api/today` devolve o modo novo
  `DailyAccessMode.NeedsProjectLanguage` (6), sem atividades (as da variante padrão não são as do
  aluno); a trilha e a semana mostram "Ponte pro projeto" como título até a escolha. O projeto continua
  exigindo todas as Dailies, ponte incluída.
- **Reforço nunca ocupa a vaga da ponte.** `Weekly.CreateDailyReinforcement` numera o reforço depois do
  dia seguinte ao último dia de conteúdo — a ponte de uma semana pode ser curada depois de o aluno já
  ter reforços nela.
- **Seed e sincronização da ponte.** O seed importa `semana-N/ponte/<linguagem>.json`
  (`SeedWebSecurityCourseUseCase.ImportBridge`, valida `dayNumber = 6N`) e lê os dias nos intervalos
  novos. `SyncBridgeDaysUseCase` roda junto do `seed` em todo deploy: importa pontes curadas depois do
  curso já existir e dá a Daily da ponte a cada matrícula cuja semana ainda tem o projeto `Pending` (na
  variante da linguagem, se já escolhida). Serve pras pontes das semanas 2-12 sem nova migração.
- **Migração de dados 60 → 72** (`Infrastructure/Persistence/Curriculum72Migration`, no comando `seed`,
  antes do seed): renumera `DayNumber` do currículo e das Dailies (d → d + (d-1)/5), move reforços pra
  depois da vaga da ponte (d → d + semana) junto com os DailyTemplate sintéticos deles, e renumera as
  menções "Dia N" nos textos do banco (leituras, enunciados de atividade inclusive de reforço, falas de
  roleplay, especificação dos projetos) com a mesma regra dos arquivos (`CurriculumRenumbering`).
  Transação única; só roda no layout antigo (o 1º dia da Semana 2 ainda é o 6), porque a renumeração
  de texto não é idempotente.
- **Ofensiva: folga móvel e pausa.** `UserStreak` sem a tolerância de fim de semana: quebra com 2 dias
  sem estudo dentro de qualquer janela de 7 (`LastRestDate` guarda o dia coberto pela folga, que é
  gasta sozinha e não acumula). Dias dentro de um `StreakPause` não contam. `StreakPauseWindows`
  (Application) calcula as pausas na hora da leitura: do dia seguinte à última Daily de uma semana até a
  semana fechar (projeto avaliado + publicação validada), no máximo 14 dias — de qualquer curso.
  `WeeklyProject.EvaluatedAt` novo, pra saber quando a semana fechou. `GET /api/users/me/gamification`
  ganhou `streakPausedUntil` e `streakRestAvailable`.
- **Frontend.** `BridgeLanguageScreen` (pixel art, na casca da sessão): a Focada apresenta a ponte e o
  aluno escolhe a linguagem em 2 passos (teclas 1-N, Enter, Esc), ou é mandado marcar a linguagem no
  perfil. `AgentCard` mostra "Streak pausado até dd/mm" e o estado da folga. Mock da sessão ganhou
  `/__mock/reset?at=ponte` e `&pausa=1`.
- **Mapa da trilha com 6 pontos por semana.** `secret/curadoria/scripts/mapa/regiao-N.js` redesenhados
  (cada semana virou uma "cobrinha" de 2 fileiras antes do castelo, chaves `dN` na numeração nova, alguns
  racks/LEDs realocados), `regiao-N.json` regravados e arte + posições exportadas pro frontend
  (`exportar-frontend.js`).

## Decisões técnicas tomadas que não estavam no prompt original

- **Variante padrão em vez de Daily sem template.** Toda Daily precisa de um DailyTemplate; em vez de
  criar a ponte só na escolha (o projeto destrancaria antes dela), ela nasce na variante da menor
  linguagem e troca na escolha. O modo `NeedsProjectLanguage` esconde as atividades dessa variante.
- **Fim da pausa = semana fechada**, não a entrega (decisão do Falves nesta fase): depois da avaliação
  ainda falta a publicação, e sem Daily disponível a ofensiva quebraria à toa.
- **Qualquer projeto aberto pausa** a ofensiva, de qualquer curso (decisão do Falves).
- **Migração em SQL direto, no `seed`.** A troca de `DayNumber` passa pelos índices únicos: cada grupo
  vai pra negativo e depois pro valor final. Rodar no `seed` faz ela acontecer sozinha no próximo deploy.
- **Pausa calculada a partir das Weeklies carregadas inteiras** (`GetByEnrollmentIdAsync`), inclusive no
  resumo de gamificação, que é lido com frequência. Com 12 semanas por aluno é aceitável; se pesar,
  vira uma consulta leve.
- **Folga "gasta sozinha"**: registrada no 1º dia sem estudo que ela cobre (na conclusão seguinte). A
  leitura (`CurrentStreakAsOf`) só consulta, não gasta.
- **Status 409** pra `linguagem_nao_escolhida` e `daily_ja_iniciada` (estado, não entrada inválida).

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/Gamification/StreakPauseWindows.cs
backend/src/Focadu.Application/Seed/CurriculumRenumbering.cs
backend/src/Focadu.Application/Seed/SyncBridgeDaysUseCase.cs
backend/src/Focadu.Infrastructure/Persistence/Curriculum72Migration.cs
backend/src/Focadu.Infrastructure/Migrations/*_BridgeDayAndStreakRest.cs   (Language, EvaluatedAt, LastRestDate)
backend/tests/Focadu.Tests/Weeklies/BridgeDayTests.cs
docs/fase-69/resumo-implementacao-fase-69.md
```

Alterados, principais: `DailyTemplate`, `Daily`, `WeeklyTemplate`, `Weekly`, `WeeklyProject`,
`UserStreak` (+ `StreakPause`), `DailyAccessMode`, `CuratedDayImporter`, `SeedWebSecurityCourseUseCase`,
`EnrollUserInCourseUseCase`, `GetTodayUseCase`, `CompleteDailyUseCase`, `GetGamificationSummaryUseCase`,
`GetCourseDetailUseCase`, `GetWeeklyDetailUseCase`, `ApiExceptionHandler`, `Program.cs`;
frontend `SessionScreens.tsx`, `TodayPage.tsx`, `AgentCard.tsx`, `api/types.ts`, `mock/sessionMock.ts`,
`assets/mapa/web-security/regiao-{1..4}.{png,json}`.

## Testes

- `dotnet test`: 492 aprovados. Novos em `BridgeDayTests` (variantes, acesso sem linguagem, escolha e
  troca da variante, projeto ainda exige a ponte, reforço fora da vaga da ponte, pausas, renumeração de
  números e de texto). O import da ponte da Semana 1 do disco ficou em `CuratedContentAllFilesTests`
  (lê a curadoria, fora do CI). `UserStreakTests` reescrito pra folga móvel
  e pausa. O teste de contagem dos arquivos da curadoria aceita os múltiplos de 6 livres.
- **Migração contra uma cópia do banco de produção** (pg_dump só leitura, restaurado num Postgres 16
  descartável na 55432, com autorização do Falves): 60 dias do currículo, 60 Dailies, 1 reforço (6 → 7)
  e 69 textos renumerados — exatamente os 69 campos que a renumeração da curadoria mudou. Depois dela,
  as 1.109 atividades (enunciado, leitura, falas de roleplay) e as 12 especificações no banco batem com
  os arquivos da curadoria, inclusive a ponte. Segunda execução: "já aplicada", 0 pontes. A matrícula do
  Falves ganhou a Daily 6 já na variante Python (escolhida na Fase 59).
- **API contra a cópia** (porta 5399, chave JWT de teste, senha trocada só na cópia): `/api/today` →
  Dia 6 com as 18 atividades da ponte em Python; com a linguagem apagada → modo 6 sem atividades, semana
  com `languageStep` NeedsChoice e título "Ponte pro projeto", `POST /start` recusado com
  `linguagem_nao_escolhida`; com a ponte concluída há 2 dias e o projeto pendente → `streakPausedUntil`
  = conclusão + 14 e a ofensiva mantida.
- **Visual (Chrome, mock na 5198)**: tela da ponte (escolha, confirmação, liberação da sessão), cartão
  do agente com o streak pausado e o mapa do Mês 1-4 com os 6 pontos e os castelos. Prévia dos
  sprites no tamanho real sem sobreposição (folga mínima 2px, a mesma que o mapa já tinha).
- `npm run lint` (só avisos que já existiam) e `npm run build` ok.

## Dúvidas ou pontos abertos para a próxima fase

- **Deploy.** O próximo deploy aplica a migração de schema, a renumeração e a ponte em produção
  sozinho (via `seed`). Fazer backup antes (`pg_dump`). Depois dele, `sincronizar_leituras.py` volta a
  poder rodar (os números do banco e dos arquivos passam a bater).
- **Repositórios-modelo da Semana 1** ainda não foram republicados com o README novo (pendência da
  Fase 64) — e o README ainda diz "Dias 1 a 5", o que continua certo.
- **Focada cobre o castelo** quando a ponte é o próximo dia nas semanas em que o castelo fica logo
  acima dela (1, 4 e 10). Ajuste fino de arte, se incomodar.
- **Figma "Focadu — Pixel Art"** ainda tem o mapa de 5 pontos por semana; a fonte da verdade são os
  scripts (`scripts/mapa`), que já estão com 6.
- **Pontes das semanas 2-12** a curar (`/curar-conteudo`); entram sozinhas no deploy seguinte a cada
  curadoria (`SyncBridgeDaysUseCase`), só pra quem ainda não entregou o projeto daquela semana.
- **Ainda abertos nos rascunhos**: push no repositório do projeto contar como estudo (faria a ofensiva
  crescer durante a pausa) e o formato padrão do dia-ponte no `CURADORIA.md`.
- A grade "Esta semana" do `AgentCard` continua derivada só do `currentStreak` (dias seguidos) — com
  folga ou pausa no meio, os quadradinhos não mostram o buraco. O backend não guarda o histórico dia a
  dia.
