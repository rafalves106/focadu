# Resumo — Fase 95: SQLite no laboratório de código

Pedida em 12/10/2026 para o curso Banco de Dados (A1 da UNA em 22 e 23/10, plano em
`secret/processo/cursos/banco-de-dados/plano-a1.md`): o aluno precisa escrever **SQL puro**, como o professor ensina, e
ver o resultado no laboratório. Sem tela nova: o laboratório da Fase 87 ganhou um runtime, com o mesmo editor, chip,
saída e marcação da linha do erro.

## O que foi implementado

- **Runtime `sqlite`** em `LabConfig` (`LabConfig.Sqlite`). `lab.setup` agora vale para `bash` **e** `sqlite` (no
  sqlite são comandos SQL que montam o banco do dia); `lab.user` continua só no bash; `lab.image` e `lab.packages`
  são recusados no sqlite (`lab_imagem_invalida`, `lab_pacote_invalido`). Sem migration: `LabConfig` é JSON em texto.
- **Execução** em `frontend/public/lab/py.worker.mjs` (o runner manda `sqlite` para o mesmo Worker do Python). Usa o
  `sqlite3` da biblioteca padrão do Pyodide (SQLite 3.39), **sem pacote extra** nem download a mais. Código Python em
  `SQL_RUNNER`:
  - **Banco novo em memória a cada execução** (resultado determinístico pra avaliar): o `.db` de `lab.files` (no máximo
    um, por `backup`), depois os `.sql` de `lab.files` (`executescript`), depois o `lab.setup`, depois o SQL do aluno.
    Conexão em autocommit, então `BEGIN`/`COMMIT`/`ROLLBACK` do aluno valem como escritos.
  - O SQL do aluno é quebrado em comandos com `sqlite3.complete_statement` (`;` dentro de texto não corta), guardando
    a linha onde cada um começa (comentário `--` e linha em branco antes do comando não contam).
  - `SELECT`: tabela em texto (cabeçalho, linha de `-`, colunas alinhadas por dois espaços, `NULL` escrito,
    `(nenhuma linha)` quando vazio, linha em branco entre duas saídas). `INSERT`/`UPDATE`/`DELETE`/`REPLACE`:
    `-- N linha(s) alterada(s)`. `CREATE` e afins: nada.
  - Erro: `Erro na linha N: <mensagem do SQLite>`, para a execução e devolve exit 1. Erro no banco do dia:
    `Erro no banco do dia (setup): ...`.
  - Comandos de ponto da aula: `.tables` e `.schema [tabela]`; outro comando de ponto vira aviso e é ignorado.
  - `PRAGMA foreign_keys` fica no padrão do SQLite (desligado), igual à aula; o dia liga no `setup` quando quiser.
- **Front**: `LabRuntime` com `'sqlite'`; `LANGUAGE_NAME.sqlite = 'SQL'`; marcador de comentário por linguagem
  (`COMMENT`, `--` no SQL) no placeholder do editor; recuo de 2 espaços; chip `SQLITE 3.39`; `errorLine` reconhece
  `linha N` além de `line N`.
- **Curadoria** (repo `focadu-secret`): `"sqlite"` no enum `lab.runtime` de `processo/molde/dia.schema.json`;
  `processo/scripts/lab/verificar.mjs` ganhou `rodarSqlite`, que **lê o `SQL_RUNNER` do próprio `py.worker.mjs`** (uma
  versão só do código) e confere cada solução acumulada contra o `codeExpectedOutput`; regra 5 e campos `setup`/`user`
  documentados em `processo/molde/lab.md`. O linter não tem regra por runtime (só chama o verificador).

## Decisões técnicas tomadas que não estavam no prompt original

- **Mesmo Worker do Python** em vez de um `sqlite.worker.mjs` novo: o `sqlite3` já vem no Pyodide e o worker já sabe
  baixar e iniciar o Pyodide com barra de progresso ("SQLite", "Iniciando o SQLite"). Primeira carga igual à do Python
  sem Scapy (~13 MB).
- **No máximo um `.db` por dia**: `backup` substitui o banco inteiro, então dois `.db` não se somam. Mais de um vira erro
  claro na execução (não na importação: o importador não sabe o tipo do arquivo).
- Os passos de código acumulam (como no Python): o SQL dos passos anteriores roda de novo antes do passo atual, e a
  saída dele aparece também. É o mesmo comportamento de rodar um `.sql` inteiro.
- `cur.rowcount` só é mostrado para `INSERT`/`UPDATE`/`DELETE`/`REPLACE`; um `WITH ... INSERT` não ganha a linha
  `-- N linhas alteradas` (caso raro na A1).

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/Dailies/LabConfig.cs                 (runtime sqlite, setup em bash e sqlite)
backend/tests/Focadu.Tests/Dailies/LabCodeStepTests.cs         (+2 testes)
frontend/public/lab/py.worker.mjs                              (SQL_RUNNER e modo sqlite)
frontend/public/lab/runner.mjs                                 (WORKERS.sqlite)
frontend/src/api/types.ts, src/lab/labOutput.ts, src/components/code/LabCodeStepActivity.tsx
docs/fase-95/resumo-implementacao-fase-95.md
secret: processo/molde/dia.schema.json, processo/molde/lab.md, processo/scripts/lab/verificar.mjs
```

## Testes

- `dotnet test`: 712 aprovados, 3 falhas **pré-existentes** (iguais com as mudanças guardadas no stash):
  `CuratedCourseImporterTests.BridgeDays_HaveCodeSteps_WithExpectedOutput` e dois de `TerminalMissionImporterTests`,
  que leem dias antigos de curadoria apagados na refação da Fase 92. Os 2 testes novos
  (`LabConfig_Sqlite_TakesSetup_ButNoImagePackagesOrUser`, `LabConfig_Setup_IsStillOnlyForBashAndSqlite`) passam.
- `npx tsc -b`, `npm run lint` (só os avisos antigos) e `npm run build`: ok.
- **Worker de verdade no Node**: o `py.worker.mjs` importado num arnês com `postMessage`/`fetch` falsos, com `init`
  sqlite (um `.db`, um `.sql` e `setup`) e dois `run`: tabelas, `NULL`, linhas alteradas, `BEGIN ... ROLLBACK`,
  `.tables`, `.schema`, comando de ponto desconhecido, `;` dentro de texto, vários comandos na mesma linha, erro de
  sintaxe com a linha certa e banco limpo entre execuções (o `INSERT` da 1ª não aparece na 2ª).
- `verificar.mjs` com um dia de teste sqlite de dois passos: "2 passos conferem".
- **Sem verificação visual**: a sessão não tem navegador. Falta o dono abrir um dia com `lab.runtime: sqlite` no app e
  conferir o chip, a barra de progresso, a tabela na saída (fonte monoespaçada) e a linha do erro marcada no editor.

## Dúvidas ou pontos abertos para a próxima fase

- O mock de sessão (`frontend/mock/sessionMock.ts`, `/__mock/reset?at=codigo&lab=...`) ainda lê
  `secret/curadoria/`, que virou `secret/conteudo/` na Fase 92: está quebrado para todos os runtimes, não só o sqlite.
- O `command` do sqlite é só exemplo (`sqlite3 loja.db < consulta.sql`); a dica da Focada recebe o runtime pelo prompt
  de sempre, sem texto específico de SQL. Ver na primeira dica real se precisa ajustar.
- Próximo: Turmas (o convite limita o aluno aos cursos da turma; Figma antes do código) e a curadoria do D1 e D2 do
  Banco de Dados.
