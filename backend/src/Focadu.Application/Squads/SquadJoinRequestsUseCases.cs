using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Squads;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: a aba "Notificacoes" do QG (Fase 77, Figma "Squad: pedidos de entrada — v2", 162:4503) -
/// so pro lider e o colider. Pedidos abertos (mais antigo primeiro) e os avisos das decisoes dos
/// ultimos <see cref="NoticeDays"/> dias, mais os recusados de qualquer data (pra poder desfazer).
/// </summary>
public class GetSquadJoinRequestsUseCase
{
    internal const int NoticeDays = 30;

    private readonly ISquadRepository _squadRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUserEquippedCosmeticsRepository _equippedCosmeticsRepository;
    private readonly ICosmeticItemRepository _cosmeticItemRepository;

    public GetSquadJoinRequestsUseCase(
        ISquadRepository squadRepository,
        IUserRepository userRepository,
        IUserEquippedCosmeticsRepository equippedCosmeticsRepository,
        ICosmeticItemRepository cosmeticItemRepository)
    {
        _squadRepository = squadRepository;
        _userRepository = userRepository;
        _equippedCosmeticsRepository = equippedCosmeticsRepository;
        _cosmeticItemRepository = cosmeticItemRepository;
    }

    public async Task<SquadJoinRequestsDto> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var squad = await SquadJoinManagement.RequireManagedSquadAsync(_squadRepository, userId, cancellationToken);
        var now = DateTime.UtcNow;
        var requests = await _squadRepository.GetJoinRequestsBySquadIdAsync(squad.Id, now.AddDays(-NoticeDays), cancellationToken);

        var open = requests.Where(r => r.IsOpen(now)).OrderBy(r => r.CreatedAt).ToList();
        var decided = requests
            .Where(r => r.Status is SquadJoinRequestStatus.Accepted or SquadJoinRequestStatus.Rejected or SquadJoinRequestStatus.RejectionUndone)
            .OrderByDescending(r => r.DecidedAt)
            .ToList();

        var itemsById = (await _cosmeticItemRepository.GetAllAsync(cancellationToken)).ToDictionary(i => i.Id);
        var names = new Dictionary<Guid, string>();
        async Task<string> NameOf(Guid id)
        {
            if (!names.TryGetValue(id, out var name))
                names[id] = name = (await _userRepository.GetByIdAsync(id, cancellationToken))?.DisplayName ?? "Agente";
            return name;
        }
        async Task<SquadJoinRequestEntryDto> Entry(SquadJoinRequest r)
        {
            var equipped = await _equippedCosmeticsRepository.GetByUserIdAsync(r.UserId, cancellationToken);
            return new SquadJoinRequestEntryDto(
                r.Id, r.UserId, await NameOf(r.UserId), AgentLooks.Resolve(equipped, itemsById), SquadJoinRequestStatusName.Of(r.Status),
                r.CreatedAt, r.ExpiresAt, r.DecidedAt,
                r.DecidedByUserId is { } by ? (by == userId ? null : await NameOf(by)) : null,
                r.DecidedByUserId == userId);
        }

        var pendingDtos = new List<SquadJoinRequestEntryDto>();
        foreach (var r in open) pendingDtos.Add(await Entry(r));
        var decidedDtos = new List<SquadJoinRequestEntryDto>();
        foreach (var r in decided) decidedDtos.Add(await Entry(r));
        return new SquadJoinRequestsDto(pendingDtos, decidedDtos);
    }
}

/// <summary>Caso de uso: quantos pedidos abertos o squad tem - o contador do Squad no menu (0 pra quem nao lidera).</summary>
public class GetSquadJoinRequestCountUseCase
{
    private readonly ISquadRepository _squadRepository;

    public GetSquadJoinRequestCountUseCase(ISquadRepository squadRepository)
    {
        _squadRepository = squadRepository;
    }

