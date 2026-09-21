using Focadu.Application.Exceptions;
using Focadu.Domain.Weeklies;

namespace Focadu.Application.Notes;

/// <summary>
/// Fase 57 (bug real, 21/09/2026): quais Dailies "contam" como as anotacoes de uma sessao - o
/// escopo do painel "Suas anotacoes de hoje" (Resumo Falado, Fase 35). Ele buscava por DATA da
/// Daily e a sessao de REFORCO aparecia sempre vazia: o reforco e outra Daily (outro Id, outra
/// Date - o dia em que foi gerado), e as notas do dia ficam presas ao DailyId de origem. A busca
/// por data tambem vazava: a Date do reforco pode coincidir com a data agendada de uma Daily
/// futura, misturando notas de duas sessoes.
///
/// Agora o escopo e por Daily: a propria + (se for reforco) a Daily base que o gerou - "reforco
/// puxa as anotacoes do dia base dele". A propria entra junto pra nao esconder o que o aluno
/// anotou durante o reforco. Regra vive aqui (e nao no caso de uso) so pra ser testavel sem
/// fake de repositorio - ver ListNotesUseCase.
/// </summary>
internal static class NoteDailyScope
{
    /// <exception cref="NotFoundException">
    /// `daily_nao_encontrada` quando a Daily nao esta em nenhuma das Weeklies dadas - o chamador so
    /// passa as Weeklies da matricula do usuario logado, entao um Id de outro usuario cai aqui em
    /// vez de vazar dado de ninguem.
    /// </exception>
    public static HashSet<Guid> Resolve(IEnumerable<Weekly> weeklies, Guid dailyId)
    {
        var weekly = weeklies.FirstOrDefault(w => w.Dailies.Any(d => d.Id == dailyId))
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada neste curso.");

        var scope = new HashSet<Guid> { dailyId };

        var baseDaily = weekly.FindReinforcementSource(dailyId);
        if (baseDaily is not null)
            scope.Add(baseDaily.Id);

        return scope;
    }
}
