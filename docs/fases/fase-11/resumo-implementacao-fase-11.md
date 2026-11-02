# Resumo — Fase 11: Sistema de Publicação Pública

## ⚠️ Validação de design: os 7 links batiam com o rótulo desta vez - mas o fundo por trás é fabricado

Diferente da Fase 10 (nodes trocados entre si), os 7 nodes desta fase **bateram exatamente** com o
rótulo esperado no prompt:

| Node | Rótulo esperado | Conteúdo real do node |
|---|---|---|
| `55-375` | Modal de Publicação — Intro | ✅ "Compartilhe Seu Aprendizado" |
| `55-394` | LinkedIn — Draft Preview | ✅ "Preview — Rascunho Gerado" |
| `55-452` | LinkedIn — Editor de Texto | ✅ "Editar Publicação" (textarea + contador) |
| `55-517` | GitHub — Seleção de Repositório | ✅ "Onde quer publicar?" |
| `55-691` | Validação Pendente | ✅ "Validando seu envio..." |
| `55-753` | Validação Sucesso | ✅ "Publicado com Sucesso!" |
| `55-824` | Validação Erro | ✅ "Erro na Validação" |

**O problema não é o modal, é o fundo**: em 6 dos 7 frames, o modal aparece sobreposto a uma tela
fictícia - "Laboratório Prático: Bypass de Filtros" / "Módulo 04: Segurança Ofensiva", com sidebar
de progresso de "lab" e um terminal simulando comandos `curl`/SQL injection. Isso não corresponde a
nada no domínio real do Focadu (não existe "Laboratório Prático", "Segurança Ofensiva" como módulo,
nem terminal/CLI simulado - as atividades reais são Quiz/Cloze/WordMatch/Roleplay/VoiceSummary/
Reading/Video). **Decisão**: ignorar o fundo fabricado e montar o `PublicationModal` de verdade por
cima das telas reais do app (`WeeklyDetailPage`), não da tela de laboratório inventada - só o modal
em si (estrutura, textos, badges, botões) foi usado como referência.

## ⚠️ "Octokit já configurado desde a Fase 1" era falso

O prompt afirmava duas vezes ("reaproveitar Octokit já configurado da Fase 1/Seção 6.1") que a
integração GitHub já existia. `grep -rli "octokit\|github" src tests` não encontrou nenhum pacote,
serviço ou configuração GitHub em lugar nenhum do backend - só menções incidentais em strings de
seed/comentários. Levei essa divergência pro usuário via pergunta direta (criar repositório real na
conta do GitHub dele é uma ação pública e difícil de reverter, não decisão que se toma sozinho).
**Decisão do usuário**: construir a integração de verdade no backend (HttpClient cru pra
`api.github.com`, sem pacote Octokit.NET - mesmo padrão já usado pro Groq), token configurável via
`appsettings`/user-secrets e ausente por padrão, **sem criar nenhum repositório/commit real** nesta
fase - o fluxo GitHub foi verificado estruturalmente via `page.route()` do Playwright (mesma técnica
da Fase 10), nunca contra a API real do GitHub.

## O que foi implementado

### Backend
- **Domain**: `PublicationPlatform`/`PublicationStatus` (enums), `ModulePublication` (entidade -
  `GenerateDraft`/`Submit`/`MarkValidated`/`MarkFailed`, `Submit` após `Validated` lança
  `publicacao_ja_validada`, mas é re-chamável depois de `Failed` pra permitir retry). `Weekly` ganhou
  `Publication`, `StartPublication()` (idempotente), `IsModuleComplete()` (todos os Dailies originais
  - **exclui** os de reforço, de propósito: um reforço pendente não deveria travar quem já terminou o
  conteúdo original - `+` `WeeklyProject.Status == Evaluated`) e `RequiresPublicationToUnlock()`.
- **Bloqueio cross-Weekly**: `StartOrResumeDailyUseCase` busca as Weeklies-irmãs (`GetByMonthlyIdAsync`)
  e, se a Weekly anterior (`Number - 1`) tem `RequiresPublicationToUnlock() == true`, lança
  `modulo_bloqueado_por_publicacao` (409) antes de chamar `Weekly.StartOrResumeDaily`. Escopo
  deliberadamente **só dentro do mesmo Monthly** (não atravessa Monthlies) - único Monthly existe
  hoje, documentado como simplificação com teto conhecido.
