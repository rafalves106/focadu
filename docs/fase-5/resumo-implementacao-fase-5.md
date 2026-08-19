# Resumo — Fase 5: Correção de Ambiguidade + Captura e Avaliação de Voz

## O que foi implementado

**Parte 1 — Ambiguidade em `GET /api/today`**

- `Weekly.GetDailyByDate(DateOnly date)` (novo método de domínio): resolve qual `Daily` está
  datada num dia, preferindo sempre a não-reforço quando houver mais de uma na mesma data
  (`OrderBy(IsReinforcement).ThenBy(DayNumber)` - determinístico, não depende da ordem natural do
  banco). `GetTodayUseCase` passou a usar esse método em vez de `weekly.Dailies.First(...)`.
- Acesso à Daily de reforço continua exclusivamente via `reinforcementDailyId` (retornado por
  `POST .../responses` e `POST .../complete` desde a Fase 4) - nunca por `/api/today`.

**Parte 2/4 — Transcrição e avaliação por voz (Groq)**

- `GroqAudioTranscriptionService` (`IAudioTranscriptionService`): `POST audio/transcriptions`
  (multipart/form-data), modelo `whisper-large-v3`.
- `GroqContentEvaluationService` (`IContentEvaluationService`): `POST chat/completions`, modelo
  `llama-3.3-70b-versatile`, JSON mode, 1 nota única (0-100, já ponderando conteúdo + clareza) +
  1 feedback curto em PT-BR - formato do prompt confirmado com o Falves antes de implementar (ver
  seção de decisões).
- `GroqOptions` (chave de API) e os dois `HttpClient` tipados registrados em
  `Focadu.Infrastructure.DependencyInjection`, com a base URL da Groq e timeout de 60s.
- Chave configurável via `Groq:ApiKey` (appsettings/user-secrets) ou env var `Groq__ApiKey` -
  nunca hardcoded. `UserSecretsId` adicionado a `Focadu.Api.csproj` - ver "Como configurar a
  chave da Groq" em `docs/ARQUITETURA.md`.

**Parte 3 — Domínio: `ActivityType.VoiceSummary`**

- Novo valor no enum (`= 4`). `DailyActivity` passou a exigir `ContentId` quando
  `Type == VoiceSummary` (`DomainException` na criação, senão). Não usa `QuizOption` nem
  `ExpectedAnswer` - a resposta é sempre `ActivityResponse.Transcript`, avaliada por IA.

**Parte 5 — Endpoint de áudio**

- `POST /api/dailies/{dailyId}/activities/{activityId}/responses/audio`
  (`SubmitVoiceSummaryResponseUseCase`): recebe `multipart/form-data`, transcreve, avalia contra
  o `CuratedContent.BodyText` referenciado pela atividade, calcula Score/Passed (nunca do
  cliente), grava a resposta e checa reforço - mesmo pipeline dos outros 4 tipos.
- `ActivityResponseRecorder` (novo, interno): extraído de `SubmitActivityResponseUseCase` pra
  compartilhar o passo "grava resposta + checa reforço diário/semanal + salva + mapeia DTO" com
  `SubmitVoiceSummaryResponseUseCase`, sem duplicar essa lógica.
- `ExternalServiceException` (nova, `Focadu.Application.Exceptions`): erros de serviço externo
  (Groq fora do ar, timeout, resposta malformada) - `StatusCode` explícito no construtor (502
  padrão, 503 pra timeout), mapeada em `ApiExceptionHandler`.
- Validação: `audio_obrigatorio`, `audio_muito_grande` (25MB), `tipo_atividade_invalido` (só
  aceita `VoiceSummary`), `conteudo_referencia_ausente` (`CuratedContent` sem `BodyText`).

**Parte 6 — Frontend: captura de voz**

- `VoiceSummaryActivity.tsx` (novo componente): grava via `MediaRecorder`, limite de 10min
  (parada automática + botão manual), ícone de microfone central com orbe/glow (verde
  parado/hover, vermelho pulsante gravando), contador MM:SS, estado de carregamento durante
  transcrição/avaliação, e o mesmo padrão visual de certo/errado das outras atividades ao final
  (transcrição + feedback + nota).
- Permissão de microfone negada: mensagem clara + botão continua disponível pra tentar de novo
  (bug encontrado e corrigido durante a verificação ao vivo - ver seção de decisões).
- `client.ts`: `submitVoiceSummaryResponse` (monta `FormData`); `request()` ajustado pra não forçar
  `Content-Type: application/json` quando o corpo é `FormData` (o navegador define o boundary do
  multipart sozinho).

**Parte 7 — Seed**

- `SeedWebSecurityCourseUseCase`: Dia 1 ganhou uma `DailyActivity` `VoiceSummary` referenciando o
  `CuratedContent` "Como a web funciona" (`ContentId`), pedindo pro aluno explicar com as próprias
  palavras o ciclo requisição-resposta e o papel do HTTP.

