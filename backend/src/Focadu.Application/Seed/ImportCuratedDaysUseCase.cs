using Focadu.Application.Ports;
using Focadu.Domain.Dailies;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Seed;

/// <summary>
/// Importador de dias (plano de curadoria, secao 7): `importar &lt;curso&gt; [--dia N] [--dry-run] [--confirmar]`.
/// Generaliza o ReimportFile (que so a ponte usava): atualiza QUALQUER dia a partir do dia-N.json em
/// conteudo/&lt;curso&gt;/. Para cada dia do curso.json:
/// 1. roda o linter e recusa o dia reprovado (e o dia fora do molde v1, salvo <c>AllowLegacy</c>);
/// 2. compara o hash do arquivo com <c>DailyTemplate.ContentHash</c>: sem mudanca, pula;
/// 3. dia novo e criado (e levado as matriculas); dia mudado e substituido por completo (texto, atividades, opcoes);
/// 4. se o dia mudado ja tem respostas de alunos, para e pede <c>--confirmar</c> (ver <see cref="ImportPlanner"/>);
/// 5. <c>--dry-run</c> mostra o que mudaria e nao grava nada.
/// Corrigir um dia e editar o JSON e importar de novo, nunca escrever SQL a mao.
/// </summary>
public class ImportCuratedDaysUseCase
{
    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly CuratedEnrollmentSync _enrollmentSync;
    private readonly IDayLinter _linter;
    private readonly IUnitOfWork _unitOfWork;

