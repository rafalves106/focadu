# Resumo — Fase 27b: Avaliação Automática do Projeto Semanal

## Origem

Perguntado "algo essencial de fora ainda?" durante a revisão de pendências, rastreei a cadeia de
dependência do bloqueio de módulo (`secret/MESTRE.md` §5, "regra de negócio real, com bloqueio de
fato"):

```
IsModuleComplete() exige Project.Status == Evaluated
       ↓
RequiresPublicationToUnlock() exige IsModuleComplete()
       ↓
StartOrResumeDailyUseCase só bloqueia a próxima Weekly se RequiresPublicationToUnlock() == true
```

Conferindo o frontend inteiro (`api/client.ts` incluído), **não existia nenhuma chamada pra
`POST /weeklies/{id}/project/evaluate`**. `WeeklyProjectCard.tsx` até mostra o badge "🔄 AGUARDANDO
AVALIAÇÃO" depois da submissão, mas nada nunca avaliava - `Project.Status` ficava preso em
`Submitted` pra sempre. Consequência real: o gate de publicação pública, descrito desde a Fase 11
como bloqueio de fato, **nunca engatava** para nenhum usuário real - todo o `PublicationModal` já
construído (LinkedIn/GitHub) também nunca era exercitado, porque o gatilho dele depende do mesmo
`IsModuleComplete()`.

## O que foi implementado

- **`SubmitWeeklyProjectUseCase` dispara a avaliação automaticamente**, logo após aceitar a URL -
  por composição, injeta e chama `EvaluateWeeklyProjectUseCase.ExecuteAsync` (reaproveita toda a
  lógica de GitHub snapshot + Groq + crédito de gamificação já existente, zero duplicação). Mesmo
  princípio "sob demanda" já usado no resto do domínio - não virou job nem estado intermediário.
- **Falha na avaliação automática nunca falha a submissão em si** - `try/catch` em volta da
  chamada, capturando `ValidationException` (URL que não é repositório GitHub público - o campo
  aceita qualquer URL, ex. post do LinkedIn, ver `WeeklyProjectPage.tsx`) e
  `ExternalServiceException` (GitHub/Groq fora do ar). Nesses casos o projeto fica em `Submitted`,
  exatamente como sempre funcionou antes desta fase - nunca pior, só as URLs de repositório GitHub
  público ganham o caminho novo (avaliado na hora).
- **Timeout do cliente ajustado** (`frontend/src/api/client.ts`) - `submitWeeklyProject` agora faz
  GitHub fetch + 1 chamada Groq de forma síncrona no backend; o timeout padrão de 10s era baixo
  demais pra isso (mesmo raciocínio já aplicado a `VoiceSummary`, que usa 70s pra transcrição +
  avaliação). Novo timeout dedicado: 45s.
- **Score/Feedback finalmente aparecem na tela** (`WeeklyProjectPage.tsx`) - existiam no domínio
  desde a Fase 16 e no `WeeklyProjectDto` do frontend, mas nunca eram renderizados (não tinha
  sentido antes: nada gerava essa nota). Bloco próprio (não `FeedbackPanel`, usado pelas 5
  atividades da Daily) porque Projeto não tem conceito de passed/reprovado - uma vez avaliado, não
  há reenvio (`WeeklyProject.Submit` bloqueia depois de `Evaluated`). Texto de ajuda adicionado no
  formulário avisando que só repositório GitHub público recebe nota automática.

## Verificação

- `dotnet build`: limpo. `dotnet test`: 319/319 (sem teste novo dedicado a
  `SubmitWeeklyProjectUseCase` - mesmo gap já documentado, depende de repositório/serviço externo
  sem fake no projeto, verificação é ao vivo).
- `npx tsc -b` e `npx oxlint` no frontend: limpos.
- **Verificação ao vivo pendente** (mesmo padrão da Fase 5 com o Groq): confirmar contra a API real
  do GitHub e do Groq que submeter um repositório de verdade produz nota + feedback na tela, e que
  uma segunda Weekly de fato fica bloqueada até a publicação ser validada - a Fase 11 nunca chegou
  a validar isso ao vivo porque o gate nunca tinha engatado antes desta fase.
