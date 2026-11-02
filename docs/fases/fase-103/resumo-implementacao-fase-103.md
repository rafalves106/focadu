# Resumo — Fase 103: Medição de produto (aba Retenção)

Aberta e fechada em 15/10/2026, na branch `fase-103-medicao-de-produto` (a partir da `main` com a Fase 102). Sexta fase do plano da v0.1.0
(`secret/produto/rascunhos/plano-v0-1-0-cenario-a.md`). Pré-requisito da pauta estratégica (temas 3 e 7, "medição de produto"): retorno
D1/D7/D30, quanto de quem faz a Daily também entrega o projeto, semana de desistência e tipo de aparelho por tela. Tela no Figma
"Focadu — Painel de gestão, Fase 97" (`Uvy09SJEA9phpWZWRzj2ol`), página "Retenção — Fase 103" (`14:444`, quadros R01–R07), desenhada pelo
agente `figma-designer` e **aprovada pelo dono em 15/10/2026**.

## O que foi implementado

- **Registro de tela e aparelho** (`ScreenVisit`, tabela `ScreenVisits`, migration `Fase103MedicaoDeProduto`): no máximo uma linha por aluno,
  dia (local, `IClock`), tela e aparelho (índice único). `POST /api/visits { screen }` (com sessão) grava com `INSERT ... ON CONFLICT DO NOTHING`;
  o aparelho sai do User-Agent resumido no servidor (`DeviceClassifier`: computador, celular ou tablet) e o User-Agent cru nunca é guardado.
  Tela fora da lista (`ScreenVisit.KnownScreens`) vira `outra`: nada de texto livre do navegador.
- **Front**: `ScreenVisitTracker` (montado no `<ProtectedRoute/>`, só depois de e-mail confirmado e termos aceitos) avisa a cada troca de tela;
  a chave é `screenVisitKey` (`lib/screenVisits.ts`), a mesma do guia das telas (`guideScreenFor`) com `hoje` (escolha do dia) separado de
  `sessao` (Daily aberta). Uma chamada por tela por dia por aba do navegador; erro é engolido (a medição nunca atrapalha o aluno).
- **Aba Retenção** (`/gestao/retencao`, última aba, `GET /api/admin/retention?courseId=`), calculada na leitura (`AdminRetentionUseCase` +
  `RetentionCalculator`, sem tarefa agendada). Admins e contas desativadas ficam fora de tudo:
  - **Retorno por coorte**: coorte = semana do cadastro (seg. a dom.); D1/D7/D30 em "n de N · %", com alternância "Abriu o app" × "Fez uma
    Daily"; linha Total; "—" com dica (hover/foco) quando ninguém da coorte completou o prazo.
  - **Daily → Projeto Semanal** (curso do seletor): por semana com projeto já alcançada, quem fez ao menos 1 Daily e, desses, quem entregou
    (enviado ou avaliado). Curso sem projeto (Linux) mostra a caixa "não tem Projeto Semanal".
  - **Onde param** (curso do seletor): parados (sem abrir o app há 7 dias ou mais) por última semana com Daily, "Antes da 1ª Daily" e ativos.
  - **Aparelho por tela** (plataforma toda, 30 dias, alunos-dia): Computador/Celular/Tablet; tela com uso em celular ou tablet ganha destaque
    âmbar ("candidata a ajuste de layout", insumo da Fase 104).
- Guia das telas: item "Retenção" no Painel de gestão (`guiaTelas.ts`).

## Decisões técnicas tomadas que não estavam no prompt original

- **"Voltou" = abriu o app** (decisão do dono), com "concluiu uma Daily" como segunda leitura. "Abrir o app" junta as visitas de tela e os dias de
  Daily concluída, para quem se cadastrou antes desta fase (sem visita registrada) não aparecer como quem nunca voltou.
- **Retenção contínua** (dono): D7 = voltou no 7º dia depois do cadastro **ou depois**, mais estável com ~5 pessoas.
- **Célula por aluno elegível** (dono): o número conta só quem já tem N dias de cadastro ("1 de 2"); "—" só quando ninguém da coorte chegou lá. O
  desenho propunha esperar a coorte inteira; ficou o texto da nota da tabela ajustado a isso.
- **Total mantido** e **semanas zeradas em "Onde param"** (dono), da Semana 1 até a última que alguém do curso alcançou.
- **Destaque de aparelho olha celular ou tablet** (dono).
- **Configurações fora da tabela de aparelho**: é uma janela sobre a tela, não uma rota; o desenho a listava. A tabela segue a ordem do Figma e
  mostra zeradas as telas da lista base; Semana, Certificações, Início, Boas-vindas e Gestão aparecem só com uso.
- **Tablet**: iPad com iPadOS 13+ se apresenta como Mac e conta como computador (heurística sem biblioteca, suficiente para a leva).
- **Curso padrão do seletor**: o que tem mais alunos matriculados.
- **Privacidade**: o texto da Fase 102 já lista "aparelho/navegador resumido ... medir o produto" (legítimo interesse) e a fase não cria cookie nem
  armazenamento no navegador; a pendência "reconferir após a Fase 103" fica resolvida sem mudar o texto nem a versão.

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/ProductMetrics/{ScreenVisit,DeviceClass,DeviceClassifier}.cs
backend/src/Focadu.Domain/Repositories/IScreenVisitRepository.cs
backend/src/Focadu.Application/ProductMetrics/RecordScreenVisitUseCase.cs
backend/src/Focadu.Application/Admin/{RetentionUseCase,RetentionDtos}.cs
backend/src/Focadu.Infrastructure/Persistence/{Repositories/ScreenVisitRepository,Configurations/ScreenVisitConfiguration}.cs
backend/src/Focadu.Infrastructure/Migrations/*_Fase103MedicaoDeProduto*.cs
backend/src/Focadu.Api/Contracts/ProductMetricsRequests.cs
backend/tests/Focadu.Tests/Admin/RetentionTests.cs
frontend/src/{lib/screenVisits.ts, components/ScreenVisitTracker.tsx, components/admin/RetentionTab.tsx}
docs/fase-103/
```

## Testes

`dotnet test` (sem os 3 testes que exigem o repo `focadu-secret`): 750 aprovados, 1 falha, 20 novos em `RetentionTests` (aparelho, tela,
coortes, total, Daily → Projeto, desistência, aparelho por tela). A falha (`RealLinuxBridges_RunTheTerminalAsAgente`, D6 do Linux) lê o `secret/`
local, que estava desatualizado nesta máquina (o `git fetch` do `focadu-secret` travou); não tem relação com a fase. `npx tsc -b`, `npm run lint`
(só os 2 avisos de sempre) e `npm run build` passam.

Ao vivo contra o Postgres local: migration aplicada; 4 chamadas de `sessao` pelo celular gravaram 1 linha, tela inválida virou `outra`, celular e
computador ficam em linhas separadas; `GET /api/admin/retention` respondeu com coortes, total e desistência, e com admin fora das contas.
**Não verificado no navegador** (sessão sem navegador): layout da aba, a dica do "—", o registro de tela a partir do app e a classificação de
aparelho num celular de verdade.

## Dúvidas ou pontos abertos para a próxima fase

- Fase 104 (Daily no celular): a tabela "Aparelho por tela" só enche depois do deploy; com a leva no ar, ela aponta as telas a corrigir.
- Notebook (1280×720): não houve quadro para essa altura; os painéis de baixo rolam por dentro.
- Atualizar o `secret/` local (`git pull` no `focadu-secret`) e rodar os 3 testes que dependem dele.
