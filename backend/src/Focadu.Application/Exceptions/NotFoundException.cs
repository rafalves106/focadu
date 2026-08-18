namespace Focadu.Application.Exceptions;

/// <summary>
/// O recurso pedido nao existe (ex: CourseId/WeeklyId/DailyId que nao corresponde a nada no
/// banco). Distinta de DomainException porque nao e uma regra de negocio sendo violada - e so
/// "isso nao existe". Sempre traduzida para HTTP 404 pela Api.
/// </summary>
public class NotFoundException : Exception
{
    public string Code { get; }

    public NotFoundException(string code, string message) : base(message)
    {
        Code = code;
    }
}
