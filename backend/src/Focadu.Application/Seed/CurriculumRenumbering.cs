using System.Text.RegularExpressions;

namespace Focadu.Application.Seed;

/// <summary>
/// Fase 69: a regra da renumeracao do curso de 60 dias (5 por semana) pra 72 (6 por semana, o 6o e
/// a ponte - secret/rascunhos/ponte-teoria-projeto-semanal.md). Mesma regra que renumerou os
/// arquivos da curadoria em 23/09/2026; aqui ela e aplicada ao banco que ja existia
/// (Infrastructure: Curriculum72Migration).
/// </summary>
public static class CurriculumRenumbering
{
    /// <summary>Dia antigo d (semana w = (d-1)/5 + 1) vira 6(w-1) + posicao, ou seja d + (d-1)/5. Fora de 1-60, nao mexe.</summary>
    public static int NewDayNumber(int oldDayNumber) =>
        oldDayNumber is >= 1 and <= 60 ? oldDayNumber + (oldDayNumber - 1) / 5 : oldDayNumber;

    // "Dia 16", "Dias 16 a 20", "Dias 16-20", "Dias 1 e 2", "dias 9, 11 e 30" - cada numero da lista
    // e renumerado. Mesma expressao do script que renumerou a curadoria.
    private static readonly Regex DayReference = new(
        @"\b([Dd]ias?)(\s+)(\d+)((?:(?:\s*,\s*|\s+e\s+|\s+a\s+|\s*-\s*)\d+)*)", RegexOptions.CultureInvariant);

    private static readonly Regex Number = new(@"\d+", RegexOptions.CultureInvariant);

    /// <summary>Renumera toda mencao "Dia N" de um texto curado. NAO e idempotente: aplicar duas vezes renumera duas vezes.</summary>
    public static string RenumberDayReferences(string text) =>
        DayReference.Replace(text, m =>
            m.Groups[1].Value + m.Groups[2].Value
            + NewDayNumber(int.Parse(m.Groups[3].Value))
            + Number.Replace(m.Groups[4].Value, n => NewDayNumber(int.Parse(n.Value)).ToString()));
}
