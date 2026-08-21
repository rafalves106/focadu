using Focadu.Application.Exceptions;
using Focadu.Application.Gamification;
using Focadu.Application.Ports;
using Focadu.Domain.Gamification;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: usuario conclui a Daily em andamento (ou uma repeticao/replay). O reforco diario/
/// semanal, quando existe, ja foi disparado antes disso (durante SubmitActivityResponseUseCase,
/// resposta a resposta - ver EvaluationPolicy) - aqui so reportamos o estado final pro cliente
/// saber se precisa navegar pra uma sessao de reforco (Fase 4).
///
/// Fase 14 (Gamificacao): Daily.OnFirstCompleted/OnReplayCompleted (hooks propositalmente vazios
/// no dominio) nao ganharam logica - Daily nao tem acesso a UserGemBalance/UserStreak (aggregates
/// diferentes, exigiriam passar repositorio pro dominio, quebrando a arquitetura hexagonal), e o
/// projeto nao tem nenhum mecanismo de Domain Events pra "escutar" um hook de dominio dali (ver
/// docs/ARQUITETURA.md - nenhuma fase anterior introduziu esse padrao). Resolvido aqui, no caso de
/// uso, a abordagem mais simples que ja se encaixa no estilo do projeto (mesmo raciocinio de
/// "onde a decisao de negocio realmente mora" ja usado em GetCourseDetailUseCase, que tambem cruza
/// aggregates na camada de aplicacao).
///
/// Fase 15 (Bonus de Superacao): 1a conclusao de uma Daily de reforco com TODAS as atividades
/// aprovadas (Daily.AllActivitiesPassed) credita UserGemBalance.CreditReinforcementBonus (+2) em
/// vez do CreditDaily normal (+1) - nunca os dois juntos. Reforco concluido sem sucesso total
/// continua ganhando o credito normal (so sem o bonus), exatamente como uma Daily comum.
/// </summary>
public class CompleteDailyUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUserStreakRepository _streakRepository;
    private readonly GamificationCreditor _gamificationCreditor;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;

    public CompleteDailyUseCase(
        IWeeklyRepository weeklyRepository,
        IUserStreakRepository streakRepository,
        GamificationCreditor gamificationCreditor,
        IUnitOfWork unitOfWork,
        IClock clock)
    {
        _weeklyRepository = weeklyRepository;
        _streakRepository = streakRepository;
        _gamificationCreditor = gamificationCreditor;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<CompleteDailyResult> ExecuteAsync(Guid userId, Guid dailyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        var today = _clock.Today();
        // Capturado ANTES de Complete() virar o status - depois disso HasEverCompleted e sempre
        // true, nao daria mais pra distinguir "1a conclusao" de replay.
        var isFirstCompletion = !daily.HasEverCompleted;

        daily.Complete();

        var gemsEarned = 0;
        var wasReinforcementBonus = false;
        var streak = await _streakRepository.GetByUserIdAsync(userId, cancellationToken);

        if (isFirstCompletion)
        {
            var gemBalance = await _gamificationCreditor.GetOrCreateGemBalanceAsync(userId, today, cancellationToken);

            wasReinforcementBonus = daily.IsReinforcement && daily.AllActivitiesPassed();
            gemsEarned += wasReinforcementBonus ? gemBalance.CreditReinforcementBonus(today) : gemBalance.CreditDaily(today);
            gemsEarned += await _gamificationCreditor.CreditWeeklyAndMonthlyIfPerfectAsync(gemBalance, weekly, today, cancellationToken);

            // So conta pro streak se a Daily e de hoje mesmo (ver Especificacao Funcional, item 2)
            // - replay nunca chega aqui (isFirstCompletion=false), e uma Daily "de hoje" so pode
            // ser sua 1a conclusao no dia certo (Dailies passadas ja tinham virado ReadOnly antes
            // de conseguir uma 1a conclusao nova, ver Weekly.EvaluateDailyAccess) - a checagem
            // ainda assim fica explicita aqui, espelhando a regra tal como descrita.
            if (daily.Date == today)
            {
                if (streak is null)
                {
                    streak = new UserStreak(userId);
                    await _streakRepository.AddAsync(streak, cancellationToken);
                }

                streak.RegisterCompletion(today);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var accessMode = weekly.EvaluateDailyAccess(dailyId, today);
        var dailyDto = DailyStateMapper.ToDto(daily, accessMode);

        var weeklyReinforcement = weekly.Reinforcements.FirstOrDefault(r => r.WeakDailyIds.Contains(daily.Id));
        var streakAfterCompletion = streak?.CurrentStreakAsOf(today) ?? 0;

        return new CompleteDailyResult(
            dailyDto,
            daily.ReinforcementTriggered,
            daily.ReinforcementDailyId,
            weeklyReinforcement is not null,
            weeklyReinforcement?.Id,
            gemsEarned,
            streakAfterCompletion,
            wasReinforcementBonus);
    }
}
