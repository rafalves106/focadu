using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Repositories;
using Focadu.Domain.Squads;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: dar ou tirar o GG (Fase 72) numa atividade do feed do QG - toggle, igual curtir. A
/// chave vem do proprio feed ("tipo:autor:id", ver GetSquadHqUseCase.BuildFeed); aqui so se confere
/// que o autor e membro do squad de quem pede e que nao e a propria pessoa (GG em si mesmo nao conta).
/// A atividade em si nao e reconstruida: uma chave inventada com autor valido so gera um GG que nenhum
/// feed vai mostrar.
/// </summary>
public class ToggleSquadCheerUseCase
{
    private readonly ISquadRepository _squadRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ToggleSquadCheerUseCase(ISquadRepository squadRepository, IUnitOfWork unitOfWork)
    {
        _squadRepository = squadRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<SquadCheerResultDto> ExecuteAsync(Guid userId, string activityKey, CancellationToken cancellationToken = default)
    {
        var membership = await _squadRepository.GetMembershipByUserIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");

        var authorId = ParseAuthor(activityKey)
            ?? throw new ValidationException("atividade_invalida", "Atividade invalida.");
        if (authorId == userId)
            throw new ValidationException("gg_proprio", "GG e pros colegas - na propria atividade nao vale.");

        var authorMembership = await _squadRepository.GetMembershipByUserIdAsync(authorId, cancellationToken);
        if (authorMembership?.SquadId != membership.SquadId)
            throw new NotFoundException("atividade_nao_encontrada", "Essa atividade nao e do seu squad.");

        var existing = await _squadRepository.GetCheerAsync(membership.SquadId, activityKey, userId, cancellationToken);
        if (existing is null)
            await _squadRepository.AddCheerAsync(new SquadCheer(membership.SquadId, activityKey, userId), cancellationToken);
        else
            await _squadRepository.RemoveCheerAsync(existing, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var cheers = await _squadRepository.GetCheersAsync(membership.SquadId, [activityKey], cancellationToken);
        return new SquadCheerResultDto(activityKey, cheers.Count, cheers.Any(c => c.FromUserId == userId));
    }

    /// <summary>Autor de uma chave "tipo:autor:id" - null se o formato nao bate.</summary>
    internal static Guid? ParseAuthor(string? activityKey)
    {
        var parts = activityKey?.Split(':');
        return parts is { Length: 3 } && parts[0].Length > 0 && Guid.TryParse(parts[1], out var author) && Guid.TryParse(parts[2], out _)
            ? author
            : null;
    }
}

public record SquadCheerResultDto(string ActivityKey, int Cheers, bool CheeredByMe);