    public ImportCuratedDaysUseCase(
        ICourseRepository courseRepository, IEnrollmentRepository enrollmentRepository, IWeeklyRepository weeklyRepository,
        CuratedEnrollmentSync enrollmentSync, IDayLinter linter, IUnitOfWork unitOfWork)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _enrollmentSync = enrollmentSync;
        _linter = linter;
        _unitOfWork = unitOfWork;
    }

    public async Task<ImportReport> ExecuteAsync(string courseSlug, ImportOptions options, CancellationToken cancellationToken = default)
    {
        var manifestPath = CuratedContentLocator.Resolve(courseSlug, null, "curso.json", required: false)
            ?? throw new InvalidOperationException($"curso.json nao encontrado em conteudo/{courseSlug}.");
        var manifest = CuratedCourseImporter.ParseManifest(await File.ReadAllTextAsync(manifestPath, cancellationToken));

        var existing = (await _courseRepository.GetAllAsync(cancellationToken)).FirstOrDefault(c => c.Name == manifest.Name);
        var courseCreated = existing is null;
        var course = existing is null
            ? CuratedCourseImporter.CreateCourse(manifest)
            : await _courseRepository.GetFullTemplateGraphAsync(existing.Id, cancellationToken)
                ?? throw new InvalidOperationException("Curso sumiu entre as duas leituras.");

        var responsesByTemplate = courseCreated
            ? new Dictionary<Guid, int>()
            : await CountResponsesByTemplateAsync(course.Id, cancellationToken);

        var outcomes = new List<DayOutcome>();
        var created = new List<CreatedDay>();
        var replaced = new List<(WeeklyTemplate Week, DailyTemplate Day)>();

        foreach (var module in manifest.Modules.OrderBy(m => m.Number))
        {
            foreach (var week in module.Weeks.OrderBy(w => w.Number))
            {
                var days = week.Days.OrderBy(d => d).Where(d => options.Day is null || options.Day == d).ToList();
                if (days.Count == 0) continue;

                // Estrutura (modulo/semana) so e criada de verdade fora do dry-run.
                var monthly = course.Monthlies.FirstOrDefault(m => m.Number == module.Number)
                    ?? (options.DryRun ? null : course.AddMonthly(module.Number, module.Title));
                var weeklyTemplate = monthly?.WeeklyTemplates.FirstOrDefault(w => w.Number == week.Number)
                    ?? (options.DryRun || monthly is null ? null : monthly.AddWeeklyTemplate(week.Number, week.Title, week.Theme));
                if (weeklyTemplate is not null && weeklyTemplate.PracticeLanguage is null)
                    weeklyTemplate.SetPracticeLanguage(manifest.PracticeLanguage);

                foreach (var dayNumber in days)
                {
                    var path = CuratedContentLocator.Resolve(courseSlug, $"semana-{week.Number}", $"dia-{dayNumber}.json", required: false);
                    if (path is null)
                    {
                        if (options.Day is not null) outcomes.Add(new DayOutcome(dayNumber, ImportStatus.NoFile, "arquivo nao existe"));
                        continue;
                    }

                    var json = await File.ReadAllTextAsync(path, cancellationToken);
                    var (fileDay, molde) = CuratedDayImporter.Peek(json);
                    if (fileDay != dayNumber)
                    {
                        outcomes.Add(new DayOutcome(dayNumber, ImportStatus.Rejected, $"o arquivo diz dayNumber {fileDay}"));
                        continue;
                    }

                    if (molde != "v1" && !options.AllowLegacy)
                    {
                        outcomes.Add(new DayOutcome(dayNumber, ImportStatus.Rejected, "dia fora do molde v1 (use --legado para importar dia antigo)"));
                        continue;
                    }

                    if (!options.SkipLinter)
                    {
                        var lint = await _linter.LintAsync(path, courseSlug, cancellationToken);
                        if (!lint.Available)
                        {
                            outcomes.Add(new DayOutcome(dayNumber, ImportStatus.Rejected, $"linter indisponivel ({lint.UnavailableReason}); use --sem-linter para dispensar de forma explicita"));
                            continue;
                        }
                        if (!lint.Passed)
                        {
                            outcomes.Add(new DayOutcome(dayNumber, ImportStatus.Rejected, $"linter reprovou ({lint.Errors.Count} erro(s))", lint.Errors));
                            continue;
                        }
                    }

                    var newHash = CuratedDayImporter.ComputeHash(json);
                    var template = weeklyTemplate?.DailyTemplates.FirstOrDefault(d => d.DayNumber == dayNumber && d.Language is null);
                    var responses = template is not null && responsesByTemplate.TryGetValue(template.Id, out var n) ? n : 0;
                    var decision = ImportPlanner.Decide(template?.ContentHash, newHash, template is not null, responses, options.Confirm);

                    switch (decision)
                    {
                        case ImportDecision.Skip:
                            outcomes.Add(new DayOutcome(dayNumber, ImportStatus.Unchanged, "sem mudanca (mesmo hash)"));
                            break;
                        case ImportDecision.NeedsConfirmation:
                            outcomes.Add(new DayOutcome(dayNumber, ImportStatus.NeedsConfirmation,
                                $"o dia mudou e tem {responses} resposta(s) de alunos; use --confirmar (as respostas das atividades trocadas deixam de aparecer; Dailies nao concluidas recomecam)"));
                            break;
                        case ImportDecision.Create:
                            outcomes.Add(new DayOutcome(dayNumber, ImportStatus.Created, "dia novo"));
                            if (!options.DryRun)
                            {
                                CuratedDayImporter.Import(weeklyTemplate!, json);
                                created.Add(new CreatedDay(weeklyTemplate!, weeklyTemplate!.DailyTemplates.First(d => d.DayNumber == dayNumber && d.Language is null)));
                            }
                            break;
                        case ImportDecision.Replace:
                            outcomes.Add(new DayOutcome(dayNumber, ImportStatus.Updated, responses > 0 ? $"atualizado por completo ({responses} resposta(s) de alunos)" : "atualizado por completo"));
                            if (!options.DryRun)
                            {
                                var previous = CuratedDayImporter.ReplaceDay(weeklyTemplate!, template!, json);
                                var stillUsed = weeklyTemplate!.DailyTemplates.SelectMany(d => d.Activities)
                                    .Where(a => a.ContentId is not null).Select(a => a.ContentId!.Value).ToHashSet();
                                foreach (var contentId in previous.Where(id => !stillUsed.Contains(id)))
                                    weeklyTemplate.RemoveCuratedContent(contentId);
                                replaced.Add((weeklyTemplate, template!));
                            }
                            break;
                    }
                }
            }
        }

        var dailiesAdded = 0;
        var dailiesReset = 0;
        var skipped = new List<string>();
        if (!options.DryRun && (created.Count > 0 || replaced.Count > 0 || courseCreated))
        {
            if (manifest.Published && course.Status == CourseStatus.Draft && outcomes.Any(o => o.Status is ImportStatus.Created or ImportStatus.Updated))
                course.Activate();
            if (courseCreated)
                await _courseRepository.AddAsync(course, cancellationToken);

            if (replaced.Count > 0)
                dailiesReset = await ResetUnfinishedDailiesAsync(course.Id, replaced.Select(r => r.Day.Id).ToHashSet(), cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            if (created.Count > 0 && !courseCreated)
            {
                (dailiesAdded, skipped) = await _enrollmentSync.SyncAsync(course.Id, created, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }

        return new ImportReport(manifest.Name, courseCreated, options.DryRun, outcomes, dailiesAdded, dailiesReset, skipped);
    }

    /// <summary>Respostas de alunos por DailyTemplate do curso (todas as matriculas).</summary>
    private async Task<Dictionary<Guid, int>> CountResponsesByTemplateAsync(Guid courseId, CancellationToken cancellationToken)
    {
        var counts = new Dictionary<Guid, int>();
        foreach (var enrollment in await _enrollmentRepository.GetByCourseIdAsync(courseId, cancellationToken))
            foreach (var weekly in await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken))
                foreach (var daily in weekly.Dailies.Where(d => d.Responses.Count > 0))
                    counts[daily.DailyTemplateId] = counts.GetValueOrDefault(daily.DailyTemplateId) + daily.Responses.Count;
        return counts;
    }

    /// <summary>Dailies nao concluidas dos dias trocados recomecam; as concluidas mantem o historico (mesma regra da Fase 79).</summary>
    private async Task<int> ResetUnfinishedDailiesAsync(Guid courseId, HashSet<Guid> templateIds, CancellationToken cancellationToken)
    {
        var reset = 0;
        foreach (var enrollment in await _enrollmentRepository.GetByCourseIdAsync(courseId, cancellationToken))
            foreach (var weekly in await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken))
                foreach (var daily in weekly.Dailies.Where(d => templateIds.Contains(d.DailyTemplateId) && !d.HasEverCompleted))
                {
                    daily.ResetAfterTemplateRefresh();
                    reset++;
                }
        return reset;
    }
}

