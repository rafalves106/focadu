using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Seed;

/// <summary>
/// Fase 69: leva a ponte (6o dia da semana, secret/rascunhos/ponte-teoria-projeto-semanal.md) pra
/// um curso JA seedado - o seed e idempotente por curso e nao reimporta nada depois da 1a vez.
/// Roda junto do `seed` (Program.cs), em todo deploy, e e idempotente:
/// 1. Importa as variantes de ponte que estao em disco e ainda nao estao no curriculo
///    (SeedWebSecurityCourseUseCase.ImportBridge).
/// 2. Da a Daily da ponte a toda matricula cuja semana ainda nao tem - so com o projeto da semana
///    ainda Pending. Semana com projeto entregue ja passou do ponto em que a ponte ajuda, e uma
///    Daily nova e pendente nela trancaria as semanas seguintes (DailySequencing). Se o aluno ja
///    escolheu a linguagem do projeto, a Daily ja nasce na variante dela.
///
/// Serve pra migracao da Fase 69 (a ponte da Semana 1 nas matriculas que ja existiam) e pra cada
/// ponte curada daqui pra frente (semanas 2-12), sem outra migracao.
/// </summary>
public class SyncBridgeDaysUseCase
{
    private const string CourseName = "Web Security";

    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public SyncBridgeDaysUseCase(
        ICourseRepository courseRepository, IEnrollmentRepository enrollmentRepository, IWeeklyRepository weeklyRepository,
        IUnitOfWork unitOfWork, IClock clock)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<SyncBridgeDaysResult> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var course = (await _courseRepository.GetAllAsync(cancellationToken)).FirstOrDefault(c => c.Name == CourseName);
        if (course is null)
            return new SyncBridgeDaysResult(0, 0, []);

        var graph = await _courseRepository.GetFullTemplateGraphAsync(course.Id, cancellationToken)
            ?? throw new InvalidOperationException("Curso sumiu entre as duas leituras.");

        var weeklyTemplates = graph.Monthlies.SelectMany(m => m.WeeklyTemplates).ToDictionary(w => w.Id);
        var templatesCreated = weeklyTemplates.Values
            .Sum(w => SeedWebSecurityCourseUseCase.ImportBridge(w, $"semana-{w.Number}").Count);

        var today = _clock.Today();
        var dailiesAdded = 0;
        var skipped = new List<string>();

        foreach (var enrollment in await _enrollmentRepository.GetByCourseIdAsync(course.Id, cancellationToken))
        {
            foreach (var weekly in await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken))
            {
                var template = weeklyTemplates[weekly.WeeklyTemplateId];
                var bridgeDay = 6 * template.Number;
                var variants = template.DailyTemplates.Where(d => d.DayNumber == bridgeDay && d.Language is not null).ToList();
                if (variants.Count == 0) continue;
                if (weekly.Dailies.Any(d => !d.IsReinforcement && d.DayNumber == bridgeDay)) continue;
                if (weekly.Project is not { Status: WeeklyProjectStatus.Pending } project) continue;

                var variant = project.Language is { } language
                    ? variants.FirstOrDefault(v => v.Language == language) ?? variants.OrderBy(v => v.Language).First()
                    : variants.OrderBy(v => v.Language).First();

                try
                {
                    weekly.AddDaily(variant, today);
                    dailiesAdded++;
                }
                catch (DomainException ex)
                {
                    // Numero ocupado por um reforco criado antes da Fase 69 (que reserva a vaga da
                    // ponte) - nao deveria acontecer depois da renumeracao; fica registrado em vez
                    // de derrubar o deploy.
                    skipped.Add($"Weekly {weekly.Id} (Semana {template.Number}): {ex.Message}");
                }
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new SyncBridgeDaysResult(templatesCreated, dailiesAdded, skipped);
    }
}

public record SyncBridgeDaysResult(int TemplatesCreated, int DailiesAdded, IReadOnlyList<string> Skipped);
