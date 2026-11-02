# Resumo — Fase 88: Missão no terminal (Linux embutido nos dias normais)

## O que foi implementado

Pedido do dono (30/09/2026): os dias normais do Linux mandavam o aluno rodar `docker run debian` no computador dele.
Agora o Linux embutido (o v86 da Fase 87) aparece **nas atividades diárias**, não só na ponte. Figma "Laboratório de
código — v2 (proposta)", quadros 08 a 10 (desenhados e aprovados em 30/09/2026). Piloto: Linux Dia 2.

- **Atividade nova `TerminalMission`** (`ActivityType` 8): só o terminal, sem editor. O aluno cumpre missões de comando e
  o **navegador** confere depois de cada comando. Sem IA, sem nota, sem tentativa gasta; concluir registra a atividade
  com Score fixo 100 (como a Leitura, fora do Score de Estudo). **Não marca o dia como ponte** (`IsBridge` só olha
  `CodeStep`).
- **Missões em JSON** (`DailyActivity.TerminalMissionsJson`, `TerminalMissions` no domínio): título, enunciado, 1 a 3
  dicas fixas (conceito → comando), "o que reparar" e o `check`. O `check` vale junto: `command` (regex no comando),
  `output` (regex na saída) e `probe` + `state` (o laboratório roda o `probe` em silêncio e confere o **estado** do
  sistema, sem depender de como o aluno chegou lá). As regex são validadas na importação.
- **Laboratório sem editor e com ambiente** (`LabConfig`): `entry`/`command` passam a ser opcionais (dia só de
  missões), e entram `setup` (linhas de shell como root antes de liberar o terminal) e `user` (o terminal entra como
  ele, `su -`). `linux.worker.mjs` executa o `setup`, troca a shell e grava arquivos/serviços na home do usuário.
- **Front**: `TerminalMissionActivity` (lista de missões, terminal, faixa de conferência, dica, "Próxima missão"),
  `MissionsGauge` no lugar do conta-giros, `lab/terminalMission.ts` (a conferência) e `terminalMissionStore.ts`
  (progresso em memória, igual ao Linux que só vive na sessão). Celular: aviso "continue no computador" e segue sem as
  missões. Guia das telas e fala da Focada atualizados.
- **Dias que já estão no banco**: `CuratedDayImporter.ApplyMissions` insere a atividade na posição do arquivo e empurra
  as seguintes (as respostas guardam o Id, ninguém perde progresso); `SyncLabConfigUseCase` (todo `seed`) chama
  `ApplyMissions` + `ApplyLab`, idempotente. Migration `TerminalMission` (coluna `DailyActivities.TerminalMissionsJson`).
- **Curadoria**: `linux/semana-1/dia-2.json` ganhou a atividade (4 missões) e o `lab` (usuário `agente`, como a Focada trata o aluno, no grupo `devs`,
  `umask 002`, sem o bit setgid da home, para bater com o Debian dos textos); a Leitura perdeu o `docker run`.
  `secret/curadoria/scripts/lab/verificar-missoes.mjs` sobe o Linux com o `setup` do dia e confere, por missão, que o
  estado inicial não passa, a `solution` passa e cada `wrong` não passa. `CURADORIA.md` 5.3, `ROTEIRO.md` e a skill
  `curar-conteudo` atualizados.

## Decisões técnicas tomadas que não estavam no prompt original

- **A conferência é do navegador** (mesma decisão 10 do laboratório, Fase 86): o servidor não verifica a saída, só
  registra a conclusão. O `check` é público (vai no DTO); não há segredo a proteger porque missão não vale nota.
- **Conferência por estado (`probe`)** em vez de "o último comando foi X": o aluno cria arquivo, troca grupo e ajusta o
  modo em comandos separados; o que vale é o resultado. Missão de estado leva também `command`, pra ele "olhar".
- **`setup` como linhas de shell da curadoria** (não um perfil fixo na imagem): cada dia monta o ambiente que o texto
  descreve sem rebuild de imagem. O verificador roda o mesmo `setup`.