    public async Task<int> ExecuteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var membership = await _squadRepository.GetMembershipByUserIdAsync(userId, cancellationToken);
        if (membership is null) return 0;
        var squad = await _squadRepository.GetByIdAsync(membership.SquadId, cancellationToken);
        if (squad is null || !SquadJoinRules.CanManage(squad, userId)) return 0;
        var now = DateTime.UtcNow;
        return (await _squadRepository.GetJoinRequestsBySquadIdAsync(squad.Id, now.AddDays(-SquadJoinRequest.ExpiresAfterDays), cancellationToken))
            .Count(r => r.IsOpen(now));
    }
}

public enum SquadJoinDecision { Accept, Reject, UndoRejection }

/// <summary>
/// Caso de uso: o lider ou o colider aceita, recusa ou desfaz uma recusa (Fase 77). Aceitar confere de
/// novo se a pessoa entrou em outro squad nesse meio-tempo (ai o pedido e cancelado e da 409).
/// </summary>
public class DecideSquadJoinRequestUseCase
{
    private readonly ISquadRepository _squadRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DecideSquadJoinRequestUseCase(ISquadRepository squadRepository, IUnitOfWork unitOfWork)
    {
        _squadRepository = squadRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task ExecuteAsync(Guid userId, Guid requestId, SquadJoinDecision decision, CancellationToken cancellationToken = default)
    {
        var squad = await SquadJoinManagement.RequireManagedSquadAsync(_squadRepository, userId, cancellationToken);
        var request = await _squadRepository.GetJoinRequestByIdAsync(requestId, cancellationToken);
        if (request is null || request.SquadId != squad.Id)
            throw new NotFoundException("pedido_nao_encontrado", "Pedido nao encontrado.");

        var now = DateTime.UtcNow;
        switch (decision)
        {
            case SquadJoinDecision.Accept:
                if (!request.IsOpen(now))
                    throw new ConflictException("pedido_indisponivel", "Este pedido nao esta mais aberto.");
                if (await _squadRepository.GetMembershipByUserIdAsync(request.UserId, cancellationToken) is not null)
                {
                    request.Cancel(now);
                    await _unitOfWork.SaveChangesAsync(cancellationToken);
                    throw new ConflictException("ja_esta_em_squad", "Essa pessoa ja entrou em outro squad.");
                }
                request.Accept(userId, now);
                await _squadRepository.AddMembershipAsync(new SquadMembership(squad.Id, request.UserId), cancellationToken);
                break;
            case SquadJoinDecision.Reject:
                if (!request.IsOpen(now))
                    throw new ConflictException("pedido_indisponivel", "Este pedido nao esta mais aberto.");
                request.Reject(userId, now);
                break;
            default:
                if (request.Status != SquadJoinRequestStatus.Rejected)
                    throw new ConflictException("pedido_nao_recusado", "So da pra desfazer um pedido recusado.");
                request.UndoRejection(userId, now);
                break;
        }
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}

internal static class SquadJoinManagement
{
    /// <summary>O squad de quem pede, se for lider ou colider - senao 404 (mesmo padrao dos outros casos de uso do lider).</summary>
    internal static async Task<Squad> RequireManagedSquadAsync(ISquadRepository repository, Guid userId, CancellationToken cancellationToken)
    {
        var membership = await repository.GetMembershipByUserIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");
        var squad = await repository.GetByIdAsync(membership.SquadId, cancellationToken);
        if (squad is null || !SquadJoinRules.CanManage(squad, userId))
            throw new NotFoundException("squad_nao_encontrado", "So o lider e o colider veem os pedidos.");
        return squad;
    }
}

/// <param name="DecidedByName">Quem decidiu, se nao foi voce (nulo quando foi voce - ver <paramref name="DecidedByMe"/>).</param>
public record SquadJoinRequestEntryDto(
    Guid Id, Guid UserId, string DisplayName, AgentLookDto? Look, string Status,
    DateTime CreatedAt, DateTime ExpiresAt, DateTime? DecidedAt, string? DecidedByName, bool DecidedByMe);

public record SquadJoinRequestsDto(IReadOnlyList<SquadJoinRequestEntryDto> Pending, IReadOnlyList<SquadJoinRequestEntryDto> Decided);
