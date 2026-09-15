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

            // 1a conclusao sempre conta pro streak (ver Especificacao Funcional, item 2) - replay
            // nunca chega aqui (isFirstCompletion=false), e esta acao e sempre sincrona: nao existe
            // "completar uma Daily" em nome de um dia diferente de hoje. Fase 38b: ate aqui isso
            // era guardado por "daily.Date == today", mas Daily.Date e fixado de uma vez so na
            // matricula (calendario hipotetico) e pode divergir do dia real em que a 1a conclusao
            // efetivamente acontece - com a checagem antiga, streak simplesmente parava de contar
            // pra quem estivesse fora do ritmo assumido na matricula (o mesmo bug de fundo do
            // atalho "/hoje", ver GetTodayUseCase).
            if (streak is null)
            {
                streak = new UserStreak(userId);
                await _streakRepository.AddAsync(streak, cancellationToken);
            }

            streak.RegisterCompletion(today);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // isNextInSequence nao importa aqui: "daily" acabou de virar Completed, e esse branch de
        // EvaluateDailyAccess resolve antes de chegar no parametro (ver Weekly.EvaluateDailyAccess).
        var accessMode = weekly.EvaluateDailyAccess(dailyId, today, isNextInSequence: false);
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
