using Focadu.Domain.Users;

namespace Focadu.Domain.Repositories;

/// <summary>Port de persistencia para EmailVerificationCode (Fase 93).</summary>
public interface IEmailVerificationCodeRepository
{
    /// <summary>O codigo mais recente do usuario (so ele vale), ou nulo se nunca pediu.</summary>
    Task<EmailVerificationCode?> GetLatestAsync(Guid userId, CancellationToken cancellationToken = default);

    Task AddAsync(EmailVerificationCode code, CancellationToken cancellationToken = default);
}
