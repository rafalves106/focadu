using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Focadu.Infrastructure.Persistence;

/// <summary>
/// Factory usada pelas ferramentas de design-time do EF Core (dotnet ef migrations add / update)
/// para conseguir instanciar o FocaduDbContext sem precisar subir a Focadu.Api inteira. A
/// connection string vem de uma variavel de ambiente para nao precisar de segredo commitado;
/// o fallback aponta para o Postgres do docker-compose.yml deste repositorio.
/// </summary>
public class FocaduDbContextFactory : IDesignTimeDbContextFactory<FocaduDbContext>
{
    public FocaduDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("FOCADU_CONNECTION_STRING")
            ?? "Host=localhost;Port=5432;Database=focadu;Username=focadu;Password=focadu";

        var optionsBuilder = new DbContextOptionsBuilder<FocaduDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new FocaduDbContext(optionsBuilder.Options);
    }
}
