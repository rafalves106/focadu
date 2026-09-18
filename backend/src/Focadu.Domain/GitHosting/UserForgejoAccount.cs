using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.GitHosting;

/// <summary>
/// Conta do aluno no Forgejo interno (hospedagem dos repositorios de Projeto Semanal) - 1:1 com
/// User, criada sob demanda (lazy) na primeira vez que a Focadu precisa dar fork de um
/// repositorio-template pra este usuario (ver EnrollUserInCourseUseCase), mesmo principio de
/// UserGemBalance/UserStreak (Fase 14). Um so token por aluno, reusado pra clonar/pushar em
/// qualquer repositorio que seja dele no Forgejo - nao 1 token por WeeklyProject.
/// </summary>
public class UserForgejoAccount : Entity
{
    public Guid UserId { get; private set; }
    public string ForgejoUsername { get; private set; }
    public string AccessToken { get; private set; }

    private UserForgejoAccount()
    {
        ForgejoUsername = string.Empty;
        AccessToken = string.Empty;
    }

    public UserForgejoAccount(Guid userId, string forgejoUsername, string accessToken)
    {
        if (string.IsNullOrWhiteSpace(forgejoUsername))
            throw new DomainException("Nome de usuario do Forgejo e obrigatorio.");
        if (string.IsNullOrWhiteSpace(accessToken))
            throw new DomainException("Token de acesso do Forgejo e obrigatorio.");

        UserId = userId;
        ForgejoUsername = forgejoUsername;
        AccessToken = accessToken;
    }
}