## Decisões técnicas tomadas que não estavam no prompt original

1. **Formato do prompt de avaliação e tratamento de resposta malformada, confirmados com o
   Falves antes de implementar** (a ambiguidade que o próprio prompt desta fase antecipava): 1
   chamada de chat completion, JSON mode, 1 nota única combinando conteúdo+clareza (não duas
   notas separadas combinadas por peso fixo), texto exato do prompt de sistema/usuário definido
   nessa conversa. Resposta malformada (JSON inválido, campos ausentes, score fora de 0-100) vira
   `ExternalServiceException` (502) - nunca uma nota inventada.
2. **`ActivityResponseRecorder` extraído como passo compartilhado.** O código de "grava resposta +
   checa reforço + salva + mapeia DTO" já existia em `SubmitActivityResponseUseCase` desde a Fase
   3/4; em vez de duplicá-lo em `SubmitVoiceSummaryResponseUseCase` (cujo cálculo de Score é
   assíncrono via IA, diferente do `ResolveScore` síncrono dos outros tipos), foi extraído pra uma
   classe interna compartilhada pelas duas.
3. **`GroqOptions` guardando a `ApiKey` separadamente do header do `HttpClient`.** Permite os
   adapters detectarem "chave não configurada" e falharem com uma mensagem clara
   (`groq_api_key_nao_configurada`, 502) em vez de deixar a Groq devolver um 401 genérico sem
   contexto. A ausência da chave não impede o app de subir (diferente da connection string) - só
   os dois adapters falham quando de fato chamados.
4. **`MaxAudioSizeBytes` = 25MB**, calibrado pra cobrir ~10min de gravação típica do navegador
   (webm/opus) com folga, e por coincidir com o próprio limite de upload da Groq pro endpoint de
   transcrição - documentado como `ponytail:` (teto calibrado, upgrade se o formato de gravação
   do frontend mudar).
5. **Bug de UX corrigido durante a verificação ao vivo**: a primeira versão do
   `VoiceSummaryActivity` escondia o botão de microfone inteiro no estado "permissão negada" -
   sem nenhum jeito de tentar de novo sem recarregar a página. Corrigido pra manter o botão
   visível (com o rótulo "Toque pra tentar de novo") em qualquer estado que não seja
   "enviando"/"respondido".
