# Resumo — Fase 111: curso em sessões (até 3 por dia, com a sala entre elas)

Proposta aprovada: `docs/fases/fase-111/proposta-fase-111.md` (caminho A, 17/11/2026), com a mudança do dono do
mesmo dia: o formato de sessões é **explícito no código** (nada de só "DailiesPerDay"). Molde: `secret/processo/molde/molde-d.md`.

## O que foi implementado

### Backend

- **`Course.StudyFormat`** (`Daily` padrão | `Sessions`) e **`Course.SessionsPerDay`** (1 a 6, só vale em
  `Sessions`; em `Daily` fica 1). Vêm do `curso.json`: `"formato": "sessoes"` e `"sessoesPorDia": 3` (wstg). Seed
  e `importar` reaplicam a cada passada (`CuratedCourseImporter.ApplyStudyFormat`); o `importar` mostra
  "curso: formato de estudo: …" quando muda, inclusive no `--dry-run`. Formato desconhecido derruba a importação.
- **`DailyTemplate.SessionRoomSlug`**, do `dia.json` `"salaDaSessao"`. O `importar` recusa o dia cujo slug não tem
  `conteudo/<curso>/salas/<slug>/sala.json`.
- **`SessionRules`** (domínio, `Weeklies/SessionRules.cs`) e **`StudyContext`**: `Weekly.EvaluateDailyAccess` recebe
  um `StudyContext` (opcional; nulo = `Daily`) e só chama `SessionRules.EnsureCanStart` quando o formato é
  `Sessions`, no lugar da regra de 1 por dia:
  1. sala da sessão anterior não concluída → `sala_da_sessao_pendente` (409). Vem antes da cota: é o que o aluno
     pode fazer agora;
  2. cota de `SessionsPerDay` sessões não-reforço concluídas hoje → `daily_limite_diario_atingido` (mesmo código,
     com o número no texto).
  Reforço fora da cota e "1 em andamento por vez" continuam iguais.
- **`StudyContextResolver`** (Application): lê o curso pela matrícula; em `Daily` devolve `StudyContext.Daily` sem
  ler sala. Em `Sessions`, a sessão anterior é a Daily não-reforço de maior número antes da alvo (atravessa
  semanas); sala sem slug, ainda não importada (`importar-salas`) ou já concluída não trava. Usado por
  `GetToday`, `GetDailyState` e `StartOrResumeDaily`.
- **`/hoje`**: `sala_da_sessao_pendente` vira `DailyAccessMode.SessionRoomPending` (7). `DailyStateDto.Session`
  (`completedToday`, `perDay`, `pendingRoom {id, slug, title}`), nulo em curso Daily.
- **Sala abre com a sessão**: em curso `Sessions`, a sala apontada por algum `salaDaSessao` abre quando a sessão de
  origem é concluída (`RoomLock.OpensWithSession` = número do dia; `RoomUnlocks`/`RoomMapper.SessionRooms`), e não
  mais com a semana. Curso Daily usa `RoomUnlocks.ByWeek`: nada muda.
- `CourseDetailDto` ganha `StudyFormat` e `SessionsPerDay` (a trilha só diz "por hoje acabou" com a cota gasta).
- Migration `Fase111SessoesPorDia`: `Courses.StudyFormat` (default `Daily`), `Courses.SessionsPerDay` (default 1),
  `DailyTemplates.SessionRoomSlug` (nulo). Nenhum curso existente muda.

### Front (sem elemento novo, só texto e componentes que já existem)

- `SessionRoomPendingScreen`: mesma casca da tela da cota (fala da Focada + rodapé), com "Ir para a sala"
  (`/salas/<id>`) e "Voltar pro mapa".
- Tela da cota em curso de sessões: "3 de 3 sessões hoje" no lugar de "1 por dia" e fala própria.
- Migalha do topo da sessão: "Dia 2 · Sessão 2 de 3 hoje" (`lib/sessionCount.ts`).
- Card/tela da sala trancada: "Abre quando você concluir a sessão do Dia N".
- `courseDoneToday`/fala da trilha usam `courseQuotaReachedToday` (cota do curso).
- `guiaTelas.ts`: "Curso em sessões" (Dia), "Sala da sessão" (Salas) e a pergunta "mais de um Dia por dia?".

### Curadoria (`secret/`)

- Linter, molde D: seção até 100 palavras (`secaoPalavrasMaxMoldeD`), leitura de 600 a 1000
  (`textoPalavrasMinMoldeD`/`textoPalavrasMaxMoldeD`), 3 a 4 blocos, Quiz de 3 a 8, termos novos até 8. Calibração
  registrada em `limites.json`. `salaDaSessao` só no molde D e com a pasta da sala existindo. Teste novo.
- `dia.schema.json`: campo `salaDaSessao`.
- `conteudo/wstg/curso.json`: `"formato": "sessoes"`, `"sessoesPorDia": 3`.

## Verificação

- `dotnet build` e `dotnet test`: 914 testes passam, inclusive `CuratedContentAllFilesTests`,
  `CertificationCoverageFileTests` e `CuratedCourseImporterTests` locais. Novos em `SessionRulesTests`: curso Daily
  continua barrando a 2ª Daily; cota 3 (3ª passa, 4ª barra); ontem não conta; reforço fora da cota; 1 em andamento;
  sala pendente barra antes da cota; sem slug, sala não importada e sessão já iniciada não travam; sessão anterior
  atravessa semanas; sala abre com a sessão e, em curso Daily, segue a semana; manifesto com e sem `formato`.
- Linter: `npm test` (29). O WSTG Dia 1 atual (5 blocos, 1595 palavras) reprova nos limites novos, como esperado:
  será refeito em 3 sessões (Etapa 2).
- Front: `npx tsc -b`, `npm run lint` (só avisos antigos) e `npx vite build`. O `npm run build` deste PC falhou no
  pré-build (`lab:assets`: pacote `esbuild` ausente no `node_modules` local), nada do código desta fase.
- **Sem verificação visual**: as telas novas não foram vistas no navegador.

## Fora desta fase

- Editar formato/sessões pelo painel (aba Cursos só mostraria).
- Aquecimento de 4 a 6 perguntas do molde D (segue com 2).
