using Focadu.Application.Exceptions;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Notes;

/// <summary>
/// Caso de uso: histórico de notas de um Course inteiro (aba "Caderninho", Fase 29) - agrupamento
/// por Semana/Dia é responsabilidade do frontend (NoteDto já carrega WeekNumber/DayNumber por
/// nota). Note não guarda CourseId (ver Note.cs) - resolve os DailyId da Enrollment do usuario
/// pra esse Course (mesmo grafo já usado por GetCourseDetailUseCase) e filtra Notes por esse
/// conjunto, em vez de fazer join no banco - volume por curso é pequeno (dezenas de Dailies).
/// </summary>
public class ListNotesUseCase
{
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly INoteRepository _noteRepository;

    public ListNotesUseCase(IEnrollmentRepository enrollmentRepository, IWeeklyRepository weeklyRepository, INoteRepository noteRepository)
    {
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _noteRepository = noteRepository;
    }

    public async Task<IReadOnlyCollection<NoteDto>> ExecuteAsync(
        Guid userId, Guid courseId, DateOnly? from, DateOnly? to, string? searchText, string? tag,
        CancellationToken cancellationToken = default)
    {
        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, courseId, cancellationToken)
            ?? throw new NotFoundException("matricula_nao_encontrada", "Usuario nao esta matriculado neste curso.");

        var weeklies = await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken);
        var dailyContext = BuildDailyContext(weeklies);

        var notes = await _noteRepository.ListByUserAndDailyIdsAsync(userId, dailyContext.Keys.ToList(), cancellationToken);

        var query = notes.AsEnumerable();

        if (from is { } fromDate)
            query = query.Where(n => dailyContext[n.DailyId].Date >= fromDate);
        if (to is { } toDate)
            query = query.Where(n => dailyContext[n.DailyId].Date <= toDate);
        if (!string.IsNullOrWhiteSpace(searchText))
            query = query.Where(n => n.Content.Contains(searchText, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(tag))
            query = query.Where(n => n.Tags.Any(t => string.Equals(t, tag, StringComparison.OrdinalIgnoreCase)));

        return query
            .OrderByDescending(n => dailyContext[n.DailyId].Date)
            .ThenByDescending(n => n.CreatedAt)
            .Select(n =>
            {
                var context = dailyContext[n.DailyId];
                return new NoteDto(n.Id, n.DailyId, context.WeekNumber, context.DayNumber, context.Date, n.Content, n.Tags, n.CreatedAt, n.UpdatedAt);
            })
            .ToList();
    }

    private static Dictionary<Guid, (int WeekNumber, int DayNumber, DateOnly Date)> BuildDailyContext(IReadOnlyCollection<Weekly> weeklies) =>
        weeklies
            .SelectMany(w => w.Dailies.Select(d => (d.Id, Context: (WeekNumber: w.Number, d.DayNumber, d.Date))))
            .ToDictionary(x => x.Id, x => x.Context);
}
