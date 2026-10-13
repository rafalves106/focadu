namespace Focadu.Api.Contracts;

// Fase 94, Painel de gestao (rotas /api/admin, so admin).

/// <summary>Confirmacao digitada das acoes destrutivas (e-mail do aluno no reset, nome do curso nos dias antigos).</summary>
public record AdminConfirmRequest(string? Confirmation);

/// <param name="CohortId">Fase 96: convite de turma (nulo = sem turma).</param>
public record AdminCreateInviteRequest(string? Note, int? MaxUses, int? ValidDays, string? CohortId = null);

/// <summary>Fase 96: criar ou editar turma.</summary>
public record AdminSaveCohortRequest(string? Name, IReadOnlyList<Guid>? CourseIds);

/// <summary>Fase 96: "So pra turmas" (true) ou "Visivel pra todos" (false).</summary>
public record AdminCourseVisibilityRequest(bool? OnlyForCohorts);

public record AdminImportDaysRequest(IReadOnlyList<int>? Days);

public record AdminSetAiPriceRequest(string? Model, decimal? InputPerMillionUsd, decimal? OutputPerMillionUsd, decimal? AudioPerHourUsd, string? Source);

public record AdminSetAiCapRequest(decimal? MonthlyCapUsd);
