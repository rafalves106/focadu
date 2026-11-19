# Resumo — Fase 113: ponte intercalada com editor fixo

Desenho: Figma `Redesign - Focadu` (`KZkoT5d33KsbBWEcQ0EBXj`), página "Ponte intercalada (17/11)" (`108:2`), aprovada pelo
dono em 18/11/2026; molde de tela **Foco dividido** em `docs/design/sistema.md` §5 (exceção na §7, quadros na §8, linha
"Code comigo (6º dia)"). Molde de conteúdo: `secret/processo/molde/ponte.md`, seção "Ponte intercalada". Pesquisa e decisões:
`secret/produto/rascunhos/ponte-intercalada-editor-fixo.md`.

Fora desta fase (é curadoria, vem pela skill `curar-conteudo`): curar de novo o `dia-6.json` da Web Security S1 no formato novo.

## Decisões de schema/domínio (perguntadas ao dono em 18/11/2026, todas na opção recomendada)

1. **Prever = regra da ponte.** Todo `Quiz` de um dia com `"formatoPonte": "intercalada"` é um Prever: errar não soma erro do
   dia, não vai pro reforço e fica fora da nota do dia. Nada novo no Quiz.
2. **`"refaz": true`** no `CodeStep`: o passo substitui o trecho da atividade de código anterior (`CodeStep` ou `Parsons`) em
   vez de acrescentar. É o que faz o Corrigir (o bloco com o erro troca o do Fazer, quadro `111:701`) e o Fazer do bloco 3
   (parte das linhas ordenadas e põe o `try` em volta, quadro `112:1338`).
3. **Ordenar (Parsons) como o CodeStep:** até 3 conferências; na 3ª errada a ordem certa aparece e o passo seguinte parte
   dela; não conta erro do dia nem entra na nota; nota 100 só com a ordem toda certa.
4. **Conferência no navegador (`codeCheck`):** depois de Rodar, o laboratório roda o script de novo com a troca
   (`troca[0]` → `troca[1]`) e compara com `saidaEsperada`; a saída da conferência vai junto pra IA.

## Schema do `dia-N.json` (campos novos, todos opcionais)

```json
{ "formatoPonte": "intercalada", "activities": [
  { "type": "CodeStep", "codeStarter": "print(\"endereço:\", ______)\n",
    "codeMarks": [{ "linha": 1, "tipo": "lacuna" }] },
  { "type": "CodeStep", "refaz": true, "codeStarter": "...\nprint(\"código de status:\", 200)\n",
    "codeMarks": [{ "linha": 4, "tipo": "erro" }],
    "codeCheck": { "troca": ["https://lab:8443/", "http://lab:8080/vazia"], "saidaEsperada": "..." } },
  { "type": "Parsons", "answerMode": "FreeText", "prompt": "...",
    "parsonsFixed": ["enderecos = [...]"], "parsonsLines": ["for endereco in enderecos:", "    print(...)"] },
  { "type": "CodeStep", "refaz": true }
]}
```

`codeMarks.linha` é relativa ao `codeStarter` (1 = 1ª linha dele). `parsonsLines` vem na ordem certa e com o recuo; o app
embaralha. Blocos e sub-passos **não** têm campo: saem da ordem (a 1ª `Reading` é a Abertura, cada `Reading` seguinte abre
um bloco, a última `VoiceSummary` é a voz final).

## Backend

- `ActivityType.Parsons = 9`; `ParsonsPuzzle` (domínio, `Activities/BridgeStep.cs`): linhas fixas + ordem certa, embaralhado
  estável por atividade e nunca já certo, `IsPermutation`, `Check` por posição, `Score` 100/0.
- `DailyActivity`: `CodeMarksJson`, `CodeCheckJson`, `ReplacesPreviousCode`, `ParsonsJson`; `ConfigureBridgeStep` (marca
  exige `codeStarter` e cai dentro dele; conferência com troca diferente e saída) e `ConfigureParsons`.
- `DailyTemplate.InterleavedBridge` + `SetBridgeFormat("intercalada")` (outro valor = `formato_ponte_invalido`);
  `IsPrediction(activity)`; `IsBridge` inclui a ponte intercalada.
