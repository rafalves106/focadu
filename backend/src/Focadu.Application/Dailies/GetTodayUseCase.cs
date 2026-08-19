using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: atalho "/hoje" - resolve direto a Daily de hoje, sem o cliente precisar informar
/// course/weekly/daily. Como o dominio ainda nao tem conceito de usuario/curso "atual" (fora de
/// escopo ate agora), a resolucao assume exatamente um Course com Status = Active; zero ou mais
/// de um curso ativo e tratado como erro (ver docs/ARQUITETURA.md para o raciocinio completo).
/// </summary>
public class GetTodayUseCase
{
    private readonly ICourseRepository _courseRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IClock _clock;

    public GetTodayUseCase(ICourseRepository courseRepository, IWeeklyRepository weeklyRepository, IClock clock)
    {
        _courseRepository = courseRepository;
        _weeklyRepository = weeklyRepository;
        _clock = clock;
    }

    public async Task<DailyStateDto> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var courses = await _courseRepository.GetAllAsync(cancellationToken);
        var activeCourses = courses.Where(c => c.Status == CourseStatus.Active).ToList();

        if (activeCourses.Count == 0)
            throw new NotFoundException("nenhum_curso_ativo", "Nenhum curso ativo encontrado.");

        if (activeCourses.Count > 1)
        {
            throw new ConflictException(
                "multiplos_cursos_ativos",
                "Mais de um curso ativo encontrado; use /api/courses/{courseId} para escolher qual.");
        }

        var today = _clock.Today();
        var weekly = await _weeklyRepository.GetByDateAsync(activeCourses[0].Id, today, cancellationToken)
            ?? throw new NotFoundException("daily_hoje_nao_encontrada", "Nenhuma Daily cadastrada para hoje.");

        var daily = weekly.GetDailyByDate(today)
            ?? throw new NotFoundException("daily_hoje_nao_encontrada", "Nenhuma Daily cadastrada para hoje.");
        var accessMode = weekly.EvaluateDailyAccess(daily.Id, today);

        return DailyStateMapper.ToDto(daily, accessMode);
    }
}
