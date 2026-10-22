# Resumo — Fase 104: `importar` lê o projeto.json (Projeto Semanal)

Aberta e fechada em 22/10/2026, na branch `fase-104-importar-projeto-semanal` (a partir da `fase-103-medicao-de-produto`, que ainda não estava na `main`).
Motivo: o projeto da Semana 1 foi refeito no padrão novo da curadoria (4 seções fixas, só Python, briefing da Focada) e aprovado pelo dono em
22/10/2026, mas só o `seed` lia `projeto.json`. O seed é idempotente por Curso e não recarrega o que já foi seedado, então o enunciado novo
não chegava ao banco. O comando `importar` (Fase 92) só importava dias.

## O que foi implementado

- **`importar <curso>` sem `--dia`** importa também o `semana-N/projeto.json` de cada semana que tem o arquivo (`ImportCuratedDaysUseCase`).
  Com `--dia N` só o dia é importado, como antes. Saída do comando e do `ImportReport` ganharam a lista `Projects` (`ProjectOutcome`).
- **Substituição por completo**: texto (`specText`), briefing, falas de estado, `forgejoTemplateSlug`, variantes de linguagem e referências
  são trocados pelo conteúdo do arquivo. `WeeklyTemplate.ClearProject()` é o único caminho que desfaz o "definido uma vez só" dos setters.
- **Sem mudança = pula**: `CuratedProjectImporter.Matches` compara o banco com o arquivo (sem coluna de hash, sem migration).
- **`--confirmar`**: se algum aluno já está com o projeto além de `Pending` (entregue ou avaliado), a troca para e pede confirmação. Quem já
  tem repositório mantém o que tem.
- **Linter de projeto**: `NodeDayLinter` roda `projeto-cli.js` (etapa P3) quando o arquivo é `projeto.json`, com a ficha da semana
  (`processo/cursos/<curso>/fichas/semana-N.ficha.md`). Sem Node (container), vale `--sem-linter`, como nos dias.
- **Campo novo e opcional no `projeto.json`**: `forgejoTemplateSlug` (repositório-modelo único, a linguagem padrão é Python, sem escolha).
- `CourseRepository.GetFullTemplateGraphAsync` passou a carregar `References` (sem isso o `ClearProject` não removeria as referências antigas).

## Decisões técnicas tomadas que não estavam no prompt original

- **Projeto novo sem `languages`/`references` apaga variantes e referências antigas** e passa a usar o slug único (decisão do dono em
  22/10/2026, segue a decisão de 02/10 de uma linguagem padrão por projeto). Alternativas descartadas: só trocar texto e briefing (a escolha
  Python/JS continuaria no app) e trocar só com `--confirmar`.
- **Comparação por conteúdo em vez de hash**: evita migration e coluna nova numa fase pequena.
- **Painel de gestão não mostra o projeto**: a aba Curadoria continua só com dias; o resultado do projeto aparece no comando.

## Estrutura de arquivos

```
backend/src/Focadu.Domain/Weeklies/WeeklyTemplate.cs                (ClearProject)
backend/src/Focadu.Application/Seed/{CuratedProjectImporter,ImportCuratedDaysUseCase}.cs
backend/src/Focadu.Infrastructure/Services/NodeDayLinter.cs         (LintProjectAsync, ParseProject)
backend/src/Focadu.Infrastructure/Persistence/Repositories/CourseRepository.cs
backend/src/Focadu.Api/Program.cs                                   (saída do comando)
backend/tests/Focadu.Tests/Seed/CuratedProjectImportTests.cs
docs/fase-104/
```

## Testes

787 testes passam (3 novos: substituição do projeto antigo, `Matches`, leitura da saída do `projeto-cli.js`). Dry-run local
`importar web-security --dry-run` listou "Projeto semana 1: Created". **Não foi rodado em produção nem sem `--dry-run`.**

## Dúvidas e pendências em aberto

- O `projeto.json` da Semana 1 **não tem `forgejoTemplateSlug`**: quem se matricula depois do import fica sem repositório até o modelo ser
  publicado no Forgejo (precisa de autorização do dono) e o slug entrar no arquivo.
- Alunos que já têm `Weekly` sem repositório não são preenchidos retroativamente.
- Rodar em produção: `importar web-security --dry-run` e depois `importar web-security --sem-linter` no container da Api.
- A Fase 103 cita "insumo da Fase 104" para ajuste de layout por aparelho; esse número foi usado por esta fase, então aquele item segue sem fase.
