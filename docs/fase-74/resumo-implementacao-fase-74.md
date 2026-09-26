# Resumo — Fase 74: Telas restantes em pixel art (visão da semana, Certificações, Caderninho e entrada)

Pedido do Falves (26/09/2026): executar o 3º passo de `secret/rascunhos/telas-pixel-art-antes-da-0-1-0.md`,
com a regra de desenhar no Figma antes do código. O desenho está no Figma "Focadu — Pixel Art", página
"Visão da semana — v2 (proposta)" (`137:5236`): semana em andamento `137:5237`, semana fechada com
publicação pendente `138:6537`, celular `138:8081` e notas `138:92002`. Ele aprovou o desenho e manteve o
castelo trancado levando ao briefing. Na mesma conversa decidiu que as Conquistas continuam dentro do
Perfil (sem tela própria), como já estavam desde a Fase 72.

Antes do push, pediu que o resto das telas entrasse na mesma fase. Desenhos aprovados: "Certificações +
Caderninho — v2 (proposta)" (`142:5236`: Certificações `142:5237`, Caderninho `143:7246`, celular
`143:8131`) e "Entrada e onboarding — v2 (proposta)" (`144:4502`: Splash, Login, Criar conta, senha,
Boas-vindas, Entrevista, Escolha do curso, login no celular, menu e trilha no celular). Com isso o plano
das telas em pixel art antes da v0.1.0 fecha.

## O que foi implementado

- **Visão da semana (`/start?course=&weekly=`)**, reescrita em pixel art:
  - a semana como um trecho da trilha em pé (`components/week/WeekTrail.tsx`): os dias com os pontos do
    mapa, ligados por uma linha vertical verde até o último dia concluído, e o castelo do Projeto
    Semanal (BOSS) fechando a lista;
  - dia concluído mostra aprovadas/total, erros e o check. O dia em andamento aparece em destaque, com
    a barra de etapas e "Continuar". O próximo dia tem "Entrar" e o resto fica trancado;
  - o 6º dia leva o selo PONTE. O reforço pendente vira um selo no dia de origem, com link para a
    sessão de reforço;
  - o castelo mostra os estados trancado ("Abre em N dias", botão "Ler o briefing"), aberto, em
    avaliação e avaliado (com a nota);
  - no cabeçalho: "Semana NN · Módulo N · título do módulo", o tema em VT323 e a navegação entre
    semanas (a próxima fica apagada se estiver trancada);
  - com a publicação do módulo pendente, uma faixa âmbar acima da lista com "Publicar agora" (abre o
    `PublicationModal`, já em pixel art), e as linhas ficam mais baixas pra caber;
  - a coluna lateral tem a fala da Focada, o resumo da semana (dias em blocos, aprovação, erros, nota do
    projeto, aviso de revisão semanal), as certificações do módulo e "Como a semana fecha".
- **Falas da Focada para a semana**: `buildFocadaWeekLine` (`lib/focadaMapLines.ts`) usa as falas do
  mapa olhando só esta semana e adiciona três falas novas: publicação pendente, semana fechada e semana
  trancada.
- **Variante `tall:`** em `index.css` (janela com 960px de altura ou mais).
- **Mock**: `/__mock/semana?estado=andamento|publicacao|trancada`.
- **Correção de texto**: duas falas do mapa e a missão do dia ainda diziam "cinco dias" e "sessenta
  dias", da época antes da Fase 69. Agora dizem "seis dias" e "setenta e dois dias".

- **Certificações** (`/start?course=&certifications=1`): matriz módulo × certificação em pixel art (check,
  escudo ou "—"); clicar na célula mostra o que o módulo cobre daquele exame; "Ao seu alcance" com uma
  barra por certificação e a Focada lembrando que é mapa, não diploma.
- **Caderninho** (`/start?course=&caderninho=1`): filtros (busca, período e tags em chips), notas
  agrupadas por dia ou projeto, e a Focada com um resumo (notas, dias com nota, tag mais usada).
- **Telas fora do app**: Splash (logo e barra em blocos), Login/Criar conta (apresentação com o agente
  e a Focada, abas, faixa de indicação), Esqueci/Redefinir senha, Boas-vindas (3 pilares), Entrevista
  (chips) e Escolha do curso ("save slots" com castelo).
- **Celular**: menu suspenso em pixel art e trilha em lista com pontos, castelo e status.
- **Sobras de estilo antigo**: selo de status só com sprite, Gems, ofensiva, avatar de iniciais, seletor
  de linguagem do Projeto Semanal e o texto de carregamento. As variantes antigas da Anotação rápida e do
  Tira dúvidas (ninguém usava) saíram. A recapitulação antiga de um dia (`?daily=`, sem nenhum link)
  virou redirecionamento pra `/hoje?daily=`.

## Decisões técnicas tomadas que não estavam no prompt original

- **Dia da ponte pela posição**: o DTO não marca a ponte, então o selo vai no 6º dia de uma semana de 6
  dias (regra da Fase 69).
- **Aprovação da semana**: passou a ser aprovadas / respondidas. Antes o total incluía os dias ainda não
  feitos, e a taxa caía no meio da semana (ex.: 64% com tudo certo até ali).
- **Reforço por dia e trava da semana** vêm do `GET /api/courses/{id}` (`WeeklyOverviewDto`), que a tela
  já buscava para a navegação. Sem `courseId` na URL, esses detalhes somem e a tela continua funcionando.
