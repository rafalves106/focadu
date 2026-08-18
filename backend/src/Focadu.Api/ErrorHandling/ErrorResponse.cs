namespace Focadu.Api.ErrorHandling;

/// <summary>
/// Formato de erro padronizado, usado por toda a Api: { "error": "codigo_do_erro",
/// "message": "descricao legivel" }. "Error"/"Message" (PascalCase em C#) viram
/// "error"/"message" no JSON pela politica de serializacao camelCase padrao do ASP.NET Core.
/// </summary>
public record ErrorResponse(string Error, string Message);
