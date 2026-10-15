using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.ProductMetrics;

/// <summary>
/// "O aluno abriu esta tela neste dia, neste tipo de aparelho" (Fase 103, medicao de produto). No maximo uma linha por
/// aluno, dia, tela e aparelho (indice unico): e o que alimenta o retorno D1/D7/D30 ("abriu o app") e o aparelho por
/// tela da aba Retencao. Sem chave estrangeira, como a medicao de IA. Nunca e editada.
/// </summary>
public class ScreenVisit : Entity
{
    /// <summary>
    /// Chaves das telas, as do guia das telas (`guideScreenFor` em frontend/src/lib/guiaTelas.ts), com "hoje" (escolha do
    /// dia, `/hoje` sem `?daily=`) separada de "sessao" (a Daily aberta). Mesma lista em `screenVisitKey` do front.
    /// </summary>
    public static readonly IReadOnlySet<string> KnownScreens = new HashSet<string>
    {
        "onboarding", "start", "hoje", "trilha", "semana", "sessao", "projeto", "perfil", "squad", "loja", "ranking",
        "certificacoes", "caderninho", "gestao",
    };

    public const string OtherScreen = "outra";

    public Guid UserId { get; private set; }

    /// <summary>Dia local do aluno (IClock.Today), mesmo criterio da ofensiva.</summary>
    public DateOnly Day { get; private set; }

    public string Screen { get; private set; }
    public DeviceClass Device { get; private set; }

    /// <summary>Primeira vez no dia (UTC).</summary>
    public DateTime FirstSeenAt { get; private set; }

    private ScreenVisit()
    {
        Screen = OtherScreen;
    }

    public static ScreenVisit Create(Guid userId, DateOnly day, string? screen, DeviceClass device, DateTime firstSeenAt)
    {
        if (userId == Guid.Empty)
            throw new DomainException("Aluno e obrigatorio.");

        return new ScreenVisit
        {
            UserId = userId,
            Day = day,
            Screen = NormalizeScreen(screen),
            Device = device,
            FirstSeenAt = firstSeenAt,
        };
    }

    /// <summary>Tela desconhecida (ou vazia) vira "outra": a medicao nunca grava texto livre vindo do navegador.</summary>
    public static string NormalizeScreen(string? screen)
    {
        var key = screen?.Trim().ToLowerInvariant();
        return key is not null && KnownScreens.Contains(key) ? key : OtherScreen;
    }
}
