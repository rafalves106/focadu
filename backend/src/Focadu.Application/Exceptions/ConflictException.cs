namespace Focadu.Application.Exceptions;

/// <summary>
/// A operacao nao pode ser concluida por causa do estado atual do sistema, mas nao e uma regra
/// de dominio propriamente dita (ex: "/hoje" pedido quando ha mais de um Course Active ao mesmo
/// tempo - uma ambiguidade de orquestracao, nao uma invariante do dominio). Sempre traduzida
/// para HTTP 409 pela Api.
/// </summary>
public class ConflictException : Exception
{
    public string Code { get; }

    public ConflictException(string code, string message) : base(message)
    {
        Code = code;
    }
}
