namespace Focadu.Domain.Policies;

/// <summary>
/// Constantes de negócio do Caderninho de Anotações (Fase 29) - limites pra evitar abuso/erro,
/// nunca regras de avaliação (Note não é avaliada, é só anotação livre do aluno).
/// </summary>
public static class NotePolicy
{
    /// <summary>Tamanho máximo do texto (markdown) de uma nota. Generoso o bastante pra qualquer anotação de estudo real, sem deixar o campo ilimitado.</summary>
    public const int MaxContentLength = 20_000;

    /// <summary>Quantidade máxima de tags por nota - tags são livres (sem taxonomia pré-definida), mas um limite evita o campo virar bagunça.</summary>
    public const int MaxTagCount = 10;

    /// <summary>Tamanho máximo de cada tag individual.</summary>
    public const int MaxTagLength = 40;
}
