namespace Focadu.Domain.Activities;

/// <summary>
/// Regras do passo de codigo da ponte (Fase 79, secret/rascunhos/ponte-code-comigo.md), a partir
/// das tentativas de UMA Daily numa atividade CodeStep:
///
/// - o passo acaba quando uma tentativa passa ou quando o aluno gasta MaxAttempts sem passar;
/// - acabou sem passar = a solucao de referencia aparece, e e dela que o passo seguinte parte;
/// - o codigo que o passo "entrega" pro seguinte e o da tentativa aprovada, ou a solucao.
/// </summary>
public static class CodeStepProgress
{
    /// <summary>Tentativas por passo; na ultima sem passar, a solucao aparece.</summary>
    public const int MaxAttempts = 3;

    public static bool IsDone(IEnumerable<ActivityResponse> responses)
    {
        var list = responses.ToList();
        return list.Any(r => r.Passed) || list.Count >= MaxAttempts;
    }

    /// <summary>Codigo que este passo entrega pro seguinte - nulo enquanto o passo nao acabou.</summary>
    public static string? CarriedCode(DailyActivity activity, IEnumerable<ActivityResponse> responses)
    {
        var list = responses.OrderBy(r => r.AttemptNumber).ToList();
        var passed = list.FirstOrDefault(r => r.Passed);
        if (passed is not null) return passed.Transcript;
        return list.Count >= MaxAttempts ? activity.CodeSolution : null;
    }
}
