using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Users;

/// <summary>
/// Codigo de 6 digitos que confirma o e-mail da conta (Fase 93). A conta nasce sem e-mail confirmado e
/// fica presa na tela "Confira seu e-mail" ate digitar o codigo; contas antigas caem na mesma tela no
/// proximo login. So o hash e guardado (mesmo raciocinio de PasswordResetToken). Vale 15 minutos e
/// aceita poucas tentativas: com 6 digitos, o que segura chute e o limite, nao a entropia.
/// So o codigo mais recente do usuario vale - pedir outro aposenta os anteriores.
/// </summary>
public class EmailVerificationCode : Entity
{
    public const int MaxAttempts = 5;

    public Guid UserId { get; private set; }
    public string CodeHash { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public int FailedAttempts { get; private set; }
    public DateTime? UsedAt { get; private set; }

    private EmailVerificationCode()
    {
        CodeHash = string.Empty;
    }

    private EmailVerificationCode(Guid userId, string codeHash, DateTime createdAt, DateTime expiresAt)
    {
        UserId = userId;
        CodeHash = codeHash;
        CreatedAt = createdAt;
        ExpiresAt = expiresAt;
    }

    public static EmailVerificationCode Create(Guid userId, string codeHash, DateTime createdAt, DateTime expiresAt)
    {
        if (string.IsNullOrWhiteSpace(codeHash))
            throw new DomainException("Hash do codigo e obrigatorio.");

        return new EmailVerificationCode(userId, codeHash, createdAt, expiresAt);
    }

    /// <summary>Ainda da pra tentar este codigo (nao usado, nao vencido, tentativas sobrando).</summary>
    public bool IsUsable(DateTime now) => UsedAt is null && now < ExpiresAt && FailedAttempts < MaxAttempts;

    /// <summary>
    /// Confere o hash do que o aluno digitou. Errou: conta a tentativa e lanca `codigo_invalido` (ou
    /// `codigo_bloqueado` na ultima). Certo: marca UsedAt. Quem chama precisa salvar mesmo no erro, senao a
    /// tentativa errada nao conta.
    /// </summary>
    public bool TryConsume(string typedCodeHash, DateTime now)
    {
        if (UsedAt is not null || now >= ExpiresAt)
            throw new DomainException("Esse codigo venceu. Peca um novo.", "codigo_expirado");

        if (FailedAttempts >= MaxAttempts)
            throw new DomainException("Muitas tentativas erradas. Peca um novo codigo.", "codigo_bloqueado");

        if (!string.Equals(typedCodeHash, CodeHash, StringComparison.Ordinal))
        {
            FailedAttempts++;
            return false;
        }

        UsedAt = now;
        return true;
    }
}
