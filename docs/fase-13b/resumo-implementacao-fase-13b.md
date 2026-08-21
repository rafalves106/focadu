# Resumo — Fase 13b: Onboarding (UI) + Correção do /admin/conteudo

## Contexto

Fechamento da Fase 13, dividida em 13a/13b conforme autorizado no prompt original (ver
`docs/fase-13a/resumo-implementacao-fase-13a.md`). A 13a fez o refactor de domínio
(Template↔Instância), matrícula (`Enrollment`) e proteção de endpoints; deixou 2 pendências
documentadas explicitamente para esta metade: as 4 telas de onboarding/seleção de curso (sem elas
um usuário novo travava em `/start`, 404 `nenhuma_matricula_ativa` sem UI nenhuma) e a quebra do
`/admin/conteudo` (efeito colateral esperado do split Template/Instância - a tela ainda navegava
com ids de Weekly-instância, que passaram a exigir matrícula).

## Validação de design

Os 3 nodes indicados no prompt (Boas-vindas, Seleção de Curso Inicial, Empty State - Primeiro
Acesso) foram conferidos via Figma MCP antes de implementar. Nenhum bate 1:1 com o que existe de
verdade no domínio hoje - todos os 3 mostram gamificação (Gems/XP/streak/nível) e navegação
(Analytics/Ranking/Squad) que não existem ainda (gamificação real é Fase 14). Mesmo critério já
usado no `StartDashboard` desde a Fase 8 ("os cards só mostram números reais") e documentado como
divergência deliberada na Fase 13a (SettingsMenu): implementado o que tem dado real por trás,
omitido o resto, documentado aqui em vez de inventar números.

| Node | Rótulo esperado | Divergência implementada |
|---|---|---|
| `19-303` | Onboarding — Boas-vindas | Nav de topo do mockup (Painel/Cursos/Analytics/Ranking + badge "Indie Dev" + avatar) e o painel decorativo "SEC_PILOT_HUD_V1" (CPU Load/Shielding/instalação, sem dado real) **omitidos** - só o wordmark FOCADU, mesmo cabeçalho minimalista de `LoginPage`/`SplashPage`. Texto de marketing trocado por uma variação do que já existe em `LoginPage` ("sem atalho de IA respondendo por você") em vez do original, que promete XP/rankings/certificações inexistentes. Stepper "Passo 1 de 4" virou "Passo 1 de 3" - ver próximo item. |
| `19-370` | Seleção de Curso Inicial | Stepper do Figma pula de "Boas-vindas = passo 1" direto pra "Seleção de Curso = passo 2" - a especificação funcional (Boas-vindas → Entrevista de Perfil → Seleção, reforçada no prompt desta fase) exige a Entrevista no meio, então o stepper foi renumerado pros 3 passos reais (`OnboardingStepper`). Grade fixa de 4 cursos com badges "Recomendado/Iniciante/Intermediário/Avançado" e "5.1K alunos" - nenhum desses campos existe em `AvailableCourseDto` (`Id`/`Title`/`Description`/`EstimatedDuration`); virou uma grade dinâmica sobre `GetAvailableCoursesUseCase` (hoje renderiza só 1 card, "Web Security", mas suporta N cursos reais sem mudar nada). |
| `19-1648` | Empty State — Primeiro Acesso | O mockup é um dashboard cheio (streak "0 DIAS 🔥", "Sessões completas 0/100%", dica pra entrar numa guilda na aba Squad, nível/gems no card do curso) - nada disso existe no domínio. Reaproveitado `ErrorLayout` (mesmo componente das 4 telas de erro + `EmptyStateError`, Fase 10) com ícone/título/descrição/CTA reais, em vez de reconstruir um dashboard só com números inventados. |

A Entrevista de Perfil (`ProfileInterviewPage`) não tem node Figma próprio validado nem nesta fase
nem na 13a - segue a mesma estética minimalista das outras 2 telas de onboarding (wordmark +
stepper + conteúdo centralizado), sem mockup de referência pra divergir.

## O que foi implementado

### Parte 1 — Correção do `/admin/conteudo`

**Backend** (2 endpoints novos, ambos leitura, sem exigir matrícula - só login):

