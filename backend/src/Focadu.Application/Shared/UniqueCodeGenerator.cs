namespace Focadu.Application.Shared;

/// <summary>
/// Gera um codigo curto legivel por humano (8 caracteres, alfabeto sem 0/O/1/I pra evitar
/// confusao visual ao digitar/ler em voz alta) - usado por User.ReferralCode (Fase 17) e
/// Squad.JoinCode (Fase 24), mesmo alfabeto/tamanho nos dois. Unicidade e responsabilidade de
/// quem chama: `isTaken` consulta o repositorio correspondente antes do chamador aceitar o
/// candidato.
/// </summary>
internal static class UniqueCodeGenerator
{
    private const int CodeLength = 8;
    private const int MaxAttempts = 5;
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    public static async Task<string> GenerateAsync(Func<string, Task<bool>> isTaken)
    {
        for (var attempt = 0; attempt < MaxAttempts; attempt++)
        {
            var candidate = new string(Enumerable.Range(0, CodeLength).Select(_ => Alphabet[Random.Shared.Next(Alphabet.Length)]).ToArray());
            if (!await isTaken(candidate)) return candidate;
        }

        // Praticamente impossivel (33^8 combinacoes) - defensivo, nunca deveria disparar de verdade.
        throw new InvalidOperationException("Nao foi possivel gerar um codigo unico.");
    }
}
