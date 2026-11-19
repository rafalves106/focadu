using Focadu.Application.Dailies;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Rooms;
using Focadu.Application.Shared;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Courses;
using Focadu.Domain.Weeklies;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Courses;

/// <summary>
/// Caso de uso: detalhe de um curso (suporta "/start?course=") - conclusao, visao geral de cada
/// Monthly/WeeklyTemplate, e as sessoes de reforco (diario e semanal) disparadas ate agora no
/// curso. Fase 13: course.Monthlies.WeeklyTemplates e curriculo (igual pra todo mundo) - o
/// progresso real (Status/reforcos/conclusao) vem das Weeklies-instancia da Enrollment do usuario
/// logado, casadas por WeeklyTemplateId.
/// </summary>
public class GetCourseDetailUseCase
{
    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IRoomRepository _roomRepository;
    private readonly IRoomProgressRepository _roomProgressRepository;
    private readonly IClock _clock;

    public GetCourseDetailUseCase(
        ICourseRepository courseRepository, IEnrollmentRepository enrollmentRepository, IWeeklyRepository weeklyRepository,
        IRoomRepository roomRepository, IRoomProgressRepository roomProgressRepository, IClock clock)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _roomRepository = roomRepository;
        _roomProgressRepository = roomProgressRepository;
        _clock = clock;
    }

    public async Task<CourseDetailDto> ExecuteAsync(Guid userId, Guid courseId, CancellationToken cancellationToken = default)
    {
        var course = await _courseRepository.GetByIdAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("curso_nao_encontrado", "Curso nao encontrado.");

        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, courseId, cancellationToken)
            ?? throw new NotFoundException("matricula_nao_encontrada", "Usuario nao esta matriculado neste curso.");

        var instanceWeeklies = await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken);
        var weeklyByTemplateId = instanceWeeklies.ToDictionary(w => w.WeeklyTemplateId);
        var nextDailyId = DailySequencing.FindNext(instanceWeeklies)?.Id;
        var today = _clock.Today();
        var sessionRoomOf = await LoadSessionRoomsAsync(userId, course, instanceWeeklies, cancellationToken);

        // Fase 115: curso em sessoes, o reforco nascido hoje so aparece amanha (SessionRules.IsReinforcementOpen).
        var dailyById = instanceWeeklies.SelectMany(w => w.Dailies).ToDictionary(d => d.Id);
        bool Visible(Daily reinforcement) =>
            course.StudyFormat != StudyFormat.Sessions || reinforcement.Status is not (DailyStatus.Locked or DailyStatus.Available)
            || SessionRules.IsReinforcementOpen(reinforcement, today);
        Guid? VisibleReinforcementOf(Daily daily) =>
            daily.ReinforcementDailyId is { } id && dailyById.TryGetValue(id, out var r) && !Visible(r) ? null : daily.ReinforcementDailyId;

        var monthlyDtos = new List<MonthlyOverviewDto>();
        var dailyReinforcements = new List<DailyReinforcementSummaryDto>();
        var weeklyReinforcements = new List<WeeklyReinforcementSummaryDto>();
        var totalDailies = 0;
        var completedDailies = 0;
        var reinforcementDailies = 0;

        foreach (var monthly in course.Monthlies.OrderBy(m => m.Number))
        {
            var weeklyDtos = new List<WeeklyOverviewDto>();

            foreach (var weeklyTemplate in monthly.WeeklyTemplates.OrderBy(w => w.Number))
            {
                // So deveria faltar se a matricula estiver no meio da criacao (nunca deveria
                // acontecer em uso normal - EnrollUserInCourseUseCase cria 1 Weekly por
                // WeeklyTemplate atomicamente) - pular em vez de derrubar a tela inteira.
                if (!weeklyByTemplateId.TryGetValue(weeklyTemplate.Id, out var weekly))
                    continue;

                var weeklyTotal = weekly.Dailies.Count;
                var weeklyCompleted = weekly.Dailies.Count(d => d.Status == Domain.Enums.DailyStatus.Completed);
                var weeklyWeak = weekly.GetWeakDailies().Count;

                // Fase 65 (mapa da trilha): titulo do dia - mesma regra de GetWeeklyDetailUseCase (Leitura,
                // ou Video se nao houver Leitura; Daily nao tem titulo proprio).
                var contentTitleById = weekly.Template.CuratedContents.ToDictionary(c => c.Id, c => c.Title);
                string? ResolveDailyTitle(Daily daily)
                {
                    // Fase 69: a ponte antes da escolha da linguagem ainda aponta pra variante padrao - o
                    // titulo dela seria o da linguagem errada.
                    if (daily.RequiresProjectLanguage && weekly.Project?.Language is null)
                        return "Ponte pro projeto";

                    var material = daily.Activities.FirstOrDefault(a => a.Type == ActivityType.Reading)
                        ?? daily.Activities.FirstOrDefault(a => a.Type == ActivityType.Video);
                    return material?.ContentId is { } contentId ? contentTitleById.GetValueOrDefault(contentId) : null;
                }

                var dayDtos = weekly.Dailies
                    .OrderBy(d => d.DayNumber)
                    .Select(d => new DailyStatusSummaryDto(
                        d.Id, d.DayNumber, d.Date, d.Status, d.IsReinforcement,
                        d.Activities.Count, d.Activities.Count(a => d.Responses.Any(r => r.ActivityId == a.Id)),
                        ResolveDailyTitle(d),
                        d.Id == nextDailyId,
                        VisibleReinforcementOf(d),
                        // CompletedAt e UTC; "today" e hora local (IClock) - mesma conversao de Weekly.EvaluateDailyAccess.
                        d.CompletedAt.HasValue && DateOnly.FromDateTime(d.CompletedAt.Value.ToLocalTime()) == today,
                        d.Template.IsBridge,
                        d.IsReinforcement ? null : sessionRoomOf(d)))
                    .ToList();

                weeklyDtos.Add(new WeeklyOverviewDto(
                    weekly.Id, weekly.Number, weekly.Title, weekly.Theme,
                    weeklyTotal, weeklyCompleted, weeklyWeak, weekly.Reinforcements.Count > 0, dayDtos,
                    weekly.RequiresPublicationToUnlock(),
                    DailySequencing.FindPendingClosureBefore(instanceWeeklies, weekly) is not null,
                    weekly.Project?.Status, weekly.Template.IsPracticeOnly, weekly.IsModuleComplete()));

                totalDailies += weeklyTotal;
                completedDailies += weeklyCompleted;
                reinforcementDailies += weekly.Dailies.Count(d => d.IsReinforcement);

                dailyReinforcements.AddRange(weekly.Dailies
                    .Where(d => d.IsReinforcement && Visible(d))
                    .Select(d => new DailyReinforcementSummaryDto(d.Id, weekly.Id, d.DayNumber, d.Date, d.Activities.Count)));

                weeklyReinforcements.AddRange(weekly.Reinforcements
                    .Select(r => new WeeklyReinforcementSummaryDto(r.Id, weekly.Id, r.TriggeredAt, r.WeakDailyIds)));
            }

            var certificationDtos = monthly.CertificationCoverages
                .Select(c => new CertificationCoverageDto(c.CertificationCode, c.CertificationName, c.Certifier, c.CoveredDomains))
                .ToList();

            monthlyDtos.Add(new MonthlyOverviewDto(monthly.Id, monthly.Number, monthly.Title, weeklyDtos, certificationDtos));
        }

        var completionPercentage = totalDailies == 0 ? 0d : Math.Round(100d * completedDailies / totalDailies, 1);
        var progress = new CourseProgressDto(totalDailies, completedDailies, reinforcementDailies, completionPercentage);

        return new CourseDetailDto(
            course.Id, course.Name, course.Status, progress,
            monthlyDtos, dailyReinforcements, weeklyReinforcements, course.StudyFormat, course.SessionsPerDay);
    }

    /// <summary>
    /// Fase 112: a sala de cada sessão, com o mesmo status da lista de salas (RoomMapper). Curso Daily não lê sala
    /// nenhuma e devolve sempre nulo.
    /// </summary>
    private async Task<Func<Daily, DailySessionRoomDto?>> LoadSessionRoomsAsync(
        Guid userId, Course course, IReadOnlyCollection<Domain.Weeklies.Weekly> weeklies, CancellationToken cancellationToken)
    {
        if (course.StudyFormat != StudyFormat.Sessions)
            return _ => null;

        var rooms = await _roomRepository.ListByCourseAsync(course.Id, cancellationToken);
        if (rooms.Count == 0)
            return _ => null;
        var progresses = await _roomProgressRepository.ListByUserAsync(userId, rooms.Select(r => r.Id).ToList(), cancellationToken);
        var unlocks = new RoomUnlocks(RoomMapper.ReachedWeeks(weeklies), RoomMapper.SessionRooms(weeklies));
        var bySlug = rooms.ToDictionary(
            r => r.Slug,
            r => new DailySessionRoomDto(r.Id, r.Title,
                RoomMapper.StatusOf(progresses.FirstOrDefault(p => p.RoomId == r.Id), RoomMapper.LockOf(r, rooms, progresses, unlocks))));
        return d => d.Template.SessionRoomSlug is { } slug ? bySlug.GetValueOrDefault(slug) : null;
    }
}
