# Resumo — Fase 90: Missão no terminal v3 (objetivo, cola de comandos, prompt com diretório e clear de verdade)

## O que foi implementado

Dor do dono como aluno no Linux (01/10/2026): "quando limpa ele não mostra o último comando, também não mostra em qual
diretório estou", "tenho que ficar voltando no texto para ler cada comando" e "faço às cegas tentando acertar, a
atividade não passa um objetivo claro". Figma "Missão no terminal — v3 (proposta)" (página `209:10810`: em andamento,
depois do clear, cumprida e notas de UX), aprovado pelo dono em 01/10/2026.

- **Missão com objetivo**: `TerminalMission` ganhou `Situation` (o porquê), `Goal` (o que o aluno vai ver quando der
  certo, batendo com o `check`) e `Steps` (só em missão de mais de um comando, em palavras). Na tela: título + chips
  1..N e uma caixa SITUAÇÃO / OBJETIVO / PASSOS (ou FAÇA com o enunciado, em missão de um comando só).
- **Cola "Comandos de hoje"**: `TerminalCommand(Command, Description)` na atividade, com sintaxe genérica (`chmod 640
  arq`); painel ao lado do terminal, no lugar da lista de missões, e o clique copia o comando pro campo sem rodar.
- **Prompt com o diretório**: o worker do Linux devolve o `$PWD` junto com o exit code de cada comando
  (`__END<id>:<rc>:<pwd>`), `LabSession` guarda em `snapshot.cwd` e `shellPrompt` desenha `agente@srv:~/pasta$`. Cada
  linha do histórico guarda o prompt de quando foi digitada. Vale também no terminal da ponte.
- **clear de verdade**: `clear`, Ctrl+L e "Limpar · Ctrl+L" limpam a tela e deixam `── tela limpa · último comando: X ──`;
  o campo segue a última linha (sobe pro topo), e o histórico continua inteiro nas setas ↑↓ e na conferência.
- **Dica depois de cumprir**: desligada ("Dica · —"), "Próxima missão" liberada.
- **Curadoria (focadu-secret, commit próprio)**: as 35 missões dos 9 dias do Linux com `situation`/`goal`/`steps` e a
  cola de cada dia, fonte única em `scripts/linux-missoes/contexto_missoes.py` (o `gerar_missoes.py` reaplica);
  `verificar-missoes.mjs` recusa missão sem `situation`/`goal` ou dia sem `commands`; `CURADORIA.md` 5.3 e `MESTRE.md`.
- Guia das telas (bloco "Missão no terminal"), mock (`commands` no DTO), `ARQUITETURA.md` e `CLAUDE.md`.

## Decisões técnicas tomadas que não estavam no prompt original

- **Sem migration**: a cola vai na mesma coluna `TerminalMissionsJson`, que passou a guardar `{"missions", "commands"}`.
  `TerminalMissions.Parse` lê os dois formatos (o antigo era só a lista); o `seed` compara o JSON e regrava os dias.
- **Campos novos opcionais no domínio**: missão curada antes do v3 continua importando e cai no layout da Fase 88 (lista
  lateral e o enunciado no título). Quem obriga os campos é o verificador da curadoria, não o servidor.
- **Passos em palavras, nunca o comando pronto**, e a cola com sintaxe genérica: a resposta continua sendo do aluno (a
  dica nível 2 é que entrega o comando, como antes).
- **O `clear` só esconde a tela**: o histórico inteiro segue indo pra conferência e pras setas.
- **O campo fica dentro do histórico** (terminal de verdade), desabilitado enquanto o comando roda e com o foco
  devolvido depois; vale também pro terminal da ponte.
- Escolhas do dono: `clear` com a linha do último comando; cola ao lado do terminal; reescrever **todos** os dias de uma
  vez; Figma só desta tela.

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/Activities/{TerminalMission,DailyActivity}.cs
backend/src/Focadu.Application/Dailies/{Dtos,DailyStateMapper}.cs, Seed/CuratedDayImporter.cs
backend/src/Focadu.Infrastructure/Persistence/Configurations/DailyActivityConfiguration.cs
backend/tests/Focadu.Tests/Seed/TerminalMissionImporterTests.cs   (+2 testes)
frontend/public/lab/{linux.worker,runner}.mjs
frontend/src/lab/{labClient,labSession,labOutput}.ts
frontend/src/components/code/{TerminalMissionActivity,LabCodeStepActivity,labParts}.tsx
frontend/src/api/types.ts, lib/guiaTelas.ts, mock/sessionMock.ts
secret/curadoria/scripts/linux-missoes/contexto_missoes.py        (novo, no focadu-secret)
```

## Testes

- `dotnet test --filter TerminalMission`: 20 passando (2 novos: os campos v3 e a cola chegam do dia-N.json ao domínio;
  o formato antigo do JSON ainda é lido). `dotnet build`, `tsc -b` e `npm run lint` (sem aviso novo) limpos.
- Navegador (Playwright, mock `?at=terminal`, Linux de verdade no v86): `cd` muda o prompt (`~/pasta`, `/etc`, `~`);
  clique na cola preenche o campo e foca; `clear` mostra a linha do último comando com o campo no topo; missão 2 do Dia 2
  cumprida desliga a dica. Sem erro de página.
- `verificar-missoes.mjs` nos 9 dias do Linux: 35 missões conferem.

## Dúvidas ou pontos abertos para a próxima fase

- Celular segue com "Continue no computador" (sem mudança).
- Os textos de situação/objetivo foram escritos pelo Claude e valem revisão do dono, dia a dia, quando ele fizer o curso.
- Ordem do deploy: empurrar a `main` do `focadu-secret` antes da do `focadu` (o seed do backend lê os dias com os campos
  novos; o deploy faz `reset --hard` no `secret/`).
