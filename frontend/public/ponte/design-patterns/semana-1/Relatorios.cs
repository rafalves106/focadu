#:package Microsoft.Extensions.DependencyInjection@10.0.0
#:property PublishAot=false
using System.Globalization;
using Microsoft.Extensions.DependencyInjection;

// ESCREVA AQUI o que o programa mostra (passos 1 a 6)

public record Pedido(int Numero, string Cliente, decimal Valor, string Status);

public static class Dados
{
    public static readonly List<Pedido> Pedidos = new()
    {
        new(1, "Ana", 120.50m, "pago"),
        new(2, "Bruno", 80.00m, "pendente"),
        new(3, "Carla", 300.00m, "pago"),
        new(4, "Diego", 45.90m, "cancelado"),
        new(5, "Elisa", 210.00m, "pago"),
        new(6, "Fabio", 99.99m, "pendente"),
    };
}

public partial class RelatorioTexto
{
    public string Gerar(string titulo, IEnumerable<Pedido> pedidos) =>
        titulo + "\n" + string.Join("\n", pedidos.Select(p =>
            $"#{p.Numero} {p.Cliente} {p.Valor.ToString("F2", CultureInfo.InvariantCulture)} {p.Status}"));
}

public partial class RelatorioCsv
{
    public string Gerar(string titulo, IEnumerable<Pedido> pedidos) =>
        "numero,cliente,valor,status\n" + string.Join("\n", pedidos.Select(p =>
            $"{p.Numero},{p.Cliente},{p.Valor.ToString("F2", CultureInfo.InvariantCulture)},{p.Status}"));
}

// passo 6: este RelatorioService antigo sai e entra o novo
public class RelatorioService
{
    public string Gerar(string formato, string titulo, string? status, bool ordenar)
    {
        var lista = Dados.Pedidos.Where(p => status == null || p.Status == status).ToList();
        if (ordenar) lista = lista.OrderByDescending(p => p.Valor).ToList();
        switch (formato)
        {
            case "texto": return new RelatorioTexto().Gerar(titulo, lista);
            case "csv": return new RelatorioCsv().Gerar(titulo, lista);
            default: throw new ArgumentException("formato desconhecido: " + formato);
        }
    }
}
