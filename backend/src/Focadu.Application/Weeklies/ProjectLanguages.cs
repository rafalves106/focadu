using Focadu.Domain.Enums;

namespace Focadu.Application.Weeklies;

/// <summary>
/// Leitura de ProjectLanguage a partir de texto (Fase 59) - um lugar so pra Api (request de perfil
/// e de escolha de linguagem) e pro importador de curadoria (projeto.json). Aceita o nome da
/// linguagem sem diferenciar maiuscula ("python", "Python", "javascript"); numero solto ("2") e
/// valor fora da lista nao valem - Enum.TryParse sozinho aceitaria os dois.
/// </summary>
public static class ProjectLanguages
{
    public static bool TryParse(string? text, out ProjectLanguage language)
    {
        language = default;
        var trimmed = text?.Trim();
        if (string.IsNullOrEmpty(trimmed) || char.IsDigit(trimmed[0]) || trimmed[0] == '-') return false;

        return Enum.TryParse(trimmed, ignoreCase: true, out language) && Enum.IsDefined(language);
    }
}
