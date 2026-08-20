using System.Text.RegularExpressions;
using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Users;

/// <summary>
/// Um usuario da plataforma (Fase 12 - antes disso o app era mono-usuario hardcoded, sem
/// autenticacao). Guarda so o hash da senha, nunca a senha em texto puro - o hashing em si e
/// responsabilidade da Infrastructure (IPasswordHasher); o dominio so recebe e armazena a string
/// ja hasheada, nunca calcula hash sozinho (evitaria acoplar o dominio a uma lib de crypto).
/// </summary>
public class User : Entity
{
    // Formato basico (nao RFC 5322 completo) - so pra pegar erros grosseiros de digitacao;
    // unicidade de verdade e responsabilidade da Application (consulta ao repositorio, ver
    // RegisterUserUseCase) + indice unico no banco (UserConfiguration), nao deste regex.
    private static readonly Regex EmailFormat = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    public string Email { get; private set; }
    public string PasswordHash { get; private set; }
    public string DisplayName { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private User()
    {
        Email = string.Empty;
        PasswordHash = string.Empty;
        DisplayName = string.Empty;
    }

    private User(string email, string passwordHash, string displayName)
    {
        Email = email;
        PasswordHash = passwordHash;
        DisplayName = displayName;
        CreatedAt = DateTime.UtcNow;
    }

    public static User Create(string email, string passwordHash, string displayName)
    {
        if (string.IsNullOrWhiteSpace(email) || !EmailFormat.IsMatch(email.Trim()))
            throw new DomainException("Email invalido.", "email_invalido");

        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new DomainException("Hash de senha e obrigatorio.");

        if (string.IsNullOrWhiteSpace(displayName))
            throw new DomainException("Nome e obrigatorio.", "nome_obrigatorio");

        return new User(email.Trim().ToLowerInvariant(), passwordHash, displayName.Trim());
    }
}
