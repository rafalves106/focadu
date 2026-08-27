using System.Text.RegularExpressions;
using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Content;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Content;

/// <summary>
/// Caso de uso: le um CuratedContent pelo Id (Fase 7) - o frontend precisa disso pra renderizar as
/// etapas de leitura/video de uma DailyActivity (DailyActivityDto so traz o ContentId, nunca o
/// conteudo em si). Reaproveita o mesmo IWeeklyTemplateRepository.GetCuratedContentByIdAsync que
/// UpdateCuratedContentUseCase (Fase 4) ja usa - CuratedContent e curriculo (Fase 13), aberto pra
/// qualquer usuario autenticado ler, nao precisa checar matricula.
///
/// Fase 21/22: quando o conteudo e uma leitura (Reading) e o usuario ja completou a Entrevista de
/// Perfil com pelo menos 1 interesse/nota, anexa 1 analogia gerada por IA POR SECAO do texto
/// (SplitIntoSections - toda leitura curada segue a convencao ### titulo geral + N #### subsecoes,
/// ver CURADORIA.md) - IAnalogyGenerationService. Cacheado em PersonalizedAnalogy pra nao gerar (e
/// pagar) de novo a cada visualizacao da mesma leitura pelo mesmo usuario. E so um "bonus": falha
/// na geracao (Groq fora do ar, etc.) nunca derruba a leitura em si, so fica sem analogias dessa
/// vez.
/// </summary>
public class GetCuratedContentUseCase
{
    // Toda leitura curada usa "#### Titulo" pra demarcar subsecoes dentro do Texto Cru (ver
    // CURADORIA.md e os 20 dia-N.json ja curados - convencao 100% consistente ate aqui). Mesma
    // regex precisa existir no frontend (ReadingActivity.tsx) pra alinhar secao<->analogia por
    // indice - se um dia essa convencao mudar, os dois lados precisam mudar juntos.
    private static readonly Regex SectionHeading = new(@"^####\s+.+$", RegexOptions.Multiline | RegexOptions.Compiled);

    private readonly IWeeklyTemplateRepository _weeklyTemplateRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPersonalizedAnalogyRepository _analogyRepository;
    private readonly IAnalogyGenerationService _analogyGenerationService;
    private readonly IUnitOfWork _unitOfWork;

    public GetCuratedContentUseCase(
        IWeeklyTemplateRepository weeklyTemplateRepository,
        IUserRepository userRepository,
        IPersonalizedAnalogyRepository analogyRepository,
        IAnalogyGenerationService analogyGenerationService,
        IUnitOfWork unitOfWork)
    {
        _weeklyTemplateRepository = weeklyTemplateRepository;
        _userRepository = userRepository;
        _analogyRepository = analogyRepository;
        _analogyGenerationService = analogyGenerationService;
        _unitOfWork = unitOfWork;
    }

    public async Task<CuratedContentDetailDto> ExecuteAsync(Guid userId, Guid id, CancellationToken cancellationToken = default)
    {
        var content = await _weeklyTemplateRepository.GetCuratedContentByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("conteudo_nao_encontrado", "Conteudo curado nao encontrado.");

        var analogies = await GetOrGeneratePersonalizedAnalogiesAsync(userId, content, cancellationToken);

        return new CuratedContentDetailDto(content.Id, content.Type, content.Title, content.ExternalUrl, content.BodyText, analogies);
    }

    /// <summary>Divide o Texto Cru em secoes por titulo "####" - a preamble antes da 1a secao (titulo geral + paragrafo de abertura) fica de fora, so as subsecoes ganham analogia. Sem nenhum "####" encontrado, o texto inteiro vira 1 secao so (fallback, ver doc da classe).</summary>
    internal static IReadOnlyList<string> SplitIntoSections(string bodyText)
    {
        var matches = SectionHeading.Matches(bodyText);
        if (matches.Count == 0) return [bodyText];

        var sections = new List<string>();
        for (var i = 0; i < matches.Count; i++)
        {
            var start = matches[i].Index;
            var end = i + 1 < matches.Count ? matches[i + 1].Index : bodyText.Length;
            sections.Add(bodyText[start..end].Trim());
        }

        return sections;
    }

    private async Task<IReadOnlyList<string>> GetOrGeneratePersonalizedAnalogiesAsync(
        Guid userId, CuratedContent content, CancellationToken cancellationToken)
    {
        if (content.Type != CuratedContentType.Reading || content.BodyText is null) return [];

        var cached = await _analogyRepository.GetAsync(userId, content.Id, cancellationToken);
        if (cached is not null) return cached.Sections.Select(s => s.Text).ToList();

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null || (user.Interests.Count == 0 && user.AdditionalProfileNotes is null)) return [];

        try
        {
            var sections = SplitIntoSections(content.BodyText);
            var sectionAnalogies = await _analogyGenerationService.GenerateAsync(
                new AnalogyRequest(sections, user.Interests, user.AdditionalProfileNotes), cancellationToken);

            var analogy = new PersonalizedAnalogy(userId, content.Id, sectionAnalogies);
            await _analogyRepository.AddAsync(analogy, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return analogy.Sections.Select(s => s.Text).ToList();
        }
        catch (ExternalServiceException)
        {
            // Bonus, nao core: leitura continua funcionando normalmente sem analogias dessa vez.
            return [];
        }
    }
}

/// <summary>CuratedContentDto + as analogias personalizadas por secao (Fase 21/22) - shape especifico deste caso de uso, nao o Shared.CuratedContentDto (autoria/listagem nao tem "usuario atual" pra personalizar).</summary>
public record CuratedContentDetailDto(
    Guid Id, CuratedContentType Type, string Title, string? ExternalUrl, string? BodyText, IReadOnlyList<string> PersonalizedAnalogies);
