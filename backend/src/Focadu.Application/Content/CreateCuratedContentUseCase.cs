using Focadu.Application.Exceptions;
using Focadu.Application.Shared;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Content;

/// <summary>
/// Caso de uso: cria um CuratedContent vinculado a uma Weekly existente (Fase 4). Autoria de
/// conteudo curado e o unico tipo de conteudo com endpoint de criacao ate agora -
/// Course/Monthly/Weekly/Daily/DailyActivity continuam so via seed/extensao do seed, porque a
/// estrutura muda com pouca frequencia; o que muda toda semana e o conteudo curado em si.
/// </summary>
public class CreateCuratedContentUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateCuratedContentUseCase(IWeeklyRepository weeklyRepository, IUnitOfWork unitOfWork)
    {
        _weeklyRepository = weeklyRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<CuratedContentDto> ExecuteAsync(
        Guid weeklyId,
        string? type,
        string title,
        string? externalUrl,
        string? bodyText,
        CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var parsedType = ParseType(type);
        RequireExternalUrlOrBodyText(externalUrl, bodyText);

        var content = weekly.AddCuratedContent(parsedType, title, externalUrl, bodyText);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new CuratedContentDto(content.Id, content.Type, content.Title, content.ExternalUrl, content.BodyText);
    }

    /// <summary>"Reading"/"Video"/"Diagram" (case-insensitive) - nomes legiveis no corpo do request de autoria, diferente do numero que a Api usa nas respostas de leitura.</summary>
    internal static CuratedContentType ParseType(string? type)
    {
        if (!Enum.TryParse<CuratedContentType>(type, ignoreCase: true, out var parsed) || !Enum.IsDefined(parsed))
        {
            throw new ValidationException("tipo_invalido", "O campo 'type' precisa ser Reading, Video ou Diagram.");
        }

        return parsed;
    }

    internal static void RequireExternalUrlOrBodyText(string? externalUrl, string? bodyText)
    {
        if (string.IsNullOrWhiteSpace(externalUrl) && string.IsNullOrWhiteSpace(bodyText))
        {
            throw new ValidationException("conteudo_obrigatorio", "Informe 'externalUrl' ou 'bodyText'.");
        }
    }
}
