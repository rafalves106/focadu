namespace Focadu.Application.Ports;

/// <summary>Texto transcrito e quanto durou o audio (segundos; 0 se o servico nao informou). Fase 101: a duracao alimenta o limite de audio.</summary>
public record AudioTranscript(string Text, double DurationSeconds);

/// <summary>
/// Port para o servico externo de transcricao de audio (fala do usuario -> texto), usado nas
/// atividades avaliadas por voz.
/// </summary>
public interface IAudioTranscriptionService
{
    Task<AudioTranscript> TranscribeAsync(Stream audioStream, CancellationToken cancellationToken = default);
}