- `Daily.CountsAsMistake` centraliza quem não conta erro do dia (CodeStep, Parsons, Prever) — vale pra `PenaltyPoints`,
  `GetFailedActivities` (reforço) e `CalculateScore`. `PriorCode` passa a contar o Parsons e os passos "refaz";
  `ReplacedCode` dá o trecho que um passo "refaz" substitui. `CodeStepProgress.CarriedCode` entrega a ordem certa do Parsons.
- Importador: `formatoPonte`, `codeMarks`, `codeCheck`, `refaz`, `parsonsFixed`/`parsonsLines`; `refaz` no 1º passo de código
  é `refaz_invalido`; campo de CodeStep em outro tipo é recusado.
- `POST .../responses` aceita `Parsons`: as linhas na ordem do aluno em `transcript` (uma por linha), `ordem_invalida` se não
  for uma permutação; `passo_concluido`/`passo_anterior_pendente` como no CodeStep.
- `POST .../responses/code`: `labRun.checkOutput`; `SubmitCodeStepResponseUseCase.WithCheck` junta a conferência (com a troca
  e a saída esperada) à evidência que vai pra IA, e o prompt do `GroqCodeStepEvaluationService` diz que o passo só passa se
  a conferência bater.
- DTO: `DailyStateDto.BridgeFormat` (`"intercalada"`) e `BridgePreview` (saída esperada do último CodeStep, a Prévia da
  Abertura — o molde manda mostrar a saída final antes do 1º passo); `DailyActivityDto.IsPrediction` e `Parsons`
  (`ParsonsDto`: linhas embaralhadas, `Solution` só quando acaba, `LastCheck` por posição, `PriorCode`); `CodeStepDto.Marks`,
  `Check`, `Replaces` (passo "refaz" sem código inicial próprio recebe o trecho substituído em `CodeStarter`).
- Migration `Fase113PonteIntercalada` (5 colunas com default; nada muda em dia já importado).
- `SyncBridgeDaysUseCase` **não mudou**: ele só troca as variantes antigas por linguagem (`ponte/<linguagem>.json`). O
  dia-6 no molde v1 entra pelo `importar` (troca por hash), que já aplica os campos novos.
- Testes: `Dailies/PonteIntercaladaTests.cs` (13: importador, regra do Prever, refaz, Parsons, DTO, conferência).

## Linter e schema (em `secret/`, não commitados por esta fase)

- `processo/molde/dia.schema.json`: `formatoPonte`, tipo `Parsons` (`prompt` + `parsonsLines` ≥ 3, `parsonsFixed`), e no
  `CodeStep` `codeMarks`, `codeCheck`, `refaz`.
- `processo/scripts/linter-dia/src/regras/ponte-intercalada.js` (chamado pela Estrutura quando o dia declara o formato):
  1 + 3 `Reading`, 3 `Quiz`, 4–5 `CodeStep`, 1 `Parsons`, 3 `VoiceSummary`, nada de Cloze/Ligar/Roleplay/vídeo; abertura
  até 120 palavras, explicação até 80 + exemplo até 3 linhas (limites novos em `limites.json`); Prever logo depois de cada
  explicação; bloco 1 com Fazer de lacuna e voz; bloco 2 com Fazer só com a estrutura, Corrigir (erro marcado, `codeCheck`,
  `refaz`) e voz; bloco 3 com Ordenar antes do Fazer sem `codeStarter` e sem voz; voz final com `final: true`; marca dentro do
  `codeStarter`; `refaz` só depois de outro passo de código; troca da conferência presente no script.
- Ponte intercalada não cobra o tamanho total do texto do dia (400–600) e o código do enunciado do Prever não conta palavra.
- `Parsons` fora da ponte intercalada reprova. A ponte antiga e a "code comigo" seguem as regras de antes (mesmo resultado do
  linter antes e depois na ponte da Web Security S1).
- Testes: `test/ponte-intercalada.test.js` (7). `npm test`: 36 passam.

## Front

