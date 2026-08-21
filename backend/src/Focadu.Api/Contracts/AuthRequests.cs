namespace Focadu.Api.Contracts;

/// <summary>ReferralCode (Fase 17) e opcional - codigo invalido/de ninguem so e ignorado, nunca bloqueia o registro.</summary>
public record RegisterRequest(string? Email, string? Password, string? DisplayName, string? ReferralCode);

public record LoginRequest(string? Email, string? Password);