- **`EvaluateWeeklyProjectUseCase`** (novo, fecha uma lacuna documentada desde a Fase 7):
  `WeeklyProject.Evaluate()` existia no domínio desde a Fase 1 mas não tinha endpoint - sem ele,
  `IsModuleComplete()` nunca seria `true` de verdade. Endpoint só-backend (`POST
  /api/weeklies/{id}/project/evaluate`), sem UI (não há papel de "revisor" neste app de usuário único).
- **`GitHubService`** (`Focadu.Infrastructure/Services/`): HttpClient cru pra `api.github.com`
  (`Authorization: Bearer`, `User-Agent`, `Accept: application/vnd.github+json`) - lista repos
  públicos, cria repo, commita arquivo (`PUT contents/{path}`), busca repo por owner/nome (404 vira
  `null`, não exceção - permite ao chamador diferenciar "não existe/privado" de erro real). Token
  ausente só falha quando efetivamente usado (`github_token_nao_configurado`), nunca bloqueia o
  startup do app - mesmo padrão do `Groq:ApiKey`.
- **`GroqDraftGenerationService`**: mesmo HttpClient/tratamento de erro do
  `GroqContentEvaluationService`, mas sem JSON mode - texto livre, prompt pede primeira pessoa/tom
  pessoal, usando tema da Weekly + até 3 títulos de `CuratedContent` (Reading/Video). Não usa
  `AiFeedback` de nenhuma atividade de propósito (evitaria vazar o resultado de uma tentativa
  específica num post público).
- **`CommitModuleSummaryUseCase`**: cria/resolve o repo, monta um resumo em Markdown
  (`MODULO-{n}.md`), commita, e já chama `Submit`+`MarkValidated` na mesma operação - o commit bem
  sucedido *é* a prova, sem round-trip de validação redundante.
- **`SubmitPublicationUseCase`**: cobre LinkedIn (regex `linkedin.com/(posts|feed/update)/`) e GitHub
  (parse owner/repo da URL + `GetRepositoryAsync` exigindo `IsPrivate == false`) no mesmo use case -
  **não criei um `ValidatePublicationUseCase` separado** como o prompt sugeria: retry é só resubmeter
  a mesma URL por aqui, não haveria lógica nova pra separar.
- **Migration**: `ModulePublications` (WeeklyId FK único, Status/Platform como string, timestamps,
  ValidationError) + uma segunda migration (`Fase11ModulePublicationNavigation`) - ver bug real
  abaixo.
- **6 endpoints novos** + `/project/evaluate`: `GET .../publication/status`, `POST
  .../publication/draft`, `GET /api/github/repositories`, `POST .../publication/github-commit`,
  `POST .../publication/submit`.

### Frontend
- **`PublicationModal.tsx`** (`components/publication/`, ~470 linhas) - os 9 arquivos sugeridos no
  prompt (`PublicationIntro`, `LinkedInDraftPreview`, `LinkedInEditor`, `GitHubRepoSelector`,
  `PublicationUrlSubmit`, `PublicationValidating`, `PublicationSuccess`, `PublicationError` +
  container) **viraram 1 arquivo** com 8 sub-componentes locais - a máquina de estado (`Step`) e
  todo o estado (draft, url, repos, etc.) são compartilhados demais entre eles pra justificar módulos
  separados; nenhum sub-componente é reusado fora do modal.
- Erros de rede usam `classifyApiError` (Fase 10) mas num bloco compacto (não
  `ErrorLayout`/`ApiErrorScreen` - pressupõe `min-h-screen`, incompatível com o card do modal). Erro
  de validação (URL inválida/repo privado) é estado de **domínio** (`status === Failed`), tela
  própria, sem relação com erro de rede.
- `WeeklyDetailPage`: banner "🔒 Publique sua conclusão..." quando `requiresPublicationToUnlock`,
  abre o modal.
- `CourseDetailPage`: `WeekSummaryCard` ganhou `isLocked` (Weekly anterior na lista com
  `requiresPublicationToUnlock`) - badge "🔒 Bloqueado", card não é mais um link enquanto bloqueado
  (mesmo tratamento de "dia futuro" já usado em `WeeklyDetailPage`/Fase 8).

