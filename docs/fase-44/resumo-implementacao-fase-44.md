# Resumo — Fase 44: Flash de "tudo errado" em Ligar Palavras

## O que foi implementado

- Corrigido `WordMatchActivity.tsx` (`handleSubmit`): a ordem de duas atualizações de estado foi
  invertida. Antes, `setLastResponse(result.response)` (que vira `answered = true` e dispara a
  revelação do gabarito) era chamado logo após `submitActivityResponse`, e só depois vinha o
  refetch (`api.getDaily`) que atualiza `terms`/`definitions` com `correctDefinitionId`
  preenchido. Isso produzia 1 render intermediário com `answered = true` mas `terms` ainda com
  `correctDefinitionId: null` (valor escondido pelo backend antes de responder) - nesse render,
  `termVerdict` comparava a escolha do usuário contra `null` e classificava todo par como
  "errado", pintando tudo de vermelho por um instante antes do resultado real aparecer.
- Fix: o refetch (`api.getDaily` + `setTerms`/`setDefinitions`) agora acontece **antes** de
  `setLastResponse`. `answered` só vira `true` quando `terms` já tem o gabarito, então o primeiro
  (e único) render com o reveal já mostra o veredito correto - sem flash.

## Decisões técnicas tomadas que não estavam no prompt original

- Nenhuma decisão de design nova - é reordenação de 2 chamadas de `setState` já existentes,
  aproveitando que `setTerms`/`setDefinitions`/`setLastResponse`, chamadas em sequência síncrona
  sem `await` entre elas, são batchadas pelo React 19 (batching automático) num render só.

## Estrutura de arquivos criada

Nenhum arquivo novo - só edição de
`focadu/frontend/src/components/WordMatchActivity.tsx` (função `handleSubmit`).

## Testes

- Revisão manual do fluxo: com a nova ordem, o render em que `answered` passa a `true` já ocorre
  com `terms` atualizado (gabarito preenchido), então `termVerdict` nunca mais roda contra
  `correctDefinitionId: null` para uma resposta já enviada.
- Não foi possível rodar o frontend localmente nesta sessão para uma verificação visual ao vivo
  (dependências do projeto - `frontend/node_modules` - não estavam instaladas no ambiente desta
  sessão e a instalação não foi feita). Recomenda-se validar visualmente no navegador (`/rodar-
  projeto` ou equivalente) antes de considerar o bug fechado na prática, especialmente em conexão
  mais lenta (onde a janela do bug era mais perceptível).

## Dúvidas ou pontos abertos para a próxima fase

- `focadu-hml` (branch `develop`, homologação) tem o mesmo trecho de código com o mesmo bug -
  não foi corrigido nesta fase porque é um checkout/branch separado do mesmo repositório
  (`rafalves106/focadu`), e a forma como os dois branches costumam convergir (merge/cherry-pick)
  não estava clara nesta sessão. Vale aplicar o mesmo fix lá (ou mesclar de `main`) antes do
  próximo deploy de homologação dessa atividade.
