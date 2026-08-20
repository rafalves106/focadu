namespace Focadu.Api.Contracts;

public record RegisterRequest(string? Email, string? Password, string? DisplayName);

public record LoginRequest(string? Email, string? Password);
