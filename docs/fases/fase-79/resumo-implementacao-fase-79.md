# Resumo — Fase 79: Ponte "code comigo"

## O que foi implementado

Rascunho `secret/rascunhos/ponte-code-comigo.md` (decisões do dono em 27 e 28/09/2026, dor dele como aluno
no Dia 6: ler código numa linguagem que não usa não prepara pra escrever) e desenho aprovado no Figma "Ponte:
code comigo — v2 (proposta)" (01 escrevendo `171:4503`, 02 ajuste isto `172:5517`, 03 passou `172:6556`,
04 solução `172:7595`, 05 concluída `173:8140`, notas `173:124687`).

- **A ponte da Semana 1 virou "code comigo"**: exemplo explicado (leitura) → 6 passos de código → resumo
  falado. A entrega é o **Auditor Relâmpago**, parecida com o Sniffer CLI mas sem nenhum `TODO` dele: contar
  pacotes, separar TCP/UDP/outros, listar os domínios do DNS, achar a varredura de portas, achar a senha em
  texto claro (sem imprimir a senha) e fechar o relatório com quanto do tráfego web estava cifrado. Roda
  contra um `ponte.pcap` fixo (54 pacotes, achados plantados), em Python (Scapy) e JavaScript (pcap-parser +
  offsets), com a mesma saída nas duas.
- **Passo de código** (`ActivityType.CodeStep`): o aluno manda o trecho do passo + a saída do terminal; a IA
  (`GroqCodeStepEvaluationService`) cobra o conceito da rubrica olhando os dois, dá dica sem a linha pronta,
  e sintaxe é ajuda livre. Ajustar **não é erro da sessão** (não soma penalidade nem gera reforço) e não vale
  nota; na **3ª tentativa** a solução aparece e o passo seguinte parte dela. O servidor monta o script dos
  passos anteriores (`Daily.PriorCode`).
- **Repositório opcional** no fim do dia (GitHub ou Forgejo, `Daily.CodeRepositoryUrl`,
  `PUT /api/dailies/{id}/code-repository`), com "Ver meu código"/"Copiar".
- **Troca da ponte já no banco** no próximo `seed` (`SyncBridgeDaysUseCase` → `RefreshBridge`): a ponte
  antiga da Semana 1 (Python e JavaScript) é reimportada no mesmo `DailyTemplate`; quem ainda não concluiu o
  Dia 6 recomeça na versão nova, sem respostas nem penalidade.
