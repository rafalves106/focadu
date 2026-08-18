using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: estado de uma Daily especifica (suporta "/start?course=&amp;weekly=&amp;daily=").
/// Usa Weekly.EvaluateDailyAccess internamente - se a Daily for a ativa de hoje (Start/Resume) ou
/// estiver sendo repetida (Replay), o cliente recebe o estado completo (tela de estudo imersiva);
/// se for uma Daily de dia anterior (ReadOnly), o mesmo shape sai preenchido do mesmo jeito, mas
/// o AccessMode = ReadOnly sinaliza para o frontend renderizar como resumo/gabarito, sem permitir
/// nova submissao.
/// </summary>
public class GetDailyStateUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IClock _clock;

    public GetDailyStateUseCase(IWeeklyRepository weeklyRepository, IClock clock)
    {
        _weeklyRepository = weeklyRepository;
        _clock = clock;
    }

    public async Task<DailyStateDto> ExecuteAsync(Guid dailyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        var accessMode = weekly.EvaluateDailyAccess(dailyId, _clock.Today());

        return DailyStateMapper.ToDto(daily, accessMode);
    }
}
