using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.GitHosting;

/// <summary>
/// Conta do aluno no Forgejo interno (hospedagem dos repositorios de Projeto Semanal) - 1:1 com
/// User, criada sob demanda (lazy) na primeira vez que a Focadu precisa dar fork de um
/// repositorio-template pra este usuario (ver EnrollUserInCourseUseCase), mesmo principio de
/// UserGemBalance/UserStreak (Fase 14). Um so token por aluno, reusado pra clonar/pushar em
/// qualquer repositorio que seja dele no Forgejo - nao 1 token por WeeklyProject.
///
/// Fase 60: o token NAO e guardado (antes ficava em texto puro no Postgres). O aluno gera sob
/// demanda (GenerateForgejoTokenUseCase), ve o valor uma unica vez e a Focadu so lembra os ultimos
/// 8 caracteres - mesmo que o proprio Forgejo mostra na lista de tokens - pra tela dizer qual token
/// esta valendo. Gerar outro revoga o anterior.
/// </summary>
public class UserForgejoAccount : Entity
{
    private const int LastCharsKept = 8;

    public Guid UserId { get; private set; }
    public string ForgejoUsername { get; private set; }

    /// <summary>Ultimos 8 caracteres do token valendo - nulo ate o aluno gerar o 1o.</summary>
    public string? TokenLastEight { get; private set; }

    public DateTime? TokenGeneratedAt { get; private set; }

    private UserForgejoAccount()
    {
        ForgejoUsername = string.Empty;
    }

    public UserForgejoAccount(Guid userId, string forgejoUsername)
    {
        if (string.IsNullOrWhiteSpace(forgejoUsername))
            throw new DomainException("Nome de usuario do Forgejo e obrigatorio.");

        UserId = userId;
        ForgejoUsername = forgejoUsername;
    }

    /// <summary>Registra que um token novo acabou de ser gerado no Forgejo - guarda so o final dele, nunca o valor inteiro.</summary>
    public void RegisterGeneratedToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length < LastCharsKept)
            throw new DomainException("Token de acesso do Forgejo invalido.");

        TokenLastEight = token[^LastCharsKept..];
        TokenGeneratedAt = DateTime.UtcNow;
    }
}
