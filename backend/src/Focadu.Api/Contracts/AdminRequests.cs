namespace Focadu.Api.Contracts;

// Fase 94, Painel de gestao (rotas /api/admin, so admin).

/// <summary>Confirmacao digitada das acoes destrutivas (e-mail do aluno no reset, nome do curso nos dias antigos).</summary>
public record AdminConfirmRequest(string? Confirmation);

public record AdminCreateInviteRequest(string? Note, int? MaxUses, int? ValidDays);

public record AdminImportDaysRequest(IReadOnlyList<int>? Days);

public record AdminSetAiPriceRequest(string? Model, decimal? InputPerMillionUsd, decimal? OutputPerMillionUsd, decimal? AudioPerHourUsd, string? Source);

public record AdminSetAiCapRequest(decimal? MonthlyCapUsd);
