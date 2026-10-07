#:property PublishAot=false
using System.Reflection;
using Loja.Dominio;
using Loja.Infraestrutura;

// ESCREVA AQUI o que o programa mostra (passos 1, 2, 3, 4, 5 e 6)

namespace Loja.Infraestrutura
{
    public class BancoSql
    {
        public List<string> Consultar(string sql) => new() { "pedido 1", "pedido 2", "pedido 3" };
    }

    // passo 3: a classe de infraestrutura entra aqui
}

namespace Loja.Dominio
{
    // passo 2: a interface entra aqui

    public class ServicoPedidos
    {
        private readonly BancoSql banco = new BancoSql();

        public int ContarPedidos() => banco.Consultar("SELECT * FROM pedidos").Count;
    }
}