- `GetCourseCurriculumUseCase` / `GET /api/courses/{courseId}/curriculum`: Course → Monthly →
  WeeklyTemplate (id/number/title/theme), reaproveita `ICourseRepository.GetByIdAsync` (já
  carregava `Monthlies.WeeklyTemplates` desde a Fase 13a, só faltava uma rota que não checasse
  Enrollment).
- `GetWeeklyTemplateDetailUseCase` / `GET /api/weekly-templates/{id}`: uma WeeklyTemplate com seus
  `CuratedContents`, reaproveita `IWeeklyTemplateRepository.GetByIdAsync` (já usado por
  `CreateCuratedContentUseCase` desde a Fase 4, só faltava a rota HTTP).

**Frontend** (`AdminContentPage.tsx`): `CourseView`/`WeeklyContentView` trocaram
`api.getCourse`/`api.getWeekly` por `api.getCourseCurriculum`/`api.getWeeklyTemplate` - a query
string `?weekly=` agora carrega sempre um `WeeklyTemplateId`, nunca mais um id de Weekly-instância.
`api.createCuratedContent` também tinha um bug de payload não documentado até agora: mandava
`weeklyId` no corpo, mas o backend espera `weeklyTemplateId` desde a Fase 13a (mismatch silencioso
- o campo simplesmente não chegava, `ValidationException weekly_template_id_obrigatorio` toda vez).
Corrigido junto.

### Parte 2 — Onboarding

Fluxo: **Boas-vindas → Entrevista de Perfil → Seleção de Curso**, guarda de segurança em `/start`.
A Entrevista **só captura e persiste** interesses (chips de hobbies/referências culturais -
Cinema/Séries/Games/Música/etc., não tópicos de currículo) - nenhuma lógica nova usa esse dado,
confirmando o lembrete de escopo do prompt (o curso continua sendo sempre o mesmo template fixo).

- **`OnboardingWelcomePage.tsx`** (`/onboarding`) - "Pular tour" conclui o perfil com interesses
  vazios (`User.CompleteProfile` aceita lista vazia, sem mínimo exigido) e pula direto pra
  `/selecionar-curso`.
- **`ProfileInterviewPage.tsx`** (`/onboarding/perfil`) - `InterestChip` multi-select + campo de
  notas livre, salva via `PUT /api/users/me/profile` (`CompleteProfileUseCase`, já existia desde a
  13a).
- **`CourseSelectionPage.tsx`** (`/selecionar-curso`) - `GET /api/courses/available`, matrícula via
  `POST /api/enrollments`, navega pra `/start` no sucesso.
- **`EmptyStateStartPage.tsx`** - não é uma rota própria, é renderizada por `StartDashboard` quando
  `GET /api/today` devolve 404 `nenhuma_matricula_ativa` (usuário logado, perfil completo, sem
  matrícula ainda - alcançável via URL direta/back-button mesmo com o redirect central no lugar).
- **`components/onboarding/`**: `InterestChip.tsx` (chip de seleção) + `OnboardingStepper.tsx`
  ("Passo X de 3" + pontinhos, compartilhado pelas 3 telas).

**Lógica de redirecionamento centralizada** (`lib/onboarding.ts`, `resolveLandingPath(user)`) -
único lugar que sabe a ordem `!profileCompletedAt → /onboarding`; sem `Enrollment`
(`GET /api/enrollments/me`) `→ /selecionar-curso`; senão `→ /start`. Usada em 2 lugares, nunca
duplicada:

- `SplashPage` (troca a lógica fixa `user ? '/start' : '/login'` pela resolução completa).
- `onSuccess` de `LoginForm`/`RegisterForm` (via `LoginPage.handleAuthSuccess`) - exigiu
  `AuthContext.login`/`register` passarem a **devolver o `UserDto`** direto (antes só atualizavam
  `user` via `setUser`, e quem chamava não tinha como saber o valor fresco sem esperar o próximo
  render do contexto - uma corrida desnecessária com a própria navegação).

`LoginPage`: guarda de usuário-já-logado trocou `<Navigate to="/start"/>` por `<Navigate to="/"/>`
- bounce pela `SplashPage`, que roda a mesma `resolveLandingPath`, em vez de duplicar a decisão.

`api/types.ts`: `UserDto` ganhou `profileCompletedAt` (o backend já devolvia desde a Fase 13a, o
frontend nunca tinha sido atualizado pra ler - front ficou fora do escopo da 13a de propósito).

