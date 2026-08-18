using Focadu.Domain.Common;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Weeklies;

/// <summary>Projeto prático de uma Weekly, com especificação e submissão do aluno.</summary>
public class WeeklyProject : Entity
{
    public Guid WeeklyId { get; private set; }
    public string SpecText { get; private set; }
    public WeeklyProjectStatus Status { get; private set; }
    public string? SubmissionUrl { get; private set; }

    private WeeklyProject()
    {
        SpecText = string.Empty;
    }

    public WeeklyProject(Guid weeklyId, string specText)
    {
        if (string.IsNullOrWhiteSpace(specText))
            throw new DomainException("Especificação do projeto é obrigatória.");

        WeeklyId = weeklyId;
        SpecText = specText;
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
