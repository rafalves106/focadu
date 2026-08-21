using Focadu.Application.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso: aluno submete a URL do projeto pratico da semana (repositorio GitHub, post no
/// LinkedIn, etc. - ver SeedWebSecurityCourseUseCase) - WeeklyProject.Submit ja existia no
/// dominio desde a Fase 1, so faltava um caso de uso/endpoint pra chama-lo (Fase 7). Usa
/// IWeeklyRepository.GetByIdAsync (Weekly ja e o aggregate root que carrega o Project junto) - sem
/// repositorio proprio pra WeeklyProject.
/// </summary>
public class SubmitWeeklyProjectUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SubmitWeeklyProjectUseCase(IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<WeeklyProjectDto> ExecuteAsync(
        Guid userId, Guid weeklyId, string submissionUrl, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var project = weekly.Project
            ?? throw new NotFoundException("projeto_nao_encontrado", "Esta semana nao tem projeto definido.");

        project.Submit(submissionUrl);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new WeeklyProjectDto(
            project.Id, weekly.Template.WeeklyProjectSpecText ?? string.Empty, project.Status, project.SubmissionUrl,
            project.Score, project.Feedback);
    }
}
