using Focadu.Application.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso: avalia o projeto pratico da semana (Fase 11) - WeeklyProject.Evaluate() existe no
/// dominio desde a Fase 1, mas nunca teve endpoint (gap documentado na Fase 7). Precisou ganhar um
/// aqui porque Weekly.IsModuleComplete() (Fase 11) exige Project.Status == Evaluated - sem isso, a
/// exigencia de publicacao nunca seria alcancavel de verdade. Sem UI dedicada nesta fase (app nao
/// tem papel de "revisor" - usuario unico, ver docs/ARQUITETURA.md) - so o endpoint, acionavel via
/// script/curl, mesmo padrao que a autoria de CuratedContent teve antes de ganhar tela (Fase 4->6).
/// </summary>
public class EvaluateWeeklyProjectUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;

    public EvaluateWeeklyProjectUseCase(IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<WeeklyProjectDto> ExecuteAsync(Guid userId, Guid weeklyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var project = weekly.Project
            ?? throw new NotFoundException("projeto_nao_encontrado", "Esta semana nao tem projeto definido.");

        project.Evaluate();
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new WeeklyProjectDto(project.Id, weekly.Template.WeeklyProjectSpecText ?? string.Empty, project.Status, project.SubmissionUrl);
    }
}
