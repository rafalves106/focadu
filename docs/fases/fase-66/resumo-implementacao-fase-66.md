# Resumo — Fase 66: Tela de start em pixel art com vários cursos

Pedido do Falves (23/09/2026): levar a tela de start (`/start` sem parâmetros) para o estilo pixel art
do Projeto Semanal e da trilha. Numa primeira rodada, só o visual dos cartões antigos mudou. Depois o
dono pediu um redesign "mais gamificado e com UX", aproveitando as laterais, e que o conteúdo central
acompanhasse o curso escolhido no carrossel. O desenho foi feito no Figma "Focadu — Pixel Art",
página "Start — redesign proposto" (node `55:4502`: dois estados e notas de UX), e implementado
na mesma sessão. Na implementação a tela foi enxugada a pedido do dono até não ter rolagem vertical.

## O que foi implementado

**Backend (sem migration)**
- `GET /api/today` aceita `?courseId=` (opcional): escolhe a matrícula daquele curso. Sem o
  parâmetro, o comportamento é o de antes (1 matrícula, senão 409). Curso sem matrícula: 404
  `matricula_nao_encontrada`.

**Frontend**
- `StartDashboard` refeito, 2 colunas com a altura da tela e sem rolagem a partir de `lg`:
  - Esquerda (global): `CourseSlots` (cursos como "save slots", substitui o `CourseCarousel`, que foi
    apagado) e `AgentCard` (gemas, streak, recorde, semana do streak em quadradinhos).
  - Centro (curso escolhido, `?curso=`): `DailyMissionCard` (material do dia, etapas da sessão em
    cadeia, recompensa, botão único, e os estados cota gasta / semana esperando o castelo / curso
    concluído), `WeekPathCard` (semana atual com os sprites do mapa e o projeto como castelo/BOSS; o
    selo de reforço pendente é um link para a sessão) e a fala da Focada.
- `DialogueBox` ganhou `compact` (retrato 64px, fala menor, sem rodapé quando não há o que mostrar).
- `StatusBadge` ganhou `pixel` (caixa reta, Silkscreen, só sprite).
- `SegmentedBar` (barra em blocos) virou componente; `lib/startScreen.ts` junta as derivações da tela.
- `api.getToday(courseId?)`.

## Decisões técnicas tomadas que não estavam no prompt original

- **Decisões do dono durante a fase:** a cota de 1 Daily por dia é por curso (já era por
  matrícula, nada mudou no domínio); gema: 1 por Daily e +1 de bônus por reforço (só um); conquistas
  e celular ficam para depois; a coluna direita do desenho (missões extras, progresso, certificações,
  atalhos) saiu porque isso já está na trilha; a tela não deve ter rolagem vertical.
- Para caber sem rolar também saíram o cabeçalho HUD do curso no centro (repetia o slot escolhido;
  o nome do curso foi para a linha de contexto da missão, e o `<h1>` ficou só para leitor de tela) e
  o avatar do cartão do agente (já está no menu do topo). Em telas baixas (`max-height: 820px`) a
  margem vertical da página diminui.
- **Reforço pendente (Fase 56, "sempre alcançável"):** sem o cartão, o acesso na tela de start é o
  selo no caminho da semana (link para `/hoje?daily=`) e a fala da Focada ("Tem um reforço
  esperando no dia N"). A `TodayPage` continua com o botão dela.
- A fala da Focada reaproveita as 11 falas aprovadas do mapa (`buildFocadaMapLine`), sem fala nova.
- A semana do streak é derivada só do `currentStreak` (o backend não guarda o histórico por dia):
  mostra a sequência atual, terminando hoje (se já estudou hoje em algum curso) ou ontem.
- Os botões da missão levam a `/hoje?daily=<id>`, não a `/hoje`, para respeitar o curso escolhido.
- A versão pixel dos cartões antigos (`WeeklyProjectCard`, `PendingReinforcementCard`) da 1ª rodada
  foi desfeita, porque eles saíram da tela.

## Estrutura de arquivos criada

```
frontend/src/
  components/
    SegmentedBar.tsx
    start/
      CourseSlots.tsx
      AgentCard.tsx
      DailyMissionCard.tsx
      WeekPathCard.tsx
  lib/startScreen.ts
  (apagado) components/CourseCarousel.tsx
```

## Testes

- `dotnet build` da Api e `tsc -b` do frontend sem erros. O caso de uso não tem teste unitário (a
  suíte cobre só domínio e funções `internal static`, ver `CLAUDE.md`).
- Conferência visual sem tocar em produção: Vite na 5199 com uma API falsa em memória (3 cursos:
  em andamento com reforço pendente, recém-começado, concluído; cenários "cota gasta" e "semana
  esperando o castelo") + Chrome via Playwright. Screenshots em 1440×900 e 1280×800/720; clique no
  slot troca o centro e grava `?curso=`.
- Rolagem medida (scrollHeight − clientHeight de cada coluna) em 1280×720, 1280×800, 1366×768,
  1440×900, 1536×864 e 1920×1080, nos 3 cenários: 0 em todos.
- Não testado contra o backend real com 2+ matrículas (produção só tem 1 curso).

## Dúvidas ou pontos abertos para a próxima fase

- **Deploy do backend:** o frontend novo manda `?courseId=`. O backend antigo ignora o parâmetro,
  então com 1 matrícula funciona igual; com várias, só depois do deploy desta fase.
- **"Hoje" com 2+ matrículas:** `TodayPage` sem `?daily=` (e o link "Hoje" do menu) ainda chama
  `GET /api/today` sem curso e cai no 409. Precisa de uma decisão (último curso escolhido? perguntar?).
- A revisão semanal não aparece mais na tela de start (só na semana e na trilha). Confirmar se basta.
- "+ Explorar cursos" leva a `/selecionar-curso`, que hoje é a tela de matrícula inicial.
- A trilha (`CourseDetailPage`) ainda tem a cópia local da barra segmentada; dá para trocar pelo
  `SegmentedBar`.
- Em telas altas (ex.: 1440×900) sobra espaço vazio abaixo do centro.
