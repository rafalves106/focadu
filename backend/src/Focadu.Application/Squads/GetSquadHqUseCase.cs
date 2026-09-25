using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Domain.Cosmetics;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;
using Focadu.Domain.Squads;

namespace Focadu.Application.Squads;

/// <summary>
/// Caso de uso: o QG do Squad (Fase 72, Figma "Perfil + Squad — v2", node 121:6971) - a tela inicial
/// do squad, agora em rota propria (/squad). Numa chamada: cabecalho (nome, codigo de convite,
/// lider/co-lider), a escalacao (cada membro com o agente em pixel art e se ja estudou hoje), a meta
/// da semana (SquadWeeklyGoal) e o feed de ultimas atividades com os GGs. O ranking continua em
/// GetSquadRankingUseCase (tem recorte e paginacao proprios).
///
/// O feed NAO e persistido: e derivado na leitura das datas que ja existem - Daily.CompletedAt,
/// WeeklyProject.EvaluatedAt, UserCosmeticInventory.AcquiredAt (compra na loja e criacao do agente) e
/// SquadMembership.JoinedAt. So entra atividade de quem esta no squad agora, dos ultimos
/// <see cref="FeedDays"/> dias. Badges nao entram: sao calculadas sob demanda (GetUserBadgesUseCase) e
/// nao tem data de conquista. Marcos de ofensiva tambem nao: UserStreak so guarda o valor atual.
///
/// Privacidade (decisao do dono): quem ligou User.HideScoresInSquadFeed aparece no feed sem a nota -
/// menos pra si mesmo.
/// </summary>
public class GetSquadHqUseCase
{
    internal const int FeedDays = 14;
    internal const int FeedLimit = 40;

