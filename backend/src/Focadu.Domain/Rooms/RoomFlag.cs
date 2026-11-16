using System.Security.Cryptography;
using System.Text;

namespace Focadu.Domain.Rooms;

/// <summary>
/// Resposta de uma tarefa de Sala (Fase 110). O servidor guarda só o hash: a flag em texto fica no sala.json da curadoria
/// e no ambiente que o aluno sobe na própria máquina. Comparação sem diferenciar maiúsculas e ignorando espaços nas pontas
/// e repetidos (respostas como "LojaServ/2.4.1" não podem falhar por digitação de caixa).
/// </summary>
public static class RoomFlag
{
    public static string Normalize(string answer) =>
        string.Join(' ', (answer ?? string.Empty).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).ToLowerInvariant();

    public static string Hash(string answer) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(Normalize(answer))));

    public static bool Matches(string answer, string flagHash) =>
        !string.IsNullOrWhiteSpace(answer) && string.Equals(Hash(answer), flagHash, StringComparison.Ordinal);
}
