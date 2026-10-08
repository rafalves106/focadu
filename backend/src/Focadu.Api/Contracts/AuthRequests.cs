namespace Focadu.Api.Contracts;

/// <summary>ReferralCode (Fase 17) e opcional - codigo invalido/de ninguem so e ignorado, nunca bloqueia o registro.</summary>
public record RegisterRequest(string? Email, string? Password, string? DisplayName, string? ReferralCode, string? InviteCode = null);

public record LoginRequest(string? Email, string? Password);

/// <summary>Fase 41 - resposta e sempre 200 mesmo quando o email nao existe (RequestPasswordResetUseCase nunca revela isso).</summary>
public record ForgotPasswordRequest(string? Email);

public record ResetPasswordRequest(string? Token, string? NewPassword);

/// <summary>Fase 93: codigo de 6 digitos que chegou no e-mail.</summary>
public record ConfirmEmailRequest(string? Code);

/// <summary>Fase 93: `Force` = botao "Reenviar codigo"; sem ele, so manda se o aluno nao tem codigo valendo.</summary>
public record SendEmailVerificationRequest(bool Force);