    private readonly ISquadRepository _squadRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUserEquippedCosmeticsRepository _equippedCosmeticsRepository;
    private readonly IUserCosmeticInventoryRepository _inventoryRepository;
    private readonly ICosmeticItemRepository _cosmeticItemRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public GetSquadHqUseCase(
        ISquadRepository squadRepository,
        IEnrollmentRepository enrollmentRepository,
        IWeeklyRepository weeklyRepository,
        IUserRepository userRepository,
        IUserEquippedCosmeticsRepository equippedCosmeticsRepository,
        IUserCosmeticInventoryRepository inventoryRepository,
        ICosmeticItemRepository cosmeticItemRepository,
        IUnitOfWork unitOfWork,
        IClock clock)
    {
        _squadRepository = squadRepository;
        _enrollmentRepository = enrollmentRepository;
        _weeklyRepository = weeklyRepository;
        _userRepository = userRepository;
        _equippedCosmeticsRepository = equippedCosmeticsRepository;
        _inventoryRepository = inventoryRepository;
        _cosmeticItemRepository = cosmeticItemRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<SquadHqDto> ExecuteAsync(Guid requestingUserId, CancellationToken cancellationToken = default)
    {
        var membership = await _squadRepository.GetMembershipByUserIdAsync(requestingUserId, cancellationToken)
            ?? throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");
        var squad = await _squadRepository.GetByIdAsync(membership.SquadId, cancellationToken)
            ?? throw new NotFoundException("squad_nao_encontrado", "Voce nao esta em nenhum squad.");

        await SquadJoinCode.EnsureAsync(squad, _squadRepository, _unitOfWork, cancellationToken);

        var itemsById = (await _cosmeticItemRepository.GetAllAsync(cancellationToken)).ToDictionary(i => i.Id);
        var facts = new List<MemberFacts>();
        foreach (var member in await _squadRepository.GetMembersAsync(squad.Id, cancellationToken))
            facts.Add(await LoadFactsAsync(member, itemsById, cancellationToken));

        var today = _clock.Today();
        var feed = BuildFeed(facts, requestingUserId, today);
        var keys = feed.Select(a => a.Key).ToList();
        var cheers = await _squadRepository.GetCheersAsync(squad.Id, keys, cancellationToken);
        var cheersByKey = cheers.GroupBy(c => c.ActivityKey).ToDictionary(g => g.Key, g => g.ToList());

        return new SquadHqDto(
            squad.Id, squad.Name, squad.JoinCode!, squad.OwnerUserId, squad.CoLeaderUserId, squad.CreatedAt,
            BuildLineup(facts, squad.OwnerUserId, squad.CoLeaderUserId, today),
            BuildWeeklyGoal(facts, today),
            feed.Select(a => cheersByKey.TryGetValue(a.Key, out var list)
                    ? a with { Cheers = list.Count, CheeredByMe = list.Any(c => c.FromUserId == requestingUserId) }
                    : a)
                .ToList());
    }

    private async Task<MemberFacts> LoadFactsAsync(SquadMembership member, IReadOnlyDictionary<Guid, CosmeticItem> itemsById, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(member.UserId, cancellationToken);
        var completions = new List<CompletionFact>();
        var projects = new List<ProjectFact>();
        foreach (var enrollment in await _enrollmentRepository.GetByUserIdAsync(member.UserId, cancellationToken))
        {
            foreach (var weekly in await _weeklyRepository.GetByEnrollmentIdAsync(enrollment.Id, cancellationToken))
            {
                completions.AddRange(weekly.Dailies
                    .Where(d => d.CompletedAt.HasValue)
                    .Select(d => new CompletionFact(d.Id, d.DayNumber, d.IsReinforcement, d.CompletedAt!.Value, d.CalculateScore())));
                if (weekly.Project is { EvaluatedAt: { } evaluatedAt } project)
                    projects.Add(new ProjectFact(project.Id, weekly.Number, evaluatedAt, project.Score));
            }
        }

        var acquisitions = (await _inventoryRepository.GetByUserIdAsync(member.UserId, cancellationToken))
            .Where(i => itemsById.ContainsKey(i.CosmeticItemId))
            .Select(i => new AcquisitionFact(i.Id, itemsById[i.CosmeticItemId], i.AcquiredAt))
            .ToList();

        var equipped = await _equippedCosmeticsRepository.GetByUserIdAsync(member.UserId, cancellationToken);
        return new MemberFacts(
            member.UserId, user?.DisplayName ?? "Agente", user?.HideScoresInSquadFeed ?? false, member.Id, member.JoinedAt,
            AgentLooks.Resolve(equipped, itemsById), completions, projects, acquisitions);
    }

    /// <summary>Lider primeiro, depois o co-lider, depois por ordem de entrada - a mesma ordem da escalacao no Figma.</summary>
    internal static List<SquadMemberDto> BuildLineup(IReadOnlyCollection<MemberFacts> facts, Guid ownerUserId, Guid? coLeaderUserId, DateOnly today) =>
        facts
            .OrderBy(f => f.UserId == ownerUserId ? 0 : f.UserId == coLeaderUserId ? 1 : 2)
            .ThenBy(f => f.JoinedAt)
            .Select(f =>
            {
                var studied = f.Completions.Select(c => LocalDate(c.CompletedAt)).ToList();
                return new SquadMemberDto(
                    f.UserId, f.DisplayName, f.Look, studied.Contains(today),
                    studied.Count == 0 ? null : studied.Max(), f.JoinedAt);
            })
            .ToList();

    /// <summary>Dailies concluidas (reforco nao conta - e repeticao, nao dia novo) de todos os membros, de segunda ate hoje.</summary>
    internal static SquadWeeklyGoalDto BuildWeeklyGoal(IReadOnlyCollection<MemberFacts> facts, DateOnly today)
    {
        var weekStart = SquadWeeklyGoal.WeekStart(today);
        var completed = facts.Sum(f => f.Completions.Count(c => !c.IsReinforcement && LocalDate(c.CompletedAt) >= weekStart && LocalDate(c.CompletedAt) <= today));
        var studiedToday = facts.Count(f => f.Completions.Any(c => LocalDate(c.CompletedAt) == today));
        return new SquadWeeklyGoalDto(completed, SquadWeeklyGoal.Target(facts.Count), studiedToday, weekStart);
    }

    /// <summary>
    /// Atividades dos ultimos <see cref="FeedDays"/> dias, mais nova primeiro, no maximo <see cref="FeedLimit"/>.
    /// Chave de cada uma = "tipo:autor:id" (ver SquadCheer.ActivityKey): estavel entre leituras e com o
    /// autor dentro, pro ToggleSquadCheerUseCase validar sem ter que reconstruir o feed. GGs zerados aqui
    /// - quem chama preenche.
    /// </summary>
    internal static List<SquadActivityDto> BuildFeed(IReadOnlyCollection<MemberFacts> facts, Guid viewerUserId, DateOnly today)
    {
        var since = today.AddDays(-(FeedDays - 1));
        var feed = new List<SquadActivityDto>();

        foreach (var f in facts)
        {
            var showScores = !f.HideScores || f.UserId == viewerUserId;
            SquadActivityDto Activity(string type, Guid id, DateTime at) =>
                new($"{type}:{f.UserId}:{id}", type, f.UserId, f.DisplayName, at, null, null, null, null, null, 0, false);

            foreach (var c in f.Completions)
            {
                var type = c.IsReinforcement ? SquadActivityType.Reinforcement : SquadActivityType.Daily;
                feed.Add(Activity(type, c.DailyId, c.CompletedAt) with { DayNumber = c.DayNumber, Score = showScores ? c.Score : null });
            }

            foreach (var p in f.Projects)
                feed.Add(Activity(SquadActivityType.Project, p.ProjectId, p.EvaluatedAt) with { WeekNumber = p.WeekNumber, Score = showScores ? p.Score : null });

            // O kit basico e o 1o cabelo natural chegam juntos na criacao do agente (CreateAgentUseCase):
            // viram 1 atividade "criou o agente", nao "comprou" - o resto do inventario e compra na loja.
            var starters = f.Acquisitions.Where(a => a.Item.IsStarter).ToList();
            DateTime? createdAgentAt = starters.Count == 0 ? null : starters.Min(a => a.AcquiredAt);
            if (createdAgentAt is { } agentAt)
                feed.Add(Activity(SquadActivityType.Agent, starters.OrderBy(a => a.AcquiredAt).First().InventoryId, agentAt));

            foreach (var a in f.Acquisitions.Where(a => !a.Item.IsStarter && !IsFreeHairAtCreation(a, createdAgentAt)))
                feed.Add(Activity(SquadActivityType.Purchase, a.InventoryId, a.AcquiredAt) with { ItemName = a.Item.Name, ItemRarity = a.Item.Rarity });

            feed.Add(Activity(SquadActivityType.Joined, f.MembershipId, f.JoinedAt));
        }

        return feed
            .Where(a => LocalDate(a.OccurredAt) >= since && LocalDate(a.OccurredAt) <= today)
            .OrderByDescending(a => a.OccurredAt)
            .Take(FeedLimit)
            .ToList();
    }

    private static bool IsFreeHairAtCreation(AcquisitionFact acquisition, DateTime? createdAgentAt) =>
        createdAgentAt is { } at
        && acquisition.Item.Code is { } code
        && AgentStarter.NaturalHairCodes.Contains(code)
        && (acquisition.AcquiredAt - at).Duration() < TimeSpan.FromMinutes(1);

    private static DateOnly LocalDate(DateTime utc) => DateOnly.FromDateTime(utc.ToLocalTime());
}

/// <summary>Tipos de atividade do feed (texto no JSON, igual a chave do GG).</summary>
public static class SquadActivityType
{
    public const string Daily = "daily";
    public const string Reinforcement = "reinforcement";
    public const string Project = "project";
    public const string Purchase = "purchase";
    public const string Agent = "agent";
    public const string Joined = "joined";
}

/// <summary>O que o feed e a escalacao precisam de um membro - so dados simples, pra BuildFeed/BuildLineup serem testaveis sem repositorio.</summary>
internal record MemberFacts(
    Guid UserId, string DisplayName, bool HideScores, Guid MembershipId, DateTime JoinedAt, AgentLookDto? Look,
    IReadOnlyCollection<CompletionFact> Completions, IReadOnlyCollection<ProjectFact> Projects, IReadOnlyCollection<AcquisitionFact> Acquisitions);

internal record CompletionFact(Guid DailyId, int DayNumber, bool IsReinforcement, DateTime CompletedAt, double? Score);

internal record ProjectFact(Guid ProjectId, int WeekNumber, DateTime EvaluatedAt, int? Score);

internal record AcquisitionFact(Guid InventoryId, CosmeticItem Item, DateTime AcquiredAt);

/// <param name="LastStudiedOn">Ultimo dia com Daily concluida - "ontem" na escalacao quando nao estudou hoje.</param>
public record SquadMemberDto(Guid UserId, string DisplayName, AgentLookDto? Look, bool StudiedToday, DateOnly? LastStudiedOn, DateTime JoinedAt);

/// <param name="Completed">Dailies concluidas pelo squad desde <paramref name="WeekStart"/> (segunda).</param>
/// <param name="StudiedToday">Quantos membros ja concluiram alguma Daily hoje.</param>
public record SquadWeeklyGoalDto(int Completed, int Target, int StudiedToday, DateOnly WeekStart);

/// <summary>
/// Uma atividade do feed. Campos opcionais por tipo: DayNumber (daily/reinforcement), WeekNumber
/// (project), Score (daily/project; nulo se o autor esconde as notas, ou reforco), ItemName/ItemRarity (purchase).
/// </summary>
public record SquadActivityDto(
    string Key, string Type, Guid UserId, string DisplayName, DateTime OccurredAt,
    int? DayNumber, int? WeekNumber, double? Score, string? ItemName, CosmeticRarity? ItemRarity,
    int Cheers, bool CheeredByMe);

public record SquadHqDto(
    Guid SquadId, string Name, string JoinCode, Guid OwnerUserId, Guid? CoLeaderUserId, DateTime CreatedAt,
    IReadOnlyList<SquadMemberDto> Members, SquadWeeklyGoalDto WeeklyGoal, IReadOnlyList<SquadActivityDto> Feed);
