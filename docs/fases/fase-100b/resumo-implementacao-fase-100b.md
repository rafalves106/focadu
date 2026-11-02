# Resumo — Fase 100b: README do Projeto Semanal dentro do app

Aberta e fechada em 14/10/2026, na branch `fase-100b-readme-no-app` (a partir da `main` com as Fases 98–101 em produção). Tira o bloqueio de ligar o fork
privado da Fase 100: o enunciado do Projeto Semanal mora no README do fork, e com login obrigatório no Forgejo o aluno (que só tem token) não abria o link.

## O que foi implementado

- **Backend**: `GET /api/weeklies/{weeklyId}/project/readme` (`GetWeeklyProjectReadmeUseCase`) devolve `{ text }` com o `README.md` do fork do aluno, lido por
  `IForgejoService.GetReadmeAsync` (`repos/{dono}/{repo}/raw/README.md`, token de admin). Só o dono lê: a Weekly é buscada pelo `userId`, e o repositório é
  sempre `ForgejoUsername` + slug do modelo da linguagem, nunca algo vindo do cliente. 404 `readme_indisponivel` sem fork, sem conta no Forgejo ou sem README.
- **Front** (desenho aprovado no Figma, arquivo "Focadu — Pixel Art", página "Projeto Semanal: README no app — v1", nó `298:4502`): o link "Abrir README.md" do
  `DialogueBox` virou botão (`onOpenReadme`, no lugar de `readmeUrl`) que abre `ProjectReadmeModal` (sobre `PixelModal`, `max-w-3xl`, `MarkdownBlock` +
  `PIXEL_PROSE`). Estados carregando e erro com "Tentar de novo" (`PixelButton ghost`). Guia da tela do projeto atualizado em `guiaTelas.ts`.

## Decisões técnicas tomadas que não estavam no prompt original

- Botão "Tentar de novo" no tom neutro (o `ghost` padrão), sem link "abrir no Forgejo" (o fork é privado), área de toque de 40px com margem negativa para o rodapé
  não crescer. Escolhas do Claude, aceitas pelo dono ("pode seguir com suas escolhas").
- O modal só mostra o Markdown que o `MarkdownBlock` aceita: tabela e imagem não aparecem.

## Estrutura de arquivos criada

- `backend/src/Focadu.Application/Weeklies/GetWeeklyProjectReadmeUseCase.cs`, `frontend/src/components/ProjectReadmeModal.tsx`.
- Alterados: `IForgejoService`, `ForgejoService`, `Program.cs`, `DependencyInjection.cs` (Application), `DialogueBox.tsx`, `WeeklyProjectPage.tsx`, `StartDashboard.tsx`,
  `client.ts`, `types.ts`, `guiaTelas.ts`.

## Testes

- `dotnet test`: 759 passam. `tsc -b`, `npm run lint` (0 erros) e `npm run build` passam. Sem teste novo: o caso de uso depende de repositório e Forgejo, e a
  convenção do projeto não tem fakes. **Não verificado**: o endpoint contra um Forgejo real e o modal no navegador (layout, rolagem, foco) — o Falves precisa conferir.

## Dúvidas ou pontos abertos para a próxima fase

- **Antes de ligar as 3 chaves do fork privado** (`FORGEJO_REQUIRE_PRIVATE_FORKS`, `FORGEJO_DEFAULT_PRIVATE`, `FORGEJO_REQUIRE_SIGNIN_VIEW`) e privar os 22 templates, na ordem
  de `docs/fase-100/`: conferir o modal em produção e o `README.md` dos templates (sem tabela nem imagem). Operação na VM só com confirmação do Falves.
- Fork antigo sem `README.md` mostra "O repositório não tem README.md." (404).

## Por que isso existe

O fork privado protege o trabalho do aluno e o enunciado, mas só funciona se o aluno ainda consegue ler o enunciado; servir o README pelo próprio app tira essa dependência do login do Forgejo.
