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

    /// <summary>Nota (0-100) da avaliação, preenchida junto com Status=Evaluated (Fase 16) - alimenta 30% do Score da Weekly (Weekly.CalculateScore). Nulo até então.</summary>
    public int? Score { get; private set; }

    /// <summary>Comentário livre do avaliador sobre o projeto (Fase 16) - só armazenado, sem uso em cálculo nenhum.</summary>
    public string? Feedback { get; private set; }

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

    /// <summary>Fase 16: passou a exigir uma nota (0-100), não só aprovar/reprovar por texto livre - é o que alimenta o Score de Estudo da Weekly.</summary>
    public void Evaluate(int score, string? feedback)
    {
        if (Status != WeeklyProjectStatus.Submitted)
            throw new DomainException("Só é possível avaliar um projeto que foi submetido.");
        if (score < 0 || score > 100)
            throw new DomainException("Score deve estar entre 0 e 100.");

        Status = WeeklyProjectStatus.Evaluated;
        Score = score;
        Feedback = string.IsNullOrWhiteSpace(feedback) ? null : feedback.Trim();
    }
}