`lib/apiError.ts`: `ApiFailure` ganhou `code` (repassa `ApiError.code`) - único jeito de
`StartDashboard` distinguir o 404 `nenhuma_matricula_ativa` (mostra `EmptyStateStartPage`) de
qualquer outro 404 (mostra `ApiErrorScreen` genérico) sem duplicar a classificação de erro.

## Testes

- Backend: `dotnet build`/`dotnet test` limpos, **96 aprovados** (nenhum teste novo - os 2 casos de
  uso novos são leitura/mapeamento simples, mesma convenção já estabelecida na 13a de não ter fakes
  de repositório no projeto; `GetCourseDetailUseCase`/`GetWeeklyDetailUseCase` também nunca tiveram
  teste dedicado).
- Frontend: `tsc -b`, `oxlint src`, `vite build` limpos (só o warning pré-existente de
  `TodayPage.tsx`, documentado desde a Fase 13a).
- **Verificação ao vivo** (Postgres real, API + Vite dev server rodando, Playwright dirigindo um
  Chromium headless - nenhuma chamada manual via curl):
  - Usuário novo registrado → `/onboarding` (Boas-vindas) → "Próximo Passo" → `/onboarding/perfil`
    → selecionou 2 chips de interesse → "Próximo Passo" (`PUT /api/users/me/profile`) →
    `/selecionar-curso` → "Iniciar Missão" no curso "Web Security" (`POST /api/enrollments`) →
    `/start` renderizando dados reais da Daily de hoje (tema da semana, "Dia 1 de 4", Projeto
    desta Semana).
  - Segundo usuário: registrado → "Pular tour" (perfil concluído com interesses vazios) →
    `/selecionar-curso` → navegação direta pra `/start` **sem se matricular** → confirmado
    `EmptyStateStartPage` renderizando ("Sua jornada ainda não começou" + CTA "Escolher meu
    curso"), não um 404 cru nem crash.
  - `/admin/conteudo`: logado com o 1º usuário (já matriculado), navegou curso → semana → 12 itens
    de `CuratedContent` carregados de verdade (títulos reais do seed: "HTTPS e TLS: o capacete da
    sua conexão", "Headers: os bilhetes que viajam junto com cada pedido", etc.) → editou o título
    de um item → salvou → recarregou a página → **edição persistida confirmada** (o título editado
    sobreviveu ao reload, prova de que o `weeklyTemplateId` chega certo no backend agora). Revertido
    depois via SQL direto pra não deixar dado de teste no seed local.
  - `console --errors` do browser: só os 401 esperados em `/login` (sessão ainda não existe,
    caminho documentado desde a Fase 12) e os 404 esperados em `/start` (o próprio gatilho do teste
    do `EmptyStateStartPage`) - nenhum erro de verdade.
  - **Bug pego durante a própria verificação, não do código desta fase**: a 1ª rodada bateu 404 em
    `/api/courses/{courseId}/curriculum` mesmo com o endpoint implementado - a API rodando na porta
    5282 era uma instância **antiga**, sobrevivente de uma sessão anterior (processo com o build de
    antes da Fase 13b ainda de pé). Matada e resubida com o build atual antes de repetir a
    verificação - lição registrada aqui porque não é óbvio numa primeira leitura do log de erro.

## Dúvidas ou pontos abertos

- **Matrícula em 2 cursos simultâneos quebra `/hoje` - não corrigido nesta fase.** Ver a entrada
  correspondente em `docs/ARQUITETURA.md`, seção "O que uma próxima fase provavelmente precisa
  saber" (marcada com `ponytail:` no código-fonte não existe porque é uma ausência de guard, não
  uma linha de código - a nota mora só na documentação). Inofensivo hoje (só 1 Course seedado), mas
  vira alcançável assim que um 2° Course real existir.
- **Nenhum teste automatizado novo** (mesma convenção da 13a - casos de uso de leitura simples não
  ganham teste dedicado no projeto; a verificação ficou pro Playwright ao vivo, documentado acima).
- Fase 14 (próxima, fora do escopo desta): backend de gamificação real (Gems/XP/Level/Streak como
  entidades por usuário) - só quando isso existir os 3 designs Figma desta fase (e o painel
  "SEC_PILOT_HUD_V1"/dashboard cheio do Empty State) passam a ter dado real pra mostrar.