- **Front**: `CodeStepActivity` (editor com o script anterior dobrado, rascunho local, Ctrl+Enter),
  `AttemptsGauge` no lugar do conta-giros durante os passos, cada passo um nó da cadeia ("Exemplo", "Passo
  N"), "Arquivo da ponte" com "Baixar ↓" no material, conclusão da ponte com passos/soluções vistas,
  repositório e "Ir pro projeto". Apresentação da Focada, guia das telas e mock (`/__mock/reset?at=codigo`).
- Sem analogias no Dia 6 (não há leitura com "Pra você" pra personalizar além do exemplo) e Gems iguais a
  qualquer dia (1 ao concluir).

## Decisões técnicas tomadas que não estavam no prompt original

- **Sem executar código no servidor**: o aluno roda na máquina dele e cola a saída; como o arquivo do dia é
  fixo, a saída certa é conhecida e a IA confere código + saída. Sandbox ficou fora (custo e risco).
- **O script anterior vem do servidor**, nunca do cliente: cada passo "entrega" a tentativa aprovada ou a
  solução, e o passo seguinte só abre quando o anterior acabou (`passo_anterior_pendente`).
- **Reaproveita `ActivityResponse`** em vez de tabela nova: `Transcript` = código, `Justification` = saída
  colada, `AiFeedback` = fala da Focada, Score 100/0 (fora da nota do dia).
- **Passo não agrupa na cadeia** (cada passo é um nó) e a apresentação da Focada fala dos 6 passos de uma vez.
- **Arquivo pra baixar como `CuratedContentType.File`**, ligado aos passos por `ContentId`, servido pelo
  próprio frontend (`frontend/public/ponte/...`) - o `ponte.pcap` não é segredo e a imagem do frontend já
  publica `public/`. O gerador fica na curadoria (`secret/curadoria/scripts/ponte/semana-1/`).
- **Troca da ponte por detecção**, não por versão: variante sem `CodeStep` cujo arquivo já tem `CodeStep` é
  reimportada. As pontes das outras semanas (formato antigo) seguem funcionando e serão trocadas do mesmo
  jeito quando forem refeitas. Dailies já concluídas da ponte antiga ficam fechadas; as respostas delas só
  deixam de aparecer (sem FK de `ActivityResponses.ActivityId`).
- Link do repositório aceita qualquer endereço http(s) absoluto (o aluno escolhe GitHub ou o Forgejo), só
  depois de concluir o dia.
- Figma: o quadro de cima da tela 05 ganhou 6 quadradinhos (eram 3 pra "6/6"); na implementação, a conclusão
  mantém o conta-giros de erros (o resumo falado ainda conta erro) e o editor mostra "Seu código · Python" em
  vez do nome do arquivo (o nome sai da leitura de cada semana).

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/Activities/CodeStepProgress.cs
backend/src/Focadu.Application/Ports/ICodeStepEvaluationService.cs
backend/src/Focadu.Application/Dailies/SubmitCodeStepResponseUseCase.cs
backend/src/Focadu.Application/Dailies/LinkDailyCodeRepositoryUseCase.cs
backend/src/Focadu.Infrastructure/Services/GroqCodeStepEvaluationService.cs
backend/src/Focadu.Infrastructure/Migrations/20260928003645_CodeStepBridge.cs
backend/tests/Focadu.Tests/Dailies/CodeStepTests.cs
backend/tests/Focadu.Tests/Infrastructure/GroqCodeStepEvaluationTests.cs
frontend/src/components/CodeStepActivity.tsx
frontend/src/components/session/AttemptsGauge.tsx
frontend/public/ponte/web-security/semana-1/ponte.pcap
```

Alterados: `ActivityType`, `CuratedContentType`, `DailyActivity`, `Daily`, `DailyTemplate`, `WeeklyTemplate`,
`SubmitActivityResponseUseCase`, `DailyStateMapper`/`Dtos`, `CuratedDayImporter`,
`SeedWebSecurityCourseUseCase`, `SyncBridgeDaysUseCase`, `CourseRepository`, configurações do EF, as duas
`DependencyInjection`, `Program.cs` e contratos; testes de importador e da curadoria em disco. No front:
`api/types.ts`, `api/client.ts`, `TodayPage`, `SessionShell`, `MaterialSidebar`, `CompletionSummary`,
`StageChain`, `BlockIntro`, `lib/sessionSteps.ts`, `lib/focadaSessionLines.ts`, `lib/guiaTelas.ts`,
`DailyMissionCard` e `mock/sessionMock.ts`. No `focadu-secret`: `semana-1/ponte/{python,javascript}.json`,
`scripts/ponte/semana-1/`, `CURADORIA.md`, `MESTRE.md` e os rascunhos.

## Testes

- `dotnet test`: 566 passando (20 novos: regras do passo, `PriorCode`, sem penalidade/nota/reforço,
  mapeamento com solução escondida até o passo acabar, repositório, formato da resposta da IA, importação do
  `CodeStep`/`File` e a troca da ponte antiga pela nova a partir dos arquivos reais).
- **Soluções de referência rodadas de verdade**: cada passo acumulado, em Python (Scapy 2.6) e JavaScript
  (Node 22 + pcap-parser), com saídas idênticas nas duas; as saídas esperadas do JSON saem dessa execução, e
  o gerador do `ponte.pcap` é determinístico (mesmo md5 a cada execução).
- **Postgres 16 descartável** (programa com as peças reais, sem Forgejo): seed com a ponte antiga, matrícula,
  Dias 1-5 concluídos, linguagem escolhida e Dia 6 em andamento com 2 respostas e 1 de penalidade → `sync`
  trocou as 2 variantes e recomeçou a Daily (0 respostas, 0 penalidade, conteúdos antigos removidos); 2º
  `sync` não mexeu em nada. Com a IA falsa: 3 erros no passo 1 → solução, 4ª tentativa recusada, passo 2
  partindo da solução, penalidade 0, passos 2-6 aprovados, conclusão com 1 Gem, link `ftp://` recusado e
  `https://` gravado. A API subiu e as duas rotas novas responderam (401 sem sessão, 400/404/502 com sessão).
- `tsc -b`, `oxlint` (sem aviso novo), `npm run build`.
- Playwright + Chromium no mock: apresentação da Focada, passo 3 escrevendo, envio com os domínios em bytes →
  "ajuste isto" em âmbar, editar, script anterior aberto, reenvio certo → "passou", passo 6 com 3 erros →
  solução, conclusão com "Linkar" e "Ver meu código"; celular 390px sem rolagem lateral.

## Dúvidas ou pontos abertos para a próxima fase

- **A IA de verdade não foi chamada** (sem chave do Groq neste ambiente): conferir as primeiras avaliações
  reais do passo e ajustar o prompt (rigor, tom, se a dica não está entregando a linha).
- Refazer as pontes das Semanas 2 e 7 a 12 no formato novo (o deploy troca cada uma sozinho quando o arquivo
  ganhar `CodeStep`).
- Desenho próprio pro celular (escrever código no celular não é o caso de uso).
- Quem já tinha concluído a ponte antiga fica com o dia fechado sem as respostas antigas visíveis.
