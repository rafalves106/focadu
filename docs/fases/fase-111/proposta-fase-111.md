# Fase 111 — Sessões do molde D: até 3 por dia, com a sala entre elas (proposta)

**Status:** proposta aprovada pelo dono em 17/11/2026 (caminho A), com a mudança do dono do mesmo dia (abaixo).
Implementada na branch `fase-111-sessoes-por-dia`: ver `resumo-implementacao-fase-111.md`.

> **Mudança do dono (17/11/2026, antes do código):** as Dailies continuam existindo, mas o curso de sessões tem de
> ser **explícito no código**. Nada de só `DailiesPerDay`: `Course.StudyFormat` (enum `Daily | Sessions`, padrão
> `Daily`, do `curso.json` `"formato": "sessoes"`; wstg = `Sessions`) e `Course.SessionsPerDay` (só em `Sessions`;
> wstg = 3). As regras de sessão têm nome próprio (`SessionRules`) e o `EvaluateDailyAccess` só as chama quando o
> formato é `Sessions`. Cursos `Daily` não mudam em nada (testes provam). As seções 1 e 2 abaixo já estão escritas
> com essa mudança.

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

### 1. Formato de estudo e cota de sessões (backend)

- `Course.StudyFormat` (enum `Daily | Sessions`, padrão `Daily`) e `Course.SessionsPerDay` (int, 1 a 6; só vale em
  `Sessions`, em `Daily` fica 1). Migration com default `Daily`/1: nenhum curso existente muda.
- Valor vem do `curso.json` do `secret/` (`"formato": "sessoes"`, `"sessoesPorDia": 3`), lido pelo seed/importador
  a cada passada; sem `formato` = `Daily`. Editar pelo painel fica para depois (exigiria Figma).
- `SessionRules` (domínio): regras de entrada numa sessão. `EvaluateDailyAccess` recebe um `StudyContext` e só chama
  `SessionRules` quando o formato é `Sessions`; em `Daily` a regra de "1 por dia" de sempre fica intacta.
- Cota: barra quando as sessões não-reforço concluídas hoje (mesma conversão `CompletedAt.ToLocalTime()`) chegam a
  `SessionsPerDay`. Mesmo código `daily_limite_diario_atingido`, com o número no texto.
- Reforço continua fora da cota, e "1 em andamento por vez" continua igual.

### 2. Sala da sessão como trava da sessão seguinte (backend)

- `dia.json` ganha `"salaDaSessao": "sessao-N"` (opcional; só molde D). Vai para
  `DailyTemplate.SessionRoomSlug`. O importador recusa slug que não existe em `conteudo/<curso>/salas/`.
- Só em `Sessions` (`SessionRules`, com a sala pendente resolvida na Application por `StudyContextResolver`, que
  enxerga salas e progresso): a Daily não-reforço N+1 só começa se a sala da Daily N estiver concluída pelo aluno
  (`RoomProgress` com todas as tarefas e o fechamento). Novo código `sala_da_sessao_pendente`, com a mensagem "Faça
  a sala da sessão anterior (<título>) para abrir esta." Vem antes da cota. Sem `salaDaSessao` no dia anterior, ou
  com a sala ainda não importada, não há trava. Curso `Daily` nunca passa por aqui.
- A sala `sessao-N` passa a abrir quando a Daily N é concluída, e não mais com a semana: `RoomLock` ganha
  `OpensWithSession` para sala apontada por algum `salaDaSessao`, só em curso `Sessions`.

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
- Editar `StudyFormat`/`SessionsPerDay` pelo painel.

## Verificação

- Testes de domínio: curso `Daily` igual ao de hoje (2ª Daily barrada mesmo com `StudyContext`), `Sessions` com
  cota 3 (3ª passa, 4ª barra), reforço fora da cota, trava da sala (sem `salaDaSessao` não trava; com sala não
  concluída barra; concluída libera), sala abre com a Daily (e em curso `Daily` segue a semana).
- `CuratedContentAllFilesTests`/`CuratedCourseImporterTests` locais (precisam do `secret/`).
- Linter: o WSTG Dia 1 atual vai reprovar nos limites novos — rodar o linter com `--legado` ou marcar o dia como
  exceção em `limites.json` até a divisão.
- Dry-run do `importar wstg` e do `importar-salas wstg` em produção antes de aplicar.
