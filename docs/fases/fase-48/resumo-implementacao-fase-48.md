# Resumo — Fase 48: Guarda de idioma nas analogias personalizadas

## O que foi implementado

- Bug real visto ao vivo logo depois do deploy da Fase 47: as 5 analogias que o app gerou pra leitura
  do dia 5 saíram em **inglês** ("Imagine a receptionist who only accepts packages addressed to
  him…"), embora o prompt peça português do Brasil. O comportamento já estava registrado na Fase
  38b (`openai/gpt-oss-120b` "ocasionalmente respondia em inglês"). Como `PersonalizedAnalogy` é
  gravado uma vez e nunca reavaliado, o inglês ficaria pra sempre naquela leitura. O cache do dia 5
  foi apagado à mão pra regenerar.
- `GroqAnalogyGenerationService.ParseAnalogies` (agora `internal`, testável): se qualquer analogia da
  resposta parecer inglês, lança `ExternalServiceException("analogias_ia_idioma_invalido")`. Nada é
  gravado, `GetCuratedContentUseCase` captura a exceção e a leitura abre sem analogias dessa vez; a
  próxima abertura tenta de novo. É o mesmo tratamento que o adapter já dava a JSON inválido e a
  quantidade errada de itens.
- `LooksEnglish` (`internal static`): conta palavras funcionais que só existem em inglês (the, and,
  is, are, of, to, with, that, which, from, when, where, only, every, each, any, into, its, like,
  just, not) e só dispara com **3 ou mais e mais do que** as palavras funcionais do português. Sem
  `a`, `as`, `in`, `on`, `it`, `an` (existem em português ou aparecem em termos técnicos), então
  "man-in-the-middle" e nomes como hub/switch/libpcap não geram falso positivo.
- Reforço no fim da mensagem do aluno (`BuildUserPrompt`): "Escreva todas as analogias em português
  do Brasil." Este reforço **não foi medido** (a taxa de troca de idioma é baixa demais pra medir
  com poucas chamadas); a garantia real é a guarda.
- Documentação: `docs/ARQUITETURA.md` (cabeçalho + parágrafo da Fase 48) e `CLAUDE.md`.

## Decisões técnicas tomadas que não estavam no prompt original

- Guarda no adapter e não no caso de uso: é onde já vivem os outros erros de formato, e a
  `Infrastructure` já expõe os `internal` aos testes (`InternalsVisibleTo`).
- Heurística por palavras funcionais em vez de biblioteca de detecção de idioma: sem dependência nova
  pra um caso raro, e o custo de errar é baixo (o pior caso é a leitura abrir sem analogias uma vez).
- Sem retry automático dentro do serviço: uma segunda chamada custaria ~3.000 tokens do limite
  gratuito de 8.000/min do Groq (ver Fase 47), e a rejeição já degrada bem.

## Estrutura de arquivos criada

```
backend/src/Focadu.Infrastructure/Services/GroqAnalogyGenerationService.cs        (LooksEnglish, guarda em ParseAnalogies, reforço na mensagem)
backend/tests/Focadu.Tests/Infrastructure/GroqAnalogyLanguageGuardTests.cs        (novo, 6 testes)
docs/ARQUITETURA.md                                                                (cabeçalho + seção de analogia)
docs/fase-48/resumo-implementacao-fase-48.md                                       (este arquivo)
CLAUDE.md                                                                          ("Estado atual")
```

## Testes

- `dotnet build`: 0 erros. `dotnet test`: 371 passando (365 anteriores + 6 novos), 0 falhas.
- Os 6 testes usam como casos positivos **as respostas reais em inglês que a produção gerou** pro
  dia 5, e como negativos português com termos técnicos em inglês ("man-in-the-middle", hub/switch,
  libpcap) e diálogo entre aspas.
- Falso positivo medido contra texto real: 0 de 14 analogias em português já em cache (dias 1–4).
- A taxa real de respostas em inglês é desconhecida: 1 ocorrência em produção contra 0 em ~25
  respostas de teste com o prompt novo.

## Dúvidas ou pontos abertos para a próxima fase

- **Só entra em produção com o deploy do backend** (push na `main`, que reinicia o backend por
  alguns segundos). Commit local feito; push pendente de confirmação.
- Enquanto o deploy não sai, uma resposta em inglês ainda pode ser gravada; nesse caso, apagar a linha
  daquela leitura em `PersonalizedAnalogies` regenera.
- Os caches dos dias 1–4 têm analogias do prompt antigo (as forçadas, tipo "Na academia…"). Pra
  regenerá-las com o prompt novo, apagar essas 4 linhas de `PersonalizedAnalogies`.
- O prompt novo pesa ~15% mais tokens por pedido, e o limite gratuito é 8.000 tokens/min: abrir
  várias leituras seguidas pode fazer alguma abrir sem analogia (retentativa na próxima abertura).
