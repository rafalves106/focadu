using System.Security.Cryptography;
using System.Text;

namespace Focadu.Application.Shared;

/// <summary>
/// Gera e hasheia o codigo de confirmacao de e-mail (Fase 93): 6 digitos de RandomNumberGenerator (protege
/// acesso a conta, mesmo raciocinio de PasswordResetTokenGenerator). O hash leva o UserId junto, pra o mesmo
/// codigo de dois usuarios nao dar o mesmo hash. Quem segura chute e o limite de tentativas do dominio.
/// </summary>
internal static class EmailVerificationCodeGenerator
{
    public const int Length = 6;

    public static string Generate() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

    public static string Hash(Guid userId, string code) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{userId:N}:{code}")));

    /// <summary>Tira espaco e traco que o aluno digita ou cola ("123 456"); o resto fica como veio.</summary>
    public static string Normalize(string? typed) =>
        new((typed ?? string.Empty).Where(c => !char.IsWhiteSpace(c) && c != '-').ToArray());
}
