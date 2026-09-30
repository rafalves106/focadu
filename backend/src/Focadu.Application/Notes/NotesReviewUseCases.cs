using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Notes;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Notes;

/// <summary>
/// Caso de uso: revisar com a IA as notas de um dia (Fase 78, Figma "Caderninho: revisao por IA — v2").
/// Por botao, sem nota nem Gems, pode repetir depois de editar. Limite de <see cref="NotesReviewRules.DailyLimit"/>
/// por dia. Vale pra Daily original e de reforco; nota de Projeto Semanal nao entra.
/// </summary>
public class ReviewDailyNotesUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly INoteRepository _noteRepository;
    private readonly INotesReviewRepository _reviewRepository;
    private readonly INotesReviewService _reviewService;
    private readonly IWeeklyTemplateRepository _weeklyTemplateRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public ReviewDailyNotesUseCase(
        IWeeklyRepository weeklyRepository, INoteRepository noteRepository, INotesReviewRepository reviewRepository,
        INotesReviewService reviewService, IUnitOfWork unitOfWork, IClock clock, IWeeklyTemplateRepository weeklyTemplateRepository)
    {
        _weeklyTemplateRepository = weeklyTemplateRepository;
        _weeklyRepository = weeklyRepository;
        _noteRepository = noteRepository;
        _reviewRepository = reviewRepository;
        _reviewService = reviewService;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<NotesReviewDto> ExecuteAsync(Guid userId, Guid dailyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var notes = (await _noteRepository.ListByUserAndContextIdsAsync(userId, [dailyId], [], cancellationToken))
            .Where(n => n.DailyId == dailyId)
            .OrderBy(n => n.CreatedAt)
            .ToList();
        if (notes.Count == 0)
            throw new ValidationException("sem_notas", "Esse dia ainda nao tem notas pra revisar.");

        var usedToday = await _reviewRepository.CountByUserSinceAsync(userId, NotesReviewRules.StartOfTodayUtc(_clock.Today()), cancellationToken);
        if (usedToday >= NotesReviewRules.DailyLimit)
            throw new ConflictException("limite_revisoes", $"Voce ja usou as {NotesReviewRules.DailyLimit} revisoes de hoje. Volta amanha.");

        var (title, material) = NotesReviewRules.Material(weekly, dailyId);
        var courseName = await _weeklyTemplateRepository.GetCourseNameAsync(weekly.Template.Id, cancellationToken);
        var result = await _reviewService.ReviewAsync(new NotesReviewRequest(title, material, notes.Select(n => n.Content).ToList(), courseName), cancellationToken);

        var review = new NotesReview(userId, dailyId, NotesReviewRules.Hash(notes), notes.Count, result.Strengths, result.Missing, result.MaterialCheck, DateTime.UtcNow);
        await _reviewRepository.AddAsync(review, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return NotesReviewDto.From(review, upToDate: true);
    }
}

/// <summary>
/// Caso de uso: as revisoes do Caderninho de um curso (Fase 78) - a mais recente de cada dia, se ainda
/// bate com as notas atuais (senao "Revisar de novo" libera), e quantas revisoes restam hoje.
/// </summary>
public class ListNotesReviewsUseCase
{
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly INoteRepository _noteRepository;
    private readonly INotesReviewRepository _reviewRepository;
    private readonly IClock _clock;

    public ListNotesReviewsUseCase(
        IEnrollmentRepository enrollmentRepository, IWeeklyRepository weeklyRepository, INoteRepository noteRepository,
        INotesReviewRepository reviewRepository, IClock clock)
    {
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _noteRepository = noteRepository;
        _reviewRepository = reviewRepository;
        _clock = clock;
    }

    public async Task<NotesReviewsDto> ExecuteAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, courseId, cancellationToken)
            ?? throw new NotFoundException("matricula_nao_encontrada", "Usuario nao esta matriculado neste curso.");
        var dailyIds = (await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken))
            .SelectMany(w => w.Dailies.Select(d => d.Id)).ToList();

        var latest = (await _reviewRepository.ListByUserAndDailyIdsAsync(userId, dailyIds, cancellationToken))
            .GroupBy(r => r.DailyId)
            .Select(g => g.OrderByDescending(r => r.CreatedAt).First())
            .ToList();
        var notesByDaily = latest.Count == 0
            ? new Dictionary<Guid, List<Note>>()
            : (await _noteRepository.ListByUserAndContextIdsAsync(userId, latest.Select(r => r.DailyId).ToList(), [], cancellationToken))
                .Where(n => n.DailyId is not null)
                .GroupBy(n => n.DailyId!.Value)
                .ToDictionary(g => g.Key, g => g.ToList());

        var reviews = latest
            .Select(r => NotesReviewDto.From(r, notesByDaily.TryGetValue(r.DailyId, out var notes) && NotesReviewRules.Hash(notes) == r.NotesHash))
            .ToList();
        var usedToday = await _reviewRepository.CountByUserSinceAsync(userId, NotesReviewRules.StartOfTodayUtc(_clock.Today()), cancellationToken);
        return new NotesReviewsDto(reviews, Math.Max(0, NotesReviewRules.DailyLimit - usedToday), NotesReviewRules.DailyLimit);
    }
}

/// <param name="UpToDate">A revisao ainda corresponde as notas atuais do dia (senao, "Revisar de novo" libera).</param>
public record NotesReviewDto(Guid DailyId, string Strengths, string Missing, string MaterialCheck, int NoteCount, DateTime CreatedAt, bool UpToDate)
{
    internal static NotesReviewDto From(NotesReview r, bool upToDate) =>
        new(r.DailyId, r.Strengths, r.Missing, r.MaterialCheck, r.NoteCount, r.CreatedAt, upToDate);
}

public record NotesReviewsDto(IReadOnlyList<NotesReviewDto> Reviews, int RemainingToday, int DailyLimit);