## Bugs reais encontrados e corrigidos na verificação ao vivo

1. **`WeeklyConfiguration` nunca declarava a navegação `Weekly.Publication`** (faltava
   `HasOne(w => w.Publication).WithOne().HasForeignKey<ModulePublication>(...)`, ao contrário de
   `Project` que já tinha o equivalente). Sem isso, `.Include(w => w.Publication)` em
   `WeeklyRepository.FullGraph()` derrubava `GET /api/courses/{id}` inteiro com
   `InvalidOperationException` (`'w.Publication' is invalid inside an Include`) - encontrado ao vivo
   assim que tentei carregar o curso de teste, não pelos testes de unidade (que não cobrem
   repositório, ver convenção de testes). Corrigido + segunda migration
   (`Fase11ModulePublicationNavigation`, só adiciona a FK que devia existir desde o início).
2. **`onPublished` fechando o modal antes do usuário ver a tela de sucesso**: a integração original
   em `WeeklyDetailPage` chamava `retry()` (de `useApiResource`) dentro de `onPublished`, disparado
   *antes* de `setStep('success')` terminar de renderizar. `retry()` seta `loading=true`, que faz
   `WeeklyDetailPage` retornar só `<Centered/>` - desmontando o modal (e seu `step`) no meio do fluxo.
   O usuário nunca via "Publicado com Sucesso!", via o modal simplesmente reabrir do zero em
   `'intro'`. Corrigido movendo o refetch pra `onClose` (só quando o usuário decide sair do modal,
   com ou sem sucesso) - e removido `onPublished` inteiramente do componente (não sobrava nenhum uso
   real pra ele).
3. **Navegar para "Próximo Módulo" mantinha o modal aberto** com o estado da Weekly anterior: como
   `StartPage` renderizava `<WeeklyDetailPage weeklyId={weeklyId} .../>` sem `key`, trocar de query
   string não remonta o componente - `showPublicationModal` (e o `SuccessStep` da Weekly antiga)
   ficaria por cima da Weekly nova. Corrigido com `key={weeklyId}`, mesmo padrão já usado em
   `App.tsx` (`key={location.pathname}` no `ErrorBoundary`).

Todos os 3 só apareceram testando o fluxo completo de ponta a ponta (Playwright, ver abaixo) - nenhum
teria sido pego por `tsc`/`oxlint`/`dotnet test` sozinhos.

## Decisões técnicas que não estavam no prompt original

- **Granularidade do bloqueio confirmada com o usuário** antes de implementar: Weekly inteira (não
  Daily), conforme a recomendação do próprio prompt - alinhado à "granularidade de módulo" do
  Documento Mestre.
- **Bloqueio não trava replay de conteúdo já visto** - `RequiresPublicationToUnlock` só é consultado
  em `StartOrResumeDailyUseCase` contra a Weekly *anterior*; `EvaluateDailyAccess` (Replay/ReadOnly
  de Dailies já completas) nunca passa por essa checagem. Verificado ao vivo (ver abaixo).
- **`IsModuleComplete()` ignora Dailies de reforço** de propósito - um reforço pendente não deveria
  travar quem já terminou o conteúdo original da semana.

## Estrutura de arquivos criada

```
backend/src/
  Focadu.Domain/
    Enums/PublicationPlatform.cs, PublicationStatus.cs        <- novos
    Weeklies/ModulePublication.cs                               <- novo
    Weeklies/Weekly.cs                                           <- +Publication, IsModuleComplete, RequiresPublicationToUnlock
  Focadu.Application/
    Ports/IDraftGenerationService.cs, IGitHubService.cs         <- novos
    Weeklies/PublicationDtos.cs, GetPublicationStatusUseCase.cs,
             GenerateLinkedInDraftUseCase.cs, GetGitHubRepositoriesUseCase.cs,
             CommitModuleSummaryUseCase.cs, SubmitPublicationUseCase.cs,
             EvaluateWeeklyProjectUseCase.cs                     <- novos
    Dailies/StartOrResumeDailyUseCase.cs                         <- +checagem de bloqueio cross-Weekly
  Focadu.Infrastructure/
    Services/GitHubOptions.cs, GitHubService.cs,
             GroqDraftGenerationService.cs                       <- novos
    Persistence/Configurations/ModulePublicationConfiguration.cs <- novo
    Persistence/Configurations/WeeklyConfiguration.cs            <- +HasOne(Publication)
    Migrations/..._Fase11ModulePublication.cs,
               ..._Fase11ModulePublicationNavigation.cs          <- novas
  Focadu.Api/
    Contracts/PublicationRequests.cs                             <- novo
    Program.cs                                                    <- +6 endpoints, +GitHubOptions
frontend/src/
  components/publication/PublicationModal.tsx                    <- novo
  routes/WeeklyDetailPage.tsx                                     <- +banner, +modal
  routes/CourseDetailPage.tsx                                     <- +badge "Bloqueado"
  routes/StartPage.tsx                                            <- +key={weeklyId}
  api/types.ts, api/client.ts                                     <- +tipos/métodos de publicação
```

