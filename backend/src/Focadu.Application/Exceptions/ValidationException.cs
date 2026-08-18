namespace Focadu.Application.Exceptions;

/// <summary>
/// Entrada de request invalida (campo obrigatorio ausente, formato invalido, fora de faixa),
/// detectada antes de o caso de uso rodar. Sempre traduzida para HTTP 400 pela Api.
/// </summary>
public class ValidationException : Exception
{
    public string Code { get; }

    public ValidationException(string code, string message) : base(message)
    {
        Code = code;
    }
}
