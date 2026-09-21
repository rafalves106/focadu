# Resumo — Fase 47: Analogia personalizada mais realista (prompt do Groq)

## O que foi implementado

- Feedback real: as analogias do card "💡 PRA VOCÊ" (geradas por `GroqAnalogyGenerationService`,
  Fases 21/22) saíam forçadas. Pedido: gerar textos mais realistas, sem forçar contexto.
- Causa raiz confirmada ao vivo contra a API real do Groq (mesma `openai/gpt-oss-120b`, com os
  interesses "motos, carros JDM, Valorant, Counter-Strike"): o `SystemPrompt` mandava "conecte um
  interesse do aluno ao conceito central daquela seção", então o modelo inventava mecânica do
  hobby pra caber. Exemplos reais do prompt antigo: "No Valorant, o cliente e o servidor trocam
  mensagens de convite, confirmação e aceitação" (pro handshake TCP) e "Em Counter-Strike, antes de
  comprar uma arma você verifica se ela está na lista de banidos" (pro OCSP). Em uma das rodadas de
  teste o prompt antigo devolveu 4 itens pra 3 seções (o último era só `)`), o que `ParseAnalogies`
  rejeita.
- `GroqAnalogyGenerationService`:
  - **`SystemPrompt` reescrito**: a analogia precisa reproduzir o mecanismo real da seção elemento
    por elemento; o interesse do aluno só entra se isso for verdade ("na dúvida, NÃO use"); nos
    demais casos usa cenário universal do cotidiano (correio, portaria, chaves, cofres, trânsito,
    filas, listas telefônicas); no máximo 3 frases curtas (~50 palavras); tom sóbrio, sem humor nem
    comparações absurdas; um exemplo do que não fazer (handshake TCP explicado com a fila de uma
    partida de jogo) e do que fazer (ligação telefônica). O contrato de saída em JSON não mudou.
  - **Mensagem do aluno** (`BuildUserPrompt`): os interesses agora aparecem como opcionais e o
    pedido final manda preferir cenário universal, a menos que o interesse reproduza o mecanismo.
  - **`temperature` 0.8 → 0.4**.
- Documentação: `docs/ARQUITETURA.md` (cabeçalho, descrição do fluxo e parágrafo da Fase 47) e
  `CLAUDE.md` (Estado atual).

## Decisões técnicas tomadas que não estavam no prompt original

- O pedido foi "melhorar o prompt do Groq"; a `temperature` também foi reduzida (0.8 → 0.4) porque
  criatividade alta empurrava o modelo a forçar o interesse. Vale reverter só isso se as analogias
  ficarem monótonas.
- A personalização por interesse deixa de ser regra e vira exceção. É uma consequência direta de
  "sem forçar contexto", mas reduz de propósito o quanto o aluno vê o próprio hobby refletido.
- O exemplo negativo dentro do prompt usa "uma partida de um jogo" em vez de citar Valorant/CS:
  o prompt é compartilhado por todos os alunos, então não pode amarrar ao hobby de um usuário.
- Iteração em 4 versões antes de adotar. v1 (só regras) ainda forçava interesse e passava do limite
  de frases; v2 acrescentou o limite de ~50 palavras; v3 endureceu a regra 2 ("na dúvida, não use") e
  reduziu, mas não eliminou, o interesse forçado; v4 adicionou o exemplo negativo e o enquadramento
  "opcional" na mensagem do aluno, e foi a adotada. O texto do C# foi comparado caractere a
  caractere com o prompt v4 testado.
- Não foi criado teste automatizado: `Focadu.Tests` só cobre domínio puro e funções `internal
  static` da Application, sem fake de `HttpClient` (ver CLAUDE.md). A validação foi ao vivo.

## Estrutura de arquivos criada

Nenhum arquivo de código novo. Arquivos alterados:
```
backend/src/Focadu.Infrastructure/Services/GroqAnalogyGenerationService.cs  (SystemPrompt, BuildUserPrompt, temperature)
docs/ARQUITETURA.md                                                          (cabeçalho + seção de analogia)
docs/fase-47/resumo-implementacao-fase-47.md                                 (este arquivo)
CLAUDE.md                                                                    ("Estado atual")
```

## Testes

- `dotnet build`: 0 erros. `dotnet test`: 365 passando, 0 falhas.
- Teste A/B ao vivo (API real do Groq, `openai/gpt-oss-120b`, texto original dos dias 1 e 34,
  3 rodadas por condição, contagem manual): analogias citando interesse/tema de veículo caíram de
  2/9 → 0/9 (dia 1) e 5/10 → 1/10 (dia 34), sendo o 1 restante um cenário neutro (lista de
  veículos roubados pra explicar revogação). Sem interesses cadastrados, o prompt novo cai em
  cenário universal (agenda, portaria, caixa de loja). Quantidade de itens correta em todas as
  rodadas do prompt novo.
- Latência (4 rodadas cada, dia 34, 5 seções): prompt antigo média 12,8 s (máx. 30,8 s), prompt novo
  13,3 s (máx. 27,1 s), 0 falhas — equivalentes e abaixo do timeout de 60 s do cliente. Uma chamada
  do teste chegou a travar por 90 s (timeout do meu cliente de teste, não do backend); a latência do
  Groq é instável em geral, não específica do prompt.
- Amostra pequena (3 rodadas, 2 aulas, 1 conjunto de interesses): é evidência direcional, não
  garantia. O que vale acompanhar é a qualidade das analogias reais dos próximos alunos.

## Dúvidas ou pontos abertos para a próxima fase

- **Só vale pras analogias geradas dali pra frente.** O cache `PersonalizedAnalogy` (por usuário +
  leitura) nunca é reavaliado: quem já abriu uma leitura continua vendo a analogia antiga. Pra
  regenerar uma leitura, apagar a linha dela em `PersonalizedAnalogies` (as seções, owned em
  `PersonalizedAnalogySections`, vão junto). Não há endpoint pra isso.
- **Só entra em produção com o deploy do backend** (push na `main` dispara o CI/CD). Commit local
  feito; push pendente de confirmação.
- Se o resultado ainda parecer forçado na prática, a alavanca seguinte é desligar a personalização
  por interesse por completo (só cenário universal) — mudança de produto, decisão do Falves.
