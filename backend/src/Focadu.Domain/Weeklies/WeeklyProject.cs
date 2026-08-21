using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Weeklies;

/// <summary>
/// Progresso do aluno no projeto prático de uma Weekly (instância, Fase 13) - a especificação em
/// si (SpecText) virou curriculo, mora em `WeeklyTemplate.WeeklyProjectSpecText` (compartilhada
/// por todo mundo); este objeto só rastreia Status/SubmissionUrl, que são por usuário. Criado
/// eagerly (Pending) na matrícula, junto com a Weekly - ver EnrollUserInCourseUseCase.
/// </summary>
public class WeeklyProject : Entity
{
    public Guid WeeklyId { get; private set; }
    public WeeklyProjectStatus Status { get; private set; }
    public string? SubmissionUrl { get; private set; }

    private WeeklyProject()
    {
    }

    internal WeeklyProject(Guid weeklyId)
    {
        WeeklyId = weeklyId;
        Status = WeeklyProjectStatus.Pending;
    }

    public void Submit(string submissionUrl)
    {
        if (string.IsNullOrWhiteSpace(submissionUrl))
            throw new DomainException("URL de submissão é obrigatória.");
        if (Status == WeeklyProjectStatus.Evaluated)
            throw new DomainException("Não é possível reenviar um projeto já avaliado.");

        SubmissionUrl = submissionUrl;
        Status = WeeklyProjectStatus.Submitted;
    }

    public void Evaluate()
    {
        if (Status != WeeklyProjectStatus.Submitted)
            throw new DomainException("Só é possível avaliar um projeto que foi submetido.");

        Status = WeeklyProjectStatus.Evaluated;
    }
}