## Testes

- Backend: `dotnet build`/`dotnet test` limpos, **74 aprovados** (57 pré-existentes + 17 novos -
  `ModulePublicationTests` cobrindo `Submit`/`MarkValidated`/`MarkFailed`/retry após falha, e 7 casos
  novos em `WeeklyTests` pra `IsModuleComplete`/`RequiresPublicationToUnlock`, incluindo o caso de
  reforço ignorado).
- Frontend: `tsc -b`, `oxlint src` (só o warning pré-existente de `TodayPage.tsx`), `vite build`
  limpos.
- Verificação ao vivo (backend real rodando, banco Postgres real - migrations aplicadas):
  - **Fluxo LinkedIn completo, de ponta a ponta, contra o backend de verdade** (Playwright): banner →
    modal → rascunho real gerado pela Groq → "Copiar e Publicar" → colar URL → "Validar" → tela de
    sucesso real, com `requiresPublicationToUnlock` virando `false` de fato no banco.
  - **Fluxo GitHub completo, mas com `page.route()` mockando `GET /api/github/repositories` e `POST
    .../publication/github-commit`** - nunca chamou a API real do GitHub, conforme decisão do
    usuário. UI renderizou os repos mockados, selecionou, "Continuar" → tela de sucesso.
  - **Bloqueio cross-Weekly, via SQL temporário**: criei uma 2ª Weekly de teste na mesma Monthly,
    tentei `POST .../start` no primeiro Daily dela com a Weekly 1 ainda sem publicação →
    `409 modulo_bloqueado_por_publicacao`; validei a publicação da Weekly 1 (LinkedIn) → repeti o
    `start` → `200 OK`. Dados de teste (Weekly temporária, Dailies "completados" via SQL,
    `WeeklyProject` marcado `Evaluated`) revertidos ao estado original depois.
  - **Badge "🔒 Bloqueado"** confirmado em `CourseDetailPage` na Weekly seguinte, enquanto a anterior
    tinha `requiresPublicationToUnlock: true`.
  - Os 3 bugs reais da seção acima foram todos encontrados e corrigidos durante essa verificação.

## Dúvidas ou pontos abertos para a próxima fase

- **GitHub nunca foi testado contra a API real** (decisão explícita do usuário nesta fase) - o código
  (`GitHubService`, `CommitModuleSummaryUseCase`) está estruturalmente correto e espelha o padrão já
  comprovado do Groq, mas o comportamento real de `api.github.com` (rate limits, formato exato de
  erro em token sem escopo de `repo`, etc.) só será validado quando um token de verdade for
  configurado - o prompt já pedia pra confirmar isso antes de assumir que funciona.
- **Validação de LinkedIn é só estrutural** (regex de formato de URL, não verifica se o post
  realmente fala sobre o módulo) - limitação conhecida, já sinalizada no próprio prompt como ponto
  em aberto, sem API gratuita de conteúdo disponível pra resolver isso agora.
- **Bloqueio cross-Weekly não atravessa Monthlies** - só existe 1 Monthly hoje; se um curso ganhar um
  2º Monthly, a última Weekly de um Monthly não bloqueia a primeira do próximo. Upgrade natural:
  trocar `GetByMonthlyIdAsync` por uma busca ordenada por `(MonthlyNumber, WeeklyNumber)` cross-Monthly
  quando isso importar de verdade.
- **"Auditoria de Repositórios"** (citada no prompt como próxima fase) depende de decisão de escopo
  (estática vs. dinâmica) - ainda não é um prompt técnico.
