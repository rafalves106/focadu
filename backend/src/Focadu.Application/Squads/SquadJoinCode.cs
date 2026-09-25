using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Domain.Repositories;
using Focadu.Domain.Squads;

namespace Focadu.Application.Squads;

/// <summary>
/// Gera o Squad.JoinCode na 1a vez que alguem abre o proprio squad (lazy, Fase 24). Era codigo do
/// GetSquadRankingUseCase; na Fase 72 o QG do Squad (GetSquadHqUseCase) passou a ser a tela inicial
/// e precisa do codigo tambem - quem chegar primeiro gera.
/// </summary>
internal static class SquadJoinCode
{
    public static async Task EnsureAsync(Squad squad, ISquadRepository squadRepository, IUnitOfWork unitOfWork, CancellationToken cancellationToken)
    {
        if (squad.JoinCode is not null) return;

        var code = await UniqueCodeGenerator.GenerateAsync(
            async candidate => await squadRepository.GetByJoinCodeAsync(candidate, cancellationToken) is not null);
        squad.AssignJoinCode(code);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
