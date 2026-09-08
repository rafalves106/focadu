using Focadu.Application.Exceptions;
using Focadu.Application.Ports;
using Focadu.Domain.Enums;
using Focadu.Domain.Exceptions;
using Focadu.Domain.Repositories;

namespace Focadu.Application.Dailies;

/// <summary>
/// Caso de uso: usuario submete um resumo falado (VoiceSummary) em audio. Fluxo: transcreve
/// (IAudioTranscriptionService) -> avalia contra o CuratedContent de referencia
/// (IContentEvaluationService) -> Score/Passed vem inteiramente da avaliacao (nunca do cliente -
/// mesma garantia ja estabelecida pros outros 4 tipos desde a Fase 4) -> grava a resposta e checa
/// reforco, via ActivityResponseRecorder (compartilhado com SubmitActivityResponseUseCase).
///
/// Fase 27: busca `Interests`/`AdditionalProfileNotes` do usuario (mesmo dado que a Entrevista de
/// Perfil da Fase 13b ja captura) e repassa no `ContentEvaluationRequest` - GroqContentEvaluation
/// Service usa isso so no FEEDBACK, nunca no Score. Usuario sem perfil preenchido (Interests vazio
/// e AdditionalProfileNotes null) nao muda nada - PersonalizationPromptBuilder retorna null e o
/// prompt fica identico ao de antes desta fase.
/// </summary>
public class SubmitVoiceSummaryResponseUseCase
{
    /// <summary>
    /// ponytail: teto arbitrario mas calibrado - ~10min de audio gravado pelo navegador (webm/
    /// opus) fica bem abaixo disso na pratica, e e tambem o limite de upload da Groq pro endpoint
    /// de transcricao. Upgrade se o formato de gravacao do frontend mudar pra algo bem menos
    /// eficiente.
    /// </summary>
    public const long MaxAudioSizeBytes = 25 * 1024 * 1024;

    private readonly IWeeklyRepository _weeklyRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;
    private readonly IAudioTranscriptionService _transcriptionService;
    private readonly IContentEvaluationService _evaluationService;

    public SubmitVoiceSummaryResponseUseCase(
        IWeeklyRepository weeklyRepository,
        IUserRepository userRepository,
        IUnitOfWork unitOfWork,
        IClock clock,
        IAudioTranscriptionService transcriptionService,
        IContentEvaluationService evaluationService)
    {
        _weeklyRepository = weeklyRepository;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _transcriptionService = transcriptionService;
        _evaluationService = evaluationService;
    }

    public async Task<SubmitActivityResponseResult> ExecuteAsync(
        Guid userId, Guid dailyId, Guid activityId, Stream audioStream, long audioLength, CancellationToken cancellationToken = default)
    {
        if (audioLength <= 0)
            throw new ValidationException("audio_obrigatorio", "O arquivo de audio e obrigatorio.");
        if (audioLength > MaxAudioSizeBytes)
        {
            throw new ValidationException(
                "audio_muito_grande",
                $"O arquivo de audio excede o tamanho maximo permitido ({MaxAudioSizeBytes / (1024 * 1024)}MB).");
        }

        var weekly = await _weeklyRepository.GetByDailyIdAsync(dailyId, userId, cancellationToken)
            ?? throw new NotFoundException("daily_nao_encontrada", "Daily nao encontrada.");

        var daily = weekly.Dailies.First(d => d.Id == dailyId);
        var activity = daily.Activities.FirstOrDefault(a => a.Id == activityId)
            ?? throw new DomainException("Atividade não encontrada nesta Daily.", "atividade_nao_encontrada");

        if (activity.Type != ActivityType.VoiceSummary)
        {
            throw new ValidationException(
                "tipo_atividade_invalido", "Este endpoint so aceita atividades do tipo VoiceSummary.");
        }

        // Garantido pelo dominio na criacao (DailyActivity exige ContentId pra VoiceSummary), mas
        // o texto de referencia em si (BodyText) e responsabilidade da curadoria de conteudo - e
        // so existe pra Reading (Video nunca tem BodyText, so ExternalUrl - estrutural no schema
        // de curadoria, ver CURADORIA.md, nao um dado faltando por engano). Quando falta, cai pro
        // Prompt da propria atividade: os prompts de VoiceSummary sobre video ja descrevem com
        // detalhe o que se espera na resposta (ver dia-1.json), suficiente pra servir de
        // referencia - sem isso, todo VoiceSummary sobre video quebraria sempre.
        var referenceContent = weekly.Template.CuratedContents.FirstOrDefault(c => c.Id == activity.ContentId);
        var referenceText = referenceContent?.BodyText ?? activity.Prompt;
        if (string.IsNullOrWhiteSpace(referenceText))
        {
            throw new DomainException(
                "Esta atividade VoiceSummary nao tem BodyText nem Prompt suficiente para servir de referencia de avaliacao.",
                "conteudo_referencia_ausente");
        }

        // TranscribeAsync nunca devolve vazio - a implementacao Groq ja lanca "transcricao_vazia"
        // (com retry, ver GroqAudioTranscriptionService/HttpRetry) antes de retornar.
        var transcript = await _transcriptionService.TranscribeAsync(audioStream, cancellationToken);

        // ContextText (a pergunta) so agrega informacao quando a referencia principal e outra
        // coisa (o BodyText da leitura) - se ja caiu no fallback do Prompt como referencia,
        // repeti-lo tambem aqui seria redundante.
        var contextText = referenceContent?.BodyText is not null ? activity.Prompt : null;

        // Fase 27: perfil e so pra enriquecer o FEEDBACK (ver doc da classe) - usuario nao
        // encontrado (nunca deveria acontecer, JWT ja garante usuario existente) so significa
        // "sem personalizacao", nao falha a submissao.
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        var evaluation = await _evaluationService.EvaluateAsync(
            new ContentEvaluationRequest(referenceText, transcript, contextText, user?.Interests, user?.AdditionalProfileNotes),
            cancellationToken);

        return await ActivityResponseRecorder.RecordAsync(
            weekly, daily, activityId, evaluation.Score, transcript, justification: null, evaluation.Feedback,
            _clock, _unitOfWork, cancellationToken);
    }
}
