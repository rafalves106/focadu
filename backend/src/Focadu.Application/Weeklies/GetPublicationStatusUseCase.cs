using Focadu.Application.Exceptions;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso: estado atual da publicacao de uma Weekly (Fase 11). `NotRequired` cobre 2 casos
/// reais: o modulo ainda nao foi completado (nao ha ModulePublication nenhuma ainda), ou a Weekly
/// nunca vai exigir publicacao (nao se aplica hoje, mas deixa a porta aberta pra regra mudar sem
/// quebrar o contrato). `Pending` e o estado "modulo completo, publicacao ainda nao comecada" -
/// ModulePublication so existe no banco a partir da primeira acao do aluno (Weekly.StartPublication).
/// </summary>
public class GetPublicationStatusUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;

    public GetPublicationStatusUseCase(IWeeklyRepository weeklyRepository)
    {
        _weeklyRepository = weeklyRepository;
    }

    public async Task<ModulePublicationDto> ExecuteAsync(Guid weeklyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        if (weekly.Publication is null)
        {
            var status = weekly.IsModuleComplete() ? PublicationStatus.Pending : PublicationStatus.NotRequired;
            return new ModulePublicationDto(weeklyId, status, null, null, null, null);
        }

        var p = weekly.Publication;
        return new ModulePublicationDto(weeklyId, p.Status, p.Platform, p.SubmittedUrl, p.GeneratedDraft, p.ValidationError);
    }
}
