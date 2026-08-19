namespace Focadu.Application.Exceptions;

/// <summary>
/// Uma chamada a um servico externo (Fase 5: Groq - transcricao ou avaliacao por IA) falhou de um
/// jeito que o usuario nao pode corrigir sozinho (fora do ar, timeout, resposta malformada) -
/// distinta de ValidationException (culpa da entrada do usuario) e DomainException (regra de
/// negocio violada). StatusCode e explicito no construtor (nao inferido de Code): 502 pra "o
/// servico respondeu algo que nao conseguimos usar", 503 pra "o servico nao respondeu a tempo".
/// </summary>
public class ExternalServiceException : Exception
{
    public string Code { get; }
    public int StatusCode { get; }

    public ExternalServiceException(string code, string message, int statusCode = 502) : base(message)
    {
        Code = code;
        StatusCode = statusCode;
    }
}
