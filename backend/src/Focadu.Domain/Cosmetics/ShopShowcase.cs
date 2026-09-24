using System.Globalization;
using Focadu.Domain.Enums;

namespace Focadu.Domain.Cosmetics;

/// <summary>
/// Vitrine pessoal da Loja (Fase 71, regras decididas em secret/rascunhos/loja-raridade-e-vitrine.md):
/// ate 6 itens sorteados por usuario, renovados toda segunda. O sorteio e deterministico - a semente e
/// o usuario + a semana ISO -, entao a vitrine e a mesma a cada recarga sem precisar de tabela pra
/// guardar o resultado. Regras: so item a venda (com arte e fora do kit basico) que o usuario ainda nao
/// tem; pelo menos 2 Comuns quando houver; no maximo 2 itens do mesmo slot; raridade sorteada por peso
/// (Comum 60, Raro 30, Epico 9, Lendario 1), renormalizado entre as raridades que ainda tem item elegivel.
/// "Ja tem" conta so o que o usuario tinha ANTES da segunda da semana (ver OwnedBeforeWeek): o que ele
/// compra durante a semana continua na vitrine, marcado como dele - senao cada compra mudaria o pool e
/// embaralharia a vitrine inteira, virando um "rerolar" disfarcado. Sem "rerolar" na v0.1.0 (decisao do dono).
/// </summary>
public static class ShopShowcase
{
    public const int Size = 6;
    public const int MinCommons = 2;
    public const int MaxPerSlot = 2;

    private static readonly Dictionary<CosmeticRarity, int> Weights = new()
    {
        [CosmeticRarity.Common] = 60,
        [CosmeticRarity.Rare] = 30,
        [CosmeticRarity.Epic] = 9,
        [CosmeticRarity.Legendary] = 1,
    };

    /// <summary>Segunda-feira que abre a semana de <paramref name="today"/> (a vitrine vale dela ate o domingo).</summary>
    public static DateOnly WeekStart(DateOnly today) => today.AddDays(-(((int)today.DayOfWeek + 6) % 7));

    /// <summary>Itens que contam como "ja tem" pro sorteio da semana de <paramref name="today"/>: adquiridos antes da segunda (horario local).</summary>
    public static IReadOnlySet<Guid> OwnedBeforeWeek(IEnumerable<UserCosmeticInventory> inventory, DateOnly today)
    {
        var weekStart = WeekStart(today);
        return inventory
            .Where(e => DateOnly.FromDateTime(e.AcquiredAt.ToLocalTime()) < weekStart)
            .Select(e => e.CosmeticItemId)
            .ToHashSet();
    }

    public static IReadOnlyList<CosmeticItem> Draw(IEnumerable<CosmeticItem> catalog, IReadOnlySet<Guid> ownedItemIds, Guid userId, DateOnly today)
    {
        var pool = catalog
            .Where(i => i.IsSoldInShop && !ownedItemIds.Contains(i.Id))
            .OrderBy(i => i.Code, StringComparer.Ordinal)
            .ToList();

        var date = today.ToDateTime(TimeOnly.MinValue);
        var rng = new SeededRandom(Seed($"{userId:N}|{ISOWeek.GetYear(date)}|{ISOWeek.GetWeekOfYear(date)}"));

        var picked = new List<CosmeticItem>();
        bool Eligible(CosmeticItem i) => !picked.Contains(i) && picked.Count(p => p.Slot == i.Slot) < MaxPerSlot;

        for (var n = 0; n < MinCommons; n++)
        {
            var commons = pool.Where(i => i.Rarity == CosmeticRarity.Common && Eligible(i)).ToList();
            if (commons.Count == 0) break;
            picked.Add(commons[rng.Next(commons.Count)]);
        }

        while (picked.Count < Size)
        {
            var byRarity = pool.Where(Eligible).GroupBy(i => i.Rarity).ToDictionary(g => g.Key, g => g.ToList());
            if (byRarity.Count == 0) break;

            var rarities = byRarity.Keys.OrderBy(r => r).ToList();
            var roll = rng.Next(rarities.Sum(r => Weights[r]));
            var rarity = rarities[0];
            foreach (var r in rarities)
            {
                if (roll < Weights[r]) { rarity = r; break; }
                roll -= Weights[r];
            }
            var candidates = byRarity[rarity];
            picked.Add(candidates[rng.Next(candidates.Count)]);
        }

        return picked;
    }

    /// <summary>FNV-1a 32 bits - estavel entre versoes do .NET (string.GetHashCode nao e).</summary>
    private static uint Seed(string text)
    {
        var hash = 2166136261u;
        foreach (var c in text)
        {
            hash ^= c;
            hash *= 16777619u;
        }
        return hash;
    }

    /// <summary>Mulberry32 - PRNG pequeno e deterministico; System.Random com semente nao tem garantia de algoritmo entre versoes.</summary>
    private sealed class SeededRandom(uint state)
    {
        private uint _state = state;

        public int Next(int maxExclusive)
        {
            _state += 0x6D2B79F5u;
            var t = _state;
            t = (t ^ (t >> 15)) * (t | 1u);
            t ^= t + ((t ^ (t >> 7)) * (t | 61u));
            var value = t ^ (t >> 14);
            return (int)(value % (uint)maxExclusive);
        }
    }
}
