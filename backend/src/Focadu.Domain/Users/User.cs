using System.Text.RegularExpressions;
using Focadu.Domain.Common;
using Focadu.Domain.Enums;
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

    /// <summary>Hobbies/interesses/referencias culturais (Fase 13, Entrevista de Perfil - Documento Mestre Secao 2.2). Fase 21: usado em prompt de IA - ver GetCuratedContentUseCase/IAnalogyGenerationService (gera analogia personalizada pra leituras).</summary>
    public IReadOnlyCollection<string> Interests => _interests.AsReadOnly();

    private readonly List<ProjectLanguage> _preferredLanguages = new();

    /// <summary>
    /// Linguagens em que o aluno topa realizar os Projetos Semanais (Fase 59), marcadas na
    /// Entrevista de Perfil. Vazio = ainda nao escolheu - a tela do projeto avisa e nao mostra o
    /// projeto ate ele marcar ao menos uma (em semana com variantes de linguagem).
    /// </summary>
    public IReadOnlyCollection<ProjectLanguage> PreferredLanguages => _preferredLanguages.AsReadOnly();

    public string? AdditionalProfileNotes { get; private set; }

    /// <summary>Nulo ate o usuario concluir a Entrevista de Perfil (CompleteProfile) - AuthContext/SplashPage usam isso pra decidir se redirecionam pra /onboarding.</summary>
    public DateTime? ProfileCompletedAt { get; private set; }

    /// <summary>Codigo de indicacao unico (Fase 17) - nulo ate a 1a consulta gerar (lazy, ver GetReferralInfoUseCase; unicidade checada na Application, que consulta o repositorio antes de atribuir).</summary>
    public string? ReferralCode { get; private set; }

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
    public void CompleteProfile(IEnumerable<string> interests, string? additionalNotes, IEnumerable<ProjectLanguage>? preferredLanguages = null)
    {
        // Valida antes de mexer em qualquer campo: linguagem invalida nao pode deixar o perfil
        // meio atualizado.
        var languages = preferredLanguages?.Distinct().OrderBy(l => l).ToList();
        if (languages is not null && languages.Any(l => !Enum.IsDefined(l)))
            throw new DomainException("Linguagem invalida.", "linguagem_invalida");

        _interests.Clear();
        _interests.AddRange(interests.Select(i => i.Trim()).Where(i => i.Length > 0).Distinct());
        AdditionalProfileNotes = string.IsNullOrWhiteSpace(additionalNotes) ? null : additionalNotes.Trim();

        // Nulo = "nao mexeu nesse campo" (cliente antigo que ainda nao manda linguagens nao apaga o
        // que o aluno ja marcou); lista vazia limpa. Interesses seguem substituindo sempre.
        if (languages is not null)
        {
            _preferredLanguages.Clear();
            _preferredLanguages.AddRange(languages);
        }

        ProfileCompletedAt = DateTime.UtcNow;
    }

    /// <summary>Atribui o codigo de indicacao gerado pela Application (unicidade ja checada la contra o repositorio) - so pode ser chamado uma vez.</summary>
    public void AssignReferralCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainException("Codigo de indicacao invalido.");
        if (ReferralCode is not null)
            throw new DomainException("Este usuario ja tem um codigo de indicacao.");

        ReferralCode = code;
    }

    /// <summary>Troca o hash da senha (Fase 41, redefinicao de senha) - a Application ja validou o token de reset e a forca da nova senha antes de chamar isso; o dominio so garante que o hash recebido nao chegue vazio (mesma checagem de User.Create).</summary>
    public void SetPasswordHash(string newPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new DomainException("Hash de senha e obrigatorio.");

        PasswordHash = newPasswordHash;
    }
}
