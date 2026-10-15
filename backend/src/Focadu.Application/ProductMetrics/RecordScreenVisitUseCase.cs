using Focadu.Application.Ports;
using Focadu.Domain.ProductMetrics;
using Focadu.Domain.Repositories;

namespace Focadu.Application.ProductMetrics;

/// <summary>
/// Fase 103, medicao de produto: o front avisa a cada troca de tela; grava no maximo uma linha por aluno, dia, tela e
/// aparelho. O aparelho vem do User-Agent resumido no servidor (o User-Agent cru nao e guardado).
/// </summary>
public class RecordScreenVisitUseCase
{
    private readonly IScreenVisitRepository _visits;
    private readonly IClock _clock;

    public RecordScreenVisitUseCase(IScreenVisitRepository visits, IClock clock)
    {
        _visits = visits;
        _clock = clock;
    }

    public Task ExecuteAsync(Guid userId, string? screen, string? userAgent, CancellationToken cancellationToken = default) =>
        _visits.AddIfMissingAsync(
            ScreenVisit.Create(userId, _clock.Today(), screen, DeviceClassifier.FromUserAgent(userAgent), DateTime.UtcNow),
            cancellationToken);
}
