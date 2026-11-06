using Focadu.Application.Ports;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Seed;

/// <summary>
/// Leva os dias novos de um curso as matriculas que ja existem: a Daily entra na Weekly da semana certa, e a
/// Weekly e criada se a semana for nova. Compartilhado pelo seed dos cursos curados (Fase 81) e pelo importador
/// de dias (plano de curadoria, 02/10/2026).
/// </summary>
public class CuratedEnrollmentSync
{
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IClock _clock;

    public CuratedEnrollmentSync(IEnrollmentRepository enrollmentRepository, IWeeklyRepository weeklyRepository, IClock clock)
    {
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _clock = clock;
    }

    public async Task<(int DailiesAdded, List<string> Skipped)> SyncAsync(
        Guid courseId, IReadOnlyList<CreatedDay> created, CancellationToken cancellationToken)
    {
        var newByWeek = created.GroupBy(c => c.Week).ToList();
        var today = _clock.Today();
        var added = 0;
        var skipped = new List<string>();

        foreach (var enrollment in await _enrollmentRepository.GetByCourseIdAsync(courseId, cancellationToken))
        {
            var weeklies = (await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken)).ToList();
            foreach (var group in newByWeek)
            {
                var template = group.Key;
                var weekly = weeklies.FirstOrDefault(w => w.WeeklyTemplateId == template.Id);
                if (weekly is null)
                {
                    weekly = new Weekly(enrollment.Id, template, today);
                    // Sem isso a semana nasce sem projeto e nada segura a proxima (bug real, 06/11/2026: Daily 12 -> Daily 13).
                    if (!template.IsPracticeOnly) weekly.InitializeProject();
                    await _weeklyRepository.AddAsync(weekly, cancellationToken);
                    weeklies.Add(weekly);
                }

                foreach (var dailyTemplate in group.Select(c => c.Day).OrderBy(d => d.DayNumber))
                {
                    try
                    {
                        weekly.AddDaily(dailyTemplate, today);
                        added++;
                    }
                    catch (DomainException ex)
                    {
                        // Numero ocupado (ex.: um reforco) - registra em vez de derrubar o deploy.
                        skipped.Add($"Weekly {weekly.Id} (Dia {dailyTemplate.DayNumber}): {ex.Message}");
                    }
                }
            }
        }
        return (added, skipped);
    }

    /// <summary>
    /// Cria o projeto das Weeklies de matricula que ficaram sem (semana criada por este sync antes de ele iniciar o
    /// projeto). Sem projeto, Weekly.RequiresProjectToUnlock e falso e o aluno passa direto da ultima Daily da semana
    /// pra primeira da seguinte. Idempotente: so toca Weekly sem projeto e que nao seja so de pratica.
    /// </summary>
    public async Task<int> BackfillMissingProjectsAsync(Guid courseId, CancellationToken cancellationToken)
    {
        var fixedCount = 0;
        foreach (var enrollment in await _enrollmentRepository.GetByCourseIdAsync(courseId, cancellationToken))
        {
            foreach (var weekly in await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken))
            {
                if (weekly.Project is not null || weekly.Template.IsPracticeOnly) continue;
                weekly.InitializeProject();
                fixedCount++;
            }
        }
        return fixedCount;
    }
}
