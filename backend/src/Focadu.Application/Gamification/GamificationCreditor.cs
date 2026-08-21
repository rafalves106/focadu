using Focadu.Domain.Gamification;
using Focadu.Domain.Repositories;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Gamification;

/// <summary>
/// Credita o bonus de Gems de Weekly/Monthly perfeita (Fase 14). Chamado a partir de 2 lugares
/// diferentes - CompleteDailyUseCase (quando a ULTIMA Daily original de uma Weekly completa) e
/// EvaluateWeeklyProjectUseCase (quando o projeto e avaliado) - porque Weekly.IsPerfect() so fica
/// true quando AMBAS as condicoes batem (todas as Dailies completas E o projeto avaliado, ver
/// Weekly.IsModuleComplete), e qualquer uma das duas pode ser o evento que "fecha" a Weekly,
/// dependendo da ordem que o aluno segue (a verificacao ao vivo da Fase 13a, por exemplo, sempre
/// concluiu as Dailies primeiro e avaliou o projeto por ultimo). Extraido pra nao duplicar a
/// checagem de Monthly-perfeito (cruza Weekly-instancias da Enrollment + WeeklyTemplates do
/// curriculo) nos dois lugares.
///
/// Nunca credita 2x: cada chamador so credita quando encontra IsPerfect()==true NA HORA - o
/// WeeklyProject.Evaluate() do dominio ja rejeita ser chamado 2x (DomainException se
/// Status != Submitted), e uma Daily so pode ser "primeira conclusao" uma unica vez - entao,
/// pra qualquer Weekly, so existe 1 momento em que IsPerfect() vira true pela primeira vez,
/// nao importa qual dos 2 chamadores observa esse momento.
/// </summary>
public class GamificationCreditor
{
    private readonly IMonthlyRepository _monthlyRepository;
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUserGemBalanceRepository _gemBalanceRepository;

    public GamificationCreditor(
        IMonthlyRepository monthlyRepository, IWeeklyRepository weeklyRepository, IUserGemBalanceRepository gemBalanceRepository)
    {
        _monthlyRepository = monthlyRepository;
        _weeklyRepository = weeklyRepository;
        _gemBalanceRepository = gemBalanceRepository;
    }

    /// <summary>Busca o UserGemBalance do usuario, criando um novo (TotalGems=0) se ainda nao existir - primeira escrita de gamificacao deste usuario.</summary>
    public async Task<UserGemBalance> GetOrCreateGemBalanceAsync(Guid userId, DateOnly today, CancellationToken cancellationToken)
    {
        var balance = await _gemBalanceRepository.GetByUserIdAsync(userId, cancellationToken);
        if (balance is not null) return balance;

        balance = new UserGemBalance(userId, today);
        await _gemBalanceRepository.AddAsync(balance, cancellationToken);
        return balance;
    }

    /// <summary>
    /// Se `weekly` esta perfeita agora, credita +5 Gems (respeitando o cap mensal) e, se isso
    /// tambem fechar o Monthly inteiro (todas as WeeklyTemplates do Monthly com Weekly-instancia
    /// perfeita), credita +30 Gems extra. `gemBalance` e recebido ja resolvido pelo chamador (nao
    /// buscado de novo aqui) - evita 2 leituras/criacoes da mesma linha dentro da mesma unidade de
    /// trabalho quando quem chama (ex: CompleteDailyUseCase) ja precisou resolver o mesmo saldo
    /// pra outro credito (a Daily em si). Retorna quantas Gems foram creditadas por esta chamada.
    /// </summary>
    public async Task<int> CreditWeeklyAndMonthlyIfPerfectAsync(
        UserGemBalance gemBalance, Weekly weekly, DateOnly today, CancellationToken cancellationToken)
    {
        if (!weekly.IsPerfect()) return 0;

        var earned = gemBalance.CreditWeekly(today);

        var monthly = await _monthlyRepository.GetByIdAsync(weekly.Template.MonthlyId, cancellationToken);
        if (monthly is null || monthly.WeeklyTemplates.Count == 0) return earned;

        var enrollmentWeeklies = await _weeklyRepository.GetByEnrollmentIdAsync(weekly.EnrollmentId, cancellationToken);
        var monthWeeklies = enrollmentWeeklies.Where(w => w.Template.MonthlyId == monthly.Id).ToList();

        var monthlyPerfect = monthWeeklies.Count == monthly.WeeklyTemplates.Count && monthWeeklies.All(w => w.IsPerfect());
        if (monthlyPerfect)
        {
            earned += gemBalance.CreditMonthly(today);
        }

        return earned;
    }
}
