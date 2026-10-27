using System.Text;
using System.Text.RegularExpressions;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso: gera o rascunho de post do LinkedIn pra prova de aprendizado do modulo (Fase 11).
/// Gerado so quando o aluno escolhe publicar, entao sai do que ele fez de verdade.
///
/// Fase 106: o prompt deixou de usar so o tema e 3 titulos de leitura com "trilha de seguranca web" fixo. Agora leva o
/// nome do curso (Fase 85), o que cada dia da semana ensinou (titulo do material e os pontos de "O que levar daqui"), o
/// objetivo do Projeto Semanal e o comentario da avaliacao do projeto do aluno. A nota fica de fora, e o prompt manda
/// usar so o que deu certo: o post e publico e nao deve expor erro de uma tentativa.
///
/// Fase 27: tambem injeta `Interests`/`AdditionalProfileNotes` do usuario (PersonalizationPromptBuilder) - o rascunho
/// pode puxar um gancho pessoal. Sem perfil preenchido, o bloco some.
/// </summary>
public class GenerateLinkedInDraftUseCase
{
    private const int MaxTakeawaysPerDay = 3;
    private const int MaxFeedbackLength = 1200;
    private const int MaxObjectiveLength = 600;

    /// <summary>Fase 107: limites dos campos da imagem de conclusao (modelo do Figma); o front quebra a linha, nao corta.</summary>
    internal const int ImageHighlightCount = 3;
    internal const int MaxHighlightLength = 70;
    internal const int MaxProjectTitleLength = 50;

    private readonly IAiUsageContext _aiUsage;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDraftGenerationService _draftGenerationService;
    private readonly PersonalizationOptions _personalization;

    public GenerateLinkedInDraftUseCase(
        IWeeklyRepository weeklyRepository, IEnrollmentRepository enrollmentRepository, ICourseRepository courseRepository,
        IUserRepository userRepository, IUnitOfWork unitOfWork, IDraftGenerationService draftGenerationService,
        PersonalizationOptions personalization, IAiUsageContext aiUsage)
    {
        _aiUsage = aiUsage;
        _personalization = personalization;
        _weeklyRepository = weeklyRepository;
        _enrollmentRepository = enrollmentRepository;
        _courseRepository = courseRepository;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _draftGenerationService = draftGenerationService;
    }

    public async Task<ModulePublicationDto> ExecuteAsync(Guid userId, Guid weeklyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var enrollment = (await _enrollmentRepository.GetByUserIdAsync(userId, cancellationToken)).FirstOrDefault(e => e.Id == weekly.EnrollmentId);
        var course = enrollment is null ? null : await _courseRepository.GetByIdAsync(enrollment.CourseId, cancellationToken);
        var courseName = course?.Name;
        var totalWeeks = course?.Monthlies.Sum(m => m.WeeklyTemplates.Count) ?? 0;

        // Um item por dia, na ordem: titulo do material (Leitura, ou Video) e os pontos de "O que levar daqui".
        var contentById = weekly.Template.CuratedContents.ToDictionary(c => c.Id);
        var days = weekly.Dailies
            .Where(d => !d.IsReinforcement)
            .OrderBy(d => d.DayNumber)
            .Select(d => (d.Activities.FirstOrDefault(a => a.Type == ActivityType.Reading) ?? d.Activities.FirstOrDefault(a => a.Type == ActivityType.Video))?.ContentId)
            .Where(id => id is not null && contentById.ContainsKey(id.Value))
            .Select(id => contentById[id!.Value])
            .DistinctBy(c => c.Id)
            .Select(c => new WeekDay(c.Title, ExtractTakeaways(c.BodyText)))
            .ToList();

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        var personalization = PersonalizationPromptBuilder.BuildInstruction(_personalization.Interests(user?.Interests), _personalization.Notes(user?.AdditionalProfileNotes));

        var prompt = BuildPrompt(
            courseName, weekly.Theme ?? weekly.Title, days,
            ExtractObjective(weekly.Template.WeeklyProjectSpecText), Truncate(weekly.Project?.Feedback, MaxFeedbackLength),
            personalization);
        // Fase 94: Medicao de IA anota aluno e dia/semana desta chamada.
        await _aiUsage.EnsureBudgetAsync(userId, cancellationToken);
        using var aiUsage = _aiUsage.Begin(userId, weeklyId: weeklyId);
        var draft = await _draftGenerationService.GenerateAsync(prompt, cancellationToken);

        var publication = weekly.StartPublication();
        publication.GenerateDraft(draft.Post);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Fase 107: campos da imagem de conclusao; sem projeto na semana, o nome do projeto some.
        var image = new PublicationImageDto(
            courseName, weekly.Number, Math.Max(totalWeeks, weekly.Number), weekly.Theme ?? weekly.Title,
            NormalizeHighlights(draft.Highlights, days),
            weekly.Project is null ? null : ClampAtWord(draft.ProjectTitle, MaxProjectTitleLength));

        return new ModulePublicationDto(
            weeklyId, publication.Status, publication.Platform, publication.SubmittedUrl, publication.GeneratedDraft, publication.ValidationError,
            image);
    }

