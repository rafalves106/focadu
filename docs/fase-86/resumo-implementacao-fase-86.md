# Resumo — Fase 86: Laboratório de código (backend)

## O que foi implementado

Rascunho `secret/rascunhos/laboratorio-de-codigo-na-ponte.md` (decisões do dono em 30/09/2026), spike
(Pyodide + Scapy, Linux no v86 com Bash, JavaScript com shim) e desenho no Figma "Laboratório de código —
v2 (proposta)" (`193:9321`, **ainda sem aprovação do dono**, então o front não foi feito). Esta fase é só o
backend e a curadoria: o aluno escreve e roda o código dentro da Focada, e a saída que vai pra avaliação é a
do laboratório (nada de colar). Quem executa é o navegador do aluno; o servidor nunca roda código.

- **Configuração do laboratório por dia** (`DailyTemplate.Lab`, valor `LabConfig`): runtime (`python`,
  `javascript`, `bash`), imagem do Linux (`basico`/`servidor`), arquivos do ambiente (Ids de `CuratedContent`
  tipo `File`), pacotes, serviços iniciados no boot, arquivo de entrada, comando de exemplo e timeout.
  `LabConfig.Create` valida as regras da `CURADORIA.md` 5.2. Dia sem `lab` = sem laboratório: os dias já
  curados e o fluxo da Fase 79 (saída colada) seguem iguais.
- **Por passo**: `DailyActivity.CodeStarter` (código inicial do editor) e `LabDisabled` (`"lab": false` no
  JSON tira o passo do laboratório). `DailyTemplate.StepUsesLab` decide se o passo roda no laboratório.
- **Envio do passo** (`SubmitCodeStepResponseUseCase`): num passo com laboratório o `labRun` é obrigatório
  (`rodar_antes_de_enviar`) e o `output` colado é ignorado; `LabRunInput` leva a saída da última execução, o
  exit code e, no Linux, o histórico de comandos com a saída de cada um (máx. 50 comandos, 20 mil
  caracteres). `Justification` guarda a saída/histórico; `CodeStepEvaluationRequest.Lab` leva exit code e
  histórico pro prompt da IA. Passo sem laboratório segue exatamente como na Fase 79.
- **Dica da Focada** (`POST /api/dailies/{dailyId}/activities/{activityId}/code-hint`,
  `RequestCodeStepHintUseCase`, `ICodeStepHintService`/`GroqCodeStepHintService`): três blocos (o que está
  certo / onde errou / o que melhorar), **não é tentativa** (não cria `ActivityResponse`, não soma
  penalidade), limite de 3 por passo (`CodeStepProgress.MaxHints`), guardadas em `CodeStepHints`
  (`Daily.AddCodeStepHint`). Só em passo com laboratório, com o passo aberto e o anterior concluído.
- **DTO**: `DailyStateDto.Lab` (`LabConfigDto`) e, em `CodeStepDto`, `LabEnabled`, `CodeStarter`,
  `MaxHints` e `Hints` (as já dadas).
- **Importador** (`CuratedDayImporter`): lê o bloco `lab` do dia, `codeStarter` e `"lab": false` por passo;
  valida que `files` são `File` de `curatedContents` e que cada `service` é o título de um desses arquivos.
- **Sync no `seed`** (`SyncLabConfigUseCase`, todo deploy, idempotente): leva o `lab` aos dias que já estão
  no banco (Web Security e os cursos de `SeedCuratedCoursesUseCase.CourseSlugs`) por
  `CuratedDayImporter.ApplyLab`, **sem reimportar** (os Ids das atividades não mudam, ninguém perde
  progresso). Dia cujo arquivo tem problema é pulado e listado no log do seed; o deploy não cai.
- **Curadoria** (`secret/`): bloco `lab` gravado nos 4 dias de ponte já curados, verificador
  `secret/curadoria/scripts/lab/` (roda cada solução no runtime do laboratório) e `CURADORIA.md` seção 5.2.

## Decisões técnicas tomadas que não estavam no prompt original

- **`LabConfig` em coluna de texto JSON** (`DailyTemplates.LabConfig`) com `ValueComparer` que serializa, em
  vez de tabela própria ou coluna `jsonb`: é um valor imutável lido junto do template, sem consulta por
  dentro dele.
- **Arquivos do lab por `ContentId`**, não por nome: o cliente casa com o "Material de hoje" que já recebe.
  As variantes Python/JavaScript da ponte têm um `File` cada (mesmo `externalUrl`), então `ApplyLab` resolve
  primeiro entre os conteúdos que as atividades **do próprio dia** usam. O primeiro `seed` de verdade
  apontou o lab do JavaScript para o arquivo do Python antes dessa correção (teste de regressão incluído).
- **O servidor não verifica a saída do laboratório** (decisão 10 do rascunho: adulteração ignorada). Só exige
  que exista um `labRun`.
- **Dica não vaza a solução, em duas camadas.** Na 1ª verificação com a IA real a dica entregou
  `LOG="$1"` e `wc -l < "$LOG"`. O prompt ficou mais rígido (sem código nem entre aspas; exemplo de bom e
  mau) e o adapter confere a resposta: bloco com 2 ou mais tokens "de código" da solução de referência
  (`-l`, `$LOG`, `LOG="$1`...) conta como vazamento, a IA é chamada de novo uma vez com um lembrete e, se
  vazar outra vez, só aquele bloco é trocado por um texto seguro. Comparar palavras soltas dava falso
  positivo ("IPs distintos" está no `echo` da solução), por isso só tokens com símbolo.
