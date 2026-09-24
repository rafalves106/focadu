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

    /// <summary>
    /// Linguagem que o aluno escolheu pra realizar este projeto (Fase 59). Nula ate a escolha - e
    /// pra sempre nula em semana sem variantes de linguagem, e em projeto que ja nasceu antes da
    /// Fase 59 (fork unico, sem linguagem). Definitiva: e o repositorio da linguagem que a
    /// plataforma disponibiliza, e a avaliacao le esse repositorio.
    /// </summary>
    public ProjectLanguage? Language { get; private set; }

    /// <summary>
    /// Fase 69: quando o projeto foi avaliado (UTC). Junto com ModulePublication.ValidatedAt, marca
    /// quando a semana fechou - o fim da pausa da ofensiva (StreakPauseWindows). Nulo nos projetos
    /// avaliados antes da Fase 69 (a pausa deles ja passou e nao importa mais).
    /// </summary>
    public DateTime? EvaluatedAt { get; private set; }

    private WeeklyProject()
    {
    }

    internal WeeklyProject(Guid weeklyId)
    {
        WeeklyId = weeklyId;
        Status = WeeklyProjectStatus.Pending;
    }

    /// <summary>
    /// Anexa a URL do repositorio ja provisionado pela Focadu (fork no Forgejo interno, ver
    /// EnrollUserInCourseUseCase) - so seta SubmissionUrl, NAO muda Status (o repo ja existe, mas
    /// o aluno ainda nao "entregou" o trabalho). So pode ser chamado uma vez, com o projeto ainda
    /// Pending - diferente de Submit(), que e o aluno afirmando "terminei".
    /// </summary>
    public void AttachRepository(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            throw new DomainException("URL do repositorio e obrigatoria.");
        if (Status != WeeklyProjectStatus.Pending)
            throw new DomainException("So e possivel anexar um repositorio a um projeto ainda pendente.");
        if (SubmissionUrl is not null)
            throw new DomainException("Este projeto ja tem um repositorio anexado.");

        SubmissionUrl = url;
    }

    /// <summary>
    /// Fixa a linguagem do projeto e o repositorio dela (Fase 59) - so uma vez, com o projeto
    /// Pending. Substitui SubmissionUrl de proposito: um projeto sem linguagem que ja tinha fork
    /// (o fork unico de antes da Fase 59) passa a usar o repositorio da linguagem escolhida. Nunca
    /// troca depois de escolhida.
    /// </summary>
    public void ChooseLanguage(ProjectLanguage language, string repositoryUrl)
    {
        if (!Enum.IsDefined(language))
            throw new DomainException("Linguagem invalida.", "linguagem_invalida");
        if (Language is not null)
            throw new DomainException("A linguagem deste projeto ja foi escolhida e nao pode ser trocada.", "linguagem_ja_escolhida");
        if (Status != WeeklyProjectStatus.Pending)
            throw new DomainException("So e possivel escolher a linguagem de um projeto ainda pendente.", "projeto_nao_pendente");
        if (string.IsNullOrWhiteSpace(repositoryUrl))
            throw new DomainException("URL do repositorio e obrigatoria.");

        Language = language;
        SubmissionUrl = repositoryUrl;
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
        EvaluatedAt = DateTime.UtcNow;
        Score = score;
        Feedback = string.IsNullOrWhiteSpace(feedback) ? null : feedback.Trim();
    }
}
