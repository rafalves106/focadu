using Focadu.Application.Ports;

namespace Focadu.Infrastructure.Services;

/// <summary>Implementacao "de verdade" de IClock, usando a hora local do servidor. "Hoje" segue horario local (nao UTC) porque as regras de acesso a Daily sao pensadas em torno do dia do calendario vivido pelo usuario.</summary>
public class SystemClock : IClock
{
    public DateOnly Today() => DateOnly.FromDateTime(DateTime.Now);
}
