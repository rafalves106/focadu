using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Application.Shared;
using Focadu.Domain.Enums;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Caso de uso: gera o rascunho de post do LinkedIn pra prova de aprendizado do modulo (Fase 11).
/// Contexto do prompt: tema da Weekly + titulos dos CuratedContent de Leitura/Video da semana (os
/// "conceitos-chave" citados no prompt tecnico) - nao usa AiFeedback de nenhuma atividade porque
/// esse texto e sobre a atividade especifica de um aluno, nao sobre o modulo como um todo, e
/// poderia vazar detalhes de uma unica tentativa (ex: um erro) num post publico.
///
/// Fase 27: tambem injeta `Interests`/`AdditionalProfileNotes` do usuario (PersonalizationPrompt
/// Builder, mesmo texto que SubmitVoiceSummaryResponseUseCase passou a usar) - o rascunho pode
/// puxar um gancho pessoal ("como alguem que curte moto, isso me lembrou...") em vez de generico.
/// Sem perfil preenchido, o prompt fica identico ao de antes desta fase.
/// </summary>
public class GenerateLinkedInDraftUseCase
{
    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDraftGenerationService _draftGenerationService;

    public GenerateLinkedInDraftUseCase(
        IWeeklyRepository weeklyRepository, IUserRepository userRepository, IUnitOfWork unitOfWork,
        IDraftGenerationService draftGenerationService)
    {
        _weeklyRepository = weeklyRepository;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _draftGenerationService = draftGenerationService;
    }

    public async Task<ModulePublicationDto> ExecuteAsync(Guid userId, Guid weeklyId, CancellationToken cancellationToken = default)
    {
        var weekly = await _weeklyRepository.GetByIdAsync(weeklyId, userId, cancellationToken)
            ?? throw new NotFoundException("semana_nao_encontrada", "Semana nao encontrada.");

        var keyConcepts = weekly.Template.CuratedContents
            .Where(c => c.Type is CuratedContentType.Reading or CuratedContentType.Video)
            .Select(c => c.Title)
            .Take(3)
            .ToList();

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        var personalization = PersonalizationPromptBuilder.BuildInstruction(user?.Interests, user?.AdditionalProfileNotes);

        var prompt = BuildPrompt(weekly.Theme ?? weekly.Title, keyConcepts, personalization);
        var draft = await _draftGenerationService.GenerateAsync(prompt, cancellationToken);

        var publication = weekly.StartPublication();
        publication.GenerateDraft(draft);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new ModulePublicationDto(
            weeklyId, publication.Status, publication.Platform, publication.SubmittedUrl, publication.GeneratedDraft, publication.ValidationError);
    }

    private static string BuildPrompt(string theme, IReadOnlyCollection<string> keyConcepts, string? personalization)
    {
        var conceitos = keyConcepts.Count > 0
            ? string.Join(", ", keyConcepts)
            : theme;

        var personalizationBlock = personalization is null ? string.Empty : $" {personalization}";

        return
            $"Escreva um post de LinkedIn (em português, primeira pessoa, tom pessoal) contando que " +
            $"acabei de concluir um módulo de estudos sobre \"{theme}\" numa trilha de segurança web. " +
            $"Os principais conceitos que estudei foram: {conceitos}." + personalizationBlock + " " +
            "Fale sobre o que aprendi e por que isso importa pra segurança de aplicações web de " +
            "verdade, sem soar corporativo ou genérico. No máximo 3 parágrafos curtos, termine com " +
            "2 a 4 hashtags relevantes (ex: #websecurity, #cybersecurity).";
    }
}
