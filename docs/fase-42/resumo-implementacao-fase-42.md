# Resumo — Fase 42: Correção de Nota Injusta no Resumo Falado

## O que foi implementado

Bug real relatado ao vivo pelo Falves: um Resumo Falado sobre criptografia simétrica/assimétrica e
o handshake híbrido do HTTPS, respondido corretamente, tirou nota 45. O transcript gravado mostrava
que a IA não corrigiu uma troca de transcrição do Whisper ("simétrica" virou "assimétrica" numa
única frase, no fim de uma resposta consistente e correta em tudo o mais) e penalizou como se fosse
erro conceitual - exatamente o que a correção da Fase 39 deveria ter evitado.

Investigação (reproduzida ao vivo contra a API real da Groq, replicando a chamada exata gravada no
banco, fora do fluxo normal da aplicação) confirmou dois bugs distintos e empilhados na mesma
avaliação:

1. **Correção de transcrição não é confiável quando é a mesma chamada que calcula a nota.** Testado
   3 variantes de instrução de correção mais explícita dentro do prompt combinado da Fase 39 - a
   nota melhorou um pouco (45 → 58-70) mas o modelo continuou sem corrigir o termo, porque ele é
   tecnicamente uma palavra válida (não "ruído" óbvio) e o modelo é cauteloso demais pra tocar
   nisso enquanto também pondera a nota. Testado uma chamada dedicada só à correção (sem calcular
   nota junto) - corrigiu certinho, 2 vezes seguidas: `"Substituiu 'criptografia assimétrica' por
   'criptografia simétrica' na última frase, mantendo consistência com a explicação híbrida."`
2. **A nota também penalizava por completude contra o conteúdo de referência inteiro, não contra o
   que a atividade de fato pediu.** Mesmo depois de corrigir a transcrição, a nota travou em 70 -
   a IA descontou por "faltou mencionar o papel das autoridades certificadoras", um subtópico do
   `BodyText` completo do dia que a `Instrução` da atividade (`Prompt`) nunca pediu.

Fix implementado em `GroqContentEvaluationService`:

