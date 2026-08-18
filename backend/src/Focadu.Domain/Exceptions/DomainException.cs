namespace Focadu.Domain.Exceptions;

/// <summary>
/// Excecao lancada quando uma regra de negocio do dominio e violada (ex: tentar acessar uma
/// Daily futura, ou concluir uma Daily que nao esta em andamento).
/// </summary>
public class DomainException : Exception
{
    /// <summary>
    /// Codigo de erro estavel, legivel por maquina (snake_case), para a camada de API traduzir
    /// isso em um status HTTP e um corpo de erro padronizado sem depender do texto da mensagem
    /// (que pode mudar de redacao sem aviso). Regras de negocio que ainda nao sao alcancadas por
    /// nenhum endpoint (ex: validacoes de criacao de conteudo, sem endpoint de autoria ainda)
    /// usam o codigo generico abaixo ate que passem a precisar de um codigo especifico.
    /// </summary>
    public string Code { get; }

    public DomainException(string message, string code = "regra_de_negocio_violada") : base(message)
    {
        Code = code;
    }
}