    internal record WeekDay(string Title, IReadOnlyList<string> Takeaways);

    internal static string BuildPrompt(
        string? courseName, string theme, IReadOnlyList<WeekDay> days, string? projectObjective, string? projectFeedback, string? personalization)
    {
        var sb = new StringBuilder();
        var curso = string.IsNullOrWhiteSpace(courseName) ? "um curso da Focadu" : $"o curso \"{courseName}\" da Focadu";
        sb.Append("Escreva em português um post de LinkedIn, em primeira pessoa e tom pessoal, contando que acabei de fechar ")
          .Append($"a semana \"{theme}\" de {curso}.");

        if (days.Count > 0)
        {
            sb.Append("\n\nO que estudei, dia a dia:");
            foreach (var day in days)
            {
                sb.Append($"\n- {day.Title}");
                if (day.Takeaways.Count > 0) sb.Append(": ").Append(string.Join(" ", day.Takeaways));
            }
        }

        if (!string.IsNullOrWhiteSpace(projectObjective))
            sb.Append("\n\nNo fim da semana entreguei um projeto prático. Objetivo do projeto: ").Append(projectObjective);
        if (!string.IsNullOrWhiteSpace(projectFeedback))
            sb.Append("\n\nComentário da avaliação do meu projeto (use só o que deu certo; nunca cite erro, ponto fraco ou nota): ")
              .Append(projectFeedback);
        if (personalization is not null) sb.Append("\n\n").Append(personalization);

        sb.Append("\n\nEscolha 2 ou 3 coisas concretas do que estudei e do projeto, explique em palavras simples por que importam ")
          .Append("e conte o que eu construí. Sem soar corporativo, sem inventar nada que não esteja acima e sem citar a nota. ")
          .Append("No máximo 3 parágrafos curtos, até 1200 caracteres, e termine com 2 a 4 hashtags ligadas ao assunto do curso.");
        return sb.ToString();
    }

    /// <summary>Os pontos da lista em "### O que levar daqui" do texto do dia (molde v1), sem o numero.</summary>
    internal static IReadOnlyList<string> ExtractTakeaways(string? body)
    {
        if (string.IsNullOrEmpty(body)) return [];
        var match = Regex.Match(body, @"^#+\s*O que levar daqui\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
        if (!match.Success) return [];
        return body[(match.Index + match.Length)..]
            .Split('\n')
            .Select(l => l.Trim())
            .TakeWhile(l => !l.StartsWith('#'))
            .Select(l => Regex.Match(l, @"^(?:\d+[.)]|[-*])\s+(.+)$"))
            .Where(m => m.Success)
            .Select(m => m.Groups[1].Value.Trim())
            .Take(MaxTakeawaysPerDay)
            .ToList();
    }

    /// <summary>O primeiro paragrafo da secao "### Objetivo" do enunciado (projeto.json, specText), ou o comeco do texto.</summary>
    internal static string? ExtractObjective(string? spec)
    {
        if (string.IsNullOrWhiteSpace(spec)) return null;
        var match = Regex.Match(spec, @"^#+\s*Objetivo\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
        var rest = match.Success ? spec[(match.Index + match.Length)..] : spec;
        var paragraph = rest.Split("\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault(p => !p.StartsWith('#'));
        return Truncate(paragraph, MaxObjectiveLength);
    }

    /// <summary>
    /// Fase 107: exatamente 3 destaques que cabem na imagem. Os da Focada vem primeiro; se ela devolver menos, completa
    /// com o 1o ponto de "O que levar daqui" dos dias; sem nada disso, com o titulo do dia.
    /// </summary>
    internal static IReadOnlyList<string> NormalizeHighlights(IReadOnlyList<string> fromAi, IReadOnlyList<WeekDay> days)
    {
        var fallback = days.Select(d => d.Takeaways.FirstOrDefault() ?? d.Title);
        return fromAi.Concat(fallback)
            .Select(h => ClampAtWord(h.Trim().TrimEnd('.'), MaxHighlightLength))
            .OfType<string>()
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(ImageHighlightCount)
            .ToList();
    }

    /// <summary>Corta no ultimo espaco antes do limite (sem reticencias, a imagem nao comporta); nulo/vazio vira nulo.</summary>
    internal static string? ClampAtWord(string? text, int max)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var trimmed = text.Trim();
        if (trimmed.Length <= max) return trimmed;
        var cut = trimmed[..max];
        var space = cut.LastIndexOf(' ');
        return (space > max / 2 ? cut[..space] : cut).TrimEnd(' ', ',', ';', ':', '-');
    }

    private static string? Truncate(string? text, int max) =>
        string.IsNullOrWhiteSpace(text) ? null : text.Length <= max ? text.Trim() : text[..max].TrimEnd() + "...";
}
