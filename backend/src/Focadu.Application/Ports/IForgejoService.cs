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
    /// Focadu cria repositorio", ver rascunho). Sem token (Fase 60) - esse sai so em
    /// RegenerateAccessTokenAsync, quando o aluno pede. NAO e idempotente/nao
    /// verifica se ja existe - quem chama (EnrollUserInCourseUseCase) so invoca isso depois de
    /// checar UserForgejoAccountRepository e nao achar nada (mesma divisao de responsabilidade de
    /// IGitHubService: o port so fala HTTP, a Application decide quando chamar).
    /// </summary>
    Task CreateUserAccountAsync(string username, string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Fase 60: gera um access token novo pra conta `username` e revoga o anterior (mesmo nome) -
    /// devolve o valor, que o Forgejo nunca mostra de novo. Quem chama nao persiste o valor.
    /// </summary>
    Task<string> RegenerateAccessTokenAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>
    /// Fork de `templateSlug` (repositorio-template mantido pela curadoria, dono da conta
    /// administrativa da Focadu) pra dentro da conta `asUsername`, via impersonacao (Sudo) - o
    /// template nunca e alterado. Devolve a URL de clone do fork resultante.
    /// </summary>
    Task<string> ForkTemplateAsync(string templateSlug, string asUsername, CancellationToken cancellationToken = default);

    /// <summary>Mesma forma que IGitHubService.GetContentSnapshotAsync - conteudo do repositorio formatado pronto pro prompt de avaliacao por IA (EvaluateWeeklyProjectUseCase).</summary>
    Task<string> GetContentSnapshotAsync(string owner, string repo, CancellationToken cancellationToken = default);
}
