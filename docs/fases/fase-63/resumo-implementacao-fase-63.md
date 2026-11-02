# Resumo — Fase 63: Projeto Semanal com o layout ajustado do Figma + anotação presa ao projeto

## O que foi implementado

- **Layout ajustado pelo dono no Figma** (node `178:132`, 2ª versão) na `WeeklyProjectPage`:
  - Coluna esquerda: cartão **REPOSITÓRIO** (ícone de terminal do Figma + caixa tracejada com o
    `git clone`, botão verde "COPIAR COMANDO GIT CLONE", texto de ajuda, "USUÁRIO DO GIT" e "TOKEN
    (USE COMO SENHA)" em caixas com ícone de copiar) e, abaixo, **REFERÊNCIAS** ocupando o resto.
  - Centro: rótulo **DESAFIO SEMANAL** no topo do cartão da especificação.
  - Coluna direita: **ANOTAÇÃO RÁPIDA** (240px) + **TIRA DÚVIDAS** (chat) ocupando o resto.
  - Rótulos de cartão em Fira Code 10px negrito maiúsculo (`CardLabel`, componente novo).
- **Anotação do Projeto Semanal (pedido do dono: "a anotação deve estar vinculada ao projeto, não à
  última Daily")**:
  - `Note` passa a ter **exatamente um** contexto: `DailyId` (como sempre) **ou** `WeeklyProjectId`
    (novo) — `Note.ForWeeklyProject(...)`; check constraint `CK_Notes_ExactlyOneContext` no banco.
  - `POST /api/weeklies/{weeklyId}/project/notes` (`CreateWeeklyProjectNoteUseCase`).
  - `NoteDto`: `dailyId`/`dayNumber` viram opcionais, entra `weeklyProjectId`; em nota de projeto,
    `dailyDate` é o dia em que ela foi criada. `NoteDto.From(note, weekly)` monta os dois casos.
  - Caderninho: notas de projeto aparecem como "Semana N, Projeto" (`lib/noteContext.ts`); o painel
    de anotações de uma sessão (Fase 57, `?dailyId=`) nunca traz nota de projeto.
  - `QuickNotePanel` recebe `target` (`{ dailyId }` ou `{ weeklyId }`) e ganhou a variante `fill`.

## Decisões técnicas tomadas que não estavam no prompt original

- **Token sem valor na tela**: o Figma desenha só o estado "recém-gerado" (caixa tracejada vermelha
  + aviso). Como a Focadu não guarda o token (Fase 60), o outro estado mostra `…xxxxxxxx` e um
  botão "GERAR" dentro da caixa, com confirmação em texto quando já existe token valendo.
- A caixa do `git clone` continua sendo link pro repositório no Forgejo (antes a URL era um link
  próprio no cartão, que o Figma tirou).
- Botão "Caderninho →" mantido no cartão de anotação (não está no Figma, mas é o único caminho pra
  reler as notas dali).
- Barra de progresso continua âmbar (cor das telas de projeto), o Figma usa verde.
- Nota de projeto sem Daily: `WeekNumber` vem da Weekly dona do projeto; nenhuma mudança em
  `ListNoteTagsUseCase` (tags de notas de projeto entram no autocomplete normalmente).

## Estrutura de arquivos criada

```
backend/src/Focadu.Application/Notes/CreateWeeklyProjectNoteUseCase.cs
backend/src/Focadu.Infrastructure/Migrations/*_NotesForWeeklyProject.cs
frontend/src/components/CardLabel.tsx
frontend/src/lib/noteContext.ts
frontend/src/assets/project/terminal-icon.png
docs/fase-63/resumo-implementacao-fase-63.md
```

Alterados: `Note`, `NoteConfiguration`, `INoteRepository`/`NoteRepository`
(`ListByUserAndContextIdsAsync`), `IWeeklyRepository`/`WeeklyRepository`
(`GetByWeeklyProjectIdAsync`), `Notes/Dtos.cs`, `CreateNoteUseCase`, `EditNoteUseCase`,
`ListNotesUseCase`, `DependencyInjection`, `Program.cs`; frontend `WeeklyProjectPage`,
`QuickNotePanel`, `StudyAssistantPanel`, `NotebookTab`, `NoteEditorModal`, `ContentPreviewModal`,
`useMaterialSidebar`, `api/types.ts`, `api/client.ts`.

## Testes

- `dotnet test`: 446 verdes (2 novos: nota de Daily só com `DailyId`; `ForWeeklyProject` só com
  `WeeklyProjectId` e mesma validação).
- **Ponta a ponta contra Postgres descartável** (container `postgres:16-alpine` na 55432 + API
  local na 5390, seed real): nota de Daily e de projeto criadas, editada, listada (as duas juntas,
  ordenadas), escopo `?dailyId=` sem a nota de projeto, tags das duas, 404 em Weekly de outro
  usuário, delete, e o check constraint recusando nota sem contexto. Ambiente removido no fim.
  **Incidente do teste**: a 1ª subida da API local usou o launch profile (`dotnet run` ignora
  `ASPNETCORE_URLS` com ele) e escutou em `localhost:5282`, a mesma porta do backend de produção no
  host, por ~3 min — apontada pro Postgres descartável (nada escrito em produção); o site não usa
  essa porta (nginx → backend pela rede do Docker). Derrubada ao perceber; subida de novo com
  `--no-launch-profile`. Pra testes locais futuros: sempre `--no-launch-profile`.
- Frontend: `tsc -b` + `vite build` limpos; Chrome 1440×900 (API mockada): sem rolagem externa,
  estados do token (sem token, confirmação, recém-gerado).

## Dúvidas ou pontos abertos para a próxima fase

- Botão de salvar da anotação ficou com o estilo antigo (verde cheio, texto 14px); o Figma não
  desenha o miolo desse cartão.
- Filtro do Caderninho por "só notas de projeto" não existe (aparecem misturadas por data).
