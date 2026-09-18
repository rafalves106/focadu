namespace Focadu.Application.Shared;

/// <summary>
/// Compartilhado entre GetCourseDetailUseCase (dentro de MonthlyOverviewDto) e GetWeeklyDetailUseCase
/// (dentro de WeeklyDetailDto) - mesma cobertura de certificacao de mercado de um Monthly, exposta
/// nos dois lugares onde o frontend precisa dela (Fase 45).
/// </summary>
public record CertificationCoverageDto(
    string CertificationCode,
    string CertificationName,
    string Certifier,
    string CoveredDomains);
