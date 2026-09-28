# Resumo — Fase 80: Chat rápido com código formatado e ponte sem analogias

## O que foi implementado

Dois pedidos do dono logo depois da Fase 79, usando a ponte "code comigo":

- **Código formatado no chat rápido** ("Tira dúvidas" da sessão e do Projeto Semanal): bloco cercado
  (```` ```python ... ``` ````) vira um quadro monoespaçado (Fira Code) e crase simples vira código inline
  (`ChatMessageText`, mesmo `splitFences` da leitura). A bolha com bloco de código ocupa a largura toda da
  coluna, e a linha longa quebra mantendo a indentação (a coluna tem ~200px). O prompt do
  `GroqStudyAssistantService` deixou de proibir código: pede crase pra trecho curto e bloco com a linguagem
  quando tiver mais de uma linha, curto.
- **Ponte sem analogias** (nenhuma, nas pontes de todas as semanas): a leitura da ponte não gera mais o
  "Pra você" (`GetCuratedContentUseCase` + `IWeeklyTemplateRepository.IsBridgeContentAsync`: conteúdo usado
  por um `DailyTemplate` com `Language`), o feedback do resumo falado da ponte não recebe os interesses do
  perfil, e o chat rápido na ponte também não (`codeBridge` no `POST /api/study-assistant/ask`).
- **Chat na ponte não entrega o passo**: com `codeBridge`, a instrução do chat diz que sintaxe é livre,
  mas a solução do passo e o que filtrar ficam com o aluno (mesma regra da conferência dos passos).

## Decisões técnicas tomadas que não estavam no prompt original

- "Dia de ponte" no chat = Daily original com `DayNumber` múltiplo de 6 (a mesma regra que o guia das telas já
  usa); o front manda `codeBridge` a partir de um store externo (`setStudyAssistantCodeBridge`), igual ao
  contexto da tela. O backend nem lê o perfil nesse caso.
- Analogias já guardadas (`PersonalizedAnalogy`) de uma leitura de ponte são ignoradas: o corte acontece
  antes de olhar o cache.
- Código no chat quebra linha em vez de rolar de lado: rolagem horizontal numa coluna de 200px escondia o
  fim de quase toda linha.

## Estrutura de arquivos criada

```
frontend/src/components/assistant/ChatMessageText.tsx
backend/tests/Focadu.Tests/Infrastructure/GroqStudyAssistantPromptTests.cs
```

Alterados: `GetCuratedContentUseCase`, `IWeeklyTemplateRepository`/`WeeklyTemplateRepository`,
`SubmitVoiceSummaryResponseUseCase`, `AskStudyAssistantUseCase`, `IStudyAssistantService`,
`GroqStudyAssistantService`, `AssistantRequests`, `Program.cs`; no front `StudyAssistantPanel`,
`useStudyAssistantChat`, `studyAssistantContext`, `api/client.ts`, `SessionShell` e o mock do chat.

## Testes

- `dotnet test`: 568 passando (2 novos: a instrução da ponte entra no prompt do chat e sai fora dela, com a
  personalização mantida fora da ponte).
- `tsc -b`, `oxlint` sem aviso novo.
- Playwright no mock (`/__mock/reset?at=codigo&passo=3`): pergunta no "Tira dúvidas" da ponte volta com
  código inline e bloco `python` formatados, quebrando a linha dentro da coluna.

## Dúvidas ou pontos abertos para a próxima fase

- A formatação depende do modelo usar as crases; conferir nas primeiras respostas reais do Groq.
- O Projeto Semanal continua com personalização no chat (não é ponte) - se o dono quiser tirar lá também,
  é só mandar `codeBridge` (ou outra flag) daquela tela.
