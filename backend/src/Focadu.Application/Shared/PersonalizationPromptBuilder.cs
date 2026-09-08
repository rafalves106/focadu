namespace Focadu.Application.Shared;

/// <summary>
/// Monta a instrucao de personalizacao por interesses/notas do perfil (Entrevista de Perfil, Fase
/// 13b) que um prompt de IA pode injetar - mesma ideia que ja valia so pra Leitura desde a Fase
/// 21/22 (GetCuratedContentUseCase + IAnalogyGenerationService), agora reaproveitada pelos outros 2
/// prompts que faltavam usar o perfil do usuario (avaliacao de voz e rascunho de LinkedIn - ver
/// secret/MESTRE.md secao 12). Publico e nao `internal` (ao contrario do resto desta pasta, ver
/// UniqueCodeGenerator) porque GroqContentEvaluationService mora em Focadu.Infrastructure, fora do
/// assembly de Focadu.Application.
/// </summary>
public static class PersonalizationPromptBuilder
{
    /// <summary>Null quando nao ha nada pra personalizar (usuario sem interesses nem notas) - o prompt some inteiro nesse caso, sem paragrafo vazio nem instrucao inutil.</summary>
    public static string? BuildInstruction(IReadOnlyCollection<string>? interests, string? notes)
    {
        var hasInterests = interests is { Count: > 0 };
        var hasNotes = !string.IsNullOrWhiteSpace(notes);
        if (!hasInterests && !hasNotes) return null;

        var pieces = new List<string>();
        if (hasInterests)
            pieces.Add($"Interesses do aluno (use como analogia quando ajudar a explicar, sem forçar): {string.Join(", ", interests!)}.");
        if (hasNotes)
            pieces.Add($"Notas adicionais sobre o aluno: {notes!.Trim()}.");

        return string.Join(" ", pieces);
    }
}
