using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>Adapter de IPasswordHasher via BCrypt.Net-Next (Fase 12) - work factor default da lib.</summary>
public class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string plainPassword) => BCrypt.Net.BCrypt.HashPassword(plainPassword);

    public bool Verify(string plainPassword, string hash) => BCrypt.Net.BCrypt.Verify(plainPassword, hash);
}
