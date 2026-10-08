using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Users;

/// <summary>
/// Convite de tester (Fase 93, cadastro so com convite no teste fechado). O dono gera pelo comando
/// `convite` da Api e manda o codigo (ou o link /login?convite=CODIGO) pra pessoa. Com a chave
/// Signup:InviteOnly ligada, o registro so passa com um convite que ainda vale. Revogar nunca apaga a
/// linha: ela responde "quem entrou com qual convite".
/// </summary>
public class SignupInvite : Entity
{
    public string Code { get; private set; }

    /// <summary>Pra quem foi o convite (anotacao livre do dono, ex.: o nome do tester).</summary>
    public string Note { get; private set; }

    public int MaxUses { get; private set; }
    public int UsedCount { get; private set; }

    /// <summary>Nulo = nao vence.</summary>
    public DateTime? ExpiresAt { get; private set; }

    public DateTime? RevokedAt { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private SignupInvite()
    {
        Code = string.Empty;
        Note = string.Empty;
    }

    private SignupInvite(string code, string note, int maxUses, DateTime? expiresAt)
    {
        Code = code;
        Note = note;
        MaxUses = maxUses;
        ExpiresAt = expiresAt;
        CreatedAt = DateTime.UtcNow;
    }

    public static SignupInvite Create(string code, string note, int maxUses, DateTime? expiresAt)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainException("Codigo do convite e obrigatorio.");

        if (string.IsNullOrWhiteSpace(note))
            throw new DomainException("Diga pra quem e o convite.", "convite_sem_anotacao");

        if (maxUses < 1)
            throw new DomainException("O convite precisa valer pra pelo menos 1 cadastro.", "convite_usos_invalidos");

        return new SignupInvite(code.Trim().ToUpperInvariant(), note.Trim(), maxUses, expiresAt);
    }

    /// <summary>
    /// Valida (nao revogado, nao vencido, com uso sobrando) e gasta 1 uso na mesma chamada. A ordem dos
    /// testes decide o code de erro; a mensagem pro aluno e a mesma nos tres (nao ajuda quem tenta
    /// adivinhar codigo), so o code diferencia pro log.
    /// </summary>
    public void Consume(DateTime now)
    {
        if (RevokedAt is not null)
            throw new DomainException(InvalidMessage, "convite_invalido");

        if (ExpiresAt is not null && now >= ExpiresAt)
            throw new DomainException(InvalidMessage, "convite_expirado");

        if (UsedCount >= MaxUses)
            throw new DomainException(InvalidMessage, "convite_esgotado");

        UsedCount++;
    }

    public void Revoke(DateTime now) => RevokedAt ??= now;

    public const string InvalidMessage = "Esse convite nao vale mais, peca outro.";
}
