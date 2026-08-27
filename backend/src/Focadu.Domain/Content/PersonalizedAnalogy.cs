using Focadu.Domain.Common;
using Focadu.Domain.Exceptions;

namespace Focadu.Domain.Content;

/// <summary>
/// Analogias geradas por IA conectando cada secao de um CuratedContent de Reading a um interesse/
/// hobby do aluno (Fase 21 - Entrevista de Perfil, Fase 13, so capturava os interesses sem usa-los
/// ate aqui). Fase 22: uma analogia POR SECAO do Texto Cru (delimitada por titulo #### - toda
/// leitura curada segue essa convencao, ver GetCuratedContentUseCase.SplitIntoSections e
/// CURADORIA.md), nao mais um resumo unico do texto inteiro - fica mais intuitivo reexplicar uma
/// secao so com a analogia dela, em vez de uma analogia so no fim cobrindo o texto inteiro.
///
/// Cacheada por (UserId, CuratedContentId) - gerada uma vez (GetCuratedContentUseCase via
/// IAnalogyGenerationService) e reaproveitada nas proximas vezes que o mesmo aluno reve a mesma
/// leitura. Gerada uma unica vez, nunca atualizada - se o aluno editar os interesses depois, ou a
/// leitura for editada pela autoria (numero de secoes pode mudar), leituras ja vistas ficam com as
/// analogias antigas (mesmo principio de "nao reescrever historico" que Weekly/WeeklyProject ja
/// seguem).
/// </summary>
public class PersonalizedAnalogy : Entity
{
    public Guid UserId { get; private set; }
    public Guid CuratedContentId { get; private set; }

    private readonly List<AnalogySection> _sections = new();

    /// <summary>Uma analogia por secao do Reading, na mesma ordem (SectionIndex) das secoes #### do BodyText.</summary>
    public IReadOnlyList<AnalogySection> Sections => _sections.OrderBy(s => s.SectionIndex).ToList();

    private PersonalizedAnalogy()
    {
    }

    public PersonalizedAnalogy(Guid userId, Guid curatedContentId, IReadOnlyList<string> sectionAnalogies)
    {
        if (sectionAnalogies.Count == 0)
            throw new DomainException("Pelo menos uma analogia de secao e obrigatoria.");

        UserId = userId;
        CuratedContentId = curatedContentId;
        for (var i = 0; i < sectionAnalogies.Count; i++)
            _sections.Add(new AnalogySection(i, sectionAnalogies[i]));
    }
}

/// <summary>
/// Analogia de uma secao especifica do Reading. Sem identidade propria (owned by PersonalizedAnalogy,
/// mesmo padrao de WeakDailyLink em WeeklyReinforcement) - SectionIndex + o Id do dono formam a chave.
/// </summary>
public class AnalogySection
{
    public int SectionIndex { get; private set; }
    public string Text { get; private set; }

    private AnalogySection()
    {
        Text = string.Empty;
    }

    internal AnalogySection(int sectionIndex, string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new DomainException("Texto da analogia e obrigatorio.");

        SectionIndex = sectionIndex;
        Text = text.Trim();
    }
}
