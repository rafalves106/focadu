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

public record AdminSetAiLimitsRequest(decimal? DailyBudgetUsd, decimal? MonthlyCapUsd, string? FallbackModel);

// Fase 97, lacunas do Painel: usuarios e cursos.

public record AdminUpdateStudentRequest(string? DisplayName, string? Email);

public record AdminSetRoleRequest(bool? Admin);

/// <summary>Criar ou editar o texto do catalogo de um curso. `Name` e `Publish` so valem na criacao (o nome nunca muda).</summary>
public record AdminSaveCourseRequest(
    string? Name, string? Description, IReadOnlyList<string>? Requirements, IReadOnlyList<string>? RecommendedBefore,
    string? PreparesText, bool? OnlyForCohorts, bool? Publish);