- `SessionLayout` (molde **Foco dividido**, só na ponte intercalada fora do reforço; fim de sessão e avisos seguem no Foco):
  - a partir de `lg`: trilho de 64 à esquerda com os 4 itens, coluna do passo de 504 (fio `Curso · Semana · Code comigo ·
    Bloco · Sub-passo`, título, barra em 2 níveis, Fala, cartão com eyebrow + "Tentativas do passo" e o Primário) e coluna
    do código em FILL (editor + terminal de 292, 220 em tela baixa);
  - abaixo de `lg`: topo 56 (só no celular), abas fixas **Passo | Código**, barra de ferramentas embaixo; Fazer, Corrigir e
    Ordenar abrem na aba Código, o resto na aba Passo. Na aba Código a 1ª linha é a dica da Focada, senão a devolutiva da
    última tentativa, senão o pedido.
  - `BridgeCodeColumn` (portal): o passo de código e o Ordenar mandam editor e terminal pra coluna fixa; nas outras etapas a
    casca mostra `BridgeFileView` (arquivo só leitura, bloco atual em Passo, terminal com a última execução; na Abertura,
    arquivo vazio e a Prévia com `bridgePreview`).
- `components/bridge/`: `BridgeEditor` (Editor/Linha Normal/Passo/Lacuna/Erro × Código/Comentário, textarea transparente
  sobre as linhas desenhadas, blocos fechados recolhidos quando não cabe, quebra suave), `BridgeTerminal` (Comando/Saída/
  Erro/Conferência, rola por dentro), `BridgeStageBar` (Abertura, Bloco 1–3, Voz final + sub-passos; no celular 5
  segmentos e a legenda), `BridgeCodeStep` (Fazer/Corrigir: Enviar desabilitado até rodar o código do editor, com o
  motivo; tentativa errada continua no editor; dica; solução na última), `ParsonsActivity` (arrastar, ou selecionar e
  mover com ↑ ↓ / botões de 40; Certa/Errada só depois de conferir).
- `lib/`: `bridgeSteps.ts` (blocos, sub-passos, arquivo acumulado, linhas fechadas), `bridgeText.ts` (Falas e eyebrows dos
  quadros), `bridgeTerminal.ts` (store do terminal por Daily, conferência linha a linha com o "esperado: …"),
  `useBridgeRunner.ts`; `lab/bridgeRun.ts` (no Linux grava o arquivo e roda `lab.command`).
- Prever: enunciado com o exemplo em bloco de código; devolutiva sem "Nº erro do dia", sem aviso de reforço e com "Errar o
  Prever não conta como erro do dia". Voz da ponte usa o Sala/Gravador de voz (`Recorder`, novo `compact` = Tamanho
  Compacto abaixo de `lg`).
- `guiaTelas.ts`: itens "Code comigo" (editor fixo), "Prever", "Fazer e Corrigir" e "Ordenar linhas"; FAQ do laboratório
  (na ponte intercalada roda também no celular).

## Lab

`frontend/public/ponte/web-security/semana-1/lab_http.py`: `GET /vazia` responde 204 sem corpo (testado rodando o servidor:
`/vazia` 204 `b''`, `/` 200).

## Verificação

- `dotnet build backend/Focadu.slnx`; `dotnet test`: **937 passam**, incluindo `CuratedContentAllFilesTests`,
  `CuratedCourseImporterTests` e `CertificationCoverageFileTests` rodados localmente contra o `secret/` (98).
- `npx tsc -b`, `npm run lint` (só os 2 avisos antigos: `ScrollArea`, `TodayPage`) e `npm run build`.
- Linter: `npm test` em `secret/processo/scripts/linter-dia` (36).
- **Sem verificação visual**: nenhuma tela foi vista no navegador, e o laboratório (v86 + Python) não foi rodado pela tela.
  Pontos a conferir ao vivo: alinhamento do textarea sobre as linhas desenhadas (com quebra no celular), o recolher dos
  blocos fechados, arrastar no Ordenar, o terminal com a conferência, as abas no celular e o gravador Compacto.

## Pontos em aberto

- O schema exige 4 alternativas no Quiz; o quadro do Prever (`119:2978`, `114:2185`) mostra 3. Mantive 4 (regra de quiz).
- O quadro `112:1338` marca em vermelho as linhas que a Focada apontou e mostra "faltou aqui: …" no terminal. Isso depende
  da saída esperada, que só vai pro cliente quando o passo acaba; não foi implementado (a devolutiva da Focada diz o que
  faltou).
- A ponte intercalada sobe o laboratório também no celular (é o que os quadros aprovados mostram). Nos outros passos de
  código o celular continua com "Continue no computador". Vale medir memória/tempo num celular de verdade.
