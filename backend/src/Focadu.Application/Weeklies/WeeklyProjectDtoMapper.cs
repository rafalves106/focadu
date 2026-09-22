using Focadu.Domain.Enums;
using Focadu.Domain.GitHosting;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Monta o WeeklyProjectDto num lugar so (Fase 59). Antes o DTO era montado a mao em 3 casos de uso
/// (GetWeeklyDetail, SubmitWeeklyProject, EvaluateWeeklyProject); com o estado de escolha de
/// linguagem e a regra "sem linguagem, sem projeto", repetir isso 3 vezes era pedir pra os 3
/// divergirem.
/// </summary>
internal static class WeeklyProjectDtoMapper
{
    /// <param name="preferredLanguages">
    /// Linguagens marcadas no perfil do aluno. So importa pro projeto Pending, sem linguagem, numa
    /// semana com variantes - por isso Submit/Evaluate (que so rodam depois disso) podem passar nulo.
    /// </param>
    internal static WeeklyProjectDto Build(
        Weekly weekly, WeeklyProject project, UserForgejoAccount? forgejoAccount, IReadOnlyCollection<ProjectLanguage>? preferredLanguages = null)
    {
        var template = weekly.Template;
        var supported = template.LanguageVariants.Select(v => v.Language).OrderBy(l => l).ToList();
        var (step, choosable) = ResolveStep(template, project, supported, preferredLanguages);

        // "O projeto so e renderizado depois da escolha" (decisao do dono): antes dela nem a spec, nem
        // o repositorio (incluindo um fork antigo, sem linguagem) saem da API.
        var released = step is not (ProjectLanguageStep.NeedsPreference or ProjectLanguageStep.NeedsChoice);

        var references = step == ProjectLanguageStep.Chosen
            ? template.ReferencesFor(project.Language!.Value)
                .Select(r => new ProjectReferenceDto(r.Id, r.Language, r.Title, r.Url, r.Documents, r.LastVerifiedAt))
                .ToList()
            : [];

        return new WeeklyProjectDto(
            project.Id,
            released ? template.WeeklyProjectSpecText ?? string.Empty : string.Empty,
            project.Status,
            !weekly.AreDailiesComplete(),
            released ? project.SubmissionUrl : null,
            project.Score,
            project.Feedback,
            released ? forgejoAccount?.AccessToken : null,
            released ? forgejoAccount?.ForgejoUsername : null,
            step,
            project.Language,
            supported,
            choosable,
            references);
    }

    /// <summary>
    /// Semana sem variantes -> None (nada muda). Linguagem ja escolhida -> Chosen. Projeto que ja
    /// foi submetido sem linguagem (fork unico de antes da Fase 59) -> None: o aluno nao volta pra
    /// escolher no meio do trabalho. So o projeto Pending e sem linguagem escolhe: sem nenhuma
    /// linguagem da semana no perfil -> NeedsPreference; com ao menos uma -> NeedsChoice.
    /// </summary>
    internal static (ProjectLanguageStep Step, IReadOnlyCollection<ProjectLanguage> Choosable) ResolveStep(
        WeeklyTemplate template, WeeklyProject project, IReadOnlyCollection<ProjectLanguage> supported,
        IReadOnlyCollection<ProjectLanguage>? preferredLanguages)
    {
        if (!template.HasLanguageVariants) return (ProjectLanguageStep.None, []);
        if (project.Language is not null) return (ProjectLanguageStep.Chosen, []);
        if (project.Status != WeeklyProjectStatus.Pending) return (ProjectLanguageStep.None, []);

        var choosable = supported.Where(l => preferredLanguages?.Contains(l) == true).ToList();
        return choosable.Count == 0
            ? (ProjectLanguageStep.NeedsPreference, [])
            : (ProjectLanguageStep.NeedsChoice, choosable);
    }
}
