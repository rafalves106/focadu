using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Ranking;
using Focadu.Application.Shared;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: ranking dos membros do proprio squad, num dos 3 recortes (RankingScope) - reusa
/// GetCourseRankingUseCase.ComputeScore/RankEntries (Fase 16) e RankingEntryDto direto, mesmo
/// principio de "Score sempre computado sob demanda, nunca persistido". Gems, ao contrario de
/// Score, nao tem recorte semana/mes no dominio (UserGemBalance so guarda o total acumulado e um
/// contador "neste mes calendario" pra cap de ganho, nao um historico por semana) - por isso os
/// agregados de Gems abaixo (TotalGems/AverageGems) sao sempre o saldo TOTAL de cada membro,
/// independente do `scope` pedido, igual GetGamificationSummaryUseCase.TotalGems.
///
/// TAMBEM e onde Squad.JoinCode e gerado (lazy, na 1a vez que o dono ou qualquer membro pede pra
/// ver o proprio squad) - nao ha endpoint dedicado "GET /api/squads/me" nesta fase, esta consulta
/// de ranking already devolve tudo que a tela de Squad precisa (nome, codigo pra compartilhar,
/// classificacao) numa unica chamada.
///
/// `Members` e paginado (`page`, `PageSize` membros por pagina - Fase 24c) - squad nao tem cap de
/// tamanho (JoinSquadUseCase aceita qualquer um com o codigo), diferente do Course ranking que so
/// mostra um Top 10 fixo. Os agregados (Total/AverageScore/Gems) e `CurrentUserEntry` continuam
/// calculados sobre o squad INTEIRO, nunca so a pagina - so a lista `Members` e cortada. O
/// gerenciamento de membros do frontend (remover/promover) opera sobre a mesma pagina exibida
/// (ponytail: squads gigantes exigem trocar de pagina pra gerenciar quem nao esta na 1a - reavaliar
/// com paginacao de gerenciamento separada se squads realmente grandes aparecerem na pratica).
/// </summary>
public class GetSquadRankingUseCase
{
    /// <summary>Squad nao tem cap de tamanho (JoinSquadUseCase aceita qualquer um com o codigo) - paginado pra nao devolver um array sem limite se um squad crescer muito.</summary>
    internal const int PageSize = 20;

    private readonly ISquadRepository _squadRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUserGemBalanceRepository _gemBalanceRepository;
    private readonly IUserEquippedCosmeticsRepository _equippedCosmeticsRepository;
    private readonly ICosmeticItemRepository _cosmeticItemRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public GetSquadRankingUseCase(
        ISquadRepository squadRepository,
        IEnrollmentRepository enrollmentRepository,
        IWeeklyRepository weeklyRepository,
        IUserRepository userRepository,
        IUserGemBalanceRepository gemBalanceRepository,
        IUserEquippedCosmeticsRepository equippedCosmeticsRepository,
        ICosmeticItemRepository cosmeticItemRepository,
        IUnitOfWork unitOfWork,
        IClock clock)
    {
        _squadRepository = squadRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _userRepository = userRepository;
        _gemBalanceRepository = gemBalanceRepository;
        _equippedCosmeticsRepository = equippedCosmeticsRepository;
        _cosmeticItemRepository = cosmeticItemRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<SquadRankingResultDto> ExecuteAsync(Guid requestingUserId, RankingScope scope, int page = 1, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);

        var requesterMembership = await _squadRepository.GetMembershipByUserIdAsync(requestingUserId, cancellationToken)
            ?? throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");

        var squad = await _squadRepository.GetByIdAsync(requesterMembership.SquadId, cancellationToken)
            ?? throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");

        if (squad.JoinCode is null)
        {
            var code = await UniqueCodeGenerator.GenerateAsync(
                async candidate => await _squadRepository.GetByJoinCodeAsync(candidate, cancellationToken) is not null);
            squad.AssignJoinCode(code);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        var members = await _squadRepository.GetMembersAsync(squad.Id, cancellationToken);
        var today = _clock.Today();
        var itemNameById = (await _cosmeticItemRepository.GetAllAsync(cancellationToken)).ToDictionary(i => i.Id, i => i.Name);

        var scored = new List<ScoredEnrollment>();
        var totalGems = 0;
        foreach (var membership in members)
        {
            var enrollments = await _enrollmentRepository.GetByUserIdAsync(membership.UserId, cancellationToken);
            var weeklies = new List<Weekly>();
            foreach (var enrollment in enrollments)
                weeklies.AddRange(await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken));

            var user = await _userRepository.GetByIdAsync(membership.UserId, cancellationToken);
            var gemBalance = await _gemBalanceRepository.GetByUserIdAsync(membership.UserId, cancellationToken);
            var equipped = await _equippedCosmeticsRepository.GetByUserIdAsync(membership.UserId, cancellationToken);
            var nameColor = equipped?.EquippedNameColorId is { } colorId && itemNameById.TryGetValue(colorId, out var name)
                ? name
                : null;

            totalGems += gemBalance?.TotalGems ?? 0;
            scored.Add(new ScoredEnrollment(
                membership.UserId, user?.DisplayName ?? "Usuario",
                GetCourseRankingUseCase.ComputeScore(weeklies, scope, today), membership.JoinedAt, nameColor));
        }

        var ranked = GetCourseRankingUseCase.RankEntries(scored);
        var currentUserEntry = ranked.FirstOrDefault(e => e.UserId == requestingUserId);
        // Nome do Co-Lider resolvido aqui (contra a lista INTEIRA, antes de paginar) - ele pode
        // nao estar na pagina atual de `Members`, o header do squad precisa do nome de qualquer jeito.
        var coLeaderName = ranked.FirstOrDefault(e => e.UserId == squad.CoLeaderUserId)?.DisplayName;
        var memberCount = ranked.Count;
        var totalScore = ranked.Sum(e => e.Score);
        var pageEntries = ranked.Skip((page - 1) * PageSize).Take(PageSize).ToList();

        return new SquadRankingResultDto(
            squad.Id, squad.Name, squad.JoinCode!, squad.OwnerUserId, squad.CoLeaderUserId, coLeaderName,
            pageEntries, currentUserEntry,
            totalScore, memberCount == 0 ? 0 : totalScore / memberCount,
            totalGems, memberCount == 0 ? 0 : (double)totalGems / memberCount,
            page, PageSize, memberCount);
    }
}

/// <summary>
/// TotalScore/AverageScore/TotalGems/AverageGems sao a soma/media dos membros pedida no prompt da
/// Fase 24 - agregados do SQUAD inteiro (nunca so da pagina atual), complementares a lista
/// `Members` (a classificacao individual, mesmo formato de RankingResultDto). CurrentUserEntry
/// nunca e null aqui (diferente de RankingResultDto) - se o usuario chegou a este ponto, ele
/// necessariamente tem uma SquadMembership. `Members` e so a pagina pedida (`Page`/`PageSize`,
/// `TotalMembers` e o total do squad) - squad nao tem cap de tamanho (Fase 24c). CoLeaderDisplayName
/// vem resolvido contra o squad inteiro (nao contra a pagina) porque o Co-Lider pode estar fora dela.
/// </summary>
public record SquadRankingResultDto(
    Guid SquadId,
    string SquadName,
    string JoinCode,
    Guid OwnerUserId,
    Guid? CoLeaderUserId,
    string? CoLeaderDisplayName,
    IReadOnlyCollection<RankingEntryDto> Members,
    RankingEntryDto? CurrentUserEntry,
    double TotalScore,
    double AverageScore,
    int TotalGems,
    double AverageGems,
    int Page,
    int PageSize,
    int TotalMembers);
