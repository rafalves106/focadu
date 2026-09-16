using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Users;

/// <summary>
/// Token de uso unico para redefinicao de senha (Fase 41). So o hash (SHA-256, ver
/// PasswordResetTokenGenerator na Application) e persistido - nunca o token em texto puro, mesmo
/// raciocinio de User.PasswordHash nunca guardar a senha em si. Expira em 1h (definido pela
/// Application, que controla o relogio) e so pode ser consumido uma vez.
/// </summary>
public class PasswordResetToken : Entity
{
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UsedAt { get; private set; }

    private PasswordResetToken()
    {
        TokenHash = string.Empty;
    }

    private PasswordResetToken(Guid userId, string tokenHash, DateTime expiresAt)
    {
        UserId = userId;
        TokenHash = tokenHash;
        ExpiresAt = expiresAt;
        CreatedAt = DateTime.UtcNow;
    }

    public static PasswordResetToken Create(Guid userId, string tokenHash, DateTime expiresAt)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
            throw new DomainException("Hash do token e obrigatorio.");

        return new PasswordResetToken(userId, tokenHash, expiresAt);
    }

    /// <summary>Valida (nao usado, nao expirado) e marca como usado na mesma chamada - nunca reaproveitavel, mesmo se a troca de senha em si falhar depois na Application (o token ja teria sido consumido, exigindo pedir um novo).</summary>
    public void Consume(DateTime now)
    {
        if (UsedAt is not null)
            throw new DomainException("Este link de redefinicao de senha ja foi usado.", "token_invalido");

        if (now >= ExpiresAt)
            throw new DomainException("Este link de redefinicao de senha expirou.", "token_expirado");

        UsedAt = now;
    }
}
