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
///
/// Fase 57: `dailyId` opcional restringe as notas a uma sessao (a Daily + o dia base dela, se for
/// reforco - ver NoteDailyScope) em vez do recorte por data que "Suas anotacoes de hoje" usava.
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
        Guid? dailyId = null, CancellationToken cancellationToken = default)
    {
        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, courseId, cancellationToken)
            ?? throw new NotFoundException("matricula_nao_encontrada", "Usuario nao esta matriculado neste curso.");

        var weeklies = await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken);
        var weeklyByDaily = weeklies.SelectMany(w => w.Dailies.Select(d => (d.Id, w))).ToDictionary(x => x.Id, x => x.w);
        var weeklyByProject = weeklies.Where(w => w.Project is not null).ToDictionary(w => w.Project!.Id);

        var notes = await _noteRepository.ListByUserAndContextIdsAsync(
            userId, weeklyByDaily.Keys.ToList(), weeklyByProject.Keys.ToList(), cancellationToken);

        // Fase 63: nota de Daily ou de Projeto Semanal - NoteDto.From resolve Semana/Dia/data dos dois.
        var query = notes.Select(n => NoteDto.From(n, n.DailyId is { } d ? weeklyByDaily[d] : weeklyByProject[n.WeeklyProjectId!.Value]));

        if (dailyId is { } scopedDailyId)
        {
            // Escopo de uma sessao (Fase 57) - nota de projeto nunca entra (nao e de Daily nenhuma).
            var scope = NoteDailyScope.Resolve(weeklies, scopedDailyId);
            query = query.Where(n => n.DailyId is { } d && scope.Contains(d));
        }

        if (from is { } fromDate)
            query = query.Where(n => n.DailyDate >= fromDate);
        if (to is { } toDate)
            query = query.Where(n => n.DailyDate <= toDate);
        if (!string.IsNullOrWhiteSpace(searchText))
            query = query.Where(n => n.Content.Contains(searchText, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(tag))
            query = query.Where(n => n.Tags.Any(t => string.Equals(t, tag, StringComparison.OrdinalIgnoreCase)));

        return query
            .OrderByDescending(n => n.DailyDate)
            .ThenByDescending(n => n.CreatedAt)
            .ToList();
    }
}
