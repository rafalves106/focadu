# Resumo — Fase 112: sessões na Trilha, no Início e na Visão da semana

Desenho: Figma `Redesign - Focadu` (`KZkoT5d33KsbBWEcQ0EBXj`), quadros "Fase 111 · Sessões · …" (Trilha `97-1857`/`97-2004`,
Início `97-2151`/`97-2237`/`97-2323`/`97-2409`/`97-2493`/`97-2529`, Visão da semana `98-7375`/`98-7471`, lista de salas
`98-9844`) e os quadros da Fase 111 revistos (`92-*`, `93-*`). Marca de sala no Sistema (`97-9586`). Aprovado pelo dono em
17/11/2026, com as decisões:

1. No curso em sessões a unidade é **"Sessão N"** (nós `S1…`), não "Dia N". O número é o mesmo `dayNumber`.
2. **Marca de sala**: quadrado de 12 px no traço depois de cada sessão (verde feita, âmbar pendente, contorno trancada).
3. A contagem do dia ("1 de 3 sessões hoje") aparece uma vez só: barra de N segmentos no Destaque do Início, ou o
   rótulo das telas da cota e da sala pendente. O fio da sessão diz só "Sessão N".
4. Destaque do Início, nesta ordem: sala pendente > próxima sessão > prévia de amanhã (sem Primário).
5. A sala não conta na cota. No limite do dia, a sessão seguinte fica Trancada (sem estado "abre amanhã").
6. Na Visão da semana a sala é um Chip na linha da sessão ("Sala feita" / "Sala pendente").
7. Todo Primário tem o "Depois: …" embaixo.

Curso Daily não muda em nada.

## Backend

- `DailyStatusSummaryDto.SessionRoom` (`DailySessionRoomDto {id, title, status}`) em `GET /api/courses/{id}`: a sala de
  cada sessão com o mesmo status da lista de salas (`RoomMapper.StatusOf`). Só lê salas em curso `Sessions`.
- `SessionRoomDto` (o `pendingRoom` do `/hoje`) ganha `EstimatedMinutes` e `MachineLabel` (Destaque do Início).
- `RoomLock.SessionNumber` → `RoomSummaryDto`/`RoomStateDto.SessionNumber`: a sessão de origem da sala, trancada ou não
  (nó "S2" e "Sala da Sessão 2" na lista).
- Texto da sala trancada: "Essa sala abre quando você concluir a Sessão N."
- Teste novo em `SessionRulesTests`: número da sessão e status da sala, trancada e aberta; curso Daily sem número.

## Front

- `lib/sessionCount.ts`: `isSessionsCourse`, `unitName`/`unitShort`; `sessionCountLabel` só conta as feitas.
- `lib/weekPath.ts`: `courseDays`, `completedTodayCount`, `pendingSessionRoom` (sala da sessão anterior à próxima, mesma
  regra do servidor), `sessionsPathOptions`; `weekPathNodes` com rótulo S/D, a Marca de sala (`PathNode.room`) e a
  próxima sessão Trancada quando falta a sala ou a cota acabou. `courseSizeText` em sessões.
- `WeekPath`: `RoomMarkBox` no traço e, no celular, depois de cada segmento.
- Trilha: meta da semana ("2 de 6 sessões · 2 de 3 hoje · falta a sala da S2"), Primário "Ir para a sala" com
  "Depois: Sessão N", "A SN abre amanhã, à meia-noite.", legenda da sala, resumo Sessões/Hoje/Salas e as falas.
- Início: Destaque `sala` (eyebrow "Agora · sala da Sessão N", máquina, minutos, "Depois: Sessão N+1"), Destaque da
  sessão ("Agora · Sessão N", "Começar a sessão"), "Por hoje acabou" com "Próxima sessão em hh:mm:ss", barra de
  sessões, falas, caminho da semana e "Seus cursos" em sessões. `useCountdownToMidnight` foi para `lib/`.
- Visão da semana: linha por sessão com Chip da sala, "Abre depois da sala da Sessão N", Primário na sessão dona da
  sala pendente, resumo Sessões/Salas/Hoje.
- Sessão: fio "Sessão N" (sem a contagem), cota com "Por hoje acabou" no fio e "Amanhã: Sessão N · título", sala
  pendente com a fala nova e "Depois: Sessão N · título". Lista de salas com o grupo "Salas das sessões · semana W".
- `guiaTelas.ts`: "Curso em sessões" no Início, na Trilha, na Visão da semana e na sessão.

## Verificação

- `dotnet build` e `dotnet test` (sem os 3 testes que pedem o `secret/`): 822 passam.
- `npx tsc -b`, `npm run lint` (só os 2 avisos antigos) e `npx vite build`.
- **Sem verificação visual**: nenhuma tela foi vista no navegador. Também não rodou contra um banco com o WSTG em sessões.

## Ajustes do Figma da Fase 111 (mesma fase)

- Tela da cota: a contagem até a meia-noite no padrão de número grande (`text-rotulo-sm` + `text-titulo`), sem a caixa
  com fonte de 9 px (divergência 8).
- Casca da sessão: sem barra de etapas (cota, sala pendente), o rótulo "N de 3 sessões hoje" aparece também no celular
  (divergência 4).
- Sala: com a máquina desligada a coluna mostra só a Fala e o Painel (o Progresso sai, já está na lista de tarefas);
  ligada, os comandos recolhem em "Ver os comandos de novo" e o Progresso volta (divergência 6, Figma `93-1552`).
- Sala trancada: o cartão fica na coluna de 952 px em vez da largura toda (divergência 7).

Continua igual: no celular, "Ir para a sala" leva à tela "abra no computador" (divergência 9), que é o comportamento
certo, porque a sala roda no computador.