- **Linha inteira clicável** com um link sobreposto (`absolute inset-0`); o selo de reforço fica por
  cima (`z-10`), assim não há link dentro de link.
- **"Como a semana fecha"** só aparece com a semana ainda aberta e em tela alta (`tall:`). Em 1440×900
  ele empurrava a coluna lateral para a rolagem.
- **Celular**: a Focada vai pra antes da lista (como no quadro 03); o botão do castelo sai e "Continuar"
  vira "Ir".
- **Removidos** (sem outro uso): `WeeklyProjectCard`, `WeeklyReinforcementBadge` e `ProgressBar`.
- **Peças compartilhadas novas**: `components/PixelPage.tsx` (cabeçalho "Voltar pra trilha" e painel
  "// rótulo", usados na visão da semana, Certificações e Caderninho), `components/entry/Entry.tsx`
  (logo, passo do onboarding, cartão, chip, apresentação do login) e `components/auth/PixelFields.tsx`.
- **"Estudando" nas Certificações**: um módulo conta como em estudo se já tem Daily feita ou vem logo
  depois de um módulo estudado; o resto fica trancado.
- **Resumo do Caderninho** sai de uma segunda chamada da lista sem filtro (mesma rota), pra não mudar
  com o filtro aplicado. "Dias com nota" conta Dailies distintas; notas de projeto ficam de fora.
- **LoginForm** só tem a versão pixel (a prop `pixel` saiu); o SessionExpiredModal usa a mesma.
- **Removidos** também: `NotebookTab`, `OnboardingStepper`/`InterestChip` antigos (viraram peças de
  `Entry.tsx`), `PageShell` e a cópia local da barra segmentada na trilha.
- **Falas novas da Focada** seguem o guia de voz, mas não passaram pela curadoria. Os textos estão em
  `WEEK_LINES`, junto das falas do mapa.

## Estrutura de arquivos criada

```
frontend/src/
├── components/PixelPage.tsx             PixelPageHeader + PixelPanel (novo)
├── components/entry/Entry.tsx           peças das telas fora do app (novo)
├── components/auth/PixelFields.tsx      campos pixel dos formulários (novo)
├── components/auth/BackToLogin.tsx      "Voltar pro login" (novo)
├── routes/CertificationsPage.tsx, NotebookPage.tsx   reescritos
├── routes/SplashPage.tsx, LoginPage.tsx, ForgotPasswordPage.tsx, ResetPasswordPage.tsx,
│   OnboardingWelcomePage.tsx, ProfileInterviewPage.tsx, CourseSelectionPage.tsx   pixel art
├── components/week/WeekTrail.tsx        trilha da semana + castelo (novo)
├── routes/WeeklyDetailPage.tsx          reescrito
├── lib/focadaMapLines.ts                buildFocadaWeekLine + WEEK_LINES; "seis"/"setenta e dois dias"
├── components/start/DailyMissionCard.tsx  "seis dias"
├── index.css                            variante tall:
└── (removidos) WeeklyProjectCard.tsx, WeeklyReinforcementBadge.tsx, ProgressBar.tsx, NotebookTab.tsx,
    onboarding/OnboardingStepper.tsx, onboarding/InterestChip.tsx
frontend/mock/sessionMock.ts             /__mock/semana, /__mock/caderninho, /__mock/sair, /__mock/onboarding,
                                         GET /api/weeklies/w-N, certificações de exemplo
```

## Testes

- `tsc -b` e `npm run build` ok. `npm run lint` só com os 3 avisos que já existiam.
- Playwright + Chrome contra o mock (`npm run dev:mock`), estados andamento, publicação e trancada, em
  1920×1080, 1440×900, 1366×768, 1280×720 e 1024×768: nenhuma rolagem de página. Em 1920×1080 e 1440×900
  nada rola. Em telas menores, só a trilha rola dentro do cartão (no estado de publicação, até 156px em
  1024×768), como manda a regra das telas sem rolagem.
- Celular (390×844): empilha sem rolagem horizontal, com a Focada antes da lista.
- Console sem erro. Sessão diária, start, trilha e a semana 1 do mock antigo continuam abrindo.
- Certificações, Caderninho, trilha, visão da semana, start, Perfil e sessão diária em 1440×900,
  1366×768, 1280×720 e 1024×768: nenhuma rolagem de página; em tela baixa só a lista de notas e a trilha
  da semana rolam dentro do cartão.
- Entrada (login, indicação, esqueci, redefinir com e sem token, boas-vindas, entrevista, escolha do
  curso) em 1440×900 e no celular (390px), com a sessão desligada pelo mock; os únicos erros de console
  são os 401 esperados de "ninguém logado".
- Celular: menu aberto, trilha em lista, Caderninho e Certificações (a matriz rola na horizontal).
- Sem mudança de backend, `dotnet test` não foi rodado.

## Dúvidas ou pontos abertos para a próxima fase

- **Falas novas da Focada** (publicação pendente, semana fechada, semana trancada): revisar se quiser
  trocar o texto.
- **Plano das telas em pixel art fechado.** Fica de fora só o `WorldMapPage` (desativado desde a Fase 25).
- **Login sem sessão no mock** mostra 401 no console (esperado: é o "ninguém logado" do AuthContext).
