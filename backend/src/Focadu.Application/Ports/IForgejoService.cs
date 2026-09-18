namespace Focadu.Application.Ports;

/// <summary>
/// Port para o Forgejo interno (hospedagem dos repositorios de Projeto Semanal) - garantir a
/// conta do aluno, dar fork de um repositorio-template em nome dele (via impersonacao
/// administrativa) e ler o conteudo pra avaliacao por IA. Mesmo espirito de IGitHubService, mas
/// pra uma instancia self-hosted controlada pela propria Focadu - ver
/// secret/rascunhos/repositorios-gerenciados-projeto-semanal.md. Sem implementacao configurada por
/// padrao (token admin ausente) - ver ForgejoOptions.
/// </summary>
public interface IForgejoService
{
    /// <summary>
    /// Cria a conta do aluno no Forgejo, com criacao de repositorio desabilitada pra ele ("so a
    /// Focadu cria repositorio", ver rascunho) e um access token novo. NAO e idempotente/nao
    /// verifica se ja existe - quem chama (EnrollUserInCourseUseCase) so invoca isso depois de
    /// checar UserForgejoAccountRepository e nao achar nada (mesma divisao de responsabilidade de
    /// IGitHubService: o port so fala HTTP, a Application decide quando chamar).
    /// </summary>
    Task<ForgejoAccountInfo> CreateUserAccountAsync(string username, string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Fork de `templateSlug` (repositorio-template mantido pela curadoria, dono da conta
    /// administrativa da Focadu) pra dentro da conta `asUsername`, via impersonacao (Sudo) - o
    /// template nunca e alterado. Devolve a URL de clone do fork resultante.
    /// </summary>
    Task<string> ForkTemplateAsync(string templateSlug, string asUsername, CancellationToken cancellationToken = default);

    /// <summary>Mesma forma que IGitHubService.GetContentSnapshotAsync - conteudo do repositorio formatado pronto pro prompt de avaliacao por IA (EvaluateWeeklyProjectUseCase).</summary>
    Task<string> GetContentSnapshotAsync(string owner, string repo, CancellationToken cancellationToken = default);
}

/// <summary>`Username`/`AccessToken` de uma conta recem-criada no Forgejo - o Forgejo so devolve o valor do token na criacao (nunca de novo depois), por isso CreateUserAccountAsync precisa ser chamado no maximo uma vez por usuario, com o resultado persistido em UserForgejoAccount.</summary>
public record ForgejoAccountInfo(string Username, string AccessToken);
