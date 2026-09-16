using System.Security.Cryptography;
using System.Text;

namespace Focadu.Application.Shared;

/// <summary>
/// Gera e hasheia o token de redefinicao de senha (Fase 41) - criptograficamente aleatorio
/// (RandomNumberGenerator, diferente de Random.Shared em UniqueCodeGenerator: este token protege
/// troca de senha/acesso a conta, precisa ser imprevisivel, nao so "nao repetido" como um codigo
/// de indicacao). So o hash (SHA-256) e persistido - nunca o token em texto puro (mesmo raciocinio
/// de nunca guardar senha em texto puro, User.PasswordHash), mas sem precisar do hashing lento de
/// BCrypt: a entropia do token (32 bytes aleatorios) ja torna brute-force inviavel sozinha.
/// </summary>
internal static class PasswordResetTokenGenerator
{
    private const int TokenBytes = 32;

    public static string Generate() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(TokenBytes))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    public static string Hash(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
