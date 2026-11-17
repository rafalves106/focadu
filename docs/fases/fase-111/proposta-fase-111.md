# Fase 111 — Sessões do molde D: até 3 por dia, com a sala entre elas (proposta)

**Status:** proposta aprovada pelo dono em 17/11/2026 (caminho A). Ainda não implementada.

## Problema

O plano do dono para o curso `wstg` (molde D) é um dia de estudo com **3 sessões de 1 hora**, cada uma seguida da
sua sala prática: sessão → sala → sessão → sala → sessão → sala. Hoje a plataforma não permite isso:

1. **"1 Daily por dia"** (`Weekly.EvaluateDailyAccess`, `daily_limite_diario_atingido`) vale para todo curso: o
   aluno faz 1 sessão por dia.
2. **A sala não se liga à sessão.** A sala `sessao-N` é `tipo: "semana"` e abre com a semana
   (`RoomDtos.LockOf`/`ReachedWeeks`), então nada obriga a fazê-la entre uma sessão e a seguinte.
3. **A sessão estoura 1 hora.** O piloto (WSTG Dia 1) tem 1691 palavras em 5 blocos: ~35 min de sessão sem a
   sala, ~60–70 min com ela. O molde deixa até 3000 palavras e 6 blocos.

## Decisão (caminho A)

1 sessão continua sendo 1 Daily (o conteúdo, o importador e as telas da Daily não mudam). Muda a regra de acesso
e o tamanho da sessão:

### 1. Cota diária por curso (backend)

- `Course.DailiesPerDay` (int, padrão 1; `wstg` = 3). Migration com default 1: nenhum curso existente muda.
- Valor vem do `curso.json` do `secret/` (`"dailiesPorDia": 3`), lido pelo seed/importador como os outros campos
  do curso; o painel (aba Cursos) só mostra. Editar pelo painel fica para depois (exigiria Figma).
- `EvaluateDailyAccess` troca `completedToday` (bool) por contagem: barra quando as Dailies não-reforço
  concluídas hoje (mesma conversão `CompletedAt.ToLocalTime()`) chegam a `DailiesPerDay`. Mensagem e código
  `daily_limite_diario_atingido` continuam, com o número no texto ("Você já concluiu 3 sessões hoje…").
- Reforço continua fora da cota, e "1 em andamento por vez" continua igual.

### 2. Sala da sessão como trava da sessão seguinte (backend)

- `dia.json` ganha `"salaDaSessao": "sessao-N"` (opcional; só molde D). Vai para
  `DailyTemplate.SessionRoomSlug`. O importador recusa slug que não existe em `conteudo/<curso>/salas/`.
- `EvaluateDailyAccess` (ou o use case que a chama, que já tem acesso às salas): a Daily não-reforço N+1 só
  começa se a sala da Daily N estiver concluída pelo aluno (`RoomProgress` com todas as tarefas e o fechamento).
  Novo código `sala_da_sessao_pendente`, com a mensagem "Faça a sala da sessão anterior (<título>) para abrir
  esta." Sem `salaDaSessao` no dia anterior, não há trava (cursos A/B/C não mudam).
- A sala `sessao-N` passa a abrir quando a Daily N é concluída, e não mais com a semana: `RoomLock` ganha a
  condição "Daily de origem concluída" para sala apontada por algum `salaDaSessao`.

### 3. Sessão menor (curadoria: molde D, linter e revisor)

| | Hoje | Fase 111 |
|---|---|---|
| Blocos por sessão | 2 a 6 | 3 a 4 |
| Palavras por seção | 150 | 100 (`secaoPalavrasMaxMoldeD`) |
| Leitura da sessão | 400 a 3000 | 600 a 1000 (`textoPalavrasMinMoldeD`/`textoPalavrasMaxMoldeD`) |
| Quiz | blocos a 12 | blocos a 8 |
| Termos novos | até 12 | até 8 |

- Meta: sessão de ~25–30 min + sala de 25–35 min = 1 hora.
- O ritmo pelo guia não cai: 3 sessões curtas por dia cobrem mais que 1 sessão longa.
- Revisor (D7): pedido de "profundidade" que não cabe no teto vira **sessão nova** (volta para a ficha, D1),
  nunca mais texto no mesmo bloco.

### 4. Tela

- Só mensagem nova de bloqueio (`sala_da_sessao_pendente`) na Daily, com link para a sala, e a contagem "sessão
  2 de 3 hoje" onde hoje aparece a cota. Se o link ou a contagem pedirem elemento novo, **Figma antes**.
- Atualizar o guia das telas (`frontend/src/lib/guiaTelas.ts`) da Daily e de `/salas`.

## Fora desta fase

- Dividir o WSTG Dia 1 (já no ar, 1691 palavras) em 2 sessões: empurra os Dias 2 a 6 (molde A, no ar). Fica para
  quando o `wstg` for refeito inteiro em molde D.
- Editar `DailiesPerDay` pelo painel.

## Verificação

- Testes de domínio: cota 1 (comportamento atual), cota 3 (3ª passa, 4ª barra), reforço fora da cota, trava da
  sala (sem `salaDaSessao` não trava; com sala não concluída barra; concluída libera), sala abre com a Daily.
- `CuratedContentAllFilesTests`/`CuratedCourseImporterTests` locais (precisam do `secret/`).
- Linter: o WSTG Dia 1 atual vai reprovar nos limites novos — rodar o linter com `--legado` ou marcar o dia como
  exceção em `limites.json` até a divisão.
- Dry-run do `importar wstg` e do `importar-salas wstg` em produção antes de aplicar.
