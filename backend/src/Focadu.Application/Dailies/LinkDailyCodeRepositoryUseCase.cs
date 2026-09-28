using Focadu.Application.Exceptions;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Fase 79: o aluno liga, se quiser, o repositorio (GitHub ou Forgejo) onde guardou o script da
/// ponte "code comigo". Opcional por decisao do dono: nao muda conclusao, Gems nem nada da semana -
/// o codigo ja fica guardado nas respostas dos passos (ver Daily.LinkCodeRepository).
/// </summary>
public class LinkDailyCodeRepositoryUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;

    public LinkDailyCodeRepositoryUseCase(IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<DailyStateDto> ExecuteAsync(Guid userId, Guid dailyId, string? url, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        daily.LinkCodeRepository(url);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return DailyStateMapper.ToDto(daily, DailyAccessMode.ReadOnly);
    }
}