6. **Bug de infraestrutura pré-existente corrigido durante a verificação ao vivo, fora do escopo
   original do prompt**: um corpo de requisição ausente ou malformado (`multipart/form-data` sem
   arquivo, JSON inválido) fazia o model binding do ASP.NET Core lançar
   `BadHttpRequestException` *antes* do endpoint rodar - exceção não reconhecida por
   `ApiExceptionHandler`, caindo no 500 genérico em vez de um 400 claro. Corrigido com um caso
   novo no `switch` central (`requisicao_invalida`, 400) - conserta o endpoint de áudio novo *e*
   fecha um ponto em aberto documentado desde a Fase 2 ("JSON malformado no corpo do request pode
   não usar o envelope de erro padrão").
7. **Validação de tamanho do áudio dentro do caso de uso, não em `Program.cs`.** Diferente de
   checagens de forma pura (`weekly_id_obrigatorio` etc.), o limite de 25MB é uma regra de
   negócio (evitar chamadas caras/lentas à Groq) - faz mais sentido como fonte única de verdade
   no caso de uso, testável e reaproveitável por qualquer chamador futuro.

## Estrutura de arquivos criada

```
backend/src/Focadu.Domain/
  Enums/ActivityType.cs                 (alterado: + VoiceSummary)
  Activities/DailyActivity.cs           (alterado: exige ContentId pra VoiceSummary)
  Weeklies/Weekly.cs                    (alterado: + GetDailyByDate)

backend/src/Focadu.Application/
  Exceptions/ExternalServiceException.cs      (novo)
  Ports/IAudioTranscriptionService.cs         (comentário atualizado - adapter agora existe)
  Ports/IContentEvaluationService.cs          (comentário atualizado - adapter agora existe)
  Dailies/ActivityResponseRecorder.cs         (novo, interno)
  Dailies/SubmitActivityResponseUseCase.cs    (refatorado: usa ActivityResponseRecorder)
  Dailies/SubmitVoiceSummaryResponseUseCase.cs (novo)
  Dailies/GetTodayUseCase.cs             (alterado: usa Weekly.GetDailyByDate)
  DependencyInjection.cs                (alterado: + SubmitVoiceSummaryResponseUseCase)
  Seed/SeedWebSecurityCourseUseCase.cs   (alterado: + VoiceSummary no Dia 1)

backend/src/Focadu.Infrastructure/
  Services/GroqOptions.cs                     (novo)
  Services/GroqAudioTranscriptionService.cs   (novo)
  Services/GroqContentEvaluationService.cs    (novo)
  DependencyInjection.cs                (alterado: + HttpClients Groq)
  Focadu.Infrastructure.csproj           (alterado: + Microsoft.Extensions.Http)

backend/src/Focadu.Api/
  ErrorHandling/ApiExceptionHandler.cs   (alterado: + ExternalServiceException, + BadHttpRequestException)
  Program.cs                             (alterado: + endpoint de audio, + Groq:ApiKey)
  Focadu.Api.csproj                      (alterado: + UserSecretsId)
  appsettings.json                       (alterado: + Groq:ApiKey vazio)

backend/tests/Focadu.Tests/
  Weeklies/WeeklyTests.cs                (alterado: + 2 testes de GetDailyByDate)
  Dailies/DailyTests.cs                  (alterado: + 2 testes de VoiceSummary/ContentId)

frontend/src/
  api/types.ts                          (alterado: + VoiceSummary no ActivityType)
  api/client.ts                         (alterado: + submitVoiceSummaryResponse, suporte a FormData)
  components/VoiceSummaryActivity.tsx   (novo)
  routes/TodayPage.tsx                  (alterado: dispatch pro VoiceSummary)

docs/
  ARQUITETURA.md                        (atualizado)
  fase-5/resumo-implementacao-fase-5.md (este arquivo)
```

## Testes

**Backend (unitários, xUnit):** 48 testes passando (46 herdados da Fase 4 + 2 novos em
`WeeklyTests` cobrindo `GetDailyByDate` - desempate reforço/não-reforço e "nenhuma Daily nessa
data" - + 2 novos em `DailyTests` cobrindo a exigência de `ContentId` pra `VoiceSummary`).

**Validação end-to-end contra Postgres real** (banco resetado do zero, 3 migrations aplicadas em
sequência sem erro - confirmado que a Fase 5 não precisou de nenhuma migration nova, já que
`ActivityType` é armazenado como `string` e "VoiceSummary" cabe no `varchar(20)` existente):

- `GET /api/today` confirmado retornando o Dia 1 (Quiz + VoiceSummary) corretamente.
- Endpoint de áudio testado via `curl` cobrindo todos os caminhos de erro: corpo ausente (`400
  requisicao_invalida`, depois do fix), campo `audio` ausente (`400 audio_obrigatorio`), tipo de
  atividade errado (`400 tipo_atividade_invalido`), arquivo grande demais (`400
  audio_muito_grande`), chave da Groq não configurada (`502 groq_api_key_nao_configurada`).
- **Frontend verificado ao vivo no navegador**: tela de `VoiceSummary` renderizando o enunciado, o
  botão de microfone com o glow (verde parado, vermelho pulsante gravando) e o contador de tempo;
  fluxo de permissão de microfone negada (only caminho testável neste ambiente, que não tem
  acesso real a dispositivo de audio) mostrando a mensagem de erro E mantendo o botão disponível
  pra tentar de novo, depois do fix do item 5 acima.
- **Não testado**: transcrição/avaliação reais contra a Groq (nenhuma `GROQ_API_KEY` disponível
  nesta sessão) - o caminho "chave ausente" foi validado ponta a ponta (DI, endpoint, exceção,
  mensagem), mas o comportamento real da Groq (formato exato da resposta, latência, qualidade da
  avaliação) fica como validação pendente pro Falves rodar com uma chave real.

## Dúvidas ou pontos abertos para a próxima fase

- **Transcrição/avaliação nunca testadas contra a Groq real** (sem chave disponível nesta sessão)
  - validar isso é o item mais importante antes de considerar a Parte 2/4/5/6 prontas pra uso
    real, não só estruturalmente corretas. Ver "Como configurar a chave da Groq" em
    `docs/ARQUITETURA.md`.
- **Sem retry automático em falha da Groq** (decisão consciente, ver seção de decisões) - se a
  Groq falhar (rate limit, instabilidade), o usuário precisa gravar de novo manualmente. Pode
  valer a pena revisitar se isso se mostrar frequente na prática.
- **MediaRecorder sem detecção de formato/fallback entre navegadores** - assume o `mimeType`
  default do navegador (tipicamente `audio/webm` em Chrome/Firefox, compatível com a Groq). Safari
  pode se comportar diferente; não testado nesta fase (ambiente sem acesso real a microfone).
- **CORS ainda hardcoded pra `localhost:5173`** (pendência já registrada nas Fases 3/4) - não
  mexido nesta fase.
- **Sem UI de autoria de conteúdo, sem telas de resumo falado adicionais além do Dia 1, sem
  endpoints de autoria de Course/Monthly/Weekly/Daily/DailyActivity** - seguem fora de escopo,
  como nas fases anteriores.
