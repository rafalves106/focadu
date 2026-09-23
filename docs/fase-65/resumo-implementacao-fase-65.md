# Resumo — Fase 65: Mapa da trilha em pixel art (tela do curso)

Pedido do Falves (23/09/2026), a partir de `secret/rascunhos/mapa-da-trilha-pixel-art.md`, na mesma
linha da Fase 64 (Projeto Semanal com diálogo da Focada): a tela da trilha do curso deixa de ser uma
lista de semanas e vira um mapa-mundi em pixel art. Arte das 4 regiões, sprites e falas foram
desenhados e aprovados antes, na mesma sessão (Figma "Focadu — Pixel Art", página "Mapa da trilha").

## O que foi implementado

**Backend (sem endpoint novo, sem migration)** — `GET /api/courses/{courseId}` ganhou:
- `WeeklyOverviewDto.ProjectStatus` (status do Projeto Semanal da semana, ou null).
- `DailyStatusSummaryDto.Title` (título do material do dia, mesma regra da visão semanal),
  `IsNext` (`DailySequencing.FindNext`), `ReinforcementDailyId` (reforço gerado a partir do dia) e
  `CompletedToday` (hora local; `GetCourseDetailUseCase` passou a receber `IClock`).

**Frontend**
- `CourseMap` (`components/courseMap/`): uma região por mês com seletor (`<` / `>` + pontinhos);
  pontos (dias) e castelos (projetos) como botões sobre a arte, com estados próprios; selo vermelho
  de reforço pendente no ponto do dia de origem; névoa sobre as semanas trancadas ou além da atual;
  balão ao clicar (dia, título, status, "Entrar"/"Rever", "Fazer reforço", "Abrir projeto", "Ver
  semana"; fecha com Esc/clique fora/x); Focada parada na próxima Daily — ou no castelo que bloqueia —
  que anda ponto a ponto na 1ª abertura depois de avançar.
- Falas da Focada no mapa (`lib/focadaMapLines.ts`): as 11 falas aprovadas, na ordem de prioridade do
  rascunho, no `DialogueBox` da Fase 64 (nova opção `stacked`, retrato em cima).
- Tela do curso refeita: 3 colunas como o Projeto Semanal (Focada | cabeçalho HUD do curso + mapa |
  Resumo do Curso HUD com atalhos), mesmas margens, altura da tela com rolagem só por dentro. Barra
  de progresso em 30 segmentos; "Projetos" (avaliados/total) entrou no resumo.
- Caderninho e Certificações saíram das abas (pedido do dono durante a fase): viraram botões na lateral
  que abrem a tela deles — `NotebookPage` nova (`/start?course=&caderninho=1`) e a `CertificationsPage`
  da Fase 45. `?tab=caderninho`/`?tab=certificacoes` continuam funcionando; o link do `QuickNotePanel`
  aponta pra rota nova.
- Celular e curso sem mapa continuam com a lista de semanas; mês sem arte também (fallback).
- Assets: `assets/mapa/web-security/regiao-1..4.png|json` e `assets/pixel/mapa/*.png` (9 sprites +
  borda da névoa), gerados por `secret/curadoria/scripts/mapa/exportar-frontend.js`.

**Curadoria (`secret/`)**: scripts do mapa passam a exportar o retângulo da ilha de cada semana
(`ilhas` no `regiao-N.json`) e ganharam o `exportar-frontend.js`.

## Decisões técnicas tomadas que não estavam no prompt original

- **Arte e posições saem de script**, não de export manual do Figma: a mesma grade de pixels gera o
  Figma, o `mapa.json` da curadoria e os PNG/JSON do frontend. Os assets moram no frontend (e não num
  endpoint do backend lendo o `secret/`) porque são estáticos e públicos, como os outros sprites.
- **Identificação do curso pelo nome normalizado** ("Web Security" → `web-security`): `Course` não tem
  slug no domínio.
- **Posições em % da arte**, pra o mapa acompanhar a largura da coluna. Com as margens do Projeto
  Semanal (pedido do dono) a arte fica ~1,94x num 1440 — não 2x exatos; continua nítida (`pixelated`).
- **Estado do castelo**: trancado (dias da semana incompletos) → liberado → entregue → concluído,
  pelo `ProjectStatus`; "entregue" reaproveita o sprite de liberado com rótulo próprio no balão.
- **Névoa** a partir da 1ª semana do mês trancada ou além da semana da próxima Daily, com o limite na
  ilha daquela semana (os meses foram desenhados com as semanas da esquerda pra direita).
- **Focada na semana trancada**: se a próxima Daily está numa semana bloqueada por projeto pendente,
  ela para no castelo anterior em vez de entrar na névoa.
- **Caminhada** calculada uma vez na montagem (o efeito só agenda os passos), pra funcionar com o
  StrictMode do dev; posição guardada por DayNumber em `localStorage`.
- **Layout da tela** mudou 3 vezes durante a fase por pedido do dono: Focada à esquerda, Caderninho/
  Certificações como botões (não painéis abertos), cabeçalho de progresso no topo da coluna central.
- `CourseDetailTabs` e `CertificationsTab` removidos (sem uso).

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/Courses/Dtos.cs                  (campos novos)
backend/src/Focadu.Application/Courses/GetCourseDetailUseCase.cs (IClock, título, isNext, reforço, hoje)
frontend/src/assets/mapa/web-security/regiao-{1..4}.{png,json}
frontend/src/assets/pixel/mapa/{ponto-*,castelo-*,badge-reforco,focada-marcador,nevoa-borda}.png
frontend/src/components/courseMap/CourseMap.tsx
frontend/src/lib/courseMaps.ts
frontend/src/lib/focadaMapLines.ts
frontend/src/routes/NotebookPage.tsx
frontend/src/routes/CourseDetailPage.tsx  (refeita)
frontend/src/routes/StartPage.tsx         (rota do Caderninho, ?tab= antigo)
frontend/src/components/DialogueBox.tsx   (opção stacked)
frontend/src/index.css                    (animação map-bob)
secret/curadoria/scripts/mapa/exportar-frontend.js (+ `ilhas` nos scripts e no regiao-N.json)
```

## Testes

- `dotnet test`: 455 passaram (nenhum teste novo — `GetCourseDetailUseCase` é mapeamento de leitura,
  sem fakes de repositório no projeto, ver ARQUITETURA "Testes").
- Frontend: `tsc -b`, `oxlint` (sem aviso novo) e `npm run build` ok.
- Visual no Chrome (Playwright, Vite na 5199 com `/api` mockado, sem tocar em produção), 1440×900:
  meio do curso com reforço pendente (balão do dia e do castelo), começo do curso, semana completa
  com castelo liberado, começo do mês 2, curso concluído; 1100px; celular (600px, lista); tela do
  Caderninho via `?tab=caderninho`.
- **Não testado ao vivo**: os campos novos do backend contra Postgres/API reais (só compilação +
  mock no frontend).

## Dúvidas ou pontos abertos para a próxima fase

- **Troca das falas por curso na curadoria** (decidida no rascunho): sem caminho de dado ainda — só as
  falas padrão.
- **Semana esperando só a publicação do módulo**: a Focada fica sem fala (não há fala aprovada).
- **Ícone do Caderninho**: usei o sprite de terminal; não existe sprite de caderno.
- **Mapa no celular** (versão vertical, estilo Duolingo): decidido como "depois".
- **Focada no curso concluído**: sem marcador no mapa (não há próxima Daily); poderia ficar na
  bandeira de fim — não pedido.