- `EvaluateAsync` agora faz **2 chamadas Groq sequenciais** em vez de 1: `CorrectTranscriptAsync`
  (prompt dedicado só a identificar/corrigir troca de termos técnicos antônimos e foneticamente
  parecidos - ex. simétrica/assimétrica, público/privado, criptografado/descriptografado - quando
  isolada e contradiz o resto de uma resposta coerente) e depois `GradeAsync` (prompt dedicado só à
  nota, recebendo a transcrição já corrigida). Reverte a decisão de custo da Fase 39 ("1 chamada,
  não 2") - custo extra é desprezível pro volume de uso da Focadu.
- Correção é best-effort: se a IA não devolver JSON válido nem depois do orçamento de retry do
  `HttpRetry`, `CorrectTranscriptAsync` cai pra transcrição bruta em vez de falhar a submissão
  inteira (mesmo espírito da Fase 39 - correção nunca pode ser motivo de erro sozinho).
- `BuildGradingUserPrompt`: quando há `ContextText` (Instrução) separado do `ExpectedAnswer`
  (conteúdo curado inteiro), a instrução de completude agora mira "o que a instrução pediu", não "a
  referência" - a referência continua servindo só pra checar se o que foi dito está correto. Sem
  `ContextText` separado (quando `BodyText` está ausente e `ExpectedAnswer` já é o próprio
  `Prompt`), comportamento não muda.
- `ContentEvaluationResult.CorrectedTranscript` deixou de ser opcional/nulo na prática - sempre
  volta preenchido (igual à transcrição original quando nada precisava de correção).

## Decisões técnicas tomadas que não estavam no prompt original

- Reverter "1 chamada, não 2" da Fase 39 não foi uma decisão leve - foi validada empiricamente
  antes de implementar: repliquei a chamada real (mesmo `ExpectedAnswer`/`ContextText`/transcript
  gravados no Postgres local) direto contra a API da Groq, fora da aplicação, pra comparar
  variantes de prompt sem gastar ciclos de implementação em algo que não funcionava. Só depois de
  confirmar que a chamada dedicada de correção resolve de forma consistente (2/2 execuções) é que
  mudei o código de produção.
- Falha da chamada de correção (JSON malformado mesmo após retry) cai pra transcrição bruta em vez
  de propagar `avaliacao_ia_formato_invalido` - decisão de manter o espírito "correção é aditiva,
  nunca bloqueia" já estabelecido na Fase 39, agora que é uma chamada separada com sua própria
  chance de falhar independente da nota.
- Falha de transporte (timeout, HTTP 5xx/429 esgotado) na chamada de correção **não** cai pra
  transcrição bruta - propaga pro catch de `EvaluateAsync` como antes, porque nesse caso a Groq
  está indisponível e a chamada de nota logo em seguida falharia do mesmo jeito; não faz sentido
  mascarar isso como "nada pra corrigir" e deixar a nota tentar (e falhar) sozinha.
- Nenhuma mudança em `IContentEvaluationService`/`ContentEvaluationRequest`/`ActivityResponse` -
  o fix é inteiro dentro do adapter Groq, sem tocar no port nem no domínio.

## Estrutura de arquivos criada

Nenhum arquivo novo fora de docs - só edição de arquivo existente:

```
backend/src/Focadu.Infrastructure/Services/GroqContentEvaluationService.cs  (reescrito)
docs/fase-42/
└── resumo-implementacao-fase-42.md
```

## Testes

- `dotnet build` (solução inteira) e `dotnet test tests/Focadu.Tests` - 359/359 passando, sem
  regressão (mesmo gap já documentado: sem teste automatizado dedicado pra este fluxo, depende de
  chave Groq real, verificação sempre foi ao vivo).
- Verificação ao vivo contra a API real da Groq, **fora da aplicação** (via `docker exec` no
  container do backend, reaproveitando `Groq__ApiKey` já configurada, pra nunca expor a chave):
  - Reproduzida a chamada original (prompt da Fase 39) com o transcript real gravado no banco -
    nota 45-58 em várias execuções, sempre penalizando a mesma frase (`"...tráfego usa criptografia
    simétrica, não assimétrica"`), confirmando o bug end-to-end antes de qualquer mudança.
  - Chamada de correção dedicada (novo prompt) - corrigiu a palavra certa, 2/2 execuções.
  - Chamada de nota dedicada sobre o transcript já corrigido - nota 70, com feedback focado em
    lacunas de conteúdo reais (não mencionou Autoridades Certificadoras, imprecisão sobre troca de
    chave pública) - foi esse resultado que expôs o 2º bug (completude contra a referência inteira)
    e motivou o fix do `BuildGradingUserPrompt`.
- Não foi possível re-testar a chamada de ponta a ponta já com o código novo publicado no container
  (`docker compose build backend` pediu `DB_PASSWORD`/`JWT_SECRET_KEY` que não estão num `.env`
  neste checkout - a stack rodando localmente foi subida em outra sessão/máquina com essas
  variáveis já exportadas). A correção foi validada nos dois pedaços (correção isolada + nota
  isolada) com os prompts exatos que o código novo monta, então o comportamento esperado está
  confirmado, mas falta a confirmação end-to-end de produção.

## Dúvidas ou pontos abertos para a próxima fase

- Falta redeployar o backend (rebuild + restart do container `focadu-backend`) pra essa correção
  valer na prática - só o código-fonte foi alterado. Ver `docs/DOCKER.md`/CI de deploy (Fase 40).
- A resposta que gerou o bug (`ActivityResponse` `Id=9a13e2bb-3576-44f9-b3cc-441b40be2b6e`, Score
  45, `Passed=false`) **não foi corrigida manualmente no banco** - decisão de deixar o Falves
  re-tentar a atividade normalmente pelo app depois do redeploy, em vez de editar a nota direto no
  Postgres. `PenaltyPoints`/reforço da Daily não foram afetados por esse único fracasso (checado:
  `PenaltyPoints=1`, `ReinforcementTriggered=false`).
- Heurística de "termo antônimo isolado que contradiz o resto" é textual/qualitativa, não uma
  regra determinística - continua sujeita a falso-negativo (correção não confiante o suficiente
  pra mexer) ou, em teoria, falso-positivo (aluno que realmente tem a confusão só uma vez, de forma
  pontual, sem repetir o erro - caso raro e sem exemplo real observado ainda). Sem teste
  automatizado pra travar esse comportamento (mesmo gap de sempre, depende de chave real); se
  aparecer um novo caso ao vivo, é sinal de recalibrar o prompt de novo.
