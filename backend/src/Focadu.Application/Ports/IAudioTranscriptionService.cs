namespace Focadu.Application.Ports;

/// <summary>
/// Port para o servico externo de transcricao de audio (fala do usuario -> texto), usado nas
/// atividades avaliadas por voz. Sem implementacao concreta neste passo: a captura/upload e
/// transcricao de audio ainda serao desenhadas tecnicamente em um prompt separado.
/// </summary>
public interface IAudioTranscriptionService
{
    Task<string> TranscribeAsync(Stream audioStream, CancellationToken cancellationToken = default);
}
