using Focadu.Application.Exceptions;

namespace Focadu.Api.Contracts;

/// <summary>
/// Parametros de rota (dailyId, activityId, etc.) chegam como string, nao ":guid" no template da
/// rota - de proposito: uma constraint ":guid" faz o roteamento simplesmente nao casar a rota
/// para um valor invalido (gerando um 404 generico "nenhum endpoint encontrado"), enquanto aqui
/// queremos SEMPRE o mesmo formato de erro padronizado ({ error, message }) para qualquer entrada
/// invalida, Guid malformado incluso.
/// </summary>
internal static class RouteParsing
{
    public static Guid RequireGuid(string? value, string paramName)
    {
        if (!Guid.TryParse(value, out var guid))
        {
            throw new ValidationException("id_invalido", $"O parametro '{paramName}' precisa ser um Guid valido.");
        }

        return guid;
    }
}
