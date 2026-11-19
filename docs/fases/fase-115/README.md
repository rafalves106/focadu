# Fase 115 — Molde D2: sessão com 1 ideia, recuperação espaçada e sala com esforço

19/11/2026, branch `fase-115-molde-d2` (sai da `main` com a Fase 114).

## Por quê

Parecer sobre as notas do dono no wstg (7 sessões, 17 a 19/11/2026, banco de produção): Quiz, Cloze, Ligar e Roleplay
quase sempre 100 em 10 a 20 s (medem reconhecimento logo depois de ler); voz com média de 67 a 90 e o 4º bloco sempre 60;
reforço aberto 1 a 9 minutos depois da sessão; sala "curl em X.txt e leia a linha". Pesquisa (segmentação, testing
effect, recuperação espaçada, intercalação, productive failure, guias de CTF) e o molde novo em
`secret/processo/molde/molde-d2.md`. Decisões do dono: cap. 2 em 20 sessões, refazer as sessões já no ar, zerar o
progresso dele no wstg, fichas em modo automático, código antes do conteúdo, tela nova no Figma fica para depois.

## O que mudou

- **Reforço no dia seguinte** (só curso em sessões): `SessionRules.IsReinforcementOpen` / `OpenPendingReinforcement`;
  `Weekly.EvaluateDailyAccess` recusa o reforço de hoje (`reforco_abre_amanha`) e a sessão nova com reforço aberto
  pendente (`reforco_pendente`). "/hoje" abre no reforço aberto; `GetCourseDetailUseCase` e `CompleteDailyUseCase`
  escondem o reforço que ainda não abriu.
- **Aposta**: `DailyActivity.IsBet` (migration `Fase115ApostaMoldeD2`), dia.json `"aposta": true`, mesma regra do Prever.
- **Voz de recuperação**: VoiceSummary sem `ContentId` (importador exige `referenceAnswer`); o reforço de voz leva a
  `ReferenceAnswer`. Pergunta final com 2 ou 3 tópicos.
- **Front, só texto** (sem tela nova): recusas `reforco_pendente`/`reforco_abre_amanha`, aviso de reforço "abre amanhã"
  no curso em sessões, "Errar a aposta não conta", Início com o reforço como Destaque quando "/hoje" abre nele, guia
  das telas.
- **Curadoria (`secret/`)**: molde D2, schema (`D2`, `aposta`, `retomaSessao`), linter D2 (vozes de recuperação,
  aposta antes da leitura, 1/3 de prática intercalada, 2 blocos, 350–600 palavras), glossário nas 20 sessões, alvo
  novo (a Vitrine de verdade: loja, login com sessão, cupom, API, `robots.txt`, JS com rota antiga), documentos do
  projeto no desktop do Kali, `curar-sessoes-auto.sh --fichas-auto`. Molde D arquivado em
  `secret/processo/arquivo/conteudo-antigo/wstg-molde-d/`.

## Verificação

`dotnet test` 951/951 (testes novos de reforço no dia seguinte, aposta, voz sem conteúdo, 2 tópicos); front `tsc`, lint e
build; linter 40/40 (3 testes do D2); alvo novo testado com curl local (rotas, login, cupom, API, 401 do `/admin`).
**Sem verificação visual**: Início com o reforço como Destaque, textos novos das recusas e do aviso de reforço.

## Pendente

- Tela própria para "reforço abre amanhã" (Figma, adiado pelo dono).
- Semanas do cap. 4 no `curso.json` ficaram com os títulos antigos (os dias andaram 8 casas); rever na curadoria do cap. 4.