- **Limite de dicas por Daily, não por tentativa**: numa Daily já concluída (replay) o passo pode ser refeito,
  mas as 3 dicas já gastas continuam gastas. `ResetAfterTemplateRefresh` zera as dicas junto com as respostas.
- `command` no bloco `lab` (não estava nas decisões): o verificador da curadoria precisa dele e a dica da
  Focada pode usar. `LabConfig.Create` exige que o comando rode o `entry`. Marcado na `CURADORIA.md` como a
  confirmar com o dono.

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/Dailies/LabConfig.cs
backend/src/Focadu.Domain/Activities/CodeStepHint.cs
backend/src/Focadu.Application/Dailies/LabRunInput.cs
backend/src/Focadu.Application/Dailies/RequestCodeStepHintUseCase.cs
backend/src/Focadu.Application/Ports/ICodeStepHintService.cs
backend/src/Focadu.Application/Seed/SyncLabConfigUseCase.cs
backend/src/Focadu.Infrastructure/Services/GroqCodeStepHintService.cs
backend/src/Focadu.Infrastructure/Persistence/Configurations/CodeStepHintConfiguration.cs
backend/src/Focadu.Infrastructure/Migrations/20260930191152_LabCodeStep.cs
backend/tests/Focadu.Tests/Dailies/LabCodeStepTests.cs
backend/tests/Focadu.Tests/Seed/CuratedLabImporterTests.cs
backend/tests/Focadu.Tests/Infrastructure/GroqCodeStepHintTests.cs
```

Alterados: `DailyTemplate` (`Lab`, `SetLab`, `StepUsesLab`), `DailyActivity` (`CodeStarter`, `LabDisabled`,
`SetLabOptions`), `Daily` (`Hints`, `AddCodeStepHint`, reset), `CodeStepProgress.MaxHints`,
`SubmitCodeStepResponseUseCase`, `ICodeStepEvaluationService` (`CodeStepLabRun`), `Dtos`/`DailyStateMapper`,
`CuratedDayImporter` (`ApplyLab`), `GroqCodeStepEvaluationService` (saída do laboratório no prompt), as
configurações do EF, `WeeklyRepository` (include de `Hints`), `FocaduDbContext`, as duas
`DependencyInjection`, `Program.cs` (rota da dica, `labRun` no envio, `SyncLabConfigUseCase` no `seed`) e
`SubmitActivityResponseRequest.cs`. Migration `LabCodeStep`: `DailyTemplates.LabConfig` (text),
`DailyActivities.CodeStarter` (text) e `LabDisabled` (bool, padrão false), tabela `CodeStepHints`.

## Testes

- `dotnet test`: 651 passando no total, 39 deles novos desta fase (domínio do `LabConfig`, opt-out por passo,
  limite e regras das dicas, `LabRunInput`, mapper, importador, `ApplyLab` e prompts/parse/vazamento das
  duas chamadas de IA). O total inclui o teste que importa todos os `dia-N.json` reais de `secret/curadoria/`,
  agora com o bloco `lab`.
- **Postgres 16 descartável** (porta 55432, sem tocar no `focadu-postgres` nem nos contêineres da app): o
  `seed` de verdade importou Web Security e Linux com 4 dias com `lab` (o arquivo de cada um bate com o `File`
  dos passos dele); 2º `seed` atualizou 0; simulando um banco de antes da fase (`LabConfig = null` em tudo), o
  `seed` restaurou os 4 sem mudar nenhum Id de atividade. Com a API no ar e um aluno matriculado no Linux:
  estado do dia com `lab` e os campos novos dos 6 passos; envio sem `labRun` → `rodar_antes_de_enviar`; envio
  com `labRun` → avaliado pela IA real e gravado com o histórico do terminal; 3 dicas reais; 4ª →
  `dicas_esgotadas`; dica sem código → `codigo_obrigatorio`; dica em passo com anterior pendente →
  `passo_anterior_pendente`; sem sessão → 401.
- **Verificador da curadoria** (`secret/curadoria/scripts/lab/verificar.mjs`): Python 6/6, Linux Dia 6 6/6 e
  Linux Dia 12 6/6 no runtime do laboratório (Pyodide em Node e Linux no v86); o de JavaScript ainda não existe.

## Dúvidas ou pontos abertos para a próxima fase

- **Figma sem aprovação**: o front do laboratório (editor, terminal, runtimes no navegador, origem própria em
  iframe, tela de dica, celular) só começa depois do aval do dono. O contrato HTTP desta fase já está pronto
  pra ele (`labRun` no envio, `code-hint`, `lab`/`CodeStepDto` no estado do dia).
- **Dica vs. avaliação**: só a dica tem a rede de segurança contra vazamento da solução. A fala de "ajuste
  isto" da avaliação (`GroqCodeStepEvaluationService`) não passou pela mesma checagem; na verificação real ela
  veio conceitual, mas vale acompanhar as primeiras avaliações de verdade.
- **Verificador de JavaScript** e **Safari/Firefox/notebook fraco** ficaram de fora do spike.
- **`command` a confirmar com o dono** (campo novo do bloco `lab`).
- **Cursos que ainda não têm dia com `lab`**: Python pra Web Security (exercício por dia, decisão 9) depende de
  curadoria nova; as pontes da Semana 2 em diante do Web Security ainda estão no formato antigo.
- **Push do `secret/`**: o deploy faz `reset --hard` em `secret/`; os commits da curadoria do laboratório só
  sobrevivem a um deploy depois de empurrados (não foram).