/// <summary>Decide o que fazer com um dia. Pura, para teste.</summary>
public static class ImportPlanner
{
    public static ImportDecision Decide(string? storedHash, string newHash, bool exists, int studentResponses, bool confirmed)
    {
        if (!exists) return ImportDecision.Create;
        if (storedHash == newHash) return ImportDecision.Skip;
        if (studentResponses > 0 && !confirmed) return ImportDecision.NeedsConfirmation;
        return ImportDecision.Replace;
    }
}

public enum ImportDecision { Create, Skip, Replace, NeedsConfirmation }

public enum ImportStatus { Created, Updated, Unchanged, NeedsConfirmation, Rejected, NoFile }

/// <param name="AllowLegacy">Importa tambem dia fora do molde v1 (so para a transicao).</param>
/// <param name="SkipLinter">Dispensa o linter de forma explicita (ex.: container sem Node).</param>
public record ImportOptions(int? Day = null, bool DryRun = false, bool Confirm = false, bool SkipLinter = false, bool AllowLegacy = false);

public record DayOutcome(int DayNumber, ImportStatus Status, string Detail, IReadOnlyList<string>? Errors = null);

public record ImportReport(
    string CourseName, bool CourseCreated, bool DryRun, IReadOnlyList<DayOutcome> Days, int DailiesAdded, int DailiesReset,
    IReadOnlyList<string> Skipped);
