namespace Focadu.Infrastructure.Services;

/// <summary>
/// Fase 85: como os prompts de IA se referem a plataforma e ao curso. Antes todos diziam "Focadu,
/// plataforma de estudo de seguranca web" - com o Linux (e o Python a caminho), o aluno de um curso de
/// pre-requisito era tratado como aluno de seguranca web e uma duvida de bash podia virar "fora do assunto".
/// </summary>
internal static class CoursePromptText
{
    /// <summary>"da Focadu (curso Linux)", ou so "da Focadu" quando o curso nao e conhecido.</summary>
    public static string Platform(string? courseName) =>
        string.IsNullOrWhiteSpace(courseName) ? "da Focadu" : $"da Focadu (curso {courseName.Trim()})";
}
