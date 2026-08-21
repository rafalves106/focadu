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

    private readonly List<string> _interests = new();

    /// <summary>Hobbies/interesses/referencias culturais (Fase 13, Entrevista de Perfil - Documento Mestre Secao 2.2). Fonte de futuras analogias personalizadas - so captura/persiste nesta fase, uso automatico em prompts de IA fica pra uma fase futura.</summary>
    public IReadOnlyCollection<string> Interests => _interests.AsReadOnly();

    public string? AdditionalProfileNotes { get; private set; }

    /// <summary>Nulo ate o usuario concluir a Entrevista de Perfil (CompleteProfile) - AuthContext/SplashPage usam isso pra decidir se redirecionam pra /onboarding.</summary>
    public DateTime? ProfileCompletedAt { get; private set; }

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

    /// <summary>
    /// Salva o resultado da Entrevista de Perfil e marca ProfileCompletedAt (Fase 13). Sem minimo
    /// de interesses exigido - o campo de texto livre sozinho ja e uma resposta valida. Pode ser
    /// chamado de novo no futuro (ex: editar interesses) - sempre substitui a lista inteira, nunca
    /// mescla, pra nao acumular entradas obsoletas silenciosamente.
    /// </summary>
    public void CompleteProfile(IEnumerable<string> interests, string? additionalNotes)
    {
        _interests.Clear();
        _interests.AddRange(interests.Select(i => i.Trim()).Where(i => i.Length > 0).Distinct());
        AdditionalProfileNotes = string.IsNullOrWhiteSpace(additionalNotes) ? null : additionalNotes.Trim();
        ProfileCompletedAt = DateTime.UtcNow;
    }
}
