## GitHub (commit de resumo do modulo, Fase 11)

`IGitHubService` (`Focadu.Infrastructure.Services.GitHubService`) e um adapter via `HttpClient`
tipado cru pra `https://api.github.com/` - **sem pacote Octokit.NET**, mesmo padrao ja usado pro
Groq (`services.AddHttpClient<IGitHubService, GitHubService>(...)`), apesar do prompt da Fase 11
ter dito duas vezes que "Octokit ja estava configurado desde a Fase 1" (afirmacao falsa,
verificada por `grep` antes de implementar - ver `docs/fase-11/resumo-implementacao-fase-11.md`).
Headers fixos: `Authorization: Bearer {token}` (so quando configurado), `User-Agent: Focadu/1.0`
(exigido pela API do GitHub), `Accept: application/vnd.github+json`. Timeout de 20s por chamada,
com o mesmo retry automatico (`HttpRetry`) documentado na secao Groq acima - 404 (usado como
"nao existe" em `GetOptionalAsync`) nunca entra no retry, e resposta valida, nao falha.

### Como configurar o token do GitHub

Mesmo padrao de 3 formas da chave da Groq acima (user-secrets em dev, variavel de ambiente em
producao/CI, nunca em `appsettings.json`):

```bash
cd backend/src/Focadu.Api
dotnet user-secrets set "GitHub:Token" "seu-token-aqui"      # precisa de escopo de escrita (repo), nao so leitura
```

`GitHubOptions` so tem `Token` - o campo `Username` de quando isso foi escrito nunca foi lido em
lugar nenhum (`GitHubService` sempre recebe `owner` explicito: da propria resposta da API pra
criar/listar repos, ou da URL parseada por `GitHubUrlParser` pra validar/avaliar) - removido nesta
revisao (dead config), um secret a menos pra configurar.

Sem o token configurado, o resto da Api sobe normalmente - so as chamadas que tocam o GitHub
falham com `github_token_nao_configurado` (502).

**Revisao de codigo desta fase (sem chave real ainda - Falves valida ao vivo, mesmo padrao da
validacao real do Groq na Fase 5):**

- **Bug real encontrado e corrigido:** `CommitFileAsync` fazia `PUT /repos/{owner}/{repo}/contents/
  {path}` sem `sha` - a API do GitHub so aceita isso pra criar um arquivo que ainda nao existe;
  sobrescrever um que ja existe sem `sha` responde `422 "sha wasnt supplied"` em vez de commitar.
  Um repo novo (`auto_init=true`) e imune na 1a chamada, mas um repo reaproveitado
  (`CommitModuleSummaryUseCase` com `isNewRepo=false`) ou qualquer retry do mesmo commit (ex: a
  Api falha em `SaveChangesAsync` *depois* do commit ir pro GitHub) batiam nesse 422. Corrigido:
  `CommitFileAsync` busca o `sha` atual (`GET .../contents/{path}`, 404 vira "nao existe" -
  criacao pura) antes do `PUT`.
- **Rate limit / repo privado-inexistente / token sem escopo `repo`:** nenhum ganhou tratamento
  dedicado - `HttpRetry.EnsureSuccessAsync` ja bota qualquer status de erro (nao só 404, que vira `null` via
  `GetOptionalAsync`) dentro de `github_falhou`/`github_indisponivel` (502) com o corpo real da
  resposta do GitHub anexado na mensagem, mesmo padrao ja usado pros erros genericos da Groq -
  rate limit e token sem escopo chegam pro usuario com a mensagem literal que o GitHub devolveu
  (ex: "API rate limit exceeded...", "Resource not accessible by personal access token"), sem
  precisar de um `Code` por status.
- **Ainda pendente (exige chave real, nao verificavel so por leitura de codigo):** confirmar que
  os fluxos abaixo batem na API de verdade e que as mensagens acima realmente aparecem assim.
  Checklist pro Falves (mesmo escopo do pedido original da Fase 11). **Obsoleto desde a Fase 106**: a
  prova publica do modulo nao passa mais pelo GitHub; fica so como registro do adapter `GitHubService`:
  1. `github-commit` (`CommitModuleSummaryUseCase`) num repo **novo** - confirma o caminho feliz.
  2. `github-commit` **de novo pro mesmo modulo** (mesmo repo, mesmo `MODULO-{n}.md`) - e o teste
     que valida o fix do `sha` acima; sem ele, essa chamada quebrava com 422.
  3. `submit` (`SubmitPublicationUseCase`) com uma URL de repo GitHub **publica** real - caminho
     feliz de `GetRepositoryAsync`.
  4. `submit` com URL de repo **privado** ou **inexistente** - confirma que cai no
     `GitHubValidationError` (nao um 502 cru).
  5. ~~`POST /project/evaluate` (`EvaluateWeeklyProjectUseCase`) contra um repo com codigo de
     verdade~~ - **desde a Fase 46, esse fluxo nao usa mais `IGitHubService`** (migrou pro
     Forgejo interno, ver secao propria abaixo). O checklist original desta fase (Fase 11) ficou
     obsoleto nesse item especifico - os outros 5 continuam valendo pro fluxo de prova publica de
     modulo, que segue no GitHub de verdade.
  6. Token **sem** escopo `repo` (ou vazio) - confirma `github_token_nao_configurado`/
     `github_falhou` em vez de um erro sem contexto.

| Code | Status | Quando |
|---|---|---|
| `github_token_nao_configurado` | 502 | `GitHub:Token` vazio - qualquer chamada que precise dele |
| `github_timeout` | 503 | GitHub nao respondeu a tempo (timeout de 20s) |
| `github_indisponivel` / `github_falhou` | 502 | Erro de rede ou status HTTP de erro vindo do GitHub - inclui rate limit e token sem escopo, ver acima |