using Focadu.Application.Exceptions;
using Microsoft.AspNetCore.Diagnostics;

namespace Focadu.Api.ErrorHandling;

/// <summary>
/// Ponto unico de traducao de excecao -> resposta HTTP. Toda excecao lancada por um endpoint
/// (validacao de request, regra de dominio, "recurso nao encontrado") passa por aqui e vira o
/// mesmo formato de erro, com o status HTTP adequado ao tipo/codigo da excecao.
/// </summary>
public class ApiExceptionHandler : IExceptionHandler
{
    /// <summary>
    /// DomainException carrega um Code de negocio (nao um status HTTP - o dominio nao sabe o que
    /// e HTTP). Esta tabela e quem decide, na borda da Api, qual status cada codigo justifica.
    /// Qualquer DomainException.Code que nao apareca aqui cai no default: 400 Bad Request.
    /// </summary>
    private static readonly Dictionary<string, int> DomainCodeStatusOverrides = new()
    {
        ["daily_futura"] = StatusCodes.Status400BadRequest,
        ["daily_em_andamento"] = StatusCodes.Status409Conflict,
        ["daily_somente_leitura"] = StatusCodes.Status409Conflict,
        ["daily_ja_concluida"] = StatusCodes.Status409Conflict,
        ["daily_nao_iniciada"] = StatusCodes.Status409Conflict,
        ["daily_nao_em_andamento"] = StatusCodes.Status409Conflict,
        ["daily_nao_encontrada"] = StatusCodes.Status404NotFound,
        ["atividade_nao_encontrada"] = StatusCodes.Status404NotFound,
        ["reforco_semanal_condicoes_nao_atingidas"] = StatusCodes.Status409Conflict,
        ["reforco_diario_condicoes_nao_atingidas"] = StatusCodes.Status409Conflict,
        ["modulo_bloqueado_por_publicacao"] = StatusCodes.Status409Conflict,
        ["publicacao_ja_validada"] = StatusCodes.Status409Conflict,
    };

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, code, message) = exception switch
        {
            Focadu.Domain.Exceptions.DomainException de =>
                (DomainCodeStatusOverrides.GetValueOrDefault(de.Code, StatusCodes.Status400BadRequest), de.Code, de.Message),
            NotFoundException nfe => (StatusCodes.Status404NotFound, nfe.Code, nfe.Message),
            ConflictException ce => (StatusCodes.Status409Conflict, ce.Code, ce.Message),
            ValidationException ve => (StatusCodes.Status400BadRequest, ve.Code, ve.Message),
            ExternalServiceException ese => (ese.StatusCode, ese.Code, ese.Message),
            // O model binding do ASP.NET Core (JSON malformado, multipart/form-data ausente ou
            // sem o campo esperado, etc.) lanca isso antes do endpoint rodar - sem esse caso,
            // caia no 500 generico abaixo (Fase 5: descoberto testando o endpoint de audio com
            // corpo ausente, mas cobre qualquer entrada malformada, JSON incluso).
            BadHttpRequestException =>
                (StatusCodes.Status400BadRequest, "requisicao_invalida", "O corpo da requisicao esta ausente ou nao pode ser interpretado."),
            _ => (StatusCodes.Status500InternalServerError, "erro_interno", "Ocorreu um erro inesperado.")
        };

        if (status == StatusCodes.Status500InternalServerError)
        {
            httpContext.RequestServices.GetRequiredService<ILogger<ApiExceptionHandler>>()
                .LogError(exception, "Erro nao tratado ao processar {Path}", httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(new ErrorResponse(code, message), cancellationToken);
        return true;
    }
}
