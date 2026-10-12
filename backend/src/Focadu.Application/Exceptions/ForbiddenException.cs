namespace Focadu.Application.Exceptions;

/// <summary>
/// Sessao valida, mas sem permissao pra rota (Fase 94: rota /api/admin pedida por quem nao e admin). Sempre
/// traduzida para HTTP 403 pela Api.
/// </summary>
public class ForbiddenException : Exception
{
    public string Code { get; }

    public ForbiddenException(string code, string message) : base(message)
    {
        Code = code;
    }
}
