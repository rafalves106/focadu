namespace Focadu.Application.Ports;

/// <summary>Port de hashing de senha (Fase 12) - adapter concreto via BCrypt, ver Focadu.Infrastructure/Services.</summary>
public interface IPasswordHasher
{
    string Hash(string plainPassword);

    bool Verify(string plainPassword, string hash);
}