- **Progresso em memória** (não no servidor): o Linux só vive na sessão; recarregar refaz as missões.
- **Celular segue sem as missões** em vez de travar o dia (o laboratório é só desktop).
- Bug pego no teste real: depois de `exec su -` o bash liga o bracketed paste e o marcador da VM vem com escape; a
  espera do worker casa só o texto do marcador.

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/Activities/TerminalMission.cs
backend/src/Focadu.Infrastructure/Migrations/20260930223503_TerminalMission.cs
backend/tests/Focadu.Tests/Seed/TerminalMissionImporterTests.cs
frontend/src/components/code/TerminalMissionActivity.tsx
frontend/src/components/session/MissionsGauge.tsx
frontend/src/lab/terminalMission.ts
frontend/src/lab/terminalMissionStore.ts
secret/curadoria/scripts/lab/verificar-missoes.mjs
```

Alterados: `ActivityType`, `DailyActivity`, `DailyTemplate` (`SetLab`, `InsertActivity`), `LabConfig`, `Daily`
(Score), `CuratedDayImporter`, `SyncLabConfigUseCase`, DTOs/mapper, `linux.worker.mjs`, `labParts` (prompt/altura do
terminal), `SessionShell`, `BlockIntro`, `TodayPage`, mock da sessão (`/__mock/reset?at=terminal`), tipos e guia.

## Testes

- Backend: 659 testes verdes (7 novos em `TerminalMissionImporterTests`: import, regex/check inválidos, `setup` fora do
  bash, dia de `CodeStep` sem `entry`, `ApplyMissions` no meio do dia e idempotente, Dia 2 real, Score fixo).
- `verificar-missoes.mjs` no Dia 2: 4 de 4 missões conferem no Linux do laboratório (Alpine no v86 em Node).
- Navegador real (mock `?at=terminal`, Linux rodando de verdade): intro da Focada, boot como `ana`, comando
  inexistente (faixa âmbar), `id` (cumprida), missões de estado 2 a 4 (incluindo `ls -l` antes de ajustar não passar),
  "Concluir missões" avança pro Quiz, voltar à etapa mantém terminal e progresso, celular mostra o aviso. Sem erro de
  console. `tsc -b` e `oxlint` sem achados novos.

## Dúvidas ou pontos abertos para a próxima fase

- **Não foi feito deploy** (o `seed` do próximo deploy insere a atividade no Dia 2 do banco). Conferir em produção.
- Dias 1, 3-5 e 7-11 do Linux seguem com `docker run`; cada um precisa de missões + `verificar-missoes.mjs`. Dia 9 (SSH)
  e partes de `sudo`/`apt` dependem de imagem maior ou ficam só como texto.
- O Alpine é busybox: `ls`, `stat`, `ps`, `ss` podem diferir do Debian dos textos; o verificador pega na missão, mas a
  Leitura ainda mostra a saída do Debian.
- Quadros do Figma não desenhados: Linux subindo (hoje usa a barra de progresso) e erro de inicialização (usa o
  `LabError` da ponte).

## Ajuste posterior (30/09/2026)

O usuário do curso passou de `ana` para **`agente`** (pedido do dono: é como a Focada se refere ao aluno). `dia-2.json`
inteiro (setup, missões, Leitura, Quizzes) foi atualizado e as missões reconferidas (4 de 4). Em produção o texto do Dia 2
precisa do patch `secret/curadoria/patches/2026-09-30-linux-dia-2-agente.sql` (gerado por
`scripts/linux-patch/gerar_patch_dia2_agente.py`; **não executado**: aplica a Leitura e os 3 Quizzes com "ana"; a atividade
`TerminalMission` entra pelo `seed` do deploy). Os outros dias do Linux ainda falam em `ana` até ganharem missões.

## Expansão para todos os dias (30/09/2026)

Pedido do dono: em todo terminal o usuário é `agente`, e missões em todos os dias. Feito para os Dias 1, 3, 4, 5, 7, 8, 9 e 11
(3 a 5 missões, todas conferidas por `verificar-missoes.mjs` no Linux embutido) além do Dia 2; Dia 10 (SSH) fica sem missões (sem
`ssh`/`sshd` no laboratório) e só troca o nome; as pontes 6 e 12 passaram a rodar como `agente` (`verificar.mjs` reconferiu os dois).
- `secret/curadoria/scripts/linux-missoes/gerar_missoes.py` gera tudo (missões, `ana`→`agente` com concordância, bloco de ambiente da
  Leitura). Dias 8 e 9 sobem o `lab_http.py` como serviço do laboratório (File `lab_http.py` no dia).
- **Bug real achado no teste:** `serial0_send` do v86 manda só o código de cada caractere; acento digitado virava byte inválido. O
  worker (e os verificadores) agora digitam em UTF-8 (`emu.bus.send('serial0-input', byte)`), o que também corrige as pontes.
- Front: a ponte mostra o prompt `agente@srv:~$` e grava o script em `/home/agente`. Mock: `/__mock/reset?at=terminal&lab=N`.
- Patch de texto para produção: `secret/curadoria/patches/2026-09-30-linux-dias-agente.sql` (gerado por `scripts/linux-patch/gerar_patch_agente.py`,
  **não executado**; substitui o patch só do Dia 2).
- Verificação: 669 testes verdes; navegador real com o Dia 8 (servidor de laboratório, 4 missões) e a ponte do Dia 6 como `agente`.
- O Alpine não tem `ss`, `dig`, `traceroute`, `ping` (sem root): essas partes dos Dias 3, 7 e 9 ficam como leitura.
